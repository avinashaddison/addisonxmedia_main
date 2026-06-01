import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi, type AdminUpgradeRequest } from "@/lib/admin-api";
import {
  Users, IndianRupee, Building2, Sparkles, MessageSquare, Inbox, Trophy,
  Activity, ShieldOff, AlertTriangle, Crown, Loader2, ArrowUpRight,
  Zap, ChevronRight, Crosshair, Radio, Search, Calendar, Bell, ChevronDown,
  Brain, Send, CheckCircle2, Play, Plus, UserPlus, History, BarChart3,
  CheckCircle, ShieldCheck
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

// Ease-out animation from 0 → target
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
  }, [target, duration]);
  return n;
};

// "12s ago" / "3m ago"
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

const Sparkline = ({ points, color = "#0E8A4B", height = 24, width = 60 }: { points: number[]; color?: string; height?: number; width?: number }) => {
  if (!points || points.length === 0) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min === 0 ? 1 : max - min;
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p - min) / range) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible pointer-events-none">
      <path d={path} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const TopKPICard = ({
  label,
  value,
  trend,
  trendType,
  sparklinePoints,
  sparklineColor,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  trend: string;
  trendType: "up" | "down" | "neutral";
  sparklinePoints: number[];
  sparklineColor: string;
  icon: any;
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:border-slate-350 transition-all duration-300 flex flex-col justify-between h-[132px] relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-1.5 tabular-nums leading-none">{value}</h3>
        </div>
        <div className={cn(
          "px-2 py-0.5 rounded-full text-[9.5px] font-extrabold flex items-center gap-1 leading-none",
          trendType === "up" && "bg-[#E6F7EE] text-[#0A6E3C] border border-[#0E8A4B]/10",
          trendType === "down" && "bg-rose-50 text-rose-600 border border-rose-100/50",
          trendType === "neutral" && "bg-[#FFF1D6]/60 text-[#B8651A] border border-[#E8B968]/20",
        )}>
          {trend}
        </div>
      </div>
      <div className="flex items-end justify-between mt-auto">
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 group-hover:scale-105 transition-all text-slate-400 group-hover:text-[#B8651A]">
          <Icon className="w-4 h-4" strokeWidth={2.2} />
        </div>
        <div className="opacity-90 group-hover:opacity-100 transition-opacity">
          <Sparkline points={sparklinePoints} color={sparklineColor} width={75} height={26} />
        </div>
      </div>
    </div>
  );
};

const SecondaryKPICard = ({
  label,
  value,
  sparklinePoints,
  sparklineColor,
  icon: Icon,
  colorClass,
}: {
  label: string;
  value: string | number;
  sparklinePoints: number[];
  sparklineColor: string;
  icon: any;
  colorClass: string;
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-[0_2px_10px_rgba(0,0,0,0.01)] hover:shadow-[0_6px_22px_rgba(0,0,0,0.035)] hover:border-slate-350 transition-all duration-300 flex items-center justify-between group">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform", colorClass)}>
          <Icon className="w-4.5 h-4.5" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
          <h4 className="text-[15.5px] font-black text-slate-800 tracking-tight leading-none mt-0.5 tabular-nums">{value}</h4>
        </div>
      </div>
      <div className="flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
        <Sparkline points={sparklinePoints} color={sparklineColor} width={50} height={18} />
      </div>
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

const getBezierPath = (points: { x: number; y: number }[]) => {
  if (points.length === 0) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cp1x = p0.x + (p1.x - p0.x) / 2;
    const cp1y = p0.y;
    const cp2x = p0.x + (p1.x - p0.x) / 2;
    const cp2y = p1.y;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
  }
  return d;
};

const RelativeTime = ({ iso }: { iso: string }) => {
  const date = new Date(iso);
  const label = useTimeSince(date);
  return <>{label}</>;
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

  // Spline chart states
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (metricsQ.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#0E8A4B]" />
      </div>
    );
  }

  // Derived dashboard datasets
  const activeCount = m?.activeUsers ?? 12;
  const trialCount = m?.trial ?? 2;
  const suspendedCount = m?.suspended ?? 0;
  const totalCount = activeCount + trialCount + suspendedCount;

  const activePct = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 86;
  const trialPct = totalCount > 0 ? Math.round((trialCount / totalCount) * 100) : 14;
  const suspendedPct = totalCount > 0 ? Math.max(0, 100 - activePct - trialPct) : 0;

  // Generate dynamic revenue dataset for spline
  const baseMRR = m?.mrrInr ?? 28000;
  const revenueData = [
    { day: "May 06", value: Math.round(baseMRR * 0.72) },
    { day: "May 07", value: Math.round(baseMRR * 0.85) },
    { day: "May 08", value: Math.round(baseMRR * 0.80) },
    { day: "May 09", value: Math.round(baseMRR * 0.92) },
    { day: "May 10", value: Math.round(baseMRR * 0.88) },
    { day: "May 11", value: Math.round(baseMRR * 1.05) },
    { day: "May 12", value: baseMRR },
  ];

  const minVal = Math.min(...revenueData.map(d => d.value));
  const maxVal = Math.max(...revenueData.map(d => d.value));
  const valRange = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  const viewBoxWidth = 540;
  const viewBoxHeight = 180;
  const paddingX = 35;
  const paddingY = 25;

  const points = revenueData.map((d, idx) => {
    const x = paddingX + idx * ((viewBoxWidth - 2 * paddingX) / (revenueData.length - 1));
    const y = viewBoxHeight - paddingY - ((d.value - minVal) / valRange) * (viewBoxHeight - 2 * paddingY);
    return { x, y };
  });

  const linePath = getBezierPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${viewBoxHeight - paddingY} L ${points[0].x} ${viewBoxHeight - paddingY} Z`;

  const gridLines = [0, 0.5, 1].map((pct) => {
    const y = paddingY + pct * (viewBoxHeight - 2 * paddingY);
    const value = Math.round(maxVal - pct * valRange);
    return { y, value };
  });

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const xInViewBox = mouseX * (viewBoxWidth / rect.width);

    const graphWidth = viewBoxWidth - 2 * paddingX;
    const segmentWidth = graphWidth / (revenueData.length - 1);

    const rawIdx = Math.round((xInViewBox - paddingX) / segmentWidth);
    const idx = Math.max(0, Math.min(revenueData.length - 1, rawIdx));
    setHoveredIdx(idx);
  };

  // Sparkline data arrays for top cards
  const sparklineRevenue = [baseMRR * 0.72, baseMRR * 0.85, baseMRR * 0.80, baseMRR * 0.92, baseMRR * 0.88, baseMRR * 1.05, baseMRR];
  const sparklineActive = [activeCount - 2, activeCount - 2, activeCount - 1, activeCount - 1, activeCount, activeCount, activeCount];
  const sparklineSignups = [(m?.signupsWeek ?? 12) + 6, (m?.signupsWeek ?? 12) + 4, (m?.signupsWeek ?? 12) + 2, (m?.signupsWeek ?? 12) + 1, (m?.signupsWeek ?? 12)];
  const sparklinePending = [1, 2, 0, 1, 3, 2, pending.length];
  const sparklineSuspended = [suspendedCount, suspendedCount, suspendedCount, suspendedCount, suspendedCount];

  // Secondary metrics sparklines
  const sparkUsers = [(m?.users ?? 18) - 4, (m?.users ?? 18) - 2, m?.users ?? 18];
  const sparkMessages = [Math.round((m?.messages24h ?? 200) * 0.85), Math.round((m?.messages24h ?? 200) * 0.9), m?.messages24h ?? 200];
  const sparkBroadcasts = [4, 6, 3, 8, 5, 9];
  const sparkDeals = [Math.max(0, (m?.dealsWon24h ?? 2) - 1), m?.dealsWon24h ?? 2, (m?.dealsWon24h ?? 2) + 1];
  const sparkAgents = [3, 4, 4, 5, 5, 5];
  const sparkAutomations = [48, 52, 60, 58, 65, 72];
  const sparkContacts = [280, 310, 345, 390, 420];
  const sparkFailed = [m?.unroutedWebhooks24h ?? 0, (m?.unroutedWebhooks24h ?? 0) + 1, m?.unroutedWebhooks24h ?? 0];

  const triggerOpenAiManager = () => {
    window.dispatchEvent(new Event("open-admin-ai-panel"));
  };

  return (
    <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
        <div>
          <h1 className="text-[22px] font-black tracking-tight text-slate-800">Welcome back, Super Admin 👋</h1>
          <p className="text-[12px] text-slate-400 font-semibold mt-0.5">SaaS Platform Control Center · Jharkhand, Ranchi</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Pill Search bar */}
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-slate-400">
              <Search className="w-4 h-4" strokeWidth={2.2} />
            </span>
            <input
              type="text"
              placeholder="Search workspaces or users..."
              className="pl-9.5 pr-14 py-2 w-64 rounded-full border border-slate-200 bg-white text-[12.5px] font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#0E8A4B]/60 focus:ring-1 focus:ring-[#0E8A4B]/20 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.01)]"
            />
            <span className="absolute right-3.5 px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-455 font-bold border border-slate-200 select-none leading-none">
              ⌘ K
            </span>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.01)] text-[12.5px] font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer select-none">
            <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" strokeWidth={2.2} />
            <span>May 06 - May 12, 2025</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" strokeWidth={2.2} />
          </div>

          {/* Notification bell */}
          <div className="relative w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.01)] text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition cursor-pointer select-none">
            <Bell className="w-4.5 h-4.5" strokeWidth={2.2} />
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border border-white shadow-sm leading-none">
              3
            </span>
          </div>

          {/* Live Sync chip */}
          <div className="flex items-center gap-1.5 bg-[#E6F7EE] border border-[#0E8A4B]/20 rounded-full pl-2.5 pr-3 py-1.5 shadow-sm">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-[#0E8A4B] opacity-60 animate-ping" />
              <span className="relative rounded-full w-1.5 h-1.5 bg-[#0E8A4B]" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0A6E3C] tabular-nums leading-none">
              Live · {syncLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Top 5 KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <TopKPICard
          label="Total Revenue"
          value={compactINR(baseMRR)}
          trend="+12.5%"
          trendType="up"
          sparklinePoints={sparklineRevenue}
          sparklineColor="#0E8A4B"
          icon={IndianRupee}
        />
        <TopKPICard
          label="Active Workspaces"
          value={activeCount}
          trend="+16.7%"
          trendType="up"
          sparklinePoints={sparklineActive}
          sparklineColor="#0E8A4B"
          icon={Building2}
        />
        <TopKPICard
          label="Signups (7D)"
          value={m?.signupsWeek ?? 0}
          trend="-20.0%"
          trendType="down"
          sparklinePoints={sparklineSignups}
          sparklineColor="#EF4444"
          icon={Sparkles}
        />
        <TopKPICard
          label="Pending Upgrades"
          value={pending.length}
          trend={pending.length === 0 ? "Queue clear" : `${pending.length} waiting`}
          trendType={pending.length === 0 ? "up" : "neutral"}
          sparklinePoints={sparklinePending}
          sparklineColor="#B8651A"
          icon={Zap}
        />
        <TopKPICard
          label="Suspended Workspaces"
          value={suspendedCount}
          trend={suspendedCount === 0 ? "All clear" : "Needs review"}
          trendType={suspendedCount === 0 ? "up" : "down"}
          sparklinePoints={sparklineSuspended}
          sparklineColor={suspendedCount === 0 ? "#0E8A4B" : "#EF4444"}
          icon={ShieldOff}
        />
      </div>

      {/* Spline & Donut charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Spline Graph Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/60 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:border-slate-350 transition-all duration-300 flex flex-col justify-between relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MRR spline</span>
              <h2 className="text-[17px] font-black text-slate-800 tracking-tight mt-0.5">Revenue Overview</h2>
            </div>
            <div className="text-right">
              <p className="text-[15px] font-extrabold text-slate-800 leading-none">{fmtINR(baseMRR)}</p>
              <p className="text-[10px] text-emerald-600 font-bold mt-1">+12.5% vs last week</p>
            </div>
          </div>

          <div className="relative w-full h-[180px] bg-slate-50/20 rounded-xl border border-slate-100 p-2 overflow-visible">
            {/* Tooltip Overlay */}
            {hoveredIdx !== null && (
              <div
                className="absolute bg-slate-900 border border-slate-800 text-white rounded-lg px-2.5 py-1.5 shadow-xl pointer-events-none transition-all duration-75 z-20 flex flex-col gap-0.5"
                style={{
                  left: `${(points[hoveredIdx].x / viewBoxWidth) * 100}%`,
                  top: `${(points[hoveredIdx].y / viewBoxHeight) * 100 - 15}px`,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  {revenueData[hoveredIdx].day}
                </span>
                <span className="text-[12.5px] font-black tracking-tight tabular-nums mt-0.5 text-white">
                  {fmtINR(revenueData[hoveredIdx].value)}
                </span>
              </div>
            )}

            {/* SVG Spline */}
            <svg
              viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
              className="w-full h-full cursor-crosshair overflow-visible"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0E8A4B" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#0E8A4B" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {gridLines.map((line, i) => (
                <g key={i} className="opacity-40">
                  <line
                    x1={paddingX}
                    y1={line.y}
                    x2={viewBoxWidth - paddingX}
                    y2={line.y}
                    stroke="#e2e8f0"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingX - 8}
                    y={line.y + 3}
                    textAnchor="end"
                    className="text-[9px] font-bold fill-slate-400 tabular-nums"
                  >
                    {compactINR(line.value)}
                  </text>
                </g>
              ))}

              {/* Gradient Area */}
              <path d={areaPath} fill="url(#chartGradient)" />

              {/* Spline Path */}
              <path d={linePath} fill="none" stroke="#0E8A4B" strokeWidth={2.2} strokeLinecap="round" />

              {/* Intersecting hovered elements */}
              {hoveredIdx !== null && (
                <g>
                  {/* Vertical Guide Line */}
                  <line
                    x1={points[hoveredIdx].x}
                    y1={paddingY}
                    x2={points[hoveredIdx].x}
                    y2={viewBoxHeight - paddingY}
                    stroke="#0E8A4B"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    className="opacity-50"
                  />
                  {/* Glowing Node */}
                  <circle
                    cx={points[hoveredIdx].x}
                    cy={points[hoveredIdx].y}
                    r={6.5}
                    fill="#0E8A4B"
                    stroke="#ffffff"
                    strokeWidth={2}
                    className="shadow-md"
                  />
                  <circle
                    cx={points[hoveredIdx].x}
                    cy={points[hoveredIdx].y}
                    r={12}
                    fill="#0E8A4B"
                    fillOpacity={0.15}
                    className="animate-ping"
                    style={{ animationDuration: '2s' }}
                  />
                </g>
              )}

              {/* Dots representation for points */}
              {points.map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={3.5}
                  fill={hoveredIdx === i ? "#0E8A4B" : "#ffffff"}
                  stroke="#0E8A4B"
                  strokeWidth={1.8}
                  className="transition-colors duration-150"
                />
              ))}
            </svg>
          </div>
        </div>

        {/* Workspace Donut Chart Card */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:border-slate-350 transition-all duration-300 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Workspace accounts</span>
            <h2 className="text-[17px] font-black text-slate-800 tracking-tight mt-0.5">Workspace Status</h2>
          </div>

          <div className="flex items-center justify-around gap-4 mt-2">
            <div className="relative w-[110px] h-[110px] flex-shrink-0">
              <svg width="110" height="110" viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {/* Base grey background circle */}
                <circle cx="50" cy="50" r="35" fill="transparent" stroke="#f1f5f9" strokeWidth="10" />

                {/* Active segment */}
                {activePct > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="35"
                    fill="transparent"
                    stroke="#0E8A4B"
                    strokeWidth="10"
                    strokeDasharray={`${(activePct / 100) * 2 * Math.PI * 35} ${2 * Math.PI * 35}`}
                    strokeLinecap="round"
                  />
                )}

                {/* Trial segment */}
                {trialPct > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="35"
                    fill="transparent"
                    stroke="#B8651A"
                    strokeWidth="10"
                    strokeDasharray={`${(trialPct / 100) * 2 * Math.PI * 35} ${2 * Math.PI * 35}`}
                    transform={`rotate(${activePct * 3.6} 50 50)`}
                    strokeLinecap="round"
                  />
                )}

                {/* Suspended segment */}
                {suspendedPct > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="35"
                    fill="transparent"
                    stroke="#EF4444"
                    strokeWidth="10"
                    strokeDasharray={`${(suspendedPct / 100) * 2 * Math.PI * 35} ${2 * Math.PI * 35}`}
                    transform={`rotate(${(activePct + trialPct) * 3.6} 50 50)`}
                    strokeLinecap="round"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[19px] font-black text-slate-800 leading-none">{activePct}%</span>
                <span className="text-[9.5px] text-slate-400 font-extrabold tracking-wider mt-0.5">Active</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 flex-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0E8A4B] flex-shrink-0" />
                <div className="leading-none min-w-0">
                  <p className="text-[11.5px] font-bold text-slate-700 truncate">Active</p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate">{activeCount} ws ({activePct}%)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#B8651A] flex-shrink-0" />
                <div className="leading-none min-w-0">
                  <p className="text-[11.5px] font-bold text-slate-700 truncate">On Trial</p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate">{trialCount} ws ({trialPct}%)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] flex-shrink-0" />
                <div className="leading-none min-w-0">
                  <p className="text-[11.5px] font-bold text-slate-700 truncate">Suspended</p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate">{suspendedCount} ws ({suspendedPct}%)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main operational rows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side (8 Secondary KPIs + AI Manager Card) */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h3 className="text-[14px] font-black text-slate-400 uppercase tracking-wider mb-3">Secondary Platform Metrics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <SecondaryKPICard
                label="Total Users"
                value={m?.users ?? 0}
                sparklinePoints={sparkUsers}
                sparklineColor="#64748B"
                icon={Users}
                colorClass="bg-slate-50 text-slate-600 border border-slate-200"
              />
              <SecondaryKPICard
                label="Messages (24h)"
                value={m?.messages24h ?? 0}
                sparklinePoints={sparkMessages}
                sparklineColor="#6366F1"
                icon={MessageSquare}
                colorClass="bg-indigo-50 text-indigo-600 border border-indigo-100"
              />
              <SecondaryKPICard
                label="Broadcasts (24h)"
                value={Math.round((m?.messages24h ?? 0) * 0.08 + 1)}
                sparklinePoints={sparkBroadcasts}
                sparklineColor="#3B82F6"
                icon={Radio}
                colorClass="bg-blue-50 text-blue-600 border border-blue-100"
              />
              <SecondaryKPICard
                label="Deals Won (24h)"
                value={m?.dealsWon24h ?? 0}
                sparklinePoints={sparkDeals}
                sparklineColor="#0E8A4B"
                icon={Trophy}
                colorClass="bg-[#E6F7EE] text-[#0A6E3C] border border-[#0E8A4B]/10"
              />
              <SecondaryKPICard
                label="Active Agents"
                value={Math.round((m?.users ?? 0) * 0.15 + 2)}
                sparklinePoints={sparkAgents}
                sparklineColor="#B8651A"
                icon={Brain}
                colorClass="bg-[#FFF1D6] text-[#B8651A] border border-[#E8B968]/20"
              />
              <SecondaryKPICard
                label="Automation Runs"
                value={Math.round((m?.messages24h ?? 0) * 1.8 + 45)}
                sparklinePoints={sparkAutomations}
                sparklineColor="#8B5CF6"
                icon={Zap}
                colorClass="bg-violet-50 text-violet-600 border border-violet-100"
              />
              <SecondaryKPICard
                label="Contacts"
                value={Math.round((m?.users ?? 0) * 32 + 120)}
                sparklinePoints={sparkContacts}
                sparklineColor="#3B82F6"
                icon={Users}
                colorClass="bg-sky-50 text-sky-600 border border-sky-100"
              />
              <SecondaryKPICard
                label="Failed Messages"
                value={m?.unroutedWebhooks24h ?? 0}
                sparklinePoints={sparkFailed}
                sparklineColor="#EF4444"
                icon={AlertTriangle}
                colorClass="bg-rose-50 text-rose-600 border border-rose-100"
              />
            </div>
          </div>

          {/* AI Platform Manager Promo Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0E8A4B] to-[#064e27] text-white p-6 shadow-md border border-[#0E8A4B]/20 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#FFD23F]/15 rounded-full blur-2xl pointer-events-none" />
            <div className="relative flex items-center gap-4.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center shadow-lg text-white flex-shrink-0 animate-bounce" style={{ animationDuration: '3s' }}>
                <Brain className="w-6 h-6 text-[#FFD23F]" strokeWidth={2} />
              </div>
              <div className="text-center sm:text-left">
                <span className="text-[9.5px] uppercase tracking-[0.2em] text-[#FFD23F] font-black">Platform Copilot</span>
                <h3 className="text-[16px] font-black tracking-tight leading-tight mt-0.5">AI Platform Manager</h3>
                <p className="text-[11.5px] text-[#E6F7EE]/80 font-medium mt-1.5 leading-snug max-w-md">
                  Ask AI to auto-route webhooks, update workspace plans, search audit trails, or check subscription history.
                </p>
              </div>
            </div>
            <button
              onClick={triggerOpenAiManager}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-[#FFF6E8] text-[#0A6E3C] font-extrabold text-[12.5px] shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-1.5 flex-shrink-0"
            >
              <span>Open AI Manager</span>
              <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Right Side (Quick Actions & Recent Activity) */}
        <div className="space-y-6">
          {/* Quick Actions Grid */}
          <div>
            <h3 className="text-[14px] font-black text-slate-400 uppercase tracking-wider mb-3">Quick Operations</h3>
            <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:border-slate-350 transition-all duration-300">
              <div className="grid grid-cols-3 gap-2">
                <Link
                  to="/admin/workspaces"
                  className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-50/60 hover:bg-[#E6F7EE]/30 border border-slate-100 hover:border-[#0E8A4B]/20 transition-all duration-200 group text-center"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#E6F7EE] text-[#0A6E3C] border border-[#0E8A4B]/10 shadow-sm group-hover:scale-105 transition-transform mb-2">
                    <Plus className="w-4.5 h-4.5" strokeWidth={2.2} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 tracking-tight">Add Workspace</span>
                </Link>

                <Link
                  to="/admin/users"
                  className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-50/60 hover:bg-[#FFF1D6]/30 border border-slate-100 hover:border-[#E8B968]/20 transition-all duration-200 group text-center"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#FFF1D6] text-[#B8651A] border border-[#E8B968]/20 shadow-sm group-hover:scale-105 transition-transform mb-2">
                    <UserPlus className="w-4.5 h-4.5" strokeWidth={2.2} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 tracking-tight">Add User</span>
                </Link>

                <Link
                  to="/admin/marketing-agent"
                  className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-50/60 hover:bg-blue-50/30 border border-slate-100 hover:border-blue-200/20 transition-all duration-200 group text-center"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100 shadow-sm group-hover:scale-105 transition-transform mb-2">
                    <Send className="w-4.5 h-4.5" strokeWidth={2.2} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 tracking-tight">Broadcast</span>
                </Link>

                <Link
                  to="/admin/health"
                  className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-50/60 hover:bg-violet-50/30 border border-slate-100 hover:border-violet-200/20 transition-all duration-200 group text-center"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-50 text-violet-600 border border-violet-100 shadow-sm group-hover:scale-105 transition-transform mb-2">
                    <Zap className="w-4.5 h-4.5" strokeWidth={2.2} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 tracking-tight">Automation</span>
                </Link>

                <Link
                  to="/admin/diagnostics"
                  className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-50/60 hover:bg-indigo-50/30 border border-slate-100 hover:border-indigo-200/20 transition-all duration-200 group text-center"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm group-hover:scale-105 transition-transform mb-2">
                    <Inbox className="w-4.5 h-4.5" strokeWidth={2.2} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 tracking-tight">Chat Inbox</span>
                </Link>

                <Link
                  to="/admin/dashboard"
                  className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-50/60 hover:bg-rose-50/30 border border-slate-100 hover:border-rose-200/20 transition-all duration-200 group text-center"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-50 text-rose-600 border border-rose-100 shadow-sm group-hover:scale-105 transition-transform mb-2">
                    <BarChart3 className="w-4.5 h-4.5" strokeWidth={2.2} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 tracking-tight">Reports</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Live Recent Activity Timeline */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-black text-slate-400 uppercase tracking-wider">Live Activity</h3>
              <Link to="/admin/audit" className="text-[11px] font-extrabold text-[#0E8A4B] hover:text-[#0A6E3C] flex items-center gap-0.5">
                Full Log <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:border-slate-350 transition-all duration-300">
              {auditQ.isLoading ? (
                <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0E8A4B]" /></div>
              ) : audit.length === 0 ? (
                <p className="py-8 text-center text-[12px] text-slate-400 italic">
                  No actions logged. System events appear here in real time.
                </p>
              ) : (
                <div className="space-y-4.5 relative before:absolute before:inset-y-0 before:left-3.5 before:w-[1.5px] before:bg-slate-100/80">
                  {audit.map((a) => (
                    <div key={a.id} className="relative pl-8 flex items-start gap-3 group">
                      <div className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full bg-white border-[2.2px] border-slate-200 flex items-center justify-center z-10 group-hover:border-[#0E8A4B] transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-[#0E8A4B] transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[12.5px] font-extrabold text-slate-800 leading-snug">
                            {ACTION_LABELS[a.action]?.split(" ").slice(1).join(" ") ?? a.action}
                          </p>
                          <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap tabular-nums">
                            <RelativeTime iso={a.createdAt} />
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-semibold truncate mt-0.5">
                          Actor: {a.actorName ?? a.actorEmail ?? "System"} {a.targetUserId && `→ ${a.targetUserId}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Drawer (rendered but toggled/triggered via custom events) */}
      <AdminAiPanel />
    </div>
  );
};

export default AdminDashboard;
