import { Hono } from "hono";
import { db } from "../db/client";
import {
  user, contact, conversation, message, deal, campaign, broadcast, task,
  adminAuditLog, impersonationSession, metaConfig, systemSetting, upgradeRequest,
  webhookOrphan, profile, prebuiltAgent, aiAgent,
} from "../db/schema";
import { eq, desc, asc, sql, and, gt, isNull, or, ilike, count, inArray } from "drizzle-orm";
import { requireAdmin, auditLog, type AdminVariables } from "../middleware/admin";
import { sendMail } from "../lib/mailer";
import { staffInviteTemplate, suspensionTemplate, refundTemplate } from "../lib/email-templates";
import { invalidateSeoCache } from "../lib/seo";
import { escapeSqlLike } from "../utils";
import { logActivity } from "../lib/activity-log";
import { seedPrebuiltTemplatesIfEmpty } from "../lib/ai-persona";

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
  logActivity(u.id, 'admin_login', {
    ipAddress: c.req.header('x-forwarded-for')?.split(',')[0]?.trim(),
  });
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
  const [orphans24h] = await db.select({ n: count() }).from(webhookOrphan)
    .where(and(gt(webhookOrphan.createdAt, today), isNull(webhookOrphan.claimedUserId)));

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
    unroutedWebhooks24h: orphans24h.n,
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
  if (q) conds.push(or(ilike(user.email, `%${escapeSqlLike(q)}%`), ilike(user.name, `%${escapeSqlLike(q)}%`))!);
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

  // Notify the user. Fire-and-forget so the API stays snappy.
  const [target] = await db.select().from(user).where(eq(user.id, id)).limit(1);
  if (target) {
    const tpl = suspensionTemplate(target.name ?? "", reason.trim(), "Contact@addisonxmedia.com");
    sendMail({ to: target.email, subject: tpl.subject, html: tpl.html })
      .catch((e) => console.error("[suspension email]", e));
  }
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
  const secureSuffix = process.env.NODE_ENV === "production" ? "; Secure" : "";
  c.header("Set-Cookie", `addisonx_impersonating=${sess.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${4 * 3600}${secureSuffix}`, { append: true });
  c.header("Set-Cookie", `addisonx_impersonating_hint=1; Path=/; SameSite=Lax; Max-Age=${4 * 3600}${secureSuffix}`, { append: true });
  return c.json({ ok: true, sessionId: sess.id, expiresAt });
});

admin.post("/api/admin/impersonate/end", async (c) => {
  await db.update(impersonationSession)
    .set({ endedAt: new Date() })
    .where(and(eq(impersonationSession.adminUserId, c.get("adminUserId")), isNull(impersonationSession.endedAt)));
  await auditLog(c, "impersonate_end", null);
  const secureSuffix = process.env.NODE_ENV === "production" ? "; Secure" : "";
  c.header("Set-Cookie", `addisonx_impersonating=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureSuffix}`, { append: true });
  c.header("Set-Cookie", `addisonx_impersonating_hint=; Path=/; SameSite=Lax; Max-Age=0${secureSuffix}`, { append: true });
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

  // Email the new staff member. Only send on first promotion — re-roling an
  // existing staff member doesn't need a "welcome to the team" email.
  if (!target.isStaff) {
    const adminEmail = c.get("adminEmail");
    const baseUrl = process.env.BETTER_AUTH_URL ?? "https://addisonxmedia.com";
    const tpl = staffInviteTemplate(adminEmail ?? "An admin", adminRole, `${baseUrl}/admin`);
    sendMail({ to: target.email, subject: tpl.subject, html: tpl.html })
      .catch((e) => console.error("[staff invite email]", e));
  }
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

/* ─────────── Upgrade requests (manual fulfillment queue) ─────────── */
//
// Until Razorpay is live, admins manually process plan upgrades. List view
// shows pending requests; activate endpoint completes a request + bumps the
// user's plan in a single atomic-ish flow (two updates, no transaction yet
// because we use postgres-js which doesn't expose tx in this setup).

admin.get("/api/admin/upgrade-requests", async (c) => {
  const status = c.req.query("status"); // 'requested' | 'contacted' | 'paid' | 'completed' | etc.
  const baseWhere = status
    ? eq(upgradeRequest.status, status)
    : sql`${upgradeRequest.status} IN ('requested', 'contacted', 'paid')`;

  const rows = await db
    .select({
      id: upgradeRequest.id,
      userId: upgradeRequest.userId,
      targetPlan: upgradeRequest.targetPlan,
      billingCycle: upgradeRequest.billingCycle,
      status: upgradeRequest.status,
      customerNote: upgradeRequest.customerNote,
      adminNotes: upgradeRequest.adminNotes,
      razorpayPaymentId: upgradeRequest.razorpayPaymentId,
      createdAt: upgradeRequest.createdAt,
      completedAt: upgradeRequest.completedAt,
      userEmail: user.email,
      userName: user.name,
      currentPlan: user.plan,
      currentMrr: user.mrrInr,
    })
    .from(upgradeRequest)
    .leftJoin(user, eq(upgradeRequest.userId, user.id))
    .where(baseWhere)
    .orderBy(desc(upgradeRequest.createdAt))
    .limit(100);

  return c.json(rows);
});

// Soft-update: change status, add notes, set Razorpay payment id. Does NOT
// flip the plan (use POST .../activate for that).
admin.patch("/api/admin/upgrade-requests/:id", requireAdmin(["super_admin", "billing"]), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{
    status?: string;
    admin_notes?: string | null;
    razorpay_payment_id?: string | null;
  }>();

  const set: Record<string, unknown> = {};
  if (body.status) {
    const valid = ["requested", "contacted", "paid", "completed", "declined", "cancelled"];
    if (!valid.includes(body.status)) return c.json({ error: "Invalid status" }, 400);

    // State machine guard: validate transition
    const VALID_TRANSITIONS: Record<string, string[]> = {
      requested: ['contacted', 'paid', 'completed', 'declined', 'cancelled'],
      contacted: ['paid', 'completed', 'declined', 'cancelled'],
      paid: ['completed', 'declined'],
      completed: [],
      declined: [],
      cancelled: [],
    };
    const [current] = await db.select({ status: upgradeRequest.status }).from(upgradeRequest).where(eq(upgradeRequest.id, id)).limit(1);
    if (!current) return c.json({ error: "Not found" }, 404);
    const allowed = VALID_TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(body.status)) {
      return c.json({ error: 'invalid_transition', from: current.status, to: body.status, allowed }, 400);
    }

    set.status = body.status;
  }
  if ("admin_notes" in body) set.adminNotes = body.admin_notes ?? null;
  if ("razorpay_payment_id" in body) set.razorpayPaymentId = body.razorpay_payment_id ?? null;
  if (body.status === "declined" || body.status === "cancelled") set.completedAt = new Date();

  const [row] = await db.update(upgradeRequest).set(set).where(eq(upgradeRequest.id, id)).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  await auditLog(c, "upgrade_request_update", row.userId, { request_id: id, ...body });
  return c.json(row);
});

// The big button: "Activate plan". Flips user.plan to the target + marks the
// upgrade_request completed. This is the only path that should change a paid
// user's plan from the admin panel.
admin.post("/api/admin/upgrade-requests/:id/activate", requireAdmin(["super_admin", "billing"]), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{
    mrr_inr?: number;
    admin_notes?: string;
    razorpay_payment_id?: string;
  }>();

  const [req] = await db.select().from(upgradeRequest).where(eq(upgradeRequest.id, id)).limit(1);
  if (!req) return c.json({ error: "Not found" }, 404);
  if (req.status === "completed") return c.json({ error: "Already completed" }, 400);

  // 1. Flip the user's plan
  const userUpdate: Record<string, unknown> = {
    plan: req.targetPlan,
    accountStatus: "active",
    updatedAt: new Date(),
  };
  if (body.mrr_inr !== undefined) userUpdate.mrrInr = String(body.mrr_inr);
  await db.update(user).set(userUpdate).where(eq(user.id, req.userId));

  // 2. Complete the request
  await db.update(upgradeRequest).set({
    status: "completed",
    completedAt: new Date(),
    adminNotes: body.admin_notes ?? req.adminNotes,
    razorpayPaymentId: body.razorpay_payment_id ?? req.razorpayPaymentId,
  }).where(eq(upgradeRequest.id, id));

  await auditLog(c, "upgrade_activated", req.userId, {
    request_id: id,
    target_plan: req.targetPlan,
    billing_cycle: req.billingCycle,
    mrr_inr: body.mrr_inr,
    razorpay_payment_id: body.razorpay_payment_id,
  });

  return c.json({ ok: true, plan: req.targetPlan });
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
    // Notify the customer that a refund is on the way.
    const [target] = await db.select().from(user).where(eq(user.id, id)).limit(1);
    if (target) {
      const tpl = refundTemplate(target.name ?? "", amount, reason);
      sendMail({ to: target.email, subject: tpl.subject, html: tpl.html })
        .catch((e) => console.error("[refund email]", e));
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
/** Public — returns Cloudinary unsigned-upload config from env so the browser
 *  can do direct-to-Cloudinary uploads without proxying multi-MB image bytes
 *  through our Render compute. Both values are safe to expose: the upload
 *  preset must be marked "unsigned" in the Cloudinary dashboard (which limits
 *  folder + formats + max size), and cloud_name is in every delivery URL
 *  anyway. When env vars are missing, enabled=false and the SPA falls back
 *  to URL-paste mode. */
admin.get("/api/system/uploads/config", async (c) => {
  // Accept either the explicit pair (CLOUDINARY_CLOUD_NAME + CLOUDINARY_UPLOAD_PRESET)
  // or the standard CLOUDINARY_URL Cloudinary dashboard hands out
  // (format: cloudinary://<key>:<secret>@<cloud_name>). We only pull the
  // cloud_name from CLOUDINARY_URL — the upload preset still has to be set
  // separately because the dashboard URL doesn't include it.
  let cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? "";
  if (!cloudName && process.env.CLOUDINARY_URL) {
    const match = process.env.CLOUDINARY_URL.match(/^cloudinary:\/\/[^:]+:[^@]+@(.+)$/);
    if (match) cloudName = match[1];
  }
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET ?? "";
  return c.json({
    enabled: Boolean(cloudName && uploadPreset),
    cloudName: cloudName || null,
    uploadPreset: uploadPreset || null,
    maxImageMb: Number(process.env.CLOUDINARY_MAX_IMAGE_MB ?? 25),
    maxVideoMb: Number(process.env.CLOUDINARY_MAX_VIDEO_MB ?? 100),
  });
});

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
  // SEO + branding changes drive the served HTML — bust the cache so the next
  // page load reflects the new value immediately.
  if (existing.category === "seo" || existing.category === "branding") {
    invalidateSeoCache();
  }
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

  // Cashfree — checks env config + active upgrade requests for visibility
  const { cashfreeIsConfigured, cashfreeMode } = await import("../integrations/cashfree");
  if (cashfreeIsConfigured()) {
    const [paidCount] = await db.select({ n: count(upgradeRequest.id) })
      .from(upgradeRequest)
      .where(and(
        eq(upgradeRequest.status, "completed"),
        gt(upgradeRequest.completedAt, new Date(Date.now() - 30 * 24 * 3600 * 1000)),
      ));
    checks.push({
      service: "Cashfree Payment Gateway",
      status: "ok",
      latencyMs: 0,
      detail: `${cashfreeMode()} mode · ${paidCount.n} paid upgrades in last 30d`,
    });
  } else {
    checks.push({
      service: "Cashfree Payment Gateway",
      status: "warn",
      latencyMs: 0,
      detail: "Not configured — set CASHFREE_APP_ID + CASHFREE_SECRET_KEY (manual upgrade-request flow stays active as fallback)",
    });
  }

  return c.json({
    checks,
    timestamp: new Date().toISOString(),
  });
});

/* ─────────────────────────────────────────────────────────────────────────
 *  Chat-ownership diagnostics
 *
 *  Inbound WhatsApp messages are routed to the user_id stored in meta_config
 *  for the given phone_number_id. If a customer wonders "why am I not seeing
 *  my chats?" the answer is almost always: those chats are owned by a
 *  DIFFERENT user account (likely the one that originally connected the WABA
 *  phone). These endpoints expose that mapping and let an admin reassign
 *  ownership in a single transactional sweep.
 * ───────────────────────────────────────────────────────────────────────── */

admin.get("/api/admin/diagnostics/chat-ownership", requireAdmin(["super_admin", "moderator", "billing"]), async (c) => {
  // Per-user counts (only users with at least one row in any of the 3 tables)
  const convCounts = await db
    .select({ ownerId: conversation.ownerId, n: count(conversation.id) })
    .from(conversation)
    .groupBy(conversation.ownerId);
  const contactCounts = await db
    .select({ ownerId: contact.ownerId, n: count(contact.id) })
    .from(contact)
    .groupBy(contact.ownerId);
  const messageCounts = await db
    .select({ ownerId: message.ownerId, n: count(message.id) })
    .from(message)
    .groupBy(message.ownerId);

  const byUser = new Map<string, { conversations: number; contacts: number; messages: number }>();
  const bump = (id: string | null | undefined, key: "conversations" | "contacts" | "messages", n: number) => {
    if (!id) return;
    const row = byUser.get(id) ?? { conversations: 0, contacts: 0, messages: 0 };
    row[key] = Number(n);
    byUser.set(id, row);
  };
  for (const r of convCounts) bump(r.ownerId, "conversations", r.n);
  for (const r of contactCounts) bump(r.ownerId, "contacts", r.n);
  for (const r of messageCounts) bump(r.ownerId, "messages", r.n);

  const userIds = Array.from(byUser.keys());
  const users = userIds.length
    ? await db.select({ id: user.id, name: user.name, email: user.email, plan: user.plan }).from(user).where(or(...userIds.map((id) => eq(user.id, id))))
    : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  const ownership = Array.from(byUser.entries())
    .map(([userId, counts]) => ({
      userId,
      email: userById.get(userId)?.email ?? "(deleted user)",
      name: userById.get(userId)?.name ?? "—",
      plan: userById.get(userId)?.plan ?? null,
      ...counts,
    }))
    .sort((a, b) => b.conversations - a.conversations);

  // meta_config → user mapping (which account is the webhook routing to?)
  const metaRows = await db
    .select({
      id: metaConfig.id,
      userId: metaConfig.userId,
      phoneNumberId: metaConfig.phoneNumberId,
      displayPhoneNumber: metaConfig.displayPhoneNumber,
      enabled: metaConfig.enabled,
      lastVerifiedAt: metaConfig.lastVerifiedAt,
      email: user.email,
      name: user.name,
    })
    .from(metaConfig)
    .leftJoin(user, eq(user.id, metaConfig.userId))
    .orderBy(desc(metaConfig.lastVerifiedAt));

  // Unrouted-webhooks KPI for the diagnostic header
  const since24h = new Date(Date.now() - 24 * 3600 * 1000);
  const [{ c: orphan24h }] = await db
    .select({ c: count(webhookOrphan.id) })
    .from(webhookOrphan)
    .where(and(gt(webhookOrphan.createdAt, since24h), isNull(webhookOrphan.claimedUserId)));

  return c.json({ ownership, metaConfigs: metaRows, unroutedWebhooks24h: Number(orphan24h) });
});

/* Deep inspect — exposes EVERYTHING about a single account / phone /
 * email so admin can debug "why don't I see my chats" without writing SQL.
 *
 * Query `q` is matched against email (substring), user.id (exact),
 * phone_number_id (substring), display_phone_number (substring).
 *
 * Returns:
 *   - All matching user rows with their counts + plan/status
 *   - All meta_config rows that match (user-id wise or phone-wise)
 *   - All conversations owned by any matched user, with contact info
 *   - The merge/consolidate suggestion (best canonical user_id)
 */
admin.get("/api/admin/diagnostics/inspect", requireAdmin(["super_admin", "moderator", "billing"]), async (c) => {
  const qRaw = c.req.query("q")?.trim();
  if (!qRaw) return c.json({ error: "q parameter required" }, 400);
  const q = qRaw.toLowerCase();
  const qLike = `%${escapeSqlLike(q)}%`;

  // 1. Find candidate users by email substring OR exact id match.
  const userMatches = await db.select({
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    status: user.accountStatus,
    createdAt: user.createdAt,
  }).from(user)
    .where(or(ilike(user.email, qLike), eq(user.id, qRaw)))
    .orderBy(asc(user.createdAt));

  // 2. Find meta_configs by phone substring (also pulls users that own them).
  const metaMatches = await db
    .select({
      id: metaConfig.id,
      userId: metaConfig.userId,
      phoneNumberId: metaConfig.phoneNumberId,
      displayPhoneNumber: metaConfig.displayPhoneNumber,
      enabled: metaConfig.enabled,
      lastVerifiedAt: metaConfig.lastVerifiedAt,
      userEmail: user.email,
      userName: user.name,
      userPlan: user.plan,
    })
    .from(metaConfig)
    .leftJoin(user, eq(user.id, metaConfig.userId))
    .where(or(
      ilike(metaConfig.phoneNumberId, qLike),
      ilike(metaConfig.displayPhoneNumber, qLike),
      // Also include configs whose owner appears in userMatches
      userMatches.length > 0 ? inArray(metaConfig.userId, userMatches.map((u) => u.id)) : sql`false`,
    ));

  // 3. Union of user ids we care about.
  const allUserIds = Array.from(new Set([
    ...userMatches.map((u) => u.id),
    ...metaMatches.map((m) => m.userId),
  ]));

  // 4. Per-user counts
  const [convCounts, contactCounts, messageCounts] = allUserIds.length > 0
    ? await Promise.all([
        db.select({ ownerId: conversation.ownerId, n: count(conversation.id) })
          .from(conversation).where(inArray(conversation.ownerId, allUserIds)).groupBy(conversation.ownerId),
        db.select({ ownerId: contact.ownerId, n: count(contact.id) })
          .from(contact).where(inArray(contact.ownerId, allUserIds)).groupBy(contact.ownerId),
        db.select({ ownerId: message.ownerId, n: count(message.id) })
          .from(message).where(inArray(message.ownerId, allUserIds)).groupBy(message.ownerId),
      ])
    : [[], [], []];

  const countsByUser = new Map<string, { conversations: number; contacts: number; messages: number }>();
  for (const id of allUserIds) countsByUser.set(id, { conversations: 0, contacts: 0, messages: 0 });
  for (const r of convCounts)    countsByUser.get(r.ownerId)!.conversations = Number(r.n);
  for (const r of contactCounts) countsByUser.get(r.ownerId)!.contacts      = Number(r.n);
  for (const r of messageCounts) countsByUser.get(r.ownerId)!.messages      = Number(r.n);

  // 5. Pull complete user records for any user_id touched (incl. ones found
  //    only via meta_config that didn't match the original q).
  const extraUserIds = allUserIds.filter((id) => !userMatches.some((u) => u.id === id));
  const extraUsers = extraUserIds.length > 0
    ? await db.select({
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        status: user.accountStatus,
        createdAt: user.createdAt,
      }).from(user).where(inArray(user.id, extraUserIds))
    : [];

  const allUsers = [...userMatches, ...extraUsers].map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name ?? "—",
    plan: u.plan ?? null,
    status: u.status ?? null,
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt),
    ...(countsByUser.get(u.id) ?? { conversations: 0, contacts: 0, messages: 0 }),
    hasMetaConfig: metaMatches.some((m) => m.userId === u.id),
    matchedDirectly: userMatches.some((mu) => mu.id === u.id),
  })).sort((a, b) => (b.conversations + b.contacts + b.messages) - (a.conversations + a.contacts + a.messages));

  // 6. Find recent conversations across all matched users (preview)
  const conversations = allUserIds.length > 0
    ? await db
        .select({
          id: conversation.id,
          ownerId: conversation.ownerId,
          status: conversation.status,
          lastMessageAt: conversation.lastMessageAt,
          unreadCount: conversation.unreadCount,
          contactName: contact.name,
          contactPhone: contact.phone,
        })
        .from(conversation)
        .leftJoin(contact, eq(contact.id, conversation.contactId))
        .where(inArray(conversation.ownerId, allUserIds))
        .orderBy(desc(conversation.lastMessageAt))
        .limit(50)
    : [];

  // 7. Suggest canonical user: the one with the most data among matches
  const suggestedCanonical = allUsers.length > 0 ? allUsers[0] : null;

  return c.json({
    query: qRaw,
    users: allUsers,
    metaConfigs: metaMatches,
    conversations,
    suggestion: suggestedCanonical
      ? {
          canonicalUserId: suggestedCanonical.id,
          canonicalEmail: suggestedCanonical.email,
          duplicateUserIds: allUsers.filter((u) => u.id !== suggestedCanonical.id).map((u) => u.id),
          reason: "Highest data ownership (chats + contacts + messages)",
        }
      : null,
  });
});

/* Force-consolidate — destructive, super_admin only. Reassigns ALL
 * conversations/contacts/messages/deals/tasks/campaigns/broadcasts owned by
 * any of `sourceUserIds` to `targetUserId`. Also moves meta_config + profile.
 * Optionally deletes the source user rows. Used to fix "ghost owner" cases
 * where data is orphaned under user_ids that no one logs into. */
admin.post("/api/admin/diagnostics/consolidate", requireAdmin(["super_admin"]), async (c) => {
  const body = await c.req.json<{
    targetUserId: string;
    sourceUserIds: string[];
    deleteSources?: boolean;
  }>();
  if (!body.targetUserId || !Array.isArray(body.sourceUserIds) || body.sourceUserIds.length === 0) {
    return c.json({ error: "targetUserId and sourceUserIds[] required" }, 400);
  }
  if (body.sourceUserIds.includes(body.targetUserId)) {
    return c.json({ error: "targetUserId cannot be in sourceUserIds" }, 400);
  }

  const [target] = await db.select().from(user).where(eq(user.id, body.targetUserId)).limit(1);
  if (!target) return c.json({ error: "targetUserId not found" }, 404);
  const sources = await db.select().from(user).where(inArray(user.id, body.sourceUserIds));

  const targetId = body.targetUserId;
  const summary = await db.transaction(async (tx) => {
    const moved: Record<string, number> = {
      conversations: 0, contacts: 0, messages: 0, deals: 0,
      tasks: 0, campaigns: 0, broadcasts: 0, upgradeRequests: 0,
    };
    let metaConfigMoves = 0;
    let profileMoves = 0;
    let deletedUsers = 0;

    for (const src of sources) {
      const srcId = src.id;
      moved.conversations += (await tx.update(conversation).set({ ownerId: targetId })
        .where(eq(conversation.ownerId, srcId)).returning({ id: conversation.id })).length;
      moved.contacts += (await tx.update(contact).set({ ownerId: targetId })
        .where(eq(contact.ownerId, srcId)).returning({ id: contact.id })).length;
      moved.messages += (await tx.update(message).set({ ownerId: targetId })
        .where(eq(message.ownerId, srcId)).returning({ id: message.id })).length;
      moved.deals += (await tx.update(deal).set({ ownerId: targetId })
        .where(eq(deal.ownerId, srcId)).returning({ id: deal.id })).length;
      moved.tasks += (await tx.update(task).set({ ownerId: targetId })
        .where(eq(task.ownerId, srcId)).returning({ id: task.id })).length;
      moved.campaigns += (await tx.update(campaign).set({ ownerId: targetId })
        .where(eq(campaign.ownerId, srcId)).returning({ id: campaign.id })).length;
      moved.broadcasts += (await tx.update(broadcast).set({ ownerId: targetId })
        .where(eq(broadcast.ownerId, srcId)).returning({ id: broadcast.id })).length;
      moved.upgradeRequests += (await tx.update(upgradeRequest).set({ userId: targetId })
        .where(eq(upgradeRequest.userId, srcId)).returning({ id: upgradeRequest.id })).length;

      const [targetMeta] = await tx.select().from(metaConfig).where(eq(metaConfig.userId, targetId)).limit(1);
      if (!targetMeta) {
        metaConfigMoves += (await tx.update(metaConfig).set({ userId: targetId })
          .where(eq(metaConfig.userId, srcId)).returning({ id: metaConfig.id })).length;
      } else {
        await tx.delete(metaConfig).where(eq(metaConfig.userId, srcId));
      }
      const [targetProfile] = await tx.select().from(profile).where(eq(profile.userId, targetId)).limit(1);
      if (!targetProfile) {
        profileMoves += (await tx.update(profile).set({ userId: targetId })
          .where(eq(profile.userId, srcId)).returning({ id: profile.id })).length;
      } else {
        await tx.delete(profile).where(eq(profile.userId, srcId));
      }

      if (body.deleteSources) {
        await tx.delete(user).where(eq(user.id, srcId));
        deletedUsers += 1;
      }
    }
    return { moved, metaConfigMoves, profileMoves, deletedUsers };
  });

  await auditLog(c, "consolidate_accounts", body.targetUserId, {
    targetUserId: body.targetUserId,
    targetEmail: target.email,
    sourceUserIds: body.sourceUserIds,
    sourceEmails: sources.map((u) => u.email),
    deleteSources: !!body.deleteSources,
    summary,
  });

  return c.json({ ok: true, summary });
});

/* Duplicate accounts — multiple `user` rows sharing the same email (case-
 * insensitive). This is the root cause of "I don't see my chats" — the
 * session is logged into one user_id, the chats live on a sibling user_id
 * with the same email. Merge-action moves all owned data to a chosen
 * canonical user and deletes the duplicates. */
admin.get("/api/admin/diagnostics/duplicate-accounts", requireAdmin(["super_admin", "moderator", "billing"]), async (c) => {
  // Pull all users, group client-side by lower(email). Cheap at the scale
  // we're at and avoids fiddly array_agg type-narrowing through Drizzle.
  const allUsers = await db.select({
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    status: user.accountStatus,
    createdAt: user.createdAt,
  }).from(user).orderBy(asc(user.createdAt));

  // Normalize: trim, lowercase, collapse internal whitespace, strip
  // zero-width / non-printing chars. Whitespace and casing differences
  // hid duplicates from the first version of this detector.
  const normalizeEmail = (e: string) =>
    e
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[​-‍﻿]/g, ""); // zero-width chars

  const groupsByEmail = new Map<string, typeof allUsers>();
  for (const u of allUsers) {
    const key = normalizeEmail(u.email);
    if (!key) continue;
    const existing = groupsByEmail.get(key) ?? [];
    existing.push(u);
    groupsByEmail.set(key, existing);
  }
  const duplicateGroups = Array.from(groupsByEmail.entries())
    .filter(([, users]) => users.length > 1);

  if (duplicateGroups.length === 0) return c.json({ groups: [] });

  // Per-user counts so admin can pick a canonical intelligently.
  const allIds = duplicateGroups.flatMap(([, users]) => users.map((u) => u.id));
  const [convCounts, contactCounts, messageCounts, metaCounts] = await Promise.all([
    db.select({ ownerId: conversation.ownerId, n: count(conversation.id) })
      .from(conversation).where(inArray(conversation.ownerId, allIds))
      .groupBy(conversation.ownerId),
    db.select({ ownerId: contact.ownerId, n: count(contact.id) })
      .from(contact).where(inArray(contact.ownerId, allIds))
      .groupBy(contact.ownerId),
    db.select({ ownerId: message.ownerId, n: count(message.id) })
      .from(message).where(inArray(message.ownerId, allIds))
      .groupBy(message.ownerId),
    db.select({ userId: metaConfig.userId, n: count(metaConfig.id) })
      .from(metaConfig).where(inArray(metaConfig.userId, allIds))
      .groupBy(metaConfig.userId),
  ]);

  const byId = new Map<string, { conversations: number; contacts: number; messages: number; metaConfigs: number }>();
  for (const id of allIds) byId.set(id, { conversations: 0, contacts: 0, messages: 0, metaConfigs: 0 });
  for (const r of convCounts)    byId.get(r.ownerId)!.conversations = Number(r.n);
  for (const r of contactCounts) byId.get(r.ownerId)!.contacts      = Number(r.n);
  for (const r of messageCounts) byId.get(r.ownerId)!.messages      = Number(r.n);
  for (const r of metaCounts)    byId.get(r.userId)!.metaConfigs    = Number(r.n);

  const groups = duplicateGroups.map(([emailNorm, users]) => ({
    emailNorm,
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name ?? "—",
      plan: u.plan ?? null,
      status: u.status ?? null,
      createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt),
      ...(byId.get(u.id) ?? { conversations: 0, contacts: 0, messages: 0, metaConfigs: 0 }),
    })),
  }));

  return c.json({ groups });
});

admin.post("/api/admin/diagnostics/merge-accounts", requireAdmin(["super_admin"]), async (c) => {
  const body = await c.req.json<{ canonicalUserId: string; duplicateUserIds: string[] }>();
  if (!body.canonicalUserId || !Array.isArray(body.duplicateUserIds) || body.duplicateUserIds.length === 0) {
    return c.json({ error: "canonicalUserId and duplicateUserIds[] required" }, 400);
  }
  if (body.duplicateUserIds.includes(body.canonicalUserId)) {
    return c.json({ error: "canonicalUserId cannot be in duplicateUserIds" }, 400);
  }

  const [canonical] = await db.select().from(user).where(eq(user.id, body.canonicalUserId)).limit(1);
  if (!canonical) return c.json({ error: "canonicalUserId not found" }, 404);
  const duplicates = await db.select().from(user).where(inArray(user.id, body.duplicateUserIds));
  if (duplicates.length === 0) return c.json({ error: "No duplicate users found" }, 404);

  // Safety: every duplicate must share the canonical's lower(email). This
  // prevents accidentally merging unrelated accounts.
  const canonEmail = canonical.email.toLowerCase();
  for (const dup of duplicates) {
    if (dup.email.toLowerCase() !== canonEmail) {
      return c.json({ error: `Refusing merge — user ${dup.id} email "${dup.email}" doesn't match canonical "${canonical.email}"` }, 400);
    }
  }

  // Transactional sweep: move all owned data, handle UNIQUE collisions on
  // meta_config + profile, then delete the duplicate user (which cascades
  // BetterAuth account/session rows). Using .returning({id}) lets us count
  // affected rows portably (postgres-js doesn't expose .rowCount via Drizzle).
  const canonicalId = body.canonicalUserId;
  const summary = await db.transaction(async (tx) => {
    const moved: Record<string, number> = { conversations: 0, contacts: 0, messages: 0, deals: 0, tasks: 0, campaigns: 0, broadcasts: 0, upgradeRequests: 0 };
    let metaConfigMoves = 0;
    let profileMoves = 0;

    for (const dup of duplicates) {
      const dupId = dup.id;

      moved.conversations += (await tx.update(conversation).set({ ownerId: canonicalId })
        .where(eq(conversation.ownerId, dupId)).returning({ id: conversation.id })).length;
      moved.contacts += (await tx.update(contact).set({ ownerId: canonicalId })
        .where(eq(contact.ownerId, dupId)).returning({ id: contact.id })).length;
      moved.messages += (await tx.update(message).set({ ownerId: canonicalId })
        .where(eq(message.ownerId, dupId)).returning({ id: message.id })).length;
      moved.deals += (await tx.update(deal).set({ ownerId: canonicalId })
        .where(eq(deal.ownerId, dupId)).returning({ id: deal.id })).length;
      moved.tasks += (await tx.update(task).set({ ownerId: canonicalId })
        .where(eq(task.ownerId, dupId)).returning({ id: task.id })).length;
      moved.campaigns += (await tx.update(campaign).set({ ownerId: canonicalId })
        .where(eq(campaign.ownerId, dupId)).returning({ id: campaign.id })).length;
      moved.broadcasts += (await tx.update(broadcast).set({ ownerId: canonicalId })
        .where(eq(broadcast.ownerId, dupId)).returning({ id: broadcast.id })).length;
      moved.upgradeRequests += (await tx.update(upgradeRequest).set({ userId: canonicalId })
        .where(eq(upgradeRequest.userId, dupId)).returning({ id: upgradeRequest.id })).length;

      // meta_config has UNIQUE(user_id) — only move if canonical has none
      const [canonMeta] = await tx.select().from(metaConfig).where(eq(metaConfig.userId, canonicalId)).limit(1);
      if (!canonMeta) {
        metaConfigMoves += (await tx.update(metaConfig).set({ userId: canonicalId })
          .where(eq(metaConfig.userId, dupId)).returning({ id: metaConfig.id })).length;
      } else {
        await tx.delete(metaConfig).where(eq(metaConfig.userId, dupId));
      }

      // profile has UNIQUE(user_id) — same special-case
      const [canonProfile] = await tx.select().from(profile).where(eq(profile.userId, canonicalId)).limit(1);
      if (!canonProfile) {
        profileMoves += (await tx.update(profile).set({ userId: canonicalId })
          .where(eq(profile.userId, dupId)).returning({ id: profile.id })).length;
      } else {
        await tx.delete(profile).where(eq(profile.userId, dupId));
      }

      // Delete the duplicate user — cascades to BetterAuth account/session
      // rows + any remaining FK-referenced data we didn't explicitly move.
      await tx.delete(user).where(eq(user.id, dupId));
    }

    return { moved, metaConfigMoves, profileMoves, deletedUsers: duplicates.length };
  });

  await auditLog(c, "merge_accounts", body.canonicalUserId, {
    canonicalUserId: body.canonicalUserId,
    canonicalEmail: canonical.email,
    duplicateUserIds: body.duplicateUserIds,
    duplicateEmails: duplicates.map((u) => u.email),
    summary,
  });

  return c.json({ ok: true, summary });
});

/* Webhook orphans — inbound messages that arrived for a phone_number_id we
 * have no meta_config for. Without this UI, those events were lost to a
 * console.warn. With this UI, admin can see the long-tail of "where are my
 * chats?" tickets, find the orphan messages, and claim them to a user. */
admin.get("/api/admin/diagnostics/webhook-orphans", requireAdmin(["super_admin", "moderator", "billing"]), async (c) => {
  const sinceParam = c.req.query("since"); // ISO date — default 7 days
  const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const onlyUnclaimed = c.req.query("only_unclaimed") === "1";

  // Per-phone aggregates so admin sees "X numbers, Y total events"
  const groupRows = await db
    .select({
      phoneNumberId: webhookOrphan.phoneNumberId,
      displayPhoneNumber: webhookOrphan.displayPhoneNumber,
      total: count(webhookOrphan.id),
      lastAt: sql<string>`max(${webhookOrphan.createdAt})`,
    })
    .from(webhookOrphan)
    .where(
      onlyUnclaimed
        ? and(gt(webhookOrphan.createdAt, since), isNull(webhookOrphan.claimedUserId))
        : gt(webhookOrphan.createdAt, since)
    )
    .groupBy(webhookOrphan.phoneNumberId, webhookOrphan.displayPhoneNumber)
    .orderBy(desc(sql`max(${webhookOrphan.createdAt})`));

  // Recent flat events (capped 50)
  const recent = await db
    .select()
    .from(webhookOrphan)
    .where(
      onlyUnclaimed
        ? and(gt(webhookOrphan.createdAt, since), isNull(webhookOrphan.claimedUserId))
        : gt(webhookOrphan.createdAt, since)
    )
    .orderBy(desc(webhookOrphan.createdAt))
    .limit(50);

  // 24h count (for KPI tile)
  const since24h = new Date(Date.now() - 24 * 3600 * 1000);
  const [{ c: count24h }] = await db
    .select({ c: count(webhookOrphan.id) })
    .from(webhookOrphan)
    .where(and(gt(webhookOrphan.createdAt, since24h), isNull(webhookOrphan.claimedUserId)));

  return c.json({
    groups: groupRows,
    recent,
    unclaimed24h: Number(count24h),
  });
});

admin.post("/api/admin/diagnostics/webhook-orphans/claim", requireAdmin(["super_admin"]), async (c) => {
  const body = await c.req.json<{ phoneNumberId: string; userId: string }>();
  if (!body.phoneNumberId || !body.userId) return c.json({ error: "phoneNumberId and userId required" }, 400);

  const [u] = await db.select().from(user).where(eq(user.id, body.userId)).limit(1);
  if (!u) return c.json({ error: "userId not found" }, 404);

  const result = await db.update(webhookOrphan)
    .set({ claimedUserId: body.userId, claimedAt: new Date() })
    .where(and(eq(webhookOrphan.phoneNumberId, body.phoneNumberId), isNull(webhookOrphan.claimedUserId)))
    .returning({ id: webhookOrphan.id });

  await auditLog(c, "claim_webhook_orphans", body.userId, {
    phoneNumberId: body.phoneNumberId,
    userEmail: u.email,
    claimedCount: result.length,
  });

  return c.json({ ok: true, claimedCount: result.length });
});

admin.delete("/api/admin/diagnostics/webhook-orphans", requireAdmin(["super_admin"]), async (c) => {
  const phoneNumberId = c.req.query("phone_number_id");
  const result = phoneNumberId
    ? await db.delete(webhookOrphan).where(eq(webhookOrphan.phoneNumberId, phoneNumberId)).returning({ id: webhookOrphan.id })
    : await db.delete(webhookOrphan).returning({ id: webhookOrphan.id });

  await auditLog(c, "delete_webhook_orphans", null, {
    phoneNumberId: phoneNumberId ?? "ALL",
    deletedCount: result.length,
  });

  return c.json({ ok: true, deletedCount: result.length });
});

admin.post("/api/admin/diagnostics/reassign-chats", requireAdmin(["super_admin"]), async (c) => {
  const body = await c.req.json<{
    fromUserId: string;
    toUserId: string;
    includeMetaConfig?: boolean;
  }>();
  if (!body.fromUserId || !body.toUserId) return c.json({ error: "fromUserId and toUserId required" }, 400);
  if (body.fromUserId === body.toUserId) return c.json({ error: "fromUserId and toUserId must differ" }, 400);

  // Confirm both users exist
  const [fromU] = await db.select().from(user).where(eq(user.id, body.fromUserId)).limit(1);
  const [toU] = await db.select().from(user).where(eq(user.id, body.toUserId)).limit(1);
  if (!fromU) return c.json({ error: "fromUserId not found" }, 404);
  if (!toU) return c.json({ error: "toUserId not found" }, 404);

  // Single transaction so partial reassignment can't happen
  const result = await db.transaction(async (tx) => {
    const conv = await tx.update(conversation).set({ ownerId: body.toUserId }).where(eq(conversation.ownerId, body.fromUserId));
    const cont = await tx.update(contact).set({ ownerId: body.toUserId }).where(eq(contact.ownerId, body.fromUserId));
    const msg  = await tx.update(message).set({ ownerId: body.toUserId }).where(eq(message.ownerId, body.fromUserId));

    let meta: unknown = null;
    if (body.includeMetaConfig) {
      // metaConfig.user_id has UNIQUE constraint — if target already has a row, delete the source row
      const [targetMeta] = await tx.select().from(metaConfig).where(eq(metaConfig.userId, body.toUserId)).limit(1);
      if (targetMeta) {
        meta = await tx.delete(metaConfig).where(eq(metaConfig.userId, body.fromUserId));
      } else {
        meta = await tx.update(metaConfig).set({ userId: body.toUserId }).where(eq(metaConfig.userId, body.fromUserId));
      }
    }
    return { conv, cont, msg, meta };
  });

  await auditLog(c, "reassign_chats", body.toUserId, {
    fromUserId: body.fromUserId,
    toUserId: body.toUserId,
    fromEmail: fromU.email,
    toEmail: toU.email,
    includeMetaConfig: !!body.includeMetaConfig,
  });

  return c.json({ ok: true, result });
});

/* ─────────── Prebuilt Agents (Agent Playground) ─────────── */

admin.get("/api/admin/prebuilt-agents", async (c) => {
  await seedPrebuiltTemplatesIfEmpty();
  const agents = await db.select().from(prebuiltAgent).orderBy(desc(prebuiltAgent.createdAt));
  return c.json(agents.map(a => ({
    id: a.id,
    name: a.name,
    business_name: a.businessName,
    what_we_sell: a.whatWeSell,
    tone: a.tone,
    response_language: a.responseLanguage,
    always_say: a.alwaysSay,
    never_say: a.neverSay,
    escalate_keywords: a.escalateKeywords,
    products: a.products || [],
    knowledge_base: a.knowledgeBase,
    system_prompt: a.systemPrompt,
    is_enabled: a.isEnabled,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
  })));
});

admin.post("/api/admin/prebuilt-agents", async (c) => {
  const body = await c.req.json<any>();
  const [agent] = await db.insert(prebuiltAgent).values({
    name: body.name || "New Prebuilt Agent",
    businessName: body.business_name || "",
    whatWeSell: body.what_we_sell || "",
    tone: body.tone || "friendly",
    responseLanguage: body.response_language || "hinglish",
    alwaysSay: body.always_say || "",
    neverSay: body.never_say || "",
    escalateKeywords: body.escalate_keywords || "refund, complaint, legal, lawyer, scam, police, cheating, fraud",
    products: body.products || [],
    knowledgeBase: body.knowledge_base || "",
    systemPrompt: body.system_prompt || "",
    isEnabled: body.is_enabled !== undefined ? body.is_enabled : true,
  }).returning();

  await auditLog(c, "create_prebuilt_agent", agent.id, { name: agent.name });

  return c.json({
    id: agent.id,
    name: agent.name,
    business_name: agent.businessName,
    what_we_sell: agent.whatWeSell,
    tone: agent.tone,
    response_language: agent.responseLanguage,
    always_say: agent.alwaysSay,
    never_say: agent.neverSay,
    escalate_keywords: agent.escalateKeywords,
    products: agent.products,
    knowledge_base: agent.knowledgeBase,
    system_prompt: agent.systemPrompt,
    is_enabled: agent.isEnabled,
    created_at: agent.createdAt,
    updated_at: agent.updatedAt,
  }, 201);
});

admin.get("/api/admin/prebuilt-agents/:id", async (c) => {
  const id = c.req.param("id");
  const [agent] = await db.select().from(prebuiltAgent).where(eq(prebuiltAgent.id, id)).limit(1);
  if (!agent) return c.json({ error: "Prebuilt agent template not found" }, 404);

  return c.json({
    id: agent.id,
    name: agent.name,
    business_name: agent.businessName,
    what_we_sell: agent.whatWeSell,
    tone: agent.tone,
    response_language: agent.responseLanguage,
    always_say: agent.alwaysSay,
    never_say: agent.neverSay,
    escalate_keywords: agent.escalateKeywords,
    products: agent.products,
    knowledge_base: agent.knowledgeBase,
    system_prompt: agent.systemPrompt,
    is_enabled: agent.isEnabled,
    created_at: agent.createdAt,
    updated_at: agent.updatedAt,
  });
});

admin.patch("/api/admin/prebuilt-agents/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<any>();

  const updateSet: any = { updatedAt: new Date() };
  if (body.name !== undefined) updateSet.name = body.name;
  if (body.business_name !== undefined) updateSet.businessName = body.business_name;
  if (body.what_we_sell !== undefined) updateSet.whatWeSell = body.what_we_sell;
  if (body.tone !== undefined) updateSet.tone = body.tone;
  if (body.response_language !== undefined) updateSet.responseLanguage = body.response_language;
  if (body.always_say !== undefined) updateSet.alwaysSay = body.always_say;
  if (body.never_say !== undefined) updateSet.neverSay = body.never_say;
  if (body.escalate_keywords !== undefined) updateSet.escalateKeywords = body.escalate_keywords;
  if (body.products !== undefined) updateSet.products = body.products;
  if (body.knowledge_base !== undefined) updateSet.knowledgeBase = body.knowledge_base;
  if (body.system_prompt !== undefined) updateSet.systemPrompt = body.system_prompt;
  if (body.is_enabled !== undefined) updateSet.isEnabled = body.is_enabled;

  const [agent] = await db.update(prebuiltAgent)
    .set(updateSet)
    .where(eq(prebuiltAgent.id, id))
    .returning();

  if (!agent) return c.json({ error: "Prebuilt agent template not found" }, 404);

  // If template is disabled, run the cascade deactivation and deletion on user copies
  if (agent.isEnabled === false) {
    const userCopies = await db.select().from(aiAgent).where(eq(aiAgent.prebuiltId, id));
    for (const copy of userCopies) {
      if (copy.isActive) {
        // Find default custom agent and activate it
        const [defaultAgent] = await db.select().from(aiAgent).where(and(eq(aiAgent.ownerId, copy.ownerId), eq(aiAgent.type, "custom"))).limit(1);
        if (defaultAgent) {
          await db.update(aiAgent).set({ isActive: true, updatedAt: new Date() }).where(eq(aiAgent.id, defaultAgent.id));
        }
      }
      await db.delete(aiAgent).where(eq(aiAgent.id, copy.id));
    }
  } else {
    // If it is updated and enabled, propagate all changes immediately to all active copies!
    await db.update(aiAgent)
      .set({
        name: agent.name,
        businessName: agent.businessName,
        whatWeSell: agent.whatWeSell,
        tone: agent.tone,
        responseLanguage: agent.responseLanguage,
        alwaysSay: agent.alwaysSay,
        neverSay: agent.neverSay,
        escalateKeywords: agent.escalateKeywords,
        products: agent.products,
        knowledgeBase: agent.knowledgeBase,
        systemPrompt: agent.systemPrompt,
        updatedAt: new Date(),
      })
      .where(eq(aiAgent.prebuiltId, id));
  }

  await auditLog(c, "update_prebuilt_agent", id, { name: agent.name, isEnabled: agent.isEnabled });

  return c.json({
    id: agent.id,
    name: agent.name,
    business_name: agent.businessName,
    what_we_sell: agent.whatWeSell,
    tone: agent.tone,
    response_language: agent.responseLanguage,
    always_say: agent.alwaysSay,
    never_say: agent.neverSay,
    escalate_keywords: agent.escalateKeywords,
    products: agent.products,
    knowledge_base: agent.knowledgeBase,
    system_prompt: agent.systemPrompt,
    is_enabled: agent.isEnabled,
    created_at: agent.createdAt,
    updated_at: agent.updatedAt,
  });
});

admin.delete("/api/admin/prebuilt-agents/:id", async (c) => {
  const id = c.req.param("id");
  const [agent] = await db.select().from(prebuiltAgent).where(eq(prebuiltAgent.id, id)).limit(1);
  if (!agent) return c.json({ error: "Prebuilt agent template not found" }, 404);

  // Cascade deactivate and delete all user copies
  const userCopies = await db.select().from(aiAgent).where(eq(aiAgent.prebuiltId, id));
  for (const copy of userCopies) {
    if (copy.isActive) {
      // Find default custom agent and activate it
      const [defaultAgent] = await db.select().from(aiAgent).where(and(eq(aiAgent.ownerId, copy.ownerId), eq(aiAgent.type, "custom"))).limit(1);
      if (defaultAgent) {
        await db.update(aiAgent).set({ isActive: true, updatedAt: new Date() }).where(eq(aiAgent.id, defaultAgent.id));
      }
    }
    await db.delete(aiAgent).where(eq(aiAgent.id, copy.id));
  }

  await db.delete(prebuiltAgent).where(eq(prebuiltAgent.id, id));

  await auditLog(c, "delete_prebuilt_agent", id, { name: agent.name });

  return c.json({ ok: true });
});

admin.post("/api/admin/ai/chat", async (c) => {
  const { message } = await c.req.json<{ message: string }>();
  if (!message) return c.json({ error: "Message is required" }, 400);

  const actorUserId = c.get("adminUserId");
  const { processAdminAgentMessage } = await import("../lib/admin-agent");
  const response = await processAdminAgentMessage(actorUserId, message);
  return c.json({ response });
});

export default admin;
