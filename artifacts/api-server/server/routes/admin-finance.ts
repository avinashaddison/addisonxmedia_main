import { Hono } from "hono";
import { db } from "../db/client";
import { user, upgradeRequest, payout, adminAuditLog } from "../db/schema";
import { eq, and, or, desc, asc, sql, gte, lt, inArray, ilike, count } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireAdmin, auditLog, type AdminVariables } from "../middleware/admin";
import { escapeSqlLike } from "../utils";

/**
 * Finance admin surface — real figures from billing data.
 *   - Revenue summary (MRR/ARR, this/last month, all-time, by-plan)
 *   - Transactions (paid/completed upgrade_request rows = platform income)
 *   - Refunds / adjustments (from admin_audit_log action='refund')
 *   - Financial reports (monthly revenue + by-plan, drives CSV export client-side)
 *   - Payouts (minimal manual records — honest scaffold; this SaaS has no
 *     real merchant-payout flow)
 */
const adminFinance = new Hono<{ Variables: AdminVariables }>();
adminFinance.use("/api/admin/*", requireAdmin());

const PAID = ["paid", "completed"];
// Revenue is dated by completion, falling back to creation for legacy rows.
const REV_DATE = sql`COALESCE(${upgradeRequest.completedAt}, ${upgradeRequest.createdAt})`;

adminFinance.get("/api/admin/finance/summary", async (c) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [[mrr], [paying], [allTime], [thisMonth], [lastMonth], byPlan] = await Promise.all([
    db.select({ total: sql<string>`COALESCE(SUM(${user.mrrInr}),0)` }).from(user).where(eq(user.accountStatus, "active")),
    db.select({ n: count() }).from(user).where(and(eq(user.accountStatus, "active"), sql`${user.mrrInr} > 0`)),
    db.select({ total: sql<string>`COALESCE(SUM(${upgradeRequest.amountInr}),0)` }).from(upgradeRequest).where(inArray(upgradeRequest.status, PAID)),
    db.select({ total: sql<string>`COALESCE(SUM(${upgradeRequest.amountInr}),0)` }).from(upgradeRequest).where(and(inArray(upgradeRequest.status, PAID), gte(REV_DATE, monthStart))),
    db.select({ total: sql<string>`COALESCE(SUM(${upgradeRequest.amountInr}),0)` }).from(upgradeRequest).where(and(inArray(upgradeRequest.status, PAID), gte(REV_DATE, lastMonthStart), lt(REV_DATE, monthStart))),
    db.select({ plan: user.plan, n: count(), mrr: sql<string>`COALESCE(SUM(${user.mrrInr}),0)` }).from(user).where(and(eq(user.isStaff, false), eq(user.accountStatus, "active"))).groupBy(user.plan),
  ]);

  const mrrNum = Number(mrr.total);
  return c.json({
    mrrInr: mrrNum,
    arrInr: mrrNum * 12,
    payingCount: Number(paying.n),
    revenueAllTime: Number(allTime.total),
    revenueThisMonth: Number(thisMonth.total),
    revenueLastMonth: Number(lastMonth.total),
    byPlan: byPlan.map((r) => ({ plan: r.plan, count: Number(r.n), mrr: Number(r.mrr) })),
  });
});

adminFinance.get("/api/admin/finance/transactions", async (c) => {
  const status = c.req.query("status");
  const q = c.req.query("q")?.trim();
  const limit = Math.min(Number(c.req.query("limit") ?? 100), 500);
  const conds = [];
  if (status && status !== "all") conds.push(eq(upgradeRequest.status, status));
  else conds.push(inArray(upgradeRequest.status, PAID));
  if (q) conds.push(or(ilike(user.email, `%${escapeSqlLike(q)}%`), ilike(user.name, `%${escapeSqlLike(q)}%`))!);

  const rows = await db
    .select({
      id: upgradeRequest.id,
      name: user.name,
      email: user.email,
      targetPlan: upgradeRequest.targetPlan,
      billingCycle: upgradeRequest.billingCycle,
      amountInr: upgradeRequest.amountInr,
      status: upgradeRequest.status,
      cashfreePaymentId: upgradeRequest.cashfreePaymentId,
      razorpayPaymentId: upgradeRequest.razorpayPaymentId,
      createdAt: upgradeRequest.createdAt,
      completedAt: upgradeRequest.completedAt,
    })
    .from(upgradeRequest)
    .leftJoin(user, eq(upgradeRequest.userId, user.id))
    .where(and(...conds))
    .orderBy(desc(REV_DATE))
    .limit(limit);

  return c.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      targetPlan: r.targetPlan,
      billingCycle: r.billingCycle,
      amountInr: r.amountInr != null ? Number(r.amountInr) : null,
      status: r.status,
      paymentRef: r.cashfreePaymentId ?? r.razorpayPaymentId ?? null,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
    }))
  );
});

adminFinance.get("/api/admin/finance/refunds", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? 100), 500);
  const targetU = alias(user, "target_u");
  const actorU = alias(user, "actor_u");
  const rows = await db
    .select({
      id: adminAuditLog.id,
      payload: adminAuditLog.payload,
      targetName: targetU.name,
      targetEmail: targetU.email,
      actorEmail: actorU.email,
      createdAt: adminAuditLog.createdAt,
    })
    .from(adminAuditLog)
    .leftJoin(targetU, eq(adminAuditLog.targetUserId, targetU.id))
    .leftJoin(actorU, eq(adminAuditLog.actorUserId, actorU.id))
    .where(eq(adminAuditLog.action, "refund"))
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(limit);

  return c.json(
    rows.map((r) => {
      let amount: number | null = null;
      let reason: string | null = null;
      let mode: string | null = null;
      if (r.payload) {
        try {
          const p = JSON.parse(r.payload) as Record<string, unknown>;
          amount = p.amount != null ? Number(p.amount) : null;
          reason = (p.reason as string) ?? null;
          mode = (p.mode as string) ?? null;
        } catch {
          /* non-JSON payload — ignore */
        }
      }
      return {
        id: r.id,
        amount,
        reason,
        mode,
        targetName: r.targetName,
        targetEmail: r.targetEmail,
        actorEmail: r.actorEmail,
        createdAt: r.createdAt,
      };
    })
  );
});

adminFinance.get("/api/admin/finance/reports", async (c) => {
  const months = Math.min(Number(c.req.query("months") ?? 12), 36);
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1), 1);
  since.setHours(0, 0, 0, 0);

  const monthly = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${REV_DATE}), 'YYYY-MM')`,
      revenue: sql<string>`COALESCE(SUM(${upgradeRequest.amountInr}),0)`,
      transactions: count(),
    })
    .from(upgradeRequest)
    .where(and(inArray(upgradeRequest.status, PAID), gte(REV_DATE, since)))
    .groupBy(sql`date_trunc('month', ${REV_DATE})`)
    .orderBy(asc(sql`date_trunc('month', ${REV_DATE})`));

  const byPlan = await db
    .select({
      plan: upgradeRequest.targetPlan,
      revenue: sql<string>`COALESCE(SUM(${upgradeRequest.amountInr}),0)`,
      transactions: count(),
    })
    .from(upgradeRequest)
    .where(inArray(upgradeRequest.status, PAID))
    .groupBy(upgradeRequest.targetPlan);

  return c.json({
    monthly: monthly.map((r) => ({ month: r.month, revenue: Number(r.revenue), transactions: Number(r.transactions) })),
    byPlan: byPlan.map((r) => ({ plan: r.plan, revenue: Number(r.revenue), transactions: Number(r.transactions) })),
  });
});

/* ─────────── Payouts (minimal manual records) ─────────── */

adminFinance.get("/api/admin/payouts", async (c) => {
  const rows = await db.select().from(payout).orderBy(desc(payout.createdAt)).limit(200);
  return c.json(rows.map((r) => ({ ...r, amountInr: Number(r.amountInr) })));
});

adminFinance.post("/api/admin/payouts", requireAdmin(["super_admin", "billing"]), async (c) => {
  const b = await c.req.json().catch(() => ({}));
  if (!b.recipient || b.amountInr == null) return c.json({ error: "recipient and amountInr required" }, 400);
  const status = ["pending", "processing", "paid", "failed"].includes(b.status) ? b.status : "pending";
  const [row] = await db
    .insert(payout)
    .values({
      recipient: String(b.recipient).trim(),
      recipientType: b.recipientType ?? "partner",
      amountInr: String(b.amountInr),
      method: b.method ?? "upi",
      reference: b.reference ?? null,
      status,
      notes: b.notes ?? null,
      createdBy: c.get("adminUserId"),
      paidAt: status === "paid" ? new Date() : null,
    })
    .returning();
  await auditLog(c, "payout_create", null, { recipient: row.recipient, amount: Number(row.amountInr) });
  return c.json({ ...row, amountInr: Number(row.amountInr) }, 201);
});

adminFinance.patch("/api/admin/payouts/:id", requireAdmin(["super_admin", "billing"]), async (c) => {
  const id = c.req.param("id");
  const b = await c.req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (b.status !== undefined && ["pending", "processing", "paid", "failed"].includes(b.status)) {
    patch.status = b.status;
    patch.paidAt = b.status === "paid" ? new Date() : null;
  }
  if (b.reference !== undefined) patch.reference = b.reference;
  if (b.notes !== undefined) patch.notes = b.notes;
  if (Object.keys(patch).length === 0) return c.json({ error: "nothing to update" }, 400);
  const [row] = await db.update(payout).set(patch).where(eq(payout.id, id)).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  await auditLog(c, "payout_update", null, { id, status: row.status });
  return c.json({ ...row, amountInr: Number(row.amountInr) });
});

export default adminFinance;
