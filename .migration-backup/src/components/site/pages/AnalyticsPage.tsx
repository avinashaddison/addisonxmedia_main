/**
 * Site Analytics dashboard — views / leads / orders / revenue + funnel + top
 * sources + daily timeseries (last 7 / 30 / 90 days, toggle in header).
 *
 * Data comes from site_analytics_event (logged on every view/lead/order).
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3, Loader2, TrendingUp, TrendingDown, Minus, Eye, ClipboardList,
  ShoppingCart, IndianRupee, Globe, Inbox, RefreshCcw,
} from "lucide-react";
import { api, type AnalyticsCounters } from "@/lib/api";
import { cn } from "@/lib/utils";

const RANGES = [
  { id: 7,  label: "7d" },
  { id: 30, label: "30d" },
  { id: 90, label: "90d" },
];

export const AnalyticsPage = () => {
  const [days, setDays] = useState(30);

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ["site-analytics-summary", days],
    queryFn: () => api.getSiteAnalyticsSummary(days),
    refetchInterval: 60_000,
  });
  const { data: timeseries = [], isLoading: loadingTs } = useQuery({
    queryKey: ["site-analytics-timeseries", days],
    queryFn: () => api.getSiteAnalyticsTimeseries(days),
  });
  const { data: sources = [] } = useQuery({
    queryKey: ["site-analytics-sources", days],
    queryFn: () => api.getSiteAnalyticsSources(days),
  });
  const { data: topPages = [] } = useQuery({
    queryKey: ["site-analytics-top-pages", days],
    queryFn: () => api.getSiteAnalyticsTopPages(days),
  });

  const curr = summary?.current;
  const prev = summary?.previous;

  // Conversion percentages
  const conversion = useMemo(() => {
    if (!curr) return { viewToOrder: 0, viewToLead: 0 };
    const v = Number(curr.views);
    return {
      viewToOrder: v > 0 ? (Number(curr.orders) / v) * 100 : 0,
      viewToLead: v > 0 ? (Number(curr.leads) / v) * 100 : 0,
    };
  }, [curr]);

  // Max for sparkline scaling
  const maxViews = useMemo(() => Math.max(1, ...timeseries.map((d) => Number(d.views))), [timeseries]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#FFF6E8]">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0 bg-[#0E8A4B]">
            <BarChart3 className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-black leading-tight">Site Analytics</h1>
            <p className="text-[14px] text-foreground/70 font-medium mt-1">
              Views, leads, orders and revenue from your public site — live, updates every minute.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968]">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setDays(r.id)}
                className={cn(
                  "px-3 h-8 rounded-lg text-[11.5px] font-extrabold transition",
                  days === r.id ? "bg-[#0E8A4B] text-white" : "text-foreground/65 hover:bg-[#FFE8C7]"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => refetchSummary()}
            disabled={loadingSummary}
            className="hidden sm:inline-flex w-11 h-11 rounded-xl bg-white border-2 border-[#E8B968] text-foreground/65 hover:bg-[#FFE8C7] disabled:opacity-50 items-center justify-center transition"
            title="Refresh"
          >
            {loadingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
          </button>
        </div>

        {/* Mobile range picker */}
        <div className="sm:hidden flex items-center gap-1 p-1 rounded-xl bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] w-fit">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setDays(r.id)}
              className={cn(
                "px-3 h-8 rounded-lg text-[11.5px] font-extrabold transition",
                days === r.id ? "bg-[#0E8A4B] text-white" : "text-foreground/65"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Views" value={curr?.views || "0"} prev={prev?.views} icon={Eye} accent="#3C50E0" />
          <StatCard label="Leads" value={curr?.leads || "0"} prev={prev?.leads} icon={ClipboardList} accent="#FF6A1F" />
          <StatCard label="Orders" value={curr?.orders || "0"} prev={prev?.orders} icon={ShoppingCart} accent="#0E8A4B" />
          <StatCard label="Revenue" value={`₹${Math.round(Number(curr?.revenue || 0)).toLocaleString("en-IN")}`}
                    prev={prev?.revenue} prefix="₹" icon={IndianRupee} accent="#D4308E" />
        </div>

        {/* Funnel + Unique Visitors */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/55 mb-3">Conversion funnel</p>
            <FunnelRow label="Views" value={Number(curr?.views || 0)} max={Number(curr?.views || 0) || 1} color="#3C50E0" />
            <FunnelRow label="Lead form fills" value={Number(curr?.leads || 0)} max={Number(curr?.views || 0) || 1} color="#FF6A1F"
                       sub={`${conversion.viewToLead.toFixed(1)}% of views`} />
            <FunnelRow label="Orders placed" value={Number(curr?.orders || 0)} max={Number(curr?.views || 0) || 1} color="#0E8A4B"
                       sub={`${conversion.viewToOrder.toFixed(2)}% of views`} />
          </div>
          <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/55 mb-2">Unique visitors</p>
            <p className="text-[36px] font-black leading-none tabular-nums text-[#3C50E0]">
              {Number(curr?.unique_visitors || 0).toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-foreground/55 mt-2">In the last {days} days. Counted by 24h-rotating IP hash.</p>
          </div>
          <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/55 mb-2">Avg order value</p>
            <p className="text-[36px] font-black leading-none tabular-nums text-[#0E8A4B]">
              ₹{Math.round(Number(curr?.orders || 0) > 0 ? Number(curr?.revenue || 0) / Number(curr?.orders || 1) : 0).toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-foreground/55 mt-2">Revenue ÷ orders, last {days} days.</p>
          </div>
        </div>

        {/* Daily breakdown chart */}
        <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/55 mb-4">Daily views</p>
          {loadingTs ? (
            <div className="h-40 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-foreground/40" /></div>
          ) : timeseries.length === 0 ? (
            <p className="text-[12px] text-foreground/50 italic">No data yet for this range.</p>
          ) : (
            <div className="flex items-end gap-1 h-40">
              {timeseries.map((d) => {
                const h = Math.max(2, (Number(d.views) / maxViews) * 100);
                return (
                  <div key={d.day} className="flex-1 flex flex-col items-center justify-end group relative">
                    <div className="absolute -top-7 text-[10px] font-extrabold opacity-0 group-hover:opacity-100 transition bg-foreground text-white px-1.5 py-0.5 rounded whitespace-nowrap">
                      {d.views} views · {d.orders} orders
                    </div>
                    <div className="w-full rounded-t transition hover:brightness-110" style={{ height: `${h}%`, background: "#3C50E0" }} />
                    <span className="text-[8.5px] font-mono text-foreground/40 mt-1 truncate w-full text-center">{d.day.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top sources + Top pages */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/55 mb-3 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> Top sources
            </p>
            {sources.length === 0 ? (
              <EmptyHint />
            ) : (
              <ul className="space-y-1.5">
                {sources.map((s) => (
                  <li key={s.source} className="flex items-center gap-2 text-[12.5px]">
                    <span className="font-extrabold truncate flex-1">{s.source}</span>
                    <span className="font-bold tabular-nums text-foreground/65">{Number(s.views).toLocaleString("en-IN")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/55 mb-3 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Top pages
            </p>
            {topPages.length === 0 ? (
              <EmptyHint />
            ) : (
              <ul className="space-y-1.5">
                {topPages.map((p) => (
                  <li key={p.path} className="flex items-center gap-2 text-[12.5px]">
                    <span className="font-mono truncate flex-1">{p.path}</span>
                    <span className="font-bold tabular-nums text-foreground/65">{Number(p.views).toLocaleString("en-IN")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Stat card ─────────────────────────────────────────────────────────────

const StatCard = ({ label, value, prev, icon: Icon, accent, prefix }: {
  label: string; value: string; prev?: string; icon: any; accent: string; prefix?: string;
}) => {
  const v = Number(prefix ? value.replace(/[^0-9.-]/g, "") : value);
  const p = Number(prev || 0);
  const diff = p > 0 ? ((v - p) / p) * 100 : (v > 0 ? 100 : 0);
  const Trend = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const trendColor = diff > 0 ? "#0E8A4B" : diff < 0 ? "#D4308E" : "#A0A0A0";

  return (
    <div className="p-4 rounded-2xl bg-white border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968]">
      <div className="flex items-center justify-between mb-1.5">
        <Icon className="w-4 h-4" style={{ color: accent }} strokeWidth={2.5} />
        {prev !== undefined && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold" style={{ color: trendColor }}>
            <Trend className="w-2.5 h-2.5" />
            {Math.abs(diff).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="text-[24px] font-black tabular-nums leading-none">{value}</p>
      <p className="text-[10px] font-extrabold uppercase tracking-wider mt-1.5" style={{ color: accent }}>{label}</p>
    </div>
  );
};

const FunnelRow = ({ label, value, max, color, sub }: { label: string; value: number; max: number; color: string; sub?: string }) => (
  <div className="mb-2.5 last:mb-0">
    <div className="flex items-baseline justify-between mb-1">
      <span className="text-[12px] font-bold">{label}</span>
      <span className="text-[13px] font-extrabold tabular-nums">{value.toLocaleString("en-IN")}</span>
    </div>
    <div className="h-2 rounded bg-foreground/5 overflow-hidden">
      <div className="h-full rounded transition-all" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} />
    </div>
    {sub && <p className="text-[10px] text-foreground/45 mt-0.5">{sub}</p>}
  </div>
);

const EmptyHint = () => (
  <div className="py-6 flex flex-col items-center gap-1 text-foreground/40">
    <Inbox className="w-5 h-5" />
    <p className="text-[11px] font-bold">No data yet for this range</p>
  </div>
);
