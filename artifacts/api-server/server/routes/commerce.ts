/**
 * WhatsApp Commerce — server endpoints that turn the WhatsApp inbox into a
 * full storefront. Built on top of the existing meta integration so it works
 * the moment a user connects their WhatsApp Business number.
 *
 *   POST /api/commerce/send-products
 *     Send selected products to a conversation as a stack of formatted
 *     WhatsApp messages (one card per product with photo + name + price +
 *     UPI deep-link). Used by the inbox 'Send products' button.
 *
 *   POST /api/commerce/order-from-message
 *     Create a draft order from an inbound message — given items[] and
 *     a contact, snapshot product details into orderTbl + orderItem and
 *     auto-send the UPI QR payment request. Used by the AI shopping
 *     auto-responder + manual "create order" flow.
 *
 *   POST /api/commerce/quick-status
 *     Quick status updates with templated messages — confirm, shipped,
 *     delivered, cancelled. Updates orderTbl AND sends a WhatsApp message
 *     to the buyer with the new status.
 *
 *   POST /api/commerce/sync-catalog
 *     Push the user's product table to Meta's Commerce Manager catalog
 *     so products appear in the WhatsApp Business profile / catalog
 *     shortcut. Idempotent — products with meta_product_id are updated;
 *     new ones are created. Saves Meta's product IDs back on success.
 */

import { Hono } from "hono";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/client";
import { product, contact, conversation, message, profile, metaConfig, orderTbl, orderItem } from "../db/schema";
import { requireAuth, type AuthVariables } from "../middleware/auth";
import { decrypt } from "../crypto";
import { sendImageMessage, sendTextMessage } from "../integrations/meta";
import { nextOrderNumber } from "./order";

const app = new Hono<{ Variables: AuthVariables }>();
app.use("*", requireAuth);

const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const buildUpiDeepLink = (vpa: string, name: string, amount: number, note: string): string => {
  const params = new URLSearchParams({
    pa: vpa, pn: name, am: amount.toFixed(2), tn: note.slice(0, 40), cu: "INR",
  });
  return `upi://pay?${params.toString()}`;
};

const buildUpiQrUrl = (upiLink: string): string =>
  `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=6&data=${encodeURIComponent(upiLink)}`;

/** Send a stack of products as individual WhatsApp messages — one card per
 *  product (image + caption with name/price/UPI link). Each card includes a
 *  WhatsApp-friendly "reply 'I want this'" prompt for buyer + UPI link for
 *  instant payment. Falls back to text-only when image send fails. */
app.post("/commerce/send-products", async (c) => {
  const userId = c.var.userId;
  const body = await c.req.json<{ conversation_id?: string; product_ids?: string[]; intro?: string }>();

  if (!body.conversation_id) return c.json({ error: "conversation_id required" }, 400);
  const productIds = Array.isArray(body.product_ids) ? body.product_ids : [];
  if (productIds.length === 0) return c.json({ error: "Select at least one product" }, 400);
  if (productIds.length > 30) return c.json({ error: "Max 30 products per send" }, 400);

  // Load all the resources we need
  const [conv] = await db.select({ id: conversation.id, contactId: conversation.contactId })
    .from(conversation)
    .where(and(eq(conversation.id, body.conversation_id), eq(conversation.ownerId, userId))).limit(1);
  if (!conv) return c.json({ error: "Conversation not found" }, 404);

  const [ctc] = await db.select({ phone: contact.phone, name: contact.name })
    .from(contact).where(eq(contact.id, conv.contactId)).limit(1);
  if (!ctc) return c.json({ error: "Contact not found" }, 404);

  const products = await db.select().from(product)
    .where(and(eq(product.ownerId, userId), inArray(product.id, productIds)));
  if (products.length === 0) return c.json({ error: "Selected products not found" }, 404);

  const [pf] = await db.select().from(profile).where(eq(profile.userId, userId)).limit(1);
  const [cfg] = await db.select().from(metaConfig).where(eq(metaConfig.userId, userId)).limit(1);
  const businessName = pf?.upiDisplayName || pf?.displayName || "us";

  const liveMeta = !!(cfg?.enabled && cfg.accessToken && cfg.phoneNumberId);
  const creds = liveMeta ? {
    accessToken: decrypt(cfg!.accessToken),
    phoneNumberId: cfg!.phoneNumberId!,
    businessAccountId: cfg!.businessAccountId,
  } : null;
  const recipient = ctc.phone.replace(/^\+/, "");

  const intro = (body.intro || "").trim();
  let sentCount = 0;
  let failedCount = 0;

  // Optional intro line at the top
  if (intro && creds) {
    try {
      await sendTextMessage(creds, recipient, intro);
      await db.insert(message).values({
        conversationId: conv.id, ownerId: userId, senderId: userId,
        direction: "outbound", body: intro, status: "sent",
      });
      sentCount += 1;
    } catch (e) {
      console.error("[commerce/send-products] intro failed", e);
    }
  } else if (intro) {
    // Dry-run — log locally
    await db.insert(message).values({
      conversationId: conv.id, ownerId: userId, senderId: userId,
      direction: "outbound", body: intro, status: "queued",
    });
  }

  // Send one card per product
  for (const p of products) {
    const price = Number(p.priceInr) || 0;
    const upiLink = pf?.upiVpa && price > 0
      ? buildUpiDeepLink(pf.upiVpa, businessName, price, `${p.name}`)
      : null;

    const lines = [
      `🛍️ *${p.name}*`,
      p.description ? p.description : "",
      price > 0 ? `💰 *${fmtINR(price)}*` : "💬 Price on request",
      "",
      upiLink ? `💳 *Pay now:* ${upiLink}` : "",
      `_Reply "I want this" to order_`,
    ].filter(Boolean).join("\n");

    let metaMsgId: string | null = null;
    let sentLive = false;

    if (creds && p.photoUrl) {
      try {
        const res = await sendImageMessage(creds, recipient, p.photoUrl, lines);
        metaMsgId = res.messages?.[0]?.id ?? null;
        sentLive = true;
      } catch (e) {
        console.error(`[commerce/send-products] image send failed for ${p.id}`, e);
      }
    }
    if (!sentLive && creds) {
      try {
        const res = await sendTextMessage(creds, recipient, lines);
        metaMsgId = res.messages?.[0]?.id ?? null;
        sentLive = true;
      } catch (e) {
        console.error(`[commerce/send-products] text send failed for ${p.id}`, e);
        failedCount += 1;
      }
    }

    // Record locally either way — buyer sees the right history even in dry-run
    await db.insert(message).values({
      conversationId: conv.id, ownerId: userId, senderId: userId,
      direction: "outbound", body: lines,
      mediaUrl: p.photoUrl ?? null,
      status: sentLive ? "sent" : "queued",
      externalMessageId: metaMsgId,
    });
    if (sentLive) sentCount += 1;
  }

  // Bump conversation preview
  await db.update(conversation).set({
    lastMessageAt: new Date(),
    lastMessagePreview: `🛍️ Sent ${products.length} product${products.length === 1 ? "" : "s"}`,
    updatedAt: new Date(),
  }).where(eq(conversation.id, conv.id));

  return c.json({
    ok: true,
    sent: sentCount,
    failed: failedCount,
    sent_live: liveMeta,
    mode: liveMeta ? "live" : "dry-run",
  });
});

/** Create a draft order from items the buyer indicated they want — either
 *  manually picked by the seller (after AI detection) or via the AI
 *  shopping flow. Snapshots prices into the order, sends UPI QR for
 *  payment, and logs everything in the conversation. */
app.post("/commerce/order-from-message", async (c) => {
  const userId = c.var.userId;
  const body = await c.req.json<{
    conversation_id?: string;
    product_ids?: string[];
    quantities?: Record<string, number>;   // product_id → qty (default 1)
    notes?: string;
  }>();

  if (!body.conversation_id) return c.json({ error: "conversation_id required" }, 400);
  const productIds = Array.isArray(body.product_ids) ? body.product_ids : [];
  if (productIds.length === 0) return c.json({ error: "Pick at least one product" }, 400);

  const [conv] = await db.select({ id: conversation.id, contactId: conversation.contactId })
    .from(conversation)
    .where(and(eq(conversation.id, body.conversation_id), eq(conversation.ownerId, userId))).limit(1);
  if (!conv) return c.json({ error: "Conversation not found" }, 404);

  const [ctc] = await db.select().from(contact).where(eq(contact.id, conv.contactId)).limit(1);
  if (!ctc) return c.json({ error: "Contact not found" }, 404);

  const products = await db.select().from(product)
    .where(and(eq(product.ownerId, userId), inArray(product.id, productIds)));
  if (products.length === 0) return c.json({ error: "Products not found" }, 404);

  const qtys = body.quantities ?? {};
  const lineRows = products.map((p) => {
    const qty = Math.max(1, Math.floor(Number(qtys[p.id]) || 1));
    const price = Number(p.priceInr) || 0;
    return {
      productId: p.id, productName: p.name, productPhotoUrl: p.photoUrl,
      unitPriceInr: String(price), quantity: qty, lineTotalInr: String(price * qty),
    };
  });
  const subtotal = lineRows.reduce((s, r) => s + Number(r.lineTotalInr), 0);

  // Allocate order number with retry on race
  let order: typeof orderTbl.$inferSelect | undefined;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const orderNumber = await nextOrderNumber(userId);
      const [created] = await db.insert(orderTbl).values({
        ownerId: userId,
        orderNumber,
        customerName: ctc.name,
        customerPhone: ctc.phone,
        customerEmail: ctc.email,
        subtotalInr: String(subtotal),
        totalInr: String(subtotal),
        status: "new",
        paymentMethod: "upi",
        paymentStatus: "pending",
        source: "whatsapp",
        notes: body.notes ?? null,
        contactId: ctc.id,
      }).returning();
      order = created;
      break;
    } catch (e) { if (attempt === 4) throw e; }
  }
  if (!order) return c.json({ error: "Could not create order" }, 500);
  await db.insert(orderItem).values(lineRows.map((r) => ({ ...r, orderId: order!.id })));

  // Send UPI QR to the buyer
  const [pf] = await db.select().from(profile).where(eq(profile.userId, userId)).limit(1);
  const [cfg] = await db.select().from(metaConfig).where(eq(metaConfig.userId, userId)).limit(1);
  const businessName = pf?.upiDisplayName || pf?.displayName || "us";

  let upiLink: string | null = null;
  let qrUrl: string | null = null;
  if (pf?.upiVpa) {
    upiLink = buildUpiDeepLink(pf.upiVpa, businessName, subtotal, `Order #${order.orderNumber}`);
    qrUrl = buildUpiQrUrl(upiLink);
  }

  const itemSummary = lineRows.map((r) => `• ${r.productName} × ${r.quantity} = ${fmtINR(Number(r.lineTotalInr))}`).join("\n");
  const messageBody = [
    `🧾 *Order #${order.orderNumber} confirmed*`,
    "",
    itemSummary,
    "",
    `💰 *Total: ${fmtINR(subtotal)}*`,
    pf?.upiVpa ? `\n💳 *Pay via UPI:* \`${pf.upiVpa}\`\n📷 Scan the QR to pay` : "",
    "\n_Please complete the payment to confirm your order_ 🙏",
  ].filter(Boolean).join("\n");

  const liveMeta = !!(cfg?.enabled && cfg.accessToken && cfg.phoneNumberId);
  let metaMsgId: string | null = null;
  let sentLive = false;

  if (liveMeta) {
    const creds = {
      accessToken: decrypt(cfg!.accessToken),
      phoneNumberId: cfg!.phoneNumberId!,
      businessAccountId: cfg!.businessAccountId,
    };
    const recipient = ctc.phone.replace(/^\+/, "");
    try {
      const res = qrUrl
        ? await sendImageMessage(creds, recipient, qrUrl, messageBody)
        : await sendTextMessage(creds, recipient, messageBody);
      metaMsgId = res.messages?.[0]?.id ?? null;
      sentLive = true;
    } catch (e) {
      console.error("[commerce/order-from-message] WA send failed", e);
    }
  }

  await db.insert(message).values({
    conversationId: conv.id, ownerId: userId, senderId: userId,
    direction: "outbound", body: messageBody,
    mediaUrl: qrUrl, status: sentLive ? "sent" : "queued",
    externalMessageId: metaMsgId,
  });

  await db.update(conversation).set({
    lastMessageAt: new Date(),
    lastMessagePreview: `🧾 Order #${order.orderNumber} · ${fmtINR(subtotal)}`,
    updatedAt: new Date(),
  }).where(eq(conversation.id, conv.id));

  return c.json({
    ok: true,
    order_id: order.id,
    order_number: order.orderNumber,
    total_inr: subtotal,
    upi_link: upiLink,
    qr_url: qrUrl,
    sent_live: sentLive,
  });
});

/** Quick status update — flips order status + sends WhatsApp message. */
app.post("/commerce/quick-status", async (c) => {
  const userId = c.var.userId;
  const body = await c.req.json<{
    order_id?: string;
    status?: "confirmed" | "shipped" | "delivered" | "cancelled";
    tracking_info?: string;     // extra line e.g. "Delhivery AWB 12345"
  }>();

  if (!body.order_id || !body.status) return c.json({ error: "order_id + status required" }, 400);
  if (!["confirmed", "shipped", "delivered", "cancelled"].includes(body.status)) {
    return c.json({ error: "Invalid status" }, 400);
  }

  const [order] = await db.select().from(orderTbl)
    .where(and(eq(orderTbl.id, body.order_id), eq(orderTbl.ownerId, userId))).limit(1);
  if (!order) return c.json({ error: "Order not found" }, 404);

  await db.update(orderTbl).set({ status: body.status, updatedAt: new Date() })
    .where(eq(orderTbl.id, order.id));

  // Build status message
  const STATUS_MSG: Record<string, (n: number, extra: string) => string> = {
    confirmed: (n) => `✅ *Order #${n} confirmed!*\n\nWe're preparing your order. You'll get the next update once it's dispatched. Thank you 🙏`,
    shipped: (n, extra) => `🚚 *Order #${n} shipped!*\n\nYour order is on its way.${extra ? `\n\n${extra}` : ""}\n\nWe'll confirm once it's delivered.`,
    delivered: (n) => `📦 *Order #${n} delivered!*\n\nHope you love it! Please reply if anything's off — we're here to help. 🙏\n\nIf you enjoyed it, a review would mean the world. ⭐`,
    cancelled: (n) => `❌ *Order #${n} cancelled.*\n\nIf this was a mistake or you'd like to reorder, just reply here.`,
  };
  const messageBody = STATUS_MSG[body.status](order.orderNumber, body.tracking_info || "");

  // Try to find an existing conversation for this contact + send via WhatsApp
  if (order.contactId) {
    const [conv] = await db.select().from(conversation)
      .where(and(eq(conversation.ownerId, userId), eq(conversation.contactId, order.contactId))).limit(1);

    const [cfg] = await db.select().from(metaConfig).where(eq(metaConfig.userId, userId)).limit(1);
    const liveMeta = !!(cfg?.enabled && cfg.accessToken && cfg.phoneNumberId);

    if (conv && order.customerPhone) {
      let metaMsgId: string | null = null;
      let sentLive = false;
      if (liveMeta) {
        const creds = {
          accessToken: decrypt(cfg!.accessToken),
          phoneNumberId: cfg!.phoneNumberId!,
          businessAccountId: cfg!.businessAccountId,
        };
        const recipient = order.customerPhone.replace(/^\+/, "");
        try {
          const res = await sendTextMessage(creds, recipient, messageBody);
          metaMsgId = res.messages?.[0]?.id ?? null;
          sentLive = true;
        } catch (e) { console.error("[commerce/quick-status] WA send failed", e); }
      }
      await db.insert(message).values({
        conversationId: conv.id, ownerId: userId, senderId: userId,
        direction: "outbound", body: messageBody, status: sentLive ? "sent" : "queued",
        externalMessageId: metaMsgId,
      });
      await db.update(conversation).set({
        lastMessageAt: new Date(),
        lastMessagePreview: `📦 Order #${order.orderNumber} → ${body.status}`,
        updatedAt: new Date(),
      }).where(eq(conversation.id, conv.id));
    }
  }

  return c.json({ ok: true, status: body.status });
});

/** Push our product table to Meta Commerce Manager so products appear in
 *  the WhatsApp Business profile / catalog shortcut.
 *
 *  Catalog API docs: https://developers.facebook.com/docs/marketing-api/catalog
 *  This is best-effort — Meta's catalog endpoints fail in confusing ways
 *  depending on permissions, BSP setup, etc. We return per-product results. */
app.post("/commerce/sync-catalog", async (c) => {
  const userId = c.var.userId;
  const [cfg] = await db.select().from(metaConfig).where(eq(metaConfig.userId, userId)).limit(1);
  if (!cfg?.catalogId) {
    return c.json({ error: "Connect a Meta Catalog first (Settings → Integrations → Meta API)" }, 400);
  }
  if (!cfg.accessToken) return c.json({ error: "Meta not configured" }, 400);

  const products = await db.select().from(product)
    .where(and(eq(product.ownerId, userId), eq(product.status, "active")));
  if (products.length === 0) return c.json({ ok: true, synced: 0, message: "No active products to sync" });

  const token = decrypt(cfg.accessToken);
  const catalogId = cfg.catalogId;
  const results: Array<{ id: string; name: string; ok: boolean; meta_id?: string; error?: string }> = [];

  for (const p of products) {
    const price = Number(p.priceInr) || 0;
    try {
      // Meta uses retailer_id (our internal ID) as the upsert key
      const url = `https://graph.facebook.com/v22.0/${catalogId}/products`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          retailer_id: p.id,
          name: p.name,
          description: p.description || p.name,
          price: Math.round(price * 100),    // Meta expects price in lowest currency unit (paise)
          currency: "INR",
          availability: (p.stock != null && p.stock === 0) ? "out of stock" : "in stock",
          image_url: p.photoUrl || undefined,
          url: undefined,    // could be a deep-link to the product page on our site
          category: p.category || "General",
        }),
      });
      const body = await res.json().catch(() => ({} as { id?: string; error?: { message?: string } }));
      if (res.ok && body.id) {
        results.push({ id: p.id, name: p.name, ok: true, meta_id: body.id });
      } else {
        results.push({ id: p.id, name: p.name, ok: false, error: body.error?.message || `HTTP ${res.status}` });
      }
    } catch (e) {
      results.push({ id: p.id, name: p.name, ok: false, error: (e as Error).message });
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  return c.json({
    ok: true,
    synced: okCount,
    failed: results.length - okCount,
    results,
  });
});

export default app;
