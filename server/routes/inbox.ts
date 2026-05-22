import { Hono } from "hono";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { contact, conversation, message, metaConfig } from "../db/schema";
import { requireAuth, type AuthVariables } from "../middleware/auth";
import { sendTextMessage, MetaApiError } from "../integrations/meta";
import { toCamel } from "../utils";
import { decrypt } from "../crypto";

const app = new Hono<{ Variables: AuthVariables }>();
app.use("*", requireAuth);

// ============================================================
// CONVERSATIONS — list with contact joined
// ============================================================

app.get("/conversations", async (c) => {
  // Plain select + join — was using `db.query.conversation.findMany` with
  // Drizzle's relations API, which silently returned [] in one production
  // session even though the underlying rows existed (status endpoint reported
  // count=4 for the same user_id). Hand-rolling the join eliminates the
  // relations-resolution dependency.
  //
  // NOTE: we intentionally don't select the ad-attribution columns
  // (source_ad_id, source_headline, ctwa_click_id, source_type — migration
  // 0010_ad_attribution.sql). They may not exist in every database yet, and
  // the inbox list doesn't render them. Adding them back is safe once the
  // migration has been applied everywhere.
  try {
    const rows = await db
      .select({
        id: conversation.id,
        ownerId: conversation.ownerId,
        contactId: conversation.contactId,
        status: conversation.status,
        unreadCount: conversation.unreadCount,
        lastMessageAt: conversation.lastMessageAt,
        lastMessagePreview: conversation.lastMessagePreview,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        // joined contact (nested manually below)
        contact_id: contact.id,
        contact_ownerId: contact.ownerId,
        contact_name: contact.name,
        contact_phone: contact.phone,
        contact_email: contact.email,
        contact_tag: contact.tag,
        contact_score: contact.score,
        contact_source: contact.source,
        contact_notes: contact.notes,
        contact_createdAt: contact.createdAt,
        contact_updatedAt: contact.updatedAt,
      })
      .from(conversation)
      .leftJoin(contact, eq(contact.id, conversation.contactId))
      .where(eq(conversation.ownerId, c.var.userId))
      .orderBy(sql`${conversation.lastMessageAt} DESC NULLS LAST`, desc(conversation.createdAt));

    const shaped = rows.map((r) => ({
      id: r.id,
      ownerId: r.ownerId,
      contactId: r.contactId,
      status: r.status,
      unreadCount: r.unreadCount,
      lastMessageAt: r.lastMessageAt,
      lastMessagePreview: r.lastMessagePreview,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      contact: r.contact_id
        ? {
            id: r.contact_id,
            ownerId: r.contact_ownerId,
            name: r.contact_name,
            phone: r.contact_phone,
            email: r.contact_email,
            tag: r.contact_tag,
            score: r.contact_score,
            source: r.contact_source,
            notes: r.contact_notes,
            createdAt: r.contact_createdAt,
            updatedAt: r.contact_updatedAt,
          }
        : null,
    }));

    return c.json(shaped);
  } catch (err) {
    // Surface the actual DB error to logs + frontend so future "500 with no
    // detail" can be debugged in one round-trip instead of three.
    console.error("[GET /api/conversations]", err);
    return c.json({
      error: "conversation_query_failed",
      detail: (err as Error)?.message ?? String(err),
    }, 500);
  }
});

/* Returns the user's inbox-side health: WhatsApp connection state + tiny
 * counts. Used by the inbox empty-state to decide between
 *   - "Connect WhatsApp to receive chats"
 *   - "Your connection is pending verification"
 *   - "You're connected — share your number to start receiving chats"
 * The previous empty state said "Click + above" regardless of whether the
 * user had even connected WhatsApp, which routed them to support instead of
 * the next correct action. */
app.get("/inbox/status", async (c) => {
  const userId = c.var.userId;
  const userEmail = c.var.userEmail;
  const [cfg] = await db.select().from(metaConfig).where(eq(metaConfig.userId, userId)).limit(1);
  const [{ n: conversationCount }] = await db
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(conversation)
    .where(eq(conversation.ownerId, userId));

  return c.json({
    meta_connected: !!cfg,
    meta_enabled: cfg?.enabled ?? false,
    display_phone_number: cfg?.displayPhoneNumber ?? null,
    last_verified_at: cfg?.lastVerifiedAt ?? null,
    conversation_count: conversationCount,
    // Whoami — exposes who the API actually thinks you are so empty-inbox
    // mysteries ("admin shows 4 chats, my inbox shows 0") can be diagnosed
    // without DevTools. Surfaced as a small debug strip in InboxPage when
    // conversation_count is 0.
    session_user_id: userId,
    session_email: userEmail,
  });
});

app.post("/conversations", async (c) => {
  const body = await c.req.json();
  // Find or upsert the contact first by (owner_id, phone)
  const [contactRow] = await db.insert(contact)
    .values({
      ownerId: c.var.userId,
      name: body.name,
      phone: body.phone,
      email: body.email ?? null,
      source: body.source ?? "Manual",
    })
    .onConflictDoUpdate({
      target: [contact.ownerId, contact.phone],
      set: { name: body.name, updatedAt: new Date() },
    })
    .returning();

  // If a conversation already exists for this contact, return it
  const existing = await db.select().from(conversation).where(
    and(eq(conversation.contactId, contactRow.id), eq(conversation.ownerId, c.var.userId))
  ).limit(1);
  if (existing[0]) return c.json(existing[0]);

  const [conv] = await db.insert(conversation).values({
    contactId: contactRow.id,
    ownerId: c.var.userId,
    status: "open",
  }).returning();
  return c.json(conv, 201);
});

app.patch("/conversations/:id", async (c) => {
  const id = c.req.param("id");
  const body = toCamel<Record<string, any>>(await c.req.json());
  const [row] = await db.update(conversation)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(conversation.id, id), eq(conversation.ownerId, c.var.userId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

/* Delete conversation — and all of its messages. We don't soft-delete: if
 * an operator removes a chat from their inbox they expect it gone, not
 * stuck in a hidden archive. Messages cascade via FK. */
app.delete("/conversations/:id", async (c) => {
  const id = c.req.param("id");
  // First confirm ownership; refuse silently 404 otherwise so we never reveal
  // existence of a conversation belonging to another workspace.
  const [existing] = await db.select({ id: conversation.id })
    .from(conversation)
    .where(and(eq(conversation.id, id), eq(conversation.ownerId, c.var.userId)))
    .limit(1);
  if (!existing) return c.json({ error: "Not found" }, 404);

  // Messages reference conversation_id with onDelete: cascade per schema,
  // so deleting the conversation also wipes its messages in a single query.
  await db.delete(conversation)
    .where(and(eq(conversation.id, id), eq(conversation.ownerId, c.var.userId)));
  return c.json({ ok: true });
});

// ============================================================
// MESSAGES (per conversation)
// ============================================================

/**
 * Media proxy — streams WhatsApp inbound images/videos/audio/documents
 * through our server.
 *
 * Why we can't link the Meta URL directly:
 *   1. Meta's media URLs require Authorization: Bearer <token>; can't fetch
 *      via plain <img src> in the browser
 *   2. Tokens shouldn't leak to the browser anyway
 *   3. Meta's URLs expire in ~5 minutes
 *
 * Flow:
 *   GET /api/inbox/messages/:id/media
 *     → look up message + user's meta_config
 *     → extract Meta media_id (stored in media_url as "meta:{id}")
 *     → GET /v21.0/{media_id} with the user's encrypted token → returns the
 *       real binary URL
 *     → fetch that URL with the same Bearer auth → stream bytes to client
 */
app.get("/messages/:id/media", async (c) => {
  const messageId = c.req.param("id");
  const userId = c.var.userId;

  // 1. Look up the message + verify ownership
  const [msg] = await db.select().from(message)
    .where(and(eq(message.id, messageId), eq(message.ownerId, userId)))
    .limit(1);
  if (!msg) return c.json({ error: "Message not found" }, 404);
  if (!msg.mediaUrl?.startsWith("meta:")) {
    return c.json({ error: "No media for this message" }, 404);
  }
  // Accept both formats:
  //   "meta:{id}"        ← legacy webhook entries
  //   "meta:{type}:{id}" ← current shape (type ∈ image/video/audio/document/sticker)
  const rest = msg.mediaUrl.slice("meta:".length);
  const parts = rest.split(":");
  const mediaId = parts.length > 1 ? parts[1] : parts[0];

  // 2. Get the user's Meta access token
  const [cfg] = await db.select().from(metaConfig)
    .where(eq(metaConfig.userId, userId)).limit(1);
  if (!cfg?.accessToken) {
    return c.json({ error: "Meta WhatsApp not connected" }, 400);
  }
  const token = decrypt(cfg.accessToken);

  try {
    // 3. Resolve media_id → binary URL
    const metaUrlRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}?fields=url,mime_type,sha256,file_size`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!metaUrlRes.ok) {
      const body = await metaUrlRes.text();
      console.error("[media-proxy] resolve failed", metaUrlRes.status, body);
      return c.json({ error: "Could not resolve media URL from Meta" }, 502);
    }
    const meta = await metaUrlRes.json() as { url?: string; mime_type?: string; file_size?: number };
    if (!meta.url) return c.json({ error: "Meta returned no URL" }, 502);

    // 4. Fetch the binary with the same auth
    const binRes = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": "AddisonX/1.0" },
    });
    if (!binRes.ok) {
      console.error("[media-proxy] download failed", binRes.status);
      return c.json({ error: "Could not download media binary" }, 502);
    }

    // 5. Stream to client
    const mime = meta.mime_type ?? binRes.headers.get("content-type") ?? "application/octet-stream";
    return new Response(binRes.body, {
      status: 200,
      headers: {
        "Content-Type": mime,
        // Cache aggressively — once we've fetched, the binary itself doesn't
        // change. The Meta URL expires but our endpoint stays stable.
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (e) {
    console.error("[media-proxy] error", e);
    return c.json({ error: "Media proxy failed" }, 502);
  }
});

app.get("/conversations/:id/messages", async (c) => {
  const conversationId = c.req.param("id");
  // Confirm ownership
  const [conv] = await db.select({ id: conversation.id }).from(conversation)
    .where(and(eq(conversation.id, conversationId), eq(conversation.ownerId, c.var.userId)))
    .limit(1);
  if (!conv) return c.json({ error: "Not found" }, 404);

  const rows = await db.select().from(message)
    .where(eq(message.conversationId, conversationId))
    .orderBy(asc(message.createdAt));
  return c.json(rows);
});

app.post("/conversations/:id/messages", async (c) => {
  const conversationId = c.req.param("id");
  const body = await c.req.json();
  const userId = c.var.userId;

  // Confirm ownership and fetch contact phone for outbound send
  const [convRow] = await db.select({
    id: conversation.id,
    contactId: conversation.contactId,
  }).from(conversation)
    .where(and(eq(conversation.id, conversationId), eq(conversation.ownerId, userId)))
    .limit(1);
  if (!convRow) return c.json({ error: "Not found" }, 404);

  const direction = body.direction ?? "outbound";
  let metaMessageId: string | null = null;
  let initialStatus: "queued" | "sent" | "delivered" | "read" | "failed" = body.status ?? "sent";

  // If this is an outbound message, try to send via Meta WhatsApp API.
  // Falls back to dry-run (status: sent, no real send) if no config exists.
  if (direction === "outbound") {
    const [meta] = await db.select().from(metaConfig)
      .where(eq(metaConfig.userId, userId)).limit(1);

    if (meta && meta.enabled) {
      const [recipient] = await db.select({ phone: contact.phone }).from(contact)
        .where(and(eq(contact.id, convRow.contactId), eq(contact.ownerId, userId)))
        .limit(1);
      if (!recipient) return c.json({ error: "Contact not found" }, 404);

      try {
        const sent = await sendTextMessage(
          {
            accessToken: decrypt(meta.accessToken),
            phoneNumberId: meta.phoneNumberId,
            businessAccountId: meta.businessAccountId,
          },
          recipient.phone.replace(/^\+/, ""), // Meta wants E.164 without "+"
          String(body.body)
        );
        metaMessageId = sent.messages?.[0]?.id ?? null;
        initialStatus = "sent";
      } catch (err) {
        console.error("[messages] Meta send failed", err);
        initialStatus = "failed";
        // Persist the failed attempt so the UI can show the error state.
        const errorMsg = err instanceof MetaApiError ? err.message : "Send failed";
        const [failedMsg] = await db.insert(message).values({
          conversationId,
          ownerId: userId,
          senderId: userId,
          direction: "outbound",
          body: body.body,
          status: "failed",
          isAiGenerated: body.is_ai_generated ?? false,
        }).returning();
        return c.json({ ...failedMsg, error: errorMsg }, 502);
      }
    }
    // If no Meta config, status stays "sent" (dry-run mode for development).
  }

  const [msg] = await db.insert(message).values({
    conversationId,
    ownerId: userId,
    senderId: userId,
    direction,
    body: body.body,
    mediaUrl: body.media_url ?? null,
    status: initialStatus,
    twilioSid: metaMessageId, // Repurposed for Meta message id
    isAiGenerated: body.is_ai_generated ?? false,
  }).returning();

  // Update conversation preview + clear unread (since the user just replied).
  await db.update(conversation).set({
    lastMessageAt: msg.createdAt,
    lastMessagePreview: String(body.body).slice(0, 200),
    unreadCount: 0,
    updatedAt: new Date(),
  }).where(and(eq(conversation.id, conversationId), eq(conversation.ownerId, userId)));

  return c.json(msg, 201);
});

export default app;
