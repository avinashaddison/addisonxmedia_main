/**
 * Billing routes — customer-facing.
 *
 * Until Razorpay KYC is approved we run a manual-fulfillment flow:
 *   1. Customer clicks "Upgrade" on /app/upgrade → POST /billing/request-upgrade
 *   2. We insert an `upgrade_request` row with status='requested' and notify
 *      the admin (logs to stdout for now; can wire to email/Slack later)
 *   3. Admin sends a Razorpay payment link via WhatsApp, customer pays
 *   4. Admin uses existing /api/admin/workspaces/:id PATCH to flip
 *      `user.plan` + marks the upgrade_request 'completed'
 *
 * Once Razorpay is live we'll add /billing/checkout that creates a real
 * Razorpay subscription and a webhook handler that auto-completes the
 * upgrade_request row — the table + this endpoint stay.
 */

import { Hono } from "hono";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { user, upgradeRequest } from "../db/schema";
import { requireAuth, type AuthVariables } from "../middleware/auth";

const app = new Hono<{ Variables: AuthVariables }>();
app.use("*", requireAuth);

const VALID_PLANS = new Set(["starter", "growth", "scale", "enterprise"]);
const VALID_CYCLES = new Set(["monthly", "annual"]);

/**
 * GET /billing/me — current plan + active upgrade request (if any).
 * Drives the /app/upgrade page header and the Settings → Billing card.
 */
app.get("/billing/me", async (c) => {
  const userId = c.var.userId;

  const [u] = await db.select({
    id: user.id,
    plan: user.plan,
    accountStatus: user.accountStatus,
    trialEndsAt: user.trialEndsAt,
    mrrInr: user.mrrInr,
  }).from(user).where(eq(user.id, userId)).limit(1);

  // Active = anything that's not yet completed/declined/cancelled
  const [pending] = await db.select()
    .from(upgradeRequest)
    .where(and(
      eq(upgradeRequest.userId, userId),
      sql`${upgradeRequest.status} IN ('requested', 'contacted', 'paid')`,
    ))
    .orderBy(desc(upgradeRequest.createdAt))
    .limit(1);

  return c.json({
    plan: u?.plan ?? "free",
    account_status: u?.accountStatus ?? "active",
    trial_ends_at: u?.trialEndsAt ?? null,
    mrr_inr: u?.mrrInr ?? "0",
    pending_upgrade: pending ?? null,
  });
});

/**
 * POST /billing/request-upgrade — customer-initiated upgrade intent.
 * Body: { target_plan, billing_cycle?, customer_note? }
 */
app.post("/billing/request-upgrade", async (c) => {
  const userId = c.var.userId;
  const body = await c.req.json<{
    target_plan: string;
    billing_cycle?: string;
    customer_note?: string;
  }>();

  if (!body.target_plan || !VALID_PLANS.has(body.target_plan)) {
    return c.json({ error: "Invalid target_plan (must be starter|growth|scale|enterprise)" }, 400);
  }
  const cycle = body.billing_cycle ?? "monthly";
  if (!VALID_CYCLES.has(cycle)) {
    return c.json({ error: "billing_cycle must be 'monthly' or 'annual'" }, 400);
  }

  // Refuse upgrade to current plan — common mistake
  const [u] = await db.select({ plan: user.plan }).from(user).where(eq(user.id, userId)).limit(1);
  if (u?.plan === body.target_plan) {
    return c.json({ error: `You're already on the ${body.target_plan} plan.` }, 400);
  }

  // Cancel any existing pending requests so we don't pile up duplicates —
  // the latest one is the source of truth.
  await db.update(upgradeRequest)
    .set({ status: "cancelled" })
    .where(and(
      eq(upgradeRequest.userId, userId),
      sql`${upgradeRequest.status} IN ('requested', 'contacted')`,
    ));

  const [row] = await db.insert(upgradeRequest).values({
    userId,
    targetPlan: body.target_plan,
    billingCycle: cycle,
    customerNote: body.customer_note?.trim() || null,
    status: "requested",
  }).returning();

  // Notify admin — stdout for now, plumb to Slack/email when needed
  console.log(`[billing] new upgrade request: user=${userId} → ${body.target_plan} (${cycle})`);

  return c.json({ ok: true, request: row });
});

/**
 * DELETE /billing/upgrade-request/:id — customer cancels their own pending request.
 */
app.delete("/billing/upgrade-request/:id", async (c) => {
  const userId = c.var.userId;
  const id = c.req.param("id");
  const [row] = await db.select()
    .from(upgradeRequest)
    .where(and(eq(upgradeRequest.id, id), eq(upgradeRequest.userId, userId)))
    .limit(1);
  if (!row) return c.json({ error: "Not found" }, 404);
  if (row.status !== "requested" && row.status !== "contacted") {
    return c.json({ error: "Cannot cancel — already processed" }, 400);
  }
  await db.update(upgradeRequest)
    .set({ status: "cancelled", completedAt: new Date() })
    .where(eq(upgradeRequest.id, id));
  return c.json({ ok: true });
});

export default app;
