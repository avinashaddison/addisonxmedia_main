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
  Info, Calendar, ChevronDown, MessageCircle, Trophy, ChevronRight, Crown,
  Brain, AlertTriangle, ShieldAlert, CheckCircle2, RefreshCw,
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  // Ad-to-Sale ROAS chain (separate query so the heavier campaign analytics
  // call doesn't block the more useful "did this ad make money?" insight).
  const attributionQ = useQuery({
    queryKey: ["ads", "attribution", id, range],
    queryFn: () => api.getAdAttribution(id!, range),
    enabled: !!id,
    staleTime: 30_000,
  });

  const togglePause = useMutation({
    mutationFn: (status: "ACTIVE" | "PAUSED") => api.updateAdCampaign(id!, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ads"] });
      toast.success("Campaign status updated");
    },
    onError: (e) => toast.error(String(e)),
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBudget, setEditBudget] = useState("");

  const updateCampaignMut = useMutation({
    mutationFn: (vars: { name: string; daily_budget_inr: number }) =>
      api.updateAdCampaign(id!, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ads"] });
      toast.success("Campaign updated successfully");
      setEditOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditName(data.campaign?.name || "");
                setEditBudget(String(Math.round((Number(data.campaign?.daily_budget) || 0) / 100)));
                setEditOpen(true);
              }}
              className="border-2 border-[#E8B968] hover:bg-[#FFE8C7] transition font-bold"
            >
              Edit Campaign
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => togglePause.mutate(isActive ? "PAUSED" : "ACTIVE")}
              disabled={togglePause.isPending}
              className="border-2 border-[#E8B968] hover:bg-[#FFE8C7] transition font-bold"
            >
              {togglePause.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />)}
              {isActive ? "Pause" : "Resume"}
            </Button>
          </div>
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

          {/* Ad-to-Sale ROAS attribution — the killer view */}
          {attributionQ.data && (
            <ConversionChain
              data={attributionQ.data}
              loading={attributionQ.isFetching}
            />
          )}

          {/* AI Funnel Expert Recommendations */}
          <CampaignAiInsightsPanel id={id} range={range} />

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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px] border-2 border-[#E8B968] bg-[#FFF6E8] p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-black text-foreground">Edit Campaign</DialogTitle>
            <DialogDescription className="text-[12px] text-foreground/60">
              Update your Meta campaign's name and daily budget.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name" className="text-[11px] uppercase tracking-wider font-extrabold text-[#B8651A]">
                Campaign Name
              </Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="border-2 border-[#E8B968] focus-visible:ring-[#FF6A1F] focus-visible:border-[#FF6A1F]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-budget" className="text-[11px] uppercase tracking-wider font-extrabold text-[#B8651A]">
                Daily Budget (₹)
              </Label>
              <Input
                id="edit-budget"
                type="number"
                min="100"
                value={editBudget}
                onChange={(e) => setEditBudget(e.target.value)}
                className="border-2 border-[#E8B968] focus-visible:ring-[#FF6A1F] focus-visible:border-[#FF6A1F]"
              />
              <p className="text-[10px] text-foreground/55 font-medium">Meta requires a minimum budget of ₹100 per day.</p>
            </div>
          </div>
          <DialogFooter className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(false)}
              className="border-2 border-[#E8B968] hover:bg-[#FFE8C7] transition font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!editName.trim()) {
                  toast.error("Campaign name cannot be empty");
                  return;
                }
                const b = Number(editBudget);
                if (isNaN(b) || b < 100) {
                  toast.error("Daily budget must be at least ₹100");
                  return;
                }
                updateCampaignMut.mutate({
                  name: editName.trim(),
                  daily_budget_inr: b,
                });
              }}
              disabled={updateCampaignMut.isPending}
              className="bg-[#FF6A1F] hover:bg-[#E85C12] text-white font-extrabold shadow-md hover:shadow-lg transition-all"
            >
              {updateCampaignMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

// ─── Conversion Chain — the killer "₹ in / ₹ out" panel ─────────────────────
//
// Visualizes the full Ad-to-Sale path nobody else shows: ad spend → clicks →
// WhatsApp chats → warm leads → won deals → revenue → ROAS. Data is the join
// of Meta insights + our own conversation/deal tables, computed server-side
// in /api/ads/campaigns/:id/attribution.
//
// Visual: a single horizontal flow with chevron separators between stages.
// The two end-caps (Spent / ROAS) get prominent treatment because that's
// what the operator actually decides on.

type AttributionData = {
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
};

const ConversionChain = ({ data, loading }: { data: AttributionData; loading: boolean }) => {
  const roasTone =
    data.roas == null ? "neutral" :
    data.roas >= 5  ? "great" :
    data.roas >= 2  ? "good"  :
    data.roas >= 1  ? "warn"  : "bad";

  const roasStyles = {
    great:   { bg: "from-[#0E8A4B] to-[#0A6E3C]", shadow: "shadow-[0_4px_0_0_#073D22]", label: "Strong ROAS 🔥" },
    good:    { bg: "from-[#3C50E0] to-[#2533A8]", shadow: "shadow-[0_4px_0_0_#1A2380]", label: "Profitable" },
    warn:    { bg: "from-[#B8651A] to-[#7A4A00]", shadow: "shadow-[0_4px_0_0_#5C3500]", label: "Break-even" },
    bad:     { bg: "from-[#D4308E] to-[#A11A6A]", shadow: "shadow-[0_4px_0_0_#7A1052]", label: "Loss — review" },
    neutral: { bg: "from-foreground/70 to-foreground/90", shadow: "shadow-[0_4px_0_0_rgba(0,0,0,0.3)]", label: "Awaiting spend" },
  }[roasTone];

  // CTR-to-chat conversion — how many of the clicks actually started a chat
  const chatRate = data.clicks > 0 ? (data.ctw_chats / data.clicks) * 100 : 0;
  // Close rate — chats that became won deals
  const closeRate = data.ctw_chats > 0 ? (data.deals_won / data.ctw_chats) * 100 : 0;

  return (
    <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_4px_0_0_#E8B968] p-5 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0E8A4B] to-[#0A6E3C] text-white flex items-center justify-center shadow-md">
            <TrendingUp className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-[14px] font-black tracking-tight">Ad-to-Sale ROAS chain</h3>
              <span className="text-[8px] uppercase tracking-[0.18em] bg-[#FFD23F] text-[#7A4A00] font-extrabold px-1.5 py-0.5 rounded">EXCLUSIVE</span>
            </div>
            <p className="text-[11px] text-foreground/60 font-medium">
              Rupees in → rupees out · joins Meta clicks to your CRM
            </p>
          </div>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-foreground/40" />}
        {data.demo && (
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#B8651A] bg-[#FFF1D6] border border-[#E8B968] rounded px-2 py-1">
            Demo — connect Meta for real data
          </span>
        )}
      </div>

      {/* Horizontal funnel */}
      <div className="grid grid-cols-1 md:grid-cols-[1.2fr_auto_1fr_auto_1fr_auto_1fr_auto_1.2fr] items-center gap-2">
        {/* 1. Spent */}
        <ChainStage
          label="Spent on Meta"
          value={compactINR(data.spend_inr)}
          sub={`${compactNum(data.clicks)} clicks`}
          tone="cost"
          icon={IndianRupee}
        />
        <ChainArrow />
        {/* 2. Chats */}
        <ChainStage
          label="WA chats started"
          value={compactNum(data.ctw_chats)}
          sub={data.clicks > 0 ? `${chatRate.toFixed(0)}% click→chat` : "—"}
          tone="step"
          icon={MessageCircle}
        />
        <ChainArrow />
        {/* 3. Warm */}
        <ChainStage
          label="Warm / hot leads"
          value={compactNum(data.contacts_warm)}
          sub={data.ctw_chats > 0 ? `${Math.round((data.contacts_warm / data.ctw_chats) * 100)}% qualified` : "—"}
          tone="step"
          icon={Users}
        />
        <ChainArrow />
        {/* 4. Deals won */}
        <ChainStage
          label="Deals won"
          value={compactNum(data.deals_won)}
          sub={data.ctw_chats > 0 ? `${closeRate.toFixed(1)}% close rate · ${data.deals_open} open` : `${data.deals_open} open`}
          tone="step"
          icon={Trophy}
        />
        <ChainArrow />
        {/* 5. Revenue + ROAS (the money shot) */}
        <div className={cn("relative rounded-xl bg-gradient-to-br text-white p-3 sm:p-4", roasStyles.bg, roasStyles.shadow)}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] uppercase tracking-[0.18em] font-extrabold opacity-90">Revenue</span>
            <Crown className="w-3.5 h-3.5 opacity-80" />
          </div>
          <p className="text-2xl font-black tabular-nums leading-tight">{compactINR(data.revenue_inr)}</p>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <p className="text-[18px] font-black tabular-nums leading-none">
              {data.roas == null ? "—" : `${data.roas.toFixed(1)}x`}
            </p>
            <p className="text-[10px] opacity-90 font-extrabold uppercase tracking-wider">ROAS</p>
          </div>
          <p className="text-[10px] opacity-80 font-bold mt-1">{roasStyles.label}</p>
        </div>
      </div>

      {/* Footnote */}
      <p className="text-[10px] text-foreground/50 mt-3 leading-snug">
        Attribution is first-touch on the original CTW ad click. Revenue includes only deals marked <span className="font-extrabold">Won</span>.
        Open deals can still close — refresh once they do.
      </p>
    </div>
  );
};

const ChainStage = ({
  label, value, sub, tone, icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "cost" | "step";
  icon: typeof MessageCircle;
}) => {
  const styles = tone === "cost"
    ? { border: "border-[#FF6A1F]/30", bg: "bg-[#FFEFE0]", iconBg: "bg-[#FF6A1F]" }
    : { border: "border-[#E8B968]/60", bg: "bg-[#FFF6E8]", iconBg: "bg-foreground/80" };
  return (
    <div className={cn("rounded-xl border-2 p-3", styles.border, styles.bg)}>
      <div className="flex items-center gap-1.5 mb-1">
        <div className={cn("w-6 h-6 rounded-md flex items-center justify-center text-white", styles.iconBg)}>
          <Icon className="w-3 h-3" strokeWidth={2.5} />
        </div>
        <p className="text-[9.5px] uppercase tracking-wider font-extrabold text-foreground/70 truncate">{label}</p>
      </div>
      <p className="text-xl font-black tabular-nums leading-tight">{value}</p>
      <p className="text-[10px] text-foreground/55 font-medium">{sub}</p>
    </div>
  );
};

const ChainArrow = () => (
  <div className="flex items-center justify-center text-foreground/30 rotate-90 md:rotate-0 py-1 md:py-0">
    <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
  </div>
);

const CampaignAiInsightsPanel = ({ id, range }: { id: string; range: "last_7d" | "last_14d" | "last_30d" | "last_90d" }) => {
  const qc = useQueryClient();
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ["ads", "ai-insights", id, range],
    queryFn: () => api.getCampaignAiInsights(id, range),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (isPending) {
    return (
      <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_4px_0_0_#E8B968] p-6 flex flex-col items-center justify-center min-h-[220px]">
        <Brain className="w-10 h-10 animate-bounce text-[#FF6A1F] mb-3" />
        <p className="text-[13px] font-black text-foreground">Funnel Analytics Expert is auditing your campaign...</p>
        <p className="text-[11px] text-muted-foreground mt-1">Analyzing CTR, click-to-chat rates, qualified leads, and ROAS drop-offs.</p>
      </div>
    );
  }

  const apiError = error as any;
  if (apiError) {
    const isNotConfigured = apiError.status === 503 || apiError.message?.includes("not configured") || apiError.body?.code === "ai_not_configured";
    const isCapExceeded = apiError.status === 429 || apiError.body?.code === "cap_exceeded";

    return (
      <div className="bg-white border-2 border-destructive/50 rounded-2xl shadow-[0_4px_0_0_rgba(239,68,68,0.2)] p-6">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5.5 h-5.5" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-[13px] font-black text-foreground uppercase tracking-tight">AI Insights Unavailable</h3>
            <p className="text-[11.5px] text-muted-foreground mt-1 leading-relaxed">
              {isNotConfigured ? (
                <>
                  OpenAI is not configured on this server. Contact your admin to set the <code className="px-1 py-0.5 bg-muted rounded text-[10.5px]">OPENAI_API_KEY</code> environment variable.
                </>
              ) : isCapExceeded ? (
                <>
                  Monthly AI Cap reached. Please upgrade your workspace plan to Growth or Enterprise to unlock unlimited insights.
                </>
              ) : (
                apiError.message || "An unexpected error occurred while analyzing the campaign."
              )}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-3 border-2 border-destructive/20 hover:bg-destructive/5 text-[11px] font-bold h-8 transition"
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Retry Audit
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const insights = data?.insights;
  if (!insights) return null;

  return (
    <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_4px_0_0_#E8B968] overflow-hidden">
      <div className="px-5 py-4 border-b-2 border-[#E8B968] bg-gradient-to-r from-[#FFF6E8] to-[#FFE8C7] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] text-white flex items-center justify-center shadow-md">
            <Brain className="w-5 h-5 animate-pulse" strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-[14px] font-black tracking-tight">🤖 AI Funnel Expert Recommendations</h3>
              {data.demo && (
                <span className="text-[8px] uppercase tracking-[0.18em] bg-[#FFD23F] text-[#7A4A00] font-extrabold px-1.5 py-0.5 rounded">DEMO</span>
              )}
            </div>
            <p className="text-[11px] text-foreground/60 font-medium">Meta Ads expert analysis & marketing audit report</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-2 border-[#E8B968] hover:bg-[#FFE8C7] transition font-bold text-[11px] h-8"
          >
            {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
            Regenerate Audit
          </Button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-3 flex flex-col items-center justify-center p-4 bg-muted/20 border-2 border-[#E8B968]/30 rounded-2xl text-center">
            <span className="text-[10px] font-black uppercase text-foreground/50 tracking-wider">Campaign Grade</span>
            <span className="text-4xl font-black text-primary mt-1">{insights.marketing_grade}</span>
            <span className="text-[9px] font-bold text-muted-foreground mt-1">Funnel efficiency rating</span>
          </div>

          <div className="md:col-span-3 flex flex-col items-center justify-center p-4 bg-muted/20 border-2 border-[#E8B968]/30 rounded-2xl text-center">
            <span className="text-[10px] font-black uppercase text-foreground/50 tracking-wider">Overall Score</span>
            <span className="text-4xl font-black text-foreground mt-1">{insights.overall_score}<span className="text-[14px] text-foreground/40 font-medium">/100</span></span>
            <span className="text-[9px] font-bold text-muted-foreground mt-1">Optimization strength</span>
          </div>

          <div className="md:col-span-6 p-4 bg-[#FFF1D6]/40 border-2 border-[#E8B968]/30 rounded-2xl">
            <h4 className="text-[11px] font-black uppercase text-[#B8651A] tracking-wider mb-1">Executive Summary</h4>
            <p className="text-[12px] text-foreground/80 font-medium leading-relaxed italic">
              "{insights.executive_summary}"
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-1">
          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase text-destructive tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Funnel Bottlenecks (Mistakes)
            </h4>
            <div className="space-y-2">
              {insights.mistakes.map((m, idx) => (
                <div key={idx} className="p-3 bg-destructive/[0.02] border-2 border-destructive/15 rounded-xl hover:border-destructive/30 transition-colors">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <h5 className="text-[12px] font-bold text-foreground">{m.title}</h5>
                    <span className={cn(
                      "text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-full",
                      m.severity === "high" ? "bg-destructive/10 text-destructive border border-destructive/20" :
                      m.severity === "medium" ? "bg-warning/10 text-warning border border-warning/20" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {m.severity} severity
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                    {m.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase text-success tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" /> 20x Growth Actions
            </h4>
            <div className="space-y-2">
              {insights.action_items.map((item, idx) => (
                <div key={idx} className="p-3 bg-success/[0.02] border-2 border-success/15 rounded-xl hover:border-success/30 transition-colors">
                  <h5 className="text-[12px] font-bold text-foreground mb-1 flex items-start gap-1.5">
                    <span className="text-success font-black mt-0.5">✓</span>
                    {item.title}
                  </h5>
                  <p className="text-[11px] text-muted-foreground leading-relaxed font-medium pl-3.5">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignAnalyticsPage;
