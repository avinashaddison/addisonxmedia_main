/**
 * Public site renderer — GET /biz/:slug
 *
 * No auth. Returns server-rendered HTML for a published site, pulling live
 * data from:
 *   - site row (template, theme, copy, seo)
 *   - profile (business name, UPI ID, WhatsApp + Instagram URLs)
 *   - meta_config (live WhatsApp number for click-to-chat)
 *
 * Why plain HTML strings (not React SSR): zero extra deps, fast, trivially
 * cacheable, no JS hydration needed for a content site. Tailwind via CDN so
 * we can use the same utility classes the app uses.
 *
 * Anything missing from `copy` falls back to auto-fill from profile data, so
 * a user who's set up WhatsApp + UPI sees a complete-looking site BEFORE
 * editing a single field.
 */

import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { site, profile, metaConfig, user } from "../db/schema";

const app = new Hono();

/** HTML-escape every value we interpolate to prevent XSS via user copy. */
const esc = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** WhatsApp click-to-chat link from an E.164 / "+91XXX" phone number. */
const waLink = (phone: string | null | undefined, message?: string): string | null => {
  if (!phone) return null;
  const digits = phone.replace(/\D+/g, "");
  if (!digits) return null;
  const m = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${m}`;
};

type RenderInput = {
  business: {
    name: string;
    tagline: string;
    about: string;
    phone: string | null;
    whatsapp: string | null;          // wa.me link
    upiVpa: string | null;
    upiName: string | null;
    instagram: string | null;
    address?: string;
  };
  theme: {
    primary: string;                  // hex
    accent: string;                   // hex
    font: string;
  };
  seo: { title: string; description: string; ogImage: string | null };
  slug: string;
};

/** The Kirana / Local Shop template — single page, mobile-first, fast. */
const renderKirana = (input: RenderInput): string => {
  const { business, theme, seo, slug } = input;
  const waOrderLink = business.whatsapp || "#";
  const upiPayLink = business.upiVpa
    ? `upi://pay?pa=${encodeURIComponent(business.upiVpa)}&pn=${encodeURIComponent(business.upiName || business.name)}&cu=INR`
    : null;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(seo.title)}</title>
<meta name="description" content="${esc(seo.description)}" />
<meta property="og:title" content="${esc(seo.title)}" />
<meta property="og:description" content="${esc(seo.description)}" />
${seo.ogImage ? `<meta property="og:image" content="${esc(seo.ogImage)}" />` : ""}
<meta property="og:type" content="website" />
<meta name="theme-color" content="${esc(theme.primary)}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=${esc(theme.font.replace(/ /g, "+"))}:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: { brand: "${esc(theme.primary)}", accent: "${esc(theme.accent)}" },
        fontFamily: { sans: ["${esc(theme.font)}", "ui-sans-serif", "system-ui", "sans-serif"] },
      }
    }
  };
</script>
<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: business.name,
  description: business.about,
  telephone: business.phone || undefined,
  url: `/biz/${slug}`,
})}
</script>
<style>
  body { font-family: '${esc(theme.font)}', ui-sans-serif, system-ui, sans-serif; }
  /* Subtle dot wallpaper */
  .dot-bg { background-image: radial-gradient(rgba(0,0,0,0.04) 1px, transparent 0); background-size: 18px 18px; }
</style>
</head>
<body class="text-gray-900 bg-white">

<!-- ── Header ── -->
<header class="sticky top-0 z-30 bg-white/90 backdrop-blur border-b" style="border-color: ${esc(theme.primary)}33">
  <div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
    <div class="flex items-center gap-2.5 min-w-0">
      <div class="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-[14px] flex-shrink-0 shadow"
           style="background: linear-gradient(135deg, ${esc(theme.primary)}, ${esc(theme.accent)})">
        ${esc((business.name || "?").slice(0, 1).toUpperCase())}
      </div>
      <h1 class="font-extrabold text-[15px] truncate">${esc(business.name)}</h1>
    </div>
    ${business.whatsapp ? `
    <a href="${esc(business.whatsapp)}" target="_blank" rel="noopener noreferrer"
       class="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-white text-[12px] font-extrabold transition hover:opacity-90"
       style="background: ${esc(theme.primary)}">
      💬 Order on WhatsApp
    </a>` : ""}
  </div>
</header>

<!-- ── Hero ── -->
<section class="dot-bg py-16 sm:py-24 px-4">
  <div class="max-w-5xl mx-auto text-center">
    <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider mb-5"
         style="background: ${esc(theme.accent)}22; color: ${esc(theme.primary)}">
      ⚡ Open for orders
    </div>
    <h2 class="text-[34px] sm:text-[48px] font-black leading-tight mb-4">
      ${esc(business.name)}
    </h2>
    <p class="text-[16px] sm:text-[18px] text-gray-600 max-w-xl mx-auto leading-relaxed mb-7">
      ${esc(business.tagline)}
    </p>
    <div class="flex flex-wrap justify-center gap-3">
      ${business.whatsapp ? `
      <a href="${esc(business.whatsapp)}" target="_blank" rel="noopener noreferrer"
         class="inline-flex items-center gap-2 h-12 px-6 rounded-xl text-white font-extrabold text-[14px] shadow-lg transition hover:-translate-y-0.5"
         style="background: ${esc(theme.primary)}">
        💬 Order on WhatsApp
      </a>` : ""}
      ${upiPayLink ? `
      <a href="${esc(upiPayLink)}"
         class="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-white border-2 font-extrabold text-[14px] transition hover:-translate-y-0.5"
         style="border-color: ${esc(theme.primary)}; color: ${esc(theme.primary)}">
        💳 Pay via UPI
      </a>` : ""}
    </div>
  </div>
</section>

<!-- ── About ── -->
<section class="py-12 sm:py-16 px-4 bg-gray-50">
  <div class="max-w-3xl mx-auto">
    <div class="text-center mb-8">
      <p class="text-[11px] font-extrabold uppercase tracking-[0.2em] mb-2" style="color: ${esc(theme.primary)}">About us</p>
      <h3 class="text-[26px] sm:text-[32px] font-black leading-tight">Quality you can trust</h3>
    </div>
    <p class="text-[15px] sm:text-[16px] text-gray-700 leading-relaxed text-center">
      ${esc(business.about)}
    </p>
  </div>
</section>

<!-- ── Contact ── -->
<section class="py-12 sm:py-16 px-4">
  <div class="max-w-3xl mx-auto">
    <div class="text-center mb-10">
      <p class="text-[11px] font-extrabold uppercase tracking-[0.2em] mb-2" style="color: ${esc(theme.primary)}">Reach us</p>
      <h3 class="text-[26px] sm:text-[32px] font-black leading-tight">Multiple ways to get in touch</h3>
    </div>
    <div class="grid sm:grid-cols-2 gap-4">
      ${business.whatsapp ? `
      <a href="${esc(business.whatsapp)}" target="_blank" rel="noopener noreferrer"
         class="block p-5 rounded-2xl bg-white border-2 transition hover:-translate-y-0.5 hover:shadow-lg"
         style="border-color: ${esc(theme.primary)}33">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center text-white text-[18px] flex-shrink-0" style="background: ${esc(theme.primary)}">💬</div>
          <div class="min-w-0">
            <p class="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">WhatsApp</p>
            <p class="text-[14px] font-extrabold truncate">${esc(business.phone || "Chat with us")}</p>
          </div>
        </div>
      </a>` : ""}
      ${business.upiVpa ? `
      <div class="block p-5 rounded-2xl bg-white border-2"
           style="border-color: ${esc(theme.primary)}33">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center text-white text-[18px] flex-shrink-0" style="background: ${esc(theme.accent)}">💳</div>
          <div class="min-w-0">
            <p class="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">UPI</p>
            <p class="text-[14px] font-extrabold font-mono truncate">${esc(business.upiVpa)}</p>
          </div>
        </div>
      </div>` : ""}
      ${business.instagram ? `
      <a href="${esc(business.instagram)}" target="_blank" rel="noopener noreferrer"
         class="block p-5 rounded-2xl bg-white border-2 transition hover:-translate-y-0.5 hover:shadow-lg sm:col-span-2"
         style="border-color: ${esc(theme.primary)}33">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center text-white text-[18px] flex-shrink-0 bg-gradient-to-br from-fuchsia-500 to-orange-400">📷</div>
          <div class="min-w-0">
            <p class="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Instagram</p>
            <p class="text-[14px] font-extrabold truncate">${esc(business.instagram.replace(/^https?:\/\/(www\.)?/, ""))}</p>
          </div>
        </div>
      </a>` : ""}
    </div>
  </div>
</section>

<!-- ── Footer ── -->
<footer class="py-8 px-4 border-t" style="border-color: ${esc(theme.primary)}22">
  <div class="max-w-5xl mx-auto text-center">
    <p class="text-[12px] text-gray-500">© ${new Date().getFullYear()} ${esc(business.name)} · Made with <a href="/" class="font-extrabold" style="color: ${esc(theme.primary)}">AddisonX</a></p>
  </div>
</footer>

<!-- ── Floating WhatsApp button ── -->
${business.whatsapp ? `
<a href="${esc(business.whatsapp)}" target="_blank" rel="noopener noreferrer"
   class="fixed bottom-5 right-5 w-14 h-14 rounded-full flex items-center justify-center text-white text-[24px] shadow-xl transition hover:scale-110"
   style="background: ${esc(theme.primary)}"
   aria-label="Chat on WhatsApp">💬</a>` : ""}

</body>
</html>`;
};

/** "Coming soon" placeholder for sites in draft status. */
const renderDraftHolding = (slug: string): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Coming soon — ${esc(slug)}</title>
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-amber-50 to-orange-50 min-h-screen flex items-center justify-center p-6 font-sans">
  <div class="text-center max-w-md">
    <div class="text-[64px] mb-2">🚧</div>
    <h1 class="text-[28px] font-black mb-2">Coming soon</h1>
    <p class="text-gray-600 mb-6">This page hasn't been published yet. Check back shortly.</p>
    <a href="/" class="inline-flex items-center gap-1.5 text-emerald-700 font-extrabold hover:underline">← AddisonX</a>
  </div>
</body>
</html>`;

const renderNotFound = (): string => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>404 — Not found</title><script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-amber-50 min-h-screen flex items-center justify-center p-6 font-sans">
  <div class="text-center"><div class="text-[64px]">🤷</div><h1 class="text-[24px] font-black">No site at this URL</h1><a href="/" class="text-emerald-700 font-extrabold hover:underline">← AddisonX home</a></div>
</body></html>`;

/** GET /biz/:slug — public site render. */
app.get("/biz/:slug", async (c) => {
  const slug = (c.req.param("slug") || "").toLowerCase().trim();
  if (!slug) return c.html(renderNotFound(), 404);

  const [row] = await db.select().from(site).where(eq(site.slug, slug)).limit(1);
  if (!row) return c.html(renderNotFound(), 404);

  // Draft sites get a holding page (don't leak unpublished content publicly).
  // The owner can still preview via /biz/<slug>?preview=1 (Phase 2 — TODO).
  if (row.status !== "published") return c.html(renderDraftHolding(slug), 200);

  // Pull owner profile + meta config in parallel for auto-fill
  const [pf] = await db.select().from(profile).where(eq(profile.userId, row.userId)).limit(1);
  const [mc] = await db.select({ displayPhoneNumber: metaConfig.displayPhoneNumber })
    .from(metaConfig).where(eq(metaConfig.userId, row.userId)).limit(1);
  const [u] = await db.select({ name: user.name }).from(user).where(eq(user.id, row.userId)).limit(1);

  const copy = (row.copy ?? {}) as Record<string, string>;
  const theme = (row.theme ?? {}) as Record<string, string>;

  const businessName = copy.business_name || pf?.displayName || u?.name || "My Shop";
  const tagline = copy.tagline || "Local quality, delivered with care.";
  const about = copy.about || `Welcome to ${businessName}. We're here on WhatsApp every day — message us to place an order or ask anything.`;
  const phone = pf?.phone || mc?.displayPhoneNumber || null;
  const wa = waLink(phone, `Hi ${businessName}, I'd like to place an order.`);

  const input: RenderInput = {
    business: {
      name: businessName,
      tagline,
      about,
      phone,
      whatsapp: wa,
      upiVpa: pf?.upiVpa || null,
      upiName: pf?.upiDisplayName || pf?.displayName || null,
      instagram: pf?.instagramUrl || null,
    },
    theme: {
      primary: theme.primary || "#0E8A4B",
      accent: theme.accent || "#FFD23F",
      font: theme.font || "Inter",
    },
    seo: {
      title: row.seoTitle || businessName,
      description: row.seoDescription || tagline,
      ogImage: row.seoOgImage || null,
    },
    slug,
  };

  // Bump view counter (fire and forget — don't block the response).
  void db.update(site).set({ viewCount: sql`${site.viewCount} + 1` }).where(eq(site.id, row.id)).catch(() => {});

  let html: string;
  switch (row.template) {
    case "kirana":
    default:
      html = renderKirana(input);
      break;
  }

  c.header("Cache-Control", "public, max-age=60, s-maxage=60");
  return c.html(html);
});

export default app;
