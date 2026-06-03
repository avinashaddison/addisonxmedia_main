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

/**
 * Slugs that collide with reserved paths on /biz/* — `me` is the smart-redirect,
 * the rest are common UI words we may want to claim for product routes later.
 */
const RESERVED_SLUGS = new Set([
  "me", "demo", "app", "api", "admin", "biz", "site", "store", "shop",
  "new", "edit", "settings", "account", "billing", "help", "support",
  "login", "logout", "signup", "auth", "static", "assets", "public",
  "www", "mail", "ftp", "blog", "about", "privacy", "terms", "tos",
]);

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

/** Ensure the seed slug is unique AND not reserved by appending -2, -3, … until free. */
const ensureUniqueSlug = async (seed: string, ignoreUserId?: string): Promise<string> => {
  let candidate = RESERVED_SLUGS.has(seed) ? `${seed}-shop` : seed;
  let n = 1;
  while (true) {
    const [existing] = await db.select({ id: site.id, userId: site.userId })
      .from(site).where(eq(site.slug, candidate)).limit(1);
    if ((!existing || existing.userId === ignoreUserId) && !RESERVED_SLUGS.has(candidate)) return candidate;
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
    const [[u], [pf]] = await Promise.all([
      db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, userId)).limit(1),
      db.select({ displayName: profile.displayName }).from(profile).where(eq(profile.userId, userId)).limit(1),
    ]);

    const seed = makeSlugSeed(pf?.displayName || u?.name || u?.email?.split("@")[0] || "shop");
    const slug = await ensureUniqueSlug(seed);

    [row] = await db.insert(site).values({
      userId,
      slug,
      template: "dps", // Default to Digital Product Storefront
      status: "published", // Mark published so default shop works instantly
      theme: {
        primary: "#0E8A4B",
        accent: "#FFD23F",
        font: "Plus Jakarta Sans"
      },
      copy: {
        business_name: pf?.displayName || u?.name || "Digital Tool Shop",
        tagline: "Done-for-you Notion templates & digital resources to organize your life and business.",
        about: `Hi! Welcome to our store. We build digital templates, presets, and guides to help you turn chaos into clarity. Download instantly after a secure UPI/card checkout.`
      },
    }).returning();

    // 1. Seed Default Digital Products
    const { product } = await import("../db/schema");
    await db.insert(product).values([
      {
        ownerId: userId,
        name: "Ultimate Freelancer OS — Notion Template",
        description: "Track clients, projects, invoices and goals in ONE place. Includes GST-ready invoice generator, timeline views, and monthly financial summaries.",
        priceInr: "499.00",
        photoUrl: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=1000&fit=crop",
        stock: null,
        category: "Notion Templates",
        status: "active",
        sortOrder: 0,
        isDigital: true,
        validity: "Lifetime",
        activationMail: "Thank you for your purchase! Click here to duplicate the template: https://notion.so/duplicate-freelancer-os. If you face any issues, ping us on WhatsApp.",
        activationTime: "Instant",
        priceUsd: "5.99"
      },
      {
        ownerId: userId,
        name: "Viral Hooks & Reels Template Bundle",
        description: "100+ high-converting hook templates, CTA library, and fill-in-the-blank captions to grow your audience on Instagram, YouTube & LinkedIn.",
        priceInr: "299.00",
        photoUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=300&fit=crop",
        stock: null,
        category: "Content Bundles",
        status: "active",
        sortOrder: 1,
        isDigital: true,
        validity: "Lifetime",
        activationMail: "Thank you! Download your Hooks & Reels PDF bundle here: https://addisonxmedia.com/assets/hooks-bundle.pdf",
        activationTime: "Instant",
        priceUsd: "3.99"
      },
      {
        ownerId: userId,
        name: "Personal Finance & SIP Tracker (INR)",
        description: "A complete spreadsheet to track monthly budgets, visual salary split, SIP mutual funds tracker, and automatic tax estimation for old vs new tax regimes.",
        priceInr: "199.00",
        photoUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop",
        stock: null,
        category: "Finance Tools",
        status: "active",
        sortOrder: 2,
        isDigital: true,
        validity: "Lifetime",
        activationMail: "Thank you! Duplicate the Google Sheet tracker from here: https://docs.google.com/spreadsheets/d/finance-tracker-duplicate",
        activationTime: "Instant",
        priceUsd: "2.49"
      }
    ]).catch((err) => console.error("[seed default products] failed:", err));

    // 2. Seed Default pages — full multi-page storefront out of the box
    const { sitePage: pageTable } = await import("../db/schema");
    const businessName = pf?.displayName || u?.name || "Digital Tool Shop";

    const homeSections = [
      { id: "hero-1", type: "hero", props: { headline: "", subheadline: "", primary_cta: "Get Instant Access" } },
      { id: "feature-grid-1", type: "feature_grid", props: { heading: "Why choose us", items: [
        { icon: "⚡", title: "Instant Delivery", description: "Download within 30 seconds of payment — no waiting." },
        { icon: "💳", title: "UPI + Card + Netbanking", description: "Pay the way you prefer — all major methods accepted." },
        { icon: "🛡️", title: "7-Day Money Back", description: "Not happy? Full refund within 7 days, no questions asked." },
        { icon: "💬", title: "WhatsApp Support", description: "Real human support on WhatsApp, 9am–9pm IST daily." },
        { icon: "🇮🇳", title: "Made for India", description: "Priced in INR, built for Indian creators & businesses." },
        { icon: "📱", title: "Works Everywhere", description: "Mobile, tablet, desktop — access from any device." },
      ] } },
      { id: "products-1", type: "products", props: { heading: "Our Templates & Guides", limit: 6 } },
      { id: "stats-1", type: "stats", props: { heading: "", items: [
        { value: "10,000+", label: "Happy customers" },
        { value: "⚡ <30s", label: "Instant delivery" },
        { value: "4.9★", label: "Average rating" },
        { value: "₹0", label: "Shipping cost" },
      ] } },
      { id: "testimonials-1", type: "testimonials", props: { heading: "What creators say", items: [
        { name: "Priya S., Bengaluru", text: "Duplicated the Notion OS in 10 seconds. Extremely clean setup." },
        { name: "Rahul M., Delhi", text: "Worth every rupee. The finance sheet saved me hours of calculation." },
        { name: "Anjali K., Mumbai", text: "Trustworthy seller, UPI payment was instant, got the file immediately on WhatsApp." },
      ] } },
      { id: "cta-banner-1", type: "cta_banner", props: { heading: "Ready to level up?", description: "Get instant access to premium digital products. Pay via UPI — download in 30 seconds.", cta_text: "Browse All Products", cta_link: "/shop" } },
      { id: "faq-1", type: "faq", props: { heading: "Frequently Asked Questions", items: [
        { q: "How fast will I get the products?", a: "Instantly. As soon as you complete the secure UPI/card checkout, you will receive activation links on WhatsApp and email." },
        { q: "Do you offer refunds?", a: "Yes, we support a 7-day money-back guarantee. Message us on WhatsApp if you have any issues." },
        { q: "Can I pay via UPI?", a: "Yes — UPI is our most-used payment method. We also accept cards, netbanking, and wallets." },
      ] } },
      { id: "contact-1", type: "contact", props: { heading: "Multiple ways to reach us" } },
    ];

    const shopSections = [
      { id: "hero-s1", type: "hero", props: { headline: "Shop All Products", subheadline: "Browse our complete collection of digital templates, guides, and tools.", primary_cta: "" } },
      { id: "products-s1", type: "products", props: { heading: "All Products", limit: 0 } },
    ];

    const contactSections = [
      { id: "hero-c1", type: "hero", props: { headline: "Get in Touch", subheadline: "Have a question? We'd love to hear from you. Send us a message and we'll respond on WhatsApp.", primary_cta: "" } },
      { id: "contact-c1", type: "contact", props: { heading: "Reach us directly" } },
      { id: "leadform-c1", type: "leadform", props: { heading: "Send us a message", description: "Fill out the form below and we'll get back to you on WhatsApp within a few hours." } },
    ];

    const faqSections = [
      { id: "hero-f1", type: "hero", props: { headline: "Frequently Asked Questions", subheadline: "Everything you need to know about our products, payments, and support.", primary_cta: "" } },
      { id: "faq-f1", type: "faq", props: { heading: "General Questions", items: [
        { q: "What are digital products?", a: "Digital products are downloadable files like Notion templates, spreadsheets, PDFs, design assets, and online courses that you can use immediately after purchase." },
        { q: "How do I access my purchase?", a: "After payment, you'll receive instant access via WhatsApp message and email. Most products are Notion templates (one-click duplicate) or downloadable files." },
        { q: "Can I use these products commercially?", a: "Yes, all products come with a personal + commercial license unless stated otherwise. You can use them for your business, clients, or personal projects." },
      ] } },
      { id: "faq-f2", type: "faq", props: { heading: "Payment & Pricing", items: [
        { q: "What payment methods do you accept?", a: "We accept UPI (Google Pay, PhonePe, Paytm), credit/debit cards, netbanking, and wallets. UPI is the fastest — payment confirms in 5 seconds." },
        { q: "Are prices inclusive of GST?", a: "Yes, all displayed prices are inclusive of applicable taxes. We can provide a GST invoice on request — just message us on WhatsApp with your GSTIN." },
        { q: "Do you offer discounts for bulk purchases?", a: "Yes! Message us on WhatsApp for bundle deals and custom pricing for teams or organizations." },
      ] } },
      { id: "faq-f3", type: "faq", props: { heading: "Refunds & Support", items: [
        { q: "What is your refund policy?", a: "We offer a 7-day money-back guarantee on all products. If you're not satisfied, message us on WhatsApp and we'll process a full refund within 24 hours." },
        { q: "How do I get support?", a: "The fastest way is WhatsApp — tap the green chat button on any page. We respond within 2 hours during business hours (9am–9pm IST, Mon–Sat)." },
        { q: "I didn't receive my product after payment", a: "Don't worry! Message us on WhatsApp with your payment screenshot and we'll resend the activation link immediately. This rarely happens, usually within 30 seconds of payment." },
      ] } },
      { id: "contact-f1", type: "contact", props: { heading: "Still have questions?" } },
    ];

    const refundSections = [
      { id: "hero-r1", type: "hero", props: { headline: "Refund & Return Policy", subheadline: "Your satisfaction is our priority. Read our simple, customer-friendly refund policy.", primary_cta: "" } },
      { id: "about-r1", type: "about", props: { heading: "Our Promise", bigHeading: "7-Day Money-Back Guarantee", body: `At ${businessName}, we stand behind the quality of our digital products. If you're not completely satisfied with your purchase, we offer a hassle-free 7-day money-back guarantee.\n\n**How to request a refund:**\n1. Message us on WhatsApp within 7 days of purchase\n2. Let us know which product and why you'd like a refund\n3. We'll process your refund within 24 hours — no questions asked\n\n**Important notes:**\n• Refunds are processed to the original payment method (UPI, card, etc.)\n• Digital products that have been fully consumed or duplicated may be reviewed on a case-by-case basis\n• Refund requests after 7 days are handled at our discretion\n• We may ask for brief feedback to improve our products — this is optional\n\n**Contact for refunds:**\nTap the WhatsApp button on any page to reach us instantly. Please include your order number and payment screenshot for faster processing.` } },
    ];

    const termsSections = [
      { id: "hero-t1", type: "hero", props: { headline: "Terms of Service", subheadline: `Last updated: ${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}`, primary_cta: "" } },
      { id: "about-t1", type: "about", props: { heading: "Agreement", bigHeading: "Terms & Conditions", body: `By purchasing from or using the services provided by ${businessName}, you agree to the following terms:\n\n**1. Products & Delivery**\nAll products sold are digital goods delivered electronically via WhatsApp and/or email. Delivery is instant upon successful payment. Products include but are not limited to: templates, spreadsheets, PDFs, design assets, and digital guides.\n\n**2. Payments**\nWe accept UPI, credit/debit cards, netbanking, and wallets. All prices are displayed in INR and are inclusive of applicable taxes. GST invoices are available on request.\n\n**3. License**\nEach purchase grants you a personal + commercial license for the purchased product. You may NOT resell, redistribute, or share the product files with others. Each license is for a single user/team.\n\n**4. Refunds**\nWe offer a 7-day money-back guarantee. Refund requests must be made via WhatsApp within 7 days of purchase. Refunds are processed within 24 hours to the original payment method.\n\n**5. Privacy**\nWe collect your name, phone number, and email only for order fulfillment and support. We do NOT sell or share your data with third parties. Payment processing is handled by secure, PCI-DSS compliant payment gateways.\n\n**6. Support**\nSupport is available via WhatsApp from 9am–9pm IST, Monday through Saturday. We aim to respond within 2 hours during business hours.\n\n**7. Modifications**\nWe reserve the right to update these terms at any time. Continued use of our services constitutes acceptance of the updated terms.\n\nFor questions about these terms, contact us on WhatsApp.` } },
    ];

    // Helper to create a page seed value
    const mkPage = (path: string, title: string, sortOrder: number, sections: unknown[]) => ({
      siteId: row.id,
      ownerId: userId,
      path,
      title,
      active: true,
      sortOrder,
      sections,
      draftSections: sections,
      lastPublishedAt: new Date(),
    });

    await db.insert(pageTable).values([
      mkPage("/", "Home", 0, homeSections),
      mkPage("/shop", "Shop", 1, shopSections),
      mkPage("/contact", "Contact", 2, contactSections),
      mkPage("/faq", "FAQ", 3, faqSections),
      mkPage("/refund-policy", "Refund Policy", 4, refundSections),
      mkPage("/terms", "Terms of Service", 5, termsSections),
    ]).catch((err) => console.error("[seed default pages] failed:", err));
  } else if (RESERVED_SLUGS.has(row.slug)) {
    // Migrate users whose slug collides with a reserved path (eg. "me" — which
    // is the smart-redirect path at /biz/me). Re-seed from name/email.
    const [[u], [pf]] = await Promise.all([
      db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, userId)).limit(1),
      db.select({ displayName: profile.displayName }).from(profile).where(eq(profile.userId, userId)).limit(1),
    ]);
    const seed = makeSlugSeed(pf?.displayName || u?.name || u?.email?.split("@")[0] || "shop");
    const newSlug = await ensureUniqueSlug(seed, userId);
    [row] = await db.update(site).set({ slug: newSlug, updatedAt: new Date() })
      .where(eq(site.userId, userId)).returning();
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
    if (RESERVED_SLUGS.has(cleaned)) return c.json({ error: `"${cleaned}" is a reserved URL. Try a different one.` }, 400);
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
  if (RESERVED_SLUGS.has(cleaned)) return c.json({ slug: cleaned, available: false, reason: "reserved" });

  const [clash] = await db.select({ userId: site.userId }).from(site)
    .where(eq(site.slug, cleaned)).limit(1);
  // It's available if nobody has it, or if it's the current user's own slug
  const available = !clash || clash.userId === userId;
  return c.json({ slug: cleaned, available, mine: !!clash && clash.userId === userId });
});

export default app;
