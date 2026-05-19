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

export { AdsApiError };
