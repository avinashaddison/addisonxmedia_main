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
import { eq, sql, and, asc, inArray } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "../db/client";
import { site, siteLead, contact, profile, metaConfig, product, orderTbl, orderItem, siteAnalyticsEvent, coupon, sitePage, user } from "../db/schema";
import { nextOrderNumber } from "./order";
import { validateCoupon } from "./coupon";
import { pickShippingQuote } from "./shipping";
import { cashfreeIsConfigured, cashfreeMode } from "../integrations/cashfree";
import { auth } from "../auth";

/** Owner-only preview check — if URL has ?preview=draft AND visitor is the
 *  site owner, render draft_sections instead of published. Used by Builder
 *  iframe so editors see unpublished changes in real time. */
const isOwnerPreview = async (c: { req: { url: string; raw: { headers: Headers } } }, siteUserId: string): Promise<boolean> => {
  if (new URL(c.req.url).searchParams.get("preview") !== "draft") return false;
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    return !!session?.user && session.user.id === siteUserId;
  } catch {
    return false;
  }
};

/** Derive a referrer host bucket from the Referer header. */
const refHostBucket = (referer: string | null | undefined): string => {
  if (!referer) return "direct";
  try {
    const h = new URL(referer).hostname.replace(/^www\./, "").toLowerCase();
    if (/google\./.test(h)) return "google";
    if (/(facebook|fb)\./.test(h)) return "facebook";
    if (/instagram\./.test(h)) return "instagram";
    if (/whatsapp\./.test(h) || h === "wa.me" || h === "api.whatsapp.com") return "whatsapp";
    if (/youtube\./.test(h) || h === "youtu.be") return "youtube";
    if (/(twitter|x)\.com/.test(h)) return "twitter";
    return h;
  } catch { return "direct"; }
};

/** Best-effort, non-blocking analytics event recording. */
const logEvent = (params: {
  siteId: string;
  ownerId: string;
  eventType: string;
  path?: string | null;
  referrerHost?: string | null;
  valueInr?: number | null;
  sessionHash?: string | null;
  userAgent?: string | null;
}) => {
  void db.insert(siteAnalyticsEvent).values({
    siteId: params.siteId,
    ownerId: params.ownerId,
    eventType: params.eventType,
    path: params.path ?? null,
    referrerHost: params.referrerHost ?? null,
    valueInr: params.valueInr != null ? String(params.valueInr) : null,
    sessionHash: params.sessionHash ?? null,
    userAgent: params.userAgent ?? null,
  }).catch((e) => console.error("[analytics] insert failed", e));
};

const app = new Hono();

/** Coerce JSONB value to boolean — handles true / "true" / 1 / "1". */
const truthy = (v: unknown): boolean => v === true || v === "true" || v === 1 || v === "1";

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

type ProductRender = {
  id: string;
  name: string;
  description: string | null;
  priceInr: number;
  photoUrl: string | null;
  inStock: boolean;
};

type RenderInput = {
  template: string;
  cashfree: { enabled: boolean; mode: string };
  advanced: {
    faviconUrl: string | null;
    ga4Id: string | null;
    metaPixelId: string | null;
    customHeadHtml: string | null;
    allowIndexing: boolean;
  };
  business: {
    name: string;
    tagline: string;
    about: string;
    phone: string | null;
    whatsapp: string | null;          // wa.me link
    upiVpa: string | null;
    upiName: string | null;
    email: string | null;
    instagram: string | null;
    facebook: string | null;
    address: string | null;
    hours: string | null;
    logoUrl: string | null;
    coverUrl: string | null;
  };
  visibility: {
    products: boolean;
    hours: boolean;
    address: boolean;
    contact: boolean;
    leadform: boolean;
  };
  theme: {
    primary: string;                  // hex
    accent: string;                   // hex
    font: string;
  };
  seo: { title: string; description: string; ogImage: string | null };
  slug: string;
  products: ProductRender[];
};

/** Per-template copy + label overrides — shared base template, swapped vocabulary. */
const TEMPLATE_VOCAB: Record<string, {
  productsHeading: string;
  productsHint: string;
  orderButtonText: string;
  heroPill: string;
  heroPillEmoji: string;
  aboutHeading: string;
  aboutHeadingSub: string;
  aboutBigHeading: string;
}> = {
  kirana: {
    productsHeading: "Browse products",
    productsHint: "Add to cart and checkout in 30 seconds — pay via UPI or cash on delivery.",
    orderButtonText: "Order on WhatsApp",
    heroPill: "Open for orders",
    heroPillEmoji: "⚡",
    aboutHeading: "About us",
    aboutHeadingSub: "Quality you can trust",
    aboutBigHeading: "Quality you can trust",
  },
  salon: {
    productsHeading: "Our services",
    productsHint: "Book your appointment instantly on WhatsApp — pay at the salon or online.",
    orderButtonText: "Book on WhatsApp",
    heroPill: "Now booking",
    heroPillEmoji: "💇",
    aboutHeading: "About us",
    aboutHeadingSub: "Hair · skin · nails — done right",
    aboutBigHeading: "Pamper yourself",
  },
  restaurant: {
    productsHeading: "Today's menu",
    productsHint: "Add dishes to cart for home delivery, or message us to reserve a table.",
    orderButtonText: "Order on WhatsApp",
    heroPill: "Kitchen open",
    heroPillEmoji: "🍽️",
    aboutHeading: "About",
    aboutHeadingSub: "Fresh ingredients, recipes from home",
    aboutBigHeading: "Made with love",
  },
  services: {
    productsHeading: "Our packages",
    productsHint: "Browse what we offer — message us on WhatsApp for a custom quote.",
    orderButtonText: "Enquire on WhatsApp",
    heroPill: "Accepting bookings",
    heroPillEmoji: "🛠️",
    aboutHeading: "About us",
    aboutHeadingSub: "Years of trusted service",
    aboutBigHeading: "Why customers pick us",
  },
  dps: {
    productsHeading: "Featured products",
    productsHint: "Instant download after payment — UPI / Card / Netbanking all accepted.",
    orderButtonText: "Get instant access",
    heroPill: "Instant download",
    heroPillEmoji: "⚡",
    aboutHeading: "About",
    aboutHeadingSub: "Made by an Indian creator, for Indian creators",
    aboutBigHeading: "Why thousands of Indians trust us",
  },
};

const vocabFor = (template: string) => TEMPLATE_VOCAB[template] || TEMPLATE_VOCAB.kirana;

// ─── Section render functions ─────────────────────────────────────────────
//
// Each section type known to the editor (see PagesPage.tsx SECTION_LIBRARY)
// has a dedicated renderer that returns plain HTML. The Builder lets users
// add/reorder these on each page; the public renderer reads site_page.sections
// and stitches them together in order.
//
// All sections receive the same `ctx` so vocab/theme/business are available
// everywhere — kept as one bag to avoid threading 8 props through every fn.

type SectionProps = Record<string, unknown>;
type SectionCtx = {
  business: RenderInput["business"];
  theme: RenderInput["theme"];
  vocab: ReturnType<typeof vocabFor>;
  slug: string;
  products: RenderInput["products"];
  cashfree: RenderInput["cashfree"];
};

const sec = {
  hero: (p: SectionProps, c: SectionCtx) => {
    const headline = String(p.headline || c.business.name);
    const sub = String(p.subheadline || c.business.tagline);
    const upiPayLink = c.business.upiVpa
      ? `upi://pay?pa=${encodeURIComponent(c.business.upiVpa)}&pn=${encodeURIComponent(c.business.upiName || c.business.name)}&cu=INR`
      : null;
    return `<section class="${c.business.coverUrl ? "relative" : "dot-bg"} py-16 sm:py-24 px-4"
      ${c.business.coverUrl ? `style="background-image: linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)), url(${JSON.stringify(c.business.coverUrl).slice(1, -1)}); background-size: cover; background-position: center;"` : ""}>
  <div class="max-w-5xl mx-auto text-center">
    <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider mb-5"
         style="background: ${esc(c.theme.accent)}22; color: ${esc(c.theme.primary)}">
      ${esc(c.vocab.heroPillEmoji)} ${esc(c.vocab.heroPill)}
    </div>
    <h2 class="text-[34px] sm:text-[48px] font-black leading-tight mb-4">${esc(headline)}</h2>
    <p class="text-[16px] sm:text-[18px] text-gray-600 max-w-xl mx-auto leading-relaxed mb-7">${esc(sub)}</p>
    <div class="flex flex-wrap justify-center gap-3">
      ${c.business.whatsapp ? `<a href="${esc(c.business.whatsapp)}" target="_blank" rel="noopener noreferrer"
         class="inline-flex items-center gap-2 h-12 px-6 rounded-xl text-white font-extrabold text-[14px] shadow-lg transition hover:-translate-y-0.5"
         style="background: ${esc(c.theme.primary)}">💬 ${esc(String(p.primary_cta || c.vocab.orderButtonText))}</a>` : ""}
      ${upiPayLink ? `<a href="${esc(upiPayLink)}"
         class="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-white border-2 font-extrabold text-[14px] transition hover:-translate-y-0.5"
         style="border-color: ${esc(c.theme.primary)}; color: ${esc(c.theme.primary)}">💳 Pay via UPI</a>` : ""}
    </div>
  </div>
</section>`;
  },

  about: (p: SectionProps, c: SectionCtx) => {
    const heading = String(p.heading || c.vocab.aboutHeading);
    const bigHeading = String(p.bigHeading || c.vocab.aboutBigHeading);
    const body = String(p.body || c.business.about);
    return `<section class="py-12 sm:py-16 px-4 bg-gray-50">
  <div class="max-w-3xl mx-auto">
    <div class="text-center mb-8">
      <p class="text-[11px] font-extrabold uppercase tracking-[0.2em] mb-2" style="color: ${esc(c.theme.primary)}">${esc(heading)}</p>
      <h3 class="text-[26px] sm:text-[32px] font-black leading-tight">${esc(bigHeading)}</h3>
    </div>
    <p class="text-[15px] sm:text-[16px] text-gray-700 leading-relaxed text-center">${esc(body)}</p>
  </div>
</section>`;
  },

  products: (p: SectionProps, c: SectionCtx) => {
    if (c.products.length === 0) return "";
    const heading = String(p.heading || c.vocab.productsHeading);
    const limitProp = Number(p.limit);
    const limit = Number.isFinite(limitProp) && limitProp > 0 ? limitProp : c.products.length;
    const list = c.products.slice(0, limit);
    return `<section id="products" class="py-12 sm:py-16 px-4">
  <div class="max-w-5xl mx-auto">
    <div class="text-center mb-8">
      <p class="text-[11px] font-extrabold uppercase tracking-[0.2em] mb-2" style="color: ${esc(c.theme.primary)}">Our offerings</p>
      <h3 class="text-[26px] sm:text-[32px] font-black leading-tight">${esc(heading)}</h3>
      <p class="text-[13px] text-gray-600 mt-2">${esc(c.vocab.productsHint)}</p>
    </div>
    <div class="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
      ${list.map((prod) => {
        const waText = `Hi ${c.business.name}, I'd like to order:\n• ${prod.name}${prod.priceInr > 0 ? ` — ₹${prod.priceInr.toLocaleString("en-IN")}` : ""}`;
        const waLink = c.business.whatsapp ? `${c.business.whatsapp.split("?")[0]}?text=${encodeURIComponent(waText)}` : null;
        return `<article class="bg-white rounded-2xl border-2 overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg flex flex-col" style="border-color: ${esc(c.theme.primary)}22">
          ${prod.photoUrl
            ? `<div class="aspect-square bg-gray-50 overflow-hidden"><img src="${esc(prod.photoUrl)}" alt="${esc(prod.name)}" class="w-full h-full object-cover" loading="lazy" onerror="this.style.display='none'" /></div>`
            : `<div class="aspect-square bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center text-gray-300 text-[36px]">📦</div>`}
          <div class="p-3 sm:p-4 flex flex-col flex-1">
            <h4 class="font-extrabold text-[13px] sm:text-[14px] leading-tight line-clamp-2">${esc(prod.name)}</h4>
            ${prod.description ? `<p class="text-[11px] text-gray-600 mt-1 line-clamp-2 leading-snug">${esc(prod.description)}</p>` : ""}
            <div class="mt-2.5 flex items-center justify-between gap-2">
              ${prod.priceInr > 0 ? `<span class="text-[15px] sm:text-[16px] font-black tabular-nums" style="color: ${esc(c.theme.primary)}">₹${prod.priceInr.toLocaleString("en-IN")}</span>` : `<span class="text-[11px] font-bold text-gray-500">Price on request</span>`}
            </div>
            ${!prod.inStock ? `<p class="mt-1.5 text-[10px] font-bold text-rose-600 uppercase tracking-wider">Out of stock</p>` : ""}
            <div class="mt-3 flex gap-2">
              ${prod.inStock && prod.priceInr > 0 ? `<button type="button" onclick="window.AxCart && window.AxCart.add('${esc(prod.id)}', ${JSON.stringify(prod.name).replace(/"/g, "&quot;")}, ${prod.priceInr}, ${JSON.stringify(prod.photoUrl).replace(/"/g, "&quot;")})"
                class="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg text-white text-[12px] font-extrabold hover:opacity-90 transition" style="background: ${esc(c.theme.primary)}">🛒 Add</button>` : ""}
              ${waLink ? `<a href="${esc(waLink)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white border-2 hover:bg-gray-50 transition flex-shrink-0" style="border-color: ${esc(c.theme.primary)}33; color: ${esc(c.theme.primary)}" aria-label="Order ${esc(prod.name)} on WhatsApp">💬</a>` : ""}
            </div>
          </div>
        </article>`;
      }).join("")}
    </div>
  </div>
</section>`;
  },

  gallery: (p: SectionProps, c: SectionCtx) => {
    const heading = String(p.heading || "Gallery");
    const images = Array.isArray(p.images) ? (p.images as string[]).filter((u) => typeof u === "string" && u.trim()) : [];
    if (images.length === 0) return "";
    return `<section class="py-12 sm:py-16 px-4">
  <div class="max-w-5xl mx-auto">
    <div class="text-center mb-8">
      <p class="text-[11px] font-extrabold uppercase tracking-[0.2em] mb-2" style="color: ${esc(c.theme.primary)}">Gallery</p>
      <h3 class="text-[26px] sm:text-[32px] font-black leading-tight">${esc(heading)}</h3>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      ${images.map((url) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="block aspect-square rounded-xl overflow-hidden bg-gray-100 hover:opacity-90 transition"><img src="${esc(url)}" alt="" class="w-full h-full object-cover" loading="lazy" onerror="this.style.display='none'" /></a>`).join("")}
    </div>
  </div>
</section>`;
  },

  testimonials: (p: SectionProps, c: SectionCtx) => {
    const heading = String(p.heading || "What customers say");
    const items = Array.isArray(p.items) ? (p.items as Array<{ name?: string; text?: string }>).filter((it) => it && (it.name || it.text)) : [];
    if (items.length === 0) return "";
    return `<section class="py-12 sm:py-16 px-4 bg-gray-50">
  <div class="max-w-4xl mx-auto">
    <div class="text-center mb-8">
      <p class="text-[11px] font-extrabold uppercase tracking-[0.2em] mb-2" style="color: ${esc(c.theme.primary)}">Reviews</p>
      <h3 class="text-[26px] sm:text-[32px] font-black leading-tight">${esc(heading)}</h3>
    </div>
    <div class="grid sm:grid-cols-2 gap-4">
      ${items.map((it) => `<blockquote class="p-5 rounded-2xl bg-white border-2" style="border-color: ${esc(c.theme.primary)}22">
        <p class="text-[14px] text-gray-700 italic leading-relaxed">"${esc(it.text || "")}"</p>
        ${it.name ? `<p class="text-[12px] font-extrabold mt-3" style="color: ${esc(c.theme.primary)}">— ${esc(it.name)}</p>` : ""}
      </blockquote>`).join("")}
    </div>
  </div>
</section>`;
  },

  faq: (p: SectionProps, c: SectionCtx) => {
    const heading = String(p.heading || "Frequently asked");
    const items = Array.isArray(p.items) ? (p.items as Array<{ q?: string; a?: string }>).filter((it) => it && it.q) : [];
    if (items.length === 0) return "";
    return `<section class="py-12 sm:py-16 px-4">
  <div class="max-w-3xl mx-auto">
    <div class="text-center mb-8">
      <p class="text-[11px] font-extrabold uppercase tracking-[0.2em] mb-2" style="color: ${esc(c.theme.primary)}">FAQ</p>
      <h3 class="text-[26px] sm:text-[32px] font-black leading-tight">${esc(heading)}</h3>
    </div>
    <div class="space-y-2.5">
      ${items.map((it) => `<details class="group rounded-xl border-2 bg-white" style="border-color: ${esc(c.theme.primary)}22">
        <summary class="px-4 py-3 cursor-pointer font-extrabold text-[14px] flex items-center justify-between">${esc(it.q || "")}<span class="text-foreground/40 group-open:rotate-180 transition">⌄</span></summary>
        <div class="px-4 pb-3 text-[13px] text-gray-700 leading-relaxed">${esc(it.a || "")}</div>
      </details>`).join("")}
    </div>
  </div>
</section>`;
  },

  hours: (p: SectionProps, c: SectionCtx) => {
    if (!c.business.hours && !c.business.address) return "";
    return `<section class="py-10 px-4 bg-gray-50/50">
  <div class="max-w-3xl mx-auto grid sm:grid-cols-2 gap-4">
    ${c.business.hours ? `<div class="p-5 rounded-2xl bg-white border-2" style="border-color: ${esc(c.theme.primary)}22">
      <p class="text-[11px] font-extrabold uppercase tracking-wider mb-2" style="color: ${esc(c.theme.primary)}">🕐 Hours</p>
      <p class="text-[13px] font-medium whitespace-pre-line leading-relaxed">${esc(c.business.hours)}</p>
    </div>` : ""}
    ${c.business.address ? `<div class="p-5 rounded-2xl bg-white border-2" style="border-color: ${esc(c.theme.primary)}22">
      <p class="text-[11px] font-extrabold uppercase tracking-wider mb-2" style="color: ${esc(c.theme.primary)}">📍 Visit us</p>
      <p class="text-[13px] font-medium whitespace-pre-line leading-relaxed">${esc(c.business.address)}</p>
    </div>` : ""}
  </div>
</section>`;
  },

  contact: (p: SectionProps, c: SectionCtx) => {
    const heading = String(p.heading || "Multiple ways to get in touch");
    return `<section class="py-12 sm:py-16 px-4">
  <div class="max-w-3xl mx-auto">
    <div class="text-center mb-10">
      <p class="text-[11px] font-extrabold uppercase tracking-[0.2em] mb-2" style="color: ${esc(c.theme.primary)}">Reach us</p>
      <h3 class="text-[26px] sm:text-[32px] font-black leading-tight">${esc(heading)}</h3>
    </div>
    <div class="grid sm:grid-cols-2 gap-4">
      ${c.business.whatsapp ? `<a href="${esc(c.business.whatsapp)}" target="_blank" rel="noopener noreferrer" class="block p-5 rounded-2xl bg-white border-2 transition hover:-translate-y-0.5 hover:shadow-lg" style="border-color: ${esc(c.theme.primary)}33">
        <div class="flex items-center gap-3"><div class="w-11 h-11 rounded-xl flex items-center justify-center text-white text-[18px] flex-shrink-0" style="background: ${esc(c.theme.primary)}">💬</div>
        <div class="min-w-0"><p class="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">WhatsApp</p><p class="text-[14px] font-extrabold truncate">${esc(c.business.phone || "Chat with us")}</p></div></div></a>` : ""}
      ${c.business.upiVpa ? `<div class="block p-5 rounded-2xl bg-white border-2" style="border-color: ${esc(c.theme.primary)}33">
        <div class="flex items-center gap-3"><div class="w-11 h-11 rounded-xl flex items-center justify-center text-white text-[18px] flex-shrink-0" style="background: ${esc(c.theme.accent)}">💳</div>
        <div class="min-w-0"><p class="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">UPI</p><p class="text-[14px] font-extrabold font-mono truncate">${esc(c.business.upiVpa)}</p></div></div></div>` : ""}
      ${c.business.instagram ? `<a href="${esc(c.business.instagram)}" target="_blank" rel="noopener noreferrer" class="block p-5 rounded-2xl bg-white border-2 transition hover:-translate-y-0.5 hover:shadow-lg" style="border-color: ${esc(c.theme.primary)}33">
        <div class="flex items-center gap-3"><div class="w-11 h-11 rounded-xl flex items-center justify-center text-white text-[18px] flex-shrink-0 bg-gradient-to-br from-fuchsia-500 to-orange-400">📷</div>
        <div class="min-w-0"><p class="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Instagram</p><p class="text-[14px] font-extrabold truncate">${esc(c.business.instagram.replace(/^https?:\/\/(www\.)?/, ""))}</p></div></div></a>` : ""}
      ${c.business.email ? `<a href="mailto:${esc(c.business.email)}" class="block p-5 rounded-2xl bg-white border-2 transition hover:-translate-y-0.5 hover:shadow-lg" style="border-color: ${esc(c.theme.primary)}33">
        <div class="flex items-center gap-3"><div class="w-11 h-11 rounded-xl flex items-center justify-center text-white text-[18px] flex-shrink-0" style="background: ${esc(c.theme.primary)}">✉️</div>
        <div class="min-w-0"><p class="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Email</p><p class="text-[14px] font-extrabold truncate">${esc(c.business.email)}</p></div></div></a>` : ""}
    </div>
  </div>
</section>`;
  },

  leadform: (p: SectionProps, c: SectionCtx) => {
    const heading = String(p.heading || "Leave us a message");
    const description = String(p.description || "We'll get back to you on WhatsApp.");
    return `<section class="py-12 sm:py-16 px-4 bg-gray-50">
  <div class="max-w-xl mx-auto">
    <div class="text-center mb-7">
      <p class="text-[11px] font-extrabold uppercase tracking-[0.2em] mb-2" style="color: ${esc(c.theme.primary)}">Get in touch</p>
      <h3 class="text-[26px] sm:text-[32px] font-black leading-tight">${esc(heading)}</h3>
      <p class="text-[13px] text-gray-600 mt-2">${esc(description)}</p>
    </div>
    <form class="ax-lead-form bg-white rounded-2xl border-2 p-5 sm:p-6 space-y-3 shadow-sm" style="border-color: ${esc(c.theme.primary)}33" data-slug="${esc(c.slug)}">
      <input name="name" required maxlength="100" placeholder="Your name *" class="w-full px-3 py-2.5 rounded-lg bg-white border-2 focus:outline-none text-[14px] font-medium" style="border-color: ${esc(c.theme.primary)}33" />
      <input name="phone" type="tel" maxlength="20" placeholder="+91 9XXXXXXXXX" class="w-full px-3 py-2.5 rounded-lg bg-white border-2 focus:outline-none text-[14px] font-mono" style="border-color: ${esc(c.theme.primary)}33" />
      <textarea name="message" rows="3" maxlength="500" placeholder="What would you like to know?" class="w-full px-3 py-2.5 rounded-lg bg-white border-2 focus:outline-none text-[14px] resize-none" style="border-color: ${esc(c.theme.primary)}33"></textarea>
      <button type="submit" class="ax-lead-submit w-full h-12 rounded-xl text-white font-extrabold text-[14px] shadow-lg transition hover:-translate-y-0.5 disabled:opacity-50" style="background: ${esc(c.theme.primary)}">Send message</button>
      <p class="ax-lead-status text-[12px] text-center font-bold hidden"></p>
    </form>
  </div>
</section>`;
  },
};

const SHARED_LEADFORM_SCRIPT = `<script>
(function(){
  document.querySelectorAll('.ax-lead-form').forEach(function(f){
    f.addEventListener('submit', function(e){
      e.preventDefault();
      var btn = f.querySelector('.ax-lead-submit');
      var status = f.querySelector('.ax-lead-status');
      var fd = new FormData(f);
      btn.disabled = true; btn.textContent = 'Sending…';
      status.classList.add('hidden');
      fetch('/biz/' + f.dataset.slug + '/lead', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ name: fd.get('name'), phone: fd.get('phone'), message: fd.get('message') })
      }).then(function(r){ return r.json().then(function(j){ return { ok: r.ok, j: j }; }); })
        .then(function(res){
          if (res.ok) {
            f.reset();
            btn.textContent = '✓ Message sent';
            status.textContent = 'Thanks! We will be in touch on WhatsApp shortly.';
            status.className = 'ax-lead-status text-[12px] text-center font-bold text-emerald-700';
            setTimeout(function(){ btn.disabled = false; btn.textContent = 'Send message'; }, 4000);
          } else {
            btn.disabled = false; btn.textContent = 'Send message';
            status.textContent = (res.j && res.j.error) || 'Could not send.';
            status.className = 'ax-lead-status text-[12px] text-center font-bold text-rose-700';
          }
        }).catch(function(){
          btn.disabled = false; btn.textContent = 'Send message';
          status.textContent = 'Network error.'; status.className = 'ax-lead-status text-[12px] text-center font-bold text-rose-700';
        });
    });
  });
})();
</script>`;

type SectionConfig = { id?: string; type: string; props?: SectionProps };

const renderSection = (s: SectionConfig, ctx: SectionCtx): string => {
  const fn = (sec as Record<string, (p: SectionProps, c: SectionCtx) => string>)[s.type];
  if (!fn) return "";
  try { return fn(s.props || {}, ctx); }
  catch (e) { console.error(`[renderSection ${s.type}]`, e); return ""; }
};

/** The Kirana / Local Shop template — single page, mobile-first, fast. */
const renderKirana = (input: RenderInput): string => {
  const { business, theme, seo, slug, products, cashfree, template, advanced, visibility } = input;
  const vocab = vocabFor(template);

  // Build the advanced <head> injections — only emit tags when actually configured.
  const faviconTag = advanced.faviconUrl
    ? `<link rel="icon" type="image/x-icon" href="${esc(advanced.faviconUrl)}" />`
    : "";
  const robotsTag = !advanced.allowIndexing
    ? `<meta name="robots" content="noindex, nofollow" />`
    : "";
  const ga4Snippet = advanced.ga4Id
    ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(advanced.ga4Id)}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${esc(advanced.ga4Id)}');</script>`
    : "";
  const metaPixelSnippet = advanced.metaPixelId
    ? `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${esc(advanced.metaPixelId)}');fbq('track','PageView');</script>
<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${esc(advanced.metaPixelId)}&ev=PageView&noscript=1" /></noscript>`
    : "";
  // Custom HTML is admin-trusted — user-configured, scoped to their own site.
  const customHead = advanced.customHeadHtml ? advanced.customHeadHtml : "";
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
${faviconTag}
${robotsTag}
${ga4Snippet}
${metaPixelSnippet}
${customHead}
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=${esc(theme.font.replace(/ /g, "+"))}:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
<script src="https://cdn.tailwindcss.com"></script>
${cashfree.enabled ? `<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>` : ""}
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
      ${business.logoUrl
        ? `<img src="${esc(business.logoUrl)}" alt="${esc(business.name)}" class="w-9 h-9 rounded-xl object-cover flex-shrink-0 shadow" onerror="this.style.display='none'" />`
        : `<div class="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-[14px] flex-shrink-0 shadow"
             style="background: linear-gradient(135deg, ${esc(theme.primary)}, ${esc(theme.accent)})">
          ${esc((business.name || "?").slice(0, 1).toUpperCase())}
        </div>`}
      <h1 class="font-extrabold text-[15px] truncate">${esc(business.name)}</h1>
    </div>
    ${business.whatsapp ? `
    <a href="${esc(business.whatsapp)}" target="_blank" rel="noopener noreferrer"
       class="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-white text-[12px] font-extrabold transition hover:opacity-90"
       style="background: ${esc(theme.primary)}">
      💬 ${esc(vocab.orderButtonText)}
    </a>` : ""}
  </div>
</header>

<!-- ── Hero ── -->
<section class="${business.coverUrl ? 'relative' : 'dot-bg'} py-16 sm:py-24 px-4"
         ${business.coverUrl ? `style="background-image: linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)), url(${JSON.stringify(business.coverUrl).slice(1, -1)}); background-size: cover; background-position: center;"` : ""}>
  <div class="max-w-5xl mx-auto text-center">
    <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider mb-5"
         style="background: ${esc(theme.accent)}22; color: ${esc(theme.primary)}">
      ${esc(vocab.heroPillEmoji)} ${esc(vocab.heroPill)}
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
        💬 ${esc(vocab.orderButtonText)}
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
      <p class="text-[11px] font-extrabold uppercase tracking-[0.2em] mb-2" style="color: ${esc(theme.primary)}">${esc(vocab.aboutHeading)}</p>
      <h3 class="text-[26px] sm:text-[32px] font-black leading-tight">${esc(vocab.aboutBigHeading)}</h3>
    </div>
    <p class="text-[15px] sm:text-[16px] text-gray-700 leading-relaxed text-center">
      ${esc(business.about)}
    </p>
  </div>
</section>

<!-- ── Products (if any) ── -->
${products.length > 0 && visibility.products ? `
<section id="products" class="py-12 sm:py-16 px-4">
  <div class="max-w-5xl mx-auto">
    <div class="text-center mb-8">
      <p class="text-[11px] font-extrabold uppercase tracking-[0.2em] mb-2" style="color: ${esc(theme.primary)}">Our offerings</p>
      <h3 class="text-[26px] sm:text-[32px] font-black leading-tight">${esc(vocab.productsHeading)}</h3>
      <p class="text-[13px] text-gray-600 mt-2">${esc(vocab.productsHint)}</p>
    </div>
    <div class="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
      ${products.map((p) => {
        const waText = `Hi ${business.name}, I'd like to order:\n• ${p.name}${p.priceInr > 0 ? ` — ₹${p.priceInr.toLocaleString("en-IN")}` : ""}`;
        const waLink = business.whatsapp ? `${business.whatsapp.split("?")[0]}?text=${encodeURIComponent(waText)}` : null;
        return `
        <article class="bg-white rounded-2xl border-2 overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg flex flex-col" style="border-color: ${esc(theme.primary)}22">
          ${p.photoUrl
            ? `<div class="aspect-square bg-gray-50 overflow-hidden"><img src="${esc(p.photoUrl)}" alt="${esc(p.name)}" class="w-full h-full object-cover" loading="lazy" onerror="this.style.display='none'" /></div>`
            : `<div class="aspect-square bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center text-gray-300 text-[36px]">📦</div>`
          }
          <div class="p-3 sm:p-4 flex flex-col flex-1">
            <h4 class="font-extrabold text-[13px] sm:text-[14px] leading-tight line-clamp-2">${esc(p.name)}</h4>
            ${p.description ? `<p class="text-[11px] text-gray-600 mt-1 line-clamp-2 leading-snug">${esc(p.description)}</p>` : ""}
            <div class="mt-2.5 flex items-center justify-between gap-2">
              ${p.priceInr > 0
                ? `<span class="text-[15px] sm:text-[16px] font-black tabular-nums" style="color: ${esc(theme.primary)}">₹${p.priceInr.toLocaleString("en-IN")}</span>`
                : `<span class="text-[11px] font-bold text-gray-500">Price on request</span>`
              }
            </div>
            ${!p.inStock ? `<p class="mt-1.5 text-[10px] font-bold text-rose-600 uppercase tracking-wider">Out of stock</p>` : ""}
            <div class="mt-3 flex gap-2">
              ${p.inStock && p.priceInr > 0 ? `
              <button
                type="button"
                onclick="window.AxCart.add('${esc(p.id)}', ${JSON.stringify(p.name).replace(/"/g, '&quot;')}, ${p.priceInr}, ${JSON.stringify(p.photoUrl).replace(/"/g, '&quot;')})"
                class="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg text-white text-[12px] font-extrabold hover:opacity-90 transition"
                style="background: ${esc(theme.primary)}">
                🛒 Add
              </button>` : ""}
              ${waLink ? `
              <a href="${esc(waLink)}" target="_blank" rel="noopener noreferrer"
                 class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white border-2 hover:bg-gray-50 transition flex-shrink-0"
                 style="border-color: ${esc(theme.primary)}33; color: ${esc(theme.primary)}"
                 aria-label="Order ${esc(p.name)} on WhatsApp" title="Quick order on WhatsApp">💬</a>` : ""}
            </div>
          </div>
        </article>`;
      }).join("")}
    </div>
  </div>
</section>` : ""}

<!-- ── Floating cart button — navigates to /cart page ── -->
${products.length > 0 && visibility.products ? `
<a
  id="ax-cart-btn"
  href="/biz/${esc(slug)}/cart"
  class="hidden fixed bottom-5 left-5 z-40 h-14 rounded-full px-5 text-white font-extrabold shadow-xl transition hover:scale-105 items-center gap-2"
  style="background: ${esc(theme.primary)}">
  <span class="text-[18px]">🛒</span>
  <span id="ax-cart-count" class="text-[14px]">0</span>
  <span class="text-[12px] opacity-85">·</span>
  <span id="ax-cart-total" class="text-[13px] tabular-nums">₹0</span>
</a>


<!-- Cart + checkout live on dedicated pages now: /biz/<slug>/cart, /checkout,
     /order/:n, /track/:n, /my-orders. Home page only exposes
     window.AxCart.add() for product cards + keeps the floating pill in sync. -->
<script>
(function(){
  var STORAGE_KEY = "ax-cart-${esc(slug)}";
  var fmt = function(n){ return "₹" + Math.round(n).toLocaleString("en-IN"); };
  function read(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {}; } catch(e){ return {}; } }
  function save(o){ try { localStorage.setItem(STORAGE_KEY, JSON.stringify(o)); } catch(e){} }
  function lines(){ return Object.values(read()); }
  function count(){ return lines().reduce(function(s, l){ return s + (l.qty || 0); }, 0); }
  function subtotal(){ return lines().reduce(function(s, l){ return s + (l.qty * l.price); }, 0); }
  function renderBtn(){
    var btn = document.getElementById("ax-cart-btn"); if (!btn) return;
    var c = count();
    if (c === 0) { btn.classList.add("hidden"); btn.classList.remove("flex"); }
    else { btn.classList.remove("hidden"); btn.classList.add("flex"); }
    var ctEl = document.getElementById("ax-cart-count"); if (ctEl) ctEl.textContent = c;
    var totEl = document.getElementById("ax-cart-total"); if (totEl) totEl.textContent = fmt(subtotal());
  }
  // Called by product card Add buttons. Bumps qty + flashes floating button.
  window.AxCart = {
    add: function(id, name, price, photo){
      var c = read();
      if (!c[id]) c[id] = { id: id, name: name, price: price, photo: photo, qty: 0 };
      c[id].qty += 1;
      save(c); renderBtn();
      // Quick visual feedback: scale up + back
      var btn = document.getElementById("ax-cart-btn");
      if (btn) { btn.style.transform = "scale(1.15)"; setTimeout(function(){ btn.style.transform = ""; }, 200); }
    },
  };
  renderBtn();
})();
</script>` : ""}
<!-- ── Hours + Address (if set + visible) ── -->
${(business.hours && visibility.hours) || (business.address && visibility.address) ? `
<section class="py-10 px-4 bg-gray-50/50">
  <div class="max-w-3xl mx-auto grid sm:grid-cols-2 gap-4">
    ${business.hours && visibility.hours ? `
    <div class="p-5 rounded-2xl bg-white border-2" style="border-color: ${esc(theme.primary)}22">
      <p class="text-[11px] font-extrabold uppercase tracking-wider mb-2" style="color: ${esc(theme.primary)}">🕐 Hours</p>
      <p class="text-[13px] font-medium whitespace-pre-line leading-relaxed">${esc(business.hours)}</p>
    </div>` : ""}
    ${business.address && visibility.address ? `
    <div class="p-5 rounded-2xl bg-white border-2" style="border-color: ${esc(theme.primary)}22">
      <p class="text-[11px] font-extrabold uppercase tracking-wider mb-2" style="color: ${esc(theme.primary)}">📍 Visit us</p>
      <p class="text-[13px] font-medium whitespace-pre-line leading-relaxed">${esc(business.address)}</p>
    </div>` : ""}
  </div>
</section>` : ""}

<!-- ── Contact ── -->
${visibility.contact ? `
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
         class="block p-5 rounded-2xl bg-white border-2 transition hover:-translate-y-0.5 hover:shadow-lg"
         style="border-color: ${esc(theme.primary)}33">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center text-white text-[18px] flex-shrink-0 bg-gradient-to-br from-fuchsia-500 to-orange-400">📷</div>
          <div class="min-w-0">
            <p class="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Instagram</p>
            <p class="text-[14px] font-extrabold truncate">${esc(business.instagram.replace(/^https?:\/\/(www\.)?/, ""))}</p>
          </div>
        </div>
      </a>` : ""}
      ${business.facebook ? `
      <a href="${esc(business.facebook)}" target="_blank" rel="noopener noreferrer"
         class="block p-5 rounded-2xl bg-white border-2 transition hover:-translate-y-0.5 hover:shadow-lg"
         style="border-color: ${esc(theme.primary)}33">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center text-white text-[18px] flex-shrink-0 bg-blue-600">📘</div>
          <div class="min-w-0">
            <p class="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Facebook</p>
            <p class="text-[14px] font-extrabold truncate">${esc(business.facebook.replace(/^https?:\/\/(www\.)?/, ""))}</p>
          </div>
        </div>
      </a>` : ""}
      ${business.email ? `
      <a href="mailto:${esc(business.email)}"
         class="block p-5 rounded-2xl bg-white border-2 transition hover:-translate-y-0.5 hover:shadow-lg"
         style="border-color: ${esc(theme.primary)}33">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center text-white text-[18px] flex-shrink-0" style="background: ${esc(theme.primary)}">✉️</div>
          <div class="min-w-0">
            <p class="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Email</p>
            <p class="text-[14px] font-extrabold truncate">${esc(business.email)}</p>
          </div>
        </div>
      </a>` : ""}
    </div>
  </div>
</section>` : ""}

<!-- ── Lead form ── -->
${visibility.leadform ? `
<section class="py-12 sm:py-16 px-4 bg-gray-50">
  <div class="max-w-xl mx-auto">
    <div class="text-center mb-7">
      <p class="text-[11px] font-extrabold uppercase tracking-[0.2em] mb-2" style="color: ${esc(theme.primary)}">Get in touch</p>
      <h3 class="text-[26px] sm:text-[32px] font-black leading-tight">Leave us a message</h3>
      <p class="text-[13px] text-gray-600 mt-2">We'll get back to you on WhatsApp.</p>
    </div>
    <form id="ax-lead-form" class="bg-white rounded-2xl border-2 p-5 sm:p-6 space-y-3 shadow-sm" style="border-color: ${esc(theme.primary)}33"
          data-slug="${esc(slug)}">
      <div>
        <label class="text-[11px] font-extrabold uppercase tracking-wider text-gray-600">Your name *</label>
        <input name="name" required maxlength="100"
               class="w-full mt-1 px-3 py-2.5 rounded-lg bg-white border-2 focus:outline-none text-[14px] font-medium"
               style="border-color: ${esc(theme.primary)}33"
               placeholder="e.g. Priya Sharma" />
      </div>
      <div>
        <label class="text-[11px] font-extrabold uppercase tracking-wider text-gray-600">WhatsApp number</label>
        <input name="phone" type="tel" maxlength="20"
               class="w-full mt-1 px-3 py-2.5 rounded-lg bg-white border-2 focus:outline-none text-[14px] font-mono"
               style="border-color: ${esc(theme.primary)}33"
               placeholder="+91 9XXXXXXXXX" />
      </div>
      <div>
        <label class="text-[11px] font-extrabold uppercase tracking-wider text-gray-600">Message</label>
        <textarea name="message" rows="3" maxlength="500"
                  class="w-full mt-1 px-3 py-2.5 rounded-lg bg-white border-2 focus:outline-none text-[14px] resize-none"
                  style="border-color: ${esc(theme.primary)}33"
                  placeholder="What would you like to know?"></textarea>
      </div>
      <button type="submit"
              id="ax-lead-submit"
              class="w-full h-12 rounded-xl text-white font-extrabold text-[14px] shadow-lg transition hover:-translate-y-0.5 disabled:opacity-50"
              style="background: ${esc(theme.primary)}">
        Send message
      </button>
      <p id="ax-lead-status" class="text-[12px] text-center font-bold hidden"></p>
    </form>
  </div>
</section>

<script>
(function(){
  var f = document.getElementById('ax-lead-form');
  if (!f) return;
  f.addEventListener('submit', function(e){
    e.preventDefault();
    var btn = document.getElementById('ax-lead-submit');
    var status = document.getElementById('ax-lead-status');
    var fd = new FormData(f);
    btn.disabled = true; btn.textContent = 'Sending…';
    status.className = 'text-[12px] text-center font-bold hidden';
    fetch('/biz/' + f.dataset.slug + '/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fd.get('name'),
        phone: fd.get('phone'),
        message: fd.get('message')
      })
    }).then(function(r){ return r.json().then(function(j){ return { ok: r.ok, j: j }; }); })
      .then(function(res){
        if (res.ok) {
          f.reset();
          btn.textContent = '✓ Message sent';
          status.textContent = 'Thanks! We will be in touch on WhatsApp shortly.';
          status.className = 'text-[12px] text-center font-bold text-emerald-700';
          setTimeout(function(){ btn.disabled = false; btn.textContent = 'Send message'; }, 4000);
        } else {
          btn.disabled = false; btn.textContent = 'Send message';
          status.textContent = (res.j && res.j.error) || 'Could not send — please try again.';
          status.className = 'text-[12px] text-center font-bold text-rose-700';
        }
      })
      .catch(function(){
        btn.disabled = false; btn.textContent = 'Send message';
        status.textContent = 'Network error — please try again.';
        status.className = 'text-[12px] text-center font-bold text-rose-700';
      });
  });
})();
</script>
` : ""}

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

// ─── Addison D-P-S — Digital Product Selling template ────────────────────
//
// Layout designed for Indian digital creators (course makers, ebook authors,
// template/preset sellers, software, art, music, etc.). Optimised for ONE
// hero product + bonuses + social proof + UPI-first checkout.
//
// Distinct from the Kirana renderer:
//   • Hero with bold gradient + creator badge + "Instant download" pill
//   • Featured product spotlight (1 big card with bullets + price ladder)
//   • Trust strip: Made in India / UPI Instant / 30-day refund / Creator count
//   • Bonus stack + testimonial wall (founder-style social proof)
//   • Pricing ladder (3 tiers) when products are present
//   • Animated "money-back" guarantee section
//
// Indian-feel polish: saffron→emerald gradient, devanagari namaste, GST/UPI
// trust signals, Hindi-tinged Hinglish headlines.

const renderAddisonDPS = (input: RenderInput): string => {
  const { business, theme, seo, slug, products, advanced } = input;
  const vocab = vocabFor("dps");
  const heroProduct = products[0] || null;
  const extraProducts = products.slice(1, 4);

  // Inline advanced-options HTML (favicon / ga4 / pixel / custom head / noindex)
  const faviconTag = advanced.faviconUrl ? `<link rel="icon" href="${esc(advanced.faviconUrl)}" />` : "";
  const robotsTag = !advanced.allowIndexing ? `<meta name="robots" content="noindex, nofollow" />` : "";
  const ga4 = advanced.ga4Id
    ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(advanced.ga4Id)}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${esc(advanced.ga4Id)}');</script>` : "";
  const pixel = advanced.metaPixelId
    ? `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${esc(advanced.metaPixelId)}');fbq('track','PageView');</script>` : "";
  const customHead = advanced.customHeadHtml || "";

  const upiPayLink = business.upiVpa && heroProduct?.priceInr
    ? `upi://pay?pa=${encodeURIComponent(business.upiVpa)}&pn=${encodeURIComponent(business.upiName || business.name)}&am=${heroProduct.priceInr}&cu=INR&tn=${encodeURIComponent(heroProduct.name)}`
    : business.upiVpa
      ? `upi://pay?pa=${encodeURIComponent(business.upiVpa)}&pn=${encodeURIComponent(business.upiName || business.name)}&cu=INR`
      : null;

  const waBuyLink = (productName: string, price: number) => business.whatsapp
    ? `${business.whatsapp.split("?")[0]}?text=${encodeURIComponent(`Namaste ${business.name} 🙏, I want to buy: ${productName}${price ? ` (₹${price.toLocaleString("en-IN")})` : ""}. Please share payment details.`)}`
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
${faviconTag}${robotsTag}${ga4}${pixel}${customHead}
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800;900&family=Noto+Sans+Devanagari:wght@500;700&display=swap" rel="stylesheet" />
<script src="https://cdn.tailwindcss.com"></script>
<script>tailwind.config={theme:{extend:{colors:{brand:"${esc(theme.primary)}",accent:"${esc(theme.accent)}"}}}};</script>
<style>
  body{font-family:'Plus Jakarta Sans',ui-sans-serif,system-ui,sans-serif;background:#FFFCF7;}
  .devanagari{font-family:'Noto Sans Devanagari',sans-serif;}
  .grid-bg{background-image:
    linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px);
    background-size: 32px 32px;
  }
  .hero-gradient{
    background: radial-gradient(ellipse at top left, ${esc(theme.accent)}33, transparent 60%),
                radial-gradient(ellipse at bottom right, ${esc(theme.primary)}22, transparent 55%),
                linear-gradient(135deg, #FFFCF7, #FFF6E8);
  }
  .ribbon{background: linear-gradient(90deg, ${esc(theme.primary)}, ${esc(theme.accent)});}
  .pulse-dot{animation: pulse-dot 1.5s ease-in-out infinite;}
  @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:.5;transform:scale(.85);} }
  .marquee-track{animation: marquee 30s linear infinite; display: flex; gap: 3rem; white-space: nowrap;}
  @keyframes marquee { from{transform:translateX(0);} to{transform:translateX(-50%);} }
  .price-ladder-card{transition: all .15s ease;}
  .price-ladder-card:hover{transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,.08);}
</style>
</head>
<body class="text-gray-900">

<!-- ── Top trust ribbon (scrolling marquee) ── -->
<div class="ribbon text-white text-[11px] font-extrabold py-2 overflow-hidden">
  <div class="marquee-track px-4">
    ${Array(2).fill(0).map(() => `
      <span class="flex items-center gap-1.5">🇮🇳 <span>Made in India</span></span>
      <span class="flex items-center gap-1.5">⚡ <span>Instant download after payment</span></span>
      <span class="flex items-center gap-1.5">💳 <span>UPI · Card · Netbanking accepted</span></span>
      <span class="flex items-center gap-1.5">🛡️ <span>7-day money-back guarantee</span></span>
      <span class="flex items-center gap-1.5">📜 <span>GST invoice on request</span></span>
      <span class="flex items-center gap-1.5">💬 <span>WhatsApp support 9am-9pm IST</span></span>
    `).join("")}
  </div>
</div>

<!-- ── Sticky header ── -->
<header class="sticky top-0 z-30 bg-white/95 backdrop-blur border-b" style="border-color: ${esc(theme.primary)}22">
  <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
    <a href="/biz/${esc(slug)}" class="flex items-center gap-2.5 min-w-0">
      ${business.logoUrl
        ? `<img src="${esc(business.logoUrl)}" alt="${esc(business.name)}" class="w-10 h-10 rounded-xl object-cover flex-shrink-0 shadow-md" onerror="this.style.display='none'" />`
        : `<div class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-[15px] flex-shrink-0 shadow-md" style="background: linear-gradient(135deg, ${esc(theme.primary)}, ${esc(theme.accent)})">${esc((business.name || "?").slice(0, 1).toUpperCase())}</div>`}
      <div class="min-w-0">
        <h1 class="font-black text-[15px] truncate leading-tight">${esc(business.name)}</h1>
        <p class="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 leading-none mt-0.5">Digital products</p>
      </div>
    </a>
    <div class="flex items-center gap-2">
      ${business.whatsapp ? `<a href="${esc(business.whatsapp)}" target="_blank" rel="noopener noreferrer"
         class="hidden sm:inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-white text-[12px] font-extrabold transition hover:-translate-y-0.5 shadow-[0_3px_0_0_rgba(0,0,0,0.12)]" style="background: #25D366">💬 WhatsApp</a>` : ""}
      ${heroProduct?.priceInr ? `<a href="#buy" class="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-white text-[12px] font-extrabold transition hover:-translate-y-0.5 shadow-[0_3px_0_0_${esc(theme.primary)}80]" style="background: ${esc(theme.primary)}">⚡ Get for ₹${heroProduct.priceInr.toLocaleString("en-IN")}</a>` : ""}
    </div>
  </div>
</header>

<!-- ── Hero ── -->
<section class="hero-gradient py-16 sm:py-24 px-4 relative overflow-hidden">
  <div class="absolute inset-0 grid-bg opacity-60 pointer-events-none"></div>
  <div class="max-w-5xl mx-auto relative">
    <div class="flex flex-col lg:flex-row items-center gap-10">
      <div class="flex-1 text-center lg:text-left">
        <!-- Pills -->
        <div class="flex flex-wrap justify-center lg:justify-start items-center gap-2 mb-5">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider" style="background: ${esc(theme.primary)}; color: white">
            <span class="w-1.5 h-1.5 rounded-full bg-white pulse-dot"></span> ⚡ ${esc(vocab.heroPill)}
          </span>
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white border-2" style="border-color: ${esc(theme.primary)}33; color: ${esc(theme.primary)}">🇮🇳 Made in India</span>
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white border-2" style="border-color: ${esc(theme.accent)}66; color: ${esc(theme.primary)}">⭐ 4.9 / 5</span>
        </div>
        <p class="devanagari text-[14px] font-bold mb-2" style="color: ${esc(theme.primary)}">🙏 नमस्ते</p>
        <h2 class="text-[34px] sm:text-[44px] lg:text-[52px] font-black leading-[1.05] mb-4">
          ${esc(business.tagline || business.name)}
        </h2>
        <p class="text-[15px] sm:text-[17px] text-gray-600 max-w-xl mx-auto lg:mx-0 leading-relaxed mb-6">
          ${esc(business.about)}
        </p>
        <div class="flex flex-wrap justify-center lg:justify-start gap-3 mb-6">
          ${heroProduct ? `<a href="#buy" class="inline-flex items-center gap-2 h-14 px-7 rounded-2xl text-white font-black text-[15px] shadow-[0_5px_0_0_rgba(0,0,0,0.18)] transition hover:-translate-y-1 active:translate-y-0 active:shadow-[0_2px_0_0_rgba(0,0,0,0.18)]" style="background: ${esc(theme.primary)}">
            ⚡ ${esc(vocab.orderButtonText)} ${heroProduct.priceInr > 0 ? `· ₹${heroProduct.priceInr.toLocaleString("en-IN")}` : ""}
          </a>` : ""}
          ${business.whatsapp ? `<a href="${esc(business.whatsapp)}" target="_blank" rel="noopener noreferrer"
            class="inline-flex items-center gap-2 h-14 px-6 rounded-2xl bg-white border-2 font-extrabold text-[14px] transition hover:-translate-y-0.5" style="border-color: ${esc(theme.primary)}40; color: ${esc(theme.primary)}">💬 Ask on WhatsApp</a>` : ""}
        </div>
        <!-- Stats strip -->
        <div class="flex flex-wrap justify-center lg:justify-start gap-5 text-left">
          <div><p class="text-[22px] font-black tabular-nums" style="color: ${esc(theme.primary)}">10K+</p><p class="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Happy buyers</p></div>
          <div><p class="text-[22px] font-black tabular-nums" style="color: ${esc(theme.primary)}">⚡ &lt;30s</p><p class="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Instant delivery</p></div>
          <div><p class="text-[22px] font-black tabular-nums" style="color: ${esc(theme.primary)}">4.9★</p><p class="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Avg rating</p></div>
        </div>
      </div>
      <!-- Hero product mockup -->
      ${heroProduct?.photoUrl ? `<div class="flex-1 max-w-md w-full">
        <div class="relative aspect-[4/5] rounded-3xl overflow-hidden bg-gradient-to-br from-gray-100 to-white shadow-2xl border-4 border-white">
          <img src="${esc(heroProduct.photoUrl)}" alt="${esc(heroProduct.name)}" class="w-full h-full object-cover" onerror="this.style.display='none'" />
          <div class="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-[11px] font-extrabold shadow-lg" style="background: ${esc(theme.primary)}">⚡ Instant</div>
        </div>
      </div>` : heroProduct ? `<div class="flex-1 max-w-md w-full">
        <div class="aspect-[4/5] rounded-3xl bg-gradient-to-br from-white to-gray-50 shadow-2xl border-4 border-white flex items-center justify-center text-[80px]">📦</div>
      </div>` : ""}
    </div>
  </div>
</section>

${heroProduct ? `
<!-- ── Featured product spotlight ── -->
<section id="buy" class="py-16 px-4 bg-white">
  <div class="max-w-5xl mx-auto">
    <div class="text-center mb-10">
      <p class="text-[11px] font-extrabold uppercase tracking-[0.2em] mb-2" style="color: ${esc(theme.primary)}">⭐ Featured</p>
      <h3 class="text-[28px] sm:text-[36px] font-black leading-tight">${esc(heroProduct.name)}</h3>
      ${heroProduct.description ? `<p class="text-[14px] sm:text-[15px] text-gray-600 mt-3 max-w-2xl mx-auto leading-relaxed">${esc(heroProduct.description)}</p>` : ""}
    </div>

    <div class="max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl border-2 shadow-xl" style="border-color: ${esc(theme.primary)}33; background: linear-gradient(180deg, ${esc(theme.accent)}11, white);">
      <!-- Price ribbon -->
      ${heroProduct.priceInr > 0 ? `
      <div class="flex items-baseline justify-center gap-3 mb-5">
        <span class="text-[13px] font-extrabold text-gray-400 line-through tabular-nums">₹${(heroProduct.priceInr * 2).toLocaleString("en-IN")}</span>
        <span class="text-[40px] sm:text-[48px] font-black tabular-nums leading-none" style="color: ${esc(theme.primary)}">₹${heroProduct.priceInr.toLocaleString("en-IN")}</span>
        <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider text-white" style="background: ${esc(theme.primary)}">50% off</span>
      </div>` : ""}

      <!-- What's inside -->
      <div class="space-y-2.5 mb-6">
        <p class="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-2">What's inside</p>
        ${["⚡ Instant download after payment", "📱 Works on mobile + desktop", "🇮🇳 Made for Indian audience", "🛡️ 7-day money-back guarantee", "💬 WhatsApp support included"].map((b) => `<div class="flex items-start gap-2 text-[13.5px]"><span class="text-emerald-600 font-black flex-shrink-0">✓</span><span>${esc(b)}</span></div>`).join("")}
      </div>

      <!-- CTAs -->
      <div class="space-y-2">
        ${upiPayLink ? `<a href="${esc(upiPayLink)}" class="flex items-center justify-center gap-2 w-full h-14 rounded-xl text-white font-black text-[15px] shadow-[0_4px_0_0_rgba(0,0,0,0.15)] transition hover:-translate-y-0.5" style="background: ${esc(theme.primary)}">⚡ Pay ${heroProduct.priceInr > 0 ? `₹${heroProduct.priceInr.toLocaleString("en-IN")}` : "via UPI"} — Instant access</a>` : ""}
        ${waBuyLink(heroProduct.name, heroProduct.priceInr) ? `<a href="${esc(waBuyLink(heroProduct.name, heroProduct.priceInr)!)}" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-white border-2 font-extrabold text-[13px] transition hover:bg-gray-50" style="border-color: #25D366; color: #25D366">💬 Buy via WhatsApp — chat first</a>` : ""}
      </div>

      <p class="text-[11px] text-center text-gray-500 mt-4">💳 Secure UPI · 🔒 SSL encrypted · 🇮🇳 GST invoice on request</p>
    </div>
  </div>
</section>` : ""}

${extraProducts.length > 0 ? `
<!-- ── More products ── -->
<section class="py-12 px-4 bg-gray-50">
  <div class="max-w-5xl mx-auto">
    <div class="text-center mb-8">
      <p class="text-[11px] font-extrabold uppercase tracking-[0.2em] mb-2" style="color: ${esc(theme.primary)}">More from us</p>
      <h3 class="text-[24px] sm:text-[28px] font-black leading-tight">Bundle &amp; save more</h3>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      ${extraProducts.map((prod) => `
        <article class="bg-white rounded-2xl border-2 overflow-hidden transition hover:-translate-y-1 hover:shadow-xl" style="border-color: ${esc(theme.primary)}22">
          ${prod.photoUrl ? `<div class="aspect-video bg-gray-100 overflow-hidden"><img src="${esc(prod.photoUrl)}" alt="${esc(prod.name)}" class="w-full h-full object-cover" loading="lazy" onerror="this.style.display='none'" /></div>` : `<div class="aspect-video bg-gradient-to-br from-gray-100 to-white flex items-center justify-center text-[40px]">📦</div>`}
          <div class="p-4">
            <h4 class="font-extrabold text-[13.5px] leading-tight line-clamp-2 mb-1">${esc(prod.name)}</h4>
            ${prod.description ? `<p class="text-[11.5px] text-gray-600 line-clamp-2 mb-2.5">${esc(prod.description)}</p>` : ""}
            <div class="flex items-center justify-between gap-2">
              ${prod.priceInr > 0 ? `<span class="text-[16px] font-black tabular-nums" style="color: ${esc(theme.primary)}">₹${prod.priceInr.toLocaleString("en-IN")}</span>` : `<span class="text-[11px] font-bold text-gray-500">Free</span>`}
              ${waBuyLink(prod.name, prod.priceInr) ? `<a href="${esc(waBuyLink(prod.name, prod.priceInr)!)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-white text-[11px] font-extrabold transition hover:opacity-90" style="background: ${esc(theme.primary)}">⚡ Buy</a>` : ""}
            </div>
          </div>
        </article>`).join("")}
    </div>
  </div>
</section>` : ""}

<!-- ── Trust grid (4-icon promise strip) ── -->
<section class="py-12 px-4 bg-white">
  <div class="max-w-5xl mx-auto">
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      ${[
        { icon: "🇮🇳", title: "Indian creator", sub: "Made for Indian audience" },
        { icon: "⚡", title: "Instant delivery", sub: "Email + WhatsApp in 30s" },
        { icon: "🛡️", title: "7-day refund", sub: "No questions asked" },
        { icon: "💬", title: "Real human support", sub: "9am-9pm IST on WhatsApp" },
      ].map((t) => `<div class="text-center p-4 rounded-2xl border-2" style="border-color: ${esc(theme.primary)}11">
        <p class="text-[28px] mb-1">${t.icon}</p>
        <p class="text-[12.5px] font-extrabold">${esc(t.title)}</p>
        <p class="text-[10.5px] text-gray-500 mt-0.5 leading-tight">${esc(t.sub)}</p>
      </div>`).join("")}
    </div>
  </div>
</section>

<!-- ── Social proof / testimonials ── -->
<section class="py-16 px-4" style="background: linear-gradient(180deg, ${esc(theme.accent)}08, transparent);">
  <div class="max-w-5xl mx-auto">
    <div class="text-center mb-10">
      <p class="text-[11px] font-extrabold uppercase tracking-[0.2em] mb-2" style="color: ${esc(theme.primary)}">💬 Real reviews</p>
      <h3 class="text-[26px] sm:text-[32px] font-black leading-tight">What customers say</h3>
      <p class="text-[13px] text-gray-600 mt-2">From WhatsApp · verified buyers</p>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      ${[
        { name: "Priya S., Bengaluru", text: "Bought yesterday, downloaded in 10 seconds, paisa vasool. Hindi support via WhatsApp was super helpful." },
        { name: "Rahul M., Delhi", text: "Honestly didn't expect this quality at this price. Worth every rupee. Refund policy gave me confidence." },
        { name: "Anjali K., Mumbai", text: "Trustworthy seller, UPI payment was instant, got the file immediately on WhatsApp. Will buy more." },
      ].map((t) => `<blockquote class="bg-white p-5 rounded-2xl border-2 shadow-sm" style="border-color: ${esc(theme.primary)}22">
        <div class="flex gap-1 mb-2 text-[14px]">⭐⭐⭐⭐⭐</div>
        <p class="text-[13px] text-gray-700 italic leading-relaxed">"${esc(t.text)}"</p>
        <p class="text-[11px] font-extrabold mt-3" style="color: ${esc(theme.primary)}">— ${esc(t.name)}</p>
      </blockquote>`).join("")}
    </div>
  </div>
</section>

<!-- ── FAQ ── -->
<section class="py-16 px-4 bg-white">
  <div class="max-w-3xl mx-auto">
    <div class="text-center mb-8">
      <p class="text-[11px] font-extrabold uppercase tracking-[0.2em] mb-2" style="color: ${esc(theme.primary)}">FAQ</p>
      <h3 class="text-[26px] sm:text-[32px] font-black leading-tight">Common questions</h3>
    </div>
    <div class="space-y-2.5">
      ${[
        { q: "How fast will I get the product?", a: "Instantly. The moment your payment is confirmed (usually 5-10 seconds for UPI), you get the download link on WhatsApp and email." },
        { q: "Can I pay via UPI?", a: "Yes — UPI is our most-used payment method. We also accept cards, netbanking, and wallets via Cashfree." },
        { q: "What if I don't like it?", a: "7-day money-back guarantee, no questions asked. Just message us on WhatsApp and we'll refund within 24 hours." },
        { q: "Will I get GST invoice?", a: "Yes — message us on WhatsApp with your GSTIN after payment and we'll send a proper invoice." },
        { q: "Is support included?", a: "Yes — WhatsApp support is included. Reply to any of our messages or message us at our business number (link at the top)." },
      ].map((it) => `<details class="group rounded-xl border-2 bg-white overflow-hidden" style="border-color: ${esc(theme.primary)}22">
        <summary class="px-4 py-3 cursor-pointer font-extrabold text-[14px] flex items-center justify-between hover:bg-gray-50">
          ${esc(it.q)}
          <span class="text-gray-400 group-open:rotate-180 transition text-[12px]">▼</span>
        </summary>
        <div class="px-4 pb-4 pt-1 text-[13px] text-gray-700 leading-relaxed">${esc(it.a)}</div>
      </details>`).join("")}
    </div>
  </div>
</section>

<!-- ── Final CTA banner ── -->
${heroProduct?.priceInr ? `
<section class="py-16 px-4">
  <div class="max-w-3xl mx-auto rounded-3xl p-8 sm:p-12 text-center text-white relative overflow-hidden" style="background: linear-gradient(135deg, ${esc(theme.primary)}, #0A3D24)">
    <div class="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-25" style="background: ${esc(theme.accent)}"></div>
    <p class="text-[11px] font-extrabold uppercase tracking-[0.2em] mb-2 opacity-80">Limited-time offer</p>
    <h3 class="text-[28px] sm:text-[36px] font-black leading-tight mb-2">Get instant access for ₹${heroProduct.priceInr.toLocaleString("en-IN")}</h3>
    <p class="text-[14px] opacity-90 mb-6">Pay via UPI · Get download in 30 seconds · 7-day refund</p>
    <a href="#buy" class="inline-flex items-center gap-2 h-14 px-8 rounded-2xl bg-white font-black text-[15px] shadow-[0_5px_0_0_rgba(0,0,0,0.25)] transition hover:-translate-y-1" style="color: ${esc(theme.primary)}">⚡ Buy now for ₹${heroProduct.priceInr.toLocaleString("en-IN")}</a>
  </div>
</section>` : ""}

<!-- ── Footer ── -->
<footer class="bg-gray-50 border-t-2 py-10 px-4" style="border-color: ${esc(theme.primary)}22">
  <div class="max-w-5xl mx-auto grid sm:grid-cols-3 gap-6 text-[12px]">
    <div>
      <h4 class="font-black text-[14px] mb-2">${esc(business.name)}</h4>
      <p class="text-gray-600 leading-relaxed">${esc(business.tagline || "Digital products for Indian creators")}</p>
    </div>
    <div>
      <p class="font-extrabold text-[11px] uppercase tracking-wider text-gray-500 mb-2">Contact</p>
      ${business.whatsapp ? `<p><a href="${esc(business.whatsapp)}" target="_blank" rel="noopener noreferrer" class="font-bold hover:underline" style="color: ${esc(theme.primary)}">💬 WhatsApp</a></p>` : ""}
      ${business.email ? `<p class="mt-1"><a href="mailto:${esc(business.email)}" class="font-bold hover:underline" style="color: ${esc(theme.primary)}">✉️ ${esc(business.email)}</a></p>` : ""}
      ${business.instagram ? `<p class="mt-1"><a href="${esc(business.instagram)}" target="_blank" rel="noopener noreferrer" class="font-bold hover:underline" style="color: ${esc(theme.primary)}">📷 Instagram</a></p>` : ""}
    </div>
    <div>
      <p class="font-extrabold text-[11px] uppercase tracking-wider text-gray-500 mb-2">Trust</p>
      <p>🇮🇳 Indian creator</p>
      <p>🛡️ 7-day money-back</p>
      <p>📜 GST invoice on request</p>
      <p>💳 Secure UPI / Card payments</p>
    </div>
  </div>
  <div class="max-w-5xl mx-auto mt-8 pt-6 border-t text-center text-[11px] text-gray-500" style="border-color: ${esc(theme.primary)}11">
    © ${new Date().getFullYear()} ${esc(business.name)} · Built on <a href="/" class="font-extrabold" style="color: ${esc(theme.primary)}">AddisonX D-P-S</a>
  </div>
</footer>

<!-- Floating WhatsApp -->
${business.whatsapp ? `<a href="${esc(business.whatsapp)}" target="_blank" rel="noopener noreferrer" class="fixed bottom-5 right-5 w-14 h-14 rounded-full flex items-center justify-center text-white text-[24px] shadow-xl transition hover:scale-110 z-40" style="background: #25D366" aria-label="Chat on WhatsApp">💬</a>` : ""}

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
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>404 — No site at this URL</title><script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-gradient-to-br from-amber-50 to-orange-50 min-h-screen flex items-center justify-center p-6 font-sans">
<div class="text-center max-w-md bg-white p-8 rounded-3xl shadow-xl">
<div class="text-[56px] mb-2">🤷</div>
<h1 class="text-[24px] font-black mb-1">No site at this URL</h1>
<p class="text-[13px] text-gray-600 mb-5">Double-check the slug, or visit one of these:</p>
<div class="grid gap-2">
  <a href="/biz/me" class="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-emerald-600 text-white font-extrabold text-[13px] shadow-[0_3px_0_0_#065F46] hover:bg-emerald-700 transition">🏪 Go to my site</a>
  <a href="/app/site/store" class="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-white border-2 border-emerald-600 text-emerald-700 font-extrabold text-[13px] hover:bg-emerald-50 transition">🛍️ Browse Website Store</a>
  <a href="/" class="inline-flex items-center justify-center gap-2 h-10 text-[12px] text-gray-500 hover:text-gray-700 font-bold">← AddisonX home</a>
</div>
<p class="mt-5 text-[11px] text-gray-500">Hint: site URLs look like <code class="font-mono bg-gray-100 px-1.5 py-0.5 rounded">/biz/your-shop-name</code></p>
</div></body></html>`;

/** GET /biz/:slug — public site render. */
/** Build the full RenderInput for a site row. Used by both the legacy single-page
 *  renderer and the new page-based renderer (Builder output). */
const buildRenderInput = async (row: typeof site.$inferSelect, slug: string): Promise<RenderInput> => {
  const [pf] = await db.select().from(profile).where(eq(profile.userId, row.userId)).limit(1);
  const [mc] = await db.select({ displayPhoneNumber: metaConfig.displayPhoneNumber })
    .from(metaConfig).where(eq(metaConfig.userId, row.userId)).limit(1);
  const [u] = await db.select({ name: user.name }).from(user).where(eq(user.id, row.userId)).limit(1);
  const productRows = await db.select().from(product)
    .where(and(eq(product.ownerId, row.userId), eq(product.status, "active")))
    .orderBy(asc(product.sortOrder), asc(product.createdAt));

  const copy = (row.copy ?? {}) as Record<string, string>;
  const theme = (row.theme ?? {}) as Record<string, string>;

  const businessName = copy.business_name || pf?.displayName || u?.name || "My Shop";
  const tagline = copy.tagline || "Local quality, delivered with care.";
  const about = copy.about || `Welcome to ${businessName}. We're here on WhatsApp every day — message us to place an order or ask anything.`;
  const phone = pf?.phone || mc?.displayPhoneNumber || null;
  const wa = waLink(phone, `Hi ${businessName}, I'd like to place an order.`);

  return {
    business: {
      name: businessName,
      tagline,
      about,
      // copy.phone overrides profile.phone (lets site have a different
      // shop number from the operator's personal phone)
      phone: copy.phone || phone,
      whatsapp: copy.phone
        ? waLink(copy.phone, `Hi ${businessName}, I'd like to place an order.`)
        : wa,
      upiVpa: pf?.upiVpa || null,
      upiName: pf?.upiDisplayName || pf?.displayName || null,
      email: copy.email || null,
      instagram: pf?.instagramUrl || null,
      facebook: pf?.facebookUrl || null,
      address: copy.address || null,
      hours: copy.hours || null,
      logoUrl: copy.logo_url || null,
      coverUrl: copy.cover_url || null,
    },
    // Each section defaults to visible — only hidden if user explicitly sets
    // hide_<section> in copy JSON via the Manage Site toggles. Values may be
    // boolean true OR string "true" depending on how the UI serializes.
    visibility: {
      products: !truthy(copy.hide_products),
      hours:    !truthy(copy.hide_hours),
      address:  !truthy(copy.hide_address),
      contact:  !truthy(copy.hide_contact),
      leadform: !truthy(copy.hide_leadform),
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
    products: productRows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      priceInr: Number(p.priceInr) || 0,
      photoUrl: p.photoUrl,
      inStock: p.stock == null || Number(p.stock) > 0,
    })),
    cashfree: { enabled: cashfreeIsConfigured(), mode: cashfreeMode() },
    template: row.template,
    advanced: {
      faviconUrl: row.faviconUrl,
      ga4Id: row.ga4Id,
      metaPixelId: row.metaPixelId,
      customHeadHtml: row.customHeadHtml,
      allowIndexing: row.allowIndexing,
    },
  };
};

/** Build the HTML <head> + opening <body> + sticky page nav. Used by both
 *  legacy and section-based renderers — they share the chrome. */
const renderShell = (
  input: RenderInput,
  pages: Array<{ path: string; title: string | null }>,
  currentPath: string,
): { head: string; bodyOpen: string; bodyClose: string } => {
  const { business, theme, seo, slug, advanced } = input;
  const faviconTag = advanced.faviconUrl ? `<link rel="icon" type="image/x-icon" href="${esc(advanced.faviconUrl)}" />` : "";
  const robotsTag = !advanced.allowIndexing ? `<meta name="robots" content="noindex, nofollow" />` : "";
  const ga4Snippet = advanced.ga4Id
    ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(advanced.ga4Id)}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${esc(advanced.ga4Id)}');</script>` : "";
  const metaPixelSnippet = advanced.metaPixelId
    ? `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${esc(advanced.metaPixelId)}');fbq('track','PageView');</script>` : "";
  const customHead = advanced.customHeadHtml || "";

  const head = `<!doctype html><html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(seo.title)}</title>
<meta name="description" content="${esc(seo.description)}" />
<meta property="og:title" content="${esc(seo.title)}" />
<meta property="og:description" content="${esc(seo.description)}" />
${seo.ogImage ? `<meta property="og:image" content="${esc(seo.ogImage)}" />` : ""}
<meta property="og:type" content="website" />
<meta name="theme-color" content="${esc(theme.primary)}" />
${faviconTag}${robotsTag}${ga4Snippet}${metaPixelSnippet}${customHead}
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=${esc(theme.font.replace(/ /g, "+"))}:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
<script src="https://cdn.tailwindcss.com"></script>
<script>tailwind.config={theme:{extend:{colors:{brand:"${esc(theme.primary)}",accent:"${esc(theme.accent)}"},fontFamily:{sans:["${esc(theme.font)}","ui-sans-serif","system-ui","sans-serif"]}}}};</script>
<style>body{font-family:'${esc(theme.font)}',ui-sans-serif,system-ui,sans-serif;}.dot-bg{background-image:radial-gradient(rgba(0,0,0,0.04) 1px,transparent 0);background-size:18px 18px;}</style>
</head>`;

  // Page nav — only shown when site has 2+ active pages
  const pageNav = pages.length >= 2 ? `<nav class="border-t border-b sticky top-14 z-20 bg-white/95 backdrop-blur overflow-x-auto" style="border-color: ${esc(theme.primary)}22">
  <div class="max-w-5xl mx-auto px-4 flex items-center gap-1">
    ${pages.map((pg) => `<a href="/biz/${esc(slug)}${pg.path === "/" ? "" : pg.path}"
      class="px-3 py-2.5 text-[12.5px] font-extrabold whitespace-nowrap border-b-2 transition ${pg.path === currentPath ? "" : "border-transparent text-foreground/55 hover:text-foreground"}"
      ${pg.path === currentPath ? `style="border-color: ${esc(theme.primary)}; color: ${esc(theme.primary)};"` : ""}>${esc(pg.title || (pg.path === "/" ? "Home" : pg.path.replace(/^\//, "").replace(/-/g, " ")))}</a>`).join("")}
  </div>
</nav>` : "";

  const bodyOpen = `<body class="text-gray-900 bg-white">
<header class="sticky top-0 z-30 bg-white/90 backdrop-blur border-b" style="border-color: ${esc(theme.primary)}33">
  <div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
    <a href="/biz/${esc(slug)}" class="flex items-center gap-2.5 min-w-0">
      ${business.logoUrl
        ? `<img src="${esc(business.logoUrl)}" alt="${esc(business.name)}" class="w-9 h-9 rounded-xl object-cover flex-shrink-0 shadow" onerror="this.style.display='none'" />`
        : `<div class="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-[14px] flex-shrink-0 shadow" style="background: linear-gradient(135deg, ${esc(theme.primary)}, ${esc(theme.accent)})">${esc((business.name || "?").slice(0, 1).toUpperCase())}</div>`}
      <h1 class="font-extrabold text-[15px] truncate">${esc(business.name)}</h1>
    </a>
    ${business.whatsapp ? `<a href="${esc(business.whatsapp)}" target="_blank" rel="noopener noreferrer" class="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-white text-[12px] font-extrabold transition hover:opacity-90" style="background: ${esc(theme.primary)}">💬 ${esc(vocabFor(input.template).orderButtonText)}</a>` : ""}
  </div>
</header>
${pageNav}`;

  const bodyClose = `
<footer class="py-8 px-4 border-t" style="border-color: ${esc(theme.primary)}22">
  <div class="max-w-5xl mx-auto text-center">
    <p class="text-[12px] text-gray-500">© ${new Date().getFullYear()} ${esc(business.name)} · Made with <a href="/" class="font-extrabold" style="color: ${esc(theme.primary)}">AddisonX</a></p>
  </div>
</footer>
${business.whatsapp ? `<a href="${esc(business.whatsapp)}" target="_blank" rel="noopener noreferrer" class="fixed bottom-5 right-5 w-14 h-14 rounded-full flex items-center justify-center text-white text-[24px] shadow-xl transition hover:scale-110" style="background: ${esc(theme.primary)}" aria-label="Chat on WhatsApp">💬</a>` : ""}
${SHARED_LEADFORM_SCRIPT}
</body></html>`;

  return { head, bodyOpen, bodyClose };
};

/** Render a single page from its sections array. */
const renderPage = (
  input: RenderInput,
  page: { path: string; sections: SectionConfig[] },
  pages: Array<{ path: string; title: string | null }>,
): string => {
  const { head, bodyOpen, bodyClose } = renderShell(input, pages, page.path);
  const ctx: SectionCtx = {
    business: input.business, theme: input.theme, vocab: vocabFor(input.template),
    slug: input.slug, products: input.products, cashfree: input.cashfree,
  };
  const body = page.sections.map((s) => renderSection(s, ctx)).join("\n");
  return `${head}${bodyOpen}${body}${bodyClose}`;
};

/** Main site renderer. Picks the right rendering path based on whether the
 *  user has configured custom pages via the Builder.
 *
 *  preview=true → read draft_sections (only valid when caller has already
 *  verified the visitor is the site owner). */
const renderSiteForPath = async (
  row: typeof site.$inferSelect,
  slug: string,
  path: string,
  preview = false,
): Promise<{ html: string; pageFound: boolean }> => {
  const input = await buildRenderInput(row, slug);

  // Look up all active pages for this site — used for nav + dispatch
  const pageRows = await db.select().from(sitePage)
    .where(and(eq(sitePage.siteId, row.id), eq(sitePage.active, true)))
    .orderBy(asc(sitePage.sortOrder), asc(sitePage.createdAt));

  // If user has defined custom pages via Builder, use section-based rendering
  if (pageRows.length > 0) {
    const matched = pageRows.find((p) => p.path === path) || pageRows.find((p) => p.path === "/");
    if (!matched) return { html: renderNotFound(), pageFound: false };
    const sectionsRaw = preview
      ? (matched.draftSections ?? matched.sections)
      : matched.sections;
    const sections = (Array.isArray(sectionsRaw) ? sectionsRaw : []) as SectionConfig[];
    const pages = pageRows.map((p) => ({ path: p.path, title: p.title }));
    return { html: renderPage(input, { path: matched.path, sections }, pages), pageFound: true };
  }

  // No pages defined → fall back to single-page renderer. Template dispatch:
  // dps gets the dedicated Indian-polished digital-products layout; others
  // share the Kirana base with vocab swaps.
  const html = input.template === "dps" ? renderAddisonDPS(input) : renderKirana(input);
  return { html, pageFound: true };
};

/** Smart shortcut — /biz/me always sends the signed-in user to THEIR own
 *  live site. Auto-creates the site row on first visit if it doesn't exist,
 *  same logic as /api/site/me. Falls back to a friendly login prompt when
 *  no Better Auth session is present. Makes 'your site URL' bookmarkable
 *  without users having to remember their slug. */
app.get("/biz/me", async (c) => {
  let session;
  try { session = await auth.api.getSession({ headers: c.req.raw.headers }); }
  catch { session = null; }

  if (!session?.user) {
    return c.html(`<!doctype html><html><head><meta charset="utf-8"><title>Sign in to view your site</title>
<script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-amber-50 min-h-screen flex items-center justify-center p-6 font-sans">
<div class="text-center max-w-md bg-white p-8 rounded-3xl shadow-xl">
<div class="text-[48px] mb-2">🔐</div>
<h1 class="text-[22px] font-black mb-1">Sign in to view your site</h1>
<p class="text-[13px] text-gray-600 mb-4">Log in to AddisonX and we'll take you straight to your live website.</p>
<a href="/auth" class="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white font-extrabold text-[13px] hover:bg-emerald-700">Sign in →</a>
<p class="mt-4 text-[11px] text-gray-500">Already have your site URL? Just type it like <code class="font-mono">/biz/your-shop-name</code>.</p>
</div></body></html>`, 200);
  }

  const userId = session.user.id;
  let [row] = await db.select().from(site).where(eq(site.userId, userId)).limit(1);

  // Auto-create site if it doesn't exist (same defaults as /api/site/me).
  if (!row) {
    const [u] = await db.select({ name: user.name, email: user.email })
      .from(user).where(eq(user.id, userId)).limit(1);
    const [pf] = await db.select({ displayName: profile.displayName })
      .from(profile).where(eq(profile.userId, userId)).limit(1);
    const seedRaw = pf?.displayName || u?.name || u?.email?.split("@")[0] || "shop";
    const cleaned = seedRaw.toLowerCase().normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "shop";
    // Ensure unique slug
    let slugCandidate = cleaned;
    for (let n = 2; n <= 50; n += 1) {
      const [clash] = await db.select({ id: site.id }).from(site).where(eq(site.slug, slugCandidate)).limit(1);
      if (!clash) break;
      slugCandidate = `${cleaned}-${n}`;
    }
    [row] = await db.insert(site).values({
      userId, slug: slugCandidate, template: "kirana", status: "draft",
      theme: {}, copy: {},
    }).returning();
  }

  // Loop-guard: if the user's actual slug IS 'me' (manually set OR seeded
  // from a name that cleaned to 'me'), don't redirect — it would 308 to
  // itself forever. Just render the site inline here.
  if (row.slug === "me") {
    if (row.status !== "published") return c.html(renderDraftHolding("me"), 200);
    const { html, pageFound } = await renderSiteForPath(row, "me", "/");
    if (!pageFound) return c.html(renderNotFound(), 404);
    c.header("Cache-Control", "no-store");
    return c.html(html);
  }

  return c.redirect(`/biz/${row.slug}`, 302);
});

app.get("/biz/:slug", async (c) => {
  const slug = (c.req.param("slug") || "").toLowerCase().trim();
  if (!slug) return c.html(renderNotFound(), 404);

  const [row] = await db.select().from(site).where(eq(site.slug, slug)).limit(1);
  if (!row) return c.html(renderNotFound(), 404);

  const preview = await isOwnerPreview(c, row.userId);
  // Owners can preview their unpublished draft sites. Public visitors get the
  // "coming soon" holding page until the site is published.
  if (row.status !== "published" && !preview) return c.html(renderDraftHolding(slug), 200);

  const { html, pageFound } = await renderSiteForPath(row, slug, "/", preview);
  if (!pageFound) return c.html(renderNotFound(), 404);

  // Don't pollute analytics when the owner is previewing their own site.
  if (preview) {
    c.header("Cache-Control", "no-store");
    return c.html(html);
  }

  // Bump view counter + log analytics event (fire-and-forget).
  void db.update(site).set({ viewCount: sql`${site.viewCount} + 1` }).where(eq(site.id, row.id)).catch(() => {});

  const ipForView = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const dayBucket = new Date().toISOString().slice(0, 10);
  const viewSession = createHash("sha256").update(`${ipForView}|${dayBucket}|${row.id}`).digest("hex").slice(0, 32);
  logEvent({
    siteId: row.id, ownerId: row.userId, eventType: "view",
    path: `/biz/${slug}`, referrerHost: refHostBucket(c.req.header("referer")),
    sessionHash: viewSession, userAgent: c.req.header("user-agent") || null,
  });

  c.header("Cache-Control", "public, max-age=60, s-maxage=60");
  return c.html(html);
});

// ─── E-COMMERCE CORE PAGES ────────────────────────────────────────────────
//
// Dedicated routes for the full buyer journey: cart → checkout → thank-you
// → track → my-orders. Each renders a polished page using a shared chrome
// (shell) so they all feel like part of the same site. Mobile-first.

/** Shared chrome — head + sticky header + footer + WhatsApp FAB.
 *  Used by all e-commerce pages so they share branding with the home site. */
const renderEcommerceShell = (
  input: RenderInput,
  title: string,
  bodyContent: string,
  opts: { breadcrumb?: string; embedProducts?: boolean; extraScript?: string } = {},
): string => {
  const { business, theme, slug, advanced } = input;
  const faviconTag = advanced.faviconUrl ? `<link rel="icon" href="${esc(advanced.faviconUrl)}" />` : "";
  const robotsTag = !advanced.allowIndexing ? `<meta name="robots" content="noindex, nofollow" />` : "";
  // Embed product data on cart + checkout pages so client-side JS can render
  // localStorage cart items without an extra fetch.
  const productsJson = opts.embedProducts
    ? `<script>window.AX_PRODUCTS=${JSON.stringify(input.products.map((p) => ({ id: p.id, name: p.name, price: p.priceInr, photo: p.photoUrl, inStock: p.inStock })))};window.AX_SLUG=${JSON.stringify(slug)};window.AX_UPI=${JSON.stringify(business.upiVpa)};window.AX_THEME=${JSON.stringify({ primary: theme.primary, accent: theme.accent })};</script>`
    : "";

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)} · ${esc(business.name)}</title>
<meta name="theme-color" content="${esc(theme.primary)}" />
${faviconTag}${robotsTag}
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=${esc(theme.font.replace(/ /g, "+"))}:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
<script src="https://cdn.tailwindcss.com"></script>
<script>tailwind.config={theme:{extend:{colors:{brand:"${esc(theme.primary)}",accent:"${esc(theme.accent)}"}}}};</script>
<style>body{font-family:'${esc(theme.font)}',ui-sans-serif,system-ui,sans-serif;background:#FFFCF7;}</style>
${productsJson}
</head>
<body class="text-gray-900 min-h-screen flex flex-col">

<!-- Sticky header -->
<header class="sticky top-0 z-30 bg-white/95 backdrop-blur border-b" style="border-color: ${esc(theme.primary)}22">
  <div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
    <a href="/biz/${esc(slug)}" class="flex items-center gap-2.5 min-w-0">
      ${business.logoUrl
        ? `<img src="${esc(business.logoUrl)}" alt="${esc(business.name)}" class="w-9 h-9 rounded-xl object-cover shadow" />`
        : `<div class="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-[14px] shadow" style="background: linear-gradient(135deg, ${esc(theme.primary)}, ${esc(theme.accent)})">${esc((business.name || "?").slice(0, 1).toUpperCase())}</div>`}
      <h1 class="font-extrabold text-[15px] truncate">${esc(business.name)}</h1>
    </a>
    <nav class="flex items-center gap-1 text-[11.5px] font-extrabold">
      <a href="/biz/${esc(slug)}" class="hidden sm:inline-block px-2.5 py-1 rounded hover:bg-gray-100 transition">Home</a>
      <a href="/biz/${esc(slug)}/my-orders" class="px-2.5 py-1 rounded hover:bg-gray-100 transition" title="View your orders">📦 <span class="hidden sm:inline">My orders</span></a>
      <a href="/biz/${esc(slug)}/cart" id="ax-mini-cart" class="px-2.5 py-1 rounded hover:bg-gray-100 transition relative">
        🛒 <span class="hidden sm:inline">Cart</span> <span id="ax-mini-cart-count" class="hidden ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold text-white" style="background: ${esc(theme.primary)}"></span>
      </a>
    </nav>
  </div>
  ${opts.breadcrumb ? `<div class="max-w-5xl mx-auto px-4 py-1.5 border-t text-[11px] text-gray-500" style="border-color: ${esc(theme.primary)}11">${opts.breadcrumb}</div>` : ""}
</header>

<main class="flex-1">${bodyContent}</main>

<!-- Footer -->
<footer class="py-8 px-4 mt-12 border-t bg-white" style="border-color: ${esc(theme.primary)}22">
  <div class="max-w-5xl mx-auto text-center space-y-2">
    <div class="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[12px] font-bold">
      <a href="/biz/${esc(slug)}" class="hover:underline" style="color: ${esc(theme.primary)}">Home</a>
      <a href="/biz/${esc(slug)}/my-orders" class="hover:underline" style="color: ${esc(theme.primary)}">My orders</a>
      ${business.whatsapp ? `<a href="${esc(business.whatsapp)}" target="_blank" rel="noopener noreferrer" class="hover:underline" style="color: ${esc(theme.primary)}">💬 WhatsApp support</a>` : ""}
    </div>
    <p class="text-[11px] text-gray-500">© ${new Date().getFullYear()} ${esc(business.name)} · Built with <a href="/" class="font-extrabold" style="color: ${esc(theme.primary)}">AddisonX</a></p>
  </div>
</footer>

${business.whatsapp ? `<a href="${esc(business.whatsapp)}" target="_blank" rel="noopener noreferrer" class="fixed bottom-5 right-5 w-14 h-14 rounded-full flex items-center justify-center text-white text-[24px] shadow-xl transition hover:scale-110 z-40" style="background: #25D366" aria-label="WhatsApp">💬</a>` : ""}

<!-- Mini-cart count updater — shared across all pages -->
<script>
(function(){
  var slug = ${JSON.stringify(slug)};
  try {
    var cart = JSON.parse(localStorage.getItem('ax-cart-' + slug) || '{}') || {};
    var count = Object.values(cart).reduce(function(s, l){ return s + (l.qty || 0); }, 0);
    var el = document.getElementById('ax-mini-cart-count');
    if (el && count > 0) { el.textContent = count; el.classList.remove('hidden'); el.classList.add('inline-flex'); }
  } catch(e){}
})();
</script>
${opts.extraScript || ""}
</body></html>`;
};

// ─── /cart — full cart page ───────────────────────────────────────────────
const renderCartPage = (input: RenderInput): string => {
  const body = `
<div class="max-w-3xl mx-auto px-4 py-6">
  <h1 class="text-[24px] sm:text-[28px] font-black mb-1">🛒 Your cart</h1>
  <p class="text-[13px] text-gray-600 mb-6">Review items below, then proceed to checkout.</p>
  <div id="ax-cart-list" class="space-y-3"></div>
  <div id="ax-cart-empty" class="hidden text-center py-16 px-6 bg-white rounded-2xl border-2" style="border-color: ${esc(input.theme.primary)}22">
    <div class="text-[64px] mb-3">🛍️</div>
    <h2 class="text-[18px] font-black mb-1">Your cart is empty</h2>
    <p class="text-[13px] text-gray-600 mb-4">Looks like you haven't added anything yet.</p>
    <a href="/biz/${esc(input.slug)}" class="inline-flex items-center gap-2 h-11 px-5 rounded-xl text-white font-extrabold text-[13px] shadow-[0_3px_0_0_rgba(0,0,0,0.15)]" style="background: ${esc(input.theme.primary)}">← Continue shopping</a>
  </div>
  <div id="ax-cart-summary" class="hidden mt-6 p-5 rounded-2xl bg-white border-2 shadow-[0_3px_0_0_${esc(input.theme.primary)}22]" style="border-color: ${esc(input.theme.primary)}33">
    <div class="space-y-1.5 mb-4">
      <div class="flex justify-between text-[13px]"><span class="text-gray-600">Subtotal</span><span id="ax-cart-subtotal" class="font-extrabold tabular-nums">₹0</span></div>
      <p class="text-[11px] text-gray-500 italic">Shipping &amp; coupons applied at checkout.</p>
    </div>
    <a href="/biz/${esc(input.slug)}/checkout" class="block w-full h-12 rounded-xl text-white font-extrabold text-[14px] shadow-[0_4px_0_0_rgba(0,0,0,0.15)] transition hover:-translate-y-0.5 flex items-center justify-center gap-2" style="background: ${esc(input.theme.primary)}">
      Proceed to checkout →
    </a>
    <a href="/biz/${esc(input.slug)}" class="block text-center text-[12px] font-extrabold mt-3 hover:underline" style="color: ${esc(input.theme.primary)}">← Continue shopping</a>
  </div>
</div>
`;
  const script = `<script>
(function(){
  var slug = window.AX_SLUG, products = window.AX_PRODUCTS || [], theme = window.AX_THEME;
  var byId = {}; products.forEach(function(p){ byId[p.id] = p; });
  var fmt = function(n){ return '₹' + Math.round(n).toLocaleString('en-IN'); };
  var safe = function(s){ return String(s||'').replace(/[<>"'&]/g, function(c){ return '&#'+c.charCodeAt(0)+';'; }); };
  function getCart(){ try { return JSON.parse(localStorage.getItem('ax-cart-' + slug) || '{}') || {}; } catch(e){ return {}; } }
  function setCart(c){ try { localStorage.setItem('ax-cart-' + slug, JSON.stringify(c)); } catch(e){} }
  function render(){
    var cart = getCart();
    var ids = Object.keys(cart);
    var list = document.getElementById('ax-cart-list');
    var empty = document.getElementById('ax-cart-empty');
    var summary = document.getElementById('ax-cart-summary');
    if (ids.length === 0) {
      list.innerHTML = ''; empty.classList.remove('hidden'); summary.classList.add('hidden'); return;
    }
    empty.classList.add('hidden'); summary.classList.remove('hidden');
    var subtotal = 0;
    list.innerHTML = ids.map(function(id){
      var l = cart[id]; var p = byId[id];
      if (!p) return '';
      var line = l.qty * p.price; subtotal += line;
      var photo = p.photo ? '<img src="'+safe(p.photo)+'" class="w-20 h-20 rounded-xl object-cover flex-shrink-0" onerror="this.style.display=\\'none\\'" />' : '<div class="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center text-[28px] flex-shrink-0">📦</div>';
      return '<div class="flex gap-3 p-3 bg-white rounded-2xl border-2" style="border-color:'+theme.primary+'22">' +
        photo +
        '<div class="flex-1 min-w-0 flex flex-col">' +
          '<p class="text-[14px] font-extrabold line-clamp-2">' + safe(p.name) + '</p>' +
          '<p class="text-[12px] tabular-nums" style="color:'+theme.primary+'">' + fmt(p.price) + ' each</p>' +
          '<div class="mt-auto flex items-center justify-between gap-2">' +
            '<div class="inline-flex items-center gap-1 rounded-lg border" style="border-color:'+theme.primary+'33">' +
              '<button type="button" onclick="window.AxCart.dec(\\''+safe(id)+'\\')" class="w-8 h-8 hover:bg-gray-50 font-extrabold">−</button>' +
              '<span class="w-8 text-center text-[13px] font-extrabold tabular-nums">' + l.qty + '</span>' +
              '<button type="button" onclick="window.AxCart.inc(\\''+safe(id)+'\\')" class="w-8 h-8 hover:bg-gray-50 font-extrabold">+</button>' +
            '</div>' +
            '<div class="flex items-center gap-3">' +
              '<span class="text-[14px] font-extrabold tabular-nums">' + fmt(line) + '</span>' +
              '<button type="button" onclick="window.AxCart.remove(\\''+safe(id)+'\\')" title="Remove" class="text-rose-600 hover:bg-rose-50 w-7 h-7 rounded-md flex items-center justify-center text-[14px]">×</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
    document.getElementById('ax-cart-subtotal').textContent = fmt(subtotal);
    var mini = document.getElementById('ax-mini-cart-count');
    var total = ids.reduce(function(s, id){ return s + cart[id].qty; }, 0);
    if (mini) { mini.textContent = total; mini.classList.remove('hidden'); mini.classList.add('inline-flex'); }
  }
  window.AxCart = {
    inc: function(id){ var c = getCart(); if (c[id]) { c[id].qty += 1; setCart(c); render(); } },
    dec: function(id){ var c = getCart(); if (c[id]) { c[id].qty -= 1; if (c[id].qty <= 0) delete c[id]; setCart(c); render(); } },
    remove: function(id){ var c = getCart(); delete c[id]; setCart(c); render(); },
  };
  render();
})();
</script>`;
  return renderEcommerceShell(input, "Your cart", body, { embedProducts: true, extraScript: script });
};

// ─── /checkout — focused checkout form ────────────────────────────────────
const renderCheckoutPage = (input: RenderInput): string => {
  const { business, theme, slug, cashfree } = input;
  const body = `
<div class="max-w-2xl mx-auto px-4 py-6">
  <h1 class="text-[24px] sm:text-[28px] font-black mb-1">Checkout</h1>
  <p class="text-[13px] text-gray-600 mb-6">Almost there. Fill your details to place the order.</p>

  <div id="ax-empty" class="hidden text-center py-16 bg-white rounded-2xl border-2" style="border-color: ${esc(theme.primary)}22">
    <p class="text-[14px] font-extrabold">Your cart is empty.</p>
    <a href="/biz/${esc(slug)}" class="inline-block mt-3 text-[12px] font-extrabold underline" style="color: ${esc(theme.primary)}">← Continue shopping</a>
  </div>

  <div id="ax-checkout-wrap" class="hidden grid grid-cols-1 lg:grid-cols-5 gap-4">
    <!-- Form -->
    <form id="ax-checkout-form" class="lg:col-span-3 bg-white rounded-2xl border-2 p-5 space-y-3 shadow-[0_3px_0_0_${esc(theme.primary)}22]" style="border-color: ${esc(theme.primary)}33">
      <div>
        <label class="text-[11px] font-extrabold uppercase tracking-wider text-gray-600">Your name *</label>
        <input name="customer_name" required maxlength="100" placeholder="Full name"
               class="w-full mt-1 px-3 py-2.5 rounded-lg border-2 focus:outline-none text-[14px] font-medium" style="border-color: ${esc(theme.primary)}33" />
      </div>
      <div>
        <label class="text-[11px] font-extrabold uppercase tracking-wider text-gray-600">WhatsApp number *</label>
        <input name="customer_phone" required type="tel" maxlength="20" placeholder="+91 9XXXXXXXXX"
               class="w-full mt-1 px-3 py-2.5 rounded-lg border-2 focus:outline-none text-[14px] font-mono" style="border-color: ${esc(theme.primary)}33" />
        <p class="text-[10.5px] text-gray-500 mt-1">We'll send updates here and look up your orders by this number.</p>
      </div>
      <div>
        <label class="text-[11px] font-extrabold uppercase tracking-wider text-gray-600">Email (optional)</label>
        <input name="customer_email" type="email" maxlength="200" placeholder="you@example.com"
               class="w-full mt-1 px-3 py-2.5 rounded-lg border-2 focus:outline-none text-[14px]" style="border-color: ${esc(theme.primary)}33" />
      </div>
      <div>
        <label class="text-[11px] font-extrabold uppercase tracking-wider text-gray-600">Delivery address</label>
        <textarea name="customer_address" rows="3" maxlength="500" placeholder="House / street / city"
                  class="w-full mt-1 px-3 py-2.5 rounded-lg border-2 focus:outline-none text-[13px] resize-none" style="border-color: ${esc(theme.primary)}33"></textarea>
      </div>
      <div>
        <label class="text-[11px] font-extrabold uppercase tracking-wider text-gray-600">Pincode</label>
        <input id="ax-pincode" name="customer_pincode" type="text" inputmode="numeric" maxlength="6" placeholder="6-digit pincode"
               class="w-full mt-1 px-3 py-2.5 rounded-lg border-2 focus:outline-none text-[14px] font-mono font-bold tracking-wider" style="border-color: ${esc(theme.primary)}33" />
        <p id="ax-shipping-status" class="text-[11px] mt-1 hidden"></p>
      </div>
      <div>
        <label class="text-[11px] font-extrabold uppercase tracking-wider text-gray-600">Notes (optional)</label>
        <textarea name="notes" rows="2" maxlength="500" placeholder="Any special instructions?"
                  class="w-full mt-1 px-3 py-2.5 rounded-lg border-2 focus:outline-none text-[13px] resize-none" style="border-color: ${esc(theme.primary)}33"></textarea>
      </div>

      <div>
        <p class="text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-1.5">Payment</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          ${cashfree.enabled ? `
          <label class="flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer hover:bg-gray-50 transition" style="border-color: ${esc(theme.primary)}33">
            <input type="radio" name="payment_method" value="online" checked />
            <span class="text-[12.5px] font-extrabold">💳 Card / UPI / Netbanking</span>
          </label>` : ""}
          ${business.upiVpa && !cashfree.enabled ? `
          <label class="flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer hover:bg-gray-50 transition" style="border-color: ${esc(theme.primary)}33">
            <input type="radio" name="payment_method" value="upi" checked />
            <span class="text-[12.5px] font-extrabold">💳 UPI (manual)</span>
          </label>` : ""}
          <label class="flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer hover:bg-gray-50 transition" style="border-color: ${esc(theme.primary)}33">
            <input type="radio" name="payment_method" value="cod" ${(cashfree.enabled || business.upiVpa) ? "" : "checked"} />
            <span class="text-[12.5px] font-extrabold">💵 Cash on delivery</span>
          </label>
        </div>
      </div>
    </form>

    <!-- Order summary -->
    <aside class="lg:col-span-2 lg:sticky lg:top-20 self-start space-y-3">
      <div class="bg-white rounded-2xl border-2 p-5 shadow-[0_3px_0_0_${esc(theme.primary)}22]" style="border-color: ${esc(theme.primary)}33">
        <p class="text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-3">Order summary</p>
        <ul id="ax-summary-items" class="space-y-2 mb-3"></ul>

        <div id="ax-coupon-row" class="hidden mb-2.5 flex items-center gap-2 pt-2 border-t" style="border-color: ${esc(theme.primary)}22">
          <input id="ax-coupon-input" type="text" placeholder="Coupon"
                 class="flex-1 px-3 py-2 rounded-lg border-2 focus:outline-none text-[12px] font-mono uppercase font-bold tracking-wider" style="border-color: ${esc(theme.primary)}33" />
          <button id="ax-coupon-apply" type="button" class="h-9 px-3 rounded-lg text-white text-[11.5px] font-extrabold" style="background: ${esc(theme.primary)}">Apply</button>
        </div>
        <p id="ax-coupon-status" class="hidden text-[11px] font-bold mb-2"></p>

        <div class="space-y-1.5 pt-2 border-t" style="border-color: ${esc(theme.primary)}22">
          <div class="flex justify-between text-[12.5px]"><span class="text-gray-600">Subtotal</span><span id="ax-sub" class="font-extrabold tabular-nums">₹0</span></div>
          <div id="ax-disc-row" class="hidden flex justify-between text-[12.5px]" style="color: ${esc(theme.primary)}">
            <span>Discount <span id="ax-disc-code" class="text-[10px] font-extrabold uppercase ml-1 px-1.5 py-0.5 rounded" style="background: ${esc(theme.primary)}11"></span></span>
            <span id="ax-disc" class="font-extrabold tabular-nums">−₹0</span>
          </div>
          <div id="ax-ship-row" class="hidden flex justify-between text-[12.5px]">
            <span class="text-gray-600">Shipping <span id="ax-ship-zone" class="text-[10px] font-extrabold ml-1 px-1.5 py-0.5 rounded bg-gray-100"></span></span>
            <span id="ax-ship" class="font-extrabold tabular-nums">₹0</span>
          </div>
          <div class="flex justify-between text-[14px] pt-1.5 border-t" style="border-color: ${esc(theme.primary)}22">
            <span class="font-extrabold">Total</span><span id="ax-total" class="font-black tabular-nums" style="color: ${esc(theme.primary)}">₹0</span>
          </div>
        </div>

        <button id="ax-place-btn" type="button" form="ax-checkout-form"
                class="mt-4 w-full h-12 rounded-xl text-white font-extrabold text-[14px] shadow-[0_4px_0_0_rgba(0,0,0,0.15)] transition hover:-translate-y-0.5 disabled:opacity-50" style="background: ${esc(theme.primary)}">
          Place order
        </button>
        <p id="ax-status" class="text-[11.5px] text-center font-bold mt-2 hidden"></p>
        <p class="text-[10.5px] text-center text-gray-500 mt-2">🔒 Secure · 7-day refund · WhatsApp updates</p>
      </div>
      <a href="/biz/${esc(slug)}/cart" class="block text-center text-[12px] font-extrabold hover:underline" style="color: ${esc(theme.primary)}">← Back to cart</a>
    </aside>
  </div>
</div>
`;

  const script = `<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
<script>
(function(){
  var slug = window.AX_SLUG, products = window.AX_PRODUCTS || [], theme = window.AX_THEME;
  var byId = {}; products.forEach(function(p){ byId[p.id] = p; });
  var fmt = function(n){ return '₹' + Math.round(n).toLocaleString('en-IN'); };
  var safe = function(s){ return String(s||'').replace(/[<>"'&]/g, function(c){ return '&#'+c.charCodeAt(0)+';'; }); };
  function getCart(){ try { return JSON.parse(localStorage.getItem('ax-cart-' + slug) || '{}') || {}; } catch(e){ return {}; } }
  var state = { coupon: null, shipping: null };

  function lines(){ var c = getCart(); return Object.keys(c).map(function(id){ var p = byId[id]; if (!p) return null; return { id: id, name: p.name, price: p.price, photo: p.photo, qty: c[id].qty, line: p.price * c[id].qty }; }).filter(Boolean); }
  function subtotal(){ return lines().reduce(function(s, l){ return s + l.line; }, 0); }
  function discount(){ return state.coupon ? Math.min(subtotal(), state.coupon.discount_inr || 0) : 0; }
  function shipping(){ return state.shipping ? Number(state.shipping.rate_inr) || 0 : 0; }
  function total(){ return Math.max(0, subtotal() - discount() + shipping()); }

  function render(){
    var ls = lines();
    if (ls.length === 0) {
      document.getElementById('ax-empty').classList.remove('hidden');
      document.getElementById('ax-checkout-wrap').classList.add('hidden');
      return;
    }
    document.getElementById('ax-empty').classList.add('hidden');
    document.getElementById('ax-checkout-wrap').classList.remove('hidden');
    document.getElementById('ax-checkout-wrap').classList.add('grid');

    document.getElementById('ax-summary-items').innerHTML = ls.map(function(l){
      var photo = l.photo ? '<img src="'+safe(l.photo)+'" class="w-10 h-10 rounded-md object-cover flex-shrink-0" onerror="this.style.display=\\'none\\'" />' : '<div class="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center text-[16px] flex-shrink-0">📦</div>';
      return '<li class="flex gap-2 items-center">' + photo +
        '<div class="flex-1 min-w-0"><p class="text-[12px] font-bold truncate">'+safe(l.name)+'</p><p class="text-[10.5px] text-gray-500">'+fmt(l.price)+' × '+l.qty+'</p></div>' +
        '<span class="text-[12.5px] font-extrabold tabular-nums">'+fmt(l.line)+'</span></li>';
    }).join('');

    document.getElementById('ax-sub').textContent = fmt(subtotal());
    var dr = document.getElementById('ax-disc-row');
    if (state.coupon) { dr.classList.remove('hidden'); dr.classList.add('flex'); document.getElementById('ax-disc').textContent = '−' + fmt(discount()); document.getElementById('ax-disc-code').textContent = state.coupon.code; }
    else { dr.classList.add('hidden'); dr.classList.remove('flex'); }
    var sr = document.getElementById('ax-ship-row');
    if (state.shipping) { sr.classList.remove('hidden'); sr.classList.add('flex'); document.getElementById('ax-ship').textContent = state.shipping.free ? 'FREE' : fmt(shipping()); document.getElementById('ax-ship-zone').textContent = state.shipping.zone_name; }
    else { sr.classList.add('hidden'); sr.classList.remove('flex'); }
    document.getElementById('ax-total').textContent = fmt(total());
    document.getElementById('ax-place-btn').textContent = 'Place order — ' + fmt(total());

    // Show coupon row when there's a cart
    document.getElementById('ax-coupon-row').classList.remove('hidden');
    document.getElementById('ax-coupon-row').classList.add('flex');
  }

  // Coupon apply
  document.getElementById('ax-coupon-apply').addEventListener('click', function(){
    var inp = document.getElementById('ax-coupon-input'); var st = document.getElementById('ax-coupon-status');
    var code = (inp.value || '').trim();
    if (!code) return;
    var btn = this; btn.disabled = true; btn.textContent = '…';
    fetch('/biz/' + slug + '/coupon/check', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ code: code, cart_subtotal_inr: subtotal() }) })
      .then(function(r){ return r.json(); }).then(function(j){
        btn.disabled = false; btn.textContent = 'Apply';
        if (j.ok) { state.coupon = { code: j.code, discount_inr: j.discount_inr }; st.textContent = 'Applied · saving ' + fmt(j.discount_inr); st.className = 'text-[11px] font-bold mb-2 mt-1 text-emerald-700'; st.classList.remove('hidden'); render(); }
        else { state.coupon = null; st.textContent = j.reason || 'Invalid'; st.className = 'text-[11px] font-bold mb-2 mt-1 text-rose-600'; st.classList.remove('hidden'); render(); }
      }).catch(function(){ btn.disabled = false; btn.textContent = 'Apply'; });
  });

  // Pincode → shipping
  var debounce;
  document.getElementById('ax-pincode').addEventListener('input', function(e){
    clearTimeout(debounce);
    var pin = (e.target.value || '').replace(/\\D+/g, '').slice(0, 6); e.target.value = pin;
    var st = document.getElementById('ax-shipping-status');
    if (pin.length !== 6) { state.shipping = null; st.classList.add('hidden'); render(); return; }
    debounce = setTimeout(function(){
      st.textContent = 'Checking delivery…'; st.className = 'text-[11px] mt-1 text-gray-500'; st.classList.remove('hidden');
      fetch('/biz/' + slug + '/shipping/quote', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ pincode: pin, cart_subtotal_inr: subtotal() - discount() }) })
        .then(function(r){ return r.json(); }).then(function(j){
          if (j.ok) { state.shipping = j; st.textContent = (j.free ? '✓ Free delivery' : '✓ Delivery ' + fmt(j.rate_inr)) + (j.eta_days ? ' · ' + j.eta_days + ' days' : ''); st.className = 'text-[11px] mt-1 font-bold text-emerald-700'; }
          else { state.shipping = null; st.textContent = j.reason || 'No delivery'; st.className = 'text-[11px] mt-1 font-bold text-rose-600'; }
          render();
        }).catch(function(){ state.shipping = null; render(); });
    }, 400);
  });

  // Place order
  document.getElementById('ax-place-btn').addEventListener('click', function(){
    var form = document.getElementById('ax-checkout-form'); var fd = new FormData(form); var btn = this; var st = document.getElementById('ax-status');
    if (!fd.get('customer_name') || !String(fd.get('customer_name')).trim()) { st.textContent = 'Please enter your name'; st.className = 'text-[11.5px] text-center font-bold mt-2 text-rose-600'; st.classList.remove('hidden'); return; }
    if (!fd.get('customer_phone') || !String(fd.get('customer_phone')).trim()) { st.textContent = 'Please enter your WhatsApp number'; st.className = 'text-[11.5px] text-center font-bold mt-2 text-rose-600'; st.classList.remove('hidden'); return; }
    btn.disabled = true; btn.textContent = 'Placing…'; st.classList.add('hidden');
    var phone = String(fd.get('customer_phone')).trim();
    var payload = {
      customer_name: fd.get('customer_name'), customer_phone: phone, customer_email: fd.get('customer_email'),
      customer_address: fd.get('customer_address'), customer_pincode: fd.get('customer_pincode'),
      notes: fd.get('notes'), payment_method: fd.get('payment_method'),
      coupon_code: state.coupon ? state.coupon.code : null,
      items: lines().map(function(l){ return { product_id: l.id, quantity: l.qty }; }),
    };
    fetch('/biz/' + slug + '/order', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      .then(function(r){ return r.json().then(function(j){ return { ok: r.ok, j: j }; }); })
      .then(function(res){
        if (res.ok) {
          var orderId = res.j.order_id, num = res.j.order_number, pm = payload.payment_method;
          var successUrl = '/biz/' + slug + '/order/' + num + '?phone=' + encodeURIComponent(phone);
          if (pm === 'online' && window.Cashfree) {
            btn.textContent = 'Opening payment…';
            fetch('/biz/' + slug + '/pay/' + orderId + '/start', { method: 'POST' })
              .then(function(r){ return r.json().then(function(j){ return { ok: r.ok, j: j }; }); })
              .then(function(p){
                if (!p.ok || !p.j.payment_session_id) { btn.disabled = false; btn.textContent = 'Place order — ' + fmt(total()); st.textContent = (p.j && p.j.error) || 'Could not start payment.'; st.className = 'text-[11.5px] text-center font-bold mt-2 text-rose-600'; st.classList.remove('hidden'); return; }
                try { window.Cashfree({ mode: p.j.mode === 'production' ? 'production' : 'sandbox' }).checkout({ paymentSessionId: p.j.payment_session_id, redirectTarget: '_self' }); } catch(e){ btn.disabled = false; btn.textContent = 'Place order — ' + fmt(total()); st.textContent = 'Payment failed to open.'; st.className = 'text-[11.5px] text-center font-bold mt-2 text-rose-600'; st.classList.remove('hidden'); }
              });
            return;
          }
          // Clear cart + redirect to success page
          try { localStorage.removeItem('ax-cart-' + slug); } catch(e){}
          window.location.href = successUrl;
        } else {
          btn.disabled = false; btn.textContent = 'Place order — ' + fmt(total());
          st.textContent = (res.j && res.j.error) || 'Could not place order.'; st.className = 'text-[11.5px] text-center font-bold mt-2 text-rose-600'; st.classList.remove('hidden');
        }
      }).catch(function(){ btn.disabled = false; btn.textContent = 'Place order — ' + fmt(total()); st.textContent = 'Network error.'; st.className = 'text-[11.5px] text-center font-bold mt-2 text-rose-600'; st.classList.remove('hidden'); });
  });

  render();
})();
</script>`;

  return renderEcommerceShell(input, "Checkout", body, {
    embedProducts: true,
    breadcrumb: `<a href="/biz/${esc(slug)}/cart" class="hover:underline">Cart</a> · Checkout`,
    extraScript: script,
  });
};

// ─── /order/:n — thank-you / order confirmation ──────────────────────────
const renderOrderSuccessPage = (
  input: RenderInput,
  order: typeof orderTbl.$inferSelect,
  items: Array<typeof orderItem.$inferSelect>,
): string => {
  const { business, theme, slug } = input;
  const trackUrl = `/biz/${slug}/track/${order.orderNumber}?phone=${encodeURIComponent(order.customerPhone || "")}`;
  const waMsg = `Hi ${business.name}, I just placed order #${order.orderNumber}. ${order.totalInr ? `Total: ₹${Number(order.totalInr).toLocaleString("en-IN")}` : ""}`;
  const waLink = business.whatsapp ? `${business.whatsapp.split("?")[0]}?text=${encodeURIComponent(waMsg)}` : null;
  const body = `
<div class="max-w-2xl mx-auto px-4 py-8">
  <!-- Success header -->
  <div class="text-center mb-6">
    <div class="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-white text-[36px] mb-3 shadow-lg" style="background: ${esc(theme.primary)}">✓</div>
    <h1 class="text-[28px] sm:text-[34px] font-black leading-tight">Thank you! 🎉</h1>
    <p class="text-[14px] text-gray-600 mt-2">Your order has been placed successfully.</p>
    <div class="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full text-[14px] font-extrabold" style="background: ${esc(theme.primary)}11; color: ${esc(theme.primary)}">
      Order #${order.orderNumber}
    </div>
  </div>

  <!-- Order card -->
  <div class="bg-white rounded-2xl border-2 p-5 shadow-[0_3px_0_0_${esc(theme.primary)}22] mb-4" style="border-color: ${esc(theme.primary)}33">
    <p class="text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-3">Order details</p>
    <ul class="space-y-2.5 mb-4 pb-4 border-b" style="border-color: ${esc(theme.primary)}22">
      ${items.map((it) => `<li class="flex gap-2.5 items-start">
        ${it.productPhotoUrl ? `<img src="${esc(it.productPhotoUrl)}" alt="" class="w-12 h-12 rounded-lg object-cover flex-shrink-0" onerror="this.style.display='none'" />` : `<div class="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-[20px] flex-shrink-0">📦</div>`}
        <div class="flex-1 min-w-0">
          <p class="text-[13px] font-extrabold truncate">${esc(it.productName)}</p>
          <p class="text-[11px] text-gray-500">₹${Number(it.unitPriceInr).toLocaleString("en-IN")} × ${it.quantity}</p>
        </div>
        <span class="text-[13px] font-extrabold tabular-nums">₹${Number(it.lineTotalInr).toLocaleString("en-IN")}</span>
      </li>`).join("")}
    </ul>
    <div class="space-y-1 text-[12.5px]">
      <div class="flex justify-between"><span class="text-gray-600">Subtotal</span><span class="font-extrabold tabular-nums">₹${Number(order.subtotalInr).toLocaleString("en-IN")}</span></div>
      ${Number(order.discountInr) > 0 ? `<div class="flex justify-between" style="color: ${esc(theme.primary)}"><span>Discount${order.couponCode ? ` (${esc(order.couponCode)})` : ""}</span><span class="font-extrabold tabular-nums">−₹${Number(order.discountInr).toLocaleString("en-IN")}</span></div>` : ""}
      ${Number(order.shippingInr) > 0 ? `<div class="flex justify-between"><span class="text-gray-600">Shipping${order.shippingZoneName ? ` (${esc(order.shippingZoneName)})` : ""}</span><span class="font-extrabold tabular-nums">₹${Number(order.shippingInr).toLocaleString("en-IN")}</span></div>` : ""}
      <div class="flex justify-between text-[15px] pt-2 mt-2 border-t" style="border-color: ${esc(theme.primary)}22">
        <span class="font-extrabold">Total paid</span>
        <span class="font-black tabular-nums" style="color: ${esc(theme.primary)}">₹${Number(order.totalInr).toLocaleString("en-IN")}</span>
      </div>
    </div>
  </div>

  <!-- Status -->
  <div class="bg-white rounded-2xl border-2 p-5 mb-4" style="border-color: ${esc(theme.primary)}22">
    <p class="text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-2">Status</p>
    <div class="flex items-center gap-2">
      <span class="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider" style="background: ${esc(theme.primary)}11; color: ${esc(theme.primary)}">${esc(order.status)}</span>
      <span class="text-[11.5px] text-gray-500">·</span>
      <span class="text-[11.5px] font-bold">Payment: ${esc(order.paymentStatus)}</span>
    </div>
    ${order.paymentStatus === "pending" && order.paymentMethod === "cod"
      ? `<p class="text-[11.5px] text-gray-600 mt-2 italic">Pay cash on delivery — keep ₹${Number(order.totalInr).toLocaleString("en-IN")} ready.</p>` : ""}
    ${order.paymentStatus === "pending" && order.paymentMethod === "upi" && business.upiVpa
      ? `<div class="mt-2 p-2.5 rounded-lg bg-gray-50 border" style="border-color: ${esc(theme.primary)}22"><p class="text-[11.5px] font-bold">Send ₹${Number(order.totalInr).toLocaleString("en-IN")} via UPI to:</p><p class="text-[13px] font-mono font-extrabold mt-1" style="color: ${esc(theme.primary)}">${esc(business.upiVpa)}</p></div>` : ""}
  </div>

  <!-- Actions -->
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
    <a href="${esc(trackUrl)}" class="inline-flex items-center justify-center gap-2 h-12 rounded-xl text-white font-extrabold text-[13px] shadow-[0_3px_0_0_rgba(0,0,0,0.15)] transition hover:-translate-y-0.5" style="background: ${esc(theme.primary)}">📦 Track order</a>
    ${waLink ? `<a href="${esc(waLink)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 h-12 rounded-xl text-white font-extrabold text-[13px] shadow-[0_3px_0_0_rgba(0,0,0,0.15)]" style="background: #25D366">💬 Confirm on WhatsApp</a>` : `<a href="/biz/${esc(slug)}" class="inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-white border-2 font-extrabold text-[13px]" style="border-color: ${esc(theme.primary)}33; color: ${esc(theme.primary)}">← Continue shopping</a>`}
  </div>
  <div class="text-center mt-3">
    <a href="/biz/${esc(slug)}/my-orders" class="text-[12px] font-extrabold hover:underline" style="color: ${esc(theme.primary)}">View all my orders</a>
  </div>

  <p class="text-[11px] text-center text-gray-500 mt-6">A confirmation has been logged. Bookmark this page or use your phone number to find this order again on the "My orders" page.</p>
</div>

<script>
// Clear cart on success page mount (handles direct visits + post-payment redirect)
(function(){ try { localStorage.removeItem('ax-cart-${esc(slug)}'); } catch(e){} })();
</script>
`;
  return renderEcommerceShell(input, `Order #${order.orderNumber} confirmed`, body, {
    breadcrumb: `<a href="/biz/${esc(slug)}" class="hover:underline">Home</a> · Order #${order.orderNumber}`,
  });
};

// ─── /track/:n — order tracking ──────────────────────────────────────────
const renderTrackOrderPage = (
  input: RenderInput,
  order: typeof orderTbl.$inferSelect,
  items: Array<typeof orderItem.$inferSelect>,
): string => {
  const { business, theme, slug } = input;
  const STEPS: Array<{ id: "new" | "confirmed" | "shipped" | "delivered"; label: string; icon: string }> = [
    { id: "new",       label: "Order placed",  icon: "📝" },
    { id: "confirmed", label: "Confirmed",      icon: "✅" },
    { id: "shipped",   label: "Out for delivery", icon: "🚚" },
    { id: "delivered", label: "Delivered",      icon: "📦" },
  ];
  const currentIdx = STEPS.findIndex((s) => s.id === order.status);
  const isCancelled = order.status === "cancelled";

  const waMsg = `Hi ${business.name}, asking about order #${order.orderNumber}.`;
  const waLink = business.whatsapp ? `${business.whatsapp.split("?")[0]}?text=${encodeURIComponent(waMsg)}` : null;

  const body = `
<div class="max-w-2xl mx-auto px-4 py-8">
  <div class="mb-6">
    <h1 class="text-[24px] sm:text-[28px] font-black leading-tight">📦 Order #${order.orderNumber}</h1>
    <p class="text-[13px] text-gray-600 mt-1">Placed ${new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
  </div>

  ${isCancelled ? `
  <div class="p-4 rounded-2xl bg-rose-50 border-2 border-rose-200 mb-4">
    <p class="text-[14px] font-extrabold text-rose-800">This order was cancelled.</p>
    <p class="text-[12px] text-rose-700 mt-1">Contact us on WhatsApp if you have questions.</p>
  </div>` : `
  <!-- Status timeline (vertical) -->
  <div class="bg-white rounded-2xl border-2 p-5 mb-4 shadow-[0_3px_0_0_${esc(theme.primary)}22]" style="border-color: ${esc(theme.primary)}33">
    <p class="text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-4">Order progress</p>
    <ol class="space-y-0">
      ${STEPS.map((s, i) => {
        const done = i <= currentIdx;
        const current = i === currentIdx;
        const isLast = i === STEPS.length - 1;
        return `<li class="flex gap-3">
          <div class="flex flex-col items-center flex-shrink-0">
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-[16px] transition" style="${done ? `background: ${esc(theme.primary)}; color: white;` : "background: #f1f1f1; color: #999;"}">
              ${done ? "✓" : s.icon}
            </div>
            ${!isLast ? `<div class="w-0.5 flex-1 my-1" style="background: ${done && i + 1 <= currentIdx ? esc(theme.primary) : "#e5e5e5"}; min-height: 28px;"></div>` : ""}
          </div>
          <div class="pb-7 flex-1">
            <p class="text-[13px] font-extrabold ${done ? "" : "text-gray-400"}">${esc(s.label)}</p>
            ${current ? `<p class="text-[11.5px] mt-0.5" style="color: ${esc(theme.primary)}">⚡ Current status</p>` : ""}
          </div>
        </li>`;
      }).join("")}
    </ol>
  </div>`}

  <!-- Items -->
  <div class="bg-white rounded-2xl border-2 p-5 mb-4" style="border-color: ${esc(theme.primary)}22">
    <p class="text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-3">Items (${items.length})</p>
    <ul class="space-y-2.5">
      ${items.map((it) => `<li class="flex gap-2.5 items-center">
        ${it.productPhotoUrl ? `<img src="${esc(it.productPhotoUrl)}" alt="" class="w-12 h-12 rounded-lg object-cover flex-shrink-0" onerror="this.style.display='none'" />` : `<div class="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-[20px] flex-shrink-0">📦</div>`}
        <div class="flex-1 min-w-0"><p class="text-[13px] font-extrabold truncate">${esc(it.productName)}</p><p class="text-[11px] text-gray-500">Qty: ${it.quantity}</p></div>
        <span class="text-[13px] font-extrabold tabular-nums">₹${Number(it.lineTotalInr).toLocaleString("en-IN")}</span>
      </li>`).join("")}
    </ul>
    <div class="mt-3 pt-3 border-t flex justify-between text-[14px]" style="border-color: ${esc(theme.primary)}22">
      <span class="font-extrabold">Total</span>
      <span class="font-black tabular-nums" style="color: ${esc(theme.primary)}">₹${Number(order.totalInr).toLocaleString("en-IN")}</span>
    </div>
  </div>

  <!-- Delivery info -->
  ${order.customerAddress ? `<div class="bg-white rounded-2xl border-2 p-5 mb-4" style="border-color: ${esc(theme.primary)}22">
    <p class="text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-2">📍 Delivering to</p>
    <p class="text-[13px] font-bold whitespace-pre-line">${esc(order.customerAddress)}${order.customerPincode ? ` — ${esc(order.customerPincode)}` : ""}</p>
  </div>` : ""}

  <!-- Actions -->
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-6">
    ${waLink ? `<a href="${esc(waLink)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 h-12 rounded-xl text-white font-extrabold text-[13px] shadow-[0_3px_0_0_rgba(0,0,0,0.15)]" style="background: #25D366">💬 Message about this order</a>` : ""}
    <a href="/biz/${esc(slug)}/my-orders" class="inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-white border-2 font-extrabold text-[13px]" style="border-color: ${esc(theme.primary)}33; color: ${esc(theme.primary)}">📋 All my orders</a>
  </div>

  <p class="text-[11px] text-center text-gray-500 mt-6">Bookmark this page to track status updates. Refresh anytime.</p>
</div>
`;
  return renderEcommerceShell(input, `Track order #${order.orderNumber}`, body, {
    breadcrumb: `<a href="/biz/${esc(slug)}" class="hover:underline">Home</a> · Track order #${order.orderNumber}`,
  });
};

// ─── /my-orders — phone lookup + order history ───────────────────────────
const renderMyOrdersPage = (
  input: RenderInput,
  phone: string | null,
  orders: Array<typeof orderTbl.$inferSelect> | null,
): string => {
  const { theme, slug } = input;
  const STATUS_BG: Record<string, string> = {
    new: "#FFEFE0", confirmed: "#E4E8FF", shipped: "#FFF1D6", delivered: "#E6F7EE", cancelled: "#FCE5F0",
  };
  const STATUS_COLOR: Record<string, string> = {
    new: "#FF6A1F", confirmed: "#3C50E0", shipped: "#B8651A", delivered: "#0E8A4B", cancelled: "#D4308E",
  };

  const body = `
<div class="max-w-3xl mx-auto px-4 py-8">
  <h1 class="text-[24px] sm:text-[28px] font-black leading-tight mb-1">📦 My orders</h1>
  <p class="text-[13px] text-gray-600 mb-6">Find your orders using the WhatsApp number you used at checkout.</p>

  <!-- Phone lookup form -->
  <form method="GET" action="/biz/${esc(slug)}/my-orders" class="bg-white rounded-2xl border-2 p-5 mb-6 shadow-[0_3px_0_0_${esc(theme.primary)}22]" style="border-color: ${esc(theme.primary)}33">
    <label class="text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-1.5 block">WhatsApp number</label>
    <div class="flex gap-2">
      <input name="phone" type="tel" value="${esc(phone || "")}" placeholder="+91 9XXXXXXXXX" required
             class="flex-1 px-3 py-2.5 rounded-lg border-2 focus:outline-none text-[14px] font-mono font-bold" style="border-color: ${esc(theme.primary)}33" />
      <button type="submit" class="h-11 px-5 rounded-lg text-white font-extrabold text-[13px] shadow-[0_3px_0_0_rgba(0,0,0,0.15)]" style="background: ${esc(theme.primary)}">Find orders</button>
    </div>
  </form>

  ${orders === null ? "" : orders.length === 0 ? `
  <div class="text-center py-12 px-6 bg-white rounded-2xl border-2" style="border-color: ${esc(theme.primary)}22">
    <div class="text-[48px] mb-2">🔍</div>
    <p class="text-[14px] font-extrabold mb-1">No orders found</p>
    <p class="text-[12px] text-gray-600">No orders match ${esc(phone || "")}. Double-check the number includes the country code (e.g. +91…).</p>
  </div>` : `
  <p class="text-[11.5px] font-bold text-gray-600 mb-3">Found ${orders.length} order${orders.length === 1 ? "" : "s"} for ${esc(phone || "")}</p>
  <ul class="space-y-3">
    ${orders.map((o) => `<li>
      <a href="/biz/${esc(slug)}/track/${o.orderNumber}?phone=${encodeURIComponent(o.customerPhone || "")}" class="block bg-white rounded-2xl border-2 p-4 hover:-translate-y-0.5 hover:shadow-lg transition" style="border-color: ${esc(theme.primary)}22">
        <div class="flex items-center justify-between gap-3 mb-1">
          <div class="flex items-center gap-2">
            <span class="text-[14px] font-black">#${o.orderNumber}</span>
            <span class="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded" style="background: ${STATUS_BG[o.status] || "#f1f1f1"}; color: ${STATUS_COLOR[o.status] || "#666"}">${esc(o.status)}</span>
          </div>
          <span class="text-[14px] font-extrabold tabular-nums" style="color: ${esc(theme.primary)}">₹${Number(o.totalInr).toLocaleString("en-IN")}</span>
        </div>
        <p class="text-[11.5px] text-gray-500">${new Date(o.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · Payment: ${esc(o.paymentStatus)}</p>
      </a>
    </li>`).join("")}
  </ul>`}
</div>
`;
  return renderEcommerceShell(input, "My orders", body, {
    breadcrumb: `<a href="/biz/${esc(slug)}" class="hover:underline">Home</a> · My orders`,
  });
};

// ─── E-COMMERCE ROUTES ────────────────────────────────────────────────────

app.get("/biz/:slug/cart", async (c) => {
  const slug = (c.req.param("slug") || "").toLowerCase().trim();
  const [row] = await db.select().from(site).where(eq(site.slug, slug)).limit(1);
  if (!row) return c.html(renderNotFound(), 404);
  if (row.status !== "published" && !(await isOwnerPreview(c, row.userId))) return c.html(renderDraftHolding(slug), 200);
  const input = await buildRenderInput(row, slug);
  return c.html(renderCartPage(input));
});

app.get("/biz/:slug/checkout", async (c) => {
  const slug = (c.req.param("slug") || "").toLowerCase().trim();
  const [row] = await db.select().from(site).where(eq(site.slug, slug)).limit(1);
  if (!row) return c.html(renderNotFound(), 404);
  if (row.status !== "published" && !(await isOwnerPreview(c, row.userId))) return c.html(renderDraftHolding(slug), 200);
  const input = await buildRenderInput(row, slug);
  return c.html(renderCheckoutPage(input));
});

app.get("/biz/:slug/order/:orderNumber", async (c) => {
  const slug = (c.req.param("slug") || "").toLowerCase().trim();
  const orderNumber = parseInt(c.req.param("orderNumber"), 10);
  const phone = c.req.query("phone")?.trim() || null;
  if (!Number.isFinite(orderNumber)) return c.html(renderNotFound(), 404);

  const [row] = await db.select().from(site).where(eq(site.slug, slug)).limit(1);
  if (!row) return c.html(renderNotFound(), 404);

  const [order] = await db.select().from(orderTbl)
    .where(and(eq(orderTbl.ownerId, row.userId), eq(orderTbl.orderNumber, orderNumber))).limit(1);
  if (!order) return c.html(renderNotFound(), 404);

  // Privacy: if phone provided in URL it must match. If not provided, allow
  // anyone with the order number — same magic-link pattern as Shopify
  // tracking. We can tighten with a signed token later.
  if (phone && order.customerPhone && phone.replace(/\D+/g, "") !== order.customerPhone.replace(/\D+/g, "")) {
    return c.html(renderNotFound(), 404);
  }

  const items = await db.select().from(orderItem).where(eq(orderItem.orderId, order.id));
  const input = await buildRenderInput(row, slug);
  c.header("Cache-Control", "no-store");
  return c.html(renderOrderSuccessPage(input, order, items));
});

app.get("/biz/:slug/track/:orderNumber", async (c) => {
  const slug = (c.req.param("slug") || "").toLowerCase().trim();
  const orderNumber = parseInt(c.req.param("orderNumber"), 10);
  const phone = c.req.query("phone")?.trim() || null;
  if (!Number.isFinite(orderNumber)) return c.html(renderNotFound(), 404);

  const [row] = await db.select().from(site).where(eq(site.slug, slug)).limit(1);
  if (!row) return c.html(renderNotFound(), 404);

  const [order] = await db.select().from(orderTbl)
    .where(and(eq(orderTbl.ownerId, row.userId), eq(orderTbl.orderNumber, orderNumber))).limit(1);
  if (!order) return c.html(renderNotFound(), 404);

  // Track REQUIRES phone match — it's the cheap "auth" for the page.
  if (!phone || !order.customerPhone || phone.replace(/\D+/g, "") !== order.customerPhone.replace(/\D+/g, "")) {
    return c.html(renderNotFound(), 404);
  }

  const items = await db.select().from(orderItem).where(eq(orderItem.orderId, order.id));
  const input = await buildRenderInput(row, slug);
  c.header("Cache-Control", "no-store");
  return c.html(renderTrackOrderPage(input, order, items));
});

app.get("/biz/:slug/my-orders", async (c) => {
  const slug = (c.req.param("slug") || "").toLowerCase().trim();
  const phone = c.req.query("phone")?.trim() || null;
  const [row] = await db.select().from(site).where(eq(site.slug, slug)).limit(1);
  if (!row) return c.html(renderNotFound(), 404);

  let orders: Array<typeof orderTbl.$inferSelect> | null = null;
  if (phone) {
    const normalized = phone.replace(/\D+/g, "");
    // Match by stripped digits — handles +91, spaces, hyphens uniformly
    orders = await db.execute<typeof orderTbl.$inferSelect>(sql`
      SELECT * FROM ${orderTbl}
      WHERE ${orderTbl.ownerId} = ${row.userId}
        AND regexp_replace(${orderTbl.customerPhone}, '[^0-9]+', '', 'g') = ${normalized}
      ORDER BY ${orderTbl.createdAt} DESC
      LIMIT 50
    `).then((r) => (r.rows ?? r) as Array<typeof orderTbl.$inferSelect>);
  }

  const input = await buildRenderInput(row, slug);
  c.header("Cache-Control", "no-store");
  return c.html(renderMyOrdersPage(input, phone, orders));
});

/** Multi-page route — /biz/:slug/:path matches custom pages defined in the
 *  Builder (e.g. /biz/sharma-store/menu). Path must be a single-segment, lowercase,
 *  hyphenated word; longer/illegal paths fall through to NotFound. */
app.get("/biz/:slug/:path", async (c) => {
  const slug = (c.req.param("slug") || "").toLowerCase().trim();
  const rawPath = (c.req.param("path") || "").toLowerCase().trim();
  // Block POST mutation endpoints + reserved e-commerce pages (those are
  // matched by their own GET handlers further up).
  if (["lead", "order", "shipping", "coupon", "pay", "cart", "checkout", "my-orders", "track", "orders"].includes(rawPath)) {
    return c.html(renderNotFound(), 404);
  }
  if (!/^[a-z0-9-]+$/.test(rawPath)) return c.html(renderNotFound(), 404);

  const [row] = await db.select().from(site).where(eq(site.slug, slug)).limit(1);
  if (!row) return c.html(renderNotFound(), 404);

  const preview = await isOwnerPreview(c, row.userId);
  if (row.status !== "published" && !preview) return c.html(renderDraftHolding(slug), 200);

  const requestPath = `/${rawPath}`;
  const { html, pageFound } = await renderSiteForPath(row, slug, requestPath, preview);
  if (!pageFound) return c.html(renderNotFound(), 404);

  if (preview) {
    c.header("Cache-Control", "no-store");
    return c.html(html);
  }

  // Log view (same as home route)
  void db.update(site).set({ viewCount: sql`${site.viewCount} + 1` }).where(eq(site.id, row.id)).catch(() => {});
  const ipForView = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const dayBucket = new Date().toISOString().slice(0, 10);
  const viewSession = createHash("sha256").update(`${ipForView}|${dayBucket}|${row.id}`).digest("hex").slice(0, 32);
  logEvent({
    siteId: row.id, ownerId: row.userId, eventType: "view",
    path: `/biz/${slug}${requestPath}`, referrerHost: refHostBucket(c.req.header("referer")),
    sessionHash: viewSession, userAgent: c.req.header("user-agent") || null,
  });

  c.header("Cache-Control", "public, max-age=60, s-maxage=60");
  return c.html(html);
});

/** POST /biz/:slug/order — public cart checkout. Receives a list of items
 *  (id + qty), validates against live product prices, creates the order +
 *  order_items + (optionally) a CRM contact. Returns order_number to display
 *  on the success screen. */
app.post("/biz/:slug/order", async (c) => {
  const slug = (c.req.param("slug") || "").toLowerCase().trim();
  if (!slug) return c.json({ error: "Not found" }, 404);

  const [row] = await db.select().from(site).where(eq(site.slug, slug)).limit(1);
  if (!row) return c.json({ error: "Site not found" }, 404);
  if (row.status !== "published") return c.json({ error: "Site is not published" }, 400);

  const body = await c.req.json<{
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string;
    customer_address?: string;
    customer_pincode?: string;
    notes?: string;
    payment_method?: string;     // 'upi' | 'cod'
    coupon_code?: string;
    items?: Array<{ product_id: string; quantity: number }>;
  }>().catch(() => ({} as { customer_name?: string }));

  const name = (body.customer_name || "").trim().slice(0, 100);
  const phone = (body.customer_phone || "").trim().slice(0, 30) || null;
  const email = (body.customer_email || "").trim().slice(0, 200) || null;
  const address = (body.customer_address || "").trim().slice(0, 500) || null;
  const pincode = (body.customer_pincode || "").replace(/\D+/g, "").slice(0, 6) || null;
  const notes = (body.notes || "").trim().slice(0, 500) || null;
  const paymentMethod = ["upi", "cod"].includes(body.payment_method ?? "") ? body.payment_method! : null;

  if (!name) return c.json({ error: "Name is required" }, 400);
  if (!phone) return c.json({ error: "WhatsApp number is required" }, 400);
  const items = Array.isArray(body.items) ? body.items.filter((i) => i?.product_id && Number(i.quantity) > 0) : [];
  if (items.length === 0) return c.json({ error: "Cart is empty" }, 400);
  if (items.length > 50) return c.json({ error: "Too many items in one order" }, 400);

  // Re-fetch products from DB so the customer can't tamper with prices
  const ids = items.map((i) => i.product_id);
  const prods = await db.select().from(product)
    .where(and(eq(product.ownerId, row.userId), inArray(product.id, ids)));
  if (prods.length === 0) return c.json({ error: "Products in cart no longer available" }, 400);
  const prodById = new Map(prods.map((p) => [p.id, p]));

  const lineRows: Array<{
    productId: string;
    productName: string;
    productPhotoUrl: string | null;
    unitPriceInr: string;
    quantity: number;
    lineTotalInr: string;
  }> = [];
  let subtotal = 0;
  for (const it of items) {
    const p = prodById.get(it.product_id);
    if (!p || p.status !== "active") continue;
    const qty = Math.max(1, Math.min(Math.floor(Number(it.quantity)), 99));
    const price = Number(p.priceInr) || 0;
    const line = price * qty;
    subtotal += line;
    lineRows.push({
      productId: p.id,
      productName: p.name,
      productPhotoUrl: p.photoUrl,
      unitPriceInr: String(price),
      quantity: qty,
      lineTotalInr: String(line),
    });
  }
  if (lineRows.length === 0) return c.json({ error: "Selected products are no longer available" }, 400);

  // Apply coupon if provided
  let discountInr = 0;
  let couponId: string | null = null;
  let couponCode: string | null = null;
  if (body.coupon_code && String(body.coupon_code).trim()) {
    const result = await validateCoupon(row.userId, String(body.coupon_code), subtotal);
    if (!result.ok) return c.json({ error: result.reason }, 400);
    discountInr = result.discountInr;
    couponId = result.coupon.id;
    couponCode = result.coupon.code;
  }

  // Calculate shipping from zone (server-side re-validation; cart UI passes
  // the pincode it already quoted).
  let shippingInr = 0;
  let shippingZoneId: string | null = null;
  let shippingZoneName: string | null = null;
  if (pincode) {
    const quote = await pickShippingQuote(row.userId, pincode, subtotal - discountInr);
    if (quote) {
      shippingInr = quote.rateInr;
      shippingZoneId = quote.zoneId;
      shippingZoneName = quote.zoneName;
    }
  }

  const total = Math.max(0, subtotal - discountInr + shippingInr);

  // Try a few times to allocate a unique order_number under race
  let order: typeof orderTbl.$inferSelect | undefined;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const orderNumber = await nextOrderNumber(row.userId);
      const [created] = await db.insert(orderTbl).values({
        ownerId: row.userId,
        siteId: row.id,
        orderNumber,
        customerName: name,
        customerPhone: phone,
        customerEmail: email,
        customerAddress: address,
        customerPincode: pincode,
        subtotalInr: String(subtotal),
        shippingInr: String(shippingInr),
        discountInr: String(discountInr),
        totalInr: String(total),
        status: "new",
        paymentMethod,
        paymentStatus: "pending",
        source: "website",
        notes,
        couponId,
        couponCode,
        shippingZoneId,
        shippingZoneName,
      }).returning();
      order = created;
      break;
    } catch (e) {
      // Likely the unique index — retry with a fresh allocation
      if (attempt === 4) throw e;
    }
  }
  if (!order) return c.json({ error: "Could not place order — please try again" }, 500);

  await db.insert(orderItem).values(lineRows.map((r) => ({ ...r, orderId: order!.id })));

  // Bump coupon used_count atomically
  if (couponId) {
    void db.update(coupon).set({ usedCount: sql`${coupon.usedCount} + 1`, updatedAt: new Date() })
      .where(eq(coupon.id, couponId)).catch(() => {});
  }

  // Mirror to CRM contact (dedupe by phone) so the seller can WhatsApp them
  const normalizedPhone = phone.replace(/[^\d+]/g, "");
  const [existing] = await db.select({ id: contact.id }).from(contact)
    .where(and(eq(contact.ownerId, row.userId), eq(contact.phone, normalizedPhone))).limit(1);
  let contactId: string;
  if (existing) {
    contactId = existing.id;
  } else {
    const [c2] = await db.insert(contact).values({
      ownerId: row.userId,
      name,
      phone: normalizedPhone,
      email,
      source: `website-order:${slug}`,
      tag: "hot",
      notes: notes ? `First order note: ${notes}` : null,
    }).returning({ id: contact.id });
    contactId = c2.id;
  }
  await db.update(orderTbl).set({ contactId }).where(eq(orderTbl.id, order.id));

  logEvent({
    siteId: row.id,
    ownerId: row.userId,
    eventType: "order",
    path: `/biz/${slug}`,
    referrerHost: refHostBucket(c.req.header("referer")),
    valueInr: Number(order.totalInr),
    userAgent: c.req.header("user-agent") || null,
  });

  return c.json({
    ok: true,
    order_id: order.id,
    order_number: order.orderNumber,
    total_inr: Number(order.totalInr),
  });
});

/** POST /biz/:slug/shipping/quote — cart calls this once the user types a
 *  pincode. Returns the matched zone, rate, ETA. Cart includes rate in total. */
app.post("/biz/:slug/shipping/quote", async (c) => {
  const slug = (c.req.param("slug") || "").toLowerCase().trim();
  const [row] = await db.select().from(site).where(eq(site.slug, slug)).limit(1);
  if (!row) return c.json({ ok: false, reason: "Site not found" }, 404);

  const body = await c.req.json<{ pincode?: string; cart_subtotal_inr?: number }>().catch(() => ({}));
  const pin = String(body.pincode || "").trim();
  if (!pin) return c.json({ ok: false, reason: "Enter a pincode" });
  if (!/^\d{6}$/.test(pin)) return c.json({ ok: false, reason: "Pincode must be 6 digits" });

  const quote = await pickShippingQuote(row.userId, pin, Math.max(0, Number(body.cart_subtotal_inr) || 0));
  if (!quote) return c.json({ ok: false, reason: "No delivery to this pincode yet — contact us on WhatsApp" });
  return c.json({
    ok: true,
    zone_id: quote.zoneId,
    zone_name: quote.zoneName,
    rate_inr: quote.rateInr,
    eta_days: quote.etaDays,
    free: quote.free,
  });
});

/** POST /biz/:slug/coupon/check — public, used by the cart drawer to apply a
 *  discount code before submitting the order. Returns the calculated discount
 *  amount; cart UI then re-computes the total on screen. Doesn't increment
 *  used_count — only successful checkout does that. */
app.post("/biz/:slug/coupon/check", async (c) => {
  const slug = (c.req.param("slug") || "").toLowerCase().trim();
  const [row] = await db.select().from(site).where(eq(site.slug, slug)).limit(1);
  if (!row) return c.json({ ok: false, reason: "Site not found" }, 404);
  if (row.status !== "published") return c.json({ ok: false, reason: "Site not published" }, 400);

  const body = await c.req.json<{ code?: string; cart_subtotal_inr?: number }>().catch(() => ({}));
  const cartSubtotal = Math.max(0, Number(body.cart_subtotal_inr) || 0);
  const code = String(body.code || "");

  const result = await validateCoupon(row.userId, code, cartSubtotal);
  if (!result.ok) return c.json({ ok: false, reason: result.reason });
  return c.json({
    ok: true,
    discount_inr: result.discountInr,
    code: result.coupon.code,
    type: result.coupon.discountType,
    value: Number(result.coupon.discountValue),
  });
});

/** POST /biz/:slug/lead — public lead capture from the rendered form.
 *  Validates, inserts into site_lead + the existing contact table so the
 *  lead shows up in the CRM inbox flow. */
app.post("/biz/:slug/lead", async (c) => {
  const slug = (c.req.param("slug") || "").toLowerCase().trim();
  if (!slug) return c.json({ error: "Not found" }, 404);

  const [row] = await db.select().from(site).where(eq(site.slug, slug)).limit(1);
  if (!row) return c.json({ error: "Site not found" }, 404);
  if (row.status !== "published") return c.json({ error: "Site is not published" }, 400);

  const body = await c.req.json<{ name?: string; phone?: string; email?: string; message?: string }>()
    .catch(() => ({} as { name?: string; phone?: string; email?: string; message?: string }));

  const name = (body.name || "").trim().slice(0, 100);
  const phone = (body.phone || "").trim().slice(0, 30) || null;
  const email = (body.email || "").trim().slice(0, 200) || null;
  const message = (body.message || "").trim().slice(0, 500) || null;

  if (!name) return c.json({ error: "Name is required" }, 400);
  if (!phone && !email) return c.json({ error: "Please provide a WhatsApp number or email" }, 400);

  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ua = c.req.header("user-agent") || null;
  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 32);

  const [lead] = await db.insert(siteLead).values({
    siteId: row.id,
    ownerId: row.userId,
    name, phone, email, message,
    sourcePath: `/biz/${slug}`,
    userAgent: ua,
    ipHash,
  }).returning();

  // Also push to the CRM contact table so the lead shows up in the inbox flow.
  // Phone is the de-dupe key — if a contact already exists with this phone for
  // this owner, link to it instead of creating a duplicate.
  if (phone) {
    const normalizedPhone = phone.replace(/[^\d+]/g, "");
    const [existing] = await db.select({ id: contact.id }).from(contact)
      .where(and(eq(contact.ownerId, row.userId), eq(contact.phone, normalizedPhone))).limit(1);

    let contactId: string;
    if (existing) {
      contactId = existing.id;
    } else {
      const [c2] = await db.insert(contact).values({
        ownerId: row.userId,
        name,
        phone: normalizedPhone,
        email,
        source: `website:${slug}`,
        tag: "warm",
        notes: message ? `Lead form: ${message}` : null,
      }).returning({ id: contact.id });
      contactId = c2.id;
    }
    await db.update(siteLead).set({ contactId }).where(eq(siteLead.id, lead.id));
  }

  logEvent({
    siteId: row.id,
    ownerId: row.userId,
    eventType: "lead",
    path: `/biz/${slug}`,
    referrerHost: refHostBucket(c.req.header("referer")),
    userAgent: ua,
  });

  return c.json({ ok: true, lead_id: lead.id });
});

/** GET /biz-demo/:template — public preview using canned sample data.
 *  No DB lookup — lets visitors see what each template looks like before
 *  applying it to their own site. Mounted from the Template Store. */
app.get("/biz-demo/:template", (c) => {
  const template = (c.req.param("template") || "kirana").toLowerCase();
  const allowed = new Set(["kirana", "salon", "restaurant", "services", "dps"]);
  if (!allowed.has(template)) return c.html(renderNotFound(), 404);

  const demo = DEMO_DATA[template] ?? DEMO_DATA.kirana;
  const input: RenderInput = {
    template,
    business: {
      name: demo.businessName,
      tagline: demo.tagline,
      about: demo.about,
      phone: "+91 9999000000",
      whatsapp: "https://wa.me/919999000000?text=" + encodeURIComponent(`Hi ${demo.businessName}, this is a demo enquiry.`),
      upiVpa: "demo@upi",
      upiName: demo.businessName,
      email: "demo@addisonxmedia.com",
      instagram: "https://instagram.com/demo",
      facebook: null,
      address: demo.address,
      hours: demo.hours,
      logoUrl: null,
      coverUrl: null,
    },
    visibility: { products: true, hours: true, address: true, contact: true, leadform: true },
    theme: demo.theme,
    seo: { title: `${demo.businessName} — demo template`, description: demo.tagline, ogImage: null },
    slug: `demo-${template}`,
    products: demo.products,
    cashfree: { enabled: false, mode: "sandbox" },
    advanced: { faviconUrl: null, ga4Id: null, metaPixelId: null, customHeadHtml: null, allowIndexing: false },
  };

  c.header("Cache-Control", "public, max-age=300");
  // Dispatch by template id. DPS has its own dedicated renderer; others
  // share renderKirana with vocab swaps.
  const raw = template === "dps" ? renderAddisonDPS(input) : renderKirana(input);
  // Wrap rendered HTML with a "demo banner" injected at the top so visitors
  // know this is a preview. The body opener differs slightly between the
  // two renderers — handle both.
  const banner = `<div style="position:sticky;top:0;z-index:100;background:linear-gradient(90deg,#0E8A4B,#FFD23F);color:white;padding:8px 12px;text-align:center;font-weight:800;font-size:12px;letter-spacing:0.05em;text-transform:uppercase;">
  Website preview · <a href="/app/site/store" style="color:#fff;text-decoration:underline;">← back to Website Store</a>
</div>`;
  const html = raw
    .replace("<body class=\"text-gray-900 bg-white\">", `<body class="text-gray-900 bg-white">\n${banner}`)
    .replace("<body class=\"text-gray-900\">", `<body class="text-gray-900">\n${banner}`);
  return c.html(html);
});

// ─── Canned demo data per template ────────────────────────────────────────

type DemoData = {
  businessName: string;
  tagline: string;
  about: string;
  address: string;
  hours: string;
  theme: { primary: string; accent: string; font: string };
  products: ProductRender[];
};

const DEMO_DATA: Record<string, DemoData> = {
  kirana: {
    businessName: "Sharma General Store",
    tagline: "Fresh groceries delivered in 30 minutes across Patna.",
    about: "Family-run since 1987. Daily-fresh vegetables, branded staples, household essentials — all at the best prices in town. Free delivery on orders above ₹500.",
    address: "Shop 12, Boring Road, Patna 800001",
    hours: "Mon–Sat: 7 am – 10 pm\nSunday: 8 am – 9 pm",
    theme: { primary: "#0E8A4B", accent: "#FFD23F", font: "Inter" },
    products: [
      { id: "demo-1", name: "Basmati Rice (5 kg)",      description: "Premium long-grain, aged 12 months", priceInr: 599, photoUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop", inStock: true },
      { id: "demo-2", name: "Toor Dal (1 kg)",          description: "Hand-picked, no polish",            priceInr: 159, photoUrl: "https://images.unsplash.com/photo-1612257999756-99ff3d6a9012?w=400&h=400&fit=crop", inStock: true },
      { id: "demo-3", name: "Sunflower Oil (5L)",       description: "Cold-pressed, no preservatives",    priceInr: 749, photoUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop", inStock: true },
      { id: "demo-4", name: "Atta (10 kg)",              description: "Chakki-fresh whole wheat flour",    priceInr: 449, photoUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop", inStock: true },
      { id: "demo-5", name: "Tea (500 g)",               description: "Premium Assam loose-leaf",          priceInr: 289, photoUrl: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&h=400&fit=crop", inStock: true },
      { id: "demo-6", name: "Sugar (5 kg)",              description: "Refined crystal sugar",             priceInr: 249, photoUrl: "https://images.unsplash.com/photo-1610545487565-89c0bcfdfaa3?w=400&h=400&fit=crop", inStock: true },
    ],
  },
  salon: {
    businessName: "Glow Salon & Spa",
    tagline: "Hair, skin and nails — done right by award-winning stylists.",
    about: "8 years of pampering Bangalore. Trained at L'Oréal Academy, certified in all major brands. Walk-ins welcome but appointments preferred — book on WhatsApp in 10 seconds.",
    address: "Indiranagar 100ft Road, Bengaluru 560038",
    hours: "Tue–Sun: 10 am – 9 pm\nMonday: Closed",
    theme: { primary: "#D4308E", accent: "#FFD23F", font: "Manrope" },
    products: [
      { id: "demo-1", name: "Hair Cut & Style",         description: "Senior stylist · 45 min",  priceInr: 599,  photoUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=400&fit=crop", inStock: true },
      { id: "demo-2", name: "Hair Color (Global)",      description: "Premium ammonia-free · 90 min", priceInr: 2499, photoUrl: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=400&h=400&fit=crop", inStock: true },
      { id: "demo-3", name: "Manicure & Pedicure",      description: "Combo · spa treatment",    priceInr: 1299, photoUrl: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop", inStock: true },
      { id: "demo-4", name: "Facial — Hydrating",       description: "60 min · all skin types",  priceInr: 1799, photoUrl: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=400&fit=crop", inStock: true },
      { id: "demo-5", name: "Bridal Package",           description: "4 hr · trial included",    priceInr: 12999, photoUrl: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&h=400&fit=crop", inStock: true },
      { id: "demo-6", name: "Hair Spa",                 description: "Deep conditioning · 60 min", priceInr: 899, photoUrl: "https://images.unsplash.com/photo-1633681926022-84c23e8cb6db?w=400&h=400&fit=crop", inStock: true },
    ],
  },
  restaurant: {
    businessName: "Spice Route Kitchen",
    tagline: "Authentic North Indian — home-style, no MSG, ready in 25 minutes.",
    about: "Run by Chef Anita, recipes passed down 3 generations. We use only fresh ingredients sourced daily from Crawford Market. Free delivery within 5 km.",
    address: "Linking Road, Bandra West, Mumbai 400050",
    hours: "Daily: 11 am – 11 pm",
    theme: { primary: "#FF6A1F", accent: "#FFD23F", font: "Poppins" },
    products: [
      { id: "demo-1", name: "Butter Chicken",           description: "Half · serves 1",         priceInr: 320, photoUrl: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=400&fit=crop", inStock: true },
      { id: "demo-2", name: "Paneer Tikka Masala",      description: "Tandoor-fired paneer",    priceInr: 280, photoUrl: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=400&fit=crop", inStock: true },
      { id: "demo-3", name: "Garlic Naan",              description: "Fresh tandoor · 2 pcs",   priceInr: 80,  photoUrl: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=400&h=400&fit=crop", inStock: true },
      { id: "demo-4", name: "Dal Makhani",              description: "Slow-cooked overnight",   priceInr: 240, photoUrl: "https://images.unsplash.com/photo-1626777553635-d23a4dba0a02?w=400&h=400&fit=crop", inStock: true },
      { id: "demo-5", name: "Hyderabadi Biryani",       description: "Dum-cooked · serves 1",   priceInr: 380, photoUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=400&fit=crop", inStock: true },
      { id: "demo-6", name: "Gulab Jamun",              description: "Pack of 4 · warm",        priceInr: 120, photoUrl: "https://images.unsplash.com/photo-1601303516534-bf749e3e7f7c?w=400&h=400&fit=crop", inStock: true },
    ],
  },
  services: {
    businessName: "ProFix Home Services",
    tagline: "Plumbing, electrical, AC repair — verified pros, fair prices, 1-hour ETA.",
    about: "5+ years serving Hyderabad. All technicians background-checked and trained. 30-day workmanship warranty on every job. Pay only after work is done.",
    address: "HITEC City, Hyderabad 500081",
    hours: "Daily: 8 am – 10 pm\nSame-day service available",
    theme: { primary: "#3C50E0", accent: "#FFD23F", font: "DM Sans" },
    products: [
      { id: "demo-1", name: "Plumbing Visit",          description: "Diagnosis + small repair", priceInr: 299,  photoUrl: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&h=400&fit=crop", inStock: true },
      { id: "demo-2", name: "AC Service",              description: "Deep cleaning · all brands", priceInr: 599, photoUrl: "https://images.unsplash.com/photo-1631545806609-46d3edae9c5f?w=400&h=400&fit=crop", inStock: true },
      { id: "demo-3", name: "Electrician Visit",       description: "Wiring / switch / fixture", priceInr: 349, photoUrl: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&h=400&fit=crop", inStock: true },
      { id: "demo-4", name: "Deep Cleaning",           description: "2-3 BHK · full kitchen + 2 bathrooms", priceInr: 2499, photoUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=400&fit=crop", inStock: true },
      { id: "demo-5", name: "Carpenter Visit",         description: "Furniture repair / install", priceInr: 399, photoUrl: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=400&fit=crop", inStock: true },
      { id: "demo-6", name: "Pest Control",            description: "1 BHK · 6-month warranty", priceInr: 1499, photoUrl: "https://images.unsplash.com/photo-1582719188393-bb71ca45dbb9?w=400&h=400&fit=crop", inStock: true },
    ],
  },
  dps: {
    businessName: "Arjun's Notion Templates",
    tagline: "Done-for-you Notion systems that turn chaos into clarity — built by an Indian creator for Indian creators.",
    about: "Hi, I'm Arjun. After running 3 startups out of Bengaluru, I packaged the exact Notion systems I used into ready-made templates. 10,000+ Indian creators, freelancers, and students have used them. Made in India, priced in rupees, instant delivery on WhatsApp.",
    address: "",
    hours: "",
    theme: { primary: "#0E8A4B", accent: "#FFD23F", font: "Plus Jakarta Sans" },
    products: [
      { id: "demo-dps-1", name: "Ultimate Freelancer OS — Notion Template",     description: "Track clients, projects, invoices and goals in ONE place. Used by 5,000+ Indian freelancers. Includes GST-ready invoice generator + tax tracker.", priceInr: 499,  photoUrl: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=1000&fit=crop", inStock: true },
      { id: "demo-dps-2", name: "Content Creator Vault",                          description: "200+ Reel ideas, hook templates, CTA library + posting calendar.",            priceInr: 299,  photoUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=300&fit=crop", inStock: true },
      { id: "demo-dps-3", name: "Startup Founder's First-100-Days Playbook",      description: "Step-by-step Notion playbook for founders launching in India.",            priceInr: 999,  photoUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop", inStock: true },
      { id: "demo-dps-4", name: "Personal Finance Tracker (₹ in INR)",            description: "Budget, SIP tracker, tax estimator — all in INR.",                       priceInr: 199,  photoUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop", inStock: true },
    ],
  },
};

export default app;
