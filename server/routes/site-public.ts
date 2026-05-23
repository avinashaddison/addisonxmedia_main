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
import { site, siteLead, contact, profile, metaConfig, product, orderTbl, orderItem, user } from "../db/schema";
import { nextOrderNumber } from "./order";

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

/** The Kirana / Local Shop template — single page, mobile-first, fast. */
const renderKirana = (input: RenderInput): string => {
  const { business, theme, seo, slug, products } = input;
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

<!-- ── Products (if any) ── -->
${products.length > 0 ? `
<section id="products" class="py-12 sm:py-16 px-4">
  <div class="max-w-5xl mx-auto">
    <div class="text-center mb-8">
      <p class="text-[11px] font-extrabold uppercase tracking-[0.2em] mb-2" style="color: ${esc(theme.primary)}">Our offerings</p>
      <h3 class="text-[26px] sm:text-[32px] font-black leading-tight">Browse products</h3>
      <p class="text-[13px] text-gray-600 mt-2">Add to cart and checkout in 30 seconds — pay via UPI or cash on delivery.</p>
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
      <textarea name="notes" rows="2" maxlength="500" placeholder="Any special instructions?"
                class="w-full px-3 py-2.5 rounded-lg border-2 focus:outline-none text-[13px] resize-none" style="border-color: ${esc(theme.primary)}33"></textarea>
      <div>
        <p class="text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-1.5">Payment</p>
        <div class="grid grid-cols-2 gap-2">
          ${business.upiVpa ? `
          <label class="flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition hover:bg-gray-50 has-[:checked]:border-2" style="border-color: ${esc(theme.primary)}33">
            <input type="radio" name="payment_method" value="upi" checked class="w-4 h-4 accent-[${esc(theme.primary)}]" />
            <span class="text-[12px] font-extrabold">💳 UPI</span>
          </label>` : ""}
          <label class="flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition hover:bg-gray-50" style="border-color: ${esc(theme.primary)}33">
            <input type="radio" name="payment_method" value="cod" ${business.upiVpa ? "" : "checked"} class="w-4 h-4" />
            <span class="text-[12px] font-extrabold">💵 Cash on delivery</span>
          </label>
        </div>
      </div>
    </form>

    <!-- Footer: subtotal + CTA -->
    <div id="ax-cart-footer" class="sticky bottom-0 bg-white border-t-2 p-4" style="border-color: ${esc(theme.primary)}33">
      <div id="ax-cart-summary" class="flex items-center justify-between mb-3">
        <span class="text-[13px] font-bold text-gray-600">Subtotal</span>
        <span id="ax-cart-subtotal" class="text-[18px] font-black tabular-nums" style="color: ${esc(theme.primary)}">₹0</span>
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
  var state = { items: {}, step: 'cart' };  // step: 'cart' | 'checkout'

  try { state.items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch(e){}

  function save(){ try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items)); } catch(e){} }
  function lines(){ return Object.values(state.items); }
  function count(){ return lines().reduce(function(s, l){ return s + l.qty; }, 0); }
  function subtotal(){ return lines().reduce(function(s, l){ return s + l.qty * l.price; }, 0); }

  function renderBtn(){
    var btn = $('ax-cart-btn'); if (!btn) return;
    var c = count();
    if (c === 0) { btn.classList.add('hidden'); btn.classList.remove('flex'); }
    else { btn.classList.remove('hidden'); btn.classList.add('flex'); }
    $('ax-cart-count').textContent = c;
    $('ax-cart-total').textContent = fmt(subtotal());
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
    $('ax-cart-subtotal').textContent = fmt(subtotal());
  }

  function setStep(step){
    state.step = step;
    var modal = $('ax-cart-modal');
    var title = $('ax-cart-title');
    var form = $('ax-checkout-form');
    var btn = $('ax-checkout-btn');
    if (step === 'checkout') {
      title.textContent = 'Checkout';
      form.classList.remove('hidden');
      btn.textContent = 'Place order — ' + fmt(subtotal());
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
      notes: fd.get('notes'),
      payment_method: fd.get('payment_method'),
      items: lines().map(function(l){ return { product_id: l.id, quantity: l.qty }; }),
    };
    fetch('/biz/' + form.dataset.slug + '/order', {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload),
    }).then(function(r){ return r.json().then(function(j){ return { ok: r.ok, j: j }; }); })
    .then(function(res){
      if (res.ok) {
        state.items = {}; save(); renderBtn();
        $('ax-order-number').textContent = 'Order #' + res.j.order_number;
        var s = $('ax-order-success'); s.classList.remove('hidden'); s.classList.add('flex');
        btn.disabled = false; btn.textContent = 'Checkout';
        form.reset();
        setStep('cart');
      } else {
        btn.disabled = false; btn.textContent = 'Place order — ' + fmt(subtotal());
        status.textContent = (res.j && res.j.error) || 'Could not place order.'; status.className = 'text-[12px] text-center font-bold mt-2 text-rose-600';
      }
    }).catch(function(){
      btn.disabled = false; btn.textContent = 'Place order — ' + fmt(subtotal());
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
    notes?: string;
    payment_method?: string;     // 'upi' | 'cod'
    items?: Array<{ product_id: string; quantity: number }>;
  }>().catch(() => ({} as { customer_name?: string }));

  const name = (body.customer_name || "").trim().slice(0, 100);
  const phone = (body.customer_phone || "").trim().slice(0, 30) || null;
  const email = (body.customer_email || "").trim().slice(0, 200) || null;
  const address = (body.customer_address || "").trim().slice(0, 500) || null;
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
        subtotalInr: String(subtotal),
        shippingInr: "0",
        discountInr: "0",
        totalInr: String(subtotal),
        status: "new",
        paymentMethod,
        paymentStatus: "pending",
        source: "website",
        notes,
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

  return c.json({
    ok: true,
    order_id: order.id,
    order_number: order.orderNumber,
    total_inr: Number(order.totalInr),
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

  return c.json({ ok: true, lead_id: lead.id });
});

export default app;
