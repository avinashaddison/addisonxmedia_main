import { Hono } from "hono";
import { and, count, desc, eq, gt, ilike, or, sql } from "drizzle-orm";
import { db } from "../db/client";
import {
  broadcast,
  campaign,
  contact,
  conversation,
  deal,
  message,
  profile,
  task,
} from "../db/schema";
import { requireAuth, type AuthVariables } from "../middleware/auth";

const app = new Hono<{ Variables: AuthVariables }>();
app.use("*", requireAuth);

// ============================================================
// PROFILE
// ============================================================

app.get("/profile", async (c) => {
  const [row] = await db.select().from(profile)
    .where(eq(profile.userId, c.var.userId)).limit(1);
  return c.json(row ?? null);
});

app.patch("/profile", async (c) => {
  const body = await c.req.json();
  const [row] = await db.update(profile)
    .set({
      displayName: body.display_name ?? null,
      phone: body.phone ?? null,
      avatarUrl: body.avatar_url ?? null,
      updatedAt: new Date(),
    })
    .where(eq(profile.userId, c.var.userId))
    .returning();
  return c.json(row);
});

// ============================================================
// SIDEBAR BADGES — total unread + pending tasks
// ============================================================

app.get("/sidebar/badges", async (c) => {
  const userId = c.var.userId;
  const [unreadAgg] = await db.select({
    total: sql<number>`COALESCE(SUM(${conversation.unreadCount}), 0)::int`,
  }).from(conversation).where(
    and(eq(conversation.ownerId, userId), gt(conversation.unreadCount, 0))
  );
  const [tasksAgg] = await db.select({ count: count() }).from(task).where(
    and(eq(task.ownerId, userId), eq(task.status, "pending"))
  );
  return c.json({ inbox: unreadAgg?.total ?? 0, tasks: tasksAgg?.count ?? 0 });
});

// ============================================================
// DASHBOARD aggregate (replaces 6 parallel supabase.from calls)
// ============================================================

app.get("/dashboard", async (c) => {
  const userId = c.var.userId;
  // Only ship data the dashboard actually uses. Time-series widgets only need
  // the last 90 days; the funnel/KPI tiles compute against all-time but only
  // need IDs and a few columns.
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000);

  const [contacts, conversations, messages, deals, tasks, campaigns] = await Promise.all([
    // Contacts: shipped to power "Total" / "Hot leads" / weekly trends + recent list.
    // Hard cap at 1000 to keep the payload sane on large workspaces; the page
    // only renders top 5–10 anyway.
    db.select({
      id: contact.id, name: contact.name, phone: contact.phone,
      tag: contact.tag, score: contact.score, created_at: contact.createdAt,
    }).from(contact).where(eq(contact.ownerId, userId))
      .orderBy(desc(contact.createdAt)).limit(1000),

    // Conversations: only need active ones for the inbox preview + unread totals.
    db.select({
      id: conversation.id, status: conversation.status, unread_count: conversation.unreadCount,
      last_message_at: conversation.lastMessageAt, last_message_preview: conversation.lastMessagePreview,
      contact_id: conversation.contactId,
    }).from(conversation).where(eq(conversation.ownerId, userId))
      .orderBy(desc(conversation.lastMessageAt)).limit(500),

    // Messages: only used for sparklines / trends, last 90 days is plenty.
    db.select({
      id: message.id, created_at: message.createdAt, direction: message.direction,
    }).from(message).where(and(
      eq(message.ownerId, userId),
      gt(message.createdAt, ninetyDaysAgo),
    )),

    // Deals: small relative to messages; ship all-time so funnel + revenue WoW can compute.
    db.select({
      id: deal.id, value: deal.value, stage: deal.stage,
      title: deal.title, contact_id: deal.contactId,
      closed_at: deal.closedAt, created_at: deal.createdAt, updated_at: deal.updatedAt,
    }).from(deal).where(eq(deal.ownerId, userId)),

    // Tasks: only pending matter to the dashboard. Cap at 200 — the panel shows top 6.
    db.select({
      id: task.id, status: task.status, due_at: task.dueAt,
      priority: task.priority, title: task.title, contact_id: task.contactId,
      created_at: task.createdAt,
    }).from(task).where(and(eq(task.ownerId, userId), eq(task.status, "pending")))
      .orderBy(sql`${task.dueAt} ASC NULLS LAST`).limit(200),

    db.select({
      id: campaign.id, name: campaign.name, status: campaign.status,
      sent_count: campaign.sentCount, replied_count: campaign.repliedCount,
      conversion_count: campaign.conversionCount, created_at: campaign.createdAt,
    }).from(campaign).where(eq(campaign.ownerId, userId)),
  ]);
  return c.json({ contacts, conversations, messages, deals, tasks, campaigns });
});

// ============================================================
// ANALYTICS aggregate
// ============================================================

app.get("/analytics", async (c) => {
  const userId = c.var.userId;
  // Analytics widgets only need the last 90 days. Returning every message
  // ever for an active workspace was a 5MB+ payload over a 250ms link.
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000);

  const [contacts, conversations, messages, deals, campaigns, broadcasts] = await Promise.all([
    db.select({
      id: contact.id, tag: contact.tag, source: contact.source, created_at: contact.createdAt,
    }).from(contact).where(eq(contact.ownerId, userId)),
    db.select({
      id: conversation.id, created_at: conversation.createdAt,
    }).from(conversation).where(eq(conversation.ownerId, userId)),
    db.select({
      id: message.id, direction: message.direction, created_at: message.createdAt,
      is_ai_generated: message.isAiGenerated, conversation_id: message.conversationId,
    }).from(message).where(and(
      eq(message.ownerId, userId),
      gt(message.createdAt, ninetyDaysAgo),
    )),
    db.select({
      id: deal.id, value: deal.value, stage: deal.stage,
      created_at: deal.createdAt, closed_at: deal.closedAt, updated_at: deal.updatedAt,
    }).from(deal).where(eq(deal.ownerId, userId)),
    db.select().from(campaign).where(eq(campaign.ownerId, userId)),
    db.select().from(broadcast).where(eq(broadcast.ownerId, userId)),
  ]);
  return c.json({ contacts, conversations, messages, deals, campaigns, broadcasts });
});

// ============================================================
// SEARCH — global (contacts, conversations, deals)
// ============================================================

app.get("/search", async (c) => {
  const userId = c.var.userId;
  const q = (c.req.query("q") ?? "").trim();
  if (!q) return c.json({ contacts: [], conversations: [], deals: [] });
  const term = `%${q}%`;

  const [contacts, conversations, deals] = await Promise.all([
    db.select({
      id: contact.id, name: contact.name, phone: contact.phone, tag: contact.tag,
    }).from(contact).where(and(
      eq(contact.ownerId, userId),
      or(ilike(contact.name, term), ilike(contact.phone, term))
    )).limit(4),
    db.select({
      id: conversation.id, last_message_preview: conversation.lastMessagePreview,
      contact_name: contact.name,
    }).from(conversation)
      .leftJoin(contact, eq(contact.id, conversation.contactId))
      .where(and(
        eq(conversation.ownerId, userId),
        ilike(conversation.lastMessagePreview, term)
      )).limit(4),
    db.select({
      id: deal.id, title: deal.title, value: deal.value, stage: deal.stage,
    }).from(deal).where(and(
      eq(deal.ownerId, userId),
      ilike(deal.title, term)
    )).limit(4),
  ]);

  return c.json({ contacts, conversations, deals });
});

// ============================================================
// SEED — port of supabase/functions/seed-demo-data
// ============================================================

const FIRST = ["Priya", "Rohan", "Anika", "Vikram", "Aditi", "Karan", "Meera", "Arjun", "Sneha", "Rahul", "Isha", "Nikhil"];
const LAST = ["Mehta", "Kapoor", "Sharma", "Tandon", "Reddy", "Iyer", "Singh", "Patel", "Agarwal", "Verma"];
const SOURCES = ["Instagram Ad", "Facebook Lead", "Google Ad", "Referral", "Website", "Cold Outreach"];
const TAGS = ["hot", "hot", "warm", "warm", "warm", "cold"] as const;

const HOT_OPENERS = [
  "Hey! Saw your ad. What's the price for 100 students?",
  "Interested in your Growth plan. Can we hop on a call?",
  "Loved the demo. How fast can we onboard?",
  "Can you send pricing for our team of 12?",
  "We're ready to buy. What's the next step?",
];
const WARM_OPENERS = [
  "Just browsing — what makes you different?",
  "How does the AI work exactly?",
  "Do you support multiple WhatsApp numbers?",
  "Can I see a case study?",
];
const REPLIES = [
  "Hi! Absolutely — sharing a quick overview now ✨",
  "Great question! Our AI scores every lead in real time.",
  "Yes — and you can send pay links straight from the chat.",
  "Sending you a 90-second video walkthrough 🎥",
  "Perfect — let me grab a slot on Tuesday.",
];

const rand = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];
const phone = () => `+9198${Math.floor(10000000 + Math.random() * 89999999)}`;
const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000);
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000);

app.post("/seed", async (c) => {
  const userId = c.var.userId;

  // Skip if already seeded (>5 contacts)
  const existing = await db.select({ id: contact.id }).from(contact)
    .where(eq(contact.ownerId, userId)).limit(6);
  if (existing.length > 5) {
    return c.json({ skipped: true, reason: "already seeded" });
  }

  // Insert ~12 contacts
  const contactRows = Array.from({ length: 12 }, () => {
    const f = rand(FIRST), l = rand(LAST);
    const tag = rand(TAGS);
    return {
      ownerId: userId,
      name: `${f} ${l}`,
      phone: phone(),
      email: `${f.toLowerCase()}.${l.toLowerCase()}@example.com`,
      source: rand(SOURCES),
      tag,
      score: tag === "hot" ? 70 + Math.floor(Math.random() * 30) :
             tag === "warm" ? 35 + Math.floor(Math.random() * 30) :
             Math.floor(Math.random() * 30),
    };
  });
  const contacts = await db.insert(contact).values(contactRows)
    .onConflictDoNothing({ target: [contact.ownerId, contact.phone] })
    .returning();

  // Build all conversation rows + opener/reply pairs in memory, then INSERT in batch.
  type Pair = { contactId: string; opener: string; reply: string };
  const pairs: Pair[] = contacts.map((ctc) => ({
    contactId: ctc.id,
    opener: ctc.tag === "hot" ? rand(HOT_OPENERS)
      : ctc.tag === "warm" ? rand(WARM_OPENERS)
      : "Hey, just got your number from a friend",
    reply: rand(REPLIES),
  }));

  const convRows = await db.insert(conversation).values(
    pairs.map(({ contactId, opener }) => {
      const ctc = contacts.find((c) => c.id === contactId)!;
      return {
        contactId,
        ownerId: userId,
        status: "open" as const,
        unreadCount: ctc.tag === "hot" ? Math.floor(1 + Math.random() * 3) : 0,
        lastMessageAt: minutesAgo(Math.floor(Math.random() * 240)),
        lastMessagePreview: opener.slice(0, 140),
      };
    })
  ).returning();

  // Two messages per conversation, all in one INSERT.
  const messageValues: Array<typeof message.$inferInsert> = [];
  for (const conv of convRows) {
    const pair = pairs.find((p) => p.contactId === conv.contactId)!;
    messageValues.push(
      {
        conversationId: conv.id, ownerId: userId, direction: "inbound",
        body: pair.opener, status: "delivered",
        createdAt: hoursAgo(2 + Math.random() * 8),
      },
      {
        conversationId: conv.id, ownerId: userId, senderId: userId, direction: "outbound",
        body: pair.reply, status: "read", isAiGenerated: Math.random() > 0.5,
        createdAt: hoursAgo(1 + Math.random() * 5),
      }
    );
  }
  await db.insert(message).values(messageValues);

  // A handful of pending tasks
  const taskTitles = [
    "Send pricing to Priya", "Follow up with Rohan", "Schedule demo for Anika",
    "Send case study to Vikram", "Confirm Tuesday call", "Share onboarding video",
  ];
  await db.insert(task).values(
    taskTitles.slice(0, 4).map((title) => ({
      ownerId: userId,
      title,
      priority: rand(["low", "medium", "high", "urgent"] as const),
      status: "pending" as const,
      contactId: contacts[Math.floor(Math.random() * contacts.length)]?.id ?? null,
      dueAt: hoursAgo(-(1 + Math.random() * 48)),
    }))
  );

  // Two demo campaigns
  await db.insert(campaign).values([
    {
      ownerId: userId, name: "Diwali Festive Push",
      description: "Special offers for Diwali shoppers",
      channel: "whatsapp", status: "active",
      audienceSize: 1240, sentCount: 1180, openedCount: 720, repliedCount: 86, conversionCount: 14,
      budget: "5000",
    },
    {
      ownerId: userId, name: "Monsoon Reactivation",
      description: "Win back cold leads",
      channel: "whatsapp", status: "completed",
      audienceSize: 480, sentCount: 460, openedCount: 215, repliedCount: 34, conversionCount: 7,
      budget: "2500",
    },
  ]);

  return c.json({ seeded: true, contacts: contacts.length });
});

export default app;
