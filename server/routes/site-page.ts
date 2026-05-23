/**
 * Multi-page editor — CRUD on site_page rows. Each page is an ordered list
 * of sections stored as JSONB. Section schema:
 *   { id: string, type: 'hero'|'about'|'products'|'gallery'|'testimonials'|
 *                       'faq'|'hours'|'leadform'|'contact', props: {...} }
 *
 * The renderer (site-public.ts) reads pages for the site when present, falls
 * back to the legacy single-page Kirana template when none exist.
 */

import { Hono } from "hono";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { site, sitePage } from "../db/schema";
import { requireAuth, type AuthVariables } from "../middleware/auth";

const app = new Hono<{ Variables: AuthVariables }>();
app.use("*", requireAuth);

const cleanPath = (raw: string): string => {
  let p = (raw || "").trim().toLowerCase();
  if (!p.startsWith("/")) p = "/" + p;
  // Remove trailing slash except for root
  if (p !== "/" && p.endsWith("/")) p = p.slice(0, -1);
  // Allow letters, numbers, hyphens, slash (max 1 deep)
  if (!/^\/[a-z0-9-]*$/.test(p)) return "";
  return p;
};

app.get("/site/pages", async (c) => {
  const userId = c.var.userId;
  const [s] = await db.select({ id: site.id }).from(site).where(eq(site.userId, userId)).limit(1);
  if (!s) return c.json([]);
  const rows = await db.select().from(sitePage)
    .where(eq(sitePage.siteId, s.id))
    .orderBy(asc(sitePage.sortOrder), asc(sitePage.createdAt));
  return c.json(rows);
});

app.post("/site/pages", async (c) => {
  const userId = c.var.userId;
  const body = await c.req.json<{ path?: string; title?: string; sections?: unknown[] }>();
  const path = cleanPath(body.path || "");
  if (!path) return c.json({ error: "Path must look like '/about', lowercase letters/numbers/hyphens" }, 400);

  const [s] = await db.select({ id: site.id }).from(site).where(eq(site.userId, userId)).limit(1);
  if (!s) return c.json({ error: "Create a site first" }, 400);

  try {
    const [row] = await db.insert(sitePage).values({
      siteId: s.id,
      ownerId: userId,
      path,
      title: body.title?.trim() || null,
      sections: Array.isArray(body.sections) ? body.sections : [],
    }).returning();
    return c.json(row, 201);
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return c.json({ error: `Page ${path} already exists` }, 409);
    throw e;
  }
});

app.patch("/site/pages/:id", async (c) => {
  const userId = c.var.userId;
  const id = c.req.param("id");
  const body = await c.req.json<{
    path?: string;
    title?: string | null;
    sections?: unknown[];
    sort_order?: number;
    active?: boolean;
    seo_title?: string | null;
    seo_description?: string | null;
  }>();

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.path === "string") {
    const p = cleanPath(body.path);
    if (!p) return c.json({ error: "Invalid path" }, 400);
    updates.path = p;
  }
  if ("title" in body) updates.title = body.title ?? null;
  if (Array.isArray(body.sections)) updates.sections = body.sections;
  if (typeof body.sort_order === "number") updates.sortOrder = body.sort_order;
  if (typeof body.active === "boolean") updates.active = body.active;
  if ("seo_title" in body) updates.seoTitle = body.seo_title ?? null;
  if ("seo_description" in body) updates.seoDescription = body.seo_description ?? null;

  try {
    const [row] = await db.update(sitePage).set(updates)
      .where(and(eq(sitePage.id, id), eq(sitePage.ownerId, userId)))
      .returning();
    if (!row) return c.json({ error: "Page not found" }, 404);
    return c.json(row);
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return c.json({ error: "Another page already uses that path" }, 409);
    throw e;
  }
});

app.delete("/site/pages/:id", async (c) => {
  const userId = c.var.userId;
  const id = c.req.param("id");
  const del = await db.delete(sitePage)
    .where(and(eq(sitePage.id, id), eq(sitePage.ownerId, userId)))
    .returning({ id: sitePage.id });
  if (del.length === 0) return c.json({ error: "Page not found" }, 404);
  return c.json({ ok: true });
});

export default app;
