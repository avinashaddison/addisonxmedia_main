import { Hono } from "hono";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { db } from "../db/client";
import {
  broadcast,
  campaign,
  contact,
  deal,
  metaConfig,
  task,
  message,
  conversation,
} from "../db/schema";
import { decrypt } from "../crypto";
import { sendTextMessage } from "../integrations/meta";
import { requireAuth, type AuthVariables } from "../middleware/auth";
import { requirePlan } from "../middleware/requirePlan";
import { toCamel } from "../utils";
import { enqueueJob } from "../lib/job-queue";
import {
  patchContactSchema,
  patchDealSchema,
  patchCampaignSchema,
  patchBroadcastSchema,
  patchTaskSchema,
} from "../lib/validators";
import { parsePaginationParams, encodeCursor, wantsPagination } from "../lib/pagination";
import { logActivity } from "../lib/activity-log";

const app = new Hono<{ Variables: AuthVariables }>();
app.use("*", requireAuth);

// ============================================================
// CONTACTS
// ============================================================

app.get("/contacts", async (c) => {
  if (!wantsPagination(c)) {
    const rows = await db.select().from(contact)
      .where(eq(contact.ownerId, c.var.userId))
      .orderBy(desc(contact.createdAt))
      .limit(1000);
    return c.json(rows);
  }
  const { limit, cursor } = parsePaginationParams(c);
  const conds = [eq(contact.ownerId, c.var.userId)];
  if (cursor) conds.push(lt(contact.createdAt, cursor));
  const rows = await db.select().from(contact)
    .where(and(...conds))
    .orderBy(desc(contact.createdAt))
    .limit(limit);
  const next_cursor = rows.length === limit ? encodeCursor(rows[rows.length - 1].createdAt) : null;
  return c.json({ data: rows, next_cursor });
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

  logActivity(c.var.userId, 'bulk_import', {
    resourceType: 'contact',
    metadata: { imported: inserted.length },
  });

  return c.json({
    imported: inserted.length,
    skipped: errors.length,
    errors: errors.slice(0, 50), // cap so payload doesn't explode
  });
});

app.patch("/contacts/:id", async (c) => {
  const id = c.req.param("id");
  const raw = toCamel<Record<string, any>>(await c.req.json());
  const body = patchContactSchema.parse(raw);
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
  if (!wantsPagination(c)) {
    const rows = await db.query.deal.findMany({
      where: eq(deal.ownerId, c.var.userId),
      orderBy: [desc(deal.updatedAt)],
      with: { contact: true },
      limit: 1000,
    } as any);
    return c.json(rows);
  }
  const { limit, cursor } = parsePaginationParams(c);
  const conds = [eq(deal.ownerId, c.var.userId)];
  if (cursor) conds.push(lt(deal.updatedAt, cursor));
  const rows = await db.query.deal.findMany({
    where: and(...conds),
    orderBy: [desc(deal.updatedAt)],
    with: { contact: true },
    limit,
  } as any);
  const next_cursor = rows.length === limit ? encodeCursor((rows[rows.length - 1] as any).updatedAt) : null;
  return c.json({ data: rows, next_cursor });
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
  const raw = toCamel<Record<string, any>>(await c.req.json());
  const body = patchDealSchema.parse(raw);

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
  if (!wantsPagination(c)) {
    const rows = await db.select().from(campaign)
      .where(eq(campaign.ownerId, c.var.userId))
      .orderBy(desc(campaign.createdAt))
      .limit(1000);
    return c.json(rows);
  }
  const { limit, cursor } = parsePaginationParams(c);
  const conds = [eq(campaign.ownerId, c.var.userId)];
  if (cursor) conds.push(lt(campaign.createdAt, cursor));
  const rows = await db.select().from(campaign)
    .where(and(...conds))
    .orderBy(desc(campaign.createdAt))
    .limit(limit);
  const next_cursor = rows.length === limit ? encodeCursor(rows[rows.length - 1].createdAt) : null;
  return c.json({ data: rows, next_cursor });
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
  const raw = toCamel<Record<string, any>>(await c.req.json());
  const body = patchCampaignSchema.parse(raw);
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
  if (!wantsPagination(c)) {
    const rows = await db.select().from(broadcast)
      .where(eq(broadcast.ownerId, c.var.userId))
      .orderBy(desc(broadcast.createdAt))
      .limit(1000);
    return c.json(rows);
  }
  const { limit, cursor } = parsePaginationParams(c);
  const conds = [eq(broadcast.ownerId, c.var.userId)];
  if (cursor) conds.push(lt(broadcast.createdAt, cursor));
  const rows = await db.select().from(broadcast)
    .where(and(...conds))
    .orderBy(desc(broadcast.createdAt))
    .limit(limit);
  const next_cursor = rows.length === limit ? encodeCursor(rows[rows.length - 1].createdAt) : null;
  return c.json({ data: rows, next_cursor });
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
  const raw = toCamel<Record<string, any>>(await c.req.json());
  const body = patchBroadcastSchema.parse(raw);
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

// Enqueue broadcast send as a background job. The actual send logic runs
// in server/jobs/broadcast-send.ts via the job queue worker.
//
// Audience selection: if `audience_tag` is set on the broadcast, send to only
// contacts with that tag. Otherwise, send to all of the user's contacts.
app.post("/broadcasts/:id/send", requirePlan('growth', 'scale', 'enterprise'), async (c) => {
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

  // Pick audience to get recipient count
  const audienceWhere = bc.audienceTag
    ? and(eq(contact.ownerId, userId), eq(contact.tag, bc.audienceTag))
    : eq(contact.ownerId, userId);
  const recipients = await db.select({
    id: contact.id,
  }).from(contact).where(audienceWhere);

  if (recipients.length === 0) {
    return c.json({ error: "No contacts in audience" }, 400);
  }

  // Mark as sending and enqueue background job
  const [updated] = await db.update(broadcast).set({
    status: "sending",
    recipientCount: recipients.length,
    updatedAt: new Date(),
  }).where(eq(broadcast.id, id)).returning();

  await enqueueJob('broadcast_send', { broadcastId: id, userId });

  logActivity(userId, 'broadcast_send', { resourceType: 'broadcast', resourceId: id });

  return c.json({
    broadcast: updated,
    status: 'queued',
    recipient_count: recipients.length,
  });
});

// GET /broadcasts/eligible-24h — get all active 24-hour free chat windows
app.get("/broadcasts/eligible-24h", async (c) => {
  const userId = c.var.userId;
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Find all conversations where the latest inbound message is in the last 24 hours
  const rows = await db
    .select({
      conversationId: conversation.id,
      contactId: contact.id,
      contactName: contact.name,
      contactPhone: contact.phone,
      lastInboundAt: sql<Date>`MAX(${message.createdAt})`,
    })
    .from(conversation)
    .innerJoin(contact, eq(conversation.contactId, contact.id))
    .innerJoin(message, eq(conversation.id, message.conversationId))
    .where(
      and(
        eq(conversation.ownerId, userId),
        eq(message.direction, "inbound"),
        sql`${message.createdAt} >= ${twentyFourHoursAgo}`
      )
    )
    .groupBy(conversation.id, contact.id, contact.name, contact.phone)
    .orderBy(desc(sql`MAX(${message.createdAt})`));

  const eligibleChats = rows.map((r) => {
    const lastInboundAt = new Date(r.lastInboundAt);
    const expiresAt = new Date(lastInboundAt.getTime() + 24 * 60 * 60 * 1000);
    const minutesRemaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / (60 * 1000)));

    return {
      conversation_id: r.conversationId,
      contact_id: r.contactId,
      contact_name: r.contactName,
      contact_phone: r.contactPhone,
      last_inbound_at: lastInboundAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      minutes_remaining: minutesRemaining,
    };
  });

  return c.json({ eligible_chats: eligibleChats });
});

// POST /broadcasts/bulk-send-24h — bulk-send text message to eligible 24h chats
app.post("/broadcasts/bulk-send-24h", requirePlan('growth', 'scale', 'enterprise'), async (c) => {
  const userId = c.var.userId;
  const body = await c.req.json();
  const textBody = body.body?.trim();
  const targetContactIds = body.contact_ids as string[] | undefined;

  if (!textBody) {
    return c.json({ error: "Message body is required" }, 400);
  }

  // 1. Get Meta credentials
  const [meta] = await db.select().from(metaConfig)
    .where(eq(metaConfig.userId, userId)).limit(1);
  if (!meta || !meta.enabled) {
    return c.json({ error: "WhatsApp not connected. Configure Meta in Settings." }, 412);
  }

  // 2. Fetch all eligible conversations (to verify they are within 24h window)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      conversationId: conversation.id,
      contactId: contact.id,
      contactName: contact.name,
      contactPhone: contact.phone,
      lastInboundAt: sql<Date>`MAX(${message.createdAt})`,
    })
    .from(conversation)
    .innerJoin(contact, eq(conversation.contactId, contact.id))
    .innerJoin(message, eq(conversation.id, message.conversationId))
    .where(
      and(
        eq(conversation.ownerId, userId),
        eq(message.direction, "inbound"),
        sql`${message.createdAt} >= ${twentyFourHoursAgo}`
      )
    )
    .groupBy(conversation.id, contact.id, contact.name, contact.phone);

  let eligible = rows.map((r) => ({
    conversationId: r.conversationId,
    contactId: r.contactId,
    contactName: r.contactName,
    contactPhone: r.contactPhone,
  }));

  // If a subset of contacts was selected, filter by those IDs
  if (targetContactIds && targetContactIds.length > 0) {
    eligible = eligible.filter((ch) => targetContactIds.includes(ch.contactId));
  }

  if (eligible.length === 0) {
    return c.json({ error: "No eligible contacts found within 24-hour window" }, 400);
  }

  const credentials = {
    accessToken: decrypt(meta.accessToken),
    phoneNumberId: meta.phoneNumberId,
    businessAccountId: meta.businessAccountId,
  };

  let sentCount = 0;
  let failedCount = 0;
  const details: Array<{ contact_id: string; status: "sent" | "failed"; error?: string }> = [];

  for (const ch of eligible) {
    // Personalize message body (replace {{name}} with the contact's name)
    const personalizedBody = textBody.replace(/{{\s*name\s*}}/gi, ch.contactName);

    try {
      const response = await sendTextMessage(
        credentials,
        ch.contactPhone.replace(/^\+/, ""),
        personalizedBody
      );

      const metaMsgId = response.messages?.[0]?.id ?? null;

      // Save outbound message to DB
      await db.insert(message).values({
        conversationId: ch.conversationId,
        ownerId: userId,
        senderId: userId,
        direction: "outbound",
        body: personalizedBody,
        status: "sent",
        externalMessageId: metaMsgId,
      });

      // Update conversation last message timestamp & preview
      await db.update(conversation).set({
        lastMessageAt: new Date(),
        lastMessagePreview: personalizedBody.slice(0, 200),
        updatedAt: new Date(),
      }).where(eq(conversation.id, ch.conversationId));

      sentCount++;
      details.push({ contact_id: ch.contactId, status: "sent" });
    } catch (err) {
      failedCount++;
      details.push({
        contact_id: ch.contactId,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  logActivity(userId, 'bulk_send_24h', {
    resourceType: 'broadcast',
    metadata: { sentCount, failedCount },
  });

  return c.json({
    sent_count: sentCount,
    failed_count: failedCount,
    details,
  });
});

// ============================================================
// TASKS (FOLLOW-UPS) — with contact join
// ============================================================

app.get("/tasks", async (c) => {
  if (!wantsPagination(c)) {
    const rows = await db.query.task.findMany({
      where: eq(task.ownerId, c.var.userId),
      orderBy: [sql`${task.dueAt} ASC NULLS LAST`, desc(task.createdAt)],
      with: { contact: true },
      limit: 1000,
    } as any);
    return c.json(rows);
  }
  const { limit, cursor } = parsePaginationParams(c);
  const conds = [eq(task.ownerId, c.var.userId)];
  if (cursor) conds.push(lt(task.createdAt, cursor));
  const rows = await db.query.task.findMany({
    where: and(...conds),
    orderBy: [sql`${task.dueAt} ASC NULLS LAST`, desc(task.createdAt)],
    with: { contact: true },
    limit,
  } as any);
  const next_cursor = rows.length === limit ? encodeCursor((rows[rows.length - 1] as any).createdAt) : null;
  return c.json({ data: rows, next_cursor });
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
  const raw = toCamel<Record<string, any>>(await c.req.json());
  const body = patchTaskSchema.parse(raw);
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
