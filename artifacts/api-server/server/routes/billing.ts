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
import { user, upgradeRequest, profile } from "../db/schema";
import { requireAuth, type AuthVariables } from "../middleware/auth";
import {
  cashfreeIsConfigured, cashfreeMode, createOrder as cfCreateOrder,
  getOrder as cfGetOrder, priceFor, isValidPlanKey, isValidCycle,
  type PlanKey, type BillingCycle,
} from "../integrations/cashfree";
import logger from "../lib/logger";
import { logActivity } from "../lib/activity-log";
import { computeRenewsAt } from "../lib/renewal";

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

  // Notify admin -- stdout for now, plumb to Slack/email when needed
  logger.info({ userId, targetPlan: body.target_plan, cycle }, 'New upgrade request');

  logActivity(userId, 'upgrade_requested', {
    resourceType: 'upgrade_request',
    metadata: { targetPlan: body.target_plan },
  });

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

/* ─────────────────────────────────────────────────────────────────────────
 * Cashfree Payment Gateway — paid upgrade flow (v2023-08-01)
 *
 * 1. POST /billing/cashfree/create-order
 *    Body: { plan: "starter|growth|scale", cycle: "monthly|annual" }
 *    - Server picks canonical price (frontend can't tamper with amount)
 *    - Posts to Cashfree /orders, gets payment_session_id back
 *    - Inserts/updates upgrade_request with cashfree_order_id + session
 *    - Returns { paymentSessionId, orderId, mode, amountInr } to frontend
 *
 * 2. GET /billing/cashfree/verify/:orderId
 *    - Hits Cashfree /orders/{orderId} server-side
 *    - If status=PAID, flips upgrade_request → completed + user.plan
 *    - Idempotent: re-runs after webhook are no-ops
 *    Returns the latest plan state for the frontend to display.
 * ───────────────────────────────────────────────────────────────────────── */

app.get("/billing/cashfree/status", async (c) => {
  // Frontend probes this to decide between "Pay with Cashfree" and "Request
  // upgrade" (the manual fallback). When configured=false the manual flow
  // stays as the only path so we never block users from upgrading.
  return c.json({
    configured: cashfreeIsConfigured(),
    mode: cashfreeMode(),
  });
});

/* Deploy-check ping — proves the build deployed by Render is current.
 * Bumped manually each time we ship a Cashfree change. Frontend can curl
 * this; admin /health surfaces it.
 *
 * If this returns the OLD revision string, Render hasn't redeployed yet.
 */
app.get("/billing/cashfree/ping", async (c) => {
  return c.json({
    ok: true,
    revision: "cashfree-r2-defensive-wrap",
    configured: cashfreeIsConfigured(),
    mode: cashfreeIsConfigured() ? cashfreeMode() : null,
    hasAppId: !!process.env.CASHFREE_APP_ID,
    hasSecret: !!process.env.CASHFREE_SECRET_KEY,
    serverTime: new Date().toISOString(),
  });
});

app.post("/billing/cashfree/create-order", async (c) => {
  // Outer try/catch — without this, any throw outside the inner cfCreateOrder
  // try (e.g. a DB schema mismatch, a typo, an env access) escapes to Hono's
  // default handler and Render's edge returns a bare "502 Bad Gateway" with
  // no JSON body, so the frontend can only show "Request failed (502)".
  // The defensive wrap turns every failure into a structured JSON response.
  try {
  if (!cashfreeIsConfigured()) {
    return c.json({ error: "Cashfree not configured on this server" }, 503);
  }
  const userId = c.var.userId;
  const userEmail = c.var.userEmail;

  const body = await c.req.json<{ plan?: string; cycle?: string }>().catch(() => ({} as { plan?: string; cycle?: string }));
  const plan = (body.plan ?? "").toLowerCase();
  const cycle = (body.cycle ?? "monthly").toLowerCase();

  if (!isValidPlanKey(plan)) {
    return c.json({ error: "plan must be one of: starter, growth, scale" }, 400);
  }
  if (!isValidCycle(cycle)) {
    return c.json({ error: "cycle must be 'monthly' or 'annual'" }, 400);
  }

  // Pull user (for plan check + name/email) and profile (for phone).
  // Phone lives on `profile`, not `user`, since BetterAuth's user row is
  // auth-only — we extended onboarding to capture phone into profile.
  const [[u], [p]] = await Promise.all([
    db.select({
      id: user.id, email: user.email, name: user.name, plan: user.plan,
    }).from(user).where(eq(user.id, userId)).limit(1),
    db.select({ phone: profile.phone })
      .from(profile).where(eq(profile.userId, userId)).limit(1)
  ]);
  if (!u) return c.json({ error: "User not found" }, 404);
  if (u.plan === plan) {
    return c.json({ error: `You're already on the ${plan} plan.` }, 400);
  }

  // Cashfree requires E.164-ish phone. If we don't have one (signup-only
  // user), fall back to a placeholder — Cashfree will still accept but UPI
  // flows won't autofill. The customer will fill it in on their checkout.
  const customerPhone = (p?.phone ?? "").replace(/[^\d+]/g, "") || "9999999999";

  const amount = priceFor(plan as PlanKey, cycle as BillingCycle);
  const orderId = `addisonx_${userId.slice(0, 8)}_${Date.now()}`;

  // Build absolute return + notify URLs. Cashfree v2023-08-01 REQUIRES https://
  // — Render terminates TLS at the edge so c.req.url is `http://` internally,
  // which Cashfree rejects with `order_meta.return_url_invalid`. We honour
  // x-forwarded-proto (set by every standard reverse proxy: Render, Vercel,
  // Cloudflare) and fall back to the request URL only when not present
  // (e.g. local dev). Forces https:// in production unconditionally via
  // the PUBLIC_ORIGIN escape hatch if needed.
  const publicOrigin = (process.env.PUBLIC_ORIGIN ?? "").replace(/\/+$/, "");
  let origin: string;
  if (publicOrigin) {
    origin = publicOrigin;
  } else {
    const forwardedProto = c.req.header("x-forwarded-proto");
    const forwardedHost = c.req.header("x-forwarded-host") ?? c.req.header("host");
    if (forwardedProto && forwardedHost) {
      origin = `${forwardedProto.split(",")[0].trim()}://${forwardedHost}`;
    } else {
      origin = new URL(c.req.url).origin;
    }
  }
  // Belt-and-braces — if origin still came out http and we look like a real
  // public host (not localhost), upgrade it so Cashfree accepts it. This
  // prevents the http:// gotcha if a reverse proxy ever forgets x-forwarded.
  if (origin.startsWith("http://") && !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(origin)) {
    origin = "https://" + origin.slice("http://".length);
  }
  const returnUrl = `${origin}/app/upgrade/return?order_id={order_id}`;
  const notifyUrl = `${origin}/api/webhooks/cashfree`;

  // Cashfree requires:
  //  - customer_id ≤ 50 chars, alphanumeric + _- only
  //  - customer_phone: 10-digit Indian mobile (no country code prefix in
  //    v2023-08-01 unless explicitly with +91). Strip everything that isn't
  //    a digit, take the LAST 10 digits so "+919876543210" → "9876543210".
  const cleanedDigits = customerPhone.replace(/\D/g, "");
  const tenDigit = cleanedDigits.slice(-10);
  const safeCustomerId = `u_${userId}`.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 50);

  let order;
  try {
    order = await cfCreateOrder({
      order_id: orderId,
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: safeCustomerId,
        customer_email: u.email ?? userEmail,
        customer_phone: tenDigit || "9999999999",
        customer_name: u.name ?? undefined,
      },
      order_meta: { return_url: returnUrl, notify_url: notifyUrl },
      order_note: `AddisonX ${plan} · ${cycle}`,
      order_tags: { plan, cycle, user_id: userId.slice(0, 30) },
    });
  } catch (err) {
    // Cashfree error — surface the actual message so the customer (and us
    // looking at logs) can see what's wrong instead of a generic 502.
    const e = err as { message?: string; code?: string; type?: string; status?: number; raw?: unknown };
    logger.error({ err }, 'Cashfree create-order failed');
    return c.json({
      error: "cashfree_create_failed",
      message: e?.message ?? "Cashfree rejected the order",
      code: e?.code ?? null,
      type: e?.type ?? null,
      cashfreeStatus: e?.status ?? null,
      hint: e?.code === "invalid_phone_number" || e?.message?.toLowerCase().includes("phone")
        ? "Add a valid 10-digit Indian mobile in /app/settings → Profile, then retry."
        : null,
    }, 502);
  }

  if (!order || !order.payment_session_id) {
    return c.json({ error: "Cashfree returned no payment_session_id" }, 502);
  }

  // Cancel any prior pending upgrade_request — keep only the latest paid attempt
  await db.update(upgradeRequest)
    .set({ status: "cancelled" })
    .where(and(
      eq(upgradeRequest.userId, userId),
      sql`${upgradeRequest.status} IN ('requested', 'contacted')`,
    ));

  await db.insert(upgradeRequest).values({
    userId,
    targetPlan: plan,
    billingCycle: cycle,
    status: "requested",
    cashfreeOrderId: order.order_id,
    cashfreePaymentSessionId: order.payment_session_id,
    amountInr: String(amount),
    customerNote: `Cashfree checkout initiated · ${cashfreeMode()}`,
  });

  return c.json({
    paymentSessionId: order.payment_session_id,
    orderId: order.order_id,
    mode: cashfreeMode(),
    amountInr: amount,
  });
  } catch (err) {
    // Catch-all — DB error, env error, anything that escaped the inner try.
    // Without this, Hono propagates the throw and Render's edge gives the
    // browser a bare "502 Bad Gateway" with no JSON body.
    logger.error({ err }, 'Cashfree create-order outer error');
    if (process.env.NODE_ENV === "production") {
      return c.json({
        error: "server_error",
        message: "An internal error occurred",
      }, 500);
    }
    return c.json({
      error: "server_error",
      message: err instanceof Error ? err.message : String(err),
    }, 500);
  }
});

app.get("/billing/cashfree/verify/:orderId", async (c) => {
  if (!cashfreeIsConfigured()) {
    return c.json({ error: "Cashfree not configured on this server" }, 503);
  }
  const userId = c.var.userId;
  const orderId = c.req.param("orderId");
  if (!orderId) return c.json({ error: "orderId required" }, 400);

  // Confirm this order belongs to the calling user — never let one user
  // query another's order status.
  const [req] = await db.select()
    .from(upgradeRequest)
    .where(and(eq(upgradeRequest.cashfreeOrderId, orderId), eq(upgradeRequest.userId, userId)))
    .limit(1);
  if (!req) return c.json({ error: "Order not found" }, 404);

  const order = await cfGetOrder(orderId).catch((err) => {
    logger.error({ err, orderId }, 'Cashfree verify failed');
    return null;
  });
  if (!order) return c.json({ error: "Cashfree lookup failed" }, 502);

  // Activate if PAID and not already activated — idempotent (webhook may
  // have raced and beat us here, which is fine, the WHERE-clause is the gate)
  if (order.order_status === "PAID" && req.status !== "completed") {
    const activatedAt = new Date();
    await db.transaction(async (tx) => {
      await tx.update(user)
        .set({ plan: req.targetPlan, planRenewsAt: computeRenewsAt(req.billingCycle, activatedAt) })
        .where(eq(user.id, userId));
      await tx.update(upgradeRequest)
        .set({ status: "completed", completedAt: activatedAt })
        .where(eq(upgradeRequest.id, req.id));
    });
  }

  return c.json({
    orderId,
    cashfreeStatus: order.order_status,
    upgradeStatus: order.order_status === "PAID" ? "completed" : req.status,
    plan: order.order_status === "PAID" ? req.targetPlan : null,
  });
});

export default app;
