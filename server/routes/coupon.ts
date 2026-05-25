/**
 * Coupons — discount-code admin CRUD + public validation endpoint.
 *
 *   GET    /api/coupons               → list
 *   POST   /api/coupons               → create
 *   PATCH  /api/coupons/:id           → update
 *   DELETE /api/coupons/:id           → delete
 *
 * Public validation (no auth) — checks code + min cart + window + max uses,
 * returns the discount amount the cart should apply:
 *   POST /biz/:slug/coupon/check     { code, cart_subtotal_inr }
 *                                     → { ok, discount_inr, message? }
 *
 * Actual coupon redemption happens inside /biz/:slug/order — that endpoint
 * re-validates, applies the discount and increments used_count.
 */

import { Hono } from "hono";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { coupon } from "../db/schema";
import { requireAuth, type AuthVariables } from "../middleware/auth";

const app = new Hono<{ Variables: AuthVariables }>();
app.use("*", requireAuth);

const normalize = (s: string) => s.trim().toUpperCase().replace(/\s+/g, "");

app.get("/coupons", async (c) => {
  const rows = await db.select().from(coupon)
    .where(eq(coupon.ownerId, c.var.userId))
    .orderBy(desc(coupon.createdAt));
  return c.json(rows);
});

app.post("/coupons", async (c) => {
  const userId = c.var.userId;
  const body = await c.req.json<{
    code?: string;
    discount_type?: "percent" | "flat";
    discount_value?: number;
    min_cart_inr?: number;
    max_uses?: number | null;
    starts_at?: string | null;
    expires_at?: string | null;
    active?: boolean;
  }>();

  const code = normalize(body.code || "");
  if (!code) return c.json({ error: "Code is required" }, 400);
  if (code.length > 30) return c.json({ error: "Code too long (max 30 chars)" }, 400);
  if (!/^[A-Z0-9_-]+$/.test(code)) return c.json({ error: "Code can only contain letters, numbers, _ and -" }, 400);

  const discountType = body.discount_type === "flat" ? "flat" : "percent";
  const discountValue = Math.max(0, Number(body.discount_value) || 0);
  if (discountType === "percent" && discountValue > 100) return c.json({ error: "Percent discount can't be > 100" }, 400);

  try {
    const [row] = await db.insert(coupon).values({
      ownerId: userId,
      code,
      discountType,
      discountValue: String(discountValue),
      minCartInr: String(Math.max(0, Number(body.min_cart_inr) || 0)),
      maxUses: body.max_uses != null ? Math.max(1, Math.floor(Number(body.max_uses))) : null,
      startsAt: body.starts_at ? new Date(body.starts_at) : null,
      expiresAt: body.expires_at ? new Date(body.expires_at) : null,
      active: body.active !== false,
    }).returning();
    return c.json(row, 201);
  } catch (e) {
    if ((e as { code?: string }).code === "23505") {
      return c.json({ error: `Code "${code}" already exists` }, 409);
    }
    throw e;
  }
});

app.patch("/coupons/:id", async (c) => {
  const userId = c.var.userId;
  const id = c.req.param("id");
  const body = await c.req.json<{
    code?: string;
    discount_type?: "percent" | "flat";
    discount_value?: number;
    min_cart_inr?: number;
    max_uses?: number | null;
    starts_at?: string | null;
    expires_at?: string | null;
    active?: boolean;
  }>();

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.code === "string") {
    const code = normalize(body.code);
    if (!code) return c.json({ error: "Code is required" }, 400);
    updates.code = code;
  }
  if (body.discount_type) updates.discountType = body.discount_type === "flat" ? "flat" : "percent";
  if (typeof body.discount_value === "number") updates.discountValue = String(Math.max(0, body.discount_value));
  if (typeof body.min_cart_inr === "number") updates.minCartInr = String(Math.max(0, body.min_cart_inr));
  if ("max_uses" in body) updates.maxUses = body.max_uses != null ? Math.max(1, Math.floor(Number(body.max_uses))) : null;
  if ("starts_at" in body) updates.startsAt = body.starts_at ? new Date(body.starts_at) : null;
  if ("expires_at" in body) updates.expiresAt = body.expires_at ? new Date(body.expires_at) : null;
  if (typeof body.active === "boolean") updates.active = body.active;

  try {
    const [row] = await db.update(coupon)
      .set(updates)
      .where(and(eq(coupon.id, id), eq(coupon.ownerId, userId)))
      .returning();
    if (!row) return c.json({ error: "Coupon not found" }, 404);
    return c.json(row);
  } catch (e) {
    if ((e as { code?: string }).code === "23505") {
      return c.json({ error: "A coupon with that code already exists" }, 409);
    }
    throw e;
  }
});

app.delete("/coupons/:id", async (c) => {
  const userId = c.var.userId;
  const id = c.req.param("id");
  const del = await db.delete(coupon)
    .where(and(eq(coupon.id, id), eq(coupon.ownerId, userId)))
    .returning({ id: coupon.id });
  if (del.length === 0) return c.json({ error: "Coupon not found" }, 404);
  return c.json({ ok: true });
});

/** Validate a coupon for a given owner + cart subtotal. Used by both the
 *  public renderer's "Apply" button AND the order-create endpoint. Pure —
 *  doesn't mutate `used_count`. */
export async function validateCoupon(
  ownerId: string,
  rawCode: string,
  cartSubtotal: number,
): Promise<{ ok: true; coupon: typeof coupon.$inferSelect; discountInr: number } | { ok: false; reason: string }> {
  const code = normalize(rawCode);
  if (!code) return { ok: false, reason: "Enter a code" };

  const [row] = await db.select().from(coupon)
    .where(and(eq(coupon.ownerId, ownerId), eq(coupon.code, code)))
    .limit(1);
  if (!row) return { ok: false, reason: "Invalid coupon code" };
  if (!row.active) return { ok: false, reason: "Coupon is disabled" };

  const now = new Date();
  if (row.startsAt && now < new Date(row.startsAt)) return { ok: false, reason: "Coupon not yet active" };
  if (row.expiresAt && now > new Date(row.expiresAt)) return { ok: false, reason: "Coupon expired" };

  if (row.maxUses != null && row.usedCount >= row.maxUses) {
    return { ok: false, reason: "Coupon usage limit reached" };
  }

  const minCart = Number(row.minCartInr);
  if (minCart > 0 && cartSubtotal < minCart) {
    return { ok: false, reason: `Minimum cart value ₹${minCart.toLocaleString("en-IN")}` };
  }

  const value = Number(row.discountValue);
  const discount = row.discountType === "flat"
    ? Math.min(cartSubtotal, value)
    : Math.round((cartSubtotal * value) / 100);

  return { ok: true, coupon: row, discountInr: discount };
}

/** Atomically increment coupon used_count, respecting max_uses.
 *  Returns true if the increment succeeded, false if the coupon usage limit
 *  has been reached (race-safe). */
export async function redeemCoupon(couponId: string): Promise<boolean> {
  const result = await db.execute(sql`
    UPDATE coupon SET used_count = used_count + 1, updated_at = NOW()
    WHERE id = ${couponId} AND (max_uses IS NULL OR used_count < max_uses)
    RETURNING id
  `);
  const rows = (result as any).rows ?? result;
  return Array.isArray(rows) && rows.length > 0;
}

export default app;
