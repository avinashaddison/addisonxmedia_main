// Thin fetch wrapper. Sends cookies (Better Auth session) on every call.
// All paths are relative — Vite proxies /api/* to the Hono server in dev,
// and in prod the frontend + API live on the same origin.
//
// Wire format note: this codebase was originally written against Supabase's
// snake_case column names. Drizzle gives us camelCase, so we convert keys on
// the way out (response → snake_case for components).

class ApiError extends Error {
  status: number;
  body: Record<string, unknown> | null;
  constructor(message: string, status: number, body: Record<string, unknown> | null = null) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

const toSnake = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toSnake);
  if (typeof obj !== "object") return obj;
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
      k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`),
      toSnake(v),
    ])
  );
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let body: Record<string, unknown> | null = null;
    try {
      body = await res.json();
      const jErr = (body as { error?: unknown })?.error;
      if (typeof jErr === "string") message = jErr;
    } catch { /* not JSON */ }
    throw new ApiError(message, res.status, body);
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json();
  return toSnake(data) as T;
}

const get = <T>(p: string) => request<T>(p);
const post = <T>(p: string, body?: unknown) =>
  request<T>(p, { method: "POST", body: body ? JSON.stringify(body) : undefined });
const patch = <T>(p: string, body?: unknown) =>
  request<T>(p, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });
const del = (p: string) => request<void>(p, { method: "DELETE" });

export const api = {
  // Profile
  getProfile: () => get<any>("/profile"),
  updateProfile: (data: {
    display_name?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
    whatsapp_community_url?: string | null;
    instagram_url?: string | null;
    website_url?: string | null;
    facebook_url?: string | null;
  }) => patch<any>("/profile", data),

  // Sidebar / dashboard
  getSidebarBadges: () => get<{ inbox: number; tasks: number }>("/sidebar/badges"),
  getDashboard: () => get<any>("/dashboard"),
  getAnalytics: () => get<any>("/analytics"),
  search: (q: string) => get<any>(`/search?q=${encodeURIComponent(q)}`),
  seed: () => post<{ seeded?: boolean; skipped?: boolean }>("/seed"),

  // Contacts
  listContacts: () => get<any[]>("/contacts"),
  createContact: (data: any) => post<any>("/contacts", data),
  upsertContact: (data: any) => post<any>("/contacts/upsert", data),
  bulkContacts: (contacts: any[]) =>
    post<{ imported: number; skipped: number; errors: Array<{ row: number; reason: string }> }>(
      "/contacts/bulk", { contacts }
    ),
  updateContact: (id: string, data: any) => patch<any>(`/contacts/${id}`, data),
  deleteContact: (id: string) => del(`/contacts/${id}`),

  // Conversations
  listConversations: () => get<any[]>("/conversations"),
  createConversation: (data: any) => post<any>("/conversations", data),
  updateConversation: (id: string, data: any) => patch<any>(`/conversations/${id}`, data),
  deleteConversation: (id: string) => del(`/conversations/${id}`),
  inboxStatus: () => get<{
    meta_connected: boolean;
    meta_enabled: boolean;
    display_phone_number: string | null;
    last_verified_at: string | null;
    conversation_count: number;
    session_user_id: string;
    session_email: string;
  }>("/inbox/status"),

  // Messages
  listMessages: (conversationId: string) => get<any[]>(`/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, data: any) =>
    post<any>(`/conversations/${conversationId}/messages`, data),

  // Deals
  listDeals: () => get<any[]>("/deals"),
  createDeal: (data: any) => post<any>("/deals", data),
  updateDeal: (id: string, data: any) => patch<any>(`/deals/${id}`, data),
  deleteDeal: (id: string) => del(`/deals/${id}`),

  // Campaigns
  listCampaigns: () => get<any[]>("/campaigns"),
  createCampaign: (data: any) => post<any>("/campaigns", data),
  updateCampaign: (id: string, data: any) => patch<any>(`/campaigns/${id}`, data),
  deleteCampaign: (id: string) => del(`/campaigns/${id}`),

  // Broadcasts
  listBroadcasts: () => get<any[]>("/broadcasts"),
  createBroadcast: (data: any) => post<any>("/broadcasts", data),
  updateBroadcast: (id: string, data: any) => patch<any>(`/broadcasts/${id}`, data),
  deleteBroadcast: (id: string) => del(`/broadcasts/${id}`),
  sendBroadcast: (id: string) => post<{ sent: number; failed: number; total: number; broadcast: any }>(`/broadcasts/${id}/send`),

  // Tasks
  listTasks: () => get<any[]>("/tasks"),
  createTask: (data: any) => post<any>("/tasks", data),
  updateTask: (id: string, data: any) => patch<any>(`/tasks/${id}`, data),
  deleteTask: (id: string) => del(`/tasks/${id}`),

  // Meta WhatsApp integration
  getMetaConfig: () => get<{
    id: string;
    phone_number_id: string;
    business_account_id: string | null;
    display_phone_number: string | null;
    enabled: boolean;
    last_verified_at: string | null;
    has_token: boolean;
  } | null>("/integrations/meta"),
  saveMetaConfig: (data: {
    access_token: string;
    phone_number_id: string;
    business_account_id?: string;
    force?: boolean;
  }) => post<any>("/integrations/meta", data),
  testMetaConfig: () => post<{ ok: boolean; display_phone_number?: string; verified_name?: string; quality_rating?: string; error?: string }>("/integrations/meta/test"),
  deleteMetaConfig: () => del("/integrations/meta"),
  listMetaTemplates: () => get<{ data: Array<{ name: string; language: string; status: string; category: string; components: any[] }> }>("/integrations/meta/templates"),

  // ── Ads Marketing (Meta Marketing API) ────────────────────────────────
  // GETs return `demo: true` when no credentials are connected so the UI can
  // show a banner without blowing up on an empty state.
  getAdsConnection: () => get<{
    connected: boolean; platform: "meta";
    ad_account_id?: string; ad_account_name?: string; ad_account_currency?: string;
    connected_at?: string; last_verified_at?: string;
  }>("/ads/connection"),
  connectAds: (data: { adAccountId: string; accessToken: string }) =>
    post<{ ok: true; ad_account_id: string; ad_account_name: string; ad_account_currency: string }>("/ads/connection", data),
  disconnectAds: () => del("/ads/connection"),
  listAdCampaigns: () => get<{
    campaigns: Array<{
      id: string; name: string; platform: "meta" | "google"; objective: string;
      status: "active" | "paused" | "review";
      daily_budget_inr: number; spent_inr: number;
      impressions: number; clicks: number; results: number; result_type: string;
      cpc_inr: number; ctr: number; roas: number; audience: string;
    }>;
    demo: boolean;
    error?: string;
  }>("/ads/campaigns"),
  createAdCampaign: (data: {
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
  }) =>
    post<{ ok: true; id?: string; mode?: "campaign_only" | "full_launch"; campaign_id?: string; ad_set_id?: string; creative_id?: string; ad_id?: string }>("/ads/campaigns", data),
  searchAdTargeting: (q: string) =>
    get<{ results: Array<{ key: string; name: string; type: string; country_code?: string; country_name?: string; region?: string }>; demo?: boolean }>(`/ads/targeting/search?q=${encodeURIComponent(q)}`),
  searchAdInterests: (q: string) =>
    get<{
      interests: Array<{ id: string; name: string; audience_size_lower_bound?: number; audience_size_upper_bound?: number; topic?: string; path?: string[] }>;
      demo?: boolean;
    }>(`/ads/targeting/interests${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  getCampaignAnalytics: (id: string, range: "last_7d" | "last_14d" | "last_30d" | "last_90d" = "last_30d") =>
    get<{
      demo: boolean;
      campaign: { id: string; name: string; objective: string; status: string; effective_status: string; daily_budget?: string; lifetime_budget?: string; created_time?: string; start_time?: string; stop_time?: string } | null;
      range: string;
      totals: { spend: number; impressions: number; clicks: number; ctr: number; cpc: number; cpm: number; reach: number; frequency: number; results: number };
      daily: Array<{ date: string; spend: number; impressions: number; clicks: number; results: number }>;
      by_age_gender: Array<{ age: string; gender: string; spend: number; impressions: number; clicks: number }>;
      by_placement: Array<{ platform: string; position: string; spend: number; impressions: number; clicks: number }>;
      ads: Array<{ id: string; name: string; status: string; effective_status: string; adset_id: string; created_time: string; spend: number; impressions: number; clicks: number; ctr: number; cpc: number; results: number }>;
      error?: string;
    }>(`/ads/campaigns/${id}/analytics?range=${range}`),
  estimateAdDelivery: (data: {
    objective: string;
    destination_type?: "WHATSAPP" | "MESSENGER" | "WEBSITE" | "ON_AD";
    daily_budget_inr: number;
    targeting?: { country_codes?: string[]; city_keys?: string[]; region_keys?: string[]; age_min?: number; age_max?: number; audience_id?: string };
  }) =>
    post<{
      estimate_ready: boolean;
      audience_size_low?: number;
      audience_size_high?: number;
      reach_low: number;
      reach_high: number;
      results_low: number;
      results_high: number;
      demo: boolean;
      error?: string;
    }>("/ads/estimate", data),
  listAdPages: () =>
    get<{ pages: Array<{ id: string; name: string; category: string | null }>; demo?: boolean }>("/ads/pages"),

  // UPI payment requests — sent to a customer's WhatsApp inbox as a deep link + QR.
  getUpiConfig: () =>
    get<{ vpa: string; display_name: string; configured: boolean }>("/payments/upi/config"),
  saveUpiConfig: (data: { vpa: string; display_name?: string }) =>
    patch<{ ok: true; vpa: string; display_name: string; configured: boolean }>("/payments/upi/config", data),
  sendUpiPaymentRequest: (data: { conversation_id: string; amount_inr: number; note?: string }) =>
    post<{ ok: true; upi_link: string; qr_url: string; amount_inr: number; note: string; sent_live: boolean; mode: "live" | "dry-run" }>(
      "/payments/upi/send",
      data,
    ),
  adsPreflight: () =>
    get<{
      ok: boolean;
      checks: Array<{ id: string; status: "pass" | "warn" | "fail"; label: string; message: string; fix_url?: string }>;
    }>("/ads/preflight"),
  // Ad-to-Sale ROAS attribution — joins ad spend → CTW chats → deals → ₹ revenue.
  getAdAttribution: (id: string, range?: "last_7d" | "last_14d" | "last_30d" | "last_90d") =>
    get<{
      demo: boolean;
      spend_inr: number;
      clicks: number;
      ctw_chats: number;
      contacts_warm: number;
      deals_open: number;
      deals_won: number;
      revenue_inr: number;
      roas: number | null;
      headline: string | null;
      ads_resolved: number;
    }>(`/ads/campaigns/${id}/attribution${range ? `?range=${range}` : ""}`),
  updateAdCampaign: (id: string, data: { status?: "ACTIVE" | "PAUSED"; daily_budget_inr?: number; name?: string }) =>
    patch<{ ok: true }>(`/ads/campaigns/${id}`, data),
  getAdInsights: (range?: "today" | "yesterday" | "last_7d" | "last_14d" | "last_30d") =>
    get<{
      spend_inr: number; impressions: number; clicks: number; ctr_pct: number; cpc_inr: number;
      reach: number; whatsapp_chats: number; purchases: number; demo: boolean; error?: string;
    }>(`/ads/insights${range ? `?range=${range}` : ""}`),
  listAdAudiences: () => get<{
    audiences: Array<{ id: string; name: string; type: "custom" | "lookalike" | "saved"; size: number; source: string; status: "ready" | "building" }>;
    demo: boolean;
    error?: string;
  }>("/ads/audiences"),
  createAdAudience: (data: { name: string; description?: string; source: "crm" | "empty"; filter?: { tags?: string[] } }) =>
    post<{ ok: true; id: string; name: string; uploaded: number; note?: string; warning?: string }>("/ads/audiences", data),

  // ─── Addison AI ──────────────────────────────────────────────────────────
  getAiUsage: () => get<{
    plan: string;
    cap: number;                              // -1 = unlimited
    used: number;
    remaining: number;                        // -1 = unlimited
    breakdown: Array<{ feature: string; calls: number; weight: number; cost_inr: number }>;
    month_start: string;
    ai_configured: boolean;
  }>("/ai/usage"),
  pingAi: () => post<{
    ok: boolean;
    reply: string;
    tokens: { input: number; output: number };
    cost_inr: number;
    model: string;
  }>("/ai/ping"),
  getAiPersona: () => get<AiPersona>("/ai/persona"),
  updateAiPersona: (data: Partial<AiPersona>) => patch<AiPersona>("/ai/persona", data),

  // ─── Billing & plan upgrades ──────────────────────────────────────────────
  getBillingMe: () => get<{
    plan: string;
    account_status: string;
    trial_ends_at: string | null;
    mrr_inr: string;
    pending_upgrade: {
      id: string;
      target_plan: string;
      billing_cycle: string;
      status: string;
      created_at: string;
      customer_note: string | null;
    } | null;
  }>("/billing/me"),
  requestUpgrade: (data: { target_plan: string; billing_cycle?: "monthly" | "annual"; customer_note?: string }) =>
    post<{ ok: true; request: any }>("/billing/request-upgrade", data),
  cancelUpgradeRequest: (id: string) => del(`/billing/upgrade-request/${id}`),
  getReplySuggestions: (conversationId: string) =>
    post<ReplySuggestionsResult>("/ai/reply-suggestions", { conversation_id: conversationId }),

  // Meta BSP cost estimate (this month) — what Meta will bill the workspace.
  getMetaCostEstimate: () => get<{
    month_start: string;
    outbound_count: number;
    estimate_marketing_inr: number;
    estimate_utility_inr: number;
    estimate_auth_inr: number;
    rates: { marketing: number; utility: number; authentication: number };
    note: string;
  }>("/billing/meta-estimate"),
};

export type ReplySuggestion = {
  type: "polite" | "sell" | "qualify";
  text: string;
};

export type ReplySuggestionsResult = {
  escalate: boolean;
  suggestions: ReplySuggestion[];
  reason?: string;
  note?: string;
};

export type AiPersona = {
  business_name: string;
  what_we_sell: string;
  tone: "friendly" | "professional" | "casual" | "urgent_sales";
  response_language: "hinglish" | "hindi" | "english";
  always_say: string;
  never_say: string;
  escalate_keywords: string;
};

export { ApiError };
