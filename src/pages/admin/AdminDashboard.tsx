import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi, type AdminUpgradeRequest } from "@/lib/admin-api";
import {
  Users, IndianRupee, Building2, Sparkles, MessageSquare, Inbox, Trophy,
  Activity, ShieldOff, AlertTriangle, Crown, Loader2, ArrowUpRight,
  Zap, ChevronRight, Crosshair, Radio,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AdminAiPanel } from "@/components/admin/AdminAiPanel";

const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const compactINR = (n: number) => {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
};

// Ease-out animation from 0 → target. Re-runs whenever target changes, so
// the dashboard's 30s refetch makes counters re-animate when metrics shift.
const useAnimatedCount = (target: number, duration = 700) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!Number.isFinite(target)) return;
    let raf: number;
    const start = performance.now();
    const from = n;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(from + (target - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);
  return n;
};

// "12s ago" / "3m ago" — refreshes itself every second so the header feels live.
const useTimeSince = (date: Date | null) => {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  if (!date) return "—";
  const s = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

type ColorKey = "red" | "yellow" | "emerald" | "indigo" | "magenta" | "orange";

const COLOR_STYLES: Record<ColorKey, {
  border: string; shadow: string; hoverShadow: string;
  iconBg: string; text: string; glowFrom: string; bgSoft: string;
}> = {
  red:     { border: "border-slate-200/80", shadow: "shadow-sm", hoverShadow: "hover:shadow-md", iconBg: "bg-rose-500 text-white", text: "text-rose-600", glowFrom: "from-rose-500/10", bgSoft: "bg-rose-50/50" },
  yellow:  { border: "border-slate-200/80", shadow: "shadow-sm", hoverShadow: "hover:shadow-md", iconBg: "bg-amber-500 text-white", text: "text-amber-600", glowFrom: "from-amber-500/10", bgSoft: "bg-amber-50/50" },
  emerald: { border: "border-slate-200/80", shadow: "shadow-sm", hoverShadow: "hover:shadow-md", iconBg: "bg-emerald-500 text-white", text: "text-emerald-600", glowFrom: "from-emerald-500/10", bgSoft: "bg-emerald-50/50" },
  indigo:  { border: "border-slate-200/80", shadow: "shadow-sm", hoverShadow: "hover:shadow-md", iconBg: "bg-indigo-500 text-white", text: "text-indigo-600", glowFrom: "from-indigo-500/10", bgSoft: "bg-indigo-50/50" },
  magenta: { border: "border-slate-200/80", shadow: "shadow-sm", hoverShadow: "hover:shadow-md", iconBg: "bg-pink-500 text-white", text: "text-pink-600", glowFrom: "from-pink-500/10", bgSoft: "bg-pink-50/50" },
  orange:  { border: "border-slate-200/80", shadow: "shadow-sm", hoverShadow: "hover:shadow-md", iconBg: "bg-orange-500 text-white", text: "text-orange-600", glowFrom: "from-orange-500/10", bgSoft: "bg-orange-50/50" },
};

const KPI = ({
  label, rawValue, format, sub, icon: Icon, color, accent,
}: {
  label: string;
  rawValue: number;
  format: "inr" | "num";
  sub?: string;
  icon: typeof Users;
  color: ColorKey;
  accent?: boolean;
}) => {
  const s = COLOR_STYLES[color];
  const animated = useAnimatedCount(rawValue);
  const display = format === "inr" ? compactINR(animated) : Math.round(animated).toLocaleString("en-IN");

  return (
    <div className={cn(
      "group relative overflow-hidden bg-white border rounded-2xl p-5 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-300/85 will-change-transform",
      s.border, s.shadow, s.hoverShadow,
    )}>
      {/* Brand-colored glow on hover for depth */}
      <div className={cn(
        "pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl bg-gradient-to-br to-transparent transition-opacity duration-500",
        s.glowFrom,
        accent ? "opacity-60" : "opacity-0 group-hover:opacity-100",
      )} />
      <div className="relative flex items-center justify-between mb-4">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105",
          s.iconBg,
        )}>
          <Icon className="w-5 h-5" strokeWidth={2} />
        </div>
        {accent && (
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-white bg-emerald-600 rounded-full px-2 py-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" /> Live
          </span>
        )}
      </div>
      <p className="relative text-[10px] uppercase tracking-[0.15em] text-slate-400 font-bold">{label}</p>
      <p className={cn("relative text-2.5xl font-black tracking-tight tabular-nums mt-1", s.text)}>{display}</p>
      {sub && <p className="relative text-[10px] text-slate-400 font-medium mt-1">{sub}</p>}
    </div>
  );
};

const ACTION_LABELS: Record<string, string> = {
  impersonate:           "🎭 Impersonated",
  change_plan:           "💎 Plan changed",
  suspend:               "⛔ Suspended",
  unsuspend:             "✅ Unsuspended",
  refund:                "💸 Refund issued",
  invite_staff:          "📨 Staff invited",
  remove_staff:          "🗑️ Staff removed",
  upgrade_request_update:"📝 Upgrade updated",
  upgrade_activated:     "🚀 Plan activated",
};

const AdminDashboard = () => {
  const metricsQ = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: () => adminApi.metrics(),
    refetchInterval: 30_000,
  });
  const m = metricsQ.data;

  // Pending upgrade queue — surface count + 3 most recent on the dashboard
  const upgradesQ = useQuery({
    queryKey: ["admin-upgrade-requests"],
    queryFn: () => adminApi.upgradeRequests(),
    refetchInterval: 30_000,
  });
  const pending = (upgradesQ.data ?? []).filter((r: AdminUpgradeRequest) =>
    ["requested", "contacted", "paid"].includes(r.status),
  );

  // Live audit log — recent 6 entries
  const auditQ = useQuery({
    queryKey: ["admin-audit-recent"],
    queryFn: () => adminApi.audit({ limit: 6 }),
    refetchInterval: 20_000,
  });
  const audit = auditQ.data ?? [];

  const lastSynced = metricsQ.dataUpdatedAt ? new Date(metricsQ.dataUpdatedAt) : null;
  const syncLabel = useTimeSince(lastSynced);

  if (metricsQ.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-650" />
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-10 py-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-200/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex items-center justify-center shadow-sm">
            <Crown className="w-5.5 h-5.5 text-indigo-400" strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-[24px] font-black tracking-tight text-slate-900">Admin Dashboard</h1>
            <p className="text-[12px] text-slate-500 font-medium">All-workspace operations · live · updates every 30s</p>
          </div>
        </div>
        {/* Live sync chip */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full pl-2.5 pr-3 py-1 shadow-sm">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
            <span className="relative rounded-full w-2 h-2 bg-emerald-500" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 tabular-nums">
            Live · synced {syncLabel}
          </span>
        </div>
      </div>

      {/* HERO MRR */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-950 to-indigo-900 text-white p-6 shadow-md border border-slate-850">
        <div className="absolute -top-10 -right-10 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }}
        />
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8.5 h-8.5 rounded-xl bg-indigo-500/15 text-indigo-300 flex items-center justify-center shadow-md border border-indigo-500/25">
                <IndianRupee className="w-4 h-4" strokeWidth={2.5} />
              </div>
              <span className="text-[9.5px] uppercase tracking-[0.18em] text-indigo-350 font-bold">Monthly Recurring Revenue</span>
            </div>
            <p className="text-4xl lg:text-5xl font-black tracking-tight tabular-nums leading-none">
              <HeroINR value={Number(m?.mrrInr ?? 0)} />
            </p>
            <p className="text-[12px] text-slate-400 font-medium mt-2">
              {m?.activeUsers ?? 0} active workspaces · {m?.signupsWeek ?? 0} signups this week
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:gap-3 lg:max-w-md w-full">
            <HeroChip label="Trial" value={m?.trial ?? 0} />
            <HeroChip label="Suspended" value={m?.suspended ?? 0} />
            <HeroChip label="Signups 24h" value={m?.signups24h ?? 0} />
          </div>
        </div>
      </div>

      {/* Pending upgrade queue */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm p-5 hover:border-slate-350 transition-colors">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-650 flex items-center justify-center shadow-sm border border-indigo-100">
              <Zap className="w-4.5 h-4.5" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-[14px] font-black leading-tight text-slate-900">Pending upgrade requests</p>
              <p className="text-[11px] text-slate-400 font-semibold">
                {pending.length === 0 ? "Queue clear" : `${pending.length} customer${pending.length === 1 ? "" : "s"} waiting on you`}
              </p>
            </div>
          </div>
          <Link
            to="/admin/subscriptions"
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
          >
            Open queue <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {pending.length === 0 ? (
          <p className="text-[11.5px] text-slate-450 font-medium italic">
            No pending requests right now. Customers can request upgrades from <code className="text-[10.5px] bg-slate-100 px-1 py-0.5 rounded">/app/upgrade</code>.
          </p>
        ) : (
          <div className="space-y-2">
            {pending.slice(0, 3).map((r: AdminUpgradeRequest) => (
              <Link
                key={r.id}
                to="/admin/subscriptions"
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-3.5 h-3.5 text-amber-500" strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-extrabold truncate text-slate-800">
                    {r.userName ?? r.userEmail ?? "Unknown"}
                    <span className="text-slate-455 font-bold mx-1.5">→</span>
                    <span className="capitalize">{r.targetPlan}</span>
                    <span className="text-slate-455 font-bold ml-1">({r.billingCycle})</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                    {r.userEmail} · current: {r.currentPlan ?? "—"}
                  </p>
                </div>
                <span className={cn(
                  "text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border",
                  r.status === "requested" && "bg-amber-50 text-amber-600 border-amber-200",
                  r.status === "contacted" && "bg-indigo-50 text-indigo-650 border-indigo-200",
                  r.status === "paid" && "bg-emerald-50 text-emerald-600 border-emerald-200",
                )}>{r.status}</span>
                <ChevronRight className="w-4 h-4 text-slate-350 group-hover:text-slate-500 group-hover:translate-x-0.5 transition" />
              </Link>
            ))}
            {pending.length > 3 && (
              <Link to="/admin/subscriptions" className="block text-center text-[10.5px] font-bold text-indigo-600 py-1 hover:text-indigo-700">
                + {pending.length - 3} more
              </Link>
            )}
          </div>
        )}
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Total users"        rawValue={m?.users ?? 0}         format="num" sub={`${m?.staff ?? 0} staff included`} icon={Users} color="indigo" />
        <KPI label="Workspaces active"  rawValue={m?.activeUsers ?? 0}    format="num" sub={`${m?.trial ?? 0} on trial`} icon={Building2} color="yellow" />
        <KPI label="Signups (7 din)"    rawValue={m?.signupsWeek ?? 0}    format="num" sub={`${m?.signups24h ?? 0} in last 24h`} icon={Sparkles} color="orange" accent />
        <KPI label="Suspended"          rawValue={m?.suspended ?? 0}      format="num" sub="Needs review" icon={ShieldOff} color="red" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Messages (24h)"     rawValue={m?.messages24h ?? 0}    format="num" sub="Across all workspaces" icon={MessageSquare} color="indigo" />
        <KPI label="Deals won (24h)"    rawValue={m?.dealsWon24h ?? 0}    format="num" sub="₹ value in subs view" icon={Trophy} color="emerald" />
        <KPI label="Trial accounts"     rawValue={m?.trial ?? 0}          format="num" sub="Watch for conversion" icon={AlertTriangle} color="magenta" />
        <KPI label="Pending upgrades"   rawValue={pending.length}         format="num" sub={pending.length === 0 ? "Queue clear ✓" : "Process payment links"} icon={Crosshair} color="orange" />
      </div>

      {/* Routing-health row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Link to="/admin/diagnostics" className="block lg:col-span-2">
          <div className={cn(
            "h-full rounded-2xl bg-white border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm",
            (m?.unroutedWebhooks24h ?? 0) > 0
              ? "border-amber-300 hover:border-amber-450"
              : "border-slate-200/80 hover:border-slate-350"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0",
                (m?.unroutedWebhooks24h ?? 0) > 0 ? "bg-amber-500" : "bg-indigo-500"
              )}>
                <Radio className={cn("w-5 h-5", (m?.unroutedWebhooks24h ?? 0) > 0 && "animate-pulse")} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Routing health (24h)</p>
                <p className="text-[20px] font-black tabular-nums leading-none mt-1">
                  {m?.unroutedWebhooks24h ?? 0}
                  <span className="text-[11px] font-bold text-slate-450 ml-1.5">
                    {(m?.unroutedWebhooks24h ?? 0) === 1 ? "unrouted message" : "unrouted messages"}
                  </span>
                </p>
                <p className="text-[11px] font-semibold mt-1">
                  {(m?.unroutedWebhooks24h ?? 0) > 0
                    ? <span className="text-amber-600">⚠ Inbound chats arriving for unknown numbers — click to investigate</span>
                    : <span className="text-indigo-600">✓ Every inbound message is reaching an inbox</span>}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-350" />
            </div>
          </div>
        </Link>
        <KPI label="Open conversations" rawValue={m?.conversationsOpen ?? 0} format="num" sub="Across all workspaces" icon={Inbox} color="yellow" />
        <KPI label="MRR (active)"       rawValue={m?.mrrInr ?? 0}            format="inr" sub={`${m?.activeUsers ?? 0} paying workspaces`} icon={IndianRupee} color="emerald" />
      </div>

      {/* Bottom: recent activity + quick links */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Live activity */}
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden hover:border-slate-300 transition-colors">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-650 flex items-center justify-center border border-indigo-100 shadow-sm">
                <Activity className="w-4.5 h-4.5" strokeWidth={2.2} />
              </div>
              <div>
                <p className="text-[13px] font-black tracking-tight text-slate-900">Live activity</p>
                <p className="text-[10px] text-slate-400 font-semibold">Last 6 staff actions · updates every 20s</p>
              </div>
            </div>
            <Link to="/admin/audit" className="text-[10.5px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5">
              Full log <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {auditQ.isLoading ? (
            <div className="px-4 py-10 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto text-indigo-550" /></div>
          ) : audit.length === 0 ? (
            <p className="px-4 py-10 text-center text-[11.5px] text-slate-455 italic">
              No actions yet. As staff use the panel, entries appear here in real time.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {audit.map((a) => (
                <li key={a.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/50 transition">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px]">{ACTION_LABELS[a.action]?.split(" ")[0] ?? "•"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold leading-tight truncate text-slate-800">
                      {ACTION_LABELS[a.action]?.split(" ").slice(1).join(" ") ?? a.action}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                      {a.targetUserId ?? "—"}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-455 font-semibold flex-shrink-0 tabular-nums">
                    <RelativeTime iso={a.createdAt} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick links */}
        <div className="space-y-3">
          <QuickLink
            to="/admin/workspaces"
            icon={Building2}
            color="yellow"
            title="Manage workspaces"
            desc="Suspend, change plan, impersonate"
          />
          <QuickLink
            to="/admin/subscriptions"
            icon={IndianRupee}
            color="emerald"
            title="Subscriptions & refunds"
            desc="Activate plans, process refunds"
            badge={pending.length > 0 ? `${pending.length} pending` : undefined}
          />
          <QuickLink
            to="/admin/health"
            icon={Inbox}
            color="indigo"
            title="System health"
            desc="DB, queues, Meta connectivity"
          />
        </div>
      </div>
      <AdminAiPanel />
    </div>
  );
};

// Big hero ₹ with animated counter
const HeroINR = ({ value }: { value: number }) => {
  const animated = useAnimatedCount(value, 900);
  return <>{compactINR(animated)}</>;
};

const HeroChip = ({ label, value }: { label: string; value: number }) => {
  const n = useAnimatedCount(value);
  return (
    <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-3.5 py-2.5">
      <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">{label}</p>
      <p className="text-xl font-black tabular-nums leading-tight mt-0.5">{Math.round(n).toLocaleString("en-IN")}</p>
    </div>
  );
};

const QuickLink = ({
  to, icon: Icon, color, title, desc, badge,
}: {
  to: string; icon: typeof Users; color: ColorKey; title: string; desc: string; badge?: string;
}) => {
  const s = COLOR_STYLES[color];
  return (
    <Link
      to={to}
      className="group block p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-350"
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105 flex-shrink-0",
          s.iconBg,
        )}>
          <Icon className="w-5 h-5" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-black tracking-tight text-slate-800">{title}</p>
          <p className="text-[11px] text-slate-400 font-medium">{desc}</p>
        </div>
        {badge && (
          <span className="text-[9.5px] uppercase tracking-wider font-bold bg-orange-500 text-white rounded-full px-2 py-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            {badge}
          </span>
        )}
        <ArrowUpRight className="w-4 h-4 text-slate-350 group-hover:text-slate-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
      </div>
    </Link>
  );
};

const RelativeTime = ({ iso }: { iso: string }) => {
  const date = new Date(iso);
  const label = useTimeSince(date);
  return <>{label}</>;
};

export default AdminDashboard;
