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
import { eq, and, inArray } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "../db/client";
import { metaConfig, contact, conversation, deal, message } from "../db/schema";
import { sql } from "drizzle-orm";
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
  interestSearch,
  browseTargetingCategories,
  deliveryEstimate,
  listPages,
  createAdSet,
  createAdCreative,
  createAd,
  deleteCampaign,
  deleteAdSet,
  singleCampaignInsights,
  campaignTimeSeries,
  campaignBreakdown,
  listAdsInCampaign,
  adsInsights,
  createCustomAudience,
  addUsersToAudience,
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
    // Meta returns errors like:
    //   { error: { message, type, code, error_subcode, error_user_title,
    //              error_user_msg, fbtrace_id } }
    // The top-level `message` is often a useless "Permissions error" — the
    // actionable detail is in `error_user_msg`. Surface the best one we have.
    const meta = e.meta as { error?: {
      message?: string;
      error_subcode?: number;
      error_user_title?: string;
      error_user_msg?: string;
      fbtrace_id?: string;
    } } | undefined;
    const userMsg = meta?.error?.error_user_msg;
    const userTitle = meta?.error?.error_user_title;
    const trace = meta?.error?.fbtrace_id;
    const composed = userMsg
      ? (userTitle ? `${userTitle}: ${userMsg}` : userMsg)
      : e.message;
    return {
      error: composed + (trace ? ` (Meta trace: ${trace})` : ""),
      status: e.status,
      meta: e.meta,
    };
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
    destination_type?: "WHATSAPP" | "MESSENGER" | "WEBSITE" | "ON_AD";
    daily_budget_inr: number;
    status?: "ACTIVE" | "PAUSED";
    start_time?: string;
    end_time?: string;
    targeting?: {
      country_codes?: string[];
      city_keys?: string[];
      region_keys?: string[];
      age_min?: number;
      age_max?: number;
      audience_id?: string;
      locales?: number[];
      genders?: number[];
      publisher_platforms?: string[];
      facebook_positions?: string[];
      instagram_positions?: string[];
      interest_ids?: Array<{ id: string; name?: string }>;
      excluded_interest_ids?: Array<{ id: string; name?: string }>;
      excluded_audience_id?: string;
      targeting_expansion?: boolean;
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
  let lastStep = "init";

  try {
    // Step 1: Campaign
    lastStep = "campaign";
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

    // Build targeting_spec. Meta rejects geo_locations that overlap: if you
    // pass countries:["IN"] AND regions/cities inside India, it errors with
    // "Some of your locations overlap". Resolve hierarchically: most specific
    // wins (cities > regions > countries).
    const geo: NonNullable<TargetingSpec["geo_locations"]> = {};
    const cities = body.targeting?.city_keys?.length
      ? body.targeting.city_keys.map((k) => ({ key: k, radius: 40, distance_unit: "kilometer" as const }))
      : null;
    const regions = body.targeting?.region_keys?.length
      ? body.targeting.region_keys.map((k) => ({ key: k }))
      : null;
    if (cities) geo.cities = cities;
    if (regions) geo.regions = regions;
    if (!cities && !regions) {
      // No specific geo — fall back to country-level targeting.
      geo.countries = body.targeting?.country_codes ?? ["IN"];
    }

    const targetingSpec: TargetingSpec = {
      geo_locations: geo,
      age_min: body.targeting?.age_min ?? 18,
      age_max: body.targeting?.age_max ?? 65,
    };
    if (body.targeting?.audience_id) {
      targetingSpec.custom_audiences = [{ id: body.targeting.audience_id }];
    }
    if (body.targeting?.locales?.length) {
      targetingSpec.locales = body.targeting.locales;
    }
    if (body.targeting?.genders?.length) {
      targetingSpec.genders = body.targeting.genders;
    }
    if (body.targeting?.publisher_platforms?.length) {
      targetingSpec.publisher_platforms = body.targeting.publisher_platforms;
    }
    if (body.targeting?.facebook_positions?.length) {
      targetingSpec.facebook_positions = body.targeting.facebook_positions;
    }
    if (body.targeting?.instagram_positions?.length) {
      targetingSpec.instagram_positions = body.targeting.instagram_positions;
    }
    // Interest targeting — wraps in flexible_spec (Meta requires this shape)
    if (body.targeting?.interest_ids?.length) {
      targetingSpec.flexible_spec = [{ interests: body.targeting.interest_ids }];
    }
    // Exclusions
    const exclusions: NonNullable<TargetingSpec["exclusions"]> = {};
    if (body.targeting?.excluded_interest_ids?.length) {
      exclusions.interests = body.targeting.excluded_interest_ids;
    }
    if (body.targeting?.excluded_audience_id) {
      exclusions.custom_audiences = [{ id: body.targeting.excluded_audience_id }];
    }
    if (exclusions.interests || exclusions.custom_audiences) {
      targetingSpec.exclusions = exclusions;
    }
    // Meta replaced targeting_optimization (removed 2024) with the new
    // targeting_automation.advantage_audience flag and made it MANDATORY in
    // late 2024.
    //
    // Caveat: Advantage audience CANNOT coexist with narrow age caps —
    // Meta rejects ad sets where advantage_audience=1 AND age_max < 65
    // (the recent error is "Maximum age is below threshold"). Auto-detect
    // user intent:
    //   - If user narrowed age (max < 65 or min > 18) → strict targeting,
    //     turn Advantage OFF so their age cap is respected as a hard limit.
    //   - Otherwise (default 18-65) → Advantage ON (Meta's recommended).
    //   - Explicit "targeting_expansion=false" from UI overrides to OFF.
    const userNarrowedAge =
      (body.targeting?.age_max ?? 65) < 65 ||
      (body.targeting?.age_min ?? 18) > 18;
    const advantageAudience =
      body.targeting?.targeting_expansion === false || userNarrowedAge ? 0 : 1;
    targetingSpec.targeting_automation = { advantage_audience: advantageAudience };

    // Pick optimization goal per objective. CTW campaigns now ride on
    // OUTCOME_TRAFFIC + wa.me link (no destination_type=WHATSAPP, no
    // WABA-Page linkage requirement), so LINK_CLICKS is the right goal.
    const optimizationGoal =
      /OUTCOME_LEADS/i.test(body.objective) ? "LEAD_GENERATION" :
      /OUTCOME_SALES/i.test(body.objective) ? "OFFSITE_CONVERSIONS" :
      /OUTCOME_AWARENESS/i.test(body.objective) ? "REACH" :
      /OUTCOME_ENGAGEMENT/i.test(body.objective) ? "POST_ENGAGEMENT" :
      "LINK_CLICKS"; // default for OUTCOME_TRAFFIC

    // Step 2: Ad Set — with auto-retry for Meta's deprecated-interest swap.
    // If Meta rejects with "Some detailed targeting options have been
    // combined", it embeds the deprecated→alternative ID mapping in the
    // error message. We parse it, swap the IDs in flexible_spec, and retry
    // once. This catches the common Meta-side interest deprecation churn
    // without making users find the new names manually.
    lastStep = "ad_set";
    const tryCreateAdSet = () => createAdSet(creds, {
      name: `${body.name} · Ad Set`,
      campaignId: campaign.id,
      dailyBudgetPaise: paise,
      billingEvent: "IMPRESSIONS",
      optimizationGoal,
      targetingSpec,
      destinationType: body.destination_type,
      pageId: body.creative.page_id,
      startTime: body.start_time,
      endTime: body.end_time,
      status: "PAUSED",
    });

    let adSet: { id: string };
    try {
      adSet = await tryCreateAdSet();
    } catch (firstErr) {
      const errMsg = firstErr instanceof Error ? firstErr.message : String(firstErr);
      // Meta error format embeds alternatives as JSON in the message:
      //   "...Relevant alternative options: [{...,"alternative_interest_id":"X",
      //    "deprecated_interest_id":"Y"}]"
      const jsonMatch = errMsg.match(/\[\s*\{[\s\S]*?\}\s*\]/);
      const swap: Record<string, { id: string; name?: string }> = {};
      if (jsonMatch) {
        try {
          const list = JSON.parse(jsonMatch[0]) as Array<{
            deprecated_interest_id?: string;
            alternative_interest_id?: string;
            alternative_interest_name?: string;
          }>;
          for (const m of list) {
            if (m.deprecated_interest_id && m.alternative_interest_id) {
              swap[m.deprecated_interest_id] = {
                id: m.alternative_interest_id,
                name: m.alternative_interest_name,
              };
            }
          }
        } catch { /* not JSON-parseable, fall through */ }
      }
      if (Object.keys(swap).length > 0 && targetingSpec.flexible_spec?.length) {
        // Apply the swap, then retry once
        targetingSpec.flexible_spec = targetingSpec.flexible_spec.map((g) => ({
          ...g,
          interests: g.interests?.map((i) => swap[i.id] ?? i),
        }));
        console.log("[ads] retrying ad set creation with swapped interests:", swap);
        adSet = await tryCreateAdSet();
      } else {
        throw firstErr;
      }
    }
    adSetId = adSet.id;

    // Step 3: Ad Creative
    lastStep = "creative";
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
    lastStep = "ad";
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
    // Prefix which step failed so the user knows WHICH Meta call was rejected.
    const stepLabel = {
      campaign:  "Campaign creation",
      ad_set:    "Ad Set creation",
      creative:  "Ad Creative (image/text + Page link)",
      ad:        "Ad publish",
      init:      "Setup",
    }[lastStep as "campaign" | "ad_set" | "creative" | "ad" | "init"] ?? lastStep;
    return c.json({ error: `${stepLabel} failed — ${err.error}`, step: lastStep, meta: err.meta }, 400);
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

/** Search Meta interests (advanced targeting). Returns interest IDs with
 *  audience size estimates so users pick segments large enough to deliver. */
app.get("/ads/targeting/interests", async (c) => {
  const creds = await getCreds(c.var.userId);
  const q = c.req.query("q") ?? "";

  if (!creds) {
    // Demo fallback list — popular Indian SMB interests with realistic
    // audience-size buckets. Lets the UI render before connection.
    const DEMO: Array<{ id: string; name: string; audience_size_lower_bound?: number; audience_size_upper_bound?: number; topic?: string }> = [
      { id: "demo_1", name: "Cricket (sport)", audience_size_lower_bound: 380_000_000, audience_size_upper_bound: 450_000_000, topic: "Sports" },
      { id: "demo_2", name: "Bollywood", audience_size_lower_bound: 220_000_000, audience_size_upper_bound: 260_000_000, topic: "Entertainment" },
      { id: "demo_3", name: "Online shopping", audience_size_lower_bound: 180_000_000, audience_size_upper_bound: 220_000_000, topic: "Shopping" },
      { id: "demo_4", name: "Diwali", audience_size_lower_bound: 95_000_000, audience_size_upper_bound: 120_000_000, topic: "Festivals" },
      { id: "demo_5", name: "Small business owners", audience_size_lower_bound: 12_000_000, audience_size_upper_bound: 18_000_000, topic: "Business" },
      { id: "demo_6", name: "WhatsApp Business", audience_size_lower_bound: 8_000_000, audience_size_upper_bound: 14_000_000, topic: "Apps" },
    ];
    const filtered = q ? DEMO.filter((i) => i.name.toLowerCase().includes(q.toLowerCase())) : DEMO;
    return c.json({ interests: filtered, demo: true });
  }

  try {
    const interests = q.trim()
      ? await interestSearch(creds, q)
      : await browseTargetingCategories(creds, ["interests"]);
    return c.json({ interests, demo: false });
  } catch (e) {
    const err = onApiError(e);
    return c.json({ error: err.error, interests: [] }, 200);
  }
});

/** Real reach/results estimate from Meta — called as the user changes
 *  budget / targeting in the wizard preview. */
app.post("/ads/estimate", async (c) => {
  const creds = await getCreds(c.var.userId);
  const body = await c.req.json<{
    objective: string;
    destination_type?: "WHATSAPP" | "MESSENGER" | "WEBSITE" | "ON_AD";
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
    // Same hierarchy rule as the create flow — Meta rejects overlapping geos.
    const geo: NonNullable<TargetingSpec["geo_locations"]> = {};
    const cities = body.targeting?.city_keys?.length
      ? body.targeting.city_keys.map((k) => ({ key: k, radius: 40, distance_unit: "kilometer" as const }))
      : null;
    const regions = body.targeting?.region_keys?.length
      ? body.targeting.region_keys.map((k) => ({ key: k }))
      : null;
    if (cities) geo.cities = cities;
    if (regions) geo.regions = regions;
    if (!cities && !regions) geo.countries = body.targeting?.country_codes ?? ["IN"];

    const targetingSpec: TargetingSpec = {
      geo_locations: geo,
      age_min: body.targeting?.age_min ?? 18,
      age_max: body.targeting?.age_max ?? 65,
    };
    if (body.targeting?.audience_id) targetingSpec.custom_audiences = [{ id: body.targeting.audience_id }];

    const optimizationGoal =
      /OUTCOME_LEADS/i.test(body.objective) ? "LEAD_GENERATION" :
      /OUTCOME_ENGAGEMENT/i.test(body.objective) ? "POST_ENGAGEMENT" :
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

/** Pre-launch diagnostic — runs every check we know about in parallel so the
 *  user sees a single checklist of what's missing instead of hitting each
 *  validation error one-by-one when they click Launch. */
app.get("/ads/preflight", async (c) => {
  const creds = await getCreds(c.var.userId);
  if (!creds) {
    return c.json({
      ok: false,
      checks: [{ id: "connection", status: "fail", label: "Meta Ads connection", message: "Connect Meta Ads first (the Connect button on /app/ads)" }],
    });
  }

  type Check = { id: string; status: "pass" | "warn" | "fail"; label: string; message: string; fixUrl?: string };
  const checks: Check[] = [];

  // 1) Ad account is valid + has currency
  try {
    const acc = await verifyAdAccount(creds);
    if (acc.account_status === 1) {
      checks.push({ id: "ad_account", status: "pass", label: "Ad account active", message: `${acc.name} (${acc.currency})` });
    } else {
      checks.push({ id: "ad_account", status: "fail", label: "Ad account disabled", message: `Status code ${acc.account_status} — visit Ads Manager to resolve`, fixUrl: "https://adsmanager.facebook.com" });
    }
  } catch (e) {
    const err = onApiError(e);
    checks.push({ id: "ad_account", status: "fail", label: "Ad account check failed", message: err.error });
  }

  // 2) At least one Page available (and ideally with WhatsApp business linked)
  try {
    const pages = await listPages(creds);
    if (pages.length === 0) {
      checks.push({
        id: "pages",
        status: "fail",
        label: "Facebook Page",
        message: "No Pages found. Create a Page and assign it to your System User with 'Manage Page' permission.",
        fixUrl: "https://www.facebook.com/pages/create",
      });
    } else {
      checks.push({
        id: "pages",
        status: "pass",
        label: "Facebook Pages",
        message: `${pages.length} page${pages.length === 1 ? "" : "s"} available: ${pages.slice(0, 3).map((p) => p.name).join(", ")}${pages.length > 3 ? "…" : ""}`,
      });
    }
  } catch (e) {
    const err = onApiError(e);
    checks.push({ id: "pages", status: "fail", label: "Pages check failed", message: err.error + " — token probably missing 'pages_show_list' scope" });
  }

  // 3) Token scopes — best-effort via /me/permissions
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/me/permissions`, {
      headers: { Authorization: `Bearer ${creds.accessToken}` },
    });
    const body = await r.json().catch(() => ({}));
    const granted = new Set<string>((body.data ?? [])
      .filter((p: { status: string }) => p.status === "granted")
      .map((p: { permission: string }) => p.permission));
    const required = ["ads_management", "ads_read", "business_management", "pages_show_list", "pages_manage_ads"];
    const missing = required.filter((x) => !granted.has(x));
    if (missing.length === 0) {
      checks.push({ id: "scopes", status: "pass", label: "Token scopes", message: "All required permissions granted" });
    } else {
      checks.push({
        id: "scopes",
        status: "fail",
        label: "Token scopes incomplete",
        message: `Missing: ${missing.join(", ")} — regenerate the System User token with these scopes ticked`,
        fixUrl: "https://business.facebook.com/settings/system-users",
      });
    }
  } catch {
    checks.push({ id: "scopes", status: "warn", label: "Token scopes", message: "Couldn't verify scopes (Meta API blip) — try again" });
  }

  const ok = checks.every((c) => c.status === "pass");
  return c.json({ ok, checks });
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

/* ─────────── Single-campaign analytics (powers /app/ads/:id) ─────────── */

app.get("/ads/campaigns/:id/analytics", async (c) => {
  const id = c.req.param("id");
  const range = (c.req.query("range") as "last_7d" | "last_14d" | "last_30d" | "last_90d") ?? "last_30d";
  const creds = await getCreds(c.var.userId);

  if (!creds) return c.json(demoCampaignAnalytics(id), 200);

  try {
    // Run everything in parallel — even when Meta is slow, total wait is the
    // slowest single endpoint (usually ~1.5s for insights with breakdowns).
    const [campaign, totals, daily, byAgeGender, byPlatform, ads, perAd] = await Promise.all([
      // Campaign metadata
      adsFetchSafe(creds, `/${id}?fields=id,name,objective,status,effective_status,daily_budget,lifetime_budget,created_time,start_time,stop_time`),
      singleCampaignInsights(creds, id, range).catch(() => null),
      campaignTimeSeries(creds, id, range).catch(() => []),
      campaignBreakdown(creds, id, "age,gender", range).catch(() => []),
      campaignBreakdown(creds, id, "publisher_platform,platform_position", range).catch(() => []),
      listAdsInCampaign(creds, id).catch(() => []),
      adsInsights(creds, id, range).catch(() => []),
    ]);

    const adInsightsById = new Map(perAd.map((i) => [i.ad_id, i]));

    return c.json({
      demo: false,
      campaign: campaign ?? null,
      range,
      totals: shapeTotals(totals),
      daily: daily.map((d) => ({
        date: d.date_start,
        spend: Number(d.spend ?? 0),
        impressions: Number(d.impressions ?? 0),
        clicks: Number(d.clicks ?? 0),
        results: extractResults(d.actions),
      })),
      by_age_gender: byAgeGender.map((r) => ({
        age: r.age,
        gender: r.gender,
        spend: Number(r.spend ?? 0),
        impressions: Number(r.impressions ?? 0),
        clicks: Number(r.clicks ?? 0),
      })),
      by_placement: byPlatform.map((r) => ({
        platform: r.publisher_platform,
        position: r.platform_position,
        spend: Number(r.spend ?? 0),
        impressions: Number(r.impressions ?? 0),
        clicks: Number(r.clicks ?? 0),
      })),
      ads: ads.map((a) => {
        const ins = adInsightsById.get(a.id);
        return {
          id: a.id,
          name: a.name,
          status: a.status,
          effective_status: a.effective_status,
          adset_id: a.adset_id,
          created_time: a.created_time,
          spend: ins ? Number(ins.spend ?? 0) : 0,
          impressions: ins ? Number(ins.impressions ?? 0) : 0,
          clicks: ins ? Number(ins.clicks ?? 0) : 0,
          ctr: ins ? Number(ins.ctr ?? 0) : 0,
          cpc: ins ? Number(ins.cpc ?? 0) : 0,
          results: extractResults(ins?.actions),
        };
      }),
    });
  } catch (e) {
    const err = onApiError(e);
    return c.json({ ...demoCampaignAnalytics(id), error: err.error }, 200);
  }
});

/**
 * Ad-to-Sale ROAS Attribution.
 *
 * Joins:  ad spend → CTW clicks → WhatsApp conversations → deals won → UPI payments
 * Source: Meta CTW referral payload captured by webhooks.ts onto conversation
 *         rows (sourceAdId / ctwaClickId). All ads in the campaign roll up.
 *
 * The chain we return (camelCase keys from postgres-js → snaked client-side):
 *   spend_inr      — what Meta charged you
 *   clicks         — clicks on this campaign's ads (from Meta insights)
 *   ctw_chats      — unique conversations sourced from this campaign
 *   first_inbound  — count of conversations where customer actually messaged
 *                    (= ctw_chats in our model since we only create conv on inbound)
 *   contacts_warm  — distinct CTW-sourced contacts tagged warm or hot
 *   deals_open     — open deals attached to those conversations
 *   deals_won      — won deals attached
 *   revenue_inr    — SUM(deal.value) on won deals
 *   roas           — revenue / spend (Infinity-safe → returned as null when spend=0)
 *
 * Why first-touch (not multi-touch): MVP. Indian SMBs are running 1-2 active
 * campaigns at a time; complex attribution models would be over-engineering.
 */
app.get("/ads/campaigns/:id/attribution", async (c) => {
  const userId = c.var.userId;
  const campaignId = c.req.param("id");
  const range = (c.req.query("range") as "last_7d" | "last_14d" | "last_30d" | "last_90d") ?? "last_30d";

  const creds = await getCreds(userId);
  if (!creds) {
    return c.json({
      demo: true,
      spend_inr: 4_800, clicks: 612, ctw_chats: 184,
      contacts_warm: 142, deals_open: 28, deals_won: 9,
      revenue_inr: 13_500, roas: 2.81,
      headline: "Connect Meta Ads to see real attribution",
      ads_resolved: [],
    });
  }

  // 1) From Meta — campaign metadata + insights + the list of ad IDs that
  //    belong to this campaign (so we can match against conversation.source_ad_id)
  const [insights, ads] = await Promise.all([
    singleCampaignInsights(creds, campaignId, range).catch(() => null),
    listAdsInCampaign(creds, campaignId).catch(() => []),
  ]);
  const adIds: string[] = (ads ?? []).map((a: any) => String(a.id)).filter(Boolean);
  const spendInr = Number(insights?.spend ?? 0);
  const clicks = Number(insights?.clicks ?? 0);

  // 2) From our DB — pull all CTW-sourced conversations for this user whose
  //    source_ad_id matches one of the ad IDs in this campaign.
  //    If Meta returned no ads, the IN(...) would be empty — short-circuit.
  if (adIds.length === 0) {
    return c.json({
      demo: false, spend_inr: spendInr, clicks,
      ctw_chats: 0, contacts_warm: 0, deals_open: 0, deals_won: 0,
      revenue_inr: 0, roas: spendInr > 0 ? 0 : null,
      headline: insights?.campaign_name ?? null,
      ads_resolved: [],
    });
  }

  const ctwConvs = await db
    .select({
      id: conversation.id,
      contactId: conversation.contactId,
      sourceAdId: conversation.sourceAdId,
      headline: conversation.sourceHeadline,
    })
    .from(conversation)
    .where(and(
      eq(conversation.ownerId, userId),
      inArray(conversation.sourceAdId, adIds),
    ));

  const convIds = ctwConvs.map((r) => r.id);
  const contactIds = [...new Set(ctwConvs.map((r) => r.contactId))];

  // 3) Pull deals on those conversations (single query)
  const dealsForConvs = convIds.length === 0 ? [] : await db
    .select({ stage: deal.stage, value: deal.value })
    .from(deal)
    .where(and(eq(deal.ownerId, userId), inArray(deal.conversationId, convIds)));

  // 4) Pull warm/hot contact count
  const warmAgg = contactIds.length === 0 ? [{ n: 0 }] : await db
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(contact)
    .where(and(
      eq(contact.ownerId, userId),
      inArray(contact.id, contactIds),
      sql`${contact.tag} IN ('warm', 'hot')`,
    ));

  // 5) Roll up
  const dealsOpen = dealsForConvs.filter((d) => d.stage !== "won" && d.stage !== "lost").length;
  const dealsWon = dealsForConvs.filter((d) => d.stage === "won").length;
  const revenueInr = dealsForConvs
    .filter((d) => d.stage === "won")
    .reduce((a, d) => a + Number(d.value ?? 0), 0);
  const roas = spendInr > 0 ? Math.round((revenueInr / spendInr) * 100) / 100 : null;

  return c.json({
    demo: false,
    spend_inr: spendInr,
    clicks,
    ctw_chats: ctwConvs.length,
    contacts_warm: warmAgg[0]?.n ?? 0,
    deals_open: dealsOpen,
    deals_won: dealsWon,
    revenue_inr: revenueInr,
    roas,
    headline: insights?.campaign_name ?? null,
    ads_resolved: adIds.length,
  });
});

async function adsFetchSafe(creds: AdsCredentials, path: string) {
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0${path}`, {
      headers: { Authorization: `Bearer ${creds.accessToken}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function extractResults(actions?: Array<{ action_type: string; value: string }> | null): number {
  if (!actions) return 0;
  const ctw = actions.find((a) => a.action_type === "onsite_conversion.messaging_conversation_started_7d");
  const purchase = actions.find((a) => a.action_type === "purchase");
  const leads = actions.find((a) => a.action_type === "lead");
  const linkClicks = actions.find((a) => a.action_type === "link_click");
  return Number(ctw?.value ?? purchase?.value ?? leads?.value ?? linkClicks?.value ?? 0);
}

function shapeTotals(t: (Awaited<ReturnType<typeof singleCampaignInsights>>) | null) {
  if (!t) return { spend: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0, cpm: 0, reach: 0, frequency: 0, results: 0 };
  return {
    spend: Number(t.spend ?? 0),
    impressions: Number(t.impressions ?? 0),
    clicks: Number(t.clicks ?? 0),
    ctr: Number(t.ctr ?? 0),
    cpc: Number(t.cpc ?? 0),
    cpm: Number(t.cpm ?? 0),
    reach: Number(t.reach ?? 0),
    frequency: Number(t.frequency ?? 0),
    results: extractResults(t.actions),
  };
}

function demoCampaignAnalytics(id: string) {
  const days = 14;
  const daily = Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400_000);
    const base = 800 + Math.random() * 1200;
    const ctr = 2 + Math.random() * 1.5;
    const impressions = Math.round(base * 100);
    const clicks = Math.round(impressions * (ctr / 100));
    return {
      date: d.toISOString().slice(0, 10),
      spend: Math.round(base),
      impressions,
      clicks,
      results: Math.round(clicks * 0.075),
    };
  });
  const sum = (k: "spend" | "impressions" | "clicks" | "results") => daily.reduce((a, b) => a + b[k], 0);
  return {
    demo: true,
    campaign: { id, name: "Demo · Diwali CTW", objective: "OUTCOME_TRAFFIC", status: "ACTIVE", effective_status: "ACTIVE", daily_budget: "100000", created_time: new Date(Date.now() - days * 86400_000).toISOString() },
    range: "last_30d",
    totals: {
      spend: sum("spend"),
      impressions: sum("impressions"),
      clicks: sum("clicks"),
      ctr: (sum("clicks") / Math.max(1, sum("impressions"))) * 100,
      cpc: sum("spend") / Math.max(1, sum("clicks")),
      cpm: (sum("spend") / Math.max(1, sum("impressions"))) * 1000,
      reach: Math.round(sum("impressions") * 0.45),
      frequency: sum("impressions") / Math.max(1, Math.round(sum("impressions") * 0.45)),
      results: sum("results"),
    },
    daily,
    by_age_gender: [
      { age: "18-24", gender: "female", spend: 2100, impressions: 18000, clicks: 590 },
      { age: "18-24", gender: "male",   spend: 1900, impressions: 16500, clicks: 480 },
      { age: "25-34", gender: "female", spend: 3200, impressions: 28000, clicks: 1020 },
      { age: "25-34", gender: "male",   spend: 2800, impressions: 24500, clicks: 880 },
      { age: "35-44", gender: "female", spend: 1500, impressions: 13000, clicks: 410 },
      { age: "35-44", gender: "male",   spend: 1300, impressions: 11500, clicks: 350 },
      { age: "45-54", gender: "female", spend: 700,  impressions: 6000,  clicks: 170 },
      { age: "45-54", gender: "male",   spend: 600,  impressions: 5200,  clicks: 140 },
    ],
    by_placement: [
      { platform: "instagram", position: "stream",       spend: 4200, impressions: 38000, clicks: 1350 },
      { platform: "instagram", position: "story",        spend: 2800, impressions: 25000, clicks: 820 },
      { platform: "instagram", position: "reels",        spend: 1900, impressions: 17500, clicks: 610 },
      { platform: "facebook",  position: "feed",         spend: 2400, impressions: 21000, clicks: 740 },
      { platform: "facebook",  position: "marketplace",  spend: 800,  impressions: 7200,  clicks: 220 },
    ],
    ads: [
      { id: "demo_ad_1", name: "Diwali_offer_v3", status: "ACTIVE",  effective_status: "ACTIVE", adset_id: "demo_as_1", created_time: new Date().toISOString(), spend: 7400, impressions: 64500, clicks: 2200, ctr: 3.41, cpc: 3.36, results: 165 },
      { id: "demo_ad_2", name: "Diwali_offer_v1", status: "PAUSED",  effective_status: "PAUSED", adset_id: "demo_as_1", created_time: new Date().toISOString(), spend: 3100, impressions: 28500, clicks: 880, ctr: 3.09, cpc: 3.52, results: 60 },
    ],
  };
}

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

/**
 * Create a Custom Audience and optionally upload CRM contacts into it.
 *
 * Body:
 *   - name: string (required)
 *   - description?: string
 *   - source: "crm" | "empty"
 *   - filter?: { tags?: string[] }   // when source=crm — narrow to specific tags
 *
 * For source="crm", we fetch the user's contacts (filtered if specified),
 * normalize + SHA-256 hash each phone number (Meta's required format), and
 * batch-upload to the audience. Audience appears in Meta in ~10 minutes once
 * Meta finishes matching the hashes against their user graph.
 */
app.post("/ads/audiences", async (c) => {
  const creds = await getCreds(c.var.userId);
  if (!creds) return c.json({ error: "Connect Meta Ads first" }, 400);

  const body = await c.req.json<{
    name: string;
    description?: string;
    source: "crm" | "empty";
    filter?: { tags?: string[] };
  }>();

  if (!body.name?.trim()) return c.json({ error: "name required" }, 400);
  if (body.source !== "crm" && body.source !== "empty") {
    return c.json({ error: "source must be 'crm' or 'empty'" }, 400);
  }

  // Step 1 — create the audience in Meta
  let audience: { id: string };
  try {
    audience = await createCustomAudience(creds, {
      name: body.name.trim(),
      description: body.description ?? (body.source === "crm" ? "Created from AddisonX CRM contacts" : "Created from AddisonX"),
    });
  } catch (e) {
    const err = onApiError(e);
    return c.json({ error: `Audience creation failed — ${err.error}` }, 400);
  }

  // If empty, we're done.
  if (body.source === "empty") {
    return c.json({ ok: true, id: audience.id, name: body.name.trim(), uploaded: 0 });
  }

  // Step 2 — fetch matching contacts from workspace
  const whereClauses = [eq(contact.ownerId, c.var.userId)];
  if (body.filter?.tags?.length) {
    whereClauses.push(inArray(contact.tag, body.filter.tags));
  }
  const contacts = await db
    .select({ phone: contact.phone, email: contact.email })
    .from(contact)
    .where(and(...whereClauses))
    .limit(10_000); // Meta caps at 10k per session

  // Step 3 — normalize + hash. Phones in E.164 (no spaces/dashes/+), emails lowercase.
  const phones = contacts
    .map((r) => normalizePhone(r.phone))
    .filter((p): p is string => Boolean(p));
  const hashedPhones = phones.map((p) => sha256(p));

  if (hashedPhones.length === 0) {
    return c.json({
      ok: true,
      id: audience.id,
      name: body.name.trim(),
      uploaded: 0,
      note: "Audience created but no valid phone numbers found in your CRM. Add contacts with phone numbers and retry, or upload manually in Meta.",
    });
  }

  // Step 4 — batch-upload (Meta accepts up to 10k per call)
  try {
    const result = await addUsersToAudience(creds, audience.id, {
      schema: ["PHONE"],
      data: hashedPhones.map((h) => [h]),
    });
    return c.json({
      ok: true,
      id: audience.id,
      name: body.name.trim(),
      uploaded: result.num_received ?? hashedPhones.length,
      note: "Meta is matching hashes against their user graph — audience size will update in ~10 min.",
    });
  } catch (e) {
    const err = onApiError(e);
    // Audience was created but user upload failed. Don't roll back — user can
    // retry by adding more contacts or uploading via Meta UI.
    return c.json({
      ok: true,
      id: audience.id,
      name: body.name.trim(),
      uploaded: 0,
      warning: `Audience created but user upload failed: ${err.error}`,
    });
  }
});

/** Normalize a phone string to E.164-without-plus form so SHA-256 matches
 *  Meta's expected format. Strips spaces / dashes / parentheses. */
function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length < 8) return null;
  // For Indian numbers without country code, prepend 91. (E.164 expects country code.)
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `91${digits}`;
  return digits;
}

function sha256(s: string): string {
  return createHash("sha256").update(s.toLowerCase().trim()).digest("hex");
}

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
