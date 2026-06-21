/**
 * Shipping zones — admin CRUD + public quote endpoint.
 *
 *   GET    /api/shipping-zones                → list (admin)
 *   POST   /api/shipping-zones                → create (admin)
 *   PATCH  /api/shipping-zones/:id            → update (admin)
 *   DELETE /api/shipping-zones/:id            → delete (admin)
 *
 * Public shipping calc (used by cart) lives in site-public.ts:
 *   POST /biz/:slug/shipping/quote { pincode, cart_subtotal_inr }
 *                                  → { ok, rate_inr, zone_name, eta_days?, free? }
 */

import { Hono } from "hono";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { shippingZone } from "../db/schema";
import { requireAuth, type AuthVariables } from "../middleware/auth";

const app = new Hono<{ Variables: AuthVariables }>();
app.use("*", requireAuth);

app.get("/shipping-zones", async (c) => {
  const rows = await db.select().from(shippingZone)
    .where(eq(shippingZone.ownerId, c.var.userId))
    .orderBy(asc(shippingZone.sortOrder), asc(shippingZone.createdAt));
  return c.json(rows);
});

app.post("/shipping-zones", async (c) => {
  const userId = c.var.userId;
  const body = await c.req.json<{
    name?: string;
    pincode_prefixes?: string;
    rate_inr?: number;
    free_above_inr?: number | null;
    eta_days?: number | null;
    active?: boolean;
  }>();
  const name = (body.name || "").trim();
  if (!name) return c.json({ error: "Zone name is required" }, 400);

  const [maxRow] = await db.select({ sortOrder: shippingZone.sortOrder }).from(shippingZone)
    .where(eq(shippingZone.ownerId, userId)).orderBy(asc(shippingZone.sortOrder));
  const nextSort = (Number(maxRow?.sortOrder ?? -1) + 1) || 0;

  const [row] = await db.insert(shippingZone).values({
    ownerId: userId,
    name,
    pincodePrefixes: (body.pincode_prefixes || "").replace(/\s+/g, ""),
    rateInr: String(Math.max(0, Number(body.rate_inr) || 0)),
    freeAboveInr: body.free_above_inr != null ? String(Math.max(0, Number(body.free_above_inr))) : null,
    etaDays: body.eta_days != null ? Math.max(0, Math.floor(Number(body.eta_days))) : null,
    active: body.active !== false,
    sortOrder: nextSort,
  }).returning();
  return c.json(row, 201);
});

app.patch("/shipping-zones/:id", async (c) => {
  const userId = c.var.userId;
  const id = c.req.param("id");
  const body = await c.req.json<{
    name?: string;
    pincode_prefixes?: string;
    rate_inr?: number;
    free_above_inr?: number | null;
    eta_days?: number | null;
    active?: boolean;
    sort_order?: number;
  }>();

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.name === "string") {
    const t = body.name.trim();
    if (!t) return c.json({ error: "Name can't be empty" }, 400);
    updates.name = t;
  }
  if (typeof body.pincode_prefixes === "string") updates.pincodePrefixes = body.pincode_prefixes.replace(/\s+/g, "");
  if (typeof body.rate_inr === "number") updates.rateInr = String(Math.max(0, body.rate_inr));
  if ("free_above_inr" in body) updates.freeAboveInr = body.free_above_inr != null ? String(Math.max(0, Number(body.free_above_inr))) : null;
  if ("eta_days" in body) updates.etaDays = body.eta_days != null ? Math.max(0, Math.floor(Number(body.eta_days))) : null;
  if (typeof body.active === "boolean") updates.active = body.active;
  if (typeof body.sort_order === "number") updates.sortOrder = body.sort_order;

  const [row] = await db.update(shippingZone)
    .set(updates)
    .where(and(eq(shippingZone.id, id), eq(shippingZone.ownerId, userId)))
    .returning();
  if (!row) return c.json({ error: "Zone not found" }, 404);
  return c.json(row);
});

app.delete("/shipping-zones/:id", async (c) => {
  const userId = c.var.userId;
  const id = c.req.param("id");
  const del = await db.delete(shippingZone)
    .where(and(eq(shippingZone.id, id), eq(shippingZone.ownerId, userId)))
    .returning({ id: shippingZone.id });
  if (del.length === 0) return c.json({ error: "Zone not found" }, 404);
  return c.json({ ok: true });
});

/** Picks the best-matching shipping zone for a pincode + cart subtotal.
 *  Returns null when there's no applicable zone (cart UI shows "calculated separately"). */
export async function pickShippingQuote(
  ownerId: string,
  pincode: string,
  cartSubtotal: number,
): Promise<{ zoneId: string; zoneName: string; rateInr: number; etaDays: number | null; free: boolean } | null> {
  const zones = await db.select().from(shippingZone)
    .where(and(eq(shippingZone.ownerId, ownerId), eq(shippingZone.active, true)))
    .orderBy(asc(shippingZone.sortOrder));
  if (zones.length === 0) return null;

  const pin = (pincode || "").replace(/\D+/g, "");
  // Find the most specific matching zone (longest matching prefix)
  let best: { zone: typeof zones[number]; matchLen: number } | null = null;
  for (const z of zones) {
    const prefixes = z.pincodePrefixes.split(",").map((s) => s.trim()).filter(Boolean);
    if (prefixes.length === 0) {
      // Default zone (matches anything) — fallback if no specific match
      if (!best || best.matchLen === 0) best = { zone: z, matchLen: 0 };
      continue;
    }
    for (const p of prefixes) {
      if (pin.startsWith(p)) {
        if (!best || p.length > best.matchLen) best = { zone: z, matchLen: p.length };
      }
    }
  }
  if (!best) return null;

  const free = best.zone.freeAboveInr != null && cartSubtotal >= Number(best.zone.freeAboveInr);
  return {
    zoneId: best.zone.id,
    zoneName: best.zone.name,
    rateInr: free ? 0 : Number(best.zone.rateInr),
    etaDays: best.zone.etaDays,
    free,
  };
}

export default app;
