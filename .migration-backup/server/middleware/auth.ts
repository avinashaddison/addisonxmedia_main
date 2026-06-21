import type { Context, Next } from "hono";
import { auth } from "../auth";
import { db } from "../db/client";
import { impersonationSession, user as userTable, workspace } from "../db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";

export type AuthVariables = {
  userId: string;
  userEmail: string;
  activeWorkspaceId: string;
  ownerUserId: string;
  impersonatedBy?: string;       // admin id, set only when an impersonation is active
};

/**
 * Reads Better Auth session cookie, sets userId/userEmail on c.var, rejects 401.
 *
 * IMPERSONATION: if an `addisonx_impersonating` cookie is present AND the row
 * is still valid (not expired, not ended) AND the cookie's admin matches the
 * session user — we swap userId to the target user so every downstream query
 * sees that user's data.
 *
 * WORKSPACES: Once we have the session/impersonated user (resolvedOwnerId),
 * we check the `X-Workspace-Id` header.
 * If present and owned by resolvedOwnerId, we swap userId to the workspace's
 * virtual workspaceUserId. If missing/invalid, we fall back to their default
 * workspace (creating one if none exist).
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

  // resolvedOwnerId is the actual account owner (or impersonated account) who owns the projects
  const resolvedOwnerId = userId;

  // Resolve the active workspace
  const workspaceHeader = c.req.header("X-Workspace-Id");
  let activeWorkspaceId = "";
  let activeWorkspaceUserId = "";
  let activeWorkspaceEmail = "";

  if (workspaceHeader) {
    const [ws] = await db
      .select({
        id: workspace.id,
        workspaceUserId: workspace.workspaceUserId,
        ownerUserId: workspace.ownerUserId,
        workspaceEmail: userTable.email,
      })
      .from(workspace)
      .leftJoin(userTable, eq(userTable.id, workspace.workspaceUserId))
      .where(and(eq(workspace.id, workspaceHeader), eq(workspace.ownerUserId, resolvedOwnerId)))
      .limit(1);

    if (ws) {
      activeWorkspaceId = ws.id;
      activeWorkspaceUserId = ws.workspaceUserId;
      activeWorkspaceEmail = ws.workspaceEmail ?? userEmail;
    }
  }

  // If no valid workspace found from header, check if we need to auto-create or fall back
  if (!activeWorkspaceId) {
    const userWorkspaces = await db
      .select({
        id: workspace.id,
        workspaceUserId: workspace.workspaceUserId,
        workspaceEmail: userTable.email,
      })
      .from(workspace)
      .leftJoin(userTable, eq(userTable.id, workspace.workspaceUserId))
      .where(eq(workspace.ownerUserId, resolvedOwnerId))
      .orderBy(workspace.createdAt);

    if (userWorkspaces.length === 0) {
      // Auto-create default workspace pointing to the user themselves
      const [newWs] = await db
        .insert(workspace)
        .values({
          ownerUserId: resolvedOwnerId,
          workspaceUserId: resolvedOwnerId,
          name: "Default Project",
        })
        .returning();
      activeWorkspaceId = newWs.id;
      activeWorkspaceUserId = resolvedOwnerId;
      activeWorkspaceEmail = userEmail;
    } else {
      // Use the oldest/first workspace as default
      activeWorkspaceId = userWorkspaces[0].id;
      activeWorkspaceUserId = userWorkspaces[0].workspaceUserId;
      activeWorkspaceEmail = userWorkspaces[0].workspaceEmail ?? userEmail;
    }
  }

  // Swap to the workspace's virtual user context
  c.set("userId", activeWorkspaceUserId);
  c.set("userEmail", activeWorkspaceEmail);
  c.set("activeWorkspaceId", activeWorkspaceId);
  c.set("ownerUserId", resolvedOwnerId);
  if (impersonatedBy) c.set("impersonatedBy", impersonatedBy);
  await next();
};
