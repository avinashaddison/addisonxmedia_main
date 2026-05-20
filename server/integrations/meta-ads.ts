// Meta Marketing API wrapper.
// Docs: https://developers.facebook.com/docs/marketing-apis/overview
//
// Each function takes credentials so the module is stateless. The route layer
// (server/routes/ads.ts) decrypts the stored ad_access_token before calling.
//
// Token requirements: a System User access token from Business Manager with
// the `ads_management`, `ads_read`, and `business_management` scopes. Token
// must belong to a user/system user that's an admin on the target ad account.

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export type AdsCredentials = {
  accessToken: string;
  adAccountId: string; // raw numeric id; we prepend "act_" when calling Graph
};

class AdsApiError extends Error {
  status: number;
  meta: unknown;
  constructor(message: string, status: number, meta?: unknown) {
    super(message);
    this.status = status;
    this.meta = meta;
  }
}

async function adsFetch<T>(path: string, init: RequestInit & { token: string }): Promise<T> {
  const url = path.startsWith("http") ? path : `${GRAPH_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${init.token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const msg = body?.error?.message ?? `Meta Ads API ${res.status}`;
    throw new AdsApiError(msg, res.status, body);
  }
  return body as T;
}

const actId = (id: string) => (id.startsWith("act_") ? id : `act_${id}`);

/* ─────────── Connection / account verification ─────────── */

export async function verifyAdAccount(creds: AdsCredentials): Promise<{
  id: string;
  name: string;
  currency: string;
  account_status: number;
  business?: { id: string; name: string };
}> {
  return adsFetch(
    `/${actId(creds.adAccountId)}?fields=id,name,currency,account_status,business`,
    { method: "GET", token: creds.accessToken }
  );
}

/* ─────────── Campaigns ─────────── */

export type MetaCampaign = {
  id: string;
  name: string;
  objective: string;
  status: "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED";
  effective_status: string;
  daily_budget?: string;
  lifetime_budget?: string;
  created_time: string;
  start_time?: string;
  stop_time?: string;
};

export async function listCampaigns(creds: AdsCredentials, limit = 100): Promise<MetaCampaign[]> {
  const res = await adsFetch<{ data: MetaCampaign[] }>(
    `/${actId(creds.adAccountId)}/campaigns?fields=id,name,objective,status,effective_status,daily_budget,lifetime_budget,created_time,start_time,stop_time&limit=${limit}`,
    { method: "GET", token: creds.accessToken }
  );
  return res.data ?? [];
}

export async function createCampaign(
  creds: AdsCredentials,
  body: {
    name: string;
    objective: string; // e.g. "OUTCOME_ENGAGEMENT", "OUTCOME_SALES", "OUTCOME_LEADS", "MESSAGES"
    status?: "ACTIVE" | "PAUSED";
    special_ad_categories?: string[];
    daily_budget?: number; // in account currency cents (e.g. paise for INR)
  }
): Promise<{ id: string }> {
  const payload: Record<string, unknown> = {
    name: body.name,
    objective: body.objective,
    status: body.status ?? "PAUSED",
    special_ad_categories: body.special_ad_categories ?? [],
    // CBO: budget + bid_strategy live at the Campaign level so the Ad Set
    // doesn't need to specify them. LOWEST_COST_WITHOUT_CAP is the auto-bid
    // strategy — Meta optimizes for the most results at the lowest cost.
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
  };
  if (body.daily_budget) payload.daily_budget = body.daily_budget;
  return adsFetch(`/${actId(creds.adAccountId)}/campaigns`, {
    method: "POST",
    token: creds.accessToken,
    body: JSON.stringify(payload),
  });
}

export async function updateCampaign(
  creds: AdsCredentials,
  campaignId: string,
  body: { status?: "ACTIVE" | "PAUSED"; daily_budget?: number; name?: string }
): Promise<{ success: boolean }> {
  return adsFetch(`/${campaignId}`, {
    method: "POST",
    token: creds.accessToken,
    body: JSON.stringify(body),
  });
}

/* ─────────── Insights (performance data) ─────────── */

export type MetaInsights = {
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  cpc: string;
  reach?: string;
  actions?: Array<{ action_type: string; value: string }>;
};

/** Aggregate insights for the whole ad account over the last N days. */
export async function accountInsights(
  creds: AdsCredentials,
  datePreset: "today" | "yesterday" | "last_7d" | "last_14d" | "last_30d" = "last_7d"
): Promise<MetaInsights> {
  const res = await adsFetch<{ data: MetaInsights[] }>(
    `/${actId(creds.adAccountId)}/insights?fields=spend,impressions,clicks,ctr,cpc,reach,actions&date_preset=${datePreset}`,
    { method: "GET", token: creds.accessToken }
  );
  return res.data?.[0] ?? { spend: "0", impressions: "0", clicks: "0", ctr: "0", cpc: "0" };
}

/** Per-campaign insights — joined back to campaign rows in the route layer. */
export async function campaignInsights(
  creds: AdsCredentials,
  datePreset: "today" | "yesterday" | "last_7d" | "last_14d" | "last_30d" = "last_7d"
): Promise<Array<MetaInsights & { campaign_id: string }>> {
  const res = await adsFetch<{ data: Array<MetaInsights & { campaign_id: string }> }>(
    `/${actId(creds.adAccountId)}/insights?fields=campaign_id,spend,impressions,clicks,ctr,cpc,actions&level=campaign&date_preset=${datePreset}&limit=500`,
    { method: "GET", token: creds.accessToken }
  );
  return res.data ?? [];
}

/** Single-campaign full insights (totals over the date range). */
export async function singleCampaignInsights(
  creds: AdsCredentials,
  campaignId: string,
  datePreset: "today" | "yesterday" | "last_7d" | "last_14d" | "last_30d" | "last_90d" = "last_30d"
): Promise<MetaInsights & { reach?: string; frequency?: string; cpm?: string }> {
  const res = await adsFetch<{ data: Array<MetaInsights & { reach?: string; frequency?: string; cpm?: string }> }>(
    `/${campaignId}/insights?fields=spend,impressions,clicks,ctr,cpc,cpm,reach,frequency,actions&date_preset=${datePreset}`,
    { method: "GET", token: creds.accessToken }
  );
  return res.data?.[0] ?? { spend: "0", impressions: "0", clicks: "0", ctr: "0", cpc: "0" };
}

/** Daily time-series for a campaign. */
export async function campaignTimeSeries(
  creds: AdsCredentials,
  campaignId: string,
  datePreset: "last_7d" | "last_14d" | "last_30d" | "last_90d" = "last_30d"
): Promise<Array<{ date_start: string; spend: string; impressions: string; clicks: string; ctr?: string; cpc?: string; actions?: Array<{ action_type: string; value: string }> }>> {
  const res = await adsFetch<{ data: Array<{ date_start: string; spend: string; impressions: string; clicks: string; ctr?: string; cpc?: string; actions?: Array<{ action_type: string; value: string }> }> }>(
    `/${campaignId}/insights?fields=spend,impressions,clicks,ctr,cpc,actions&date_preset=${datePreset}&time_increment=1&limit=200`,
    { method: "GET", token: creds.accessToken }
  );
  return res.data ?? [];
}

/** Breakdown by a Meta dimension (age, gender, age,gender, publisher_platform, etc.). */
export async function campaignBreakdown(
  creds: AdsCredentials,
  campaignId: string,
  breakdowns: string,
  datePreset: "last_7d" | "last_14d" | "last_30d" | "last_90d" = "last_30d"
): Promise<Array<Record<string, string> & { spend: string; impressions: string; clicks: string }>> {
  const params = new URLSearchParams({
    fields: "spend,impressions,clicks,ctr,cpc,actions",
    breakdowns,
    date_preset: datePreset,
    limit: "200",
  });
  const res = await adsFetch<{ data: Array<Record<string, string> & { spend: string; impressions: string; clicks: string }> }>(
    `/${campaignId}/insights?${params}`,
    { method: "GET", token: creds.accessToken }
  );
  return res.data ?? [];
}

/** List ads under a campaign (with their ad sets + minimal creative info). */
export async function listAdsInCampaign(
  creds: AdsCredentials,
  campaignId: string
): Promise<Array<{ id: string; name: string; status: string; effective_status: string; adset_id: string; created_time: string }>> {
  const res = await adsFetch<{ data: Array<{ id: string; name: string; status: string; effective_status: string; adset_id: string; created_time: string }> }>(
    `/${campaignId}/ads?fields=id,name,status,effective_status,adset_id,created_time&limit=50`,
    { method: "GET", token: creds.accessToken }
  );
  return res.data ?? [];
}

/** Per-ad insights (for the ads breakdown). */
export async function adsInsights(
  creds: AdsCredentials,
  campaignId: string,
  datePreset: "last_7d" | "last_14d" | "last_30d" | "last_90d" = "last_30d"
): Promise<Array<MetaInsights & { ad_id: string }>> {
  const res = await adsFetch<{ data: Array<MetaInsights & { ad_id: string }> }>(
    `/${campaignId}/insights?fields=ad_id,spend,impressions,clicks,ctr,cpc,actions&level=ad&date_preset=${datePreset}&limit=200`,
    { method: "GET", token: creds.accessToken }
  );
  return res.data ?? [];
}

/* ─────────── Audiences ─────────── */

export type MetaCustomAudience = {
  id: string;
  name: string;
  subtype: string; // CUSTOM | LOOKALIKE | WEBSITE | etc.
  approximate_count_lower_bound?: number;
  approximate_count_upper_bound?: number;
  description?: string;
  delivery_status?: { code: number; description: string };
};

export async function listCustomAudiences(creds: AdsCredentials): Promise<MetaCustomAudience[]> {
  const res = await adsFetch<{ data: MetaCustomAudience[] }>(
    `/${actId(creds.adAccountId)}/customaudiences?fields=id,name,subtype,approximate_count_lower_bound,approximate_count_upper_bound,description,delivery_status&limit=100`,
    { method: "GET", token: creds.accessToken }
  );
  return res.data ?? [];
}

/* ─────────── Targeting search (real geo / interest IDs) ─────────── */

export type MetaGeoResult = {
  key: string;
  name: string;
  type: string; // country | region | city | zip | etc.
  country_code?: string;
  country_name?: string;
  region?: string;
  region_id?: number;
  supports_region?: boolean;
};

/** Search Meta's targeting taxonomy. For geo: returns {key, name, type}.
 *  For interest / adTargetingCategory: returns {id, name, audience_size, path}. */
export async function targetingSearch(
  creds: AdsCredentials,
  q: string,
  locationTypes: string[] = ["country", "region", "city"]
): Promise<MetaGeoResult[]> {
  const params = new URLSearchParams({
    type: "adgeolocation",
    q,
    location_types: JSON.stringify(locationTypes),
    limit: "20",
  });
  const res = await adsFetch<{ data: MetaGeoResult[] }>(
    `/search?${params}`,
    { method: "GET", token: creds.accessToken }
  );
  return res.data ?? [];
}

/** Search Meta's interest catalog. Returns interests with audience size
 *  estimates so the user can pick big-enough segments to be useful. */
export type MetaInterest = {
  id: string;
  name: string;
  audience_size_lower_bound?: number;
  audience_size_upper_bound?: number;
  path?: string[];
  topic?: string;
};

export async function interestSearch(creds: AdsCredentials, q: string): Promise<MetaInterest[]> {
  const params = new URLSearchParams({
    type: "adinterest",
    q,
    limit: "25",
  });
  const res = await adsFetch<{ data: MetaInterest[] }>(
    `/search?${params}`,
    { method: "GET", token: creds.accessToken }
  );
  return res.data ?? [];
}

/** Browse Meta's targeting categories (behaviors, demographics, interests
 *  organized hierarchically). Used for "Suggested" tab when no query. */
export async function browseTargetingCategories(creds: AdsCredentials, classNames: string[] = ["interests", "behaviors"]): Promise<MetaInterest[]> {
  const params = new URLSearchParams({
    type: "adTargetingCategory",
    class: JSON.stringify(classNames),
    limit: "50",
  });
  const res = await adsFetch<{ data: MetaInterest[] }>(
    `/search?${params}`,
    { method: "GET", token: creds.accessToken }
  );
  return res.data ?? [];
}

/* ─────────── Delivery estimate (real reach numbers) ─────────── */

export type DeliveryEstimate = {
  daily_outcomes_curve: Array<{ spend: number; reach: number; impressions: number; actions: number }>;
  estimate_dau: number;
  estimate_mau_lower_bound: number;
  estimate_mau_upper_bound: number;
  estimate_ready: boolean;
};

export type TargetingSpec = {
  geo_locations?: {
    countries?: string[];
    cities?: Array<{ key: string; radius?: number; distance_unit?: "kilometer" | "mile" }>;
    regions?: Array<{ key: string }>;
  };
  age_min?: number;
  age_max?: number;
  genders?: number[]; // 1 = male, 2 = female; omit for all
  locales?: number[]; // Meta locale IDs
  custom_audiences?: Array<{ id: string }>;
  publisher_platforms?: string[]; // ["facebook", "instagram", "audience_network", "messenger"]
  facebook_positions?: string[];
  instagram_positions?: string[];
  /** Flexible_spec for interest/behavior targeting. Each inner object is
   *  an AND group — multiple groups are OR'd together.
   *  e.g. flexible_spec: [{ interests: [{id, name}], behaviors: [{id, name}] }] */
  flexible_spec?: Array<{
    interests?: Array<{ id: string; name?: string }>;
    behaviors?: Array<{ id: string; name?: string }>;
    work_employers?: Array<{ id: string; name?: string }>;
    work_positions?: Array<{ id: string; name?: string }>;
    education_statuses?: number[];
    relationship_statuses?: number[];
  }>;
  /** Excluded interests / audiences. */
  exclusions?: {
    interests?: Array<{ id: string; name?: string }>;
    behaviors?: Array<{ id: string; name?: string }>;
    custom_audiences?: Array<{ id: string }>;
  };
  /** DEPRECATED — Meta removed this field in 2024. Advantage detailed
   *  targeting expansion is now always applied to every ad set automatically.
   *  Kept here as a type-only marker; the route layer no longer sets it. */
  targeting_optimization?: string;
  /** Replaced targeting_optimization in late 2024. Meta now REQUIRES this
   *  explicitly — sending an ad set without it fails with "Advantage
   *  audience flag required". advantage_audience: 1 = expansion on (Meta's
   *  recommended default), 0 = off (audience locked to exact criteria). */
  targeting_automation?: {
    advantage_audience: 0 | 1;
  };
};

/** Real reach + impressions estimate from Meta. Updates as the user changes
 *  budget / audience / location in the wizard preview. */
export async function deliveryEstimate(
  creds: AdsCredentials,
  params: {
    targetingSpec: TargetingSpec;
    optimizationGoal: string;
    dailyBudgetPaise?: number;
    currency?: string;
  }
): Promise<DeliveryEstimate> {
  const qs = new URLSearchParams({
    targeting_spec: JSON.stringify(params.targetingSpec),
    optimization_goal: params.optimizationGoal,
  });
  if (params.dailyBudgetPaise) qs.set("daily_budget", String(params.dailyBudgetPaise));
  if (params.currency) qs.set("currency", params.currency);
  const res = await adsFetch<{ data: DeliveryEstimate[] }>(
    `/${actId(creds.adAccountId)}/delivery_estimate?${qs}`,
    { method: "GET", token: creds.accessToken }
  );
  return res.data?.[0] ?? {
    daily_outcomes_curve: [],
    estimate_dau: 0,
    estimate_mau_lower_bound: 0,
    estimate_mau_upper_bound: 0,
    estimate_ready: false,
  };
}

/* ─────────── Pages (needed for Ad creative — ads run from a Page) ─────────── */

export type MetaPage = {
  id: string;
  name: string;
  category?: string;
  access_token?: string;
  tasks?: string[];
};

/** Pages the authenticated user/system user can act on. */
export async function listPages(creds: AdsCredentials): Promise<MetaPage[]> {
  const res = await adsFetch<{ data: MetaPage[] }>(
    `/me/accounts?fields=id,name,category,tasks&limit=100`,
    { method: "GET", token: creds.accessToken }
  );
  return res.data ?? [];
}

/* ─────────── Ad Set (targeting + budget + schedule) ─────────── */

export type AdSetCreate = {
  name: string;
  campaignId: string;
  dailyBudgetPaise: number;
  billingEvent: "IMPRESSIONS" | "LINK_CLICKS";
  optimizationGoal: string;
  targetingSpec: TargetingSpec;
  destinationType?: "WHATSAPP" | "MESSENGER" | "WEBSITE" | "ON_AD";
  pageId?: string;
  startTime?: string; // ISO
  endTime?: string;   // ISO
  status?: "ACTIVE" | "PAUSED";
};

export async function createAdSet(creds: AdsCredentials, body: AdSetCreate): Promise<{ id: string }> {
  // Note: daily_budget + bid_strategy are NOT set here on purpose. With CBO
  // (Campaign Budget Optimization — the ODAX default), both live on the
  // Campaign and the Ad Set inherits. Setting them at the Ad Set level when
  // the Campaign already has them triggers Meta error
  // "Bid amount required for bid strategy provided".
  const payload: Record<string, unknown> = {
    name: body.name,
    campaign_id: body.campaignId,
    billing_event: body.billingEvent,
    optimization_goal: body.optimizationGoal,
    targeting: body.targetingSpec,
    status: body.status ?? "PAUSED",
  };
  if (body.destinationType) payload.destination_type = body.destinationType;
  if (body.pageId) payload.promoted_object = { page_id: body.pageId };
  if (body.startTime) payload.start_time = body.startTime;
  if (body.endTime) payload.end_time = body.endTime;

  return adsFetch(`/${actId(creds.adAccountId)}/adsets`, {
    method: "POST",
    token: creds.accessToken,
    body: JSON.stringify(payload),
  });
}

/* ─────────── Ad Creative (image + headline + body + CTA) ─────────── */

export type AdCreativeCreate = {
  name: string;
  pageId: string;
  imageUrl?: string;
  imageHash?: string;
  headline: string;
  body: string;
  linkUrl: string;
  ctaType?: string; // e.g. WHATSAPP_MESSAGE, LEARN_MORE, SHOP_NOW, SIGN_UP
};

export async function createAdCreative(creds: AdsCredentials, body: AdCreativeCreate): Promise<{ id: string }> {
  const linkData: Record<string, unknown> = {
    message: body.body,
    link: body.linkUrl,
    name: body.headline,
  };
  if (body.imageUrl) linkData.picture = body.imageUrl;
  if (body.imageHash) linkData.image_hash = body.imageHash;
  if (body.ctaType) linkData.call_to_action = { type: body.ctaType, value: { link: body.linkUrl } };

  return adsFetch(`/${actId(creds.adAccountId)}/adcreatives`, {
    method: "POST",
    token: creds.accessToken,
    body: JSON.stringify({
      name: body.name,
      object_story_spec: {
        page_id: body.pageId,
        link_data: linkData,
      },
    }),
  });
}

/* ─────────── Ad (links a creative to an ad set) ─────────── */

export async function createAd(
  creds: AdsCredentials,
  body: { name: string; adSetId: string; creativeId: string; status?: "ACTIVE" | "PAUSED" }
): Promise<{ id: string }> {
  return adsFetch(`/${actId(creds.adAccountId)}/ads`, {
    method: "POST",
    token: creds.accessToken,
    body: JSON.stringify({
      name: body.name,
      adset_id: body.adSetId,
      creative: { creative_id: body.creativeId },
      status: body.status ?? "PAUSED",
    }),
  });
}

/* ─────────── Cleanup (for rollback when a multi-step launch fails) ─────────── */

export async function deleteCampaign(creds: AdsCredentials, campaignId: string): Promise<void> {
  await adsFetch(`/${campaignId}`, { method: "DELETE", token: creds.accessToken });
}

export async function deleteAdSet(creds: AdsCredentials, adSetId: string): Promise<void> {
  await adsFetch(`/${adSetId}`, { method: "DELETE", token: creds.accessToken });
}

export { AdsApiError };
