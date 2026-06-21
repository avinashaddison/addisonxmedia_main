import { Hono } from "hono";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { user as userTable, workspace, profile, metaConfig } from "../db/schema";
import { requireAuth, type AuthVariables } from "../middleware/auth";
import crypto from "crypto";

const app = new Hono<{ Variables: AuthVariables }>();
app.use("*", requireAuth);

// GET /workspaces - List all workspaces owned by the user
app.get("/workspaces", async (c) => {
  const ownerUserId = c.var.ownerUserId;
  const list = await db
    .select({
      id: workspace.id,
      name: workspace.name,
      workspaceUserId: workspace.workspaceUserId,
      createdAt: workspace.createdAt,
      metaConnected: sql<boolean>`CASE WHEN ${metaConfig.accessToken} IS NOT NULL AND ${metaConfig.accessToken} != '' THEN true ELSE false END`,
    })
    .from(workspace)
    .leftJoin(metaConfig, eq(metaConfig.userId, workspace.workspaceUserId))
    .where(eq(workspace.ownerUserId, ownerUserId))
    .orderBy(workspace.createdAt);

  return c.json({
    workspaces: list,
    activeWorkspaceId: c.var.activeWorkspaceId,
  });
});

// POST /workspaces - Create a new virtual workspace (project)
app.post("/workspaces", async (c) => {
  const ownerUserId = c.var.ownerUserId;
  const body = await c.req.json<{ name: string }>();
  const name = body.name?.trim();

  if (!name) {
    return c.json({ error: "Project name is required" }, 400);
  }

  // 1. Create a virtual user record
  const virtualUserId = `user_${crypto.randomUUID()}`;
  const virtualEmail = `workspace-${name.toLowerCase().replace(/[^a-z0-9]/g, "")}-${crypto.randomUUID().slice(0, 8)}@addisonx.internal`;

  await db.insert(userTable).values({
    id: virtualUserId,
    name: name,
    email: virtualEmail,
    emailVerified: true,
  });

  // 2. Create default profile for the virtual user so that fetching profile doesn't crash/return null
  await db.insert(profile).values({
    userId: virtualUserId,
    displayName: name,
  });

  // 3. Create the workspace record
  const [ws] = await db
    .insert(workspace)
    .values({
      ownerUserId,
      workspaceUserId: virtualUserId,
      name,
    })
    .returning();

  return c.json(ws);
});

// DELETE /workspaces/:id - Drop a project (workspace)
app.delete("/workspaces/:id", async (c) => {
  const ownerUserId = c.var.ownerUserId;
  const workspaceId = c.req.param("id");

  // Find the workspace
  const [ws] = await db
    .select()
    .from(workspace)
    .where(and(eq(workspace.id, workspaceId), eq(workspace.ownerUserId, ownerUserId)))
    .limit(1);

  if (!ws) {
    return c.json({ error: "Project not found" }, 404);
  }

  // Prevent deleting the default workspace (where workspaceUserId equals ownerUserId)
  if (ws.workspaceUserId === ownerUserId) {
    return c.json({ error: "Cannot delete the default project" }, 400);
  }

  // Deleting the virtual user from userTable will cascade delete all related database rows
  // (contacts, conversations, messages, deals, campaigns, profile, etc.) because of onDelete: "cascade" constraints.
  await db.delete(userTable).where(eq(userTable.id, ws.workspaceUserId));

  return c.json({ success: true });
});

export default app;
