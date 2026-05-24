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
import { site, siteLead, contact, profile, metaConfig, product, orderTbl, orderItem, siteAnalyticsEvent, coupon, user } from "../db/schema";
import { nextOrderNumber } from "./order";
import { validateCoupon } from "./coupon";
import { pickShippingQuote } from "./shipping";
import { cashfreeIsConfigured, cashfreeMode } from "../integrations/cashfree";

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
    instagram: string | null;
    facebook: string | null;
    address: string | null;
    hours: string | null;
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
};

const vocabFor = (template: string) => TEMPLATE_VOCAB[template] || TEMPLATE_VOCAB.kirana;

/** The Kirana / Local Shop template — single page, mobile-first, fast. */
const renderKirana = (input: RenderInput): string => {
  const { business, theme, seo, slug, products, cashfree, template, advanced } = input;
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
      💬 ${esc(vocab.orderButtonText)}
    </a>` : ""}
  </div>
</header>

<!-- ── Hero ── -->
<section class="dot-bg py-16 sm:py-24 px-4">
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
${products.length > 0 ? `
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

<!-- ── Floating cart button (rendered always — hides when empty) ── -->
${products.length > 0 ? `
<button
  id="ax-cart-btn"
  type="button"
  onclick="window.AxCart.open()"
  class="hidden fixed bottom-5 left-5 z-40 h-14 rounded-full px-5 text-white font-extrabold shadow-xl transition hover:scale-105 items-center gap-2"
  style="background: ${esc(theme.primary)}">
  <span class="text-[18px]">🛒</span>
  <span id="ax-cart-count" class="text-[14px]">0</span>
  <span class="text-[12px] opacity-85">·</span>
  <span id="ax-cart-total" class="text-[13px] tabular-nums">₹0</span>
</button>

<!-- ── Cart + Checkout modal ── -->
<div id="ax-cart-modal" class="hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm items-end sm:items-center justify-center p-0 sm:p-4">
  <div class="bg-white w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl">
    <div class="sticky top-0 z-10 bg-white border-b-2 px-5 py-3 flex items-center justify-between" style="border-color: ${esc(theme.primary)}33">
      <h2 id="ax-cart-title" class="text-[16px] font-black">Your cart</h2>
      <button type="button" onclick="window.AxCart.close()" class="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-[16px]">✕</button>
    </div>

    <!-- Items list -->
    <div id="ax-cart-items" class="p-4 space-y-2"></div>

    <!-- Checkout form (hidden until "Checkout" tapped) -->
    <form id="ax-checkout-form" class="hidden p-5 pt-2 space-y-3 border-t" style="border-color: ${esc(theme.primary)}22" data-slug="${esc(slug)}">
      <input name="customer_name" required maxlength="100" placeholder="Your name *"
             class="w-full px-3 py-2.5 rounded-lg border-2 focus:outline-none text-[14px] font-bold" style="border-color: ${esc(theme.primary)}33" />
      <input name="customer_phone" required type="tel" maxlength="20" placeholder="WhatsApp number * (e.g. +91 9XXXXXXXXX)"
             class="w-full px-3 py-2.5 rounded-lg border-2 focus:outline-none text-[14px] font-mono" style="border-color: ${esc(theme.primary)}33" />
      <textarea name="customer_address" rows="2" maxlength="500" placeholder="Delivery address"
                class="w-full px-3 py-2.5 rounded-lg border-2 focus:outline-none text-[13px] resize-none" style="border-color: ${esc(theme.primary)}33"></textarea>
      <div class="flex gap-2">
        <input id="ax-pincode-input" name="customer_pincode" type="text" inputmode="numeric" maxlength="6" placeholder="6-digit pincode"
               oninput="window.AxCart.onPincodeInput()"
               class="flex-1 px-3 py-2.5 rounded-lg border-2 focus:outline-none text-[13px] font-mono font-bold tracking-wider" style="border-color: ${esc(theme.primary)}33" />
      </div>
      <p id="ax-shipping-status" class="text-[11px] font-bold hidden"></p>
      <textarea name="notes" rows="2" maxlength="500" placeholder="Any special instructions?"
                class="w-full px-3 py-2.5 rounded-lg border-2 focus:outline-none text-[13px] resize-none" style="border-color: ${esc(theme.primary)}33"></textarea>
      <div>
        <p class="text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-1.5">Payment</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          ${cashfree.enabled ? `
          <label class="flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition hover:bg-gray-50" style="border-color: ${esc(theme.primary)}33">
            <input type="radio" name="payment_method" value="online" checked class="w-4 h-4" />
            <span class="text-[12px] font-extrabold">💳 Card / UPI / Netbanking</span>
          </label>` : ""}
          ${business.upiVpa && !cashfree.enabled ? `
          <label class="flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition hover:bg-gray-50" style="border-color: ${esc(theme.primary)}33">
            <input type="radio" name="payment_method" value="upi" checked class="w-4 h-4" />
            <span class="text-[12px] font-extrabold">💳 UPI (manual)</span>
          </label>` : ""}
          <label class="flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition hover:bg-gray-50" style="border-color: ${esc(theme.primary)}33">
            <input type="radio" name="payment_method" value="cod" ${(cashfree.enabled || business.upiVpa) ? "" : "checked"} class="w-4 h-4" />
            <span class="text-[12px] font-extrabold">💵 Cash on delivery</span>
          </label>
        </div>
      </div>
    </form>

    <!-- Footer: coupon + totals + CTA -->
    <div id="ax-cart-footer" class="sticky bottom-0 bg-white border-t-2 p-4" style="border-color: ${esc(theme.primary)}33">
      <div id="ax-coupon-row" class="hidden mb-2.5 flex items-center gap-2">
        <input id="ax-coupon-input" type="text" placeholder="Coupon code"
               class="flex-1 px-3 py-2 rounded-lg border-2 focus:outline-none text-[12.5px] font-mono uppercase font-bold tracking-wider"
               style="border-color: ${esc(theme.primary)}33" />
        <button id="ax-coupon-apply" type="button" onclick="window.AxCart.applyCoupon()"
                class="h-9 px-3 rounded-lg text-white text-[12px] font-extrabold transition"
                style="background: ${esc(theme.primary)}">Apply</button>
      </div>
      <p id="ax-coupon-status" class="hidden text-[11px] font-bold mb-2"></p>
      <div id="ax-cart-summary" class="space-y-1.5 mb-3">
        <div class="flex items-center justify-between">
          <span class="text-[12.5px] font-bold text-gray-600">Subtotal</span>
          <span id="ax-cart-subtotal" class="text-[13px] font-extrabold tabular-nums">₹0</span>
        </div>
        <div id="ax-cart-discount-row" class="hidden flex items-center justify-between text-[#0E8A4B]">
          <span class="text-[12.5px] font-bold">Discount <span id="ax-cart-coupon-code" class="text-[10px] uppercase font-extrabold ml-1 px-1.5 py-0.5 rounded bg-[#E6F7EE]"></span></span>
          <span id="ax-cart-discount" class="text-[13px] font-extrabold tabular-nums">−₹0</span>
        </div>
        <div id="ax-cart-shipping-row" class="hidden flex items-center justify-between">
          <span class="text-[12.5px] font-bold text-gray-600">Shipping <span id="ax-cart-shipping-zone" class="text-[10px] font-extrabold ml-1 px-1.5 py-0.5 rounded bg-foreground/5"></span></span>
          <span id="ax-cart-shipping" class="text-[13px] font-extrabold tabular-nums">₹0</span>
        </div>
        <div class="flex items-center justify-between pt-1 border-t" style="border-color: ${esc(theme.primary)}22">
          <span class="text-[14px] font-extrabold">Total</span>
          <span id="ax-cart-total-out" class="text-[18px] font-black tabular-nums" style="color: ${esc(theme.primary)}">₹0</span>
        </div>
      </div>
      <button id="ax-checkout-btn" type="button" onclick="window.AxCart.checkoutStep()"
              class="w-full h-12 rounded-xl text-white font-extrabold text-[14px] shadow-lg transition hover:-translate-y-0.5 disabled:opacity-50"
              style="background: ${esc(theme.primary)}">
        Checkout
      </button>
      <p id="ax-cart-status" class="text-[12px] text-center font-bold mt-2 hidden"></p>
    </div>
  </div>
</div>

<!-- ── Success modal ── -->
<div id="ax-order-success" class="hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm items-center justify-center p-4">
  <div class="bg-white max-w-sm w-full rounded-3xl shadow-2xl p-6 text-center">
    <div class="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-white text-[28px] mb-3" style="background: ${esc(theme.primary)}">✓</div>
    <h2 class="text-[22px] font-black">Order placed!</h2>
    <p class="text-[13px] text-gray-600 mt-1">We'll confirm on WhatsApp shortly.</p>
    <p id="ax-order-number" class="text-[14px] font-extrabold mt-3 px-3 py-2 bg-gray-50 rounded-lg inline-block"></p>
    <button type="button" onclick="window.AxCart.successClose()"
            class="mt-5 w-full h-11 rounded-xl text-white font-extrabold text-[13px]"
            style="background: ${esc(theme.primary)}">Continue shopping</button>
  </div>
</div>

<script>
(function(){
  var STORAGE_KEY = 'ax-cart-${esc(slug)}';
  var fmt = function(n){ return '₹' + (Math.round(n)).toLocaleString('en-IN'); };
  var $ = function(id){ return document.getElementById(id); };
  var state = { items: {}, step: 'cart', coupon: null, shipping: null };  // shipping: {zone_name, rate_inr, eta_days, free} | null

  try { state.items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch(e){}

  function save(){ try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items)); } catch(e){} }
  function lines(){ return Object.values(state.items); }
  function count(){ return lines().reduce(function(s, l){ return s + l.qty; }, 0); }
  function subtotal(){ return lines().reduce(function(s, l){ return s + l.qty * l.price; }, 0); }
  function discountAmt(){ return state.coupon ? Math.min(subtotal(), state.coupon.discount_inr || 0) : 0; }
  function shippingAmt(){ return state.shipping ? Number(state.shipping.rate_inr) || 0 : 0; }
  function total(){ return Math.max(0, subtotal() - discountAmt() + shippingAmt()); }

  function renderBtn(){
    var btn = $('ax-cart-btn'); if (!btn) return;
    var c = count();
    if (c === 0) { btn.classList.add('hidden'); btn.classList.remove('flex'); }
    else { btn.classList.remove('hidden'); btn.classList.add('flex'); }
    $('ax-cart-count').textContent = c;
    $('ax-cart-total').textContent = fmt(total());
  }

  function renderTotals(){
    $('ax-cart-subtotal').textContent = fmt(subtotal());
    var dRow = $('ax-cart-discount-row');
    if (state.coupon && discountAmt() > 0) {
      dRow.classList.remove('hidden'); dRow.classList.add('flex');
      $('ax-cart-discount').textContent = '−' + fmt(discountAmt());
      $('ax-cart-coupon-code').textContent = state.coupon.code;
    } else {
      dRow.classList.add('hidden'); dRow.classList.remove('flex');
    }
    var sRow = $('ax-cart-shipping-row');
    if (state.shipping) {
      sRow.classList.remove('hidden'); sRow.classList.add('flex');
      $('ax-cart-shipping').textContent = state.shipping.free ? 'FREE' : fmt(shippingAmt());
      $('ax-cart-shipping-zone').textContent = state.shipping.zone_name;
    } else {
      sRow.classList.add('hidden'); sRow.classList.remove('flex');
    }
    $('ax-cart-total-out').textContent = fmt(total());
    var couponRow = $('ax-coupon-row');
    if (lines().length > 0) { couponRow.classList.remove('hidden'); couponRow.classList.add('flex'); }
    else { couponRow.classList.add('hidden'); couponRow.classList.remove('flex'); }
  }

  function renderItems(){
    var box = $('ax-cart-items'); if (!box) return;
    var ls = lines();
    if (ls.length === 0) {
      box.innerHTML = '<p class="text-center py-8 text-[13px] text-gray-500">Your cart is empty.</p>';
      $('ax-checkout-btn').setAttribute('disabled', 'true');
      return;
    }
    $('ax-checkout-btn').removeAttribute('disabled');
    box.innerHTML = ls.map(function(l){
      var safe = function(s){ return String(s||'').replace(/[<>"'&]/g, function(c){ return '&#'+c.charCodeAt(0)+';'; }); };
      var photo = l.photo ? '<img src="'+safe(l.photo)+'" class="w-14 h-14 rounded-lg object-cover flex-shrink-0" onerror="this.style.display=\\'none\\'" />' : '<div class="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-[20px] flex-shrink-0">📦</div>';
      return '<div class="flex items-center gap-3 p-2.5 rounded-xl border" style="border-color: ${esc(theme.primary)}22">' +
        photo +
        '<div class="flex-1 min-w-0">' +
          '<p class="text-[13px] font-extrabold truncate">' + safe(l.name) + '</p>' +
          '<p class="text-[12px] font-bold tabular-nums" style="color: ${esc(theme.primary)}">' + fmt(l.price) + ' × ' + l.qty + ' = ' + fmt(l.price * l.qty) + '</p>' +
        '</div>' +
        '<div class="flex items-center gap-1 flex-shrink-0">' +
          '<button type="button" onclick="window.AxCart.dec(\\''+safe(l.id)+'\\')" class="w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 text-[14px] font-bold">−</button>' +
          '<span class="w-6 text-center text-[12px] font-bold tabular-nums">' + l.qty + '</span>' +
          '<button type="button" onclick="window.AxCart.inc(\\''+safe(l.id)+'\\')" class="w-7 h-7 rounded-md text-white text-[14px] font-bold" style="background: ${esc(theme.primary)}">+</button>' +
        '</div>' +
      '</div>';
    }).join('');
    renderTotals();
  }

  function setStep(step){
    state.step = step;
    var title = $('ax-cart-title');
    var form = $('ax-checkout-form');
    var btn = $('ax-checkout-btn');
    if (step === 'checkout') {
      title.textContent = 'Checkout';
      form.classList.remove('hidden');
      btn.textContent = 'Place order — ' + fmt(total());
    } else {
      title.textContent = 'Your cart';
      form.classList.add('hidden');
      btn.textContent = 'Checkout';
    }
  }

  window.AxCart = {
    add: function(id, name, price, photo){
      if (!state.items[id]) state.items[id] = { id: id, name: name, price: price, photo: photo, qty: 0 };
      state.items[id].qty += 1;
      save(); renderBtn(); renderItems();
    },
    inc: function(id){ if (state.items[id]) { state.items[id].qty += 1; save(); renderBtn(); renderItems(); } },
    dec: function(id){
      if (!state.items[id]) return;
      state.items[id].qty -= 1;
      if (state.items[id].qty <= 0) delete state.items[id];
      save(); renderBtn(); renderItems();
    },
    open: function(){
      renderItems();
      setStep('cart');
      var m = $('ax-cart-modal'); m.classList.remove('hidden'); m.classList.add('flex');
      document.body.style.overflow = 'hidden';
    },
    close: function(){
      var m = $('ax-cart-modal'); m.classList.add('hidden'); m.classList.remove('flex');
      document.body.style.overflow = '';
    },
    checkoutStep: function(){
      if (count() === 0) return;
      if (state.step === 'cart') {
        setStep('checkout');
      } else {
        submitOrder();
      }
    },
    successClose: function(){
      var m = $('ax-order-success'); m.classList.add('hidden'); m.classList.remove('flex');
      window.AxCart.close();
    },
    onPincodeInput: function(){
      var inp = $('ax-pincode-input'); if (!inp) return;
      var pin = (inp.value || '').replace(/\\D+/g, '').slice(0, 6);
      inp.value = pin;
      var st = $('ax-shipping-status');
      if (pin.length !== 6) { state.shipping = null; renderTotals(); st.classList.add('hidden'); return; }
      st.textContent = 'Checking delivery…'; st.className = 'text-[11px] font-bold text-gray-500';
      fetch('/biz/${esc(slug)}/shipping/quote', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ pincode: pin, cart_subtotal_inr: subtotal() - discountAmt() })
      }).then(function(r){ return r.json(); }).then(function(j){
        if (j.ok) {
          state.shipping = j;
          st.textContent = (j.free ? '✓ Free delivery' : '✓ Delivery ' + fmt(j.rate_inr)) + (j.eta_days ? ' · ' + j.eta_days + ' days' : '') + ' (' + j.zone_name + ')';
          st.className = 'text-[11px] font-bold text-[#0E8A4B]';
          renderTotals();
          if (state.step === 'checkout') $('ax-checkout-btn').textContent = 'Place order — ' + fmt(total());
        } else {
          state.shipping = null;
          st.textContent = j.reason || 'No delivery';
          st.className = 'text-[11px] font-bold text-rose-600';
          renderTotals();
        }
      }).catch(function(){
        state.shipping = null; renderTotals();
        st.textContent = 'Network error'; st.className = 'text-[11px] font-bold text-rose-600';
      });
    },
    applyCoupon: function(){
      var inp = $('ax-coupon-input'); var st = $('ax-coupon-status'); var btn = $('ax-coupon-apply');
      var code = (inp.value || '').trim();
      if (!code) { st.textContent = 'Enter a code'; st.className = 'text-[11px] font-bold mb-2 text-rose-600'; st.classList.remove('hidden'); return; }
      btn.disabled = true; btn.textContent = '…';
      fetch('/biz/${esc(slug)}/coupon/check', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ code: code, cart_subtotal_inr: subtotal() })
      }).then(function(r){ return r.json(); }).then(function(j){
        btn.disabled = false; btn.textContent = 'Apply';
        if (j.ok) {
          state.coupon = { code: j.code, discount_inr: j.discount_inr };
          st.textContent = 'Applied · saving ' + fmt(j.discount_inr);
          st.className = 'text-[11px] font-bold mb-2 text-[#0E8A4B]'; st.classList.remove('hidden');
          renderTotals(); renderBtn();
          if (state.step === 'checkout') $('ax-checkout-btn').textContent = 'Place order — ' + fmt(total());
        } else {
          state.coupon = null; renderTotals(); renderBtn();
          st.textContent = j.reason || 'Invalid coupon'; st.className = 'text-[11px] font-bold mb-2 text-rose-600'; st.classList.remove('hidden');
        }
      }).catch(function(){
        btn.disabled = false; btn.textContent = 'Apply';
        st.textContent = 'Network error'; st.className = 'text-[11px] font-bold mb-2 text-rose-600'; st.classList.remove('hidden');
      });
    },
  };

  function submitOrder(){
    var form = $('ax-checkout-form');
    var btn = $('ax-checkout-btn');
    var status = $('ax-cart-status');
    var fd = new FormData(form);
    if (!fd.get('customer_name') || !String(fd.get('customer_name')).trim()) {
      status.textContent = 'Please enter your name'; status.className = 'text-[12px] text-center font-bold mt-2 text-rose-600';
      return;
    }
    if (!fd.get('customer_phone') || !String(fd.get('customer_phone')).trim()) {
      status.textContent = 'Please enter your WhatsApp number'; status.className = 'text-[12px] text-center font-bold mt-2 text-rose-600';
      return;
    }
    btn.disabled = true; btn.textContent = 'Placing order…';
    status.className = 'hidden';
    var payload = {
      customer_name: fd.get('customer_name'),
      customer_phone: fd.get('customer_phone'),
      customer_address: fd.get('customer_address'),
      customer_pincode: fd.get('customer_pincode'),
      notes: fd.get('notes'),
      payment_method: fd.get('payment_method'),
      coupon_code: state.coupon ? state.coupon.code : null,
      items: lines().map(function(l){ return { product_id: l.id, quantity: l.qty }; }),
    };
    fetch('/biz/' + form.dataset.slug + '/order', {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload),
    }).then(function(r){ return r.json().then(function(j){ return { ok: r.ok, j: j }; }); })
    .then(function(res){
      if (res.ok) {
        var orderId = res.j.order_id;
        var orderNum = res.j.order_number;
        var paymentMethod = payload.payment_method;

        // For online payments, launch Cashfree drop-in BEFORE clearing cart
        if (paymentMethod === 'online' && window.Cashfree) {
          btn.textContent = 'Opening payment…';
          fetch('/biz/${esc(slug)}/pay/' + orderId + '/start', { method: 'POST' })
            .then(function(r){ return r.json().then(function(j){ return { ok: r.ok, j: j }; }); })
            .then(function(payRes){
              if (!payRes.ok || !payRes.j.payment_session_id) {
                btn.disabled = false; btn.textContent = 'Place order — ' + fmt(total());
                status.textContent = (payRes.j && payRes.j.error) || 'Could not start payment.';
                status.className = 'text-[12px] text-center font-bold mt-2 text-rose-600';
                return;
              }
              try {
                var cf = window.Cashfree({ mode: payRes.j.mode === 'production' ? 'production' : 'sandbox' });
                cf.checkout({ paymentSessionId: payRes.j.payment_session_id, redirectTarget: '_self' });
              } catch (e) {
                btn.disabled = false; btn.textContent = 'Place order — ' + fmt(total());
                status.textContent = 'Payment failed to open.';
                status.className = 'text-[12px] text-center font-bold mt-2 text-rose-600';
              }
              // Cart will redirect to /biz/pay/return after payment
            });
          return;
        }

        // COD / UPI-manual flow — show success immediately
        state.items = {}; state.coupon = null; state.shipping = null; save(); renderBtn(); renderTotals();
        $('ax-order-number').textContent = 'Order #' + orderNum;
        var s = $('ax-order-success'); s.classList.remove('hidden'); s.classList.add('flex');
        btn.disabled = false; btn.textContent = 'Checkout';
        form.reset();
        setStep('cart');
      } else {
        btn.disabled = false; btn.textContent = 'Place order — ' + fmt(total());
        status.textContent = (res.j && res.j.error) || 'Could not place order.'; status.className = 'text-[12px] text-center font-bold mt-2 text-rose-600';
      }
    }).catch(function(){
      btn.disabled = false; btn.textContent = 'Place order — ' + fmt(total());
      status.textContent = 'Network error.'; status.className = 'text-[12px] text-center font-bold mt-2 text-rose-600';
    });
  }

  renderBtn();
})();
</script>` : ""}

<!-- ── Hours + Address (if set) ── -->
${business.hours || business.address ? `
<section class="py-10 px-4 bg-gray-50/50">
  <div class="max-w-3xl mx-auto grid sm:grid-cols-2 gap-4">
    ${business.hours ? `
    <div class="p-5 rounded-2xl bg-white border-2" style="border-color: ${esc(theme.primary)}22">
      <p class="text-[11px] font-extrabold uppercase tracking-wider mb-2" style="color: ${esc(theme.primary)}">🕐 Hours</p>
      <p class="text-[13px] font-medium whitespace-pre-line leading-relaxed">${esc(business.hours)}</p>
    </div>` : ""}
    ${business.address ? `
    <div class="p-5 rounded-2xl bg-white border-2" style="border-color: ${esc(theme.primary)}22">
      <p class="text-[11px] font-extrabold uppercase tracking-wider mb-2" style="color: ${esc(theme.primary)}">📍 Visit us</p>
      <p class="text-[13px] font-medium whitespace-pre-line leading-relaxed">${esc(business.address)}</p>
    </div>` : ""}
  </div>
</section>` : ""}

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
    </div>
  </div>
</section>

<!-- ── Lead form ── -->
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

  // Pull owner profile + meta config + active products in parallel for auto-fill
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
      facebook: pf?.facebookUrl || null,
      address: copy.address || null,
      hours: copy.hours || null,
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

  // Bump view counter + log analytics event (fire-and-forget).
  void db.update(site).set({ viewCount: sql`${site.viewCount} + 1` }).where(eq(site.id, row.id)).catch(() => {});

  const ipForView = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const dayBucket = new Date().toISOString().slice(0, 10);   // crude 24h-rotating salt
  const viewSession = createHash("sha256").update(`${ipForView}|${dayBucket}|${row.id}`).digest("hex").slice(0, 32);
  logEvent({
    siteId: row.id,
    ownerId: row.userId,
    eventType: "view",
    path: `/biz/${slug}`,
    referrerHost: refHostBucket(c.req.header("referer")),
    sessionHash: viewSession,
    userAgent: c.req.header("user-agent") || null,
  });

  // All four templates currently share the base renderer with per-template
  // vocabulary swaps (see TEMPLATE_VOCAB). Layouts diverge in Phase 8 polish.
  const html = renderKirana(input);

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
  const allowed = new Set(["kirana", "salon", "restaurant", "services"]);
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
      instagram: "https://instagram.com/demo",
      facebook: null,
      address: demo.address,
      hours: demo.hours,
    },
    theme: demo.theme,
    seo: { title: `${demo.businessName} — demo template`, description: demo.tagline, ogImage: null },
    slug: `demo-${template}`,
    products: demo.products,
    cashfree: { enabled: false, mode: "sandbox" },
    advanced: { faviconUrl: null, ga4Id: null, metaPixelId: null, customHeadHtml: null, allowIndexing: false },
  };

  c.header("Cache-Control", "public, max-age=300");
  // Wrap rendered HTML with a "demo banner" injected at the top so visitors
  // know this is a preview.
  const html = renderKirana(input).replace(
    "<body class=\"text-gray-900 bg-white\">",
    `<body class="text-gray-900 bg-white">
<div style="position:sticky;top:0;z-index:100;background:linear-gradient(90deg,#0E8A4B,#FFD23F);color:white;padding:8px 12px;text-align:center;font-weight:800;font-size:12px;letter-spacing:0.05em;text-transform:uppercase;">
  Website preview · <a href="/app/site/store" style="color:#fff;text-decoration:underline;">← back to Website Store</a>
</div>`,
  );
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
};

export default app;
