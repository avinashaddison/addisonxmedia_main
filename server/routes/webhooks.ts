import { Hono } from "hono";
import { and, desc, eq, sql } from "drizzle-orm";
import { createHmac } from "node:crypto";
import { db } from "../db/client";
import { contact, conversation, message, metaConfig, webhookOrphan, upgradeRequest, user, profile } from "../db/schema";
import { verifyWebhookSignature as verifyCashfreeSignature } from "../integrations/cashfree";
import { sendTextMessage, sendImageMessage } from "../integrations/meta";
import { decrypt } from "../crypto";
import { getPersonaWithDefaults } from "../lib/ai-persona";
import { chatJson, isAiConfigured } from "../integrations/openai";
import { checkAiCap, logAiUsage } from "../lib/ai-usage";
import logger from "../lib/logger";

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
    logger.error('META_WEBHOOK_VERIFY_TOKEN not set in env');
    return c.text("Verify token not configured", 500);
  }
  if (mode === "subscribe" && token === expected && challenge) {
    return c.text(challenge, 200);
  }
  return c.text("Forbidden", 403);
});

// POST — incoming events. We care about "messages" right now (status updates can be added later).
app.post("/webhooks/meta", async (c) => {
  // Read raw body first for signature verification
  const rawBody = await c.req.text();

  // Verify X-Hub-Signature-256 if META_APP_SECRET is configured
  const metaAppSecret = process.env.META_APP_SECRET;
  if (metaAppSecret) {
    const signature = c.req.header("X-Hub-Signature-256") ?? "";
    const expected = "sha256=" + createHmac("sha256", metaAppSecret).update(rawBody).digest("hex");
    if (!signature || signature !== expected) {
      return c.json({ error: "Invalid signature" }, 401);
    }
  } else if (process.env.NODE_ENV === 'production') {
    return c.json({ error: "Webhook signature verification not configured" }, 503);
  } else {
    logger.warn('META_APP_SECRET not set -- skipping signature verification');
  }

  // Parse JSON from the raw text
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    payload = null;
  }

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
    logger.error({ err }, 'Meta webhook processing error');
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
      }).catch((e) => logger.error({ err: e }, 'webhook_orphan insert failed'));
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
      }).catch((e) => logger.error({ err: e }, 'webhook_orphan insert failed'));
    }
    logger.warn({ phoneNumberId, count: messages.length }, 'Orphaned messages for unknown phone_number_id');
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
  // We store Meta's message id in `external_message_id`.
  // Match by that + owner_id for safety.
  await db.update(message)
    .set({ status: next })
    .where(and(eq(message.externalMessageId, metaMessageId), eq(message.ownerId, userId)));
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

    // Fire CAPI Lead event for the new contact, ideally with the CTWA click
    // id so Meta can attribute back to the originating ad. Server-to-server,
    // never blocks inbound message ingestion.
    void import("../lib/meta-capi").then((m) =>
      m.fireCapiSafely(
        () => m.fireLeadEvent(userId, ctc.id, { ctwaClickId: referral?.ctwa_clid ?? null }),
        `new_lead:${ctc.id}`
      )
    );
  }

  // Deduplication: skip if we already have this Meta message id for this owner
  const [existing] = await db.select({ id: message.id }).from(message)
    .where(and(eq(message.externalMessageId, m.id), eq(message.ownerId, userId))).limit(1);
  if (existing) {
    logger.debug({ externalMessageId: m.id, ownerId: userId }, 'Duplicate message skipped');
    return;
  }

  await db.insert(message).values({
    conversationId: convId,
    ownerId: userId,
    direction: "inbound",
    body,
    mediaUrl,
    status: "delivered",
    externalMessageId: m.id, // Meta message id
    createdAt: new Date(Number(m.timestamp) * 1000),
  });

  // ── Agent Mode auto-reply ──────────────────────────────────────────────────
  // If agent_mode is ON for this conversation, fire an AI reply immediately.
  // We do this fire-and-forget (void) so the webhook 200 is never delayed.
  const conv = existingConv
    ? existingConv
    : await db.select().from(conversation).where(eq(conversation.id, convId)).limit(1).then(r => r[0]);

  if (conv?.agentMode) {
    void triggerAgentReply(userId, convId, ctc.id, body).catch((err) =>
      logger.error({ err, convId }, "Agent auto-reply failed")
    );
  }
}

/**
 * Fire an AI auto-reply for a conversation that has agentMode = true.
 * Called fire-and-forget from handleInboundMessage — must never throw.
 */
async function triggerAgentReply(
  userId: string,
  convId: string,
  contactId: string,
  inboundBody: string,
): Promise<void> {
  // Prerequisites: AI configured, Meta connected
  if (!isAiConfigured()) return;
  const [cfg] = await db.select().from(metaConfig).where(eq(metaConfig.userId, userId)).limit(1);
  if (!cfg?.enabled || !cfg.accessToken) return;

  // Load contact tag for persona context
  const [ctc] = await db
    .select({ name: contact.name, tag: contact.tag })
    .from(contact).where(eq(contact.id, contactId)).limit(1);
  if (!ctc) return;

  const persona = await getPersonaWithDefaults(userId);
  const [pf] = await db.select().from(profile).where(eq(profile.userId, userId)).limit(1);
  const communityUrl = pf?.whatsappCommunityUrl ?? null;

  // Escalation keyword check — skip auto-reply if escalate keyword detected
  const escalateList = persona.escalate_keywords
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const lower = inboundBody.toLowerCase();
  if (escalateList.some((kw) => kw.length > 0 && lower.includes(kw))) {
    logger.info({ convId }, "Agent mode: escalate keyword detected, skipping auto-reply");
    return;
  }

  // Cap check
  const gate = await checkAiCap(userId, "auto_reply");
  if (!gate.allowed) {
    logger.warn({ convId, reason: gate.reason }, "Agent mode: AI cap reached");
    return;
  }

  // Load last 6 messages for context
  const recent = await db
    .select({ direction: message.direction, body: message.body })
    .from(message)
    .where(eq(message.conversationId, convId))
    .orderBy(desc(message.createdAt))
    .limit(6);
  const history = recent.slice().reverse();

  const productLines = (persona.products || []).map((p: any) => {
    let line = `- ${p.name}: ₹${Number(p.price).toLocaleString("en-IN")} (${p.validity})`;
    if (p.activationMail) line += `, Activation: ${p.activationMail}`;
    if (p.activationTime) line += `, Setup time: ${p.activationTime}`;
    return line;
  }).join("\n");

  const productContext = productLines.trim()
    ? `Available Products:\n${productLines}`
    : `WARNING: No products are currently available/configured in the system. Everything is OUT OF STOCK. If the customer asks for any product, tool, subscription, or account, you MUST tell them it is not available.`;

  const communityLine = communityUrl
    ? `COMMUNITY LINK: ${communityUrl}\nRule: If the conversation is concluding, or the customer has agreed to buy / is paying, suggest joining the community for daily updates using this exact link. Keep it very short. Example: 'Sir daily updates ke liye community join kar lijiye: ${communityUrl}'`
    : "";

  // Build system prompt (same logic as /ai/reply-suggestions but condensed)
  const isSalesmanAgent = (persona as any).type === "prebuilt_sales" || (persona as any).tone === "reseller";
  let systemPrompt: string;
  if (isSalesmanAgent) {
    systemPrompt = [
      `You are NOT a customer support bot. You are a real Indian WhatsApp reseller selling AI tool accounts representing "${persona.business_name || "AI Tool Shop"}".`,
      `Your ONLY goal: Sound like a real human chatting naturally on WhatsApp.`,
      `We sell: Premium AI tools. We are trusted resellers providing fast delivery and working warranty.`,
      `Tone: Natural, casual, confident. Talk like a real Indian seller on WhatsApp.`,
      `Language: Hinglish (roman-script Hindi/English mix).`,
      `Products, Pricing, and Activation Context:`,
      productContext,
      communityLine,
      `Delivery: 5-10 mins after payment unless specified otherwise in product setup times.`,
      `Warranty: Working warranty is included.`,
      `Payment: UPI (Paytm, GPay, PhonePe).`,
      ``,
      `CRITICAL RULES:`,
      `- Keep replies VERY short (Maximum 1-2 lines).`,
      `- Reply fast and direct.`,
      `- Answer ONLY what customer asked. No long explanations.`,
      `- No marketing speeches unless customer asks.`,
      `- No corporate tone. No robotic wording. No formal grammar.`,
      `- EMOJI RULE: Do NOT use 🙂 in every reply. Use emoji only sometimes. Many replies should have NO emoji.`,
      `- TYPING STYLE: Sometimes use lowercase. Sometimes skip perfect grammar.`,
      `- Sometimes use: "haa", "han", "hn", "mil jayega", "kr deta hu", "1 min".`,
      `- INCONSISTENCY: Humans are inconsistent. Replies should slightly vary every time. Avoid repeating the same exact structure.`,
      `- DO NOT ALWAYS ASK QUESTIONS. If customer says "AI tool chahiye", reply casually like "chatgpt, claude, sora sab hai" instead of asking polite questions.`,
      `- REAL SELLER BEHAVIOR: Type fast, skip extra words, do not sound too helpful, do not explain much, do not talk perfectly.`,
      `- REMOVE THESE HABITS: Too much "sir", too many emojis, too much politeness, too much excitement, repeating tool names every message, repeating customer question structure.`,
      `- DRY REPLIES: Sometimes dry replies are okay (e.g. "hn", "done", "bhejta", "ek min", "mil jayega", "available", "yes").`,
      `- FINAL RULE: If a reply feels too clean, too complete, or too professional, make it shorter and simpler.`,
      `- PRODUCT SELECTION & AVAILABILITY: You must ONLY sell/offer tools that are explicitly listed in the "Available Products" context. If there are no products listed, or if a customer asks for a tool/product that is NOT in the list, you MUST tell them it is not available (e.g. "not available" or "abhi available nahi hai"). NEVER say a tool is available or give a price unless it is in the active products list above.`,
      `- If ChatGPT is in the list of available tools, only ask "Plus ya Pro?" if they specifically asked for ChatGPT generally and both are in the list. For any other product in the list, confirm we have it and state its price directly. Do not mention or sell any products not in the active products list.`,
      `- CONTEXT UNDERSTANDING RULES: Understand what the customer is referring to before replying by carefully checking the previous 2-4 messages. Do NOT blindly reply using the last topic or guess randomly.
        * "Kitna din?" usually means plan duration (e.g., "1 month").
        * "Kitna time?" usually means activation/setup time (e.g., "5-10 min").
        * "Kab tak?" means expiry/duration.
        * "Kitna lagega?" can mean price or time depending on the previous messages.
        * If the meaning of their question is unclear, ask for a short clarification (e.g., "plan duration puch rahe?" or "activation ya validity?").`,
      `- Never say "sorry sir, busy hu" or "wait please". If they ask to send fast or say OK, just reply with a direct short confirmation like "Bhej diya sir" or "Ha sir".`,
      ``,
      `NEVER SAY:`,
      `- Dear customer`,
      `- Kindly`,
      `- Please be informed`,
      `- We are delighted`,
      `- Happy to help`,
      `- As an AI`,
      `- Premium experience`,
      `- Convenient time`,
      `- Schedule demo`,
      `- Our team`,
      `- Valued customer`,
      ``,
      `NEVER DO:`,
      `- Never send long paragraphs.`,
      `- Never over explain.`,
      `- Never ask too many questions together.`,
      `- Never push customer repeatedly.`,
      `- Never send payment QR before customer asks or confirms.`,
      `- Never repeat same line again and again.`,
      `- Never send links randomly.`,
      `- Never send community/Instagram links unless customer asks.`,
      `- Never talk like customer support.`,
      `- Never force urgency.`,
      ``,
      `ACTIONS & QR CODE GENERATION:`,
      `If the customer asks for a QR code, explicitly asks to pay, or requests to proceed with payment (e.g. they confirm they want ChatGPT Plus and ask where/how to pay, or request QR code, payment link, upi ID, or send 'Qr do', 'payment upi'), you can trigger a "send_qr" action.`,
      `CRITICAL WARNING: NEVER trigger a "send_qr" action when they are just asking for the price or details of a product. Only send it when they are ready to buy or explicitly asking for payment link/qr.`,
      `When triggering a "send_qr" action:`,
      `1. Set the "action" field to "send_qr".`,
      `2. Set the "amount" field to the price of the requested tool. If you don't know the tool/price, default to 999.`,
      `3. Set the "note" field to the name of the tool (e.g., "ChatGPT Plus").`,
      `4. Make the "reply" text state that you are sending the QR code (keep it extremely short, e.g. "Payment QR bhej raha hu sir 🙂").`,
      ``,
      `SHORT REPLY MODE & STYLE EXAMPLES (Note: These examples are for tone and formatting reference only. Do NOT copy these product names, prices, or availability unless they are present in the Available Products list above):`,
      `Customer: "hello" → Reply: "hello bhai"`,
      `Customer: "kaise ho" → Reply: "badhiya 🙂\ntum batao"`,
      `Customer: "available?" → Reply: "haa"`,
      `Customer: "price?" → Reply: "1499"`,
      `Customer: "time?" → Reply: "5-10 min"`,
      `Customer: "mail me?" → Reply: "haan"`,
      `Customer: "Claude chahiye" → Reply: "Yes sir 🙂\nPro?"`,
      `Customer: "Pro" → Reply: "Available hai sir 🙂"`,
      `Customer: "Price?" (Claude) → Reply: "1499"`,
      `Customer: "Warranty?" → Reply: "Working warranty rahega"`,
      `Customer: "Payment?" → Reply: "UPI de deta hu"`,
      `Customer: "Payment done" → Reply: "Received sir 🙂\nSetup karta hu."`,
      `Customer: "Aur tools?" → Reply: "ChatGPT, Claude, Midjourney, Sora"`,
      `Customer: "Tumhara naam?" → Reply: "Addison bol sakte ho"`,
      ``,
      `BAD AI REPLIES (NEVER USE):`,
      `❌ "Great! How can I assist you today?"`,
      `❌ "Please share your convenient time."`,
      `❌ "Happy to answer your questions."`,
      `❌ "Features ke baare me jaan na hai?"`,
      `❌ "We provide premium accounts."`,
      `❌ "Our team will process your order."`,
      `❌ "Please complete payment 🙏"`,
      ``,
      `GOOD HUMAN REPLIES:`,
      `✅ "Yes sir"`,
      `✅ "Mil jayega"`,
      `✅ "Kar deta hu"`,
      `✅ "Available hai"`,
      `✅ "1 min sir"`,
      `✅ "Bhej raha"`,
      `✅ "hn"`,
      `✅ "done"`,
      `✅ "bhejta"`,
      `✅ "ek min"`,
    ].join("\n");
  } else {
    const TONE: Record<string, string> = {
      friendly: "Warm, helpful, light emojis OK.",
      professional: "Polished, formal, no emojis.",
      casual: "Chill, conversational, no jargon.",
      urgent_sales: "Push toward a close — polite but urgent. Always include a CTA.",
    };
    const LANG: Record<string, string> = {
      hinglish: "Reply in Hinglish (roman-script Hindi/English mix).",
      hindi: "Reply in Hindi (Devanagari script).",
      english: "Reply in clean English.",
    };
    const TAG: Record<string, string> = {
      hot: "HOT lead — confident, push toward next step.",
      warm: "WARM lead — build value, gentle nudge.",
      cold: "COLD lead — light touch, just get them to reply.",
    };

    systemPrompt = [
      `You are ${persona.business_name || "an AI sales assistant"} replying to a WhatsApp customer.`,
      persona.what_we_sell ? `What we sell: ${persona.what_we_sell}` : "",
      `Tone: ${TONE[persona.tone] ?? TONE.friendly}`,
      `Language: ${LANG[persona.response_language] ?? LANG.hinglish}`,
      `Lead: ${TAG[ctc.tag] ?? TAG.cold}`,
      persona.always_say ? `ALWAYS: ${persona.always_say}` : "",
      persona.never_say ? `NEVER: ${persona.never_say}` : "",
      persona.knowledge_base ? `CONTEXT:\n${persona.knowledge_base}` : "",
      "",
      `Available Products / ToolsContext:\n${productLines}`,
      communityLine,
      "",
      "Keep replies concise (1-3 sentences). Match the customer's language and energy.",
      `- PRODUCT SELECTION: If the customer asks for a product generally without specifying which one, do NOT assume a specific product. Ask which product/tool they want and list the available options.`,
      `- PAYMENT INFO / QR: Only suggest payment links or details when they explicitly ask for payment options, say they want to pay, or say they want to buy. Do NOT suggest payment info just because they asked about prices or product details.`,
      `- ACTIONS & QR CODE GENERATION: If the customer asks for a QR code, explicitly asks to pay, or requests to proceed with payment, you can trigger a "send_qr" action by setting "action": "send_qr", "amount": <price>, "note": "<product name>".`,
      "",
      `Output ONLY the reply text and action metadata in the requested JSON format.`,
    ].filter(Boolean).join("\n");
  }

  const historyText = history
    .map((m) => `${m.direction === "inbound" ? "CUSTOMER" : "YOU"}: ${m.body}`)
    .join("\n");
  const userPrompt = `Conversation so far:\n${historyText}\n\nCustomer's latest message: "${inboundBody}"\n\nWrite your reply now:`;

  let replyText: string;
  let action: string | null = null;
  let amount: number | null = null;
  let note: string | null = null;

  try {
    const result = await chatJson<{
      reply: string;
      action?: "send_qr" | null;
      amount?: number | null;
      note?: string | null;
    }>(
      [
        { role: "system", content: systemPrompt + '\n\nReturn JSON format: {"reply": "<message>", "action": "send_qr"|null, "amount": 999|null, "note": "ChatGPT Plus"|null}' },
        { role: "user", content: userPrompt },
      ],
      { model: "gpt-4o-mini", temperature: 0.7, maxTokens: 300 },
    );
    replyText = (result.json?.reply ?? "").trim();
    action = result.json?.action ?? null;
    amount = result.json?.amount ?? null;
    note = result.json?.note ?? null;

    await logAiUsage({
      userId,
      feature: "auto_reply",
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      costInr: result.costInr,
      ok: true,
    });
  } catch (e) {
    await logAiUsage({ userId, feature: "auto_reply", model: "gpt-4o-mini", promptTokens: 0, completionTokens: 0, costInr: 0, ok: false, errorMessage: String(e) });
    throw e;
  }

  if (!replyText) return;

  // Send via Meta
  const [recipientContact] = await db.select({ phone: contact.phone }).from(contact)
    .where(eq(contact.id, contactId)).limit(1);
  if (!recipientContact) return;

  const creds = {
    accessToken: decrypt(cfg.accessToken),
    phoneNumberId: cfg.phoneNumberId,
    businessAccountId: cfg.businessAccountId,
  };
  const to = recipientContact.phone.replace(/^\+/, "");
  const sent = await sendTextMessage(creds, to, replyText);
  const metaMessageId = sent.messages?.[0]?.id ?? null;

  // Persist outbound message
  const [outMsg] = await db.insert(message).values({
    conversationId: convId,
    ownerId: userId,
    senderId: userId,
    direction: "outbound",
    body: replyText,
    status: "sent",
    externalMessageId: metaMessageId,
    isAiGenerated: true,
  }).returning();

  // Update conversation preview
  await db.update(conversation).set({
    lastMessageAt: outMsg.createdAt,
    lastMessagePreview: replyText.slice(0, 200),
    updatedAt: new Date(),
  }).where(eq(conversation.id, convId));

  logger.info({ convId, chars: replyText.length }, "Agent mode: auto-reply sent");

  // ── Execute Send QR Action ────────────────────────────────────────────────
  if (action === "send_qr" && amount && amount >= 1) {
    const [pf] = await db.select().from(profile).where(eq(profile.userId, userId)).limit(1);
    if (pf?.upiVpa) {
      const vpa = pf.upiVpa;
      const displayName = pf.upiDisplayName || pf.displayName || "Business";
      const formattedAmount = amount.toFixed(2);
      const qrNote = (note ?? `Payment to ${displayName}`).slice(0, 40);
      const params = new URLSearchParams({
        pa: vpa,
        pn: displayName,
        am: formattedAmount,
        tn: qrNote,
        cu: "INR",
      });
      const upiLink = `upi://pay?${params.toString()}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=6&data=${encodeURIComponent(upiLink)}`;

      const qrMessageBody =
        `💳 *₹${amount.toLocaleString("en-IN")} to ${displayName}*\n` +
        `UPI ID: \`${vpa}\`\n\n` +
        `📷 Scan the QR to pay\n\n` +
        `_Please complete the payment_ 🙏`;

      let qrMetaMessageId: string | null = null;
      let sentQrLive = false;

      try {
        const sentQr = await sendImageMessage(creds, to, qrUrl, qrMessageBody);
        qrMetaMessageId = sentQr.messages?.[0]?.id ?? null;
        sentQrLive = true;
      } catch (e) {
        logger.error({ err: e, convId }, "Agent mode: QR image send failed, retrying as text");
        try {
          const sentQr = await sendTextMessage(creds, to, qrMessageBody);
          qrMetaMessageId = sentQr.messages?.[0]?.id ?? null;
          sentQrLive = true;
        } catch (e2) {
          logger.error({ err: e2, convId }, "Agent mode: QR text retry failed");
        }
      }

      const [qrOutMsg] = await db.insert(message).values({
        conversationId: convId,
        ownerId: userId,
        senderId: userId,
        direction: "outbound",
        body: qrMessageBody,
        mediaUrl: qrUrl,
        status: sentQrLive ? "sent" : "queued",
        externalMessageId: qrMetaMessageId,
        isAiGenerated: true,
      }).returning();

      await db.update(conversation).set({
        lastMessageAt: qrOutMsg.createdAt,
        lastMessagePreview: `💳 Payment request — ₹${amount.toLocaleString("en-IN")}`,
        updatedAt: new Date(),
      }).where(eq(conversation.id, convId));

      logger.info({ convId, amount }, "Agent mode: QR auto-sent");
    } else {
      logger.warn({ convId }, "Agent mode: send_qr action triggered but upiVpa is not configured");
    }
  }
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

/* ─────────────────────────────────────────────────────────────────────────
 * Cashfree Payment Gateway webhook
 *
 * Setup in Cashfree dashboard:
 *   1. Webhook URL → https://YOUR_DOMAIN/api/webhooks/cashfree
 *   2. Subscribe to PAYMENT_SUCCESS_WEBHOOK + PAYMENT_FAILED_WEBHOOK
 *   3. Secret → uses your existing API secret (no separate webhook secret)
 *
 * Signature: base64(HMAC-SHA256(secret, timestamp + rawBody))
 *   Headers:
 *     x-webhook-timestamp
 *     x-webhook-signature
 *
 * Idempotency: the redirect-verify path may activate the user's plan before
 * us; we re-check upgrade_request.status with a WHERE-clause guard so a
 * second activation is a no-op.
 * ───────────────────────────────────────────────────────────────────────── */
app.post("/webhooks/cashfree", async (c) => {
  // MUST read raw body first — re-serialized JSON breaks the signature.
  const rawBody = await c.req.text();
  const signature = c.req.header("x-webhook-signature") ?? "";
  const timestamp = c.req.header("x-webhook-timestamp") ?? "";

  if (!signature || !timestamp) {
    logger.warn('Cashfree webhook missing signature/timestamp headers');
    return c.json({ error: "missing signature" }, 400);
  }

  const ok = verifyCashfreeSignature({ rawBody, signature, timestamp });
  if (!ok) {
    logger.warn('Cashfree webhook signature verify failed');
    return c.json({ error: "invalid signature" }, 401);
  }

  type CashfreeWebhookPayload = {
    type: string;        // e.g. PAYMENT_SUCCESS_WEBHOOK
    data: {
      order: { order_id: string; order_amount: number; order_currency: string; order_tags?: Record<string, string> };
      payment: {
        cf_payment_id: number;
        payment_status: string;
        payment_amount: number;
        payment_currency: string;
        payment_message?: string;
        payment_time: string;
        payment_method?: Record<string, unknown>;
        payment_group?: string;
      };
      customer_details?: { customer_id?: string };
    };
    event_time: string;
  };

  let payload: CashfreeWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.json({ error: "invalid json" }, 400);
  }

  try {
    const eventType = payload.type;
    const orderId = payload.data?.order?.order_id;
    if (!orderId) {
      logger.warn({ eventType }, 'Cashfree webhook: no order_id in payload');
      return c.json({ ok: true, ignored: "no_order_id" });
    }

    // Locate the matching upgrade_request row. If we don't recognize the
    // order (e.g. some other Cashfree integration shares the secret), we
    // ack-200 so Cashfree doesn't retry — but log it for visibility.
    const [req] = await db.select().from(upgradeRequest)
      .where(eq(upgradeRequest.cashfreeOrderId, orderId)).limit(1);
    if (!req) {
      logger.warn({ orderId, eventType }, 'Cashfree webhook: unknown order_id');
      return c.json({ ok: true, ignored: "unknown_order" });
    }

    const paymentStatus = payload.data?.payment?.payment_status;
    const cfPaymentId = payload.data?.payment?.cf_payment_id
      ? String(payload.data.payment.cf_payment_id) : null;
    const paymentMethod = payload.data?.payment?.payment_group ?? null;

    // Always record the latest Cashfree-side details for audit
    await db.update(upgradeRequest).set({
      cashfreePaymentId: cfPaymentId,
      cashfreePaymentMethod: paymentMethod,
    }).where(eq(upgradeRequest.id, req.id));

    // PAYMENT_SUCCESS — activate the plan if not already activated
    if (eventType === "PAYMENT_SUCCESS_WEBHOOK" && paymentStatus === "SUCCESS") {
      if (req.status !== "completed") {
        await db.transaction(async (tx) => {
          await tx.update(user)
            .set({ plan: req.targetPlan })
            .where(eq(user.id, req.userId));
          await tx.update(upgradeRequest)
            .set({ status: "completed", completedAt: new Date() })
            .where(and(eq(upgradeRequest.id, req.id), sql_neq_completed));
        });
      }
      logger.info({ plan: req.targetPlan, userId: req.userId, orderId }, 'Cashfree: plan activated');
    } else if (eventType === "PAYMENT_FAILED_WEBHOOK" || paymentStatus === "FAILED" || paymentStatus === "USER_DROPPED") {
      // Don't touch user.plan — just mark the request declined so the
      // upgrade UI can surface a retry CTA.
      if (req.status === "requested" || req.status === "contacted") {
        await db.update(upgradeRequest).set({
          status: "declined",
          adminNotes: `Cashfree: ${payload.data?.payment?.payment_message ?? paymentStatus}`,
        }).where(eq(upgradeRequest.id, req.id));
      }
      logger.info({ paymentStatus, orderId }, 'Cashfree: payment failed/dropped');
    }
  } catch (err) {
    logger.error({ err }, 'Cashfree webhook processing error');
    // Still return 200 — we already verified signature; surfacing 500 makes
    // Cashfree retry which can mess with idempotency. Logs are the safety net.
  }

  return c.json({ ok: true }, 200);
});

// Idempotency guard — second activation must be a no-op
const sql_neq_completed = sql`${upgradeRequest.status} <> 'completed'`;

export default app;
