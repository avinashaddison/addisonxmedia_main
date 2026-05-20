/**
 * Full campaign analytics page — /app/ads/:id
 *
 * Pulls everything in parallel from /api/ads/campaigns/:id/analytics:
 *   - Campaign metadata + status
 *   - Top-line KPIs (spend, impressions, clicks, CTR, CPC, reach, results)
 *   - Daily time-series (spend + clicks + results)
 *   - Demographic breakdown (age × gender)
 *   - Placement breakdown (FB Feed vs IG Stories vs Reels etc.)
 *   - Per-ad performance (which creative is winning)
 *
 * Falls back to a realistic demo dataset when Meta isn't connected so
 * the page never empty-states.
 */

import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, ArrowUpRight, IndianRupee, Eye, MousePointerClick, Target,
  Loader2, Pause, Play, Users, MapPin, Sparkles, BarChart3, TrendingUp,
  Info, Calendar, ChevronDown,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const compactINR = (n: number) => {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
};

const compactNum = (n: number) => {
  if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(1)} Cr`;
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)} L`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

const RANGE_OPTIONS = [
  { id: "last_7d", label: "Last 7 days" },
  { id: "last_14d", label: "Last 14 days" },
  { id: "last_30d", label: "Last 30 days" },
  { id: "last_90d", label: "Last 90 days" },
] as const;

export const CampaignAnalyticsPage = () => {
  // Index.tsx mounts /app/* as a wildcard and parses paths manually, so
  // useParams isn't populated. Extract the campaign id from /app/ads/:id.
  const location = useLocation();
  const id = location.pathname.replace(/^\/app\/ads\/?/, "").split("/")[0] || "";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [range, setRange] = useState<"last_7d" | "last_14d" | "last_30d" | "last_90d">("last_30d");

  const analyticsQ = useQuery({
    queryKey: ["ads", "analytics", id, range],
    queryFn: () => api.getCampaignAnalytics(id!, range),
    enabled: !!id,
  });

  const togglePause = useMutation({
    mutationFn: (status: "ACTIVE" | "PAUSED") => api.updateAdCampaign(id!, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ads"] });
      toast.success("Campaign status updated");
    },
    onError: (e) => toast.error(String(e)),
  });

  if (!id) return null;

  if (analyticsQ.isPending) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#FFF6E8]">
        <Loader2 className="w-7 h-7 animate-spin text-[#FF6A1F]" />
      </div>
    );
  }

  const data = analyticsQ.data;
  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#FFF6E8]">
        <div className="text-center">
          <p className="text-[14px] font-extrabold">Campaign not found</p>
          <Button variant="outline" className="mt-3" onClick={() => navigate("/app/ads")}>← Back to Ads</Button>
        </div>
      </div>
    );
  }

  const isActive = data.campaign?.effective_status === "ACTIVE" || data.campaign?.status === "ACTIVE";
  const isDemo = data.demo;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#FFF6E8]">
      {/* Top bar */}
      <div className="border-b-2 border-[#E8B968] bg-white px-6 lg:px-10 py-3 flex items-center gap-3 sticky top-0 z-20">
        <button
          onClick={() => navigate("/app/ads")}
          className="w-9 h-9 rounded-xl bg-[#FFF1D6] border-2 border-[#E8B968] flex items-center justify-center hover:bg-[#FFE8C7] transition flex-shrink-0"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4 text-[#B8651A]" strokeWidth={2.5} />
        </button>
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF6A1F] to-[#E85C12] text-white flex items-center justify-center shadow-md flex-shrink-0">
          <BarChart3 className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[18px] font-black tracking-tight leading-tight truncate">{data.campaign?.name ?? id}</h1>
            <StatusBadge status={data.campaign?.effective_status ?? data.campaign?.status ?? "UNKNOWN"} />
          </div>
          <p className="text-[11px] text-foreground/60 font-medium">
            {data.campaign?.objective?.replace(/^OUTCOME_/, "").replace(/_/g, " ").toLowerCase() ?? "Campaign"}
            {data.campaign?.daily_budget && ` · ${fmtINR(Number(data.campaign.daily_budget) / 100)}/day`}
            {data.campaign?.created_time && ` · started ${new Date(data.campaign.created_time).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
          </p>
        </div>
        {!isDemo && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => togglePause.mutate(isActive ? "PAUSED" : "ACTIVE")}
            disabled={togglePause.isPending}
          >
            {togglePause.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />)}
            {isActive ? "Pause" : "Resume"}
          </Button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 lg:px-10 py-6">
        <div className="max-w-[1400px] mx-auto space-y-5">
          {/* Demo banner */}
          {isDemo && (
            <div className="bg-[#FFF1D6] border-2 border-[#E8B968] rounded-xl px-4 py-2.5 flex items-center gap-2.5 text-[12px]">
              <Info className="w-4 h-4 text-[#B8651A] flex-shrink-0" />
              <p className="font-medium text-foreground/80">
                Demo data. Connect Meta Ads to see real campaign performance.
              </p>
            </div>
          )}

          {/* Range selector */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-[14px] font-black tracking-tight">Performance overview</h2>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-foreground/60" />
              <Select value={range} onValueChange={(v) => setRange(v as typeof range)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RANGE_OPTIONS.map((r) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <KPI label="Total spend" value={compactINR(data.totals.spend)} sub={`${fmtINR(data.totals.cpm)} CPM`} icon={IndianRupee} color="#FF6A1F" />
            <KPI label="Impressions" value={compactNum(data.totals.impressions)} sub={`${compactNum(data.totals.reach)} reach`} icon={Eye} color="#3C50E0" />
            <KPI label="Clicks" value={compactNum(data.totals.clicks)} sub={`${data.totals.ctr.toFixed(2)}% CTR`} icon={MousePointerClick} color="#D4308E" />
            <KPI label="Cost / click" value={data.totals.cpc > 0 ? fmtINR(data.totals.cpc) : "—"} sub={data.totals.frequency > 0 ? `${data.totals.frequency.toFixed(1)} frequency` : ""} icon={Target} color="#7A1500" />
            <KPI label="Results" value={compactNum(data.totals.results)} sub={data.totals.results > 0 ? `${fmtINR(data.totals.spend / data.totals.results)} CPR` : "—"} icon={Sparkles} color="#0E8A4B" highlight />
          </div>

          {/* Time series */}
          <Card title="Daily performance" subtitle={`${data.daily.length} day${data.daily.length === 1 ? "" : "s"} of delivery`}>
            {data.daily.length === 0 ? (
              <div className="text-center py-8 text-[12px] text-foreground/60">
                No daily data yet — Meta needs ~24 hours after launch to start reporting
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.daily} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid stroke="#E8B968" strokeOpacity={0.3} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    fontSize={10}
                    stroke="#7A4A00"
                  />
                  <YAxis yAxisId="left" fontSize={10} stroke="#7A4A00" tickFormatter={(v) => compactINR(v)} />
                  <YAxis yAxisId="right" orientation="right" fontSize={10} stroke="#7A4A00" tickFormatter={(v) => compactNum(v)} />
                  <Tooltip
                    contentStyle={{ background: "#fff", border: "2px solid #E8B968", borderRadius: 12, fontSize: 12, fontWeight: 700 }}
                    formatter={(v: number, name: string) => name === "spend" ? fmtINR(v) : compactNum(v)}
                    labelFormatter={(d) => new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  <Line yAxisId="left" type="monotone" dataKey="spend" stroke="#FF6A1F" strokeWidth={2.5} dot={{ r: 3, fill: "#FF6A1F" }} name="Spend (₹)" />
                  <Line yAxisId="right" type="monotone" dataKey="clicks" stroke="#3C50E0" strokeWidth={2} dot={{ r: 2.5, fill: "#3C50E0" }} name="Clicks" />
                  <Line yAxisId="right" type="monotone" dataKey="results" stroke="#0E8A4B" strokeWidth={2} dot={{ r: 2.5, fill: "#0E8A4B" }} name="Results" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Demographics */}
          <div className="grid lg:grid-cols-2 gap-5">
            <Card title="By age" subtitle="Click rate distribution across age buckets" icon={Users} iconColor="#3C50E0">
              <AgeBreakdown rows={data.by_age_gender} />
            </Card>
            <Card title="By gender" subtitle="Spend distribution male vs female" icon={Users} iconColor="#D4308E">
              <GenderBreakdown rows={data.by_age_gender} />
            </Card>
          </div>

          {/* Placement */}
          <Card title="By placement" subtitle="Which platforms + ad positions deliver best" icon={MapPin} iconColor="#0E8A4B">
            <PlacementBreakdown rows={data.by_placement} />
          </Card>

          {/* Ads */}
          <Card title={`Ads in this campaign (${data.ads.length})`} subtitle="Per-creative performance — promote the winners" icon={TrendingUp} iconColor="#FF6A1F">
            {data.ads.length === 0 ? (
              <div className="text-center py-8 text-[12px] text-foreground/60">
                No ads in this campaign yet
              </div>
            ) : (
              <div className="space-y-2">
                {data.ads.sort((a, b) => b.spend - a.spend).map((ad) => (
                  <AdRow key={ad.id} ad={ad} />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

/* ─────────── Building blocks ─────────── */

const StatusBadge = ({ status }: { status: string }) => {
  const s = status.toUpperCase();
  const map: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    ACTIVE:               { bg: "bg-[#E6F7EE]", text: "text-[#0A6E3C]", dot: "bg-[#0E8A4B] animate-pulse", label: "Active" },
    PAUSED:               { bg: "bg-[#FFF1D6]", text: "text-[#B8651A]", dot: "bg-[#B8651A]", label: "Paused" },
    PENDING_REVIEW:       { bg: "bg-[#FFF8DD]", text: "text-[#7A4A00]", dot: "bg-[#FFD23F]", label: "In review" },
    IN_PROCESS:           { bg: "bg-[#FFF8DD]", text: "text-[#7A4A00]", dot: "bg-[#FFD23F]", label: "Processing" },
    DELETED:              { bg: "bg-[#FCE5F0]", text: "text-[#A11A6A]", dot: "bg-[#D4308E]", label: "Deleted" },
    ARCHIVED:             { bg: "bg-[#FCE5F0]", text: "text-[#A11A6A]", dot: "bg-[#D4308E]", label: "Archived" },
  };
  const c = map[s] ?? { bg: "bg-[#E4E8FF]", text: "text-[#2533A8]", dot: "bg-[#3C50E0]", label: status };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider", c.bg, c.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
};

const KPI = ({
  label, value, sub, icon: Icon, color, highlight,
}: { label: string; value: string; sub: string; icon: typeof Target; color: string; highlight?: boolean }) => (
  <div className="bg-white border-2 rounded-2xl p-3.5 relative" style={{ borderColor: color, boxShadow: `0 4px 0 0 ${color}` }}>
    <div className="flex items-center justify-between mb-2.5">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: color }}>
        <Icon className="w-4 h-4" strokeWidth={2.5} />
      </div>
    </div>
    <p className="text-[10px] uppercase tracking-[0.15em] text-foreground/60 font-extrabold">{label}</p>
    <p className={cn("text-2xl font-black tracking-tight tabular-nums mt-0.5", highlight && "text-[#0A6E3C]")}>{value}</p>
    {sub && <p className="text-[10px] text-foreground/60 font-medium mt-0.5">{sub}</p>}
  </div>
);

const Card = ({
  title, subtitle, icon: Icon, iconColor, children,
}: { title: string; subtitle?: string; icon?: typeof Target; iconColor?: string; children: React.ReactNode }) => (
  <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_4px_0_0_#E8B968] overflow-hidden">
    <div className="px-4 py-3 border-b-2 border-[#E8B968] bg-[#FFF1D6] flex items-center gap-2.5">
      {Icon && (
        <div className="w-8 h-8 rounded-lg text-white flex items-center justify-center shadow-sm" style={{ background: iconColor }}>
          <Icon className="w-4 h-4" strokeWidth={2.5} />
        </div>
      )}
      <div>
        <h3 className="text-[13px] font-black tracking-tight">{title}</h3>
        {subtitle && <p className="text-[11px] text-foreground/60 font-medium">{subtitle}</p>}
      </div>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const AgeBreakdown = ({ rows }: { rows: Array<{ age: string; gender: string; spend: number; impressions: number; clicks: number }> }) => {
  const byAge = useMemo(() => {
    const map = new Map<string, { spend: number; impressions: number; clicks: number }>();
    for (const r of rows) {
      const cur = map.get(r.age) ?? { spend: 0, impressions: 0, clicks: 0 };
      cur.spend += r.spend;
      cur.impressions += r.impressions;
      cur.clicks += r.clicks;
      map.set(r.age, cur);
    }
    return Array.from(map.entries()).map(([age, v]) => ({ age, ...v, ctr: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0 })).sort((a, b) => a.age.localeCompare(b.age));
  }, [rows]);

  if (byAge.length === 0) return <p className="text-[12px] text-foreground/60 text-center py-6">No demographic data yet</p>;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={byAge} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
        <CartesianGrid stroke="#E8B968" strokeOpacity={0.3} vertical={false} />
        <XAxis dataKey="age" fontSize={10} stroke="#7A4A00" />
        <YAxis fontSize={10} stroke="#7A4A00" tickFormatter={(v) => compactNum(v)} />
        <Tooltip
          contentStyle={{ background: "#fff", border: "2px solid #E8B968", borderRadius: 12, fontSize: 12, fontWeight: 700 }}
          formatter={(v: number) => compactNum(v)}
        />
        <Bar dataKey="clicks" fill="#3C50E0" radius={[6, 6, 0, 0]} name="Clicks" />
      </BarChart>
    </ResponsiveContainer>
  );
};

const GenderBreakdown = ({ rows }: { rows: Array<{ age: string; gender: string; spend: number; impressions: number; clicks: number }> }) => {
  const byGender = useMemo(() => {
    const map = new Map<string, { spend: number; impressions: number; clicks: number }>();
    for (const r of rows) {
      const g = r.gender || "unknown";
      const cur = map.get(g) ?? { spend: 0, impressions: 0, clicks: 0 };
      cur.spend += r.spend;
      cur.impressions += r.impressions;
      cur.clicks += r.clicks;
      map.set(g, cur);
    }
    const total = Array.from(map.values()).reduce((a, b) => a + b.spend, 0);
    return Array.from(map.entries()).map(([gender, v]) => ({ gender, ...v, pct: total > 0 ? (v.spend / total) * 100 : 0 }));
  }, [rows]);

  if (byGender.length === 0) return <p className="text-[12px] text-foreground/60 text-center py-6">No gender data yet</p>;

  const colors: Record<string, string> = { male: "#3C50E0", female: "#D4308E", unknown: "#B8651A" };

  return (
    <div className="space-y-3 py-2">
      {byGender.map((g) => (
        <div key={g.gender}>
          <div className="flex items-center justify-between text-[12px] font-extrabold mb-1.5">
            <span className="capitalize flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: colors[g.gender] }} />
              {g.gender}
            </span>
            <span className="tabular-nums">
              <span className="text-foreground/60 font-medium mr-2">{compactINR(g.spend)}</span>
              {g.pct.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 bg-[#FFF1D6] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${g.pct}%`, background: colors[g.gender] }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const PlacementBreakdown = ({ rows }: { rows: Array<{ platform: string; position: string; spend: number; impressions: number; clicks: number }> }) => {
  if (rows.length === 0) return <p className="text-[12px] text-foreground/60 text-center py-6">No placement data yet</p>;
  const total = rows.reduce((a, b) => a + b.spend, 0);
  const sorted = [...rows].sort((a, b) => b.spend - a.spend);
  const colors: Record<string, string> = { facebook: "#0866FF", instagram: "#D4308E", audience_network: "#FF6A1F", messenger: "#0E8A4B" };
  return (
    <div className="space-y-2.5">
      {sorted.map((r, i) => {
        const pct = total > 0 ? (r.spend / total) * 100 : 0;
        const ctr = r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0;
        return (
          <div key={`${r.platform}-${r.position}-${i}`}>
            <div className="flex items-center justify-between text-[12px] font-extrabold mb-1">
              <span className="capitalize flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: colors[r.platform] ?? "#7A1500" }} />
                {r.platform} · {r.position?.replace(/_/g, " ") ?? "—"}
              </span>
              <span className="tabular-nums">
                <span className="text-foreground/60 font-medium mr-3">{compactNum(r.clicks)} clicks · {ctr.toFixed(2)}%</span>
                {compactINR(r.spend)}
              </span>
            </div>
            <div className="h-2 bg-[#FFF1D6] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: colors[r.platform] ?? "#7A1500" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AdRow = ({ ad }: { ad: { id: string; name: string; effective_status: string; spend: number; impressions: number; clicks: number; ctr: number; cpc: number; results: number } }) => (
  <div className="grid grid-cols-[1.6fr_120px_100px_100px_100px_100px] gap-3 px-3 py-2.5 rounded-xl border-2 border-[#E8B968]/40 hover:bg-[#FFF6E8] transition items-center min-w-[800px]">
    <div className="min-w-0">
      <p className="text-[13px] font-extrabold truncate">{ad.name}</p>
      <p className="text-[10px] text-foreground/50 font-mono truncate">{ad.id}</p>
    </div>
    <StatusBadge status={ad.effective_status} />
    <div className="text-right">
      <p className="text-[13px] font-black tabular-nums">{compactINR(ad.spend)}</p>
      <p className="text-[10px] text-foreground/60 font-medium">Spend</p>
    </div>
    <div className="text-right">
      <p className="text-[13px] font-black tabular-nums">{compactNum(ad.impressions)}</p>
      <p className="text-[10px] text-foreground/60 font-medium">Impressions</p>
    </div>
    <div className="text-right">
      <p className="text-[13px] font-black tabular-nums">{ad.ctr.toFixed(2)}%</p>
      <p className="text-[10px] text-foreground/60 font-medium">CTR</p>
    </div>
    <div className="text-right">
      <p className="text-[13px] font-black tabular-nums">{ad.results}</p>
      <p className="text-[10px] text-foreground/60 font-medium">Results</p>
    </div>
  </div>
);

export default CampaignAnalyticsPage;
