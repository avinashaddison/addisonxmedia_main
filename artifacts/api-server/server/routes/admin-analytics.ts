import { Hono } from "hono";
import { db } from "../db/client";
import { user, upgradeRequest } from "../db/schema";
import { eq, and, sql, gte, lt, inArray, count, asc } from "drizzle-orm";
import { requireAdmin, type AdminVariables } from "../middleware/admin";

/**
 * Analytics admin surface — charts from real platform data.
 *   - Client growth: daily signups + cumulative client count + status breakdown
 *   - Revenue growth: monthly revenue + transaction count + current MRR
 */
const adminAnalytics = new Hono<{ Variables: AdminVariables }>();
adminAnalytics.use("/api/admin/*", requireAdmin());

const PAID = ["paid", "completed"];
const REV_DATE = sql`COALESCE(${upgradeRequest.completedAt}, ${upgradeRequest.createdAt})`;

adminAnalytics.get("/api/admin/analytics/client-growth", async (c) => {
  const days = Math.min(Number(c.req.query("days") ?? 90), 365);
  const since = new Date(Date.now() - days * 86400000);
  since.setHours(0, 0, 0, 0);

  const daily = await db
    .select({
      date: sql<string>`to_char(date_trunc('day', ${user.createdAt}), 'YYYY-MM-DD')`,
      signups: count(),
    })
    .from(user)
    .where(and(eq(user.isStaff, false), gte(user.createdAt, since)))
    .groupBy(sql`date_trunc('day', ${user.createdAt})`)
    .orderBy(asc(sql`date_trunc('day', ${user.createdAt})`));

  // Baseline = clients that existed before the window, so cumulative is accurate.
  const [{ n: baseline }] = await db
    .select({ n: count() })
    .from(user)
    .where(and(eq(user.isStaff, false), lt(user.createdAt, since)));

  let cum = Number(baseline);
  const series = daily.map((r) => {
    cum += Number(r.signups);
    return { date: r.date, signups: Number(r.signups), total: cum };
  });

  const status = await db
    .select({ status: user.accountStatus, n: count() })
    .from(user)
    .where(eq(user.isStaff, false))
    .groupBy(user.accountStatus);

  return c.json({
    series,
    statusBreakdown: status.map((r) => ({ status: r.status, count: Number(r.n) })),
    totalClients: cum,
  });
});

adminAnalytics.get("/api/admin/analytics/revenue-growth", async (c) => {
  const months = Math.min(Number(c.req.query("months") ?? 12), 36);
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1), 1);
  since.setHours(0, 0, 0, 0);

  const monthly = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${REV_DATE}), 'YYYY-MM')`,
      revenue: sql<string>`COALESCE(SUM(${upgradeRequest.amountInr}),0)`,
      transactions: count(),
    })
    .from(upgradeRequest)
    .where(and(inArray(upgradeRequest.status, PAID), gte(REV_DATE, since)))
    .groupBy(sql`date_trunc('month', ${REV_DATE})`)
    .orderBy(asc(sql`date_trunc('month', ${REV_DATE})`));

  const [mrr] = await db
    .select({ total: sql<string>`COALESCE(SUM(${user.mrrInr}),0)` })
    .from(user)
    .where(eq(user.accountStatus, "active"));

  return c.json({
    series: monthly.map((r) => ({ month: r.month, revenue: Number(r.revenue), transactions: Number(r.transactions) })),
    currentMrr: Number(mrr.total),
  });
});

export default adminAnalytics;
