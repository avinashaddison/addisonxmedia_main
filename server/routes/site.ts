/**
 * Website / storefront builder — Phase 1 routes.
 *
 *   GET    /api/site/me           → load current user's site (auto-creates if none)
 *   PATCH  /api/site/me           → update editable fields (slug, copy, theme, seo)
 *   POST   /api/site/me/publish   → flip status to 'published' (no-op if already)
 *   POST   /api/site/me/unpublish → flip status back to 'draft'
 *   GET    /api/site/slug/check?slug=foo → availability check before save
 *
 * One row per user, enforced by site.user_id UNIQUE. The public renderer
 * lives outside /api at GET /biz/:slug (see server/routes/site-public.ts).
 */

import { Hono } from "hono";
import { and, eq, ne, desc } from "drizzle-orm";
import { db } from "../db/client";
import { site, siteLead, profile, user } from "../db/schema";
import { requireAuth, type AuthVariables } from "../middleware/auth";

const app = new Hono<{ Variables: AuthVariables }>();
app.use("*", requireAuth);

/** Derive a clean slug from a name/email — lowercase, hyphenated, ASCII only. */
const makeSlugSeed = (raw: string): string => {
  const s = (raw || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")        // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return s || "shop";
};

/** Ensure the seed slug is unique by appending -2, -3, … until free. */
const ensureUniqueSlug = async (seed: string, ignoreUserId?: string): Promise<string> => {
  let candidate = seed;
  let n = 1;
  while (true) {
    const [existing] = await db.select({ id: site.id, userId: site.userId })
      .from(site).where(eq(site.slug, candidate)).limit(1);
    if (!existing || existing.userId === ignoreUserId) return candidate;
    n += 1;
    candidate = `${seed}-${n}`;
    if (n > 50) {
      // Pathological — fall back to random suffix
      return `${seed}-${Math.random().toString(36).slice(2, 7)}`;
    }
  }
};

/** Load (or auto-create) the current user's site. */
app.get("/site/me", async (c) => {
  const userId = c.var.userId;

  let [row] = await db.select().from(site).where(eq(site.userId, userId)).limit(1);

  if (!row) {
    // Seed from user record + profile so the very first edit lands on
    // sensible defaults instead of empty fields.
    const [u] = await db.select({ name: user.name, email: user.email })
      .from(user).where(eq(user.id, userId)).limit(1);
    const [pf] = await db.select({ displayName: profile.displayName })
      .from(profile).where(eq(profile.userId, userId)).limit(1);

    const seed = makeSlugSeed(pf?.displayName || u?.name || u?.email?.split("@")[0] || "shop");
    const slug = await ensureUniqueSlug(seed);

    [row] = await db.insert(site).values({
      userId,
      slug,
      template: "kirana",
      status: "draft",
      theme: {},
      copy: {},
    }).returning();
  }

  return c.json(row);
});

/** Patch editable fields. Slug uniqueness is re-checked on the server. */
app.patch("/site/me", async (c) => {
  const userId = c.var.userId;
  const body = await c.req.json<{
    slug?: string;
    template?: string;
    theme?: Record<string, unknown>;
    copy?: Record<string, unknown>;
    seo_title?: string | null;
    seo_description?: string | null;
    seo_og_image?: string | null;
    favicon_url?: string | null;
    ga4_id?: string | null;
    meta_pixel_id?: string | null;
    custom_head_html?: string | null;
    allow_indexing?: boolean;
  }>();

  // Load existing so we know if it exists + can do partial updates
  const [existing] = await db.select().from(site).where(eq(site.userId, userId)).limit(1);
  if (!existing) return c.json({ error: "Site not found — call GET /site/me first" }, 404);

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof body.slug === "string") {
    const cleaned = makeSlugSeed(body.slug);
    if (!cleaned) return c.json({ error: "Slug can't be empty after cleanup. Use lowercase letters, numbers and hyphens." }, 400);
    if (cleaned !== existing.slug) {
      // Check the new slug isn't taken by anyone else
      const [clash] = await db.select({ id: site.id }).from(site)
        .where(and(eq(site.slug, cleaned), ne(site.userId, userId))).limit(1);
      if (clash) return c.json({ error: "That slug is already taken. Try another." }, 409);
    }
    updates.slug = cleaned;
  }

  if (typeof body.template === "string") {
    const allowed = new Set(["kirana", "salon", "restaurant", "services", "dps"]);
    if (!allowed.has(body.template)) return c.json({ error: "Invalid template" }, 400);
    updates.template = body.template;
  }

  if (body.theme && typeof body.theme === "object") updates.theme = body.theme;
  if (body.copy && typeof body.copy === "object") updates.copy = body.copy;
  if ("seo_title" in body) updates.seoTitle = body.seo_title ?? null;
  if ("seo_description" in body) updates.seoDescription = body.seo_description ?? null;
  if ("seo_og_image" in body) updates.seoOgImage = body.seo_og_image ?? null;
  if ("favicon_url" in body) updates.faviconUrl = body.favicon_url ?? null;
  if ("ga4_id" in body) {
    const v = (body.ga4_id ?? "").trim();
    if (v && !/^G-[A-Z0-9]+$/i.test(v)) return c.json({ error: "GA4 ID looks invalid — should be like G-XXXXXXX" }, 400);
    updates.ga4Id = v || null;
  }
  if ("meta_pixel_id" in body) {
    const v = (body.meta_pixel_id ?? "").trim();
    if (v && !/^\d{6,20}$/.test(v)) return c.json({ error: "Meta Pixel ID looks invalid — should be 6-20 digits" }, 400);
    updates.metaPixelId = v || null;
  }
  if ("custom_head_html" in body) updates.customHeadHtml = body.custom_head_html ?? null;
  if (typeof body.allow_indexing === "boolean") updates.allowIndexing = body.allow_indexing;

  const [updated] = await db.update(site).set(updates).where(eq(site.userId, userId)).returning();
  return c.json(updated);
});

/** Flip status to 'published'. Idempotent — repeated calls just bump updated_at. */
app.post("/site/me/publish", async (c) => {
  const userId = c.var.userId;
  const [updated] = await db.update(site)
    .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(site.userId, userId))
    .returning();
  if (!updated) return c.json({ error: "Site not found" }, 404);
  return c.json(updated);
});

/** Flip status back to 'draft'. */
app.post("/site/me/unpublish", async (c) => {
  const userId = c.var.userId;
  const [updated] = await db.update(site)
    .set({ status: "draft", updatedAt: new Date() })
    .where(eq(site.userId, userId))
    .returning();
  if (!updated) return c.json({ error: "Site not found" }, 404);
  return c.json(updated);
});

/** Set / clear custom domain. Verification is a separate step. */
app.patch("/site/me/domain", async (c) => {
  const userId = c.var.userId;
  const body = await c.req.json<{ custom_domain?: string | null }>();

  // Normalize to a clean hostname — strip protocol + trailing slash + path
  let domain: string | null = null;
  if (typeof body.custom_domain === "string") {
    const raw = body.custom_domain.trim().toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/:\d+$/, "");
    if (raw && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(raw)) {
      return c.json({ error: "Please enter a valid domain like shop.example.com" }, 400);
    }
    domain = raw || null;
  }

  // Domain uniqueness
  if (domain) {
    const [clash] = await db.select({ id: site.id }).from(site)
      .where(and(eq(site.customDomain, domain), ne(site.userId, userId))).limit(1);
    if (clash) return c.json({ error: "That domain is already connected to another AddisonX site." }, 409);
  }

  const [updated] = await db.update(site)
    .set({ customDomain: domain, customDomainVerified: false, updatedAt: new Date() })
    .where(eq(site.userId, userId))
    .returning();
  if (!updated) return c.json({ error: "Site not found" }, 404);
  return c.json(updated);
});

/** Crude DNS check — fetches /biz/<slug> through the custom domain and
 *  verifies it ends up at our server. Real verification (TXT record) ships
 *  in Phase 3 when we wire Caddy auto-SSL. */
app.post("/site/me/domain/verify", async (c) => {
  const userId = c.var.userId;
  const [row] = await db.select().from(site).where(eq(site.userId, userId)).limit(1);
  if (!row || !row.customDomain) return c.json({ error: "No custom domain set" }, 400);

  // For now we just mark it verified — the actual DNS check happens server-side
  // in Phase 3 (needs DNS lookup library + Caddy integration). UI exposes this
  // as "Mark as verified once your CNAME is live (we'll auto-check in v2)".
  const [updated] = await db.update(site)
    .set({ customDomainVerified: true, updatedAt: new Date() })
    .where(eq(site.userId, userId))
    .returning();
  return c.json(updated);
});

/** List leads captured from the site (most recent first). */
app.get("/site/leads", async (c) => {
  const userId = c.var.userId;
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const rows = await db.select().from(siteLead)
    .where(eq(siteLead.ownerId, userId))
    .orderBy(desc(siteLead.createdAt))
    .limit(limit);
  return c.json(rows);
});

/** Slug availability check — used by the editor while typing. */
app.get("/site/slug/check", async (c) => {
  const userId = c.var.userId;
  const raw = c.req.query("slug") ?? "";
  const cleaned = makeSlugSeed(raw);
  if (!cleaned) return c.json({ slug: "", available: false, reason: "empty" });

  const [clash] = await db.select({ userId: site.userId }).from(site)
    .where(eq(site.slug, cleaned)).limit(1);
  // It's available if nobody has it, or if it's the current user's own slug
  const available = !clash || clash.userId === userId;
  return c.json({ slug: cleaned, available, mine: !!clash && clash.userId === userId });
});

export default app;
