/**
 * WhatsApp Commerce helpers — sends transactional WhatsApp messages for
 * order lifecycle events.  Uses the existing Meta API integration (WABA)
 * when available, falls back to a simple URL redirect.
 *
 * Functions:
 *   - buildOrderConfirmationMessage(order, items, business)
 *   - buildShippingUpdateMessage(order, tracking, business)
 *   - buildDigitalDeliveryMessage(order, activationLinks, business)
 *   - buildAbandonedCartMessage(contact, cartItems, business)
 *   - formatWhatsAppDeeplink(phone, text)
 */

import { db } from "../db/client";
import { orderTbl, orderItem, product, site, contact } from "../db/schema";
import { eq, and } from "drizzle-orm";
import logger from "./logger";

// ─── Types ──────────────────────────────────────────────────────────────────

type OrderSummary = {
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  totalInr: string;
  paymentStatus: string;
  status: string;
  createdAt: Date;
};

type OrderItemSummary = {
  name: string;
  qty: number;
  priceInr: string;
};

type BusinessInfo = {
  name: string;
  phone: string;
  slug: string;
};

type TrackingInfo = {
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  etaDays?: number;
};

// ─── Message builders ───────────────────────────────────────────────────────

/**
 * Build an order confirmation message suitable for WhatsApp.
 * Returns plain text (no markdown) with line breaks.
 */
export function buildOrderConfirmationMessage(
  order: OrderSummary,
  items: OrderItemSummary[],
  biz: BusinessInfo,
): string {
  const itemLines = items.map(
    (it) => `• ${it.name} × ${it.qty} — ₹${Number(it.priceInr).toLocaleString("en-IN")}`,
  ).join("\n");

  return [
    `🎉 *Order Confirmed!*`,
    ``,
    `Hi ${order.customerName},`,
    `Thank you for your order from *${biz.name}*!`,
    ``,
    `📦 *Order #${order.orderNumber}*`,
    `${itemLines}`,
    ``,
    `💰 *Total: ₹${Number(order.totalInr).toLocaleString("en-IN")}*`,
    `💳 Payment: ${order.paymentStatus === "paid" ? "✅ Paid" : "⏳ " + order.paymentStatus}`,
    ``,
    `📍 Track your order:`,
    `${getBaseUrl()}/biz/${biz.slug}/track/${order.orderNumber}?phone=${encodeURIComponent(order.customerPhone)}`,
    ``,
    `Need help? Reply to this message or visit our store.`,
    `— ${biz.name}`,
  ].join("\n");
}

/**
 * Build a shipping update message.
 */
export function buildShippingUpdateMessage(
  order: OrderSummary,
  tracking: TrackingInfo,
  biz: BusinessInfo,
): string {
  const lines = [
    `📦 *Shipping Update*`,
    ``,
    `Hi ${order.customerName},`,
    `Your order *#${order.orderNumber}* has been shipped!`,
  ];

  if (tracking.carrier) lines.push(`🚚 Carrier: ${tracking.carrier}`);
  if (tracking.trackingNumber) lines.push(`📋 Tracking: ${tracking.trackingNumber}`);
  if (tracking.trackingUrl) lines.push(`🔗 Track: ${tracking.trackingUrl}`);
  if (tracking.etaDays) lines.push(`⏱️ Estimated delivery: ${tracking.etaDays} day${tracking.etaDays === 1 ? "" : "s"}`);

  lines.push(
    ``,
    `📍 Order details:`,
    `${getBaseUrl()}/biz/${biz.slug}/track/${order.orderNumber}?phone=${encodeURIComponent(order.customerPhone)}`,
    ``,
    `Questions? Reply to this message.`,
    `— ${biz.name}`,
  );

  return lines.join("\n");
}

/**
 * Build a digital product delivery message with activation links.
 */
export function buildDigitalDeliveryMessage(
  order: OrderSummary,
  activationLinks: Array<{ name: string; link: string }>,
  biz: BusinessInfo,
): string {
  const links = activationLinks.map(
    (a) => `⚡ *${a.name}*\n   ${a.link}`,
  ).join("\n\n");

  return [
    `🎉 *Your Digital Products Are Ready!*`,
    ``,
    `Hi ${order.customerName},`,
    `Thank you for your purchase from *${biz.name}*!`,
    `Your products are ready for instant access:`,
    ``,
    links,
    ``,
    `💡 *Tips:*`,
    `• Save this message — you can access these links anytime`,
    `• If a link doesn't work, reply here and we'll resend`,
    `• Downloads are for personal + commercial use`,
    ``,
    `📦 Order #${order.orderNumber}`,
    `💰 Total: ₹${Number(order.totalInr).toLocaleString("en-IN")}`,
    ``,
    `Need help? Reply to this message.`,
    `— ${biz.name}`,
  ].join("\n");
}

/**
 * Build an abandoned cart recovery message.
 */
export function buildAbandonedCartMessage(
  customerName: string,
  cartItems: Array<{ name: string; priceInr: number }>,
  biz: BusinessInfo,
): string {
  const itemLines = cartItems.slice(0, 5).map(
    (it) => `• ${it.name} — ₹${it.priceInr.toLocaleString("en-IN")}`,
  ).join("\n");

  return [
    `👋 Hi ${customerName}!`,
    ``,
    `You left some items in your cart at *${biz.name}*:`,
    ``,
    itemLines,
    ``,
    `🛒 Complete your purchase:`,
    `${getBaseUrl()}/biz/${biz.slug}/cart`,
    ``,
    `💬 Have questions? Reply here and we'll help!`,
    `— ${biz.name}`,
  ].join("\n");
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Format a WhatsApp deep link for direct messaging.
 * Works on mobile (opens WhatsApp) and desktop (opens web.whatsapp.com).
 */
export function formatWhatsAppDeeplink(phone: string, text: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Get the base URL for the site (from env or default).
 */
function getBaseUrl(): string {
  return process.env.SITE_BASE_URL || process.env.VITE_API_BASE_URL || "https://addisonxmedia.com";
}

/**
 * Fetch order + items + business info by order ID, for composing messages.
 * Returns null if order not found.
 */
export async function getOrderMessageContext(orderId: string) {
  try {
    const [order] = await db.select().from(orderTbl).where(eq(orderTbl.id, orderId)).limit(1);
    if (!order) return null;

    const items = await db.select().from(orderItem).where(eq(orderItem.orderId, orderId));
    const [siteRow] = await db.select().from(site).where(eq(site.userId, order.ownerId)).limit(1);

    const orderSummary: OrderSummary = {
      orderNumber: order.orderNumber,
      customerName: order.customerName || "Customer",
      customerPhone: order.customerPhone || "",
      totalInr: order.totalInr,
      paymentStatus: order.paymentStatus,
      status: order.status,
      createdAt: order.createdAt,
    };

    const itemSummaries: OrderItemSummary[] = items.map((it) => ({
      name: it.productName,
      qty: it.qty,
      priceInr: it.unitPriceInr,
    }));

    const businessInfo: BusinessInfo = {
      name: (siteRow?.copy as any)?.business_name || "Shop",
      phone: order.ownerId, // Caller should resolve this
      slug: siteRow?.slug || "",
    };

    return { order: orderSummary, items: itemSummaries, business: businessInfo, siteRow };
  } catch (err) {
    logger.error({ err }, "Failed to get order message context");
    return null;
  }
}

/**
 * Fetch digital product activation links for an order.
 * Returns an array of { name, link } for each digital product.
 */
export async function getDigitalProductLinks(orderId: string): Promise<Array<{ name: string; link: string }>> {
  try {
    const items = await db.select().from(orderItem).where(eq(orderItem.orderId, orderId));
    const links: Array<{ name: string; link: string }> = [];

    for (const item of items) {
      if (!item.productId) continue;
      const [prod] = await db.select().from(product)
        .where(and(eq(product.id, item.productId), eq(product.isDigital, true)))
        .limit(1);
      if (prod?.activationMail) {
        // Extract URL from activation message if it contains one
        const urlMatch = prod.activationMail.match(/https?:\/\/[^\s]+/);
        links.push({
          name: item.productName,
          link: urlMatch ? urlMatch[0] : prod.activationMail,
        });
      }
    }

    return links;
  } catch (err) {
    logger.error({ err }, "Failed to get digital product links");
    return [];
  }
}
