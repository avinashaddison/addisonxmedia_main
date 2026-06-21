import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi, type AdminUpgradeRequest, type AdminMetrics } from "@/lib/admin-api";
import {
  Users, IndianRupee, Building2, Sparkles, MessageSquare, Inbox, Trophy,
  ShieldOff, AlertTriangle, Crown, Loader2, ChevronRight, Zap, Brain,
  RefreshCw, UserPlus, Send, BarChart3, ArrowUpRight, MessagesSquare,
  ShieldCheck, Activity,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/PageShell";
import { AdminAiPanel } from "@/components/admin/AdminAiPanel";

/* ── formatters ─────────────────────────────────────────────── */
const compactINR = (n: number) => {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
};
const fmt = (n: number | undefined | null) =>
  new Intl.NumberFormat("en-IN").format(n ?? 0);

// Static relative time — computed at render (queries refetch keeps it fresh,
// no per-row setInterval that re-renders the whole tree every second).
const relTime = (iso: string) => {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const ACTION_LABELS: Record<string, string> = {
  impersonate: "Impersonated workspace",
  change_plan: "Plan changed",
  suspend: "Workspace suspended",
  unsuspend: "Workspace unsuspended",
  refund: "Refund issued",
  invite_staff: "Staff invited",
  remove_staff: "Staff removed",
  upgrade_request_update: "Upgrade request updated",
  upgrade_activated: "Plan activated",
};

/* ── small building blocks ──────────────────────────────────── */
type Accent = "emerald" | "saffron" | "indigo" | "pink" | "slate" | "rose" | "amber";
const ACCENT: Record<Accent, string> = {
  emerald: "bg-emerald-50 text-emerald-600",
  saffron: "bg-orange-50 text-orange-600",
  indigo: "bg-indigo-50 text-indigo-600",
  pink: "bg-pink-50 text-pink-600",
  slate: "bg-slate-100 text-slate-600",
  rose: "bg-rose-50 text-rose-600",
  amber: "bg-amber-50 text-amber-600",
};

const StatCard = memo(function StatCard({
  label, value, icon: Icon, accent, hint,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: Accent;
  hint?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", ACCENT[accent])}>
          <Icon className="w-4 h-4" strokeWidth={2.2} />
        </span>
      </div>
      <div className="mt-2.5 text-[26px] leading-none font-bold text-slate-800 tabular-nums">{value}</div>
      {hint && <div className="mt-1.5 text-[11px] text-slate-400 font-medium">{hint}</div>}
    </div>
  );
});

const MiniStat = memo(function MiniStat({
  label, value, icon: Icon, accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: Accent;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <span className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", ACCENT[accent])}>
        <Icon className="w-4 h-4" strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <div className="text-[16px] font-bold text-slate-800 tabular-nums leading-none">{value}</div>
        <div className="text-[11px] text-slate-400 font-medium truncate mt-1">{label}</div>
      </div>
    </div>
  );
});

/* Lightweight workspace-status donut from real counts */
const StatusDonut = memo(function StatusDonut({
  active, trial, suspended,
}: { active: number; trial: number; suspended: number }) {
  const total = active + trial + suspended;
  const C = 2 * Math.PI * 35;
  const seg = (v: number) => (total > 0 ? (v / total) * C : 0);
  const activePct = total > 0 ? Math.round((active / total) * 100) : 0;
  const rows: { label: string; n: number; color: string }[] = [
    { label: "Active", n: active, color: "#0E8A4B" },
    { label: "On trial", n: trial, color: "#B8651A" },
    { label: "Suspended", n: suspended, color: "#EF4444" },
  ];
  return (
    <div className="flex items-center gap-5">
      <div className="relative w-[104px] h-[104px] flex-shrink-0">
        <svg width="104" height="104" viewBox="0 0 100 100" className="-rotate-90">
          <circle cx="50" cy="50" r="35" fill="none" stroke="#f1f5f9" strokeWidth="10" />
          {active > 0 && (
            <circle cx="50" cy="50" r="35" fill="none" stroke="#0E8A4B" strokeWidth="10"
              strokeDasharray={`${seg(active)} ${C}`} strokeLinecap="round" />
          )}
          {trial > 0 && (
            <circle cx="50" cy="50" r="35" fill="none" stroke="#B8651A" strokeWidth="10"
              strokeDasharray={`${seg(trial)} ${C}`} transform={`rotate(${(active / (total || 1)) * 360} 50 50)`} strokeLinecap="round" />
          )}
          {suspended > 0 && (
            <circle cx="50" cy="50" r="35" fill="none" stroke="#EF4444" strokeWidth="10"
              strokeDasharray={`${seg(suspended)} ${C}`} transform={`rotate(${((active + trial) / (total || 1)) * 360} 50 50)`} strokeLinecap="round" />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[18px] font-bold text-slate-800 leading-none">{activePct}%</span>
          <span className="text-[10px] text-slate-400 font-semibold mt-0.5">active</span>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 flex-1 min-w-0">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
            <span className="text-[12px] font-medium text-slate-600 flex-1 truncate">{r.label}</span>
            <span className="text-[12px] font-bold text-slate-800 tabular-nums">{r.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

const QUICK_ACTIONS = [
  { to: "/admin/workspaces", label: "Workspaces", icon: Building2, accent: "emerald" as Accent },
  { to: "/admin/users", label: "Users", icon: UserPlus, accent: "indigo" as Accent },
  { to: "/admin/marketing-agent", label: "Broadcast", icon: Send, accent: "saffron" as Accent },
  { to: "/admin/diagnostics", label: "Chat Inbox", icon: Inbox, accent: "pink" as Accent },
  { to: "/admin/subscriptions", label: "Billing", icon: IndianRupee, accent: "amber" as Accent },
  { to: "/admin/audit", label: "Audit log", icon: BarChart3, accent: "slate" as Accent },
];

const STATUS_BADGE: Record<string, string> = {
  requested: "bg-amber-50 text-amber-700 border-amber-200",
  contacted: "bg-indigo-50 text-indigo-700 border-indigo-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const Card = ({ title, action, children, className }: {
  title: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) => (
  <div className={cn("bg-white rounded-xl border border-slate-200 p-5", className)}>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-[13px] font-bold text-slate-700">{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

/* ── page ───────────────────────────────────────────────────── */
const AdminDashboard = () => {
  const metricsQ = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: () => adminApi.metrics(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const upgradesQ = useQuery({
    queryKey: ["admin-upgrade-requests"],
    queryFn: () => adminApi.upgradeRequests(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const auditQ = useQuery({
    queryKey: ["admin-audit-recent"],
    queryFn: () => adminApi.audit({ limit: 8 }),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const m = metricsQ.data as AdminMetrics | undefined;
  const pending = (upgradesQ.data ?? []).filter((r: AdminUpgradeRequest) =>
    ["requested", "contacted", "paid"].includes(r.status),
  );
  const audit = auditQ.data ?? [];

  const refreshAll = () => {
    metricsQ.refetch();
    upgradesQ.refetch();
    auditQ.refetch();
  };
  const refreshing = metricsQ.isFetching || upgradesQ.isFetching || auditQ.isFetching;

  const headerActions = (
    <button
      onClick={refreshAll}
      disabled={refreshing}
      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E8B968] bg-white text-[12px] font-bold text-[#7A4A00] hover:bg-[#FFF1D6] transition disabled:opacity-60"
    >
      <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} strokeWidth={2.5} />
      {refreshing ? "Syncing…" : "Refresh"}
    </button>
  );

  if (metricsQ.isLoading) {
    return (
      <PageShell
        title="Admin Control Center"
        subtitle="AddisonX Media · Ranchi, Jharkhand"
        icon={<Crown className="w-5 h-5 text-white" strokeWidth={2.5} />}
      >
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-6 h-6 animate-spin text-[#0E8A4B]" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Admin Control Center"
      subtitle="AddisonX Media · Ranchi, Jharkhand"
      icon={<Crown className="w-5 h-5 text-white" strokeWidth={2.5} />}
      actions={headerActions}
    >
      <div className="space-y-5 max-w-[1400px] mx-auto">
        {(metricsQ.isError || upgradesQ.isError || auditQ.isError) && (
          <div className="flex items-center gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-[12.5px] font-semibold text-rose-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" strokeWidth={2.3} />
            <span className="flex-1">Couldn’t load some live data. Numbers shown may be stale.</span>
            <button onClick={refreshAll} className="text-rose-700 underline underline-offset-2 hover:text-rose-900">
              Retry
            </button>
          </div>
        )}

        {/* Primary KPIs — all real */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard label="Monthly Revenue" value={compactINR(m?.mrrInr ?? 0)} icon={IndianRupee} accent="saffron" hint="MRR (live)" />
          <StatCard label="Active Workspaces" value={fmt(m?.activeUsers)} icon={Building2} accent="emerald" />
          <StatCard label="Total Users" value={fmt(m?.users)} icon={Users} accent="indigo" />
          <StatCard label="Signups (7d)" value={fmt(m?.signupsWeek)} icon={Sparkles} accent="pink" hint={`${fmt(m?.signups24h)} in last 24h`} />
          <StatCard label="Pending Upgrades" value={fmt(pending.length)} icon={Zap} accent="amber" hint={pending.length ? "needs review" : "queue clear"} />
          <StatCard label="Suspended" value={fmt(m?.suspended)} icon={ShieldOff} accent="rose" hint={(m?.suspended ?? 0) ? "needs review" : "all clear"} />
        </div>

        {/* Activity + status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card title="Platform activity (24h)" className="lg:col-span-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MiniStat label="Messages" value={fmt(m?.messages24h)} icon={MessageSquare} accent="indigo" />
              <MiniStat label="Open conversations" value={fmt(m?.conversationsOpen)} icon={MessagesSquare} accent="emerald" />
              <MiniStat label="Deals won" value={fmt(m?.dealsWon24h)} icon={Trophy} accent="saffron" />
              <MiniStat label="Signups" value={fmt(m?.signups24h)} icon={Sparkles} accent="pink" />
              <MiniStat label="Staff members" value={fmt(m?.staff)} icon={ShieldCheck} accent="slate" />
              <MiniStat label="Unrouted webhooks" value={fmt(m?.unroutedWebhooks24h)} icon={AlertTriangle} accent="rose" />
            </div>
          </Card>

          <Card title="Workspace status">
            <StatusDonut active={m?.activeUsers ?? 0} trial={m?.trial ?? 0} suspended={m?.suspended ?? 0} />
          </Card>
        </div>

        {/* Pending upgrades + recent activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card
            title="Pending upgrades"
            action={
              <Link to="/admin/subscriptions" className="text-[11px] font-bold text-[#0E8A4B] hover:underline inline-flex items-center gap-0.5">
                Manage <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {pending.length === 0 ? (
              <p className="py-6 text-center text-[12px] text-slate-400">No upgrade requests waiting.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {pending.slice(0, 5).map((r) => (
                  <li key={r.id} className="py-2.5 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-semibold text-slate-700 truncate">
                        {r.userName || r.userEmail || "Unknown user"}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {(r.currentPlan ?? "—")} → <span className="font-semibold text-slate-600">{r.targetPlan}</span> · {relTime(r.createdAt)}
                      </p>
                    </div>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize flex-shrink-0", STATUS_BADGE[r.status] ?? "bg-slate-50 text-slate-600 border-slate-200")}>
                      {r.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Recent activity"
            className="lg:col-span-2"
            action={
              <Link to="/admin/audit" className="text-[11px] font-bold text-[#0E8A4B] hover:underline inline-flex items-center gap-0.5">
                Full log <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {auditQ.isLoading ? (
              <div className="py-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-300" /></div>
            ) : audit.length === 0 ? (
              <p className="py-6 text-center text-[12px] text-slate-400">No actions logged yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {audit.map((a) => (
                  <li key={a.id} className="py-2.5 flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
                      <Activity className="w-3.5 h-3.5" strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-semibold text-slate-700 truncate">
                        {ACTION_LABELS[a.action] ?? a.action}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {a.actorName ?? a.actorEmail ?? "System"}
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap tabular-nums flex-shrink-0">
                      {relTime(a.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Quick actions */}
        <Card title="Quick operations">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {QUICK_ACTIONS.map((q) => (
              <Link
                key={q.to + q.label}
                to={q.to}
                className="flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-3 hover:border-slate-300 hover:bg-slate-50 transition text-center"
              >
                <span className={cn("w-9 h-9 rounded-lg flex items-center justify-center", ACCENT[q.accent])}>
                  <q.icon className="w-4 h-4" strokeWidth={2.2} />
                </span>
                <span className="text-[11px] font-semibold text-slate-600 leading-tight">{q.label}</span>
              </Link>
            ))}
          </div>
        </Card>

        {/* AI manager */}
        <div className="rounded-xl border border-[#0E8A4B]/30 bg-[#E6F7EE]/50 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="w-11 h-11 rounded-xl bg-[#0E8A4B] text-white flex items-center justify-center flex-shrink-0">
              <Brain className="w-5 h-5" strokeWidth={2.3} />
            </span>
            <div className="text-center sm:text-left">
              <h3 className="text-[14px] font-bold text-slate-800">AI Platform Manager</h3>
              <p className="text-[12px] text-slate-500 mt-0.5 max-w-md">
                Ask AI to route webhooks, update plans, or search the audit trail.
              </p>
            </div>
          </div>
          <button
            onClick={() => window.dispatchEvent(new Event("open-admin-ai-panel"))}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-[#0E8A4B] hover:bg-[#0A6E3C] text-white font-bold text-[12.5px] transition inline-flex items-center justify-center gap-1.5 flex-shrink-0"
          >
            Open AI Manager <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <AdminAiPanel />
    </PageShell>
  );
};

export default AdminDashboard;
