// Thin fetch wrapper. Sends cookies (Better Auth session) on every call.
// All paths are relative — Vite proxies /api/* to the Hono server in dev,
// and in prod the frontend + API live on the same origin.
//
// Wire format note: this codebase was originally written against Supabase's
// snake_case column names. Drizzle gives us camelCase, so we convert keys on
// the way out (response → snake_case for components).

import type {
  Contact,
  Conversation,
  Message,
  Deal,
  Campaign,
  Broadcast,
  Task,
  Profile,
  AiAgent,
  AiAgentProduct,
  Eligible24hChat,
  BulkSend24hResponse,
  Lead,
  Note,
  Invoice,
  Expense,
  PaymentsSummary,
  TeamMember,
  LeadsReport,
  CustomersReport,
  RevenueReport,
  PerformanceReport,
} from "./api-types";

export type { AiAgent, AiAgentProduct } from "./api-types";

export type DashboardData = {
  contacts: Contact[];
  conversations: Conversation[];
  messages: Message[];
  deals: Deal[];
  tasks: Task[];
  campaigns: Campaign[];
};

export type AnalyticsData = {
  contacts: Contact[];
  conversations: Conversation[];
  messages: Message[];
  deals: Deal[];
  campaigns: Campaign[];
  broadcasts: Broadcast[];
};

export type SearchResults = {
  contacts: Array<{ id: string; name: string | null; phone: string | null; tag: Contact["tag"] }>;
  conversations: Array<{ id: string; last_message_preview: string | null; contact_name: string | null }>;
  deals: Array<{ id: string; title: string; value: string | number; stage: Deal["stage"] }>;
};

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

// Read the csrf_token cookie set by the server's CSRF middleware. The cookie
// is intentionally httpOnly:false so JS can read it (double-submit pattern).
// We send its value back as the X-CSRF-Token header on every state-changing
// request — the server checks they match.
function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const isMutation = method === "POST" || method === "PATCH" || method === "DELETE" || method === "PUT";
  const csrfToken = isMutation ? readCsrfCookie() : null;
  const workspaceId = typeof localStorage !== "undefined" ? localStorage.getItem("addisonx_active_workspace") : null;
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      ...(workspaceId ? { "X-Workspace-Id": workspaceId } : {}),
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

// Build a ?from=&to= query string for report endpoints (omits empty params).
const rangeQs = (params?: { from?: string; to?: string }) => {
  const qs = new URLSearchParams();
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  const s = qs.toString();
  return s ? `?${s}` : "";
};

function normalizeAgent(agent: AiAgent): AiAgent {
  if (!agent) return agent;
  return {
    ...agent,
    products: (agent.products || []).map((p: any) => ({
      ...p,
      imageUrl: p.imageUrl || p.image_url || "",
      activationMail: p.activationMail || p.activation_mail || "On your Mail",
      activationTime: p.activationTime || p.activation_time || "10 min",
      priceUsd: typeof p.priceUsd !== "undefined" ? p.priceUsd : (typeof p.price_usd !== "undefined" ? p.price_usd : undefined),
      isReseller: typeof p.isReseller !== "undefined" ? p.isReseller : (typeof p.is_reseller !== "undefined" ? p.is_reseller : false),
      resellerPrice: typeof p.resellerPrice !== "undefined" ? p.resellerPrice : (typeof p.reseller_price !== "undefined" ? p.reseller_price : undefined),
      resellerPriceUsd: typeof p.resellerPriceUsd !== "undefined" ? p.resellerPriceUsd : (typeof p.reseller_price_usd !== "undefined" ? p.reseller_price_usd : undefined),
    })),
  };
}

export const api = {
  // Public landing-page lead capture — "50+ Hindi WhatsApp templates" form.
  // No auth; stores the email server-side so the lead is never lost. `keepalive`
  // lets the request finish even if the page navigates / a new tab opens.
  captureTemplateLead: (email: string, source = "landing_templates") =>
    request<{ ok: true }>("/leads/templates", {
      method: "POST",
      body: JSON.stringify({ email, source }),
      keepalive: true,
    }),

  // Profile
  getProfile: () => get<Profile>("/profile"),
  updateProfile: (data: {
    display_name?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
    whatsapp_community_url?: string | null;
    instagram_url?: string | null;
    website_url?: string | null;
    facebook_url?: string | null;
  }) => patch<Profile>("/profile", data),

  // Sidebar / dashboard
  getSidebarBadges: () => get<{ inbox: number; tasks: number }>("/sidebar/badges"),
  getDashboard: () => get<DashboardData>("/dashboard"),
  // Money Machine view — "₹X spent → ₹Y won → Z× ROAS". Joins deals +
  // conversation attribution + ad spend snapshot. Designed for non-technical
  // owners — no impressions, no CPM, just money in / money out.
  getDashboardMoney: () => get<{
    today: { revenue_inr: number; deals: number };
    last_7d: { revenue_inr: number; deals: number };
    last_30d: { revenue_inr: number; deals: number; conversion_pct: number };
    source_split_30d: {
      from_ads:     { revenue_inr: number; deals: number };
      from_organic: { revenue_inr: number; deals: number };
    };
    spend_30d: {
      ad_spend_inr: number;
      revenue_inr: number;
      roas: number | null;
      has_ads_connected: boolean;
    };
    best_ad_30d: { ad_id: string; headline: string; revenue_inr: number; deals: number } | null;
    open_pipeline_inr: number;
    open_pipeline_count: number;
    series_7d: Array<{ date: string; revenue_inr: number; deals: number }>;
  }>("/dashboard/money"),
  getAnalytics: () => get<AnalyticsData>("/analytics"),
  search: (q: string) => get<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
  seed: () => post<{ seeded?: boolean; skipped?: boolean }>("/seed"),

  // Contacts
  listContacts: () => get<Contact[]>("/contacts"),
  createContact: (data: Record<string, unknown>) => post<Contact>("/contacts", data),
  upsertContact: (data: Record<string, unknown>) => post<Contact>("/contacts/upsert", data),
  bulkContacts: (contacts: Record<string, unknown>[]) =>
    post<{ imported: number; skipped: number; errors: Array<{ row: number; reason: string }> }>(
      "/contacts/bulk", { contacts }
    ),
  updateContact: (id: string, data: Record<string, unknown>) => patch<Contact>(`/contacts/${id}`, data),
  deleteContact: (id: string) => del(`/contacts/${id}`),

  // Conversations
  listConversations: () => get<Conversation[]>("/conversations"),
  createConversation: (data: Record<string, unknown>) => post<Conversation>("/conversations", data),
  updateConversation: (id: string, data: Record<string, unknown>) => patch<Conversation>(`/conversations/${id}`, data),
  deleteConversation: (id: string) => del(`/conversations/${id}`),
  toggleAgentMode: (id: string, enabled: boolean) =>
    patch<Conversation>(`/conversations/${id}`, { agent_mode: enabled }),
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
  listMessages: (conversationId: string) => get<Message[]>(`/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, data: Record<string, unknown>) =>
    post<Message>(`/conversations/${conversationId}/messages`, data),

  // Deals
  listDeals: (params?: { contact_id?: string }) => {
    const qs = params?.contact_id ? `?contact_id=${encodeURIComponent(params.contact_id)}` : "";
    return get<Deal[]>(`/deals${qs}`);
  },
  createDeal: (data: Record<string, unknown>) => post<Deal>("/deals", data),
  updateDeal: (id: string, data: Record<string, unknown>) => patch<Deal>(`/deals/${id}`, data),
  deleteDeal: (id: string) => del(`/deals/${id}`),

  // Campaigns
  listCampaigns: () => get<Campaign[]>("/campaigns"),
  createCampaign: (data: Record<string, unknown>) => post<Campaign>("/campaigns", data),
  updateCampaign: (id: string, data: Record<string, unknown>) => patch<Campaign>(`/campaigns/${id}`, data),
  deleteCampaign: (id: string) => del(`/campaigns/${id}`),

  // Broadcasts
  listBroadcasts: () => get<Broadcast[]>("/broadcasts"),
  createBroadcast: (data: Record<string, unknown>) => post<Broadcast>("/broadcasts", data),
  updateBroadcast: (id: string, data: Record<string, unknown>) => patch<Broadcast>(`/broadcasts/${id}`, data),
  deleteBroadcast: (id: string) => del(`/broadcasts/${id}`),
  sendBroadcast: (id: string) => post<{ sent: number; failed: number; total: number; broadcast: Broadcast }>(`/broadcasts/${id}/send`),
  getEligible24h: () => get<{ eligible_chats: Eligible24hChat[] }>("/broadcasts/eligible-24h"),
  sendBulk24h: (data: { body: string; contact_ids?: string[] }) =>
    post<BulkSend24hResponse>("/broadcasts/bulk-send-24h", data),

  // Tasks
  listTasks: (params?: { contact_id?: string }) => {
    const qs = params?.contact_id ? `?contact_id=${encodeURIComponent(params.contact_id)}` : "";
    return get<Task[]>(`/tasks${qs}`);
  },
  createTask: (data: Record<string, unknown>) => post<Task>("/tasks", data),
  updateTask: (id: string, data: Record<string, unknown>) => patch<Task>(`/tasks/${id}`, data),
  deleteTask: (id: string) => del(`/tasks/${id}`),

  // ─── Leads (CRM pipeline view over contacts) ──────────────────────────
  // Lead status lives on the contact, so updates reuse PATCH /contacts/:id.
  listLeads: () => get<Lead[]>("/leads"),
  updateLead: (id: string, data: Record<string, unknown>) => patch<Contact>(`/contacts/${id}`, data),

  // ─── Notes ────────────────────────────────────────────────────────────
  listNotes: (params?: { contact_id?: string }) => {
    const qs = params?.contact_id ? `?contact_id=${encodeURIComponent(params.contact_id)}` : "";
    return get<Note[]>(`/notes${qs}`);
  },
  createNote: (data: Record<string, unknown>) => post<Note>("/notes", data),
  updateNote: (id: string, data: Record<string, unknown>) => patch<Note>(`/notes/${id}`, data),
  deleteNote: (id: string) => del(`/notes/${id}`),

  // ─── Finance: Invoices ────────────────────────────────────────────────
  listInvoices: () => get<Invoice[]>("/invoices"),
  createInvoice: (data: Record<string, unknown>) => post<Invoice>("/invoices", data),
  updateInvoice: (id: string, data: Record<string, unknown>) => patch<Invoice>(`/invoices/${id}`, data),
  sendInvoice: (id: string) => post<Invoice>(`/invoices/${id}/send`),
  markInvoicePaid: (id: string) => post<Invoice>(`/invoices/${id}/mark-paid`),
  deleteInvoice: (id: string) => del(`/invoices/${id}`),

  // ─── Finance: Expenses ────────────────────────────────────────────────
  listExpenses: () => get<Expense[]>("/expenses"),
  createExpense: (data: Record<string, unknown>) => post<Expense>("/expenses", data),
  updateExpense: (id: string, data: Record<string, unknown>) => patch<Expense>(`/expenses/${id}`, data),
  deleteExpense: (id: string) => del(`/expenses/${id}`),

  // ─── Finance: Payments (received money feed) ──────────────────────────
  getPayments: () => get<PaymentsSummary>("/payments"),

  // ─── Team roster + roles ──────────────────────────────────────────────
  listTeam: () => get<TeamMember[]>("/team"),
  inviteTeamMember: (data: { email: string; name?: string; role?: string }) => post<TeamMember>("/team", data),
  updateTeamMember: (id: string, data: Record<string, unknown>) => patch<TeamMember>(`/team/${id}`, data),
  removeTeamMember: (id: string) => del(`/team/${id}`),

  // ─── Reports (server-side aggregations, ?from&to) ─────────────────────
  reportLeads: (params?: { from?: string; to?: string }) => get<LeadsReport>(`/reports/leads${rangeQs(params)}`),
  reportCustomers: (params?: { from?: string; to?: string }) => get<CustomersReport>(`/reports/customers${rangeQs(params)}`),
  reportRevenue: (params?: { from?: string; to?: string }) => get<RevenueReport>(`/reports/revenue${rangeQs(params)}`),
  reportPerformance: (params?: { from?: string; to?: string }) => get<PerformanceReport>(`/reports/performance${rangeQs(params)}`),

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
  }) => post<{
    ok?: boolean;
    id?: string;
    phone_number_id: string;
    business_account_id?: string | null;
    display_phone_number?: string | null;
    verified_name?: string;
    quality_rating?: string;
    enabled?: boolean;
    last_verified_at?: string | null;
  }>("/integrations/meta", data),
  testMetaConfig: () => post<{ ok: boolean; display_phone_number?: string; verified_name?: string; quality_rating?: string; error?: string }>("/integrations/meta/test"),
  deleteMetaConfig: () => del("/integrations/meta"),
  listMetaTemplates: () => get<{ data: Array<{ name: string; language: string; status: string; category: string; components: Record<string, unknown>[] }> }>("/integrations/meta/templates"),

  // Create a new WhatsApp message template — submitted to Meta for review.
  createMetaTemplate: (body: {
    name: string;
    category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
    language: string;          // e.g. "en", "en_US", "hi"
    components: Array<
      | { type: "HEADER"; format: "TEXT"; text: string }
      | { type: "BODY"; text: string }
      | { type: "FOOTER"; text: string }
      | { type: "BUTTONS"; buttons: Array<{ type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER"; text: string; url?: string; phone_number?: string }> }
    >;
  }) =>
    post<{ ok: true; id: string; status: string; category: string; name_submitted: string }>(
      "/integrations/meta/templates",
      body,
    ),

  // Delete a template by name (Meta deletes all languages of that name)
  deleteMetaTemplate: (name: string) =>
    del(`/integrations/meta/templates/${encodeURIComponent(name)}`),

  // WhatsApp Business Profile (public info: about / address / description /
  // email / websites / vertical / profile photo URL — photo is read-only for
  // now; upload requires Meta's Resumable Upload API which isn't wired yet).
  getMetaProfile: () => get<WhatsAppBusinessProfile>("/integrations/meta/profile"),
  updateMetaProfile: (data: WhatsAppBusinessProfileUpdate) =>
    patch<WhatsAppBusinessProfile>("/integrations/meta/profile", data),

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
  /** Whether the server has Meta OAuth credentials configured. UI uses this to
   *  show the "Connect with Facebook" button vs. manual paste only. */
  getMetaOAuthStatus: () => get<{ available: boolean }>("/ads/oauth/status"),
  /** Returns the absolute URL the popup should open. The server endpoint
   *  itself sets the state cookie + 302's to Facebook. */
  metaOAuthStartUrl: () => `/api/ads/oauth/start`,
  /** After the OAuth popup posts back success, fetch the user's ad accounts
   *  so they can pick which one to connect. */
  listAvailableAdAccounts: () => get<{
    accounts: Array<{ id: string; account_id: string; name: string; currency: string; account_status: number; business?: { id: string; name: string } }>;
    currentAdAccountId: string | null;
  }>("/ads/accounts/available"),
  /** Finalize the OAuth connection by selecting an ad account. */
  selectAdAccount: (adAccountId: string) =>
    post<{ ok: true; adAccountId: string; adAccountName: string; adAccountCurrency: string }>("/ads/connection/select", { adAccountId }),
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
      video_url?: string;
      instagram_media_id?: string;
      instagram_actor_id?: string;
      headline: string;
      body: string;
      link_url: string;
      cta_type?: string;
    };
  }) =>
    post<{ ok: true; id?: string; mode?: "campaign_only" | "full_launch"; campaign_id?: string; ad_set_id?: string; creative_id?: string; ad_id?: string }>("/ads/campaigns", data),
  generateAdBlueprint: (prompt: string) =>
    post<{ ok: boolean; blueprint: any }>("/ads/ai/blueprint", { prompt }),
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
  listInstagramVideos: (pageId: string) =>
    get<{ videos: any[]; instagramActorId?: string; demo?: boolean }>(`/ads/pages/${pageId}/instagram-videos`),

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
  /** Mark a UPI payment-request message as received. Creates a won deal +
   *  sends an auto-reply thank-you to the customer. */
  markPaymentReceived: (messageId: string) =>
    post<{ ok: true; amount_inr: number; thank_you_sent: boolean; thank_you_error?: string; deal: { id: string; value: string } }>(
      "/payments/mark-received",
      { messageId },
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
    audiences: Array<{
      id: string;
      name: string;
      type: "custom" | "lookalike" | "saved";
      size: number;
      source: string;
      status: "ready" | "building" | "too_small" | "updating" | "error";
      status_code?: number | null;
      status_description?: string | null;
    }>;
    demo: boolean;
    error?: string;
  }>("/ads/audiences"),
  createAdAudience: (data: { name: string; description?: string; source: "crm" | "empty"; filter?: { tags?: string[] } }) =>
    post<{ ok: true; id: string; name: string; uploaded: number; note?: string; warning?: string }>("/ads/audiences", data),
  getCampaignAiInsights: (id: string, range?: "last_7d" | "last_14d" | "last_30d" | "last_90d") =>
    get<{
      demo: boolean;
      insights: {
        executive_summary: string;
        marketing_grade: string;
        overall_score: number;
        mistakes: Array<{ title: string; description: string; severity: "high" | "medium" | "low" }>;
        action_items: Array<{ title: string; description: string }>;
      };
    }>(`/ads/campaigns/${id}/ai-insights${range ? `?range=${range}` : ""}`),

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
  // ── Meta API expansion (verified-business unlocks) ─────────────────
  metaPermissions: () => get<{
    permissions: Array<{ permission: string; status: "granted" | "declined" }>;
    summary: {
      has_waba_management: boolean;
      has_waba_messaging: boolean;
      has_ads_management: boolean;
      has_catalog: boolean;
      has_instagram_msg: boolean;
      has_leads_retrieval: boolean;
    };
  }>("/meta/permissions"),
  metaRefreshTier: () => post<{
    messaging_limit_tier: string | null;
    quality_rating: string | null;
    display_phone_number: string | null;
    verified_name: string | null;
    refreshed_at: string;
  }>("/meta/refresh-tier"),
  metaGetTier: () => get<{ messaging_limit_tier: string | null; quality_rating: string | null; tier_refreshed_at: string | null } | null>("/meta/tier"),

  // Catalog
  metaCatalogSettings: (catalog_id: string | null) =>
    request("/meta/catalog/settings", { method: "PATCH", body: JSON.stringify({ catalog_id }) }),
  metaCatalogProducts: (after?: string) =>
    get<{ data: Array<{ id: string; retailer_id: string; name: string; price?: string; image_url?: string; availability?: string }>; paging?: { cursors?: { after?: string } } }>(
      `/meta/catalog/products${after ? `?after=${encodeURIComponent(after)}` : ""}`
    ),

  // CAPI
  metaCapiGetSettings: () => get<{ pixel_id: string | null; capi_enabled: boolean; capi_test_event_code: string | null }>("/meta/capi/settings"),
  metaCapiPatchSettings: (body: { pixel_id?: string | null; capi_enabled?: boolean; capi_test_event_code?: string | null }) =>
    request("/meta/capi/settings", { method: "PATCH", body: JSON.stringify(body) }),
  metaCapiTestFire: () => post<{ ok: boolean; response: unknown }>("/meta/capi/test-fire"),
  metaCapiEvents: () => get<Array<{
    id: string;
    event_name: string;
    event_id: string;
    event_time: string;
    source_type: string | null;
    source_id: string | null;
    value_inr: string | null;
    response_code: number | null;
    fired_at: string;
  }>>("/meta/capi/events"),

  // Addison AI — ad copy generator (Growth+ plan)
  generateAdCopy: (body: {
    description: string;
    language?: "english" | "hinglish" | "hindi";
    objective?: "ctw" | "sales" | "leads" | "awareness" | "traffic";
    audience?: string;
  }) =>
    post<{
      ok: true;
      campaign_name: string;
      variants: Array<{ label: string; headline: string; primary_text: string; icebreaker: string }>;
      targeting_interests: string[];
      budget_inr_daily: number;
      budget_reasoning: string;
      cta_label: string;
      meta: { model: string; tokens: { input: number; output: number }; cost_inr: number };
    }>("/ai/ad-copy", body),

  // Cashfree Payment Gateway — paid upgrade flow.
  // NOTE: response types are snake_case because request<T>() runs toSnake()
  // on every response body. Server returns camelCase; the wrapper converts.
  cashfreeStatus: () => get<{ configured: boolean; mode: "sandbox" | "production" }>("/billing/cashfree/status"),
  cashfreeCreateOrder: (plan: string, cycle: "monthly" | "annual") =>
    post<{ payment_session_id: string; order_id: string; mode: "sandbox" | "production"; amount_inr: number }>(
      "/billing/cashfree/create-order", { plan, cycle }
    ),
  cashfreeVerify: (orderId: string) =>
    get<{ order_id: string; cashfree_status: string; upgrade_status: string; plan: string | null }>(
      `/billing/cashfree/verify/${encodeURIComponent(orderId)}`
    ),

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
    post<{ ok: true; request: Record<string, unknown> }>("/billing/request-upgrade", data),
  cancelUpgradeRequest: (id: string) => del(`/billing/upgrade-request/${id}`),
  getReplySuggestions: (conversationId: string) =>
    post<ReplySuggestionsResult>("/ai/reply-suggestions", { conversation_id: conversationId }),

  // ─── Website / storefront builder (Phase 1) ─────────────────────────────
  getSite: () => get<SiteDto>("/site/me"),
  updateSite: (data: {
    slug?: string;
    template?: string;
    theme?: Record<string, unknown>;
    copy?: Record<string, unknown>;
    seo_title?: string | null;
    seo_description?: string | null;
    seo_og_image?: string | null;
    favicon_url?: string | null;
    ga4_id?: string | null;
    meta_pixel_id?: string | null;
    custom_head_html?: string | null;
    allow_indexing?: boolean;
  }) => patch<SiteDto>("/site/me", data),
  publishSite: () => post<SiteDto>("/site/me/publish"),
  unpublishSite: () => post<SiteDto>("/site/me/unpublish"),
  checkSiteSlug: (slug: string) =>
    get<{ slug: string; available: boolean; mine?: boolean }>(
      `/site/slug/check?slug=${encodeURIComponent(slug)}`
    ),
  updateSiteDomain: (custom_domain: string | null) =>
    patch<SiteDto>("/site/me/domain", { custom_domain }),
  verifySiteDomain: () => post<SiteDto>("/site/me/domain/verify"),
  getSiteLeads: () => get<SiteLeadDto[]>("/site/leads"),

  // Products (catalog)
  getProducts: () => get<ProductDto[]>("/products"),
  createProduct: (data: {
    name: string;
    description?: string | null;
    price_inr?: number;
    photo_url?: string | null;
    stock?: number | null;
    category?: string | null;
    status?: "active" | "draft" | "archived";
    is_digital?: boolean;
    validity?: string | null;
    activation_mail?: string | null;
    activation_time?: string | null;
    price_usd?: number | null;
    is_reseller?: boolean;
    reseller_price?: number | null;
    reseller_price_usd?: number | null;
  }) => post<ProductDto>("/products", data),
  updateProduct: (id: string, data: Partial<{
    name: string;
    description: string | null;
    price_inr: number;
    photo_url: string | null;
    stock: number | null;
    category: string | null;
    status: "active" | "draft" | "archived";
    is_digital: boolean;
    validity: string | null;
    activation_mail: string | null;
    activation_time: string | null;
    price_usd: number | null;
    is_reseller: boolean;
    reseller_price: number | null;
    reseller_price_usd: number | null;
  }>) => patch<ProductDto>(`/products/${id}`, data),
  deleteProduct: (id: string) => del(`/products/${id}`),
  reorderProducts: (items: Array<{ id: string; sort_order: number }>) =>
    post<{ ok: true; updated: number }>("/products/reorder", { items }),

  // ─── Bookings (appointments) ──────────────────────────────────────────
  getBookings: (params: { status?: string; date_from?: string; date_to?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.date_from) qs.set("date_from", params.date_from);
    if (params.date_to) qs.set("date_to", params.date_to);
    const s = qs.toString();
    return get<BookingDto[]>(`/bookings${s ? `?${s}` : ""}`);
  },
  getBookingStats: () => get<{ today_count: string; week_count: string; pending_count: string; total_revenue_inr: string }>("/bookings/stats"),
  getBooking: (id: string) => get<BookingDto>(`/bookings/${id}`),
  updateBooking: (id: string, data: Partial<{
    status: "new" | "confirmed" | "completed" | "cancelled" | "no_show";
    notes: string | null;
    booking_date: string;
    booking_time: string;
  }>) => patch<BookingDto>(`/bookings/${id}`, data),
  createManualBooking: (data: {
    service_name: string;
    service_price_inr?: number;
    service_duration_min?: number | null;
    booking_date: string;
    booking_time: string;
    customer_name: string;
    customer_phone?: string | null;
    customer_email?: string | null;
    notes?: string | null;
  }) => post<{ ok: true; booking: BookingDto }>("/bookings", data),

  // ─── WhatsApp Commerce ────────────────────────────────────────────────
  searchProducts: (q: string = "", limit = 12) =>
    get<ProductDto[]>(`/products/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  sendProductsToConversation: (data: { conversation_id: string; product_ids: string[]; intro?: string }) =>
    post<{ ok: true; sent: number; failed: number; sent_live: boolean; mode: string }>("/commerce/send-products", data),
  createOrderFromMessage: (data: { conversation_id: string; product_ids: string[]; quantities?: Record<string, number>; notes?: string }) =>
    post<{ ok: true; order_id: string; order_number: number; total_inr: number; upi_link: string | null; qr_url: string | null; sent_live: boolean }>("/commerce/order-from-message", data),
  quickStatusUpdate: (data: { order_id: string; status: "confirmed" | "shipped" | "delivered" | "cancelled"; tracking_info?: string }) =>
    post<{ ok: true; status: string }>("/commerce/quick-status", data),
  syncCatalogToMeta: () =>
    post<{ ok: true; synced: number; failed: number; results: Array<{ id: string; name: string; ok: boolean; meta_id?: string; error?: string }> }>("/commerce/sync-catalog"),

  // Orders
  getOrders: (status?: string) => get<OrderDto[]>(`/orders${status ? `?status=${status}` : ""}`),
  getOrder: (id: string) => get<OrderDto & { items: OrderItemDto[] }>(`/orders/${id}`),
  updateOrder: (id: string, data: Partial<{
    status: "new" | "confirmed" | "shipped" | "delivered" | "cancelled";
    payment_status: "pending" | "paid" | "refunded";
    payment_method: string | null;
    notes: string | null;
  }>) => patch<OrderDto>(`/orders/${id}`, data),
  createManualOrder: (data: {
    customer_name: string;
    customer_phone?: string | null;
    customer_email?: string | null;
    customer_address?: string | null;
    items: Array<{ product_id?: string | null; name: string; price_inr: number; quantity: number; photo_url?: string | null }>;
    shipping_inr?: number;
    discount_inr?: number;
    payment_method?: string | null;
    payment_status?: "pending" | "paid";
    notes?: string | null;
  }) => post<{ ok: true; id: string; order_number: number }>("/orders", data),

  // Customers (derived from orders)
  getCustomers: () => get<CustomerDto[]>("/customers"),

  // Coupons
  getCoupons: () => get<CouponDto[]>("/coupons"),
  createCoupon: (data: {
    code: string;
    discount_type: "percent" | "flat";
    discount_value: number;
    min_cart_inr?: number;
    max_uses?: number | null;
    starts_at?: string | null;
    expires_at?: string | null;
    active?: boolean;
  }) => post<CouponDto>("/coupons", data),
  updateCoupon: (id: string, data: Partial<{
    code: string;
    discount_type: "percent" | "flat";
    discount_value: number;
    min_cart_inr: number;
    max_uses: number | null;
    starts_at: string | null;
    expires_at: string | null;
    active: boolean;
  }>) => patch<CouponDto>(`/coupons/${id}`, data),
  deleteCoupon: (id: string) => del(`/coupons/${id}`),

  // Pages
  getSitePages: () => get<SitePageDto[]>("/site/pages"),
  createSitePage: (data: { path: string; title?: string; sections?: SiteSection[] }) =>
    post<SitePageDto>("/site/pages", data),
  updateSitePage: (id: string, data: Partial<{
    path: string; title: string | null;
    sections: SiteSection[];            // legacy — writes both draft + published
    draft_sections: SiteSection[];      // new — Builder writes here
    sort_order: number; active: boolean;
    seo_title: string | null; seo_description: string | null;
  }>) => patch<SitePageDto>(`/site/pages/${id}`, data),
  deleteSitePage: (id: string) => del(`/site/pages/${id}`),
  publishSitePage: (id: string) => post<SitePageDto>(`/site/pages/${id}/publish`),
  discardSitePageDraft: (id: string) => post<SitePageDto>(`/site/pages/${id}/discard-draft`),

  // Shipping zones
  getShippingZones: () => get<ShippingZoneDto[]>("/shipping-zones"),
  createShippingZone: (data: {
    name: string;
    pincode_prefixes?: string;
    rate_inr?: number;
    free_above_inr?: number | null;
    eta_days?: number | null;
    active?: boolean;
  }) => post<ShippingZoneDto>("/shipping-zones", data),
  updateShippingZone: (id: string, data: Partial<{
    name: string;
    pincode_prefixes: string;
    rate_inr: number;
    free_above_inr: number | null;
    eta_days: number | null;
    active: boolean;
    sort_order: number;
  }>) => patch<ShippingZoneDto>(`/shipping-zones/${id}`, data),
  deleteShippingZone: (id: string) => del(`/shipping-zones/${id}`),

  // Site analytics
  getSiteAnalyticsSummary: (days = 30) =>
    get<{ days: number; current: AnalyticsCounters; previous: AnalyticsCounters }>(`/site/analytics/summary?days=${days}`),
  getSiteAnalyticsTimeseries: (days = 30) =>
    get<Array<{ day: string; views: string; leads: string; orders: string; revenue: string }>>(`/site/analytics/timeseries?days=${days}`),
  getSiteAnalyticsSources: (days = 30) =>
    get<Array<{ source: string; views: string }>>(`/site/analytics/sources?days=${days}`),
  getSiteAnalyticsTopPages: (days = 30) =>
    get<Array<{ path: string; views: string }>>(`/site/analytics/top-pages?days=${days}`),
  getSiteAnalyticsRecent: (limit = 20) =>
    get<SiteAnalyticsEvent[]>(`/site/analytics/recent?limit=${limit}`),

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

  // Multiple AI Agents
  listAgents: async () => {
    const agents = await get<AiAgent[]>("/ai/agents");
    return agents.map(normalizeAgent);
  },
  createAgent: async (data: Partial<AiAgent>) => {
    const agent = await post<AiAgent>("/ai/agents", data);
    return normalizeAgent(agent);
  },
  updateAgent: async (id: string, data: Partial<AiAgent>) => {
    const agent = await patch<AiAgent>(`/ai/agents/${id}`, data);
    return normalizeAgent(agent);
  },
  activateAgent: (id: string) => post<{ ok: boolean }>(`/ai/agents/${id}/activate`),
  deleteAgent: (id: string) => del(`/ai/agents/${id}`),
  builderChat: (data: { agent_id: string; messages: Array<{ role: string; content: string }> }) =>
    post<{
      reply: string;
      agent_updates?: {
        name?: string;
        business_name?: string;
        what_we_sell?: string;
        knowledge_base?: string;
        system_prompt?: string;
        tone?: string;
        response_language?: string;
      };
    }>("/ai/builder-chat", data),

  // Workspaces
  listWorkspaces: () => get<{ workspaces: Array<{ id: string; name: string; workspace_user_id: string; metaConnected?: boolean }>; active_workspace_id: string }>("/workspaces"),
  createWorkspace: (name: string) => post<{ id: string; name: string; workspace_user_id: string }>("/workspaces", { name }),
  deleteWorkspace: (id: string) => del(`/workspaces/${id}`),
};

export type BookingDto = {
  id: string;
  owner_id: string;
  site_id: string | null;
  booking_number: number;
  service_id: string | null;
  service_name: string;
  service_price_inr: string;
  service_duration_min: number | null;
  booking_date: string;      // YYYY-MM-DD
  booking_time: string;      // HH:MM
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  notes: string | null;
  status: "new" | "confirmed" | "completed" | "cancelled" | "no_show";
  source: "website" | "whatsapp" | "manual";
  contact_id: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItemDto = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_photo_url: string | null;
  unit_price_inr: string;
  quantity: number;
  line_total_inr: string;
  created_at: string;
};

export type OrderDto = {
  id: string;
  owner_id: string;
  site_id: string | null;
  order_number: number;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  customer_address: string | null;
  subtotal_inr: string;
  shipping_inr: string;
  discount_inr: string;
  total_inr: string;
  status: "new" | "confirmed" | "shipped" | "delivered" | "cancelled";
  payment_method: string | null;
  payment_status: "pending" | "paid" | "refunded";
  source: "website" | "whatsapp" | "manual";
  notes: string | null;
  contact_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SiteSection = {
  id: string;
  type: "hero" | "about" | "products" | "gallery" | "testimonials" | "faq" | "hours" | "leadform" | "contact" | "feature_grid" | "stats" | "cta_banner" | "pricing_table" | "countdown_timer" | "video_embed";
  props: Record<string, unknown>;
};

export type SitePageDto = {
  id: string;
  site_id: string;
  owner_id: string;
  path: string;
  title: string | null;
  sections: SiteSection[];           // published
  draft_sections: SiteSection[] | null;  // editor working copy
  sort_order: number;
  active: boolean;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
  last_published_at: string | null;
};

export type ShippingZoneDto = {
  id: string;
  owner_id: string;
  name: string;
  pincode_prefixes: string;
  rate_inr: string;
  free_above_inr: string | null;
  eta_days: number | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type CouponDto = {
  id: string;
  owner_id: string;
  code: string;
  discount_type: "percent" | "flat";
  discount_value: string;
  min_cart_inr: string;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type AnalyticsCounters = {
  views: string;
  leads: string;
  cart_adds?: string;
  orders: string;
  revenue: string;
  unique_visitors?: string;
};

export type SiteAnalyticsEvent = {
  id: string;
  siteId: string;
  ownerId: string;
  eventType: "view" | "lead" | "cart_add" | "order";
  path: string | null;
  referrerHost: string | null;
  valueInr: string | null;
  sessionHash: string | null;
  userAgent: string | null;
  occurredAt: string;
};

export type CustomerDto = {
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  last_address: string | null;
  order_count: string;       // postgres returns bigint as string
  total_spent_inr: string;
  last_order_at: string;
  first_order_at: string;
};

export type ProductDto = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  price_inr: string;
  photo_url: string | null;
  stock: number | null;
  category: string | null;
  status: "active" | "draft" | "archived";
  sort_order: number;
  is_digital: boolean;
  validity: string | null;
  activation_mail: string | null;
  activation_time: string | null;
  price_usd: string | null;
  is_reseller: boolean;
  reseller_price: string | null;
  reseller_price_usd: string | null;
  created_at: string;
  updated_at: string;
};

export type SiteLeadDto = {
  id: string;
  site_id: string;
  owner_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  message: string | null;
  source_path: string | null;
  user_agent: string | null;
  ip_hash: string | null;
  contact_id: string | null;
  contacted_at: string | null;
  created_at: string;
};

export type SiteDto = {
  id: string;
  user_id: string;
  slug: string;
  template: string;
  status: "draft" | "published";
  published_at: string | null;
  theme: Record<string, string>;
  copy: Record<string, string>;
  seo_title: string | null;
  seo_description: string | null;
  seo_og_image: string | null;
  custom_domain: string | null;
  custom_domain_verified: boolean;
  view_count: number;
  favicon_url: string | null;
  ga4_id: string | null;
  meta_pixel_id: string | null;
  custom_head_html: string | null;
  allow_indexing: boolean;
  created_at: string;
  updated_at: string;
};

export type ReplySuggestion = {
  type: "polite" | "sell" | "qualify";
  text: string;
};

export type SuggestedProduct = { id: string; name: string; price: number; photo_url: string | null };
export type ReplySuggestionsResult = {
  escalate: boolean;
  suggestions: ReplySuggestion[];
  reason?: string;
  note?: string;
  suggested_products?: SuggestedProduct[];
};

export type WhatsAppBusinessProfile = {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  profile_picture_url?: string;
  websites?: string[];
  vertical?: string;
  messaging_product?: string;
};

export type WhatsAppBusinessProfileUpdate = {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  websites?: string[];
  vertical?: string;
};

export const WHATSAPP_VERTICALS = [
  { value: "UNDEFINED",     label: "— Select industry —" },
  { value: "OTHER",         label: "Other" },
  { value: "AUTO",          label: "Automotive" },
  { value: "BEAUTY",        label: "Beauty, Spa & Salon" },
  { value: "APPAREL",       label: "Clothing & Apparel" },
  { value: "EDU",           label: "Education" },
  { value: "ENTERTAIN",     label: "Entertainment" },
  { value: "EVENT_PLAN",    label: "Event Planning & Service" },
  { value: "FINANCE",       label: "Finance & Banking" },
  { value: "GROCERY",       label: "Food & Grocery" },
  { value: "GOVT",          label: "Public Service" },
  { value: "HOTEL",         label: "Hotel & Lodging" },
  { value: "HEALTH",        label: "Medical & Health" },
  { value: "NONPROFIT",     label: "Non-profit" },
  { value: "PROF_SERVICES", label: "Professional Services" },
  { value: "RETAIL",        label: "Shopping & Retail" },
  { value: "TRAVEL",        label: "Travel & Transportation" },
  { value: "RESTAURANT",    label: "Restaurant" },
  { value: "NOT_A_BIZ",     label: "Not a Business" },
] as const;

export type AiPersona = {
  business_name: string;
  what_we_sell: string;
  tone: "friendly" | "professional" | "casual" | "urgent_sales" | "reseller";
  response_language: "hinglish" | "hindi" | "english" | "auto";
  always_say: string;
  never_say: string;
  escalate_keywords: string;
};

export { ApiError };
