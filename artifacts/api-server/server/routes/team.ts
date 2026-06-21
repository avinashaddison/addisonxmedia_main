import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { teamMember } from "../db/schema";
import { requireAuth, type AuthVariables } from "../middleware/auth";

const app = new Hono<{ Variables: AuthVariables }>();
app.use("*", requireAuth);

// ============================================================
// TEAM — roster + role assignment for the account owner.
// NOTE: this is roster/role metadata, NOT enforced cross-user auth.
// There is no invitation-acceptance/login flow; members do not get
// their own sessions. Scoped by the ACCOUNT owner (ownerUserId), so
// the roster is shared across the owner's workspaces/projects.
// ============================================================

const ROLES = ["owner", "admin", "manager", "agent", "viewer"] as const;
const STATUSES = ["invited", "active", "suspended"] as const;
type Role = (typeof ROLES)[number];
type Status = (typeof STATUSES)[number];

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.get("/team", async (c) => {
  const rows = await db
    .select()
    .from(teamMember)
    .where(eq(teamMember.ownerId, c.var.ownerUserId))
    .orderBy(desc(teamMember.createdAt))
    .limit(1000);
  return c.json(rows);
});

app.post("/team", async (c) => {
  const body = await c.req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!emailRe.test(email)) return c.json({ error: "A valid email is required" }, 400);
  const role: Role = ROLES.includes(body.role) ? body.role : "agent";

  const [existing] = await db
    .select({ id: teamMember.id })
    .from(teamMember)
    .where(and(eq(teamMember.ownerId, c.var.ownerUserId), eq(teamMember.email, email)))
    .limit(1);
  if (existing) return c.json({ error: "That email is already on your team" }, 409);

  const [row] = await db
    .insert(teamMember)
    .values({
      ownerId: c.var.ownerUserId,
      email,
      name: body.name?.trim() || null,
      role,
      status: "invited",
    })
    .returning();
  return c.json(row, 201);
});

app.patch("/team/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.name !== "undefined") patch.name = body.name?.trim() || null;
  if (typeof body.role !== "undefined") {
    if (!ROLES.includes(body.role)) return c.json({ error: "Invalid role" }, 400);
    patch.role = body.role as Role;
  }
  if (typeof body.status !== "undefined") {
    if (!STATUSES.includes(body.status)) return c.json({ error: "Invalid status" }, 400);
    patch.status = body.status as Status;
    if (body.status === "active") patch.acceptedAt = new Date();
  }
  const [row] = await db
    .update(teamMember)
    .set(patch)
    .where(and(eq(teamMember.id, id), eq(teamMember.ownerId, c.var.ownerUserId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

app.delete("/team/:id", async (c) => {
  const id = c.req.param("id");
  await db.delete(teamMember).where(and(eq(teamMember.id, id), eq(teamMember.ownerId, c.var.ownerUserId)));
  return c.body(null, 204);
});

export default app;
