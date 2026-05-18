// Admin API client — separate from the customer-facing api.ts.
// All routes are /api/admin/* and require is_staff = true on the user.

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
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
};

export const adminApi = {
  me: () => adminRequest<AdminMe>("/me"),
  metrics: () => adminRequest<AdminMetrics>("/metrics"),
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
  audit: (params?: { action?: string; actor?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return adminRequest<AdminAuditEntry[]>(`/audit${qs ? `?${qs}` : ""}`);
  },
  staff: () => adminRequest<AdminStaff[]>("/staff"),
  updateStaffRole: (id: string, adminRole: string) =>
    adminRequest<{ ok: true }>(`/staff/${id}`, { method: "PATCH", body: JSON.stringify({ adminRole }) }),
  removeStaff: (id: string) => adminRequest<{ ok: true }>(`/staff/${id}`, { method: "DELETE" }),
  subscriptions: () => adminRequest<AdminWorkspace[]>("/subscriptions"),
  refund: (id: string, amount: number, reason: string) =>
    adminRequest<{ ok: true }>(`/subscriptions/${id}/refund`, {
      method: "POST",
      body: JSON.stringify({ amount, reason }),
    }),
  health: () => adminRequest<{ checks: HealthCheck[]; timestamp: string }>("/health"),
};
