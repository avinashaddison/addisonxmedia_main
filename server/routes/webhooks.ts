import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client";
import { contact, conversation, message, metaConfig, webhookOrphan } from "../db/schema";

// Meta WhatsApp webhook receiver.
//
// Setup in Meta App dashboard:
//   1. Webhook URL → https://YOUR_DOMAIN/api/webhooks/meta
//   2. Verify token → must match META_WEBHOOK_VERIFY_TOKEN env var
//   3. Subscribe to "messages" field on the WhatsApp Business Account
//
// For dev: tunnel localhost:3001 with ngrok/cloudflared and put that URL above.

const app = new Hono();

// GET — Meta's verification handshake during webhook setup.
// https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
app.get("/webhooks/meta", (c) => {
  const mode = c.req.query("hub.mode");
  const token = c.req.query("hub.verify_token");
  const challenge = c.req.query("hub.challenge");
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (!expected) {
    console.error("[webhooks/meta] META_WEBHOOK_VERIFY_TOKEN not set in env");
    return c.text("Verify token not configured", 500);
  }
  if (mode === "subscribe" && token === expected && challenge) {
    return c.text(challenge, 200);
  }
  return c.text("Forbidden", 403);
});

// POST — incoming events. We care about "messages" right now (status updates can be added later).
app.post("/webhooks/meta", async (c) => {
  const payload = await c.req.json().catch(() => null);
  if (!payload || payload.object !== "whatsapp_business_account") {
    return c.json({ ignored: true }, 200);
  }

  // Always 200 to Meta — they retry on non-2xx and we don't want loops.
  // Errors are logged.
  try {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages") continue;
        await processMessagesChange(change.value);
      }
    }
  } catch (err) {
    console.error("[webhooks/meta] processing error", err);
  }
  return c.json({ ok: true }, 200);
});

async function processMessagesChange(value: any) {
  const phoneNumberId: string | undefined = value?.metadata?.phone_number_id;
  if (!phoneNumberId) return;

  // Look up which user owns this WABA phone number.
  const [cfg] = await db.select().from(metaConfig)
    .where(eq(metaConfig.phoneNumberId, phoneNumberId)).limit(1);
  if (!cfg) {
    // No meta_config for this phone → log to webhook_orphan so admin can see
    // and retroactively claim. Each inbound message becomes its own orphan row
    // so the admin can read previews and decide which user it belongs to.
    const displayPhoneNumber: string | undefined = value?.metadata?.display_phone_number;
    const contacts: any[] = value?.contacts ?? [];
    const messages: any[] = value?.messages ?? [];
    if (messages.length === 0) {
      // Status updates with no matching cfg — record one breadcrumb so we know
      // a phone is sending us status callbacks for a number we don't own.
      await db.insert(webhookOrphan).values({
        phoneNumberId,
        displayPhoneNumber: displayPhoneNumber ?? null,
        raw: value,
      }).catch((e) => console.error("[webhook_orphan insert]", e));
      return;
    }
    for (const m of messages) {
      const fromPhone: string = m?.from ?? "";
      const normalizedPhone = fromPhone ? (fromPhone.startsWith("+") ? fromPhone : `+${fromPhone}`) : null;
      const profile = contacts.find((c: any) => c.wa_id === fromPhone)?.profile;
      const fromName = profile?.name ?? null;
      const preview = extractMessageBody(m).slice(0, 280);
      await db.insert(webhookOrphan).values({
        phoneNumberId,
        displayPhoneNumber: displayPhoneNumber ?? null,
        fromPhone: normalizedPhone,
        fromName,
        messagePreview: preview,
        raw: m,
      }).catch((e) => console.error("[webhook_orphan insert]", e));
    }
    console.warn(`[webhooks/meta] orphaned ${messages.length} message(s) for unknown phone_number_id ${phoneNumberId}`);
    return;
  }
  const userId = cfg.userId;

  // Inbound messages
  for (const m of value.messages ?? []) {
    await handleInboundMessage(userId, value.contacts ?? [], m);
  }
  // Status updates for outbound messages (sent → delivered → read, or failed).
  for (const s of value.statuses ?? []) {
    await handleStatusUpdate(userId, s);
  }
}

// Maps Meta's webhook status to our message_status enum.
const STATUS_MAP: Record<string, "sent" | "delivered" | "read" | "failed"> = {
  sent: "sent",
  delivered: "delivered",
  read: "read",
  failed: "failed",
};

async function handleStatusUpdate(userId: string, s: any) {
  const metaMessageId: string | undefined = s.id;
  const next = STATUS_MAP[s.status];
  if (!metaMessageId || !next) return;
  // We store Meta's message id in `twilio_sid` (column repurposed during the
  // Twilio→Meta migration). Match by that + owner_id for safety.
  await db.update(message)
    .set({ status: next })
    .where(and(eq(message.twilioSid, metaMessageId), eq(message.ownerId, userId)));
}

async function handleInboundMessage(userId: string, contacts: any[], m: any) {
  const fromPhone: string = m.from; // E.164 without "+" prefix per Meta — normalize
  const normalizedPhone = fromPhone.startsWith("+") ? fromPhone : `+${fromPhone}`;
  const profile = contacts.find((c: any) => c.wa_id === fromPhone)?.profile;
  const senderName = profile?.name ?? normalizedPhone;

  const body = extractMessageBody(m);
  const mediaUrl = extractMediaUrl(m);

  // Upsert contact by (user_id, phone)
  const [ctc] = await db.insert(contact).values({
    ownerId: userId,
    name: senderName,
    phone: normalizedPhone,
    source: "WhatsApp",
  })
    .onConflictDoUpdate({
      target: [contact.ownerId, contact.phone],
      set: { updatedAt: new Date() },
    })
    .returning();

  // Find or create conversation for this contact
  const [existingConv] = await db.select().from(conversation)
    .where(and(eq(conversation.contactId, ctc.id), eq(conversation.ownerId, userId)))
    .limit(1);

  // Meta Click-to-WhatsApp referral payload — present on the first inbound
  // message of an ad-sourced conversation. We capture it once at creation
  // time; if a returning customer clicks a new ad we keep the FIRST attribution
  // (industry-standard first-touch model).
  const referral = m.referral as
    | { source_id?: string; source_type?: string; headline?: string; ctwa_clid?: string }
    | undefined;

  let convId: string;
  if (existingConv) {
    convId = existingConv.id;
    // If we somehow missed the referral on creation (e.g. it's a re-engaged
    // chat from an ad click), backfill — but never overwrite an existing
    // source_ad_id (first-touch).
    const backfill: Record<string, unknown> = {
      lastMessageAt: new Date(Number(m.timestamp) * 1000),
      lastMessagePreview: body.slice(0, 200),
      unreadCount: existingConv.unreadCount + 1,
      updatedAt: new Date(),
    };
    if (referral?.source_id && !existingConv.sourceAdId) {
      backfill.sourceAdId = referral.source_id;
      backfill.sourceHeadline = referral.headline ?? null;
      backfill.ctwaClickId = referral.ctwa_clid ?? null;
      backfill.sourceType = referral.source_type ?? null;
    }
    await db.update(conversation).set(backfill).where(eq(conversation.id, convId));
  } else {
    const [conv] = await db.insert(conversation).values({
      contactId: ctc.id,
      ownerId: userId,
      status: "open",
      unreadCount: 1,
      lastMessageAt: new Date(Number(m.timestamp) * 1000),
      lastMessagePreview: body.slice(0, 200),
      sourceAdId: referral?.source_id ?? null,
      sourceHeadline: referral?.headline ?? null,
      ctwaClickId: referral?.ctwa_clid ?? null,
      sourceType: referral?.source_type ?? null,
    }).returning();
    convId = conv.id;
    // Promote ad-sourced contacts to "warm" automatically — they're clearly
    // interested. Operators can re-tag if needed.
    if (referral?.source_id) {
      await db.update(contact).set({ source: "Meta Ad", tag: "warm", updatedAt: new Date() })
        .where(eq(contact.id, ctc.id));
    }
  }

  await db.insert(message).values({
    conversationId: convId,
    ownerId: userId,
    direction: "inbound",
    body,
    mediaUrl,
    status: "delivered",
    twilioSid: m.id, // Reuse the column for Meta message id (rename later)
    createdAt: new Date(Number(m.timestamp) * 1000),
  });
}

function extractMessageBody(m: any): string {
  // For media messages we return the caption text only (may be empty). The
  // media itself is referenced via media_url so the UI renders it inline
  // instead of showing a placeholder string like "[Image]".
  switch (m.type) {
    case "text": return m.text?.body ?? "";
    case "image": return m.image?.caption ?? "";
    case "video": return m.video?.caption ?? "";
    case "audio": return "";
    case "document": return m.document?.caption ?? m.document?.filename ?? "";
    case "sticker": return "";
    case "location": return `📍 ${m.location?.name ?? "Shared location"}`;
    case "contacts": return "📇 Shared a contact card";
    case "interactive":
      return m.interactive?.button_reply?.title
        ?? m.interactive?.list_reply?.title
        ?? "[Interactive reply]";
    default: return `[${m.type ?? "unknown"} message]`;
  }
}

function extractMediaUrl(m: any): string | null {
  // We store the media as `meta:{type}:{id}` so the UI / proxy can both
  // figure out HOW to render it (image vs video vs audio vs doc) without
  // needing to round-trip back to Meta just to learn the mime type.
  // The /api/messages/:id/media proxy still resolves the binary URL on-demand.
  const types = ["image", "video", "audio", "document", "sticker"] as const;
  for (const t of types) {
    const id = m[t]?.id;
    if (id) return `meta:${t}:${id}`;
  }
  return null;
}

export default app;
