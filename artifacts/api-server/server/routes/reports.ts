import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { db } from "../db/client";
import { contact, deal, invoice, expense, task, broadcast, campaign, message } from "../db/schema";
import { requireAuth, type AuthVariables } from "../middleware/auth";

const app = new Hono<{ Variables: AuthVariables }>();
app.use("*", requireAuth);

// ============================================================
// REPORTS — server-side aggregations over owner-scoped data.
// All endpoints accept ?from=ISO&to=ISO (defaults: last 90 days).
// Datasets are small (per-SMB), so we fetch owner rows and bucket in JS.
// ============================================================

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

function parseRange(c: Context<{ Variables: AuthVariables }>) {
  const toQ = c.req.query("to");
  const fromQ = c.req.query("from");
  const to = toQ ? new Date(toQ) : new Date();
  const from = fromQ ? new Date(fromQ) : new Date(to.getTime() - 90 * 864e5);
  to.setHours(23, 59, 59, 999);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

function buildTimeline(from: Date, to: Date) {
  const spanDays = Math.ceil((to.getTime() - from.getTime()) / 864e5);
  const granularity: "day" | "month" = spanDays > 120 ? "month" : "day";
  const keys: string[] = [];
  if (granularity === "day") {
    for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) keys.push(dayKey(d));
  } else {
    const d = new Date(from.getFullYear(), from.getMonth(), 1);
    while (d <= to) {
      keys.push(monthKey(d));
      d.setMonth(d.getMonth() + 1);
    }
  }
  return { granularity, keys };
}

const keyFor = (d: Date, g: "day" | "month") => (g === "day" ? dayKey(d) : monthKey(d));
const inRange = (d: Date | null | undefined, from: Date, to: Date) =>
  !!d && new Date(d) >= from && new Date(d) <= to;

// ---------------- LEADS REPORT ----------------

app.get("/reports/leads", async (c) => {
  const { from, to } = parseRange(c);
  const contacts = await db.select().from(contact).where(eq(contact.ownerId, c.var.userId)).limit(5000);
  const { granularity, keys } = buildTimeline(from, to);

  const byStatus: Record<string, number> = { new: 0, contacted: 0, qualified: 0, proposal: 0, won: 0, lost: 0 };
  const byTag: Record<string, number> = { hot: 0, warm: 0, cold: 0 };
  const bySource: Record<string, number> = {};
  const timelineMap = new Map<string, number>(keys.map((k) => [k, 0]));

  let newInRange = 0;
  for (const ct of contacts) {
    const status = ct.leadStatus ?? "new";
    byStatus[status] = (byStatus[status] ?? 0) + 1;
    byTag[ct.tag] = (byTag[ct.tag] ?? 0) + 1;
    const src = ct.source?.trim() || "Direct";
    bySource[src] = (bySource[src] ?? 0) + 1;
    if (inRange(ct.createdAt, from, to)) {
      newInRange++;
      const k = keyFor(new Date(ct.createdAt), granularity);
      if (timelineMap.has(k)) timelineMap.set(k, (timelineMap.get(k) ?? 0) + 1);
    }
  }

  const converted = byStatus.won;
  return c.json({
    range: { from: from.toISOString(), to: to.toISOString(), granularity },
    totals: {
      total_leads: contacts.length,
      new_in_range: newInRange,
      converted,
      conversion_rate: contacts.length ? Math.round((converted / contacts.length) * 1000) / 10 : 0,
    },
    by_status: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
    by_tag: Object.entries(byTag).map(([tag, count]) => ({ tag, count })),
    by_source: Object.entries(bySource)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count),
    timeline: keys.map((k) => ({ date: k, leads: timelineMap.get(k) ?? 0 })),
  });
});

// ---------------- CUSTOMERS REPORT ----------------

app.get("/reports/customers", async (c) => {
  const { from, to } = parseRange(c);
  const contacts = await db.select().from(contact).where(eq(contact.ownerId, c.var.userId)).limit(5000);
  const deals = await db.select().from(deal).where(eq(deal.ownerId, c.var.userId)).limit(5000);
  const { granularity, keys } = buildTimeline(from, to);

  const wonByContact = new Map<string, number>();
  for (const d of deals) {
    if (d.stage === "won") {
      wonByContact.set(d.contactId, (wonByContact.get(d.contactId) ?? 0) + Number(d.value || 0));
    }
  }

  const byTag: Record<string, number> = { hot: 0, warm: 0, cold: 0 };
  const timelineMap = new Map<string, number>(keys.map((k) => [k, 0]));
  let customers = 0;
  let newInRange = 0;
  for (const ct of contacts) {
    byTag[ct.tag] = (byTag[ct.tag] ?? 0) + 1;
    const isCustomer = wonByContact.has(ct.id) || ct.leadStatus === "won";
    if (isCustomer) customers++;
    if (inRange(ct.createdAt, from, to)) {
      newInRange++;
      const k = keyFor(new Date(ct.createdAt), granularity);
      if (timelineMap.has(k)) timelineMap.set(k, (timelineMap.get(k) ?? 0) + 1);
    }
  }

  const nameById = new Map(contacts.map((ct) => [ct.id, ct.name]));
  const topCustomers = [...wonByContact.entries()]
    .map(([id, value]) => ({ id, name: nameById.get(id) ?? "Unknown", value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const totalRevenue = [...wonByContact.values()].reduce((s, v) => s + v, 0);
  return c.json({
    range: { from: from.toISOString(), to: to.toISOString(), granularity },
    totals: {
      total_contacts: contacts.length,
      customers,
      new_in_range: newInRange,
      avg_customer_value: customers ? Math.round((totalRevenue / customers) * 100) / 100 : 0,
    },
    by_tag: Object.entries(byTag).map(([tag, count]) => ({ tag, count })),
    top_customers: topCustomers,
    timeline: keys.map((k) => ({ date: k, customers: timelineMap.get(k) ?? 0 })),
  });
});

// ---------------- REVENUE REPORT ----------------

app.get("/reports/revenue", async (c) => {
  const { from, to } = parseRange(c);
  const deals = await db.select().from(deal).where(and(eq(deal.ownerId, c.var.userId), eq(deal.stage, "won"))).limit(5000);
  const invoices = await db.select().from(invoice).where(and(eq(invoice.ownerId, c.var.userId), eq(invoice.status, "paid"))).limit(5000);
  const expenses = await db.select().from(expense).where(eq(expense.ownerId, c.var.userId)).limit(5000);
  const { granularity, keys } = buildTimeline(from, to);

  const revenueMap = new Map<string, number>(keys.map((k) => [k, 0]));
  const expenseMap = new Map<string, number>(keys.map((k) => [k, 0]));

  let dealRevenue = 0;
  for (const d of deals) {
    const date = d.closedAt ?? d.updatedAt;
    if (!inRange(date, from, to)) continue;
    const v = Number(d.value || 0);
    dealRevenue += v;
    const k = keyFor(new Date(date), granularity);
    if (revenueMap.has(k)) revenueMap.set(k, (revenueMap.get(k) ?? 0) + v);
  }

  let invoiceRevenue = 0;
  for (const inv of invoices) {
    const date = inv.paidAt ?? inv.updatedAt;
    if (!inRange(date, from, to)) continue;
    const v = Number(inv.total || 0);
    invoiceRevenue += v;
    const k = keyFor(new Date(date), granularity);
    if (revenueMap.has(k)) revenueMap.set(k, (revenueMap.get(k) ?? 0) + v);
  }

  let totalExpenses = 0;
  const expenseByCategory: Record<string, number> = {};
  for (const ex of expenses) {
    if (!inRange(ex.spentAt, from, to)) continue;
    const v = Number(ex.amount || 0);
    totalExpenses += v;
    expenseByCategory[ex.category] = (expenseByCategory[ex.category] ?? 0) + v;
    const k = keyFor(new Date(ex.spentAt), granularity);
    if (expenseMap.has(k)) expenseMap.set(k, (expenseMap.get(k) ?? 0) + v);
  }

  const totalRevenue = dealRevenue + invoiceRevenue;
  return c.json({
    range: { from: from.toISOString(), to: to.toISOString(), granularity },
    totals: {
      total_revenue: Math.round(totalRevenue * 100) / 100,
      deal_revenue: Math.round(dealRevenue * 100) / 100,
      invoice_revenue: Math.round(invoiceRevenue * 100) / 100,
      total_expenses: Math.round(totalExpenses * 100) / 100,
      net_profit: Math.round((totalRevenue - totalExpenses) * 100) / 100,
    },
    by_source: [
      { source: "Deals (won)", value: Math.round(dealRevenue * 100) / 100 },
      { source: "Invoices (paid)", value: Math.round(invoiceRevenue * 100) / 100 },
    ],
    expenses_by_category: Object.entries(expenseByCategory)
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value),
    timeline: keys.map((k) => ({
      date: k,
      revenue: Math.round((revenueMap.get(k) ?? 0) * 100) / 100,
      expenses: Math.round((expenseMap.get(k) ?? 0) * 100) / 100,
      net: Math.round(((revenueMap.get(k) ?? 0) - (expenseMap.get(k) ?? 0)) * 100) / 100,
    })),
  });
});

// ---------------- PERFORMANCE REPORT ----------------

app.get("/reports/performance", async (c) => {
  const { from, to } = parseRange(c);
  const deals = await db.select().from(deal).where(eq(deal.ownerId, c.var.userId)).limit(5000);
  const tasks = await db.select().from(task).where(eq(task.ownerId, c.var.userId)).limit(5000);
  const broadcasts = await db.select().from(broadcast).where(eq(broadcast.ownerId, c.var.userId)).limit(5000);
  const campaigns = await db.select().from(campaign).where(eq(campaign.ownerId, c.var.userId)).limit(5000);
  const messages = await db.select().from(message).where(eq(message.ownerId, c.var.userId)).limit(20000);
  const { granularity, keys } = buildTimeline(from, to);

  let dealsWon = 0;
  let dealsLost = 0;
  let openPipeline = 0;
  for (const d of deals) {
    if (d.stage === "won" && inRange(d.closedAt ?? d.updatedAt, from, to)) dealsWon++;
    else if (d.stage === "lost" && inRange(d.updatedAt, from, to)) dealsLost++;
    if (d.stage !== "won" && d.stage !== "lost") openPipeline += Number(d.value || 0);
  }

  let tasksCompleted = 0;
  let tasksPending = 0;
  for (const t of tasks) {
    if (t.status === "completed" && inRange(t.completedAt ?? t.updatedAt, from, to)) tasksCompleted++;
    else if (t.status === "pending" || t.status === "in_progress") tasksPending++;
  }

  const broadcastsSent = broadcasts.filter((b) => b.status === "sent" && inRange(b.sentAt ?? b.updatedAt, from, to)).length;

  const outboundMap = new Map<string, number>(keys.map((k) => [k, 0]));
  const inboundMap = new Map<string, number>(keys.map((k) => [k, 0]));
  let outbound = 0;
  let inbound = 0;
  for (const m of messages) {
    if (!inRange(m.createdAt, from, to)) continue;
    const k = keyFor(new Date(m.createdAt), granularity);
    if (m.direction === "outbound") {
      outbound++;
      if (outboundMap.has(k)) outboundMap.set(k, (outboundMap.get(k) ?? 0) + 1);
    } else {
      inbound++;
      if (inboundMap.has(k)) inboundMap.set(k, (inboundMap.get(k) ?? 0) + 1);
    }
  }

  const campaignPerformance = campaigns
    .map((cp) => ({
      id: cp.id,
      name: cp.name,
      sent: cp.sentCount,
      replied: cp.repliedCount,
      conversions: cp.conversionCount,
      conversion_rate: cp.sentCount ? Math.round((cp.conversionCount / cp.sentCount) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.conversions - a.conversions)
    .slice(0, 10);

  const decided = dealsWon + dealsLost;
  return c.json({
    range: { from: from.toISOString(), to: to.toISOString(), granularity },
    totals: {
      deals_won: dealsWon,
      deals_lost: dealsLost,
      win_rate: decided ? Math.round((dealsWon / decided) * 1000) / 10 : 0,
      open_pipeline: Math.round(openPipeline * 100) / 100,
      tasks_completed: tasksCompleted,
      tasks_pending: tasksPending,
      broadcasts_sent: broadcastsSent,
      messages_out: outbound,
      messages_in: inbound,
    },
    campaign_performance: campaignPerformance,
    timeline: keys.map((k) => ({
      date: k,
      sent: outboundMap.get(k) ?? 0,
      received: inboundMap.get(k) ?? 0,
    })),
  });
});

export default app;
