import { Hono } from "hono";
import { db } from "../db/client";
import { subscriptionPlan, platformCoupon, user } from "../db/schema";
import { eq, and, desc, asc, sql, count } from "drizzle-orm";
import { requireAdmin, auditLog, type AdminVariables } from "../middleware/admin";

/**
 * Subscription Management admin surface:
 *   - Plans (create/edit subscription plans, seeded with sensible defaults)
 *   - Platform coupons (operator-level discount codes — distinct from the
 *     owner-scoped storefront `coupon` table customers use on their sites)
 *   - Renewals (upcoming / overdue) derived from user.planRenewsAt (+ trialEndsAt for trials)
 */
const adminPlans = new Hono<{ Variables: AdminVariables }>();
adminPlans.use("/api/admin/*", requireAdmin());

const DAY = 24 * 3600 * 1000;
const BILLING = (v: unknown) => (v === "annual" ? "annual" : "monthly");

const DEFAULT_PLANS = [
  {
    key: "free", name: "Free", priceInr: "0", billingCycle: "monthly", sortOrder: 0,
    description: "Shuruaat ke liye — bina kharch ke try karein.",
    features: ["1 WhatsApp number", "100 messages/mahina", "Basic CRM", "Community support"],
  },
  {
    key: "starter", name: "Starter", priceInr: "999", billingCycle: "monthly", sortOrder: 1,
    description: "Chhote business ke liye — daily customer chat.",
    features: ["1 WhatsApp number", "2,000 messages/mahina", "Shared team inbox", "AI auto-reply (Hindi)", "Email support"],
  },
  {
    key: "growth", name: "Growth", priceInr: "2999", billingCycle: "monthly", sortOrder: 2,
    description: "Tezi se badhte business ke liye — broadcasts + automation.",
    features: ["2 WhatsApp numbers", "10,000 messages/mahina", "Broadcasts + campaigns", "UPI payments in chat", "Priority support"],
  },
  {
    key: "scale", name: "Scale", priceInr: "7999", billingCycle: "monthly", sortOrder: 3,
    description: "High-volume teams ke liye — full automation.",
    features: ["5 WhatsApp numbers", "50,000 messages/mahina", "Advanced automation", "Dedicated account manager", "Phone support"],
  },
  {
    key: "enterprise", name: "Enterprise", priceInr: "0", billingCycle: "monthly", sortOrder: 4,
    description: "Custom plan — aapke hisaab se. Sales se baat karein.",
    features: ["Unlimited numbers", "Custom message volume", "SLA + onboarding", "Custom integrations", "24×7 support"],
  },
];

async function seedDefaultPlansIfEmpty() {
  const [{ n }] = await db.select({ n: count() }).from(subscriptionPlan);
  if (Number(n) > 0) return;
  await db.insert(subscriptionPlan).values(DEFAULT_PLANS).onConflictDoNothing();
}

/* ─────────── Plans ─────────── */

adminPlans.get("/api/admin/plans", async (c) => {
  await seedDefaultPlansIfEmpty();
  const rows = await db
    .select()
    .from(subscriptionPlan)
    .orderBy(asc(subscriptionPlan.sortOrder), asc(subscriptionPlan.priceInr));
  const counts = await db
    .select({ plan: user.plan, n: count() })
    .from(user)
    .where(eq(user.isStaff, false))
    .groupBy(user.plan);
  const countMap = Object.fromEntries(counts.map((r) => [r.plan, Number(r.n)]));
  return c.json(rows.map((r) => ({ ...r, priceInr: Number(r.priceInr), subscribers: countMap[r.key] ?? 0 })));
});

adminPlans.post("/api/admin/plans", requireAdmin(["super_admin", "billing"]), async (c) => {
  const b = await c.req.json().catch(() => ({}));
  if (!b.key || !b.name) return c.json({ error: "key and name required" }, 400);
  try {
    const [row] = await db
      .insert(subscriptionPlan)
      .values({
        key: String(b.key).trim().toLowerCase(),
        name: String(b.name).trim(),
        description: b.description ?? null,
        priceInr: String(b.priceInr ?? 0),
        billingCycle: BILLING(b.billingCycle),
        features: Array.isArray(b.features) ? b.features : [],
        isActive: b.isActive !== false,
        isPublic: b.isPublic !== false,
        sortOrder: Number(b.sortOrder ?? 0),
      })
      .returning();
    await auditLog(c, "plan_create", null, { key: row.key, name: row.name });
    return c.json({ ...row, priceInr: Number(row.priceInr) }, 201);
  } catch (e) {
    if (String(e).includes("unique") || String(e).includes("duplicate")) {
      return c.json({ error: "Plan key already exists" }, 409);
    }
    throw e;
  }
});

adminPlans.patch("/api/admin/plans/:id", requireAdmin(["super_admin", "billing"]), async (c) => {
  const id = c.req.param("id");
  const b = await c.req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (b.name !== undefined) patch.name = String(b.name).trim();
  if (b.description !== undefined) patch.description = b.description;
  if (b.priceInr !== undefined) patch.priceInr = String(b.priceInr);
  if (b.billingCycle !== undefined) patch.billingCycle = BILLING(b.billingCycle);
  if (b.features !== undefined) patch.features = Array.isArray(b.features) ? b.features : [];
  if (b.isActive !== undefined) patch.isActive = !!b.isActive;
  if (b.isPublic !== undefined) patch.isPublic = !!b.isPublic;
  if (b.sortOrder !== undefined) patch.sortOrder = Number(b.sortOrder);
  const [row] = await db.update(subscriptionPlan).set(patch).where(eq(subscriptionPlan.id, id)).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  await auditLog(c, "plan_update", null, { id, changes: Object.keys(patch) });
  return c.json({ ...row, priceInr: Number(row.priceInr) });
});

adminPlans.delete("/api/admin/plans/:id", requireAdmin(["super_admin", "billing"]), async (c) => {
  const id = c.req.param("id");
  const [row] = await db.delete(subscriptionPlan).where(eq(subscriptionPlan.id, id)).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  await auditLog(c, "plan_delete", null, { id, key: row.key });
  return c.json({ ok: true });
});

/* ─────────── Platform coupons ─────────── */

adminPlans.get("/api/admin/coupons", async (c) => {
  const rows = await db.select().from(platformCoupon).orderBy(desc(platformCoupon.createdAt));
  return c.json(rows.map((r) => ({ ...r, discountValue: Number(r.discountValue) })));
});

adminPlans.post("/api/admin/coupons", requireAdmin(["super_admin", "billing"]), async (c) => {
  const b = await c.req.json().catch(() => ({}));
  if (!b.code) return c.json({ error: "code required" }, 400);
  try {
    const [row] = await db
      .insert(platformCoupon)
      .values({
        code: String(b.code).trim().toUpperCase(),
        description: b.description ?? null,
        discountType: b.discountType === "fixed" ? "fixed" : "percent",
        discountValue: String(b.discountValue ?? 0),
        appliesToPlan: b.appliesToPlan || null,
        maxRedemptions: b.maxRedemptions != null && b.maxRedemptions !== "" ? Number(b.maxRedemptions) : null,
        startsAt: b.startsAt ? new Date(b.startsAt) : null,
        expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
        active: b.active !== false,
        createdBy: c.get("adminUserId"),
      })
      .returning();
    await auditLog(c, "coupon_create", null, { code: row.code });
    return c.json({ ...row, discountValue: Number(row.discountValue) }, 201);
  } catch (e) {
    if (String(e).includes("unique") || String(e).includes("duplicate")) {
      return c.json({ error: "Coupon code already exists" }, 409);
    }
    throw e;
  }
});

adminPlans.patch("/api/admin/coupons/:id", requireAdmin(["super_admin", "billing"]), async (c) => {
  const id = c.req.param("id");
  const b = await c.req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (b.description !== undefined) patch.description = b.description;
  if (b.discountType !== undefined) patch.discountType = b.discountType === "fixed" ? "fixed" : "percent";
  if (b.discountValue !== undefined) patch.discountValue = String(b.discountValue);
  if (b.appliesToPlan !== undefined) patch.appliesToPlan = b.appliesToPlan || null;
  if (b.maxRedemptions !== undefined)
    patch.maxRedemptions = b.maxRedemptions != null && b.maxRedemptions !== "" ? Number(b.maxRedemptions) : null;
  if (b.startsAt !== undefined) patch.startsAt = b.startsAt ? new Date(b.startsAt) : null;
  if (b.expiresAt !== undefined) patch.expiresAt = b.expiresAt ? new Date(b.expiresAt) : null;
  if (b.active !== undefined) patch.active = !!b.active;
  const [row] = await db.update(platformCoupon).set(patch).where(eq(platformCoupon.id, id)).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  await auditLog(c, "coupon_update", null, { id });
  return c.json({ ...row, discountValue: Number(row.discountValue) });
});

adminPlans.delete("/api/admin/coupons/:id", requireAdmin(["super_admin", "billing"]), async (c) => {
  const id = c.req.param("id");
  const [row] = await db.delete(platformCoupon).where(eq(platformCoupon.id, id)).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  await auditLog(c, "coupon_delete", null, { id, code: row.code });
  return c.json({ ok: true });
});

/* ─────────── Renewals ─────────── */

adminPlans.get("/api/admin/renewals", async (c) => {
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * DAY);
  // Effective renewal date: explicit planRenewsAt, else trialEndsAt for trial accounts.
  const effective = sql<string | null>`COALESCE(${user.planRenewsAt}, CASE WHEN ${user.accountStatus} = 'trial' THEN ${user.trialEndsAt} END)`;
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      mrrInr: user.mrrInr,
      accountStatus: user.accountStatus,
      planRenewsAt: user.planRenewsAt,
      trialEndsAt: user.trialEndsAt,
      effective,
    })
    .from(user)
    .where(and(eq(user.isStaff, false), sql`${effective} IS NOT NULL`))
    .orderBy(sql`${effective} ASC NULLS LAST`)
    .limit(500);

  const map = (r: (typeof rows)[number]) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    plan: r.plan,
    mrrInr: Number(r.mrrInr),
    accountStatus: r.accountStatus,
    renewsAt: r.effective,
    isTrial: r.accountStatus === "trial" && !r.planRenewsAt,
  });

  const overdue: ReturnType<typeof map>[] = [];
  const upcoming: ReturnType<typeof map>[] = [];
  for (const r of rows) {
    if (!r.effective) continue;
    const eff = new Date(r.effective);
    if (eff < now) overdue.push(map(r));
    else if (eff <= in30) upcoming.push(map(r));
  }
  return c.json({ overdue, upcoming, now: now.toISOString() });
});

export default adminPlans;
