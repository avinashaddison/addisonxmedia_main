/**
 * Site Analytics API — aggregates site_analytics_event for the dashboard.
 *
 *   GET /api/site/analytics/summary       → counters: views/leads/cart/orders + revenue, last 30d
 *   GET /api/site/analytics/timeseries    → daily buckets for the past N days
 *   GET /api/site/analytics/sources       → top referrer hosts
 *   GET /api/site/analytics/top-pages     → most viewed paths
 */

import { Hono } from "hono";
import { sql, eq, and, gte } from "drizzle-orm";
import { db } from "../db/client";
import { siteAnalyticsEvent } from "../db/schema";
import { requireAuth, type AuthVariables } from "../middleware/auth";

const app = new Hono<{ Variables: AuthVariables }>();
app.use("*", requireAuth);

const sinceDate = (days: number) => new Date(Date.now() - days * 86400_000);

app.get("/site/analytics/summary", async (c) => {
  const userId = c.var.userId;
  const days = Math.min(Number(c.req.query("days") ?? 30), 365);
  const since = sinceDate(days);
  const sincePrev = sinceDate(days * 2);

  const [curr] = await db.execute<{
    views: string; leads: string; cart_adds: string; orders: string; revenue: string; unique_visitors: string;
  }>(sql`
    SELECT
      COUNT(*) FILTER (WHERE ${siteAnalyticsEvent.eventType} = 'view')::text     AS views,
      COUNT(*) FILTER (WHERE ${siteAnalyticsEvent.eventType} = 'lead')::text     AS leads,
      COUNT(*) FILTER (WHERE ${siteAnalyticsEvent.eventType} = 'cart_add')::text AS cart_adds,
      COUNT(*) FILTER (WHERE ${siteAnalyticsEvent.eventType} = 'order')::text    AS orders,
      COALESCE(SUM(${siteAnalyticsEvent.valueInr}) FILTER (WHERE ${siteAnalyticsEvent.eventType} = 'order'), 0)::text AS revenue,
      COUNT(DISTINCT ${siteAnalyticsEvent.sessionHash}) FILTER (WHERE ${siteAnalyticsEvent.eventType} = 'view')::text AS unique_visitors
    FROM ${siteAnalyticsEvent}
    WHERE ${siteAnalyticsEvent.ownerId} = ${userId}
      AND ${siteAnalyticsEvent.occurredAt} >= ${since}
  `);

  const [prev] = await db.execute<{
    views: string; leads: string; orders: string; revenue: string;
  }>(sql`
    SELECT
      COUNT(*) FILTER (WHERE ${siteAnalyticsEvent.eventType} = 'view')::text     AS views,
      COUNT(*) FILTER (WHERE ${siteAnalyticsEvent.eventType} = 'lead')::text     AS leads,
      COUNT(*) FILTER (WHERE ${siteAnalyticsEvent.eventType} = 'order')::text    AS orders,
      COALESCE(SUM(${siteAnalyticsEvent.valueInr}) FILTER (WHERE ${siteAnalyticsEvent.eventType} = 'order'), 0)::text AS revenue
    FROM ${siteAnalyticsEvent}
    WHERE ${siteAnalyticsEvent.ownerId} = ${userId}
      AND ${siteAnalyticsEvent.occurredAt} >= ${sincePrev}
      AND ${siteAnalyticsEvent.occurredAt} < ${since}
  `);

  return c.json({
    days,
    current: curr,
    previous: prev,
  });
});

app.get("/site/analytics/timeseries", async (c) => {
  const userId = c.var.userId;
  const days = Math.min(Number(c.req.query("days") ?? 30), 90);
  const since = sinceDate(days);

  const rows = await db.execute<{
    day: string; views: string; leads: string; orders: string; revenue: string;
  }>(sql`
    SELECT
      to_char(date_trunc('day', ${siteAnalyticsEvent.occurredAt}), 'YYYY-MM-DD') AS day,
      COUNT(*) FILTER (WHERE ${siteAnalyticsEvent.eventType} = 'view')::text  AS views,
      COUNT(*) FILTER (WHERE ${siteAnalyticsEvent.eventType} = 'lead')::text  AS leads,
      COUNT(*) FILTER (WHERE ${siteAnalyticsEvent.eventType} = 'order')::text AS orders,
      COALESCE(SUM(${siteAnalyticsEvent.valueInr}) FILTER (WHERE ${siteAnalyticsEvent.eventType} = 'order'), 0)::text AS revenue
    FROM ${siteAnalyticsEvent}
    WHERE ${siteAnalyticsEvent.ownerId} = ${userId}
      AND ${siteAnalyticsEvent.occurredAt} >= ${since}
    GROUP BY 1
    ORDER BY 1 ASC
  `);
  return c.json(rows.rows ?? rows);
});

app.get("/site/analytics/sources", async (c) => {
  const userId = c.var.userId;
  const days = Math.min(Number(c.req.query("days") ?? 30), 365);
  const since = sinceDate(days);

  const rows = await db.execute<{ source: string; views: string }>(sql`
    SELECT COALESCE(${siteAnalyticsEvent.referrerHost}, 'direct') AS source, COUNT(*)::text AS views
    FROM ${siteAnalyticsEvent}
    WHERE ${siteAnalyticsEvent.ownerId} = ${userId}
      AND ${siteAnalyticsEvent.eventType} = 'view'
      AND ${siteAnalyticsEvent.occurredAt} >= ${since}
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 12
  `);
  return c.json(rows.rows ?? rows);
});

app.get("/site/analytics/top-pages", async (c) => {
  const userId = c.var.userId;
  const days = Math.min(Number(c.req.query("days") ?? 30), 365);
  const since = sinceDate(days);

  const rows = await db.execute<{ path: string; views: string }>(sql`
    SELECT COALESCE(${siteAnalyticsEvent.path}, '/') AS path, COUNT(*)::text AS views
    FROM ${siteAnalyticsEvent}
    WHERE ${siteAnalyticsEvent.ownerId} = ${userId}
      AND ${siteAnalyticsEvent.eventType} = 'view'
      AND ${siteAnalyticsEvent.occurredAt} >= ${since}
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 12
  `);
  return c.json(rows.rows ?? rows);
});

export default app;
