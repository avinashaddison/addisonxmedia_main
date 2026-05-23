import { Hono } from "hono";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import {
  broadcast,
  campaign,
  contact,
  conversation,
  deal,
  message,
  metaConfig,
  task,
} from "../db/schema";
import { requireAuth, type AuthVariables } from "../middleware/auth";
import { toCamel } from "../utils";
import { sendTemplateMessage, MetaApiError } from "../integrations/meta";
import { decrypt } from "../crypto";

const app = new Hono<{ Variables: AuthVariables }>();
app.use("*", requireAuth);

// ============================================================
// CONTACTS
// ============================================================

app.get("/contacts", async (c) => {
  const rows = await db.select().from(contact)
    .where(eq(contact.ownerId, c.var.userId))
    .orderBy(desc(contact.createdAt));
  return c.json(rows);
});

app.post("/contacts", async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(contact).values({
    ownerId: c.var.userId,
    name: body.name,
    phone: body.phone,
    email: body.email ?? null,
    source: body.source ?? null,
    tag: body.tag ?? "cold",
    score: body.score ?? 0,
    notes: body.notes ?? null,
  }).returning();
  return c.json(row, 201);
});

app.post("/contacts/upsert", async (c) => {
  const body = await c.req.json();
  // Upsert by (owner_id, phone)
  const [row] = await db.insert(contact).values({
    ownerId: c.var.userId,
    name: body.name,
    phone: body.phone,
    email: body.email ?? null,
    source: body.source ?? "Manual",
    tag: body.tag ?? "cold",
    score: body.score ?? 0,
  })
    .onConflictDoUpdate({
      target: [contact.ownerId, contact.phone],
      set: { name: body.name, email: body.email ?? null, updatedAt: new Date() },
    })
    .returning();
  return c.json(row);
});

// Bulk import — accepts up to 500 contacts in one request, upserts by phone.
// Returns a summary: imported / skipped / errors.
app.post("/contacts/bulk", async (c) => {
  const body = await c.req.json();
  const rows: Array<{ name?: string; phone?: string; email?: string; source?: string; tag?: string; score?: number }> = body.contacts ?? [];
  if (!Array.isArray(rows)) return c.json({ error: "contacts must be an array" }, 400);
  if (rows.length === 0) return c.json({ error: "No rows provided" }, 400);
  if (rows.length > 500) return c.json({ error: "Max 500 rows per request — split into batches" }, 400);

  // Validate + normalize. Skip rows missing name/phone, normalize phone to +91 format if 10 digits.
  type Valid = { ownerId: string; name: string; phone: string; email: string | null; source: string | null; tag: "hot" | "warm" | "cold"; score: number };
  const valid: Valid[] = [];
  const errors: Array<{ row: number; reason: string }> = [];
  rows.forEach((r, idx) => {
    if (!r.name?.trim() || !r.phone?.trim()) {
      errors.push({ row: idx + 1, reason: "Missing name or phone" });
      return;
    }
    let phone = r.phone.trim().replace(/[\s-()]/g, "");
    if (/^\d{10}$/.test(phone)) phone = `+91${phone}`;
    else if (!phone.startsWith("+")) phone = `+${phone}`;
    if (!/^\+\d{8,15}$/.test(phone)) {
      errors.push({ row: idx + 1, reason: "Invalid phone format" });
      return;
    }
    const tag = (["hot", "warm", "cold"] as const).includes(r.tag as any) ? (r.tag as "hot" | "warm" | "cold") : "cold";
    const score = Math.max(0, Math.min(100, Number(r.score ?? 0) || 0));
    valid.push({
      ownerId: c.var.userId,
      name: r.name.trim(),
      phone,
      email: r.email?.trim() || null,
      source: r.source?.trim() || "Import",
      tag,
      score,
    });
  });

  if (valid.length === 0) {
    return c.json({ imported: 0, skipped: errors.length, errors: errors.slice(0, 50) }, 400);
  }

  // Bulk upsert. ON CONFLICT (owner_id, phone) DO UPDATE → if a contact already exists,
  // update name/email/source but preserve tag/score (so re-imports don't downgrade hot leads).
  const inserted = await db.insert(contact).values(valid)
    .onConflictDoUpdate({
      target: [contact.ownerId, contact.phone],
      set: {
        name: sql`excluded.name`,
        email: sql`excluded.email`,
        source: sql`excluded.source`,
        updatedAt: new Date(),
      },
    })
    .returning({ id: contact.id });

  return c.json({
    imported: inserted.length,
    skipped: errors.length,
    errors: errors.slice(0, 50), // cap so payload doesn't explode
  });
});

app.patch("/contacts/:id", async (c) => {
  const id = c.req.param("id");
  const body = toCamel<Record<string, any>>(await c.req.json());
  const [row] = await db.update(contact)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(contact.id, id), eq(contact.ownerId, c.var.userId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

app.delete("/contacts/:id", async (c) => {
  const id = c.req.param("id");
  await db.delete(contact).where(and(eq(contact.id, id), eq(contact.ownerId, c.var.userId)));
  return c.body(null, 204);
});

// ============================================================
// DEALS (with contact join)
// ============================================================

app.get("/deals", async (c) => {
  const rows = await db.query.deal.findMany({
    where: eq(deal.ownerId, c.var.userId),
    orderBy: [desc(deal.updatedAt)],
    with: { contact: true },
  } as any);
  return c.json(rows);
});

app.post("/deals", async (c) => {
  const body = await c.req.json();
  if (!body.contact_id) return c.json({ error: "contact_id required" }, 400);
  // Verify the referenced contact belongs to the current user — prevents users
  // from creating deals against other users' contacts (FK integrity / data leak).
  const [owned] = await db.select({ id: contact.id }).from(contact)
    .where(and(eq(contact.id, body.contact_id), eq(contact.ownerId, c.var.userId)))
    .limit(1);
  if (!owned) return c.json({ error: "Contact not found" }, 404);
  const [row] = await db.insert(deal).values({
    ownerId: c.var.userId,
    contactId: body.contact_id,
    conversationId: body.conversation_id ?? null,
    title: body.title,
    value: body.value ?? "0",
    currency: body.currency ?? "INR",
    stage: body.stage ?? "new",
    probability: body.probability ?? 0,
    expectedCloseDate: body.expected_close_date ?? null,
  }).returning();
  return c.json(row, 201);
});

app.patch("/deals/:id", async (c) => {
  const id = c.req.param("id");
  const body = toCamel<Record<string, any>>(await c.req.json());

  // Snapshot previous stage so we can detect won-transitions and fire
  // a Meta Conversions API Purchase event server-side.
  const [prev] = await db.select({ stage: deal.stage })
    .from(deal)
    .where(and(eq(deal.id, id), eq(deal.ownerId, c.var.userId)))
    .limit(1);

  const [row] = await db.update(deal)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(deal.id, id), eq(deal.ownerId, c.var.userId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);

  // Fire CAPI Purchase on transition into 'won'. Async, never blocks
  // the response — failures only show up in /meta/capi/events.
  if (prev && prev.stage !== "won" && row.stage === "won") {
    void import("../lib/meta-capi").then((m) =>
      m.fireCapiSafely(() => m.firePurchaseEvent(c.var.userId, row.id), `deal_won:${row.id}`)
    );
  }

  return c.json(row);
});

app.delete("/deals/:id", async (c) => {
  const id = c.req.param("id");
  await db.delete(deal).where(and(eq(deal.id, id), eq(deal.ownerId, c.var.userId)));
  return c.body(null, 204);
});

// ============================================================
// CAMPAIGNS
// ============================================================

app.get("/campaigns", async (c) => {
  const rows = await db.select().from(campaign)
    .where(eq(campaign.ownerId, c.var.userId))
    .orderBy(desc(campaign.createdAt));
  return c.json(rows);
});

app.post("/campaigns", async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(campaign).values({
    ownerId: c.var.userId,
    name: body.name,
    description: body.description ?? null,
    channel: body.channel ?? "whatsapp",
    status: body.status ?? "draft",
    budget: body.budget ?? "0",
    audienceSize: body.audience_size ?? 0,
    scheduledAt: body.scheduled_at ?? null,
  }).returning();
  return c.json(row, 201);
});

app.patch("/campaigns/:id", async (c) => {
  const id = c.req.param("id");
  const body = toCamel<Record<string, any>>(await c.req.json());
  const [row] = await db.update(campaign)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(campaign.id, id), eq(campaign.ownerId, c.var.userId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

app.delete("/campaigns/:id", async (c) => {
  const id = c.req.param("id");
  await db.delete(campaign).where(and(eq(campaign.id, id), eq(campaign.ownerId, c.var.userId)));
  return c.body(null, 204);
});

// ============================================================
// BROADCASTS
// ============================================================

app.get("/broadcasts", async (c) => {
  const rows = await db.select().from(broadcast)
    .where(eq(broadcast.ownerId, c.var.userId))
    .orderBy(desc(broadcast.createdAt));
  return c.json(rows);
});

app.post("/broadcasts", async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(broadcast).values({
    ownerId: c.var.userId,
    campaignId: body.campaign_id ?? null,
    title: body.title,
    body: body.body,
    templateName: body.template_name ?? null,
    templateLanguage: body.template_language ?? "en",
    audienceTag: body.audience_tag ?? null,
    status: body.status ?? "draft",
    scheduledAt: body.scheduled_at ?? null,
    recipientCount: body.recipient_count ?? 0,
  }).returning();
  return c.json(row, 201);
});

app.patch("/broadcasts/:id", async (c) => {
  const id = c.req.param("id");
  const body = toCamel<Record<string, any>>(await c.req.json());
  const [row] = await db.update(broadcast)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(broadcast.id, id), eq(broadcast.ownerId, c.var.userId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

app.delete("/broadcasts/:id", async (c) => {
  const id = c.req.param("id");
  await db.delete(broadcast).where(and(eq(broadcast.id, id), eq(broadcast.ownerId, c.var.userId)));
  return c.body(null, 204);
});

// Actually send a broadcast via Meta. Iterates the audience, calls Meta's
// /messages endpoint with the approved template, records each send as an
// outbound message in the originating contact's conversation.
//
// Audience selection: if `audience_tag` is set on the broadcast, send to only
// contacts with that tag. Otherwise, send to all of the user's contacts.
app.post("/broadcasts/:id/send", async (c) => {
  const id = c.req.param("id");
  const userId = c.var.userId;

  const [bc] = await db.select().from(broadcast)
    .where(and(eq(broadcast.id, id), eq(broadcast.ownerId, userId))).limit(1);
  if (!bc) return c.json({ error: "Broadcast not found" }, 404);
  if (!bc.templateName) return c.json({
    error: "broadcast.template_name is required — pick an approved template before sending",
  }, 400);

  const [meta] = await db.select().from(metaConfig)
    .where(eq(metaConfig.userId, userId)).limit(1);
  if (!meta || !meta.enabled) {
    return c.json({ error: "WhatsApp not connected. Configure Meta in Settings." }, 412);
  }

  // Pick audience
  const audienceWhere = bc.audienceTag
    ? and(eq(contact.ownerId, userId), eq(contact.tag, bc.audienceTag))
    : eq(contact.ownerId, userId);
  const recipients = await db.select({
    id: contact.id, phone: contact.phone, name: contact.name,
  }).from(contact).where(audienceWhere);

  if (recipients.length === 0) {
    return c.json({ error: "No contacts in audience" }, 400);
  }

  // Mark as sending
  await db.update(broadcast).set({
    status: "sending",
    recipientCount: recipients.length,
    updatedAt: new Date(),
  }).where(eq(broadcast.id, id));

  let delivered = 0;
  let failed = 0;
  const recipientIds = recipients.map((r) => r.id);

  // Find or create a conversation per recipient so the broadcast is visible in inbox
  const existingConvs = await db.select().from(conversation)
    .where(and(eq(conversation.ownerId, userId), inArray(conversation.contactId, recipientIds)));
  const convByContact = new Map(existingConvs.map((cv) => [cv.contactId, cv]));

  // Bulk-create missing conversations
  const missingContactIds = recipientIds.filter((cid) => !convByContact.has(cid));
  if (missingContactIds.length > 0) {
    const newConvs = await db.insert(conversation).values(
      missingContactIds.map((cid) => ({
        contactId: cid,
        ownerId: userId,
        status: "open" as const,
        unreadCount: 0,
      }))
    ).returning();
    for (const cv of newConvs) convByContact.set(cv.contactId, cv);
  }

  // Send sequentially. (Meta has rate limits; for big lists, queue this in a worker.)
  for (const r of recipients) {
    try {
      const sent = await sendTemplateMessage(
        {
          accessToken: decrypt(meta.accessToken),
          phoneNumberId: meta.phoneNumberId,
          businessAccountId: meta.businessAccountId,
        },
        r.phone.replace(/^\+/, ""),
        bc.templateName,
        bc.templateLanguage ?? "en",
        // Pass contact name as first parameter (templates often use {{1}} for name)
        [r.name]
      );
      const metaMsgId = sent.messages?.[0]?.id ?? null;
      const conv = convByContact.get(r.id)!;
      await db.insert(message).values({
        conversationId: conv.id,
        ownerId: userId,
        senderId: userId,
        direction: "outbound",
        body: bc.body,
        status: "sent",
        twilioSid: metaMsgId,
      });
      await db.update(conversation).set({
        lastMessageAt: new Date(),
        lastMessagePreview: bc.body.slice(0, 200),
        updatedAt: new Date(),
      }).where(eq(conversation.id, conv.id));
      delivered++;
    } catch (err) {
      console.error(`[broadcast ${id}] send to ${r.phone} failed:`, err);
      failed++;
    }
  }

  // Final status
  const finalStatus = failed === recipients.length ? "failed" : "sent";
  const [updated] = await db.update(broadcast).set({
    status: finalStatus,
    sentAt: new Date(),
    deliveredCount: delivered,
    failedCount: failed,
    updatedAt: new Date(),
  }).where(eq(broadcast.id, id)).returning();

  return c.json({
    broadcast: updated,
    sent: delivered,
    failed,
    total: recipients.length,
  });
});

// ============================================================
// TASKS (FOLLOW-UPS) — with contact join
// ============================================================

app.get("/tasks", async (c) => {
  const rows = await db.query.task.findMany({
    where: eq(task.ownerId, c.var.userId),
    orderBy: [sql`${task.dueAt} ASC NULLS LAST`, desc(task.createdAt)],
    with: { contact: true },
  } as any);
  return c.json(rows);
});

app.post("/tasks", async (c) => {
  const body = await c.req.json();
  // If a contact is referenced, verify it belongs to the current user.
  if (body.contact_id) {
    const [owned] = await db.select({ id: contact.id }).from(contact)
      .where(and(eq(contact.id, body.contact_id), eq(contact.ownerId, c.var.userId)))
      .limit(1);
    if (!owned) return c.json({ error: "Contact not found" }, 404);
  }
  const [row] = await db.insert(task).values({
    ownerId: c.var.userId,
    contactId: body.contact_id ?? null,
    conversationId: body.conversation_id ?? null,
    title: body.title,
    notes: body.notes ?? null,
    dueAt: body.due_at ?? null,
    priority: body.priority ?? "medium",
    status: body.status ?? "pending",
  }).returning();
  return c.json(row, 201);
});

app.patch("/tasks/:id", async (c) => {
  const id = c.req.param("id");
  const body = toCamel<Record<string, any>>(await c.req.json());
  const [row] = await db.update(task)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(task.id, id), eq(task.ownerId, c.var.userId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

app.delete("/tasks/:id", async (c) => {
  const id = c.req.param("id");
  await db.delete(task).where(and(eq(task.id, id), eq(task.ownerId, c.var.userId)));
  return c.body(null, 204);
});

export default app;
