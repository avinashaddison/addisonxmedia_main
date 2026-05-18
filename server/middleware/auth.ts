import type { Context, Next } from "hono";
import { auth } from "../auth";
import { db } from "../db/client";
import { impersonationSession, user as userTable } from "../db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";

export type AuthVariables = {
  userId: string;
  userEmail: string;
  impersonatedBy?: string;       // admin id, set only when an impersonation is active
};

/**
 * Reads Better Auth session cookie, sets userId/userEmail on c.var, rejects 401.
 *
 * IMPERSONATION: if an `addisonx_impersonating` cookie is present AND the row
 * is still valid (not expired, not ended) AND the cookie's admin matches the
 * session user — we swap userId to the target user so every downstream query
 * (contacts, messages, dashboard, etc.) sees that user's data. The original
 * admin id is preserved on c.var.impersonatedBy for auditing.
 */
export const requireAuth = async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Default: use the session's own user
  let userId = session.user.id;
  let userEmail = session.user.email;
  let impersonatedBy: string | undefined;

  // Check for active impersonation cookie
  const cookieHeader = c.req.header("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)addisonx_impersonating=([^;]+)/);
  if (match) {
    const sessionId = match[1].trim();
    const [imp] = await db
      .select({
        targetUserId: impersonationSession.targetUserId,
        adminUserId: impersonationSession.adminUserId,
        expiresAt: impersonationSession.expiresAt,
        targetEmail: userTable.email,
      })
      .from(impersonationSession)
      .leftJoin(userTable, eq(userTable.id, impersonationSession.targetUserId))
      .where(and(
        eq(impersonationSession.id, sessionId),
        isNull(impersonationSession.endedAt),
        gt(impersonationSession.expiresAt, new Date()),
      ))
      .limit(1);

    if (imp && imp.adminUserId === session.user.id) {
      // Valid impersonation — swap to target user
      userId = imp.targetUserId;
      userEmail = imp.targetEmail ?? userEmail;
      impersonatedBy = imp.adminUserId;
    }
  }

  c.set("userId", userId);
  c.set("userEmail", userEmail);
  if (impersonatedBy) c.set("impersonatedBy", impersonatedBy);
  await next();
};
