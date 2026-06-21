import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { note, contact } from "../db/schema";
import { requireAuth, type AuthVariables } from "../middleware/auth";

const app = new Hono<{ Variables: AuthVariables }>();
app.use("*", requireAuth);

// ============================================================
// NOTES — free-form notes, optionally attached to a contact.
// Owner-scoped by the active workspace user (c.var.userId).
// ============================================================

app.get("/notes", async (c) => {
  const contactId = c.req.query("contact_id");
  const conds = [eq(note.ownerId, c.var.userId)];
  if (contactId) conds.push(eq(note.contactId, contactId));
  const rows = await db
    .select({
      id: note.id,
      ownerId: note.ownerId,
      contactId: note.contactId,
      title: note.title,
      body: note.body,
      pinned: note.pinned,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      contactName: contact.name,
    })
    .from(note)
    .leftJoin(contact, eq(contact.id, note.contactId))
    .where(and(...conds))
    .orderBy(desc(note.pinned), desc(note.createdAt))
    .limit(1000);
  return c.json(rows);
});

app.post("/notes", async (c) => {
  const body = await c.req.json();
  if (!body.body?.trim()) return c.json({ error: "Note body is required" }, 400);
  if (body.contact_id) {
    const [owned] = await db
      .select({ id: contact.id })
      .from(contact)
      .where(and(eq(contact.id, body.contact_id), eq(contact.ownerId, c.var.userId)))
      .limit(1);
    if (!owned) return c.json({ error: "Contact not found" }, 404);
  }
  const [row] = await db
    .insert(note)
    .values({
      ownerId: c.var.userId,
      contactId: body.contact_id ?? null,
      title: body.title?.trim() || null,
      body: body.body.trim(),
      pinned: Boolean(body.pinned),
    })
    .returning();
  return c.json(row, 201);
});

app.patch("/notes/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.title !== "undefined") patch.title = body.title?.trim() || null;
  if (typeof body.body !== "undefined") {
    if (!body.body?.trim()) return c.json({ error: "Note body is required" }, 400);
    patch.body = body.body.trim();
  }
  if (typeof body.pinned !== "undefined") patch.pinned = Boolean(body.pinned);
  if (typeof body.contact_id !== "undefined") {
    if (body.contact_id) {
      const [owned] = await db
        .select({ id: contact.id })
        .from(contact)
        .where(and(eq(contact.id, body.contact_id), eq(contact.ownerId, c.var.userId)))
        .limit(1);
      if (!owned) return c.json({ error: "Contact not found" }, 404);
    }
    patch.contactId = body.contact_id ?? null;
  }
  const [row] = await db
    .update(note)
    .set(patch)
    .where(and(eq(note.id, id), eq(note.ownerId, c.var.userId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

app.delete("/notes/:id", async (c) => {
  const id = c.req.param("id");
  await db.delete(note).where(and(eq(note.id, id), eq(note.ownerId, c.var.userId)));
  return c.body(null, 204);
});

export default app;
