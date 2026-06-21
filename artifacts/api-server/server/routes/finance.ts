import { Hono } from "hono";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { invoice, invoiceLineItem, expense, contact, deal } from "../db/schema";
import { requireAuth, type AuthVariables } from "../middleware/auth";

const app = new Hono<{ Variables: AuthVariables }>();
app.use("*", requireAuth);

// ============================================================
// FINANCE — Invoices (+ line items), Expenses, Payments feed.
// Owner-scoped by the active workspace user (c.var.userId).
// All money stored as numeric strings; computed in JS, persisted as strings.
// ============================================================

type LineInput = { description?: string; quantity?: unknown; unit_price?: unknown };

function computeLineItems(items: LineInput[]) {
  return (items || []).map((it, i) => {
    const quantity = Number(it.quantity) || 0;
    const unitPrice = Number(it.unit_price) || 0;
    const amount = Math.round(quantity * unitPrice * 100) / 100;
    return {
      description: String(it.description ?? "").slice(0, 1000),
      quantity: String(quantity),
      unitPrice: String(unitPrice),
      amount: String(amount),
      position: i,
    };
  });
}

function computeTotals(lines: ReturnType<typeof computeLineItems>, taxRate: number, discount: number) {
  const subtotal = lines.reduce((s, l) => s + Number(l.amount), 0);
  const taxAmount = Math.round(((subtotal * taxRate) / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount - discount) * 100) / 100;
  return {
    subtotal: String(Math.round(subtotal * 100) / 100),
    taxRate: String(taxRate),
    taxAmount: String(taxAmount),
    discount: String(discount),
    total: String(total),
  };
}

async function nextInvoiceNumber(ownerId: string): Promise<string> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(invoice)
    .where(eq(invoice.ownerId, ownerId));
  const n = (Number(count) || 0) + 1;
  return `INV-${String(n).padStart(4, "0")}`;
}

async function attachLineItems(invoices: Array<{ id: string }>) {
  const ids = invoices.map((i) => i.id);
  if (ids.length === 0) return invoices.map((i) => ({ ...i, lineItems: [] }));
  const items = await db
    .select()
    .from(invoiceLineItem)
    .where(inArray(invoiceLineItem.invoiceId, ids))
    .orderBy(invoiceLineItem.position);
  const byInvoice = new Map<string, typeof items>();
  for (const it of items) {
    const arr = byInvoice.get(it.invoiceId) ?? [];
    arr.push(it);
    byInvoice.set(it.invoiceId, arr);
  }
  return invoices.map((i) => ({ ...i, lineItems: byInvoice.get(i.id) ?? [] }));
}

// ---------------- INVOICES ----------------

app.get("/invoices", async (c) => {
  const rows = await db
    .select({
      id: invoice.id,
      ownerId: invoice.ownerId,
      contactId: invoice.contactId,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      currency: invoice.currency,
      subtotal: invoice.subtotal,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      discount: invoice.discount,
      total: invoice.total,
      notes: invoice.notes,
      issueDate: invoice.issueDate,
      dueAt: invoice.dueAt,
      sentAt: invoice.sentAt,
      paidAt: invoice.paidAt,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      contactName: contact.name,
    })
    .from(invoice)
    .leftJoin(contact, eq(contact.id, invoice.contactId))
    .where(eq(invoice.ownerId, c.var.userId))
    .orderBy(desc(invoice.createdAt))
    .limit(1000);
  const withItems = await attachLineItems(rows);
  return c.json(withItems);
});

const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue", "cancelled"] as const;

app.post("/invoices", async (c) => {
  const body = await c.req.json();
  if (typeof body.status !== "undefined" && !INVOICE_STATUSES.includes(body.status)) {
    return c.json({ error: "Invalid invoice status" }, 400);
  }
  if (body.contact_id) {
    const [owned] = await db
      .select({ id: contact.id })
      .from(contact)
      .where(and(eq(contact.id, body.contact_id), eq(contact.ownerId, c.var.userId)))
      .limit(1);
    if (!owned) return c.json({ error: "Contact not found" }, 404);
  }
  const lines = computeLineItems(body.line_items ?? []);
  const totals = computeTotals(lines, Number(body.tax_rate) || 0, Number(body.discount) || 0);
  const invoiceNumber = body.invoice_number?.trim() || (await nextInvoiceNumber(c.var.userId));

  const [row] = await db
    .insert(invoice)
    .values({
      ownerId: c.var.userId,
      contactId: body.contact_id ?? null,
      invoiceNumber,
      status: body.status ?? "draft",
      currency: body.currency ?? "INR",
      ...totals,
      notes: body.notes ?? null,
      issueDate: body.issue_date ? new Date(body.issue_date) : new Date(),
      dueAt: body.due_at ? new Date(body.due_at) : null,
    })
    .returning();

  if (lines.length) {
    await db.insert(invoiceLineItem).values(lines.map((l) => ({ ...l, invoiceId: row.id })));
  }
  const [withItems] = await attachLineItems([row]);
  return c.json(withItems, 201);
});

app.patch("/invoices/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const [existing] = await db
    .select()
    .from(invoice)
    .where(and(eq(invoice.id, id), eq(invoice.ownerId, c.var.userId)))
    .limit(1);
  if (!existing) return c.json({ error: "Not found" }, 404);

  if (typeof body.status !== "undefined" && !INVOICE_STATUSES.includes(body.status)) {
    return c.json({ error: "Invalid invoice status" }, 400);
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.status !== "undefined") patch.status = body.status;
  if (typeof body.currency !== "undefined") patch.currency = body.currency;
  if (typeof body.notes !== "undefined") patch.notes = body.notes ?? null;
  if (typeof body.invoice_number !== "undefined" && body.invoice_number?.trim())
    patch.invoiceNumber = body.invoice_number.trim();
  if (typeof body.due_at !== "undefined") patch.dueAt = body.due_at ? new Date(body.due_at) : null;
  if (typeof body.issue_date !== "undefined" && body.issue_date)
    patch.issueDate = new Date(body.issue_date);
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

  // If line items are provided, replace them and recompute totals.
  if (Array.isArray(body.line_items)) {
    const lines = computeLineItems(body.line_items);
    const taxRate = typeof body.tax_rate !== "undefined" ? Number(body.tax_rate) || 0 : Number(existing.taxRate) || 0;
    const discount = typeof body.discount !== "undefined" ? Number(body.discount) || 0 : Number(existing.discount) || 0;
    Object.assign(patch, computeTotals(lines, taxRate, discount));
    await db.delete(invoiceLineItem).where(eq(invoiceLineItem.invoiceId, id));
    if (lines.length) await db.insert(invoiceLineItem).values(lines.map((l) => ({ ...l, invoiceId: id })));
  } else if (typeof body.tax_rate !== "undefined" || typeof body.discount !== "undefined") {
    // Totals can change without touching line items (tax/discount edits).
    const items = await db.select().from(invoiceLineItem).where(eq(invoiceLineItem.invoiceId, id));
    const lines = items.map((it) => ({ amount: it.amount })) as ReturnType<typeof computeLineItems>;
    const taxRate = typeof body.tax_rate !== "undefined" ? Number(body.tax_rate) || 0 : Number(existing.taxRate) || 0;
    const discount = typeof body.discount !== "undefined" ? Number(body.discount) || 0 : Number(existing.discount) || 0;
    Object.assign(patch, computeTotals(lines, taxRate, discount));
  }

  const [row] = await db
    .update(invoice)
    .set(patch)
    .where(and(eq(invoice.id, id), eq(invoice.ownerId, c.var.userId)))
    .returning();
  const [withItems] = await attachLineItems([row]);
  return c.json(withItems);
});

app.post("/invoices/:id/send", async (c) => {
  const id = c.req.param("id");
  const [row] = await db
    .update(invoice)
    .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
    .where(and(eq(invoice.id, id), eq(invoice.ownerId, c.var.userId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  const [withItems] = await attachLineItems([row]);
  return c.json(withItems);
});

app.post("/invoices/:id/mark-paid", async (c) => {
  const id = c.req.param("id");
  const [row] = await db
    .update(invoice)
    .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
    .where(and(eq(invoice.id, id), eq(invoice.ownerId, c.var.userId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  const [withItems] = await attachLineItems([row]);
  return c.json(withItems);
});

app.delete("/invoices/:id", async (c) => {
  const id = c.req.param("id");
  await db.delete(invoice).where(and(eq(invoice.id, id), eq(invoice.ownerId, c.var.userId)));
  return c.body(null, 204);
});

// ---------------- EXPENSES ----------------

app.get("/expenses", async (c) => {
  const rows = await db
    .select()
    .from(expense)
    .where(eq(expense.ownerId, c.var.userId))
    .orderBy(desc(expense.spentAt))
    .limit(1000);
  return c.json(rows);
});

app.post("/expenses", async (c) => {
  const body = await c.req.json();
  if (!body.description?.trim()) return c.json({ error: "Description is required" }, 400);
  const [row] = await db
    .insert(expense)
    .values({
      ownerId: c.var.userId,
      category: body.category?.trim() || "general",
      description: body.description.trim(),
      amount: String(Number(body.amount) || 0),
      currency: body.currency ?? "INR",
      vendor: body.vendor?.trim() || null,
      spentAt: body.spent_at ? new Date(body.spent_at) : new Date(),
    })
    .returning();
  return c.json(row, 201);
});

app.patch("/expenses/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.category !== "undefined") patch.category = body.category?.trim() || "general";
  if (typeof body.description !== "undefined") {
    if (!body.description?.trim()) return c.json({ error: "Description is required" }, 400);
    patch.description = body.description.trim();
  }
  if (typeof body.amount !== "undefined") patch.amount = String(Number(body.amount) || 0);
  if (typeof body.currency !== "undefined") patch.currency = body.currency;
  if (typeof body.vendor !== "undefined") patch.vendor = body.vendor?.trim() || null;
  if (typeof body.spent_at !== "undefined") patch.spentAt = body.spent_at ? new Date(body.spent_at) : new Date();
  const [row] = await db
    .update(expense)
    .set(patch)
    .where(and(eq(expense.id, id), eq(expense.ownerId, c.var.userId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

app.delete("/expenses/:id", async (c) => {
  const id = c.req.param("id");
  await db.delete(expense).where(and(eq(expense.id, id), eq(expense.ownerId, c.var.userId)));
  return c.body(null, 204);
});

// ---------------- PAYMENTS (received money feed) ----------------
// Unified list of money received: 'won' deals + 'paid' invoices.

app.get("/payments", async (c) => {
  const wonDeals = await db
    .select({
      id: deal.id,
      title: deal.title,
      value: deal.value,
      currency: deal.currency,
      closedAt: deal.closedAt,
      updatedAt: deal.updatedAt,
      contactName: contact.name,
    })
    .from(deal)
    .leftJoin(contact, eq(contact.id, deal.contactId))
    .where(and(eq(deal.ownerId, c.var.userId), eq(deal.stage, "won")))
    .orderBy(desc(deal.updatedAt))
    .limit(1000);

  const paidInvoices = await db
    .select({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      currency: invoice.currency,
      paidAt: invoice.paidAt,
      updatedAt: invoice.updatedAt,
      contactName: contact.name,
    })
    .from(invoice)
    .leftJoin(contact, eq(contact.id, invoice.contactId))
    .where(and(eq(invoice.ownerId, c.var.userId), eq(invoice.status, "paid")))
    .orderBy(desc(invoice.paidAt))
    .limit(1000);

  const payments = [
    ...wonDeals.map((d) => ({
      id: `deal_${d.id}`,
      source: "deal" as const,
      label: d.title,
      contactName: d.contactName,
      amount: d.value,
      currency: d.currency,
      date: (d.closedAt ?? d.updatedAt) as Date,
    })),
    ...paidInvoices.map((i) => ({
      id: `invoice_${i.id}`,
      source: "invoice" as const,
      label: i.invoiceNumber,
      contactName: i.contactName,
      amount: i.total,
      currency: i.currency,
      date: (i.paidAt ?? i.updatedAt) as Date,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalReceived = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  return c.json({ payments, total_received: totalReceived, count: payments.length });
});

export default app;
