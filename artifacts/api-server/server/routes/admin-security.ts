import { Hono } from "hono";
import { db } from "../db/client";
import { user, session, userActivityLog } from "../db/schema";
import { eq, and, or, desc, ilike } from "drizzle-orm";
import { requireAdmin, type AdminVariables } from "../middleware/admin";
import { escapeSqlLike } from "../utils";

/**
 * Security admin surface.
 *   - Login logs: sourced from the Better Auth `session` table (recent active
 *     sessions with ip / user-agent). Not a durable audit of every attempt.
 *   - Activity logs: user_activity_log (customer + admin actions).
 *   - Permissions: read-only role→capability matrix (the platform's admin RBAC model).
 */
const adminSecurity = new Hono<{ Variables: AdminVariables }>();
adminSecurity.use("/api/admin/*", requireAdmin());

adminSecurity.get("/api/admin/security/login-logs", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? 100), 300);
  const staffOnly = c.req.query("staff") === "1";
  const rows = await db
    .select({
      id: session.id,
      userId: session.userId,
      name: user.name,
      email: user.email,
      isStaff: user.isStaff,
      adminRole: user.adminRole,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    })
    .from(session)
    .leftJoin(user, eq(session.userId, user.id))
    .where(staffOnly ? eq(user.isStaff, true) : undefined)
    .orderBy(desc(session.createdAt))
    .limit(limit);

  const now = Date.now();
  return c.json(rows.map((r) => ({ ...r, active: r.expiresAt ? new Date(r.expiresAt).getTime() > now : false })));
});

adminSecurity.get("/api/admin/security/activity-logs", async (c) => {
  const action = c.req.query("action");
  const q = c.req.query("q")?.trim();
  const limit = Math.min(Number(c.req.query("limit") ?? 100), 500);
  const conds = [];
  if (action && action !== "all") conds.push(eq(userActivityLog.action, action));
  if (q) conds.push(or(ilike(user.email, `%${escapeSqlLike(q)}%`), ilike(user.name, `%${escapeSqlLike(q)}%`))!);

  const rows = await db
    .select({
      id: userActivityLog.id,
      action: userActivityLog.action,
      resourceType: userActivityLog.resourceType,
      resourceId: userActivityLog.resourceId,
      ipAddress: userActivityLog.ipAddress,
      metadata: userActivityLog.metadata,
      name: user.name,
      email: user.email,
      createdAt: userActivityLog.createdAt,
    })
    .from(userActivityLog)
    .leftJoin(user, eq(userActivityLog.userId, user.id))
    .where(and(...conds))
    .orderBy(desc(userActivityLog.createdAt))
    .limit(limit);

  return c.json(rows);
});

const PERMISSION_MATRIX = {
  note: "Yeh platform ka admin role-permission model hai. Mutations server-side requireAdmin() se enforce hote hain.",
  roles: [
    { key: "super_admin", label: "Super Admin", desc: "Poora platform control — sab kuch." },
    { key: "billing", label: "Billing", desc: "Subscriptions, plans, payments, refunds, payouts." },
    { key: "support", label: "Support", desc: "Customers ki help, tickets, activity dekhna." },
    { key: "moderator", label: "Moderator", desc: "Clients manage, suspend/activate, content." },
  ],
  groups: [
    {
      group: "Client Management",
      capabilities: [
        { key: "clients.view", label: "View clients", roles: ["super_admin", "billing", "support", "moderator"] },
        { key: "clients.suspend", label: "Suspend / activate clients", roles: ["super_admin", "moderator"] },
        { key: "clients.impersonate", label: "Impersonate client", roles: ["super_admin", "support"] },
      ],
    },
    {
      group: "Subscriptions & Billing",
      capabilities: [
        { key: "subs.view", label: "View subscriptions", roles: ["super_admin", "billing", "support", "moderator"] },
        { key: "plans.manage", label: "Create / edit plans", roles: ["super_admin", "billing"] },
        { key: "coupons.manage", label: "Manage coupons", roles: ["super_admin", "billing"] },
        { key: "refund.issue", label: "Issue refunds", roles: ["super_admin", "billing"] },
        { key: "payouts.manage", label: "Manage payouts", roles: ["super_admin", "billing"] },
      ],
    },
    {
      group: "Finance & Analytics",
      capabilities: [
        { key: "finance.view", label: "View revenue & reports", roles: ["super_admin", "billing", "support", "moderator"] },
        { key: "analytics.view", label: "View analytics", roles: ["super_admin", "billing", "support", "moderator"] },
      ],
    },
    {
      group: "Security & System",
      capabilities: [
        { key: "security.view", label: "View login & activity logs", roles: ["super_admin", "billing", "support", "moderator"] },
        { key: "audit.view", label: "View audit trail", roles: ["super_admin", "billing", "support", "moderator"] },
        { key: "staff.manage", label: "Manage staff & roles", roles: ["super_admin"] },
        { key: "settings.manage", label: "Platform settings", roles: ["super_admin"] },
        { key: "integrations.manage", label: "Manage integrations", roles: ["super_admin"] },
      ],
    },
  ],
};

adminSecurity.get("/api/admin/security/permissions", async (c) => {
  return c.json(PERMISSION_MATRIX);
});

export default adminSecurity;
