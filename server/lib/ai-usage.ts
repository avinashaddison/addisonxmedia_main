/**
 * Addison AI — per-workspace usage tracking and cap enforcement.
 *
 * Source of truth for cap checks is a sum over the `ai_usage` table for the
 * current calendar month — no counter column, so the reset happens
 * automatically on the 1st with no cron required.
 *
 * Usage from a route:
 *
 *   const gate = await checkAiCap(userId, "reply_suggestion");
 *   if (!gate.allowed) return c.json({ error: gate.reason, code: gate.code }, 429);
 *   try {
 *     const result = await chat(messages, { model: "gpt-4o-mini" });
 *     await logAiUsage({ userId, feature: "reply_suggestion", ...result, ok: true });
 *     return c.json({ ... });
 *   } catch (e) {
 *     await logAiUsage({ userId, feature: "reply_suggestion", model: "gpt-4o-mini",
 *                       promptTokens: 0, completionTokens: 0, costInr: 0,
 *                       ok: false, errorMessage: String(e) });
 *     throw e;
 *   }
 */

import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../db/client";
import { aiUsage, user } from "../db/schema";

export type AiFeature =
  | "reply_suggestion"
  | "auto_reply"
  | "ad_copy"
  | "ad_blueprint"
  | "followup_gen"
  | "insights"
  | "test";

// How much each feature counts against the monthly cap. Tuned so the cheap
// features cost 1 (matches user mental model: "one AI action") and the
// expensive ones cost more because they actually burn ~5× the tokens AND
// use the pricier gpt-4o/gpt-5.5 model.
export const FEATURE_WEIGHT: Record<AiFeature, number> = {
  reply_suggestion: 1,
  auto_reply:       1,
  followup_gen:     1,
  insights:         2,
  ad_copy:          5,
  ad_blueprint:     3,
  test:             0, // for internal /api/ai/ping — doesn't bill
};

// Monthly cap per plan. -1 means unlimited (Enterprise).
// Match the landing page promise: Starter gets a taste, Growth gets the real
// product, Enterprise gets fair-use unlimited.
const PLAN_CAP: Record<string, number> = {
  starter:    50,
  growth:     5_000,
  enterprise: -1,
};

// Which features each plan is allowed to call AT ALL. Starter only gets reply
// suggestions — everything else returns "upgrade required".
const PLAN_FEATURES: Record<string, Set<AiFeature>> = {
  starter:    new Set<AiFeature>(["reply_suggestion", "test"]),
  growth:     new Set<AiFeature>(["reply_suggestion", "auto_reply", "ad_copy", "ad_blueprint", "followup_gen", "insights", "test"]),
  enterprise: new Set<AiFeature>(["reply_suggestion", "auto_reply", "ad_copy", "ad_blueprint", "followup_gen", "insights", "test"]),
};

const monthStart = (): Date => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
};

/**
 * Compute how much of the monthly cap the user has consumed (weighted).
 * Counts only successful calls — a failed OpenAI call doesn't burn the user's
 * budget.
 */
export const getMonthlyUsage = async (userId: string): Promise<number> => {
  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(${aiUsage.weight}), 0)::int` })
    .from(aiUsage)
    .where(and(
      eq(aiUsage.userId, userId),
      eq(aiUsage.ok, true),
      gte(aiUsage.createdAt, monthStart()),
    ));
  return row?.total ?? 0;
};

export type CapGate =
  | { allowed: true; cap: number; used: number; remaining: number; weight: number }
  | { allowed: false; code: "feature_locked" | "cap_exceeded" | "ai_not_configured"; reason: string; cap: number; used: number; remaining: number };

/**
 * Check whether the user can make this AI call right now. Does NOT log
 * anything — purely a read. The caller is responsible for calling
 * logAiUsage() after the OpenAI call (success or failure).
 */
export const checkAiCap = async (userId: string, feature: AiFeature): Promise<CapGate> => {
  // 1. Platform must be configured
  if (!process.env.OPENAI_API_KEY) {
    return {
      allowed: false,
      code: "ai_not_configured",
      reason: "AI is not configured on this server. Contact support.",
      cap: 0, used: 0, remaining: 0,
    };
  }

  // 2. Resolve plan
  const [u] = await db.select({ plan: user.plan }).from(user).where(eq(user.id, userId)).limit(1);
  const plan = u?.plan ?? "starter";
  const cap = PLAN_CAP[plan] ?? PLAN_CAP.starter;
  const allowedFeatures = PLAN_FEATURES[plan] ?? PLAN_FEATURES.starter;

  // 3. Plan must allow this feature
  if (!allowedFeatures.has(feature)) {
    return {
      allowed: false,
      code: "feature_locked",
      reason: `Your ${plan} plan doesn't include this AI feature. Upgrade to Growth to unlock it.`,
      cap, used: 0, remaining: 0,
    };
  }

  // 4. Monthly cap — Enterprise (-1) skips the check
  const weight = FEATURE_WEIGHT[feature];
  if (cap === -1) {
    return { allowed: true, cap: -1, used: 0, remaining: -1, weight };
  }

  const used = await getMonthlyUsage(userId);
  const remaining = cap - used;
  if (remaining < weight) {
    return {
      allowed: false,
      code: "cap_exceeded",
      reason: `Monthly AI cap reached (${used}/${cap}). Resets on the 1st, or upgrade your plan.`,
      cap, used, remaining: Math.max(0, remaining),
    };
  }

  return { allowed: true, cap, used, remaining, weight };
};

export type LogArgs = {
  userId: string;
  feature: AiFeature;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costInr: number;
  ok: boolean;
  errorMessage?: string;
};

/** Persist one row to ai_usage. Never throws — logging must not break the route. */
export const logAiUsage = async (args: LogArgs): Promise<void> => {
  try {
    await db.insert(aiUsage).values({
      userId: args.userId,
      feature: args.feature,
      model: args.model,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      costInr: args.costInr.toFixed(4),
      weight: FEATURE_WEIGHT[args.feature],
      ok: args.ok,
      errorMessage: args.errorMessage ?? null,
    });
  } catch (e) {
    console.error("[ai-usage] failed to log row:", e);
  }
};

/** Summary used by the Settings → AI / Billing page. */
export const getUsageSummary = async (userId: string) => {
  const [u] = await db.select({ plan: user.plan }).from(user).where(eq(user.id, userId)).limit(1);
  const plan = u?.plan ?? "starter";
  const cap = PLAN_CAP[plan] ?? PLAN_CAP.starter;
  const used = await getMonthlyUsage(userId);

  // Per-feature breakdown for the current month
  const breakdown = await db
    .select({
      feature: aiUsage.feature,
      calls: sql<number>`COUNT(*)::int`,
      weight: sql<number>`COALESCE(SUM(${aiUsage.weight}), 0)::int`,
      costInr: sql<number>`COALESCE(SUM(${aiUsage.costInr}), 0)::numeric`,
    })
    .from(aiUsage)
    .where(and(
      eq(aiUsage.userId, userId),
      eq(aiUsage.ok, true),
      gte(aiUsage.createdAt, monthStart()),
    ))
    .groupBy(aiUsage.feature);

  return {
    plan,
    cap,                              // -1 means unlimited
    used,
    remaining: cap === -1 ? -1 : Math.max(0, cap - used),
    breakdown,
    month_start: monthStart().toISOString(),
    ai_configured: !!process.env.OPENAI_API_KEY,
  };
};
