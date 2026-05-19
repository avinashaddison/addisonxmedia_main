// Thin fetch wrapper. Sends cookies (Better Auth session) on every call.
// All paths are relative — Vite proxies /api/* to the Hono server in dev,
// and in prod the frontend + API live on the same origin.
//
// Wire format note: this codebase was originally written against Supabase's
// snake_case column names. Drizzle gives us camelCase, so we convert keys on
// the way out (response → snake_case for components).

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
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
    try {
      const j = await res.json();
      if (j?.error) message = j.error;
    } catch { /* not JSON */ }
    throw new ApiError(message, res.status);
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
  updateProfile: (data: { display_name?: string | null; phone?: string | null; avatar_url?: string | null }) =>
    patch<any>("/profile", data),

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
  }) =>
    post<{ ok: true; id?: string; mode?: "campaign_only" | "full_launch"; campaign_id?: string; ad_set_id?: string; creative_id?: string; ad_id?: string }>("/ads/campaigns", data),
  searchAdTargeting: (q: string) =>
    get<{ results: Array<{ key: string; name: string; type: string; country_code?: string; country_name?: string; region?: string }>; demo?: boolean }>(`/ads/targeting/search?q=${encodeURIComponent(q)}`),
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
};

export { ApiError };
