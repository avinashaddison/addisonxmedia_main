/**
 * Orders — authed admin routes for the website-builder e-commerce flow.
 *
 *   GET    /api/orders               → list (optionally ?status=new)
 *   GET    /api/orders/:id           → single order + items
 *   PATCH  /api/orders/:id           → update status / payment_status / notes
 *   POST   /api/orders               → manually log an order (for offline /
 *                                       WhatsApp orders the seller wants tracked)
 *   GET    /api/customers            → unique customers (derived from orders)
 *
 * The public cart-checkout endpoint lives in site-public.ts (no auth).
 */

import { Hono } from "hono";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { orderTbl, orderItem, contact, product } from "../db/schema";
import { requireAuth, type AuthVariables } from "../middleware/auth";

const app = new Hono<{ Variables: AuthVariables }>();
app.use("*", requireAuth);

/** Allocate next order_number for this owner. Uses MAX + 1 in a transaction.
 *  Race condition is mitigated by the unique index — on conflict caller retries. */
export const nextOrderNumber = async (userId: string): Promise<number> => {
  const [row] = await db.select({ max: sql<number>`COALESCE(MAX(${orderTbl.orderNumber}), 0)` })
    .from(orderTbl).where(eq(orderTbl.ownerId, userId));
  return Number(row?.max ?? 0) + 1;
};

app.get("/orders", async (c) => {
  const userId = c.var.userId;
  const status = c.req.query("status");
  const limit = Math.min(Number(c.req.query("limit") ?? 100), 500);

  const whereClause = status
    ? and(eq(orderTbl.ownerId, userId), eq(orderTbl.status, status))
    : eq(orderTbl.ownerId, userId);

  const rows = await db.select().from(orderTbl)
    .where(whereClause)
    .orderBy(desc(orderTbl.createdAt))
    .limit(limit);
  return c.json(rows);
});

app.get("/orders/:id", async (c) => {
  const userId = c.var.userId;
  const id = c.req.param("id");

  const [order] = await db.select().from(orderTbl)
    .where(and(eq(orderTbl.id, id), eq(orderTbl.ownerId, userId)))
    .limit(1);
  if (!order) return c.json({ error: "Order not found" }, 404);

  const items = await db.select().from(orderItem).where(eq(orderItem.orderId, id));
  return c.json({ ...order, items });
});

app.patch("/orders/:id", async (c) => {
  const userId = c.var.userId;
  const id = c.req.param("id");
  const body = await c.req.json<{
    status?: string;
    payment_status?: string;
    payment_method?: string | null;
    notes?: string | null;
  }>();

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.status === "string") {
    if (!["new", "confirmed", "shipped", "delivered", "cancelled"].includes(body.status)) {
      return c.json({ error: "Invalid status" }, 400);
    }
    updates.status = body.status;
  }
  if (typeof body.payment_status === "string") {
    if (!["pending", "paid", "refunded"].includes(body.payment_status)) {
      return c.json({ error: "Invalid payment_status" }, 400);
    }
    updates.paymentStatus = body.payment_status;
  }
  if ("payment_method" in body) updates.paymentMethod = body.payment_method ?? null;
  if ("notes" in body) updates.notes = body.notes ?? null;

  const [row] = await db.update(orderTbl)
    .set(updates)
    .where(and(eq(orderTbl.id, id), eq(orderTbl.ownerId, userId)))
    .returning();
  if (!row) return c.json({ error: "Order not found" }, 404);
  return c.json(row);
});

/** Manually log an order (offline / WhatsApp / phone order). Skips the cart
 *  flow — seller types in customer details + line items directly. */
app.post("/orders", async (c) => {
  const userId = c.var.userId;
  const body = await c.req.json<{
    customer_name?: string;
    customer_phone?: string | null;
    customer_email?: string | null;
    customer_address?: string | null;
    items?: Array<{ product_id?: string | null; name: string; price_inr: number; quantity: number; photo_url?: string | null }>;
    shipping_inr?: number;
    discount_inr?: number;
    payment_method?: string | null;
    payment_status?: string;
    notes?: string | null;
  }>();

  const name = (body.customer_name || "").trim();
  if (!name) return c.json({ error: "Customer name is required" }, 400);
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) return c.json({ error: "At least one line item required" }, 400);

  const lineRows = items.map((it) => {
    const qty = Math.max(1, Math.floor(Number(it.quantity) || 1));
    const price = Math.max(0, Number(it.price_inr) || 0);
    return {
      productId: it.product_id || null,
      productName: (it.name || "").trim() || "Item",
      productPhotoUrl: it.photo_url ?? null,
      unitPriceInr: String(price),
      quantity: qty,
      lineTotalInr: String(price * qty),
    };
  });
  const subtotal = lineRows.reduce((s, r) => s + Number(r.lineTotalInr), 0);
  const shipping = Math.max(0, Number(body.shipping_inr) || 0);
  const discount = Math.max(0, Number(body.discount_inr) || 0);
  const total = Math.max(0, subtotal + shipping - discount);

  // Retry loop to handle order number race condition (unique index on owner_id + order_number)
  let order: typeof orderTbl.$inferSelect | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const orderNumber = await nextOrderNumber(userId);
      const [created] = await db.insert(orderTbl).values({
        ownerId: userId,
        orderNumber,
        customerName: name,
        customerPhone: body.customer_phone ?? null,
        customerEmail: body.customer_email ?? null,
        customerAddress: body.customer_address ?? null,
        subtotalInr: String(subtotal),
        shippingInr: String(shipping),
        discountInr: String(discount),
        totalInr: String(total),
        status: "new",
        paymentMethod: body.payment_method ?? null,
        paymentStatus: ["pending", "paid", "refunded"].includes(body.payment_status ?? "")
          ? (body.payment_status as "pending" | "paid" | "refunded")
          : "pending",
        source: "manual",
        notes: body.notes ?? null,
      }).returning();
      order = created;
      break;
    } catch (e: any) {
      if (e?.code === "23505" && attempt < 2) continue;
      throw e;
    }
  }
  if (!order) return c.json({ error: "Could not create order - please try again" }, 500);

  if (lineRows.length > 0) {
    await db.insert(orderItem).values(lineRows.map((r) => ({ ...r, orderId: order!.id })));
  }

  // Mirror to CRM contact (dedupe by phone)
  if (body.customer_phone) {
    const normalizedPhone = body.customer_phone.replace(/[^\d+]/g, "");
    const [existing] = await db.select({ id: contact.id }).from(contact)
      .where(and(eq(contact.ownerId, userId), eq(contact.phone, normalizedPhone))).limit(1);
    let contactId: string;
    if (existing) {
      contactId = existing.id;
    } else {
      const [c2] = await db.insert(contact).values({
        ownerId: userId,
        name,
        phone: normalizedPhone,
        email: body.customer_email || null,
        source: "manual-order",
        tag: "warm",
      }).returning({ id: contact.id });
      contactId = c2.id;
    }
    await db.update(orderTbl).set({ contactId }).where(eq(orderTbl.id, order.id));
  }

  return c.json({ ok: true, id: order.id, order_number: order.orderNumber }, 201);
});

/** Unique customers derived from orders — name + phone + aggregate stats.
 *  Replaces a dedicated customers table for now; if we ever need profiles
 *  + loyalty + segments, we'll promote this to a real materialized view. */
app.get("/customers", async (c) => {
  const userId = c.var.userId;
  const rows = await db.execute<{
    customer_name: string;
    customer_phone: string | null;
    customer_email: string | null;
    last_address: string | null;
    order_count: string;
    total_spent_inr: string;
    last_order_at: string;
    first_order_at: string;
  }>(sql`
    SELECT
      ${orderTbl.customerName} AS customer_name,
      ${orderTbl.customerPhone} AS customer_phone,
      MAX(${orderTbl.customerEmail}) AS customer_email,
      (ARRAY_AGG(${orderTbl.customerAddress} ORDER BY ${orderTbl.createdAt} DESC) FILTER (WHERE ${orderTbl.customerAddress} IS NOT NULL))[1] AS last_address,
      COUNT(*)::text AS order_count,
      COALESCE(SUM(${orderTbl.totalInr}), 0)::text AS total_spent_inr,
      MAX(${orderTbl.createdAt})::text AS last_order_at,
      MIN(${orderTbl.createdAt})::text AS first_order_at
    FROM ${orderTbl}
    WHERE ${orderTbl.ownerId} = ${userId}
      AND ${orderTbl.customerPhone} IS NOT NULL
    GROUP BY ${orderTbl.customerName}, ${orderTbl.customerPhone}
    ORDER BY MAX(${orderTbl.createdAt}) DESC
    LIMIT 500
  `);
  return c.json(rows.rows ?? rows);
});

export default app;
