// Admin API client — separate from the customer-facing api.ts.
// All routes are /api/admin/* and require is_staff = true on the user.

/** Read the csrf_token cookie value (set by the server on every response). */
function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrfToken(), ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return null as T;
  return res.json();
}

export type AdminMetrics = {
  users: number;
  activeUsers: number;
  suspended: number;
  trial: number;
  staff: number;
  signups24h: number;
  signupsWeek: number;
  mrrInr: number;
  messages24h: number;
  conversationsOpen: number;
  dealsWon24h: number;
  unroutedWebhooks24h: number;
};

export type AdminWorkspace = {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  mrrInr: string | number;
  isStaff?: boolean;
  adminRole?: string | null;
  createdAt: string;
  trialEndsAt: string | null;
};

export type AdminWorkspaceDetail = AdminWorkspace & {
  suspendedAt: string | null;
  suspendedReason: string | null;
  emailVerified: boolean;
  counts: {
    contacts: number;
    conversations: number;
    messages: number;
    deals: number;
    revenueInr: number;
  };
  meta: { enabled: boolean; displayPhoneNumber: string | null } | null;
};

export type AdminAuditEntry = {
  id: string;
  action: string;
  actorUserId: string;
  actorEmail: string | null;
  actorName: string | null;
  targetUserId: string | null;
  payload: string | null;
  ipAddress: string | null;
  userAgent?: string | null;
  createdAt: string;
};

export type AdminStaff = {
  id: string;
  name: string;
  email: string;
  adminRole: string;
  adminInvitedBy: string | null;
  adminLastLoginAt: string | null;
  createdAt: string;
};

export type HealthCheck = {
  service: string;
  status: "ok" | "warn" | "fail";
  latencyMs: number;
  detail?: string;
};

export type AdminMe = {
  id: string;
  email: string;
  name: string;
  adminRole: string;
  twoFactorEnabled?: boolean;
};

export type WorkspacePreview = {
  recentContacts: Array<{ id: string; name: string; phone: string; email: string | null; tag: string; score: number; createdAt: string }>;
  recentMessages: Array<{ id: string; body: string; direction: "inbound" | "outbound"; status: string; createdAt: string; conversationId: string }>;
  recentDeals: Array<{ id: string; title: string; value: string; stage: string; probability: number; closedAt: string | null; createdAt: string }>;
  recentTasks: Array<{ id: string; title: string; priority: string; status: string; dueAt: string | null; createdAt: string }>;
};

export const adminApi = {
  me: () => adminRequest<AdminMe>("/me"),
  metrics: () => adminRequest<AdminMetrics>("/metrics"),
  workspacePreview: (id: string) => adminRequest<WorkspacePreview>(`/workspaces/${id}/preview`),
  workspaceExportContactsUrl: (id: string) => `/api/admin/workspaces/${id}/export/contacts.csv`,
  workspaces: (params?: { q?: string; status?: string; includeStaff?: boolean }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, k === "includeStaff" && v ? "1" : String(v)]))
    ).toString();
    return adminRequest<AdminWorkspace[]>(`/workspaces${qs ? `?${qs}` : ""}`);
  },
  workspaceDetail: (id: string) => adminRequest<AdminWorkspaceDetail>(`/workspaces/${id}`),
  updateWorkspace: (id: string, body: { plan?: string; trialEndsAt?: string | null; mrrInr?: number }) =>
    adminRequest<{ ok: true }>(`/workspaces/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  suspend: (id: string, reason: string) =>
    adminRequest<{ ok: true }>(`/workspaces/${id}/suspend`, { method: "POST", body: JSON.stringify({ reason }) }),
  unsuspend: (id: string) =>
    adminRequest<{ ok: true }>(`/workspaces/${id}/unsuspend`, { method: "POST" }),
  impersonate: (targetUserId: string, reason: string) =>
    adminRequest<{ ok: true; sessionId: string; expiresAt: string }>("/impersonate", {
      method: "POST",
      body: JSON.stringify({ targetUserId, reason }),
    }),
  endImpersonation: () => adminRequest<{ ok: true }>("/impersonate/end", { method: "POST" }),
  audit: (params?: { action?: string; actor?: string; since?: string; until?: string; limit?: number }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]))
    ).toString();
    return adminRequest<AdminAuditEntry[]>(`/audit${qs ? `?${qs}` : ""}`);
  },
  /** Returns a URL admins can hit directly to download the CSV (cookies carried via same-origin). */
  auditCsvUrl: (params?: { action?: string; actor?: string; since?: string; until?: string; limit?: number }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries({ ...params, format: "csv" } ?? {}).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]))
    ).toString();
    return `/api/admin/audit?${qs}`;
  },
  staff: () => adminRequest<AdminStaff[]>("/staff"),
  promoteStaff: (email: string, adminRole: string) =>
    adminRequest<{ ok: true; id: string; email: string; adminRole: string }>(`/staff/promote`, {
      method: "POST",
      body: JSON.stringify({ email, adminRole }),
    }),
  updateStaffRole: (id: string, adminRole: string) =>
    adminRequest<{ ok: true }>(`/staff/${id}`, { method: "PATCH", body: JSON.stringify({ adminRole }) }),
  removeStaff: (id: string) => adminRequest<{ ok: true }>(`/staff/${id}`, { method: "DELETE" }),
  subscriptions: () => adminRequest<AdminWorkspace[]>("/subscriptions"),
  refund: (id: string, amount: number, reason: string, paymentId?: string) =>
    adminRequest<{ ok: true; mode: "live" | "audit-only"; refund?: unknown; note?: string }>(`/subscriptions/${id}/refund`, {
      method: "POST",
      body: JSON.stringify({ amount, reason, paymentId }),
    }),

  // Upgrade-request queue (manual plan activation)
  upgradeRequests: (status?: string) =>
    adminRequest<AdminUpgradeRequest[]>(`/upgrade-requests${status ? `?status=${status}` : ""}`),
  updateUpgradeRequest: (id: string, body: { status?: string; admin_notes?: string | null; razorpay_payment_id?: string | null }) =>
    adminRequest<AdminUpgradeRequest>(`/upgrade-requests/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  activateUpgrade: (id: string, body: { mrr_inr?: number; admin_notes?: string; razorpay_payment_id?: string }) =>
    adminRequest<{ ok: true; plan: string }>(`/upgrade-requests/${id}/activate`, { method: "POST", body: JSON.stringify(body) }),
  // Chat-ownership diagnostics — "where are my chats?"
  chatOwnership: () => adminRequest<ChatOwnershipReport>("/diagnostics/chat-ownership"),
  reassignChats: (body: { fromUserId: string; toUserId: string; includeMetaConfig?: boolean }) =>
    adminRequest<{ ok: true }>("/diagnostics/reassign-chats", { method: "POST", body: JSON.stringify(body) }),
  duplicateAccounts: () => adminRequest<{ groups: DuplicateAccountGroup[] }>("/diagnostics/duplicate-accounts"),
  inspectAccount: (q: string) =>
    adminRequest<InspectAccountReport>(`/diagnostics/inspect?q=${encodeURIComponent(q)}`),
  consolidateAccounts: (body: { targetUserId: string; sourceUserIds: string[]; deleteSources?: boolean }) =>
    adminRequest<{ ok: true; summary: { moved: Record<string, number>; metaConfigMoves: number; profileMoves: number; deletedUsers: number } }>(
      "/diagnostics/consolidate",
      { method: "POST", body: JSON.stringify(body) }
    ),
  mergeAccounts: (body: { canonicalUserId: string; duplicateUserIds: string[] }) =>
    adminRequest<{ ok: true; summary: { moved: Record<string, number>; metaConfigMoves: number; profileMoves: number; deletedUsers: number } }>(
      "/diagnostics/merge-accounts",
      { method: "POST", body: JSON.stringify(body) }
    ),
  webhookOrphans: (params?: { sinceDays?: number; onlyUnclaimed?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.sinceDays) qs.set("since", new Date(Date.now() - params.sinceDays * 24 * 3600 * 1000).toISOString());
    if (params?.onlyUnclaimed) qs.set("only_unclaimed", "1");
    return adminRequest<WebhookOrphanReport>(`/diagnostics/webhook-orphans${qs.toString() ? `?${qs}` : ""}`);
  },
  claimWebhookOrphans: (phoneNumberId: string, userId: string) =>
    adminRequest<{ ok: true; claimedCount: number }>(`/diagnostics/webhook-orphans/claim`, {
      method: "POST",
      body: JSON.stringify({ phoneNumberId, userId }),
    }),
  clearWebhookOrphans: (phoneNumberId?: string) =>
    adminRequest<{ ok: true; deletedCount: number }>(
      `/diagnostics/webhook-orphans${phoneNumberId ? `?phone_number_id=${encodeURIComponent(phoneNumberId)}` : ""}`,
      { method: "DELETE" }
    ),
  health: () => adminRequest<{ checks: HealthCheck[]; timestamp: string }>("/health"),
  settings: () => adminRequest<SystemSetting[]>("/settings"),
  updateSetting: (key: string, value: string) =>
    adminRequest<{ ok: true }>(`/settings/${key}`, { method: "PATCH", body: JSON.stringify({ value }) }),
};

export type AdminUpgradeRequest = {
  id: string;
  userId: string;
  targetPlan: string;
  billingCycle: string;
  status: string;
  customerNote: string | null;
  adminNotes: string | null;
  razorpayPaymentId: string | null;
  createdAt: string;
  completedAt: string | null;
  userEmail: string | null;
  userName: string | null;
  currentPlan: string | null;
  currentMrr: string | null;
};

export type ChatOwnershipRow = {
  userId: string;
  email: string;
  name: string;
  plan: string | null;
  conversations: number;
  contacts: number;
  messages: number;
};

export type ChatOwnershipMetaConfig = {
  id: string;
  userId: string;
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  enabled: boolean;
  lastVerifiedAt: string | null;
  email: string | null;
  name: string | null;
};

export type ChatOwnershipReport = {
  ownership: ChatOwnershipRow[];
  metaConfigs: ChatOwnershipMetaConfig[];
  unroutedWebhooks24h: number;
};

export type WebhookOrphanGroup = {
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  total: number;
  lastAt: string;
};

export type WebhookOrphanEvent = {
  id: string;
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  fromPhone: string | null;
  fromName: string | null;
  messagePreview: string | null;
  raw: unknown;
  claimedUserId: string | null;
  claimedAt: string | null;
  createdAt: string;
};

export type DuplicateAccountUser = {
  id: string;
  email: string;
  name: string;
  plan: string | null;
  status: string | null;
  createdAt: string;
  conversations: number;
  contacts: number;
  messages: number;
  metaConfigs: number;
};

export type InspectUser = {
  id: string;
  email: string;
  name: string;
  plan: string | null;
  status: string | null;
  createdAt: string;
  conversations: number;
  contacts: number;
  messages: number;
  hasMetaConfig: boolean;
  matchedDirectly: boolean;
};

export type InspectMetaConfig = {
  id: string;
  userId: string;
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  enabled: boolean;
  lastVerifiedAt: string | null;
  userEmail: string | null;
  userName: string | null;
  userPlan: string | null;
};

export type InspectConversation = {
  id: string;
  ownerId: string;
  status: string | null;
  lastMessageAt: string | null;
  unreadCount: number | null;
  contactName: string | null;
  contactPhone: string | null;
};

export type InspectAccountReport = {
  query: string;
  users: InspectUser[];
  metaConfigs: InspectMetaConfig[];
  conversations: InspectConversation[];
  suggestion: {
    canonicalUserId: string;
    canonicalEmail: string;
    duplicateUserIds: string[];
    reason: string;
  } | null;
};

export type DuplicateAccountGroup = {
  emailNorm: string;
  users: DuplicateAccountUser[];
};

export type WebhookOrphanReport = {
  groups: WebhookOrphanGroup[];
  recent: WebhookOrphanEvent[];
  unclaimed24h: number;
};

export type SystemSetting = {
  key: string;
  value: string | null;
  category: string;
  description: string | null;
  updatedBy: string | null;
  updatedAt: string;
};
