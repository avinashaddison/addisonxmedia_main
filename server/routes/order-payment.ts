/**
 * Per-order payment via Cashfree.
 *
 * Public:
 *   POST /biz/:slug/pay/:orderId/start
 *     Creates a Cashfree order keyed off our internal order id, returns the
 *     payment_session_id for the Cashfree SDK to open the drop-in UI.
 *
 *   GET  /biz/pay/return?order_id=<our-id>
 *     Cashfree redirects here after payment. We verify status via API
 *     (don't trust the redirect alone), update payment_status, and HTML-
 *     redirect the user to a thank-you page back on the public site.
 *
 *   POST /api/cashfree/order-webhook
 *     Cashfree → us. Verified via HMAC. Sets payment_status = paid on success.
 */

import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client";
import { site, orderTbl } from "../db/schema";
import { createOrder, getOrderPayments, verifyWebhookSignature, cashfreeIsConfigured } from "../integrations/cashfree";

const app = new Hono();

/** Construct a customer-facing base URL — same logic Cashfree return URLs use. */
const externalBase = (c: { req: { url: string; header: (k: string) => string | undefined } }): string => {
  // Render terminates TLS — use x-forwarded-proto so we don't generate http://
  // return URLs that Cashfree rejects in production.
  const proto = c.req.header("x-forwarded-proto")?.split(",")[0]?.trim() || new URL(c.req.url).protocol.replace(":", "");
  const host = c.req.header("x-forwarded-host") || c.req.header("host") || new URL(c.req.url).host;
  return `${proto}://${host}`;
};

/** Create a Cashfree order for one of our internal orders. */
app.post("/biz/:slug/pay/:orderId/start", async (c) => {
  if (!cashfreeIsConfigured()) {
    return c.json({ error: "Online payments not configured. Use Cash on Delivery." }, 503);
  }
  const slug = (c.req.param("slug") || "").toLowerCase().trim();
  const orderId = c.req.param("orderId");

  const [siteRow] = await db.select().from(site).where(eq(site.slug, slug)).limit(1);
  if (!siteRow) return c.json({ error: "Site not found" }, 404);

  const [order] = await db.select().from(orderTbl)
    .where(and(eq(orderTbl.id, orderId), eq(orderTbl.ownerId, siteRow.userId)))
    .limit(1);
  if (!order) return c.json({ error: "Order not found" }, 404);
  if (order.paymentStatus === "paid") return c.json({ error: "Order already paid" }, 400);
  if (order.status === "cancelled") return c.json({ error: "Order is cancelled" }, 400);

  const total = Number(order.totalInr);
  if (total < 1) return c.json({ error: "Order total too low to charge online" }, 400);

  // Cashfree requires phone — use whatever the customer entered at checkout
  if (!order.customerPhone) return c.json({ error: "Phone required for online payment" }, 400);

  const base = externalBase(c);
  // Cashfree calls the return_url with {order_id} substituted. We use a
  // single endpoint that introspects payment status server-side.
  const returnUrl = `${base}/biz/pay/return?order_id={order_id}`;

  // order_id must be unique per attempt; if user retries, append .vN
  const cfOrderId = `ax_${order.id}`;

  try {
    const cfo = await createOrder({
      order_id: cfOrderId,
      order_amount: total,
      order_currency: "INR",
      customer_details: {
        customer_id: order.customerPhone.replace(/\D+/g, "") || `cust_${order.id.slice(0, 8)}`,
        customer_name: order.customerName,
        customer_phone: order.customerPhone,
        customer_email: order.customerEmail ?? undefined,
      },
      order_meta: {
        return_url: returnUrl,
        payment_methods: "cc,dc,upi,nb,app,paylater",
      },
      order_note: `Order #${order.orderNumber} · ${siteRow.slug}`,
      order_tags: {
        ax_order_id: order.id,
        ax_owner: order.ownerId,
        ax_site: siteRow.slug,
      },
    });

    return c.json({
      ok: true,
      payment_session_id: cfo.payment_session_id,
      cf_order_id: cfo.cf_order_id,
      mode: process.env.CASHFREE_MODE || "sandbox",
    });
  } catch (e) {
    console.error("[order-payment/start] cashfree createOrder failed", e);
    return c.json({ error: "Could not start payment — try again or use Cash on Delivery" }, 502);
  }
});

/** GET /biz/pay/return?order_id=<ax_orderId> — Cashfree post-payment redirect.
 *  Verifies via API + flips payment_status. HTML redirects to a thank-you page. */
app.get("/biz/pay/return", async (c) => {
  const cfOrderId = c.req.query("order_id") || "";
  if (!cfOrderId.startsWith("ax_")) return c.redirect("/", 302);
  const axOrderId = cfOrderId.slice(3);

  const [order] = await db.select().from(orderTbl).where(eq(orderTbl.id, axOrderId)).limit(1);
  if (!order) return c.redirect("/", 302);

  // Find the slug to redirect back to
  const [siteRow] = order.siteId
    ? await db.select().from(site).where(eq(site.id, order.siteId)).limit(1)
    : [undefined];

  // Don't trust the redirect — fetch payments and check status
  try {
    const payments = await getOrderPayments(cfOrderId);
    const success = payments.find((p) => p.payment_status === "SUCCESS");
    if (success && order.paymentStatus !== "paid") {
      await db.update(orderTbl).set({
        paymentStatus: "paid",
        paymentMethod: success.payment_group || "cashfree",
        updatedAt: new Date(),
      }).where(eq(orderTbl.id, axOrderId));
    }
  } catch (e) {
    console.error("[order-payment/return] verification fetch failed", e);
  }

  const back = siteRow ? `/biz/${siteRow.slug}` : "/";
  // Tiny HTML page that auto-redirects with success/failure indicator
  return c.html(`<!doctype html><html><head><meta charset="utf-8"><title>Payment complete</title>
<meta http-equiv="refresh" content="2; url=${back}?paid=1&order=${order.orderNumber}">
<script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-emerald-50 min-h-screen flex items-center justify-center p-6 font-sans">
<div class="text-center max-w-sm bg-white p-8 rounded-3xl shadow-xl">
<div class="w-16 h-16 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center text-[28px] mb-3">✓</div>
<h1 class="text-[22px] font-black">Payment received</h1>
<p class="text-gray-600 mt-1">Order #${order.orderNumber} confirmed.</p>
<p class="text-gray-400 text-[12px] mt-3">Returning to shop…</p>
<a href="${back}" class="mt-4 inline-block px-5 py-2 rounded-lg bg-emerald-600 text-white font-bold text-[13px]">Continue</a>
</div></body></html>`);
});

/** POST /api/cashfree/order-webhook — Cashfree → us. */
app.post("/api/cashfree/order-webhook", async (c) => {
  const timestamp = c.req.header("x-webhook-timestamp") || "";
  const signature = c.req.header("x-webhook-signature") || "";
  const raw = await c.req.text();
  const secret = process.env.CASHFREE_SECRET_KEY ?? "";

  if (!secret || !timestamp || !signature) return c.json({ ok: false }, 401);
  const ok = verifyWebhookSignature({ rawBody: raw, timestamp, signatureHeader: signature, secret });
  if (!ok) return c.json({ ok: false, error: "bad signature" }, 401);

  let payload: { data?: { order?: { order_id?: string }; payment?: { payment_status?: string; payment_group?: string } } } = {};
  try { payload = JSON.parse(raw); } catch { return c.json({ ok: true }); }

  const cfOrderId = payload.data?.order?.order_id;
  const status = payload.data?.payment?.payment_status;
  if (!cfOrderId || !cfOrderId.startsWith("ax_")) return c.json({ ok: true });

  const axOrderId = cfOrderId.slice(3);
  if (status === "SUCCESS") {
    await db.update(orderTbl).set({
      paymentStatus: "paid",
      paymentMethod: payload.data?.payment?.payment_group || "cashfree",
      updatedAt: new Date(),
    }).where(eq(orderTbl.id, axOrderId));
  }
  return c.json({ ok: true });
});

export default app;
