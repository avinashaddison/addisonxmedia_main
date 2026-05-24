/**
 * Product catalog routes — authed CRUD for the website builder.
 *
 *   GET    /api/products             → list (active + draft + archived, all user's)
 *   POST   /api/products             → create
 *   PATCH  /api/products/:id         → update
 *   DELETE /api/products/:id         → delete
 *   POST   /api/products/reorder     → bulk-update sort_order
 *
 * Public listing for the renderer lives in site-public.ts (no auth needed).
 */

import { Hono } from "hono";
import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "../db/client";
import { product } from "../db/schema";
import { requireAuth, type AuthVariables } from "../middleware/auth";

const app = new Hono<{ Variables: AuthVariables }>();
app.use("*", requireAuth);

/** Free-text search for products owned by current user. Used by the WhatsApp
 *  Commerce features (AI shopping suggestions + send-catalog picker). Matches
 *  on name + description (case-insensitive). Empty query → all active. */
app.get("/products/search", async (c) => {
  const userId = c.var.userId;
  const q = (c.req.query("q") || "").trim();
  const limit = Math.min(Number(c.req.query("limit") ?? 12), 50);
  const onlyActive = c.req.query("active") !== "false";

  const baseWhere = onlyActive
    ? and(eq(product.ownerId, userId), eq(product.status, "active"))
    : eq(product.ownerId, userId);

  let rows;
  if (q.length === 0) {
    rows = await db.select().from(product)
      .where(baseWhere)
      .orderBy(asc(product.sortOrder), asc(product.createdAt))
      .limit(limit);
  } else {
    const pattern = `%${q.replace(/[%_]/g, "\\$&")}%`;
    rows = await db.select().from(product)
      .where(and(baseWhere, or(ilike(product.name, pattern), ilike(product.description, pattern))))
      .orderBy(asc(product.sortOrder), asc(product.createdAt))
      .limit(limit);
  }
  return c.json(rows);
});

app.get("/products", async (c) => {
  const userId = c.var.userId;
  const rows = await db.select().from(product)
    .where(eq(product.ownerId, userId))
    .orderBy(asc(product.sortOrder), asc(product.createdAt));
  return c.json(rows);
});

app.post("/products", async (c) => {
  const userId = c.var.userId;
  const body = await c.req.json<{
    name?: string;
    description?: string | null;
    price_inr?: number;
    photo_url?: string | null;
    stock?: number | null;
    category?: string | null;
    status?: string;
  }>();
  const name = (body.name || "").trim();
  if (!name) return c.json({ error: "Product name is required" }, 400);
  const price = Number.isFinite(body.price_inr) ? Number(body.price_inr) : 0;
  if (price < 0) return c.json({ error: "Price can't be negative" }, 400);

  // Place new products at the end of the list
  const [maxRow] = await db.select({ sortOrder: product.sortOrder }).from(product)
    .where(eq(product.ownerId, userId))
    .orderBy(asc(product.sortOrder));
  const nextSort = (Number(maxRow?.sortOrder ?? -1) + 1) || 0;

  const status = body.status === "draft" || body.status === "archived" ? body.status : "active";

  const [row] = await db.insert(product).values({
    ownerId: userId,
    name,
    description: (body.description ?? null) || null,
    priceInr: String(price),
    photoUrl: (body.photo_url ?? null) || null,
    stock: body.stock != null ? Number(body.stock) : null,
    category: (body.category ?? null) || null,
    status,
    sortOrder: nextSort,
  }).returning();
  return c.json(row, 201);
});

app.patch("/products/:id", async (c) => {
  const userId = c.var.userId;
  const id = c.req.param("id");
  const body = await c.req.json<{
    name?: string;
    description?: string | null;
    price_inr?: number;
    photo_url?: string | null;
    stock?: number | null;
    category?: string | null;
    status?: string;
  }>();

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.name === "string") {
    const t = body.name.trim();
    if (!t) return c.json({ error: "Name can't be empty" }, 400);
    updates.name = t;
  }
  if ("description" in body) updates.description = (body.description ?? null) || null;
  if ("photo_url" in body) updates.photoUrl = (body.photo_url ?? null) || null;
  if ("category" in body) updates.category = (body.category ?? null) || null;
  if ("stock" in body) updates.stock = body.stock != null ? Number(body.stock) : null;
  if (typeof body.price_inr === "number") {
    if (body.price_inr < 0) return c.json({ error: "Price can't be negative" }, 400);
    updates.priceInr = String(body.price_inr);
  }
  if (typeof body.status === "string") {
    if (!["active", "draft", "archived"].includes(body.status)) return c.json({ error: "Invalid status" }, 400);
    updates.status = body.status;
  }

  const [row] = await db.update(product)
    .set(updates)
    .where(and(eq(product.id, id), eq(product.ownerId, userId)))
    .returning();
  if (!row) return c.json({ error: "Product not found" }, 404);
  return c.json(row);
});

app.delete("/products/:id", async (c) => {
  const userId = c.var.userId;
  const id = c.req.param("id");
  const deleted = await db.delete(product)
    .where(and(eq(product.id, id), eq(product.ownerId, userId)))
    .returning({ id: product.id });
  if (deleted.length === 0) return c.json({ error: "Product not found" }, 404);
  return c.json({ ok: true, id });
});

/** Bulk reorder — accepts an array of {id, sort_order}. Used by the editor's
 *  drag-handle UI in a future iteration; for now the API is ready. */
app.post("/products/reorder", async (c) => {
  const userId = c.var.userId;
  const body = await c.req.json<{ items?: Array<{ id: string; sort_order: number }> }>();
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) return c.json({ ok: true, updated: 0 });

  // Verify all ids belong to this user before updating
  const ids = items.map((i) => i.id);
  const owned = await db.select({ id: product.id }).from(product)
    .where(and(eq(product.ownerId, userId), inArray(product.id, ids)));
  const ownedSet = new Set(owned.map((r) => r.id));

  let updated = 0;
  for (const it of items) {
    if (!ownedSet.has(it.id)) continue;
    await db.update(product)
      .set({ sortOrder: Number(it.sort_order) || 0, updatedAt: new Date() })
      .where(and(eq(product.id, it.id), eq(product.ownerId, userId)));
    updated += 1;
  }
  return c.json({ ok: true, updated });
});

export default app;
