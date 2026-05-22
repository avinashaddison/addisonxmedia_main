import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi, type AdminUpgradeRequest } from "@/lib/admin-api";
import {
  Users, IndianRupee, Building2, Sparkles, MessageSquare, Inbox, Trophy,
  Activity, ShieldOff, AlertTriangle, Crown, Loader2, ArrowUpRight,
  Zap, ChevronRight, Crosshair,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

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
  iconBg: string; text: string; glowFrom: string;
}> = {
  red:     { border: "border-[#B8230C]", shadow: "shadow-[0_4px_0_0_#7A1500]", hoverShadow: "hover:shadow-[0_6px_0_0_#7A1500]", iconBg: "bg-[#B8230C]", text: "text-[#B8230C]", glowFrom: "from-[#B8230C]/15" },
  yellow:  { border: "border-[#FFD23F]", shadow: "shadow-[0_4px_0_0_#B8860B]", hoverShadow: "hover:shadow-[0_6px_0_0_#B8860B]", iconBg: "bg-[#FFD23F] text-[#3D1A00]", text: "text-[#7A4A00]", glowFrom: "from-[#FFD23F]/30" },
  emerald: { border: "border-[#0E8A4B]", shadow: "shadow-[0_4px_0_0_#0A6E3C]", hoverShadow: "hover:shadow-[0_6px_0_0_#0A6E3C]", iconBg: "bg-[#0E8A4B]", text: "text-[#0E8A4B]", glowFrom: "from-[#0E8A4B]/15" },
  indigo:  { border: "border-[#3C50E0]", shadow: "shadow-[0_4px_0_0_#2533A8]", hoverShadow: "hover:shadow-[0_6px_0_0_#2533A8]", iconBg: "bg-[#3C50E0]", text: "text-[#3C50E0]", glowFrom: "from-[#3C50E0]/15" },
  magenta: { border: "border-[#D4308E]", shadow: "shadow-[0_4px_0_0_#A11A6A]", hoverShadow: "hover:shadow-[0_6px_0_0_#A11A6A]", iconBg: "bg-[#D4308E]", text: "text-[#D4308E]", glowFrom: "from-[#D4308E]/15" },
  orange:  { border: "border-[#FF6A1F]", shadow: "shadow-[0_4px_0_0_#B8420A]", hoverShadow: "hover:shadow-[0_6px_0_0_#B8420A]", iconBg: "bg-[#FF6A1F]", text: "text-[#FF6A1F]", glowFrom: "from-[#FF6A1F]/15" },
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
      "group relative overflow-hidden bg-white border-2 rounded-2xl p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 will-change-transform",
      s.border, s.shadow, s.hoverShadow,
    )}>
      {/* Brand-colored glow on hover for depth */}
      <div className={cn(
        "pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl bg-gradient-to-br to-transparent transition-opacity duration-500",
        s.glowFrom,
        accent ? "opacity-60" : "opacity-0 group-hover:opacity-100",
      )} />
      <div className="relative flex items-center justify-between mb-3">
        <div className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105",
          s.iconBg,
        )}>
          <Icon className="w-5 h-5" strokeWidth={2.5} />
        </div>
        {accent && (
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-white bg-[#0E8A4B] rounded-full px-2 py-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFD23F] animate-pulse" /> Live
          </span>
        )}
      </div>
      <p className="relative text-[11px] uppercase tracking-[0.15em] text-foreground/60 font-extrabold">{label}</p>
      <p className={cn("relative text-3xl font-black tracking-tight tabular-nums mt-1", s.text)}>{display}</p>
      {sub && <p className="relative text-[11px] text-foreground/60 font-medium mt-1">{sub}</p>}
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
        <Loader2 className="w-6 h-6 animate-spin text-[#B8230C]" />
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-10 py-6">
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#B8230C] to-[#7A1500] text-white flex items-center justify-center shadow-md">
            <Crown className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-[26px] font-black tracking-tight">Admin Dashboard</h1>
            <p className="text-[12px] text-foreground/70 font-medium">All-workspace operations · live · refreshes every 30s</p>
          </div>
        </div>
        {/* Live sync chip — pulses + counts up "12s ago" so the operator feels currency */}
        <div className="flex items-center gap-1.5 bg-white border-2 border-[#0E8A4B] rounded-full pl-2 pr-3 py-1 shadow-[0_2px_0_0_#0A6E3C]">
          <span className="relative flex w-2.5 h-2.5">
            <span className="absolute inline-flex w-full h-full rounded-full bg-[#0E8A4B] opacity-60 animate-ping" />
            <span className="relative rounded-full w-2.5 h-2.5 bg-[#0E8A4B]" />
          </span>
          <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#0E8A4B] tabular-nums">
            Live · synced {syncLabel}
          </span>
        </div>
      </div>

      {/* HERO MRR — biggest, brightest, the only metric that truly matters */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0E8A4B] via-[#0A6E3C] to-[#073D22] text-white p-5 mb-4 shadow-[0_6px_0_0_#073D22]">
        <div className="absolute -top-10 -right-10 w-56 h-56 bg-[#FFD23F]/15 rounded-full blur-3xl pointer-events-none" />
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }}
        />
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#FFD23F] text-[#7A4A00] flex items-center justify-center shadow-md">
                <IndianRupee className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#FFD23F] font-extrabold">Monthly Recurring Revenue</span>
            </div>
            <p className="text-5xl lg:text-6xl font-black tracking-tight tabular-nums leading-none">
              <HeroINR value={Number(m?.mrrInr ?? 0)} />
            </p>
            <p className="text-[12px] text-white/85 font-bold mt-1.5">
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

      {/* Pending upgrade queue — actionable, surfaces what needs admin attention */}
      <div className="rounded-2xl bg-white border-2 border-[#FF6A1F] shadow-[0_4px_0_0_#B8420A] p-4 mb-5">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#FF6A1F] text-white flex items-center justify-center shadow-md">
              <Zap className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[13px] font-black leading-tight">Pending upgrade requests</p>
              <p className="text-[10.5px] text-foreground/60 font-bold">
                {pending.length === 0 ? "Queue clear" : `${pending.length} customer${pending.length === 1 ? "" : "s"} waiting on you`}
              </p>
            </div>
          </div>
          <Link
            to="/admin/subscriptions"
            className="text-[11px] font-extrabold text-[#FF6A1F] hover:text-[#E85C12] flex items-center gap-0.5"
          >
            Open queue <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {pending.length === 0 ? (
          <p className="text-[11.5px] text-foreground/55 font-medium italic">
            No pending requests right now. Customers can request upgrades from <code className="text-[10.5px] bg-[#FFF6E8] px-1 py-0.5 rounded">/app/upgrade</code>.
          </p>
        ) : (
          <div className="space-y-1.5">
            {pending.slice(0, 3).map((r: AdminUpgradeRequest) => (
              <Link
                key={r.id}
                to="/admin/subscriptions"
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#FFF1D6] hover:bg-[#FFE8C7] border border-[#E8B968] transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-[#E8B968] flex items-center justify-center flex-shrink-0">
                  <Crown className="w-3.5 h-3.5 text-[#7A4A00]" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-extrabold truncate">
                    {r.userName ?? r.userEmail ?? "Unknown"}
                    <span className="text-foreground/55 font-bold mx-1.5">→</span>
                    <span className="capitalize">{r.targetPlan}</span>
                    <span className="text-foreground/55 font-bold ml-1">({r.billingCycle})</span>
                  </p>
                  <p className="text-[10px] text-foreground/55 font-medium truncate">
                    {r.userEmail} · current: {r.currentPlan ?? "—"}
                  </p>
                </div>
                <span className={cn(
                  "text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border",
                  r.status === "requested" && "bg-[#FFEFE0] text-[#7A1500] border-[#FF6A1F]",
                  r.status === "contacted" && "bg-[#E4E8FF] text-[#2533A8] border-[#3C50E0]",
                  r.status === "paid" && "bg-[#E6F7EE] text-[#0E8A4B] border-[#0E8A4B]",
                )}>{r.status}</span>
                <ChevronRight className="w-4 h-4 text-foreground/40 group-hover:text-foreground/70 group-hover:translate-x-0.5 transition" />
              </Link>
            ))}
            {pending.length > 3 && (
              <Link to="/admin/subscriptions" className="block text-center text-[10.5px] font-extrabold text-[#FF6A1F] py-1 hover:text-[#E85C12]">
                + {pending.length - 3} more
              </Link>
            )}
          </div>
        )}
      </div>

      {/* KPI grid — animated, with the most important one accented as "Live" */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <KPI label="Total users"        rawValue={m?.users ?? 0}         format="num" sub={`${m?.staff ?? 0} staff included`} icon={Users} color="indigo" />
        <KPI label="Workspaces active"  rawValue={m?.activeUsers ?? 0}    format="num" sub={`${m?.trial ?? 0} on trial`} icon={Building2} color="yellow" />
        <KPI label="Signups (7 din)"    rawValue={m?.signupsWeek ?? 0}    format="num" sub={`${m?.signups24h ?? 0} in last 24h`} icon={Sparkles} color="orange" accent />
        <KPI label="Suspended"          rawValue={m?.suspended ?? 0}      format="num" sub="Needs review" icon={ShieldOff} color="red" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KPI label="Messages (24h)"     rawValue={m?.messages24h ?? 0}    format="num" sub="Across all workspaces" icon={MessageSquare} color="indigo" />
        <KPI label="Deals won (24h)"    rawValue={m?.dealsWon24h ?? 0}    format="num" sub="₹ value in subs view" icon={Trophy} color="emerald" />
        <KPI label="Trial accounts"     rawValue={m?.trial ?? 0}          format="num" sub="Watch for conversion" icon={AlertTriangle} color="magenta" />
        <KPI label="Pending upgrades"   rawValue={pending.length}         format="num" sub={pending.length === 0 ? "Queue clear ✓" : "Process payment links"} icon={Crosshair} color="orange" />
      </div>

      {/* Bottom: recent activity (left) + quick links (right) */}
      <div className="grid lg:grid-cols-2 gap-3">
        {/* Live activity */}
        <div className="rounded-2xl bg-white border-2 border-[#3C50E0] shadow-[0_4px_0_0_#2533A8] overflow-hidden">
          <div className="px-4 py-3 border-b-2 border-[#3C50E0]/30 bg-[#E4E8FF] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#3C50E0] text-white flex items-center justify-center shadow-sm">
                <Activity className="w-4 h-4" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[13px] font-black tracking-tight">Live activity</p>
                <p className="text-[10px] text-foreground/60 font-bold">Last 6 staff actions · refreshes every 20s</p>
              </div>
            </div>
            <Link to="/admin/audit" className="text-[10.5px] font-extrabold text-[#3C50E0] hover:text-[#2533A8] flex items-center gap-0.5">
              Full log <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {auditQ.isLoading ? (
            <div className="px-4 py-10 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto text-[#3C50E0]" /></div>
          ) : audit.length === 0 ? (
            <p className="px-4 py-10 text-center text-[11.5px] text-foreground/55 italic">
              No actions yet. As staff use the panel, entries appear here in real time.
            </p>
          ) : (
            <ul className="divide-y divide-[#E8B968]/40">
              {audit.map((a) => (
                <li key={a.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-[#FFF6E8] transition">
                  <div className="w-7 h-7 rounded-lg bg-[#FFF1D6] border border-[#E8B968] flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px]">{ACTION_LABELS[a.action]?.split(" ")[0] ?? "•"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-extrabold leading-tight truncate">
                      {ACTION_LABELS[a.action]?.split(" ").slice(1).join(" ") ?? a.action}
                    </p>
                    <p className="text-[10px] text-foreground/55 font-medium font-mono truncate">
                      {a.targetUserId ?? "—"}
                    </p>
                  </div>
                  <span className="text-[10px] text-foreground/55 font-bold flex-shrink-0 tabular-nums">
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
    <div className="rounded-xl bg-white/12 backdrop-blur-sm border border-white/25 px-3 py-2">
      <p className="text-[9.5px] uppercase tracking-wider text-white/70 font-extrabold">{label}</p>
      <p className="text-xl font-black tabular-nums leading-tight">{Math.round(n).toLocaleString("en-IN")}</p>
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
      className={cn(
        "group block p-4 rounded-2xl bg-white border-2 transition-all hover:-translate-y-0.5",
        s.border, s.shadow, s.hoverShadow,
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-11 h-11 rounded-xl text-white flex items-center justify-center shadow-md transition-transform group-hover:scale-105 flex-shrink-0",
          s.iconBg,
        )}>
          <Icon className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-black tracking-tight">{title}</p>
          <p className="text-[11px] text-foreground/60 font-medium">{desc}</p>
        </div>
        {badge && (
          <span className="text-[9.5px] uppercase tracking-wider font-extrabold bg-[#FF6A1F] text-white rounded-full px-2 py-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFD23F] animate-pulse" />
            {badge}
          </span>
        )}
        <ArrowUpRight className="w-4 h-4 text-foreground/40 group-hover:text-foreground/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
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
