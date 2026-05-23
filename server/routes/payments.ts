/**
 * UPI payment routes.
 *
 * Customers tap a `upi://pay?...` deep link → their UPI app (PhonePe / GPay /
 * Paytm / BHIM) opens with the amount + payee pre-filled. The operator just
 * has to type the amount + optional note, the rest is auto-built from their
 * stored VPA. The customer also gets a QR they can scan from another device.
 *
 * No money flows through our server — we just construct the deep link and a
 * QR image URL. Reconciliation happens when the operator's bank/PSP notifies
 * them (out of scope for now; could later wire to Razorpay/Cashfree webhooks).
 */

import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client";
import { profile, conversation, contact, metaConfig, message } from "../db/schema";
import { requireAuth, type AuthVariables } from "../middleware/auth";
import { sendTextMessage, sendImageMessage } from "../integrations/meta";
import { decrypt } from "../crypto";

const app = new Hono<{ Variables: AuthVariables }>();
app.use("*", requireAuth);

/** Read the operator's UPI config (VPA + display name). */
app.get("/payments/upi/config", async (c) => {
  const [row] = await db.select({
    upiVpa: profile.upiVpa,
    upiDisplayName: profile.upiDisplayName,
  }).from(profile).where(eq(profile.userId, c.var.userId)).limit(1);

  return c.json({
    vpa: row?.upiVpa ?? "",
    display_name: row?.upiDisplayName ?? "",
    configured: Boolean(row?.upiVpa),
  });
});

/** Save the operator's UPI config. */
app.patch("/payments/upi/config", async (c) => {
  const body = await c.req.json<{ vpa?: string; display_name?: string }>();
  const vpa = body.vpa?.trim() ?? "";
  const displayName = body.display_name?.trim() ?? "";

  // Light VPA validation — should be `name@handle` form. Don't validate too
  // strictly because UPI handles vary (@upi / @ybl / @paytm / @okhdfcbank /
  // @okaxis / etc.).
  if (vpa && !/^[\w.-]+@[\w.-]+$/.test(vpa)) {
    return c.json({ error: "UPI VPA looks invalid. Format: name@handle (e.g. 9709707311@upi)" }, 400);
  }

  await db.update(profile)
    .set({ upiVpa: vpa || null, upiDisplayName: displayName || null, updatedAt: new Date() })
    .where(eq(profile.userId, c.var.userId));

  return c.json({ ok: true, vpa, display_name: displayName, configured: Boolean(vpa) });
});

/**
 * Build a UPI deep link + send it to a conversation via WhatsApp.
 *
 * Body: { conversation_id, amount_inr, note? }
 *
 * Deep link spec: https://www.npci.org.in/PDF/npci/upi/Standard-Operating-Procedure-UPI-V2.pdf
 *   upi://pay?pa={VPA}&pn={DISPLAY_NAME}&am={AMOUNT}&tn={NOTE}&cu=INR
 *
 * QR is generated via api.qrserver.com (same service we use for 2FA QR codes)
 * — no server-side image generation needed, no extra dep.
 */
app.post("/payments/upi/send", async (c) => {
  const userId = c.var.userId;
  const body = await c.req.json<{
    conversation_id: string;
    amount_inr: number;
    note?: string;
  }>();

  if (!body.conversation_id) return c.json({ error: "conversation_id required" }, 400);
  if (!body.amount_inr || body.amount_inr < 1) {
    return c.json({ error: "amount_inr must be ≥ 1" }, 400);
  }
  if (body.amount_inr > 1_00_000) {
    return c.json({ error: "Per-transaction UPI limit is ₹1,00,000. Split into multiple requests." }, 400);
  }

  // Pull operator's UPI config
  const [pf] = await db.select().from(profile).where(eq(profile.userId, userId)).limit(1);
  if (!pf?.upiVpa) {
    return c.json({ error: "Pehle UPI ID set karein (Settings → Payments)" }, 400);
  }
  const vpa = pf.upiVpa;
  const displayName = pf.upiDisplayName || pf.displayName || "Business";

  // Pull conversation + contact for WhatsApp sending
  const [conv] = await db.select({
    id: conversation.id,
    contactId: conversation.contactId,
  }).from(conversation)
    .where(and(eq(conversation.id, body.conversation_id), eq(conversation.ownerId, userId)))
    .limit(1);
  if (!conv) return c.json({ error: "Conversation not found" }, 404);

  const [ctc] = await db.select({ phone: contact.phone, name: contact.name })
    .from(contact).where(eq(contact.id, conv.contactId)).limit(1);
  if (!ctc) return c.json({ error: "Contact not found" }, 404);

  // Build the UPI deep link
  const amount = body.amount_inr.toFixed(2);
  const note = (body.note ?? `Payment to ${displayName}`).slice(0, 40);
  const params = new URLSearchParams({
    pa: vpa,
    pn: displayName,
    am: amount,
    tn: note,
    cu: "INR",
  });
  const upiLink = `upi://pay?${params.toString()}`;
  // 280×280 source — chat bubble renders at 200px with object-contain, so we
  // ship a slightly higher native res for retina without dominating the
  // bubble. The old 400×400 produced an over-sized image that scrolled
  // half the chat off-screen.
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=6&data=${encodeURIComponent(upiLink)}`;

  // Short caption — what customers see next to the QR. We deliberately
  // DON'T include the raw upi://pay?... link because it looks ugly with
  // URL-encoded chars (%40, +, etc) and the QR + UPI ID gives them both
  // ways to pay anyway (scan on another phone, or type the UPI ID in
  // their UPI app).
  const messageBody =
    `💳 *₹${body.amount_inr.toLocaleString("en-IN")} to ${displayName}*\n` +
    `UPI ID: \`${vpa}\`\n\n` +
    `📷 Scan the QR to pay\n\n` +
    `_Please complete the payment_ 🙏`;

  // Send the QR as an actual WhatsApp image with the short caption.
  // Falls back to text-only if image send fails (e.g. QR URL not reachable).
  const [cfg] = await db.select().from(metaConfig).where(eq(metaConfig.userId, userId)).limit(1);
  let metaMessageId: string | null = null;
  let sentLive = false;

  if (cfg?.enabled && cfg.accessToken && cfg.phoneNumberId) {
    const creds = {
      accessToken: decrypt(cfg.accessToken),
      phoneNumberId: cfg.phoneNumberId,
      businessAccountId: cfg.businessAccountId,
    };
    const recipient = ctc.phone.replace(/^\+/, "");
    try {
      const sent = await sendImageMessage(creds, recipient, qrUrl, messageBody);
      metaMessageId = sent.messages?.[0]?.id ?? null;
      sentLive = true;
    } catch (e) {
      console.error("[payments/upi/send] image send failed, retrying as text", e);
      try {
        const sent = await sendTextMessage(creds, recipient, messageBody);
        metaMessageId = sent.messages?.[0]?.id ?? null;
        sentLive = true;
      } catch (e2) {
        console.error("[payments/upi/send] WhatsApp send failed", e2);
        // Fall through — we still record the message locally
      }
    }
  }

  // Record the outbound message in our DB so it shows in the chat
  await db.insert(message).values({
    conversationId: conv.id,
    ownerId: userId,
    senderId: userId,
    direction: "outbound",
    body: messageBody,
    mediaUrl: qrUrl,
    status: sentLive ? "sent" : "queued",
    twilioSid: metaMessageId,
  });

  // Bump conversation
  await db.update(conversation).set({
    lastMessageAt: new Date(),
    lastMessagePreview: `💳 Payment request — ₹${body.amount_inr.toLocaleString("en-IN")}`,
    updatedAt: new Date(),
  }).where(eq(conversation.id, conv.id));

  return c.json({
    ok: true,
    upi_link: upiLink,
    qr_url: qrUrl,
    amount_inr: body.amount_inr,
    note,
    sent_live: sentLive,
    mode: sentLive ? "live" : "dry-run",
  });
});

export default app;
