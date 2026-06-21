import { Hono } from "hono";
import { db } from "../db/client";
import { user, metaConfig, message, broadcast, supportTicket, apiKey, backup } from "../db/schema";
import { eq, and, desc, gt, count } from "drizzle-orm";
import { requireAdmin, type AdminVariables } from "../middleware/admin";

/**
 * Minimal read endpoints for the scaffolded admin modules. These power titled
 * shells + empty states marked "completing next". Some return real data where
 * it's cheap (WhatsApp config / usage), the rest list freshly-added tables that
 * start empty. NEVER select secret columns (meta accessToken, api_key keyHash).
 */
const adminScaffold = new Hono<{ Variables: AdminVariables }>();
adminScaffold.use("/api/admin/*", requireAdmin());

const DAY = 86400000;

/* ─────────── WhatsApp Management ─────────── */

adminScaffold.get("/api/admin/whatsapp/numbers", async (c) => {
  const rows = await db
    .select({
      id: metaConfig.id,
      name: user.name,
      email: user.email,
      displayPhoneNumber: metaConfig.displayPhoneNumber,
      phoneNumberId: metaConfig.phoneNumberId,
      enabled: metaConfig.enabled,
      lastVerifiedAt: metaConfig.lastVerifiedAt,
      messagingLimitTier: metaConfig.messagingLimitTier,
      qualityRating: metaConfig.qualityRating,
    })
    .from(metaConfig)
    .leftJoin(user, eq(metaConfig.userId, user.id))
    .orderBy(desc(metaConfig.createdAt))
    .limit(200);
  return c.json(rows);
});

adminScaffold.get("/api/admin/whatsapp/instances", async (c) => {
  const [[total], [enabled]] = await Promise.all([
    db.select({ n: count() }).from(metaConfig),
    db.select({ n: count() }).from(metaConfig).where(eq(metaConfig.enabled, true)),
  ]);
  const t = Number(total.n);
  const e = Number(enabled.n);
  return c.json({ total: t, enabled: e, disabled: t - e });
});

adminScaffold.get("/api/admin/whatsapp/usage", async (c) => {
  const now = Date.now();
  const [[m24], [m7], [m30], [bc]] = await Promise.all([
    db.select({ n: count() }).from(message).where(gt(message.createdAt, new Date(now - DAY))),
    db.select({ n: count() }).from(message).where(gt(message.createdAt, new Date(now - 7 * DAY))),
    db.select({ n: count() }).from(message).where(gt(message.createdAt, new Date(now - 30 * DAY))),
    db.select({ n: count() }).from(broadcast),
  ]);
  return c.json({
    messages24h: Number(m24.n),
    messages7d: Number(m7.n),
    messages30d: Number(m30.n),
    broadcastsTotal: Number(bc.n),
  });
});

/* ─────────── Support Center ─────────── */

adminScaffold.get("/api/admin/support/tickets", async (c) => {
  const status = c.req.query("status");
  const rows = await db
    .select({
      id: supportTicket.id,
      subject: supportTicket.subject,
      category: supportTicket.category,
      priority: supportTicket.priority,
      status: supportTicket.status,
      name: user.name,
      email: user.email,
      createdAt: supportTicket.createdAt,
    })
    .from(supportTicket)
    .leftJoin(user, eq(supportTicket.userId, user.id))
    .where(status && status !== "all" ? eq(supportTicket.status, status) : undefined)
    .orderBy(desc(supportTicket.createdAt))
    .limit(200);
  const counts = await db
    .select({ status: supportTicket.status, n: count() })
    .from(supportTicket)
    .groupBy(supportTicket.status);
  return c.json({ tickets: rows, counts: counts.map((r) => ({ status: r.status, count: Number(r.n) })) });
});

/* ─────────── System Management — API keys & Backups ─────────── */

adminScaffold.get("/api/admin/api-keys", async (c) => {
  const rows = await db
    .select({
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      lastUsedAt: apiKey.lastUsedAt,
      revokedAt: apiKey.revokedAt,
      createdAt: apiKey.createdAt,
    })
    .from(apiKey)
    .orderBy(desc(apiKey.createdAt))
    .limit(200);
  return c.json(rows);
});

adminScaffold.get("/api/admin/backups", async (c) => {
  const rows = await db.select().from(backup).orderBy(desc(backup.createdAt)).limit(200);
  return c.json(rows.map((r) => ({ ...r, sizeBytes: Number(r.sizeBytes) })));
});

export default adminScaffold;
