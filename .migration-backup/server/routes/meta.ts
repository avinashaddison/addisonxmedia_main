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
  const body = await c.req.json<{
    display_name?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
    whatsapp_community_url?: string | null;
    instagram_url?: string | null;
    website_url?: string | null;
    facebook_url?: string | null;
  }>();

  // Light URL validation — accept blank/null to clear, otherwise require http(s).
  const validateUrl = (key: string, v: string | null | undefined): string | null | undefined => {
    if (v === undefined) return undefined;            // not in body → leave alone
    const trimmed = (v ?? "").trim();
    if (!trimmed) return null;                        // cleared
    if (!/^https?:\/\//i.test(trimmed)) {
      throw new Error(`${key} must start with http:// or https://`);
    }
    return trimmed;
  };

  // Partial update — only touch fields explicitly present in the body.
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if ("display_name" in body)             set.displayName = body.display_name?.trim() || null;
  if ("phone" in body)                    set.phone = body.phone?.trim() || null;
  if ("avatar_url" in body)               set.avatarUrl = body.avatar_url?.trim() || null;
  try {
    const v1 = validateUrl("whatsapp_community_url", body.whatsapp_community_url);
    const v2 = validateUrl("instagram_url",          body.instagram_url);
    const v3 = validateUrl("website_url",            body.website_url);
    const v4 = validateUrl("facebook_url",           body.facebook_url);
    if (v1 !== undefined) set.whatsappCommunityUrl = v1;
    if (v2 !== undefined) set.instagramUrl = v2;
    if (v3 !== undefined) set.websiteUrl = v3;
    if (v4 !== undefined) set.facebookUrl = v4;
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Invalid URL" }, 400);
  }

  const [row] = await db.update(profile)
    .set(set)
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

/* ─────────────────────────────────────────────────────────────────────────
 * /dashboard/money  — the "Money Machine" view
 *
 * Replaces the impression/CPM jargon with a one-line story the owner cares
 * about: how much did I make today, how much did I spend, what's the ROAS.
 *
 * Built purely from CRM tables (deals + conversations + ads attribution).
 * No live Meta Marketing API call — too slow + rate-limited to power a
 * dashboard. Spend numbers come from the cached `campaign.spent_cents`
 * snapshot that the existing /ads/campaigns sync writes.
 * ───────────────────────────────────────────────────────────────────────── */
app.get("/dashboard/money", async (c) => {
  const userId = c.var.userId;
  const now = Date.now();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const day7  = new Date(now - 7  * 24 * 3600 * 1000);
  const day30 = new Date(now - 30 * 24 * 3600 * 1000);
  const day60 = new Date(now - 60 * 24 * 3600 * 1000);

  // 1. Won deals — all, with source attribution
  const wonDeals = await db.select({
    id: deal.id,
    value: deal.value,
    closedAt: deal.closedAt,
    conversationId: deal.conversationId,
    title: deal.title,
  }).from(deal).where(and(
    eq(deal.ownerId, userId),
    eq(deal.stage, "won"),
    gt(deal.closedAt, day60),  // 60 days of history is enough for the panel
  ));

  // 2. Map deal → source_ad_id via conversation
  const convIds = wonDeals.map((d) => d.conversationId).filter((v): v is string => !!v);
  const convAttribution = convIds.length > 0
    ? await db.select({
        id: conversation.id,
        sourceAdId: conversation.sourceAdId,
        sourceType: conversation.sourceType,
        sourceHeadline: conversation.sourceHeadline,
      }).from(conversation).where(and(
        eq(conversation.ownerId, userId),
        sql`${conversation.id} = ANY(${convIds})`,
      ))
    : [];
  const attrByConv = new Map(convAttribution.map((r) => [r.id, r]));

  // 3. Bucket by time window + by source
  const sumValue = (rows: typeof wonDeals, since: Date) => rows
    .filter((d) => d.closedAt && new Date(d.closedAt) >= since)
    .reduce((acc, d) => acc + Number(d.value ?? 0), 0);

  const countSince = (rows: typeof wonDeals, since: Date) => rows
    .filter((d) => d.closedAt && new Date(d.closedAt) >= since)
    .length;

  const revenueToday   = sumValue(wonDeals, todayStart);
  const revenue7d      = sumValue(wonDeals, day7);
  const revenue30d     = sumValue(wonDeals, day30);
  const dealsToday     = countSince(wonDeals, todayStart);
  const deals7d        = countSince(wonDeals, day7);
  const deals30d       = countSince(wonDeals, day30);

  // Source split (last 30d)
  const recentDeals = wonDeals.filter((d) => d.closedAt && new Date(d.closedAt) >= day30);
  let revenueFromAds = 0;
  let revenueFromOrganic = 0;
  let dealsFromAds = 0;
  let dealsFromOrganic = 0;
  for (const d of recentDeals) {
    const attr = d.conversationId ? attrByConv.get(d.conversationId) : null;
    const v = Number(d.value ?? 0);
    if (attr?.sourceAdId) {
      revenueFromAds += v;
      dealsFromAds++;
    } else {
      revenueFromOrganic += v;
      dealsFromOrganic++;
    }
  }

  // 4. Ad spend snapshot (last 30d) — from campaign table cache
  const campaignsAll = await db.select({
    id: campaign.id,
    name: campaign.name,
    sourceAdId: campaign.id,        // we don't track this directly; use id as fallback
    sentCount: campaign.sentCount,
  }).from(campaign).where(eq(campaign.ownerId, userId));

  // For ad spend we need the meta_config-backed insights snapshot. For now we
  // expose 0 with a flag so the frontend renders "Connect Meta Ads to see ROAS".
  // When the Ads module is fully wired, this gets replaced with the actual
  // campaign.spent_inr field. (placeholder for clear v1 deliverable)
  const adSpend30d = 0;
  const hasAdsConnected = campaignsAll.length > 0;

  // 5. Best-performing ad (by revenue attribution, last 30d)
  const revenueByAdId = new Map<string, number>();
  const dealsByAdId = new Map<string, number>();
  const headlineByAdId = new Map<string, string>();
  for (const d of recentDeals) {
    const attr = d.conversationId ? attrByConv.get(d.conversationId) : null;
    if (!attr?.sourceAdId) continue;
    const v = Number(d.value ?? 0);
    revenueByAdId.set(attr.sourceAdId, (revenueByAdId.get(attr.sourceAdId) ?? 0) + v);
    dealsByAdId.set(attr.sourceAdId, (dealsByAdId.get(attr.sourceAdId) ?? 0) + 1);
    if (attr.sourceHeadline) headlineByAdId.set(attr.sourceAdId, attr.sourceHeadline);
  }
  const bestAd = Array.from(revenueByAdId.entries())
    .map(([adId, rev]) => ({
      ad_id: adId,
      headline: headlineByAdId.get(adId) ?? "Untitled ad",
      revenue_inr: rev,
      deals: dealsByAdId.get(adId) ?? 0,
    }))
    .sort((a, b) => b.revenue_inr - a.revenue_inr)[0] ?? null;

  // 6. 7-day series for the spark chart
  const series7d: Array<{ date: string; revenue_inr: number; deals: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const s = new Date(now - i * 24 * 3600 * 1000);
    s.setHours(0, 0, 0, 0);
    const e = new Date(s.getTime() + 24 * 3600 * 1000);
    const dayDeals = wonDeals.filter((d) => d.closedAt && new Date(d.closedAt) >= s && new Date(d.closedAt) < e);
    series7d.push({
      date: s.toISOString().slice(0, 10),
      revenue_inr: dayDeals.reduce((a, d) => a + Number(d.value ?? 0), 0),
      deals: dayDeals.length,
    });
  }

  // 7. Pipeline value (open deals)
  const [openPipelineRow] = await db.select({
    total: sql<string>`COALESCE(SUM(${deal.value}), 0)`,
    count: count(deal.id),
  }).from(deal).where(and(
    eq(deal.ownerId, userId),
    sql`${deal.stage} NOT IN ('won', 'lost')`,
  ));

  // 8. Conversion: chats → won deals in last 30d
  const [chats30d] = await db.select({
    count: count(conversation.id),
  }).from(conversation).where(and(
    eq(conversation.ownerId, userId),
    gt(conversation.createdAt, day30),
  ));
  const conversionRate30d = chats30d.count > 0
    ? Math.round((deals30d / Number(chats30d.count)) * 1000) / 10  // 1 decimal
    : 0;

  return c.json({
    // Hero numbers
    today: {
      revenue_inr: revenueToday,
      deals: dealsToday,
    },
    last_7d: {
      revenue_inr: revenue7d,
      deals: deals7d,
    },
    last_30d: {
      revenue_inr: revenue30d,
      deals: deals30d,
      conversion_pct: conversionRate30d,  // chats → wins
    },

    // Source split (helps decide where to spend marketing time)
    source_split_30d: {
      from_ads:     { revenue_inr: revenueFromAds,     deals: dealsFromAds },
      from_organic: { revenue_inr: revenueFromOrganic, deals: dealsFromOrganic },
    },

    // Money in / money out
    spend_30d: {
      ad_spend_inr: adSpend30d,
      revenue_inr: revenue30d,
      roas: adSpend30d > 0 ? Math.round((revenue30d / adSpend30d) * 10) / 10 : null,
      has_ads_connected: hasAdsConnected,
    },

    // Best ad (sells the CAPI story — Meta optimizes toward this)
    best_ad_30d: bestAd,

    // Pipeline + spark chart
    open_pipeline_inr: Number(openPipelineRow?.total ?? 0),
    open_pipeline_count: openPipelineRow?.count ?? 0,
    series_7d: series7d,
  });
});

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

// ============================================================
// META BSP COST ESTIMATE — what Meta will bill the workspace this month
// ============================================================
//
// We don't store the template-category per outbound message yet, so the actual
// invoice depends on whether the customer's templates are marketing / utility /
// authentication. This endpoint returns BOTH ends of the range so users can
// budget conservatively (assume marketing) or aggressively (assume utility).
//
// Source: count outbound messages with a "send-attempted" status in the
// current calendar month, then multiply by Meta's India rates.
app.get("/billing/meta-estimate", async (c) => {
  const userId = c.var.userId;
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [agg] = await db
    .select({ outbound: sql<number>`COUNT(*)::int` })
    .from(message)
    .where(and(
      eq(message.ownerId, userId),
      eq(message.direction, "outbound"),
      sql`${message.status} IN ('sent', 'delivered', 'read')`,
      sql`${message.createdAt} >= ${monthStart.toISOString()}`,
    ));

  const outbound = agg?.outbound ?? 0;

  // India rates (₹) per conversation. A "conversation" ~= one 24h window per
  // recipient — for the estimate we conservatively treat 1 outbound message as
  // 1 conversation (over-estimate, safer for the customer).
  const RATE_MARKETING = 0.78;
  const RATE_UTILITY = 0.115;
  const RATE_AUTH = 0.107;

  return c.json({
    month_start: monthStart.toISOString(),
    outbound_count: outbound,
    estimate_marketing_inr: Math.round(outbound * RATE_MARKETING * 100) / 100,
    estimate_utility_inr: Math.round(outbound * RATE_UTILITY * 100) / 100,
    estimate_auth_inr: Math.round(outbound * RATE_AUTH * 100) / 100,
    rates: { marketing: RATE_MARKETING, utility: RATE_UTILITY, authentication: RATE_AUTH },
    note: "Estimate assumes 1 outbound message = 1 Meta conversation. Actual invoice depends on your template categories and 24h conversation windows.",
  });
});

export default app;
