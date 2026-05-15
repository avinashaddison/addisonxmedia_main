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
  const rows = await db.query.conversation.findMany({
    where: eq(conversation.ownerId, c.var.userId),
    orderBy: [sql`${conversation.lastMessageAt} DESC NULLS LAST`, desc(conversation.createdAt)],
    with: { contact: true },
  });
  return c.json(rows);
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

// ============================================================
// MESSAGES (per conversation)
// ============================================================

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
