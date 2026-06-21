import type { Context, Next } from "hono";
import { auth } from "../auth";
import { db } from "../db/client";
import { user, adminAuditLog } from "../db/schema";
import { eq } from "drizzle-orm";

export type AdminRole = "super_admin" | "support" | "billing" | "moderator";

export type AdminVariables = {
  adminUserId: string;
  adminEmail: string;
  adminRole: AdminRole;
};

/**
 * Gates a route to staff users only. Optionally restricts to specific roles.
 *
 *   app.use("/api/admin/*", requireAdmin());                              // any staff
 *   app.post("/api/admin/refund/:id", requireAdmin(["billing","super_admin"]), ...);
 */
export const requireAdmin = (allowedRoles?: AdminRole[]) => {
  return async (c: Context<{ Variables: AdminVariables }>, next: Next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const [u] = await db
      .select({ id: user.id, email: user.email, isStaff: user.isStaff, adminRole: user.adminRole })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!u || !u.isStaff || !u.adminRole) {
      return c.json({ error: "Forbidden — staff only" }, 403);
    }

    if (allowedRoles && !allowedRoles.includes(u.adminRole as AdminRole)) {
      return c.json({ error: `Forbidden — required role: ${allowedRoles.join("/")}` }, 403);
    }

    c.set("adminUserId", u.id);
    c.set("adminEmail", u.email);
    c.set("adminRole", u.adminRole as AdminRole);

    await next();
  };
};

/** Write an entry to the admin audit log. Non-blocking — failures are logged but don't break the request. */
export const auditLog = async (
  c: Context<{ Variables: AdminVariables }>,
  action: string,
  targetUserId: string | null,
  payload?: Record<string, unknown>
) => {
  try {
    await db.insert(adminAuditLog).values({
      actorUserId: c.get("adminUserId"),
      action,
      targetUserId: targetUserId ?? null,
      payload: payload ? JSON.stringify(payload) : null,
      ipAddress: c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: c.req.header("user-agent") ?? null,
    });
  } catch (e) {
    console.error("[audit-log-fail]", action, e);
  }
};
