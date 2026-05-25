/**
 * Bookings — admin CRUD for appointment-style businesses (salon, clinic,
 * gym, coach, services). The Salon template's booking modal POSTs here
 * (via site-public.ts) to save bookings to DB; this file exposes them to
 * the seller's admin BookingsPage.
 *
 *   GET    /api/bookings                    → list (filter by status / date_from / date_to)
 *   GET    /api/bookings/:id                → single
 *   PATCH  /api/bookings/:id                → update status / notes
 *   POST   /api/bookings                    → manually log a booking (seller-entered)
 *   GET    /api/bookings/stats              → today/week counts for dashboard
 */

import { Hono } from "hono";
import { and, asc, desc, eq, gte, lte, ne, sql } from "drizzle-orm";
import { db } from "../db/client";
import { booking, contact } from "../db/schema";
import { requireAuth, type AuthVariables } from "../middleware/auth";

const app = new Hono<{ Variables: AuthVariables }>();
app.use("*", requireAuth);

/** Allocate next per-owner booking_number. */
export const nextBookingNumber = async (userId: string): Promise<number> => {
  const [row] = await db.select({ max: sql<number>`COALESCE(MAX(${booking.bookingNumber}), 0)` })
    .from(booking).where(eq(booking.ownerId, userId));
  return Number(row?.max ?? 0) + 1;
};

app.get("/bookings", async (c) => {
  const userId = c.var.userId;
  const status = c.req.query("status");
  const dateFrom = c.req.query("date_from");    // YYYY-MM-DD
  const dateTo = c.req.query("date_to");
  const limit = Math.min(Number(c.req.query("limit") ?? 200), 500);

  const filters = [eq(booking.ownerId, userId)];
  if (status) filters.push(eq(booking.status, status));
  if (dateFrom) filters.push(gte(booking.bookingDate, dateFrom));
  if (dateTo) filters.push(lte(booking.bookingDate, dateTo));

  const rows = await db.select().from(booking)
    .where(and(...filters))
    .orderBy(asc(booking.bookingDate), asc(booking.bookingTime))
    .limit(limit);
  return c.json(rows);
});

app.get("/bookings/stats", async (c) => {
  const userId = c.var.userId;
  const today = new Date().toISOString().slice(0, 10);
  const inOneWeek = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);

  const [stats] = await db.execute<{
    today_count: string; week_count: string; pending_count: string; total_revenue_inr: string;
  }>(sql`
    SELECT
      COUNT(*) FILTER (WHERE ${booking.bookingDate} = ${today} AND ${booking.status} NOT IN ('cancelled','no_show'))::text AS today_count,
      COUNT(*) FILTER (WHERE ${booking.bookingDate} BETWEEN ${today} AND ${inOneWeek} AND ${booking.status} NOT IN ('cancelled','no_show'))::text AS week_count,
      COUNT(*) FILTER (WHERE ${booking.status} IN ('new'))::text AS pending_count,
      COALESCE(SUM(${booking.servicePriceInr}) FILTER (WHERE ${booking.status} = 'completed'), 0)::text AS total_revenue_inr
    FROM ${booking}
    WHERE ${booking.ownerId} = ${userId}
  `);
  return c.json(stats);
});

app.get("/bookings/:id", async (c) => {
  const userId = c.var.userId;
  const [row] = await db.select().from(booking)
    .where(and(eq(booking.id, c.req.param("id")), eq(booking.ownerId, userId)))
    .limit(1);
  if (!row) return c.json({ error: "Booking not found" }, 404);
  return c.json(row);
});

app.patch("/bookings/:id", async (c) => {
  const userId = c.var.userId;
  const id = c.req.param("id");
  const body = await c.req.json<{
    status?: string;
    notes?: string | null;
    booking_date?: string;
    booking_time?: string;
  }>();

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.status === "string") {
    if (!["new", "confirmed", "completed", "cancelled", "no_show"].includes(body.status)) {
      return c.json({ error: "Invalid status" }, 400);
    }
    updates.status = body.status;
  }
  if ("notes" in body) updates.notes = body.notes ?? null;
  if (typeof body.booking_date === "string") updates.bookingDate = body.booking_date;
  if (typeof body.booking_time === "string") updates.bookingTime = body.booking_time;

  // Conflict detection when date or time changes
  if (typeof body.booking_date === "string" || typeof body.booking_time === "string") {
    return await db.transaction(async (tx) => {
      // Fetch current booking to get the unchanged date/time
      const [current] = await tx.select({
        bookingDate: booking.bookingDate,
        bookingTime: booking.bookingTime,
      }).from(booking)
        .where(and(eq(booking.id, id), eq(booking.ownerId, userId)))
        .limit(1);
      if (!current) return c.json({ error: "Booking not found" }, 404);

      const checkDate = body.booking_date ?? current.bookingDate;
      const checkTime = body.booking_time ?? current.bookingTime;

      const [conflict] = await tx.select({ id: booking.id }).from(booking)
        .where(and(
          eq(booking.ownerId, userId),
          eq(booking.bookingDate, checkDate),
          eq(booking.bookingTime, checkTime),
          ne(booking.id, id),
          sql`${booking.status} NOT IN ('cancelled', 'no_show')`
        )).limit(1);
      if (conflict) {
        return c.json({ error: 'Time slot already booked', conflict_booking_id: conflict.id }, 409);
      }

      const [row] = await tx.update(booking)
        .set(updates)
        .where(and(eq(booking.id, id), eq(booking.ownerId, userId)))
        .returning();
      if (!row) return c.json({ error: "Booking not found" }, 404);
      return c.json(row);
    });
  }

  const [row] = await db.update(booking)
    .set(updates)
    .where(and(eq(booking.id, id), eq(booking.ownerId, userId)))
    .returning();
  if (!row) return c.json({ error: "Booking not found" }, 404);
  return c.json(row);
});

/** Manually create a booking — seller types it in (after a phone call etc). */
app.post("/bookings", async (c) => {
  const userId = c.var.userId;
  const body = await c.req.json<{
    service_name?: string;
    service_price_inr?: number;
    service_duration_min?: number | null;
    booking_date?: string;     // YYYY-MM-DD
    booking_time?: string;     // HH:MM
    customer_name?: string;
    customer_phone?: string | null;
    customer_email?: string | null;
    notes?: string | null;
  }>();

  const serviceName = (body.service_name || "").trim();
  const customerName = (body.customer_name || "").trim();
  if (!serviceName) return c.json({ error: "Service name required" }, 400);
  if (!customerName) return c.json({ error: "Customer name required" }, 400);
  if (!body.booking_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.booking_date)) {
    return c.json({ error: "booking_date must be YYYY-MM-DD" }, 400);
  }
  if (!body.booking_time || !/^\d{2}:\d{2}$/.test(body.booking_time)) {
    return c.json({ error: "booking_time must be HH:MM" }, 400);
  }

  // Auto-link / create CRM contact by phone
  let contactId: string | null = null;
  if (body.customer_phone) {
    const normalizedPhone = body.customer_phone.replace(/[^\d+]/g, "");
    const [existing] = await db.select({ id: contact.id }).from(contact)
      .where(and(eq(contact.ownerId, userId), eq(contact.phone, normalizedPhone))).limit(1);
    if (existing) {
      contactId = existing.id;
    } else {
      const [created] = await db.insert(contact).values({
        ownerId: userId,
        name: customerName,
        phone: normalizedPhone,
        email: body.customer_email || null,
        source: "manual-booking",
        tag: "warm",
      }).returning({ id: contact.id });
      contactId = created.id;
    }
  }

  // Conflict detection + insert wrapped in a transaction to prevent TOCTOU race
  return await db.transaction(async (tx) => {
    const [conflict] = await tx.select({ id: booking.id }).from(booking)
      .where(and(
        eq(booking.ownerId, userId),
        eq(booking.bookingDate, body.booking_date),
        eq(booking.bookingTime, body.booking_time),
        sql`${booking.status} NOT IN ('cancelled', 'no_show')`
      )).limit(1);
    if (conflict) {
      return c.json({ error: 'Time slot already booked', conflict_booking_id: conflict.id }, 409);
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const [maxRow] = await tx.select({ max: sql<number>`COALESCE(MAX(${booking.bookingNumber}), 0)` })
          .from(booking).where(eq(booking.ownerId, userId));
        const bookingNumber = Number(maxRow?.max ?? 0) + 1;
        const [row] = await tx.insert(booking).values({
          ownerId: userId,
          bookingNumber,
          serviceName,
          servicePriceInr: String(Math.max(0, Number(body.service_price_inr) || 0)),
          serviceDurationMin: body.service_duration_min ?? null,
          bookingDate: body.booking_date,
          bookingTime: body.booking_time,
          customerName,
          customerPhone: body.customer_phone ?? null,
          customerEmail: body.customer_email ?? null,
          notes: body.notes ?? null,
          status: "new",
          source: "manual",
          contactId,
        }).returning();
        return c.json({ ok: true, booking: row }, 201);
      } catch (e) {
        if (attempt === 4) throw e;
      }
    }
    return c.json({ error: "Could not create booking" }, 500);
  });
});

export default app;
