/**
 * Customer-facing Ads Marketing routes.
 *
 * Auth: all endpoints require a signed-in customer session (requireAuth).
 * Storage: ad credentials live on meta_config alongside WhatsApp creds.
 *   ad_access_token is encrypted at rest with server/crypto.ts.
 *
 * Demo fallback: when a workspace hasn't connected Meta Ads yet, GET endpoints
 * return realistic shaped data so the SPA renders something instead of an
 * empty state. Mutations require a real connection.
 */

import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { metaConfig } from "../db/schema";
import { requireAuth, type AuthVariables } from "../middleware/auth";
import { encrypt, decrypt } from "../crypto";
import {
  verifyAdAccount,
  listCampaigns,
  createCampaign,
  updateCampaign,
  accountInsights,
  campaignInsights,
  listCustomAudiences,
  targetingSearch,
  deliveryEstimate,
  listPages,
  createAdSet,
  createAdCreative,
  createAd,
  deleteCampaign,
  deleteAdSet,
  AdsApiError,
  type AdsCredentials,
  type MetaCampaign,
  type TargetingSpec,
} from "../integrations/meta-ads";

const app = new Hono<{ Variables: AuthVariables }>();
app.use("*", requireAuth);

/** Pull (and decrypt) the user's ads credentials. null when not connected. */
async function getCreds(userId: string): Promise<AdsCredentials | null> {
  const [row] = await db.select().from(metaConfig).where(eq(metaConfig.userId, userId)).limit(1);
  if (!row?.adAccountId || !row?.adAccessToken) return null;
  return {
    accessToken: decrypt(row.adAccessToken),
    adAccountId: row.adAccountId,
  };
}

const onApiError = (e: unknown) => {
  if (e instanceof AdsApiError) {
    return { error: e.message, status: e.status, meta: e.meta };
  }
  return { error: e instanceof Error ? e.message : String(e), status: 500 };
};

/* ─────────── Connection ─────────── */

app.get("/ads/connection", async (c) => {
  const [row] = await db.select().from(metaConfig).where(eq(metaConfig.userId, c.var.userId)).limit(1);
  if (!row?.adAccountId) {
    return c.json({ connected: false, platform: "meta" });
  }
  return c.json({
    connected: true,
    platform: "meta",
    adAccountId: row.adAccountId,
    adAccountName: row.adAccountName,
    adAccountCurrency: row.adAccountCurrency,
    connectedAt: row.adsConnectedAt,
    lastVerifiedAt: row.adsLastVerifiedAt,
  });
});

/** Manual connection — user pastes a System User token + ad account id from
 *  Business Manager. We verify by hitting Meta, then store encrypted. */
app.post("/ads/connection", async (c) => {
  const body = await c.req.json<{ adAccountId: string; accessToken: string }>();
  const adAccountId = body.adAccountId?.trim().replace(/^act_/, "");
  const accessToken = body.accessToken?.trim();
  if (!adAccountId || !accessToken) {
    return c.json({ error: "adAccountId and accessToken are required" }, 400);
  }

  // Verify by fetching account info — fails fast if creds are wrong/scope is missing.
  let info;
  try {
    info = await verifyAdAccount({ adAccountId, accessToken });
  } catch (e) {
    const { error } = onApiError(e);
    return c.json({ error: `Meta rejected the credentials: ${error}` }, 400);
  }

  const userId = c.var.userId;
  const [existing] = await db.select().from(metaConfig).where(eq(metaConfig.userId, userId)).limit(1);

  if (existing) {
    await db.update(metaConfig).set({
      adAccountId,
      adAccessToken: encrypt(accessToken),
      adAccountName: info.name,
      adAccountCurrency: info.currency,
      adsConnectedAt: new Date(),
      adsLastVerifiedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(metaConfig.userId, userId));
  } else {
    // No WhatsApp row yet — create one with ads-only fields. WhatsApp can be
    // added later via the existing /integrations/meta flow.
    await db.insert(metaConfig).values({
      userId,
      accessToken: "", // placeholder until they connect WhatsApp
      phoneNumberId: "",
      adAccountId,
      adAccessToken: encrypt(accessToken),
      adAccountName: info.name,
      adAccountCurrency: info.currency,
      adsConnectedAt: new Date(),
      adsLastVerifiedAt: new Date(),
    });
  }
  return c.json({
    ok: true,
    adAccountId,
    adAccountName: info.name,
    adAccountCurrency: info.currency,
  });
});

app.delete("/ads/connection", async (c) => {
  await db.update(metaConfig).set({
    adAccountId: null,
    adAccessToken: null,
    adAccountName: null,
    adAccountCurrency: null,
    adsConnectedAt: null,
    adsLastVerifiedAt: null,
    updatedAt: new Date(),
  }).where(eq(metaConfig.userId, c.var.userId));
  return c.json({ ok: true });
});

/* ─────────── Campaigns ─────────── */

/** Live + insights joined into the shape the SPA expects. Falls back to demo
 *  data when not connected so the page never shows an empty state. */
app.get("/ads/campaigns", async (c) => {
  const creds = await getCreds(c.var.userId);
  if (!creds) return c.json({ campaigns: DEMO_CAMPAIGNS, demo: true });

  try {
    const [campaigns, insightsArr] = await Promise.all([
      listCampaigns(creds),
      campaignInsights(creds, "last_7d"),
    ]);
    const insightsById = new Map(insightsArr.map((i) => [i.campaign_id, i]));
    const rows = campaigns.map((c) => shapeCampaign(c, insightsById.get(c.id)));
    return c.json({ campaigns: rows, demo: false });
  } catch (e) {
    const err = onApiError(e);
    return c.json({ error: err.error, campaigns: DEMO_CAMPAIGNS, demo: true }, 200);
  }
});

/**
 * Create a campaign — with optional full launch (AdSet + Ad).
 *
 * Two modes:
 *   - "campaign_only": just creates the Meta Campaign object. User finishes
 *     the AdSet + Ad inside Meta Ads Manager. Used as a fallback when the
 *     wizard doesn't have a creative ready.
 *   - "full_launch":  Campaign → AdSet → Ad creative → Ad, all in one
 *     transaction. If any step fails, the partially-created objects are
 *     deleted so the user's ad account doesn't fill up with orphans.
 *
 * Mode is inferred from whether `creative` is in the payload.
 */
app.post("/ads/campaigns", async (c) => {
  const creds = await getCreds(c.var.userId);
  if (!creds) return c.json({ error: "Connect Meta Ads first" }, 400);

  const body = await c.req.json<{
    name: string;
    objective: string;
    daily_budget_inr: number;
    status?: "ACTIVE" | "PAUSED";
    targeting?: {
      country_codes?: string[];
      city_keys?: string[];
      region_keys?: string[];
      age_min?: number;
      age_max?: number;
      audience_id?: string;
      locales?: number[];
    };
    creative?: {
      page_id: string;
      image_url?: string;
      headline: string;
      body: string;
      link_url: string;
      cta_type?: string;
    };
  }>();
  if (!body.name?.trim()) return c.json({ error: "name required" }, 400);
  if (!body.objective) return c.json({ error: "objective required" }, 400);
  if (!body.daily_budget_inr || body.daily_budget_inr < 100) {
    return c.json({ error: "daily_budget_inr must be ≥ 100" }, 400);
  }

  const paise = Math.round(body.daily_budget_inr * 100);
  let campaignId: string | undefined;
  let adSetId: string | undefined;

  try {
    // Step 1: Campaign
    const campaign = await createCampaign(creds, {
      name: body.name,
      objective: body.objective,
      status: "PAUSED", // always start paused at the campaign level; status of the Ad controls running
      daily_budget: paise,
    });
    campaignId = campaign.id;

    // Campaign-only mode → return now
    if (!body.creative) {
      return c.json({ ok: true, id: campaign.id, mode: "campaign_only" });
    }

    // Build targeting_spec
    const targetingSpec: TargetingSpec = {
      geo_locations: {
        countries: body.targeting?.country_codes ?? ["IN"],
        cities: body.targeting?.city_keys?.map((k) => ({ key: k, radius: 40, distance_unit: "kilometer" })),
        regions: body.targeting?.region_keys?.map((k) => ({ key: k })),
      },
      age_min: body.targeting?.age_min ?? 18,
      age_max: body.targeting?.age_max ?? 65,
    };
    if (body.targeting?.audience_id) {
      targetingSpec.custom_audiences = [{ id: body.targeting.audience_id }];
    }
    if (body.targeting?.locales?.length) {
      targetingSpec.locales = body.targeting.locales;
    }

    // Pick a sensible optimization goal per objective
    const isCTW = /MESSAGES/i.test(body.objective);
    const optimizationGoal =
      isCTW ? "CONVERSATIONS" :
      /OUTCOME_LEADS/i.test(body.objective) ? "LEAD_GENERATION" :
      /OUTCOME_SALES/i.test(body.objective) ? "OFFSITE_CONVERSIONS" :
      "LINK_CLICKS";

    // Step 2: Ad Set
    const adSet = await createAdSet(creds, {
      name: `${body.name} · Ad Set`,
      campaignId: campaign.id,
      dailyBudgetPaise: paise,
      billingEvent: "IMPRESSIONS",
      optimizationGoal,
      targetingSpec,
      destinationType: isCTW ? "WHATSAPP" : undefined,
      pageId: body.creative.page_id,
      status: "PAUSED",
    });
    adSetId = adSet.id;

    // Step 3: Ad Creative
    const ctaType = body.creative.cta_type ?? (isCTW ? "WHATSAPP_MESSAGE" : "LEARN_MORE");
    const creative = await createAdCreative(creds, {
      name: `${body.name} · Creative`,
      pageId: body.creative.page_id,
      imageUrl: body.creative.image_url,
      headline: body.creative.headline,
      body: body.creative.body,
      linkUrl: body.creative.link_url,
      ctaType,
    });

    // Step 4: Ad (links creative to ad set)
    const ad = await createAd(creds, {
      name: `${body.name} · Ad`,
      adSetId: adSet.id,
      creativeId: creative.id,
      status: body.status ?? "PAUSED",
    });

    return c.json({
      ok: true,
      mode: "full_launch",
      campaign_id: campaign.id,
      ad_set_id: adSet.id,
      creative_id: creative.id,
      ad_id: ad.id,
    });
  } catch (e) {
    // Rollback partial creates so Meta isn't left with orphan campaign/ad-set rows.
    if (adSetId) {
      await deleteAdSet(creds, adSetId).catch((err) => console.error("[ads rollback adset]", err));
    }
    if (campaignId) {
      await deleteCampaign(creds, campaignId).catch((err) => console.error("[ads rollback campaign]", err));
    }
    const err = onApiError(e);
    return c.json({ error: err.error, meta: err.meta }, 400);
  }
});

/* ─────────── Real-data helpers for the create wizard ─────────── */

/** Search Meta targeting (locations etc) — typeahead for the create wizard. */
app.get("/ads/targeting/search", async (c) => {
  const creds = await getCreds(c.var.userId);
  if (!creds) return c.json({ results: [], demo: true });
  const q = c.req.query("q") ?? "";
  if (!q.trim()) return c.json({ results: [] });
  try {
    const results = await targetingSearch(creds, q);
    return c.json({ results, demo: false });
  } catch (e) {
    const err = onApiError(e);
    return c.json({ error: err.error, results: [] }, 200);
  }
});

/** Real reach/results estimate from Meta — called as the user changes
 *  budget / targeting in the wizard preview. */
app.post("/ads/estimate", async (c) => {
  const creds = await getCreds(c.var.userId);
  const body = await c.req.json<{
    objective: string;
    daily_budget_inr: number;
    targeting?: {
      country_codes?: string[];
      city_keys?: string[];
      region_keys?: string[];
      age_min?: number;
      age_max?: number;
      audience_id?: string;
    };
  }>();

  if (!creds) {
    // Demo fallback — same shape as the live response so the UI can render the
    // estimate card before the workspace connects Meta.
    const b = body.daily_budget_inr || 1000;
    return c.json({
      estimate_ready: false,
      reach_low: Math.round(b * 12),
      reach_high: Math.round(b * 28),
      results_low: Math.round(b / 3.5),
      results_high: Math.round(b / 1.8),
      demo: true,
    });
  }

  try {
    const targetingSpec: TargetingSpec = {
      geo_locations: {
        countries: body.targeting?.country_codes ?? ["IN"],
        cities: body.targeting?.city_keys?.map((k) => ({ key: k, radius: 40, distance_unit: "kilometer" })),
        regions: body.targeting?.region_keys?.map((k) => ({ key: k })),
      },
      age_min: body.targeting?.age_min ?? 18,
      age_max: body.targeting?.age_max ?? 65,
    };
    if (body.targeting?.audience_id) targetingSpec.custom_audiences = [{ id: body.targeting.audience_id }];

    const isCTW = /MESSAGES/i.test(body.objective);
    const optimizationGoal =
      isCTW ? "CONVERSATIONS" :
      /OUTCOME_LEADS/i.test(body.objective) ? "LEAD_GENERATION" :
      "LINK_CLICKS";

    const est = await deliveryEstimate(creds, {
      targetingSpec,
      optimizationGoal,
      dailyBudgetPaise: body.daily_budget_inr ? Math.round(body.daily_budget_inr * 100) : undefined,
      currency: "INR",
    });

    // Find the curve point closest to the user's budget
    const targetSpend = body.daily_budget_inr ? Math.round(body.daily_budget_inr * 100) : null;
    const closest =
      targetSpend !== null
        ? est.daily_outcomes_curve.reduce<typeof est.daily_outcomes_curve[number] | null>((best, p) => {
            if (!best) return p;
            return Math.abs(p.spend - targetSpend) < Math.abs(best.spend - targetSpend) ? p : best;
          }, null)
        : est.daily_outcomes_curve[Math.floor(est.daily_outcomes_curve.length / 2)] ?? null;

    return c.json({
      estimate_ready: est.estimate_ready,
      audience_size_low: est.estimate_mau_lower_bound,
      audience_size_high: est.estimate_mau_upper_bound,
      reach_low: closest ? Math.round(closest.reach * 0.85) : 0,
      reach_high: closest ? Math.round(closest.reach * 1.15) : 0,
      results_low: closest ? Math.round(closest.actions * 0.7) : 0,
      results_high: closest ? Math.round(closest.actions * 1.3) : 0,
      demo: false,
    });
  } catch (e) {
    const err = onApiError(e);
    // On Meta error, still return demo numbers so the wizard preview stays functional
    const b = body.daily_budget_inr || 1000;
    return c.json({
      estimate_ready: false,
      reach_low: Math.round(b * 12),
      reach_high: Math.round(b * 28),
      results_low: Math.round(b / 3.5),
      results_high: Math.round(b / 1.8),
      error: err.error,
      demo: true,
    });
  }
});

/** List Facebook Pages this workspace can run ads from. CTW/lead ads must
 *  attach to a Page. */
app.get("/ads/pages", async (c) => {
  const creds = await getCreds(c.var.userId);
  if (!creds) return c.json({ pages: [], demo: true });
  try {
    const pages = await listPages(creds);
    return c.json({
      pages: pages.map((p) => ({ id: p.id, name: p.name, category: p.category ?? null })),
      demo: false,
    });
  } catch (e) {
    const err = onApiError(e);
    return c.json({ error: err.error, pages: [] }, 200);
  }
});

app.patch("/ads/campaigns/:id", async (c) => {
  const creds = await getCreds(c.var.userId);
  if (!creds) return c.json({ error: "Connect Meta Ads first" }, 400);

  const id = c.req.param("id");
  const body = await c.req.json<{ status?: "ACTIVE" | "PAUSED"; daily_budget_inr?: number; name?: string }>();
  const update: { status?: "ACTIVE" | "PAUSED"; daily_budget?: number; name?: string } = {};
  if (body.status) update.status = body.status;
  if (body.daily_budget_inr) update.daily_budget = Math.round(body.daily_budget_inr * 100);
  if (body.name) update.name = body.name;
  if (Object.keys(update).length === 0) return c.json({ error: "Nothing to update" }, 400);

  try {
    await updateCampaign(creds, id, update);
    return c.json({ ok: true });
  } catch (e) {
    const err = onApiError(e);
    return c.json({ error: err.error }, 400);
  }
});

/* ─────────── Insights (account-level KPIs) ─────────── */

app.get("/ads/insights", async (c) => {
  const creds = await getCreds(c.var.userId);
  const preset =
    (c.req.query("range") as "today" | "yesterday" | "last_7d" | "last_14d" | "last_30d") ?? "last_7d";

  if (!creds) return c.json({ ...DEMO_INSIGHTS, demo: true });

  try {
    const i = await accountInsights(creds, preset);
    const ctw = i.actions?.find((a) => a.action_type === "onsite_conversion.messaging_conversation_started_7d");
    const purchases = i.actions?.find((a) => a.action_type === "purchase");
    return c.json({
      spend_inr: Number(i.spend ?? 0),
      impressions: Number(i.impressions ?? 0),
      clicks: Number(i.clicks ?? 0),
      ctr_pct: Number(i.ctr ?? 0),
      cpc_inr: Number(i.cpc ?? 0),
      reach: Number(i.reach ?? 0),
      whatsapp_chats: ctw ? Number(ctw.value) : 0,
      purchases: purchases ? Number(purchases.value) : 0,
      demo: false,
    });
  } catch (e) {
    const err = onApiError(e);
    return c.json({ ...DEMO_INSIGHTS, error: err.error, demo: true });
  }
});

/* ─────────── Audiences ─────────── */

app.get("/ads/audiences", async (c) => {
  const creds = await getCreds(c.var.userId);
  if (!creds) return c.json({ audiences: DEMO_AUDIENCES, demo: true });

  try {
    const data = await listCustomAudiences(creds);
    const rows = data.map((a) => ({
      id: a.id,
      name: a.name,
      type:
        a.subtype === "LOOKALIKE" ? "lookalike" :
        a.subtype === "CUSTOM" || a.subtype === "WEBSITE" || a.subtype === "ENGAGEMENT" ? "custom" :
        "saved",
      size: a.approximate_count_upper_bound ?? a.approximate_count_lower_bound ?? 0,
      source: a.subtype.toLowerCase(),
      status: a.delivery_status?.code === 200 ? "ready" : "building",
    }));
    return c.json({ audiences: rows, demo: false });
  } catch (e) {
    const err = onApiError(e);
    return c.json({ audiences: DEMO_AUDIENCES, error: err.error, demo: true });
  }
});

/* ─────────── Shape helpers ─────────── */

type ShapedCampaign = {
  id: string;
  name: string;
  platform: "meta" | "google";
  objective: string;
  status: "active" | "paused" | "review";
  daily_budget_inr: number;
  spent_inr: number;
  impressions: number;
  clicks: number;
  results: number;
  result_type: string;
  cpc_inr: number;
  ctr: number;
  roas: number;
  audience: string;
};

function shapeCampaign(
  c: MetaCampaign,
  i?: { spend?: string; impressions?: string; clicks?: string; ctr?: string; cpc?: string; actions?: Array<{ action_type: string; value: string }> }
): ShapedCampaign {
  const ctw = i?.actions?.find((a) => a.action_type === "onsite_conversion.messaging_conversation_started_7d");
  const purchases = i?.actions?.find((a) => a.action_type === "purchase");
  const leads = i?.actions?.find((a) => a.action_type === "lead");
  const isCTW = /MESSAGE|MESSAGES|OUTCOME_ENGAGEMENT/i.test(c.objective);
  const result = ctw ? Number(ctw.value) : purchases ? Number(purchases.value) : leads ? Number(leads.value) : 0;
  const status =
    c.effective_status === "ACTIVE" || c.status === "ACTIVE" ? "active" :
    c.effective_status === "IN_PROCESS" || c.effective_status === "PENDING_REVIEW" ? "review" :
    "paused";
  return {
    id: c.id,
    name: c.name,
    platform: "meta",
    objective: humanObjective(c.objective),
    status,
    daily_budget_inr: c.daily_budget ? Number(c.daily_budget) / 100 : 0,
    spent_inr: i?.spend ? Number(i.spend) : 0,
    impressions: i?.impressions ? Number(i.impressions) : 0,
    clicks: i?.clicks ? Number(i.clicks) : 0,
    results: result,
    result_type: ctw ? "WhatsApp chats" : purchases ? "Purchases" : leads ? "Leads" : "Conversions",
    cpc_inr: i?.cpc ? Number(i.cpc) : 0,
    ctr: i?.ctr ? Number(i.ctr) : 0,
    roas: 0, // requires purchase value tracking — surfaced as 0 until pixel events are wired
    audience: isCTW ? "Lookalike + saved" : "Auto-targeted",
  };
}

function humanObjective(o: string): string {
  const map: Record<string, string> = {
    MESSAGES: "Click-to-WhatsApp",
    OUTCOME_ENGAGEMENT: "Engagement",
    OUTCOME_LEADS: "Lead generation",
    OUTCOME_SALES: "Sales",
    OUTCOME_AWARENESS: "Awareness",
    OUTCOME_TRAFFIC: "Traffic",
    OUTCOME_APP_PROMOTION: "App installs",
  };
  return map[o] ?? o.replace(/^OUTCOME_/, "").replace(/_/g, " ").toLowerCase();
}

/* ─────────── Demo fallback data ─────────── */

const DEMO_CAMPAIGNS: ShapedCampaign[] = [
  { id: "demo_c1", name: "Diwali Sale · CTW Ads", platform: "meta", objective: "Click-to-WhatsApp", status: "active", daily_budget_inr: 2500, spent_inr: 18420, impressions: 248910, clicks: 8412, results: 612, result_type: "WhatsApp chats", cpc_inr: 2.19, ctr: 3.38, roas: 4.7, audience: "FabBox lookalike 1%" },
  { id: "demo_c2", name: "Class 10 Admissions · Tier-2", platform: "meta", objective: "Lead generation", status: "active", daily_budget_inr: 1200, spent_inr: 9240, impressions: 142500, clicks: 4280, results: 318, result_type: "Form fills", cpc_inr: 2.16, ctr: 3.0, roas: 6.2, audience: "Indore + Bhopal parents" },
  { id: "demo_c3", name: "Catalogue · Dynamic Retarget", platform: "meta", objective: "Catalog sales", status: "review", daily_budget_inr: 1500, spent_inr: 0, impressions: 0, clicks: 0, results: 0, result_type: "Purchases", cpc_inr: 0, ctr: 0, roas: 0, audience: "Cart abandoners 14d" },
];

const DEMO_INSIGHTS = {
  spend_inr: 40000,
  impressions: 542400,
  clicks: 14820,
  ctr_pct: 2.73,
  cpc_inr: 2.7,
  reach: 228000,
  whatsapp_chats: 930,
  purchases: 412,
};

const DEMO_AUDIENCES = [
  { id: "demo_a1", name: "WhatsApp openers (30d)", type: "custom" as const, size: 12450, source: "WhatsApp events", status: "ready" as const },
  { id: "demo_a2", name: "FabBox buyers lookalike 1%", type: "lookalike" as const, size: 2_100_000, source: "Pixel events", status: "ready" as const },
  { id: "demo_a3", name: "Cart abandoners 14d", type: "custom" as const, size: 4280, source: "Add-to-cart pixel", status: "ready" as const },
];

export default app;
