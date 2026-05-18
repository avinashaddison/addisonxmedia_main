import { Hono } from "hono";
import { db } from "../db/client";
import {
  user, contact, conversation, message, deal, campaign, broadcast, task,
  adminAuditLog, impersonationSession, metaConfig, systemSetting,
} from "../db/schema";
import { eq, desc, sql, and, gt, isNull, or, ilike, count } from "drizzle-orm";
import { requireAdmin, auditLog, type AdminVariables } from "../middleware/admin";

const admin = new Hono<{ Variables: AdminVariables }>();

/* Public — client-side gate uses this to decide whether to render /admin
   without showing a flash of admin UI to non-staff users. Returns 200 with
   role or 403 with reason. Doesn't go through requireAdmin so we don't
   spam the audit log on every page load. */
admin.get("/api/admin/me", async (c) => {
  const { auth } = await import("../auth");
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: "Unauthorized" }, 401);
  // BetterAuth's twoFactor plugin adds twoFactorEnabled to the user row
  const [u] = await db
    .select()
    .from(user).where(eq(user.id, session.user.id)).limit(1);
  if (!u || !u.isStaff || !u.adminRole) return c.json({ error: "Not staff" }, 403);
  db.update(user).set({ adminLastLoginAt: new Date() }).where(eq(user.id, u.id))
    .catch((e) => console.error("[admin_last_login update]", e));
  return c.json({
    id: u.id,
    email: u.email,
    name: u.name,
    adminRole: u.adminRole,
    twoFactorEnabled: (u as Record<string, unknown>).twoFactorEnabled ?? false,
  });
});

// All other admin routes require staff auth + audit logging
admin.use("/api/admin/*", requireAdmin());

const DAY = 24 * 3600 * 1000;

/* ─────────── Dashboard metrics ─────────── */

admin.get("/api/admin/metrics", async (c) => {
  const now = new Date();
  const today = new Date(now.getTime() - 24 * 3600 * 1000);
  const week = new Date(now.getTime() - 7 * DAY);
  const month = new Date(now.getTime() - 30 * DAY);

  const [users] = await db.select({ n: count() }).from(user);
  const [activeUsers] = await db.select({ n: count() }).from(user).where(eq(user.accountStatus, "active"));
  const [suspended] = await db.select({ n: count() }).from(user).where(eq(user.accountStatus, "suspended"));
  const [trial] = await db.select({ n: count() }).from(user).where(eq(user.accountStatus, "trial"));
  const [signups24h] = await db.select({ n: count() }).from(user).where(gt(user.createdAt, today));
  const [signupsWeek] = await db.select({ n: count() }).from(user).where(gt(user.createdAt, week));
  const [staffCount] = await db.select({ n: count() }).from(user).where(eq(user.isStaff, true));
  const [mrr] = await db.select({ total: sql<string>`COALESCE(SUM(${user.mrrInr}), 0)` }).from(user)
    .where(eq(user.accountStatus, "active"));

  const [msgs] = await db.select({ n: count() }).from(message).where(gt(message.createdAt, today));
  const [convosOpen] = await db.select({ n: count() }).from(conversation).where(eq(conversation.status, "open"));
  const [dealsWon24h] = await db.select({ n: count() }).from(deal).where(and(eq(deal.stage, "won"), gt(deal.closedAt, today)));

  return c.json({
    users: users.n,
    activeUsers: activeUsers.n,
    suspended: suspended.n,
    trial: trial.n,
    staff: staffCount.n,
    signups24h: signups24h.n,
    signupsWeek: signupsWeek.n,
    mrrInr: Number(mrr.total ?? 0),
    messages24h: msgs.n,
    conversationsOpen: convosOpen.n,
    dealsWon24h: dealsWon24h.n,
  });
});

/* ─────────── Workspaces (= customer accounts) ─────────── */

admin.get("/api/admin/workspaces", async (c) => {
  const q = c.req.query("q")?.trim();
  const status = c.req.query("status");
  const includeStaff = c.req.query("includeStaff") === "1";
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);

  const conds = [];
  if (!includeStaff) conds.push(eq(user.isStaff, false));
  if (q) conds.push(or(ilike(user.email, `%${q}%`), ilike(user.name, `%${q}%`))!);
  if (status && status !== "all") conds.push(eq(user.accountStatus, status));

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      status: user.accountStatus,
      mrrInr: user.mrrInr,
      isStaff: user.isStaff,
      adminRole: user.adminRole,
      createdAt: user.createdAt,
      trialEndsAt: user.trialEndsAt,
    })
    .from(user)
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(desc(user.createdAt))
    .limit(limit);

  return c.json(rows);
});

admin.get("/api/admin/workspaces/:id", async (c) => {
  const id = c.req.param("id");
  const [w] = await db.select().from(user).where(eq(user.id, id)).limit(1);
  if (!w) return c.json({ error: "Not found" }, 404);

  const [contacts] = await db.select({ n: count() }).from(contact).where(eq(contact.ownerId, id));
  const [convos] = await db.select({ n: count() }).from(conversation).where(eq(conversation.ownerId, id));
  const [msgs] = await db.select({ n: count() }).from(message).where(eq(message.ownerId, id));
  const [deals] = await db.select({ n: count() }).from(deal).where(eq(deal.ownerId, id));
  const [revenue] = await db.select({ total: sql<string>`COALESCE(SUM(${deal.value}), 0)` }).from(deal)
    .where(and(eq(deal.ownerId, id), eq(deal.stage, "won")));
  const [meta] = await db.select({ enabled: metaConfig.enabled, displayPhoneNumber: metaConfig.displayPhoneNumber })
    .from(metaConfig).where(eq(metaConfig.userId, id)).limit(1);

  return c.json({
    ...w,
    counts: {
      contacts: contacts.n,
      conversations: convos.n,
      messages: msgs.n,
      deals: deals.n,
      revenueInr: Number(revenue?.total ?? 0),
    },
    meta: meta ?? null,
  });
});

/* Read-only preview cards: last 5 contacts, last 5 messages, last 5 deals.
   Cuts down on impersonation usage for simple support reads. */
admin.get("/api/admin/workspaces/:id/preview", async (c) => {
  const id = c.req.param("id");

  const recentContacts = await db
    .select({
      id: contact.id, name: contact.name, phone: contact.phone, email: contact.email,
      tag: contact.tag, score: contact.score, createdAt: contact.createdAt,
    })
    .from(contact).where(eq(contact.ownerId, id))
    .orderBy(desc(contact.createdAt)).limit(5);

  const recentMessages = await db
    .select({
      id: message.id, body: message.body, direction: message.direction,
      status: message.status, createdAt: message.createdAt, conversationId: message.conversationId,
    })
    .from(message).where(eq(message.ownerId, id))
    .orderBy(desc(message.createdAt)).limit(8);

  const recentDeals = await db
    .select({
      id: deal.id, title: deal.title, value: deal.value, stage: deal.stage,
      probability: deal.probability, closedAt: deal.closedAt, createdAt: deal.createdAt,
    })
    .from(deal).where(eq(deal.ownerId, id))
    .orderBy(desc(deal.updatedAt)).limit(5);

  const recentTasks = await db
    .select({
      id: task.id, title: task.title, priority: task.priority, status: task.status,
      dueAt: task.dueAt, createdAt: task.createdAt,
    })
    .from(task).where(eq(task.ownerId, id))
    .orderBy(desc(task.createdAt)).limit(5);

  return c.json({ recentContacts, recentMessages, recentDeals, recentTasks });
});

/** Admin export — downloads a workspace's contacts as CSV. Used by support
 *  for data subject access requests (DPDP Act compliance) or when migrating
 *  a customer out. */
admin.get("/api/admin/workspaces/:id/export/contacts.csv", async (c) => {
  const id = c.req.param("id");
  const rows = await db.select().from(contact).where(eq(contact.ownerId, id)).orderBy(desc(contact.createdAt));
  await auditLog(c, "export_contacts", id, { count: rows.length });

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = "name,phone,email,source,tag,score,notes,created_at\n";
  const body = rows.map((r) =>
    [r.name, r.phone, r.email, r.source, r.tag, r.score, r.notes, r.createdAt.toISOString()].map(esc).join(",")
  ).join("\n");

  return new Response(header + body + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="workspace-${id}-contacts-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});

admin.patch("/api/admin/workspaces/:id", requireAdmin(["super_admin", "billing"]), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ plan?: string; trialEndsAt?: string | null; mrrInr?: number }>();

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (body.plan) update.plan = body.plan;
  if (body.trialEndsAt !== undefined) update.trialEndsAt = body.trialEndsAt ? new Date(body.trialEndsAt) : null;
  if (body.mrrInr !== undefined) update.mrrInr = String(body.mrrInr);

  await db.update(user).set(update).where(eq(user.id, id));
  await auditLog(c, "change_plan", id, body);
  return c.json({ ok: true });
});

admin.post("/api/admin/workspaces/:id/suspend", requireAdmin(["super_admin", "moderator"]), async (c) => {
  const id = c.req.param("id");
  const { reason } = await c.req.json<{ reason: string }>();
  if (!reason || reason.trim().length < 5) return c.json({ error: "Reason (min 5 chars) required" }, 400);

  await db.update(user).set({
    accountStatus: "suspended",
    suspendedAt: new Date(),
    suspendedReason: reason.trim(),
    suspendedBy: c.get("adminUserId"),
  }).where(eq(user.id, id));
  await auditLog(c, "suspend", id, { reason });
  return c.json({ ok: true });
});

admin.post("/api/admin/workspaces/:id/unsuspend", requireAdmin(["super_admin", "moderator"]), async (c) => {
  const id = c.req.param("id");
  await db.update(user).set({
    accountStatus: "active",
    suspendedAt: null,
    suspendedReason: null,
    suspendedBy: null,
  }).where(eq(user.id, id));
  await auditLog(c, "unsuspend", id);
  return c.json({ ok: true });
});

/* ─────────── Impersonation ─────────── */

admin.post("/api/admin/impersonate", async (c) => {
  const { targetUserId, reason } = await c.req.json<{ targetUserId: string; reason: string }>();
  if (!targetUserId || !reason || reason.trim().length < 10) {
    return c.json({ error: "targetUserId + reason (min 10 chars) required" }, 400);
  }

  const expiresAt = new Date(Date.now() + 4 * 3600 * 1000); // 4 hours
  const [sess] = await db.insert(impersonationSession).values({
    adminUserId: c.get("adminUserId"),
    targetUserId,
    reason: reason.trim(),
    expiresAt,
    ipAddress: c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  }).returning();

  await auditLog(c, "impersonate", targetUserId, { sessionId: sess.id, reason, expiresAt });

  // Two cookies: the secure one server-side enforces; a JS-readable hint cookie
  // lets the customer-app banner know to render.
  c.header("Set-Cookie", `addisonx_impersonating=${sess.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${4 * 3600}`, { append: true });
  c.header("Set-Cookie", `addisonx_impersonating_hint=1; Path=/; SameSite=Lax; Max-Age=${4 * 3600}`, { append: true });
  return c.json({ ok: true, sessionId: sess.id, expiresAt });
});

admin.post("/api/admin/impersonate/end", async (c) => {
  await db.update(impersonationSession)
    .set({ endedAt: new Date() })
    .where(and(eq(impersonationSession.adminUserId, c.get("adminUserId")), isNull(impersonationSession.endedAt)));
  await auditLog(c, "impersonate_end", null);
  c.header("Set-Cookie", "addisonx_impersonating=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0", { append: true });
  c.header("Set-Cookie", "addisonx_impersonating_hint=; Path=/; SameSite=Lax; Max-Age=0", { append: true });
  return c.json({ ok: true });
});

/* ─────────── Audit log ─────────── */

admin.get("/api/admin/audit", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? 100), 1000);
  const action = c.req.query("action");
  const actor = c.req.query("actor");
  const since = c.req.query("since"); // ISO date
  const until = c.req.query("until"); // ISO date

  const conds = [];
  if (action) conds.push(eq(adminAuditLog.action, action));
  if (actor) conds.push(eq(adminAuditLog.actorUserId, actor));
  if (since) conds.push(gt(adminAuditLog.createdAt, new Date(since)));
  if (until) conds.push(sql`${adminAuditLog.createdAt} < ${new Date(until)}`);

  const rows = await db
    .select({
      id: adminAuditLog.id,
      action: adminAuditLog.action,
      actorUserId: adminAuditLog.actorUserId,
      actorEmail: user.email,
      actorName: user.name,
      targetUserId: adminAuditLog.targetUserId,
      payload: adminAuditLog.payload,
      ipAddress: adminAuditLog.ipAddress,
      userAgent: adminAuditLog.userAgent,
      createdAt: adminAuditLog.createdAt,
    })
    .from(adminAuditLog)
    .leftJoin(user, eq(adminAuditLog.actorUserId, user.id))
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(limit);

  // CSV export
  if (c.req.query("format") === "csv") {
    const header = "timestamp,action,actor_email,actor_id,target_user_id,ip_address,payload\n";
    const lines = rows.map((r) => {
      const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      return [
        r.createdAt.toISOString(),
        r.action,
        r.actorEmail ?? "",
        r.actorUserId,
        r.targetUserId ?? "",
        r.ipAddress ?? "",
        r.payload ?? "",
      ].map(esc).join(",");
    }).join("\n");
    return new Response(header + lines + "\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return c.json(rows);
});

/* ─────────── Staff management ─────────── */

admin.post("/api/admin/staff/promote", requireAdmin(["super_admin"]), async (c) => {
  const body = await c.req.json<{ email: string; adminRole: string }>();
  const email = body.email?.trim().toLowerCase();
  const adminRole = body.adminRole;
  if (!email) return c.json({ error: "email required" }, 400);
  if (!["super_admin", "support", "billing", "moderator"].includes(adminRole)) {
    return c.json({ error: "Invalid role" }, 400);
  }

  const [target] = await db.select({ id: user.id, email: user.email, isStaff: user.isStaff })
    .from(user).where(eq(user.email, email)).limit(1);
  if (!target) {
    return c.json({
      error: `No user with email "${email}". They must sign up at /auth first, then come back to promote.`,
    }, 404);
  }

  await db.update(user).set({
    isStaff: true,
    adminRole,
    adminInvitedBy: c.get("adminUserId"),
  }).where(eq(user.id, target.id));

  await auditLog(c, target.isStaff ? "change_staff_role" : "invite_staff", target.id, { email, adminRole });
  return c.json({ ok: true, id: target.id, email: target.email, adminRole });
});

admin.get("/api/admin/staff", async (c) => {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      adminRole: user.adminRole,
      adminInvitedBy: user.adminInvitedBy,
      adminLastLoginAt: user.adminLastLoginAt,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.isStaff, true))
    .orderBy(desc(user.createdAt));
  return c.json(rows);
});

admin.patch("/api/admin/staff/:id", requireAdmin(["super_admin"]), async (c) => {
  const id = c.req.param("id");
  const { adminRole } = await c.req.json<{ adminRole: string }>();
  if (!["super_admin", "support", "billing", "moderator"].includes(adminRole)) {
    return c.json({ error: "Invalid role" }, 400);
  }
  await db.update(user).set({ adminRole }).where(eq(user.id, id));
  await auditLog(c, "change_staff_role", id, { adminRole });
  return c.json({ ok: true });
});

admin.delete("/api/admin/staff/:id", requireAdmin(["super_admin"]), async (c) => {
  const id = c.req.param("id");
  if (id === c.get("adminUserId")) return c.json({ error: "Cannot remove yourself" }, 400);
  await db.update(user).set({ isStaff: false, adminRole: null }).where(eq(user.id, id));
  await auditLog(c, "remove_staff", id);
  return c.json({ ok: true });
});

/* ─────────── Subscriptions (uses user.plan + user.mrrInr) ─────────── */

admin.get("/api/admin/subscriptions", async (c) => {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      status: user.accountStatus,
      mrrInr: user.mrrInr,
      trialEndsAt: user.trialEndsAt,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(and(eq(user.isStaff, false), sql`${user.plan} != 'starter' OR ${user.mrrInr} > 0`))
    .orderBy(desc(user.mrrInr));
  return c.json(rows);
});

admin.post("/api/admin/subscriptions/:id/refund", requireAdmin(["super_admin", "billing"]), async (c) => {
  const id = c.req.param("id");
  const { amount, reason, paymentId } = await c.req.json<{ amount: number; reason: string; paymentId?: string }>();
  if (!amount || amount <= 0) return c.json({ error: "amount required" }, 400);
  if (!reason || reason.length < 5) return c.json({ error: "reason (min 5 chars) required" }, 400);

  // Check whether Razorpay live mode is on
  const [liveMode] = await db.select().from(systemSetting).where(eq(systemSetting.key, "razorpay_live_mode")).limit(1);
  const [keyIdRow] = await db.select().from(systemSetting).where(eq(systemSetting.key, "razorpay_key_id")).limit(1);
  const keyId = keyIdRow?.value ?? "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";
  const isLive = liveMode?.value === "true";

  // No payment id, or live mode off, or keys missing — just queue in audit
  if (!isLive || !paymentId || !keyId || !keySecret) {
    await auditLog(c, "refund", id, {
      amount, reason, paymentId: paymentId ?? null,
      mode: "audit-only",
      reasonForFallback:
        !isLive ? "razorpay_live_mode is OFF" :
        !paymentId ? "no paymentId provided" :
        !keyId ? "razorpay_key_id not set in /admin/settings" :
        !keySecret ? "RAZORPAY_KEY_SECRET missing in env" :
        "unknown",
    });
    return c.json({
      ok: true,
      mode: "audit-only",
      note: "Recorded in audit log. Live refund skipped — see audit payload for why.",
    });
  }

  // Live Razorpay refund call
  try {
    const r = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // paise
        notes: { reason, addisonx_user_id: id, refunded_by: c.get("adminUserId") },
      }),
    });

    const body = await r.json().catch(() => ({}));
    await auditLog(c, "refund", id, { amount, reason, paymentId, mode: "live", razorpayResponse: body, status: r.status });

    if (!r.ok) {
      return c.json({ ok: false, error: body.error?.description ?? "Razorpay returned an error", razorpay: body }, 400);
    }
    return c.json({ ok: true, mode: "live", refund: body });
  } catch (e) {
    await auditLog(c, "refund", id, { amount, reason, paymentId, mode: "live-error", error: String(e) });
    return c.json({ ok: false, error: "Razorpay call failed: " + String(e) }, 500);
  }
});

/* ─────────── System settings (feature flags + mode toggles) ─────────── */

/** Public read-only endpoint — customer app uses this to learn which
 *  feature flags + system toggles are currently on. Skips requireAdmin.
 *  Only exposes keys that are safe to share (no secrets like razorpay_key_id). */
admin.get("/api/system/flags", async (c) => {
  const rows = await db.select().from(systemSetting);
  const safe: Record<string, string | null> = {};
  for (const r of rows) {
    if (r.key.includes("key_id") || r.key.includes("secret")) continue;  // never expose
    safe[r.key] = r.value;
  }
  return c.json(safe);
});

admin.get("/api/admin/settings", async (c) => {
  const rows = await db.select().from(systemSetting).orderBy(systemSetting.category, systemSetting.key);
  return c.json(rows);
});

admin.patch("/api/admin/settings/:key", requireAdmin(["super_admin"]), async (c) => {
  const key = c.req.param("key");
  const { value } = await c.req.json<{ value: string }>();
  if (value === undefined || value === null) return c.json({ error: "value required" }, 400);

  const [existing] = await db.select().from(systemSetting).where(eq(systemSetting.key, key)).limit(1);
  if (!existing) return c.json({ error: "Unknown setting" }, 404);

  await db.update(systemSetting)
    .set({ value: String(value), updatedBy: c.get("adminUserId"), updatedAt: new Date() })
    .where(eq(systemSetting.key, key));
  await auditLog(c, "change_setting", null, { key, value });
  return c.json({ ok: true });
});

/* ─────────── System health ─────────── */

admin.get("/api/admin/health", async (c) => {
  const checks: Array<{ service: string; status: "ok" | "warn" | "fail"; latencyMs: number; detail?: string }> = [];

  // DB
  const dbStart = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    checks.push({ service: "Postgres (Neon)", status: "ok", latencyMs: Date.now() - dbStart });
  } catch (e) {
    checks.push({ service: "Postgres (Neon)", status: "fail", latencyMs: Date.now() - dbStart, detail: String(e) });
  }

  // Meta — count configured + enabled
  const [metaStats] = await db.select({
    total: count(),
    enabled: sql<number>`COUNT(*) FILTER (WHERE ${metaConfig.enabled} = true)`,
  }).from(metaConfig);
  checks.push({
    service: "Meta WhatsApp Business API",
    status: metaStats.enabled > 0 ? "ok" : "warn",
    latencyMs: 0,
    detail: `${metaStats.enabled}/${metaStats.total} workspaces connected`,
  });

  // Razorpay placeholder
  checks.push({ service: "Razorpay", status: "warn", latencyMs: 0, detail: "Not wired in this build" });

  return c.json({
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default admin;
