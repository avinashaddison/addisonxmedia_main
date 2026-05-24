import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  Target, IndianRupee, MousePointerClick, Eye, TrendingUp, Sparkles, Plus,
  Play, Pause, MoreHorizontal, Crown, Flame, ArrowUpRight,
  ShoppingBag, Users, MessageCircle, CheckCircle2, AlertTriangle, Search,
  Image as ImageIcon, Megaphone, BarChart3, Heart,
  Tag, Brain, Plug, Loader2,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { CreateAudienceDialog } from "./CreateAudienceDialog";

/* ============================================================
   Types mirror the /api/ads/* response shapes (which in turn mirror
   Meta Marketing API). When no credentials are connected, the server
   returns the same shape with demo data so the page never breaks.
============================================================ */

type Platform = "meta" | "google";

type AdCampaign = {
  id: string;
  name: string;
  platform: Platform;
  objective: string;
  status: "active" | "paused" | "review";
  daily_budget_inr: number;
  spent_inr: number;
  impressions: number;
  clicks: number;
  results: number;
  result_type: string;
  cpc_inr: number;
  ctr: number;
  roas: number;
  audience: string;
};

type AudienceStatus = "ready" | "building" | "too_small" | "updating" | "error";
type Audience = {
  id: string;
  name: string;
  type: "custom" | "lookalike" | "saved";
  size: number;
  source: string;
  status: AudienceStatus;
  status_code?: number | null;
  status_description?: string | null;
};

const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const compactINR = (n: number) => {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
};
const compactNum = (n: number) => {
  if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const objectives = [
  { id: "ctw", label: "Click-to-WhatsApp", desc: "Lead chats start in your inbox", icon: MessageCircle, recommended: true },
  { id: "leads", label: "Lead form", desc: "Native form, low friction", icon: Users },
  { id: "sales", label: "Sales / Purchases", desc: "Conversion-optimised", icon: ShoppingBag },
  { id: "traffic", label: "Traffic", desc: "Send to landing page", icon: ArrowUpRight },
  { id: "engagement", label: "Engagement", desc: "Reactions, comments, follows", icon: Heart },
  { id: "catalog", label: "Catalog retarget", desc: "Dynamic product ads", icon: Tag },
];

/* ============================================================ */

export const AdsMarketingPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState("campaigns");
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<"all" | Platform>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "review">("all");
  const [boostOpen, setBoostOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [createAudienceOpen, setCreateAudienceOpen] = useState(false);

  // Snappier perceived perf: staleTime keeps data warm across remounts,
  // placeholderData prevents loading flicker when filters change.
  const connectionQ = useQuery({
    queryKey: ["ads", "connection"],
    queryFn: () => api.getAdsConnection(),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
  const campaignsQ = useQuery({
    queryKey: ["ads", "campaigns"],
    queryFn: () => api.listAdCampaigns(),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
  const insightsQ = useQuery({
    queryKey: ["ads", "insights", "last_7d"],
    queryFn: () => api.getAdInsights("last_7d"),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
  const audiencesQ = useQuery({
    queryKey: ["ads", "audiences"],
    queryFn: () => api.listAdAudiences(),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
  const anyLoading = connectionQ.isLoading || campaignsQ.isLoading || insightsQ.isLoading;

  const isConnected = connectionQ.data?.connected ?? false;
  const isDemo = campaignsQ.data?.demo ?? true;

  const toggleCampaign = useMutation({
    mutationFn: (vars: { id: string; status: "ACTIVE" | "PAUSED" }) =>
      api.updateAdCampaign(vars.id, { status: vars.status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ads", "campaigns"] });
      toast.success("Campaign updated");
    },
    onError: (e) => toast.error(String(e)),
  });

  const disconnect = useMutation({
    mutationFn: () => api.disconnectAds(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ads"] });
      toast.success("Meta Ads disconnected");
    },
  });

  const campaigns: AdCampaign[] = campaignsQ.data?.campaigns ?? [];
  const audiences: Audience[] = audiencesQ.data?.audiences ?? [];
  const ins = insightsQ.data;

  const stats = useMemo(() => {
    // Prefer account-level insights when available; otherwise aggregate active campaigns.
    if (ins) {
      const revenue = (ins.purchases ?? 0) * 1500; // placeholder AOV until pixel events expose value
      const roas = ins.spend_inr > 0 ? revenue / ins.spend_inr : 0;
      return {
        spent: ins.spend_inr ?? 0,
        impressions: ins.impressions ?? 0,
        clicks: ins.clicks ?? 0,
        results: (ins.whatsapp_chats ?? 0) + (ins.purchases ?? 0),
        ctr: ins.ctr_pct ?? 0,
        cpr: ins.clicks > 0 ? ins.spend_inr / ins.clicks : 0,
        revenue,
        roas,
      };
    }
    const active = campaigns.filter((c) => c.status === "active");
    const spent = active.reduce((a, c) => a + c.spent_inr, 0);
    const impressions = active.reduce((a, c) => a + c.impressions, 0);
    const clicks = active.reduce((a, c) => a + c.clicks, 0);
    const results = active.reduce((a, c) => a + c.results, 0);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpr = results > 0 ? spent / results : 0;
    const revenue = active.reduce((a, c) => a + c.spent_inr * c.roas, 0);
    const roas = spent > 0 ? revenue / spent : 0;
    return { spent, impressions, clicks, results, ctr, cpr, revenue, roas };
  }, [ins, campaigns]);

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      if (platformFilter !== "all" && c.platform !== platformFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [campaigns, platformFilter, statusFilter, search]);

  return (
    <PageShell
      title="Ads Marketing"
      subtitle="Meta + Google se ads chalao · WhatsApp pe leads paao"
      icon={<Target className="w-5 h-5" />}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setBoostOpen(true)}>
            <Sparkles className="w-3.5 h-3.5" />
            Boost WhatsApp
          </Button>
          <Button size="sm" onClick={() => navigate("/app/ads/new")}>
            <Plus className="w-3.5 h-3.5" />
            Naya campaign
          </Button>
        </div>
      }
    >
      {/* ============ HERO — connection state, spend pulse, primary CTA ============ */}
      <AdsHero
        isConnected={isConnected}
        loading={connectionQ.isPending}
        accountName={connectionQ.data?.ad_account_name ?? ""}
        accountId={connectionQ.data?.ad_account_id ?? ""}
        currency={connectionQ.data?.ad_account_currency ?? "INR"}
        stats={stats}
        activeCampaigns={campaigns.filter((c) => c.status === "active").length}
        onConnect={() => setConnectOpen(true)}
        onDisconnect={() => disconnect.mutate()}
        onCreate={() => navigate("/app/ads/new")}
      />

      {/* ============ KPI STATS — honest, no fake trends ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <AdKPI
          label="Total spend (7d)"
          rawValue={stats.spent}
          format="inr"
          sub={stats.spent > 0
            ? `${campaigns.filter((c) => c.status === "active").length} active ${campaigns.filter((c) => c.status === "active").length === 1 ? "campaign" : "campaigns"}`
            : "No spend yet"}
          icon={IndianRupee}
          color="accent"
          loading={anyLoading}
        />
        <AdKPI
          label="Impressions"
          rawValue={stats.impressions}
          format="num"
          sub={stats.impressions > 0 ? `Reach: ${compactNum(Math.round(stats.impressions * 0.42))}` : "Launch a campaign"}
          icon={Eye}
          color="primary"
          loading={anyLoading}
        />
        <AdKPI
          label="Clicks · CTR"
          rawValue={stats.clicks}
          format="num"
          sub={stats.clicks > 0
            ? `${stats.ctr.toFixed(2)}% CTR · ${fmtINR(stats.spent / Math.max(1, stats.clicks))} CPC`
            : "Waiting on impressions"}
          icon={MousePointerClick}
          color="hot"
          loading={anyLoading}
        />
        <AdKPI
          label="ROAS"
          rawValue={stats.roas}
          format="roas"
          sub={stats.revenue > 0
            ? `Revenue: ${compactINR(stats.revenue)}`
            : "Needs CAPI events"}
          icon={TrendingUp}
          color="success"
          highlight={stats.roas >= 2}
          loading={anyLoading}
        />
      </div>

      {/* ============ AI SUGGESTIONS STRIP — only when we have a real suggestion ============ */}
      {(() => {
        // Only surface a suggestion when it's actually grounded in data
        const winners = campaigns.filter((c) => c.status === "active" && c.roas >= 5);
        const losers = campaigns.filter((c) => c.status === "active" && c.roas > 0 && c.roas < 1.5);
        let headline = "";
        let cta = "";
        let action = () => {};
        if (winners.length > 0) {
          headline = `${winners.length} ${winners.length === 1 ? "campaign" : "campaigns"} ka ROAS 5x se upar hai — budget badhao`;
          cta = "Review winners";
          action = () => setTab("campaigns");
        } else if (losers.length > 0) {
          headline = `${losers.length} ${losers.length === 1 ? "campaign" : "campaigns"} underperforming — pause or rework`;
          cta = "Review losers";
          action = () => setTab("campaigns");
        } else if (isConnected && campaigns.length === 0) {
          headline = "Connect kar liya — ab pehla campaign launch karo · CTW best for WhatsApp leads";
          cta = "Launch campaign";
          action = () => navigate("/app/ads/new");
        } else {
          return null;
        }
        return (
          <div className="relative bg-gradient-to-r from-[#0A3D24] to-[#0D4E2E] text-white rounded-2xl border-2 border-[#0A3D24] shadow-[0_4px_0_0_#072917] p-4 mb-4 flex items-center gap-4 flex-wrap overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }} />
            <div className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-[#FFD23F]/10 to-transparent animate-ai-sheen" />
            <div className="relative w-10 h-10 rounded-xl bg-[#FFD23F] text-[#7A4A00] flex items-center justify-center shadow-md flex-shrink-0">
              <Brain className="w-5 h-5" strokeWidth={2.5} />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#16C172] ring-2 ring-[#0A3D24] animate-pulse" aria-hidden />
            </div>
            <div className="relative flex-1 min-w-[220px]">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#FFD23F] font-extrabold">Addison AI</p>
              <p className="text-[14px] font-extrabold mt-0.5">{headline}</p>
            </div>
            <div className="relative flex items-center gap-2">
              <button onClick={action} className="text-[11px] font-extrabold bg-[#FFD23F] text-[#7A4A00] px-3 py-1.5 rounded-lg shadow-md hover:scale-105 hover:shadow-lg hover:shadow-[#FFD23F]/30 active:scale-95 transition-all">
                {cta} →
              </button>
            </div>
          </div>
        );
      })()}

      {/* ============ TABS ============ */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="adsets">Ad Sets</TabsTrigger>
            <TabsTrigger value="creatives">Creatives</TabsTrigger>
            <TabsTrigger value="audiences">Audiences</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ============ CAMPAIGNS TAB ============ */}
      {tab === "campaigns" && (
        <>
          {/* Toolbar */}
          <div className="bg-white border-2 border-[#E8B968] rounded-2xl p-3 mb-3 flex flex-wrap items-center gap-2 shadow-[0_3px_0_0_#E8B968]">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B8651A]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Campaign name se search karein…"
                className="pl-9"
              />
            </div>
            <div className="flex gap-1">
              {(["all", "meta", "google"] as const).map((p) => {
                const colors = {
                  all: { active: "bg-foreground text-white", inactive: "bg-[#FFF6E8] text-foreground" },
                  meta: { active: "bg-[#0866FF] text-white", inactive: "bg-[#E6EEFF] text-[#0866FF]" },
                  google: { active: "bg-[#34A853] text-white", inactive: "bg-[#E6F4EA] text-[#34A853]" },
                }[p];
                return (
                  <button
                    key={p}
                    onClick={() => setPlatformFilter(p)}
                    className={cn(
                      "px-3.5 h-10 rounded-xl text-[12px] font-extrabold capitalize transition-all border-2 border-transparent",
                      platformFilter === p ? colors.active + " shadow-sm" : colors.inactive + " hover:scale-105"
                    )}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-1">
              {(["all", "active", "paused", "review"] as const).map((s) => {
                const colors = {
                  all: { active: "bg-foreground text-white", inactive: "bg-[#FFF6E8] text-foreground" },
                  active: { active: "bg-[#0E8A4B] text-white", inactive: "bg-[#E6F7EE] text-[#0E8A4B]" },
                  paused: { active: "bg-[#B8651A] text-white", inactive: "bg-[#FFF1D6] text-[#B8651A]" },
                  review: { active: "bg-[#FFD23F] text-[#7A4A00]", inactive: "bg-[#FFF8DD] text-[#7A4A00]" },
                }[s];
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "px-3.5 h-10 rounded-xl text-[12px] font-extrabold capitalize transition-all border-2 border-transparent",
                      statusFilter === s ? colors.active + " shadow-sm" : colors.inactive + " hover:scale-105"
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campaign table */}
          <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_4px_0_0_#E8B968]">
            <div className="overflow-x-auto">
              <div className="grid grid-cols-[36px_1.6fr_110px_1fr_120px_120px_110px_110px_90px_60px] gap-3 px-4 py-3 border-b-2 border-[#E8B968] bg-[#FFF1D6] text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A] min-w-[1100px]">
                <div></div>
                <div>Campaign</div>
                <div>Platform</div>
                <div>Audience</div>
                <div>Budget / Spend</div>
                <div>Results</div>
                <div>CTR · CPC</div>
                <div>ROAS</div>
                <div>Status</div>
                <div></div>
              </div>

              {filtered.length === 0 && (
                <div className="px-4 py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#FFF1D6] border-2 border-[#E8B968] mx-auto mb-3 flex items-center justify-center">
                    <Target className="w-6 h-6 text-[#B8651A]" />
                  </div>
                  <p className="text-[14px] font-extrabold mb-1">Koi campaign nahi mila</p>
                  <p className="text-[12px] text-foreground/60 font-medium">Filter badlo ya naya campaign banaao</p>
                </div>
              )}

              {filtered.map((c) => (
                <CampaignRow
                  key={c.id}
                  c={c}
                  onClick={() => navigate(`/app/ads/${c.id}`)}
                  onToggle={() => {
                    if (c.id.startsWith("demo_")) {
                      toast.info("Connect Meta Ads to control real campaigns");
                      return;
                    }
                    toggleCampaign.mutate({ id: c.id, status: c.status === "active" ? "PAUSED" : "ACTIVE" });
                  }}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* ============ AUDIENCES TAB ============ */}
      {tab === "audiences" && (
        <div className="space-y-4">
          {/* SECTION 1 — Custom audiences (retargeting your CRM contacts) */}
          <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_4px_0_0_#E8B968] overflow-hidden">
            <div className="px-4 py-3 border-b-2 border-[#E8B968] bg-[#FFF1D6] flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#3C50E0] text-white flex items-center justify-center shadow-md">
                  <Users className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-[14px] font-black tracking-tight">Your custom audiences</h3>
                  <p className="text-[11px] text-foreground/60 font-medium">CRM contacts · Lookalikes · For retargeting people who already engaged</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setCreateAudienceOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> Naya audience
              </Button>
            </div>

            <div className="divide-y divide-[#E8B968]/40">
              {audiences.length === 0 && audiencesQ.isPending && (
                <div className="px-4 py-12 text-center">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#B8230C]" />
                </div>
              )}
              {audiences.length === 0 && !audiencesQ.isPending && (
                <div className="px-6 py-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3C50E0] to-[#2533A8] text-white mx-auto mb-3 flex items-center justify-center shadow-md">
                    <Users className="w-6 h-6" strokeWidth={2.5} />
                  </div>
                  <p className="text-[14px] font-black tracking-tight">No custom audience yet</p>
                  <p className="text-[12px] text-foreground/60 font-medium mt-1 max-w-md mx-auto">
                    Upload your CRM contacts to Meta and re-engage past leads on WhatsApp & Instagram.
                  </p>
                  <div className="flex gap-2 mt-3 justify-center">
                    <Button size="sm" onClick={() => setCreateAudienceOpen(true)}>
                      <Plus className="w-3.5 h-3.5" /> Create from contacts
                    </Button>
                  </div>
                </div>
              )}
              {audiences.map((a) => {
                const typeColors = {
                  custom: { bg: "bg-[#E4E8FF]", text: "text-[#3C50E0]" },
                  lookalike: { bg: "bg-[#FCE5F0]", text: "text-[#D4308E]" },
                  saved: { bg: "bg-[#FFF1D6]", text: "text-[#B8651A]" },
                }[a.type];
                return (
                  <div key={a.id} className="px-4 py-3 flex items-center gap-3 hover:bg-[#FFF6E8] transition">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", typeColors.bg)}>
                      <Users className={cn("w-4 h-4", typeColors.text)} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-extrabold truncate flex items-center gap-2">
                        {a.name}
                        <span className={cn("text-[9px] px-1.5 py-0.5 rounded uppercase font-extrabold tracking-wider", typeColors.bg, typeColors.text)}>
                          {a.type}
                        </span>
                      </p>
                      <p className="text-[11px] text-foreground/60 font-medium">{a.source}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-black tabular-nums">{compactNum(a.size)}</p>
                      <AudienceStatusBadge status={a.status} description={a.status_description} />
                    </div>
                    <button className="w-8 h-8 rounded-lg hover:bg-[#FFE8C7] flex items-center justify-center text-foreground/60 hover:text-foreground transition">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2 — Meta interest targeting (finding NEW customers) */}
          <InterestTargetingSection onUseInCampaign={() => navigate("/app/ads/new")} />
        </div>
      )}

      {/* ============ CREATIVES TAB ============ */}
      {tab === "creatives" && (
        <EmptyState
          icon={ImageIcon}
          title="Creatives library coming soon"
          desc="Yahaan aap saari ad images, videos aur copy variants manage karoge · AI-generated creatives bhi"
        />
      )}

      {/* ============ AD SETS TAB ============ */}
      {tab === "adsets" && (
        <EmptyState
          icon={Megaphone}
          title="Ad Sets · campaign select karo"
          desc="Campaign open karne pe uske ad sets yahaan dikhenge · targeting, budget, schedule sab edit ho sakta hai"
        />
      )}

      {/* ============ INSIGHTS TAB — derived from real campaign data ============ */}
      {tab === "insights" && (() => {
        const realCampaigns = campaigns.filter((c) => !c.id.startsWith("demo_"));
        if (realCampaigns.length === 0) {
          return (
            <EmptyState
              icon={BarChart3}
              title="Insights need real campaign data"
              desc="Once you launch real campaigns and they collect impressions, this tab will show your best performers, attention-needed ads, top creatives, and audience winners."
            />
          );
        }
        const sortedByRoas = [...realCampaigns].filter((c) => c.roas > 0).sort((a, b) => b.roas - a.roas);
        const sortedByCtr = [...realCampaigns].filter((c) => c.impressions > 100).sort((a, b) => b.ctr - a.ctr);
        const best = sortedByRoas[0];
        const worst = sortedByRoas[sortedByRoas.length - 1];
        const topCtr = sortedByCtr[0];
        const cards: Array<{ title: string; icon: typeof Target; color: "primary" | "success" | "warning" | "hot"; stat: string; sub: string }> = [];
        if (best && best.roas >= 2) cards.push({ title: "Best performer", icon: Crown, color: "success", stat: best.name, sub: `ROAS ${best.roas.toFixed(1)}x · ${fmtINR(best.cpc_inr)} CPC · ${best.results} ${best.result_type}` });
        if (worst && worst !== best && worst.roas < 2) cards.push({ title: "Needs attention", icon: AlertTriangle, color: "warning", stat: worst.name, sub: `ROAS ${worst.roas.toFixed(1)}x — below 2x threshold · ${compactINR(worst.spent_inr)} spent` });
        if (topCtr) cards.push({ title: "Top CTR", icon: Flame, color: "hot", stat: topCtr.name, sub: `${topCtr.ctr.toFixed(2)}% CTR · ${compactNum(topCtr.clicks)} clicks · ${compactNum(topCtr.impressions)} reach` });
        if (cards.length === 0) {
          return (
            <EmptyState
              icon={BarChart3}
              title="Not enough signal yet"
              desc="Your campaigns are still collecting data. Insights show up once campaigns have meaningful impressions and ROAS data."
            />
          );
        }
        return (
          <div className="grid lg:grid-cols-2 gap-4">
            {cards.map((card) => (
              <InsightCard key={card.title} {...card} />
            ))}
          </div>
        );
      })()}

      {/* ============ BOOST WHATSAPP DIALOG ============ */}
      <BoostWhatsAppDialog open={boostOpen} onOpenChange={setBoostOpen} isConnected={isConnected} />

      {/* ============ CONNECT META ADS DIALOG ============ */}
      <ConnectMetaAdsDialog open={connectOpen} onOpenChange={setConnectOpen} />

      {/* ============ CREATE AUDIENCE DIALOG ============ */}
      <CreateAudienceDialog
        open={createAudienceOpen}
        onOpenChange={setCreateAudienceOpen}
        onCreated={() => qc.invalidateQueries({ queryKey: ["ads", "audiences"] })}
      />
    </PageShell>
  );
};

/* ============================================================
   SUBCOMPONENTS
============================================================ */

const Loader2Sm = () => (
  <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 animate-spin" fill="none" stroke="currentColor" strokeWidth="3">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
  </svg>
);

/**
 * Renders the right-hand status pill for a custom audience. Each Meta
 * delivery_status code maps to a human-readable explanation so users
 * understand *why* an audience isn't ready instead of staring at a
 * generic "BUILDING" forever.
 */
const AudienceStatusBadge = ({ status, description }: { status: AudienceStatus; description?: string | null }) => {
  const config: Record<AudienceStatus, { label: string; cls: string; tooltip: string; spin: boolean }> = {
    ready: {
      label: "Ready", spin: false,
      cls: "text-[#0E8A4B]",
      tooltip: description || "Audience is ready to use in campaigns.",
    },
    updating: {
      label: "Matching", spin: true,
      cls: "text-[#B8651A]",
      tooltip: description || "Meta is still matching your uploaded phones against Facebook users. Takes 30 min – 24 hr after upload.",
    },
    building: {
      label: "Building", spin: true,
      cls: "text-[#B8651A]",
      tooltip: description || "Meta is preparing this audience. Refresh in a few hours.",
    },
    too_small: {
      label: "Too small", spin: false,
      cls: "text-[#D4308E]",
      tooltip: description || "Meta needs ~1,000 matched users minimum. Either too few of your contacts have Facebook accounts, or wait — matching may not be complete yet.",
    },
    error: {
      label: "Error", spin: false,
      cls: "text-[#D4308E]",
      tooltip: description || "Meta returned an error. Check the audience in Business Manager.",
    },
  };
  const cfg = config[status];
  return (
    <p
      className={cn("text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 justify-end cursor-help", cfg.cls)}
      title={cfg.tooltip}
    >
      {cfg.spin && <Loader2Sm />} {cfg.label}
    </p>
  );
};

/* ============================================================
   AdsHero — unified hero band that replaces the old demo-mode banner
   + two equal connection cards. When connected → shows account info
   + live activity beat. When not → shows a single confident CTA card
   sized at hero width.
============================================================ */
const AdsHero = ({
  isConnected, loading, accountName, accountId, currency, stats, activeCampaigns,
  onConnect, onDisconnect, onCreate,
}: {
  isConnected: boolean;
  loading: boolean;
  accountName: string;
  accountId: string;
  currency: string;
  stats: { spent: number; clicks: number; results: number };
  activeCampaigns: number;
  onConnect: () => void;
  onDisconnect: () => void;
  onCreate: () => void;
}) => {
  return (
    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-3 mb-4">
      {/* Primary hero — Meta */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-[#0866FF] shadow-[0_4px_0_0_#0050D6] p-5"
           style={{ background: isConnected
             ? "linear-gradient(135deg, #0866FF 0%, #1B4ED8 60%, #062D8E 100%)"
             : "linear-gradient(135deg, #FFFFFF 0%, #F3F7FF 100%)" }}>
        {/* Decorative pattern */}
        {isConnected && (
          <>
            <div className="absolute -top-12 -right-8 w-44 h-44 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-16 -left-10 w-44 h-44 rounded-full bg-[#FFD23F]/20 blur-3xl" />
          </>
        )}
        <div className="relative flex items-start gap-4">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shadow-md flex-shrink-0",
            isConnected ? "bg-white text-[#0866FF]" : "bg-[#0866FF] text-white"
          )}>f</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={cn("text-[17px] font-black tracking-tight", isConnected ? "text-white" : "text-foreground")}>Meta Ads</p>
              {loading ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 text-white/80 text-[10px] font-extrabold uppercase tracking-wider">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" /> Loading
                </span>
              ) : isConnected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#16C172]/20 border border-[#16C172]/40 text-[#16C172] text-[10px] font-extrabold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16C172] animate-pulse" /> Live
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF1D6] border border-[#E8B968] text-[#B8651A] text-[10px] font-extrabold uppercase tracking-wider">
                  Not connected
                </span>
              )}
            </div>
            <p className={cn("text-[11.5px] font-medium mt-0.5", isConnected ? "text-white/80" : "text-foreground/60")}>
              Facebook · Instagram · WhatsApp · CTW
            </p>
            {isConnected ? (
              <div className="mt-3">
                <p className="text-[12px] text-white/80 font-bold truncate">{accountName || "—"}{accountId && <span className="text-white/55 font-medium"> · act_{accountId}</span>}</p>
                <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-2">
                  <div>
                    <p className="text-[9.5px] uppercase tracking-[0.18em] text-[#FFD23F] font-extrabold">Spend 7d</p>
                    <p className="text-[22px] font-black tabular-nums leading-none text-white">{compactINR(stats.spent)}</p>
                  </div>
                  <div>
                    <p className="text-[9.5px] uppercase tracking-[0.18em] text-[#FFD23F] font-extrabold">Active</p>
                    <p className="text-[22px] font-black tabular-nums leading-none text-white">{activeCampaigns}</p>
                  </div>
                  <div>
                    <p className="text-[9.5px] uppercase tracking-[0.18em] text-[#FFD23F] font-extrabold">Results</p>
                    <p className="text-[22px] font-black tabular-nums leading-none text-white">{compactNum(stats.results)}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={onDisconnect}
                            className="bg-white/10 hover:bg-white/20 text-white border-white/30">
                      Disconnect
                    </Button>
                    <Button size="sm" onClick={onCreate} className="bg-[#FFD23F] hover:bg-[#FFC107] text-[#7A4A00] border-0 shadow-md">
                      <Plus className="w-3.5 h-3.5" /> New campaign
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <p className="text-[12.5px] text-foreground/70 font-medium max-w-md leading-relaxed">
                  Connect your Meta Business account once — campaigns, audiences, and ROAS all show up here. Yeh data demo hai jab tak connect na karein.
                </p>
                <div className="ml-auto flex items-center gap-2">
                  <Button size="sm" onClick={onConnect} className="bg-[#0866FF] hover:bg-[#0050D6] text-white border-0 shadow-md">
                    <Plug className="w-3.5 h-3.5" /> Connect Meta Ads
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary — Google placeholder, smaller */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-[#34A853]/40 shadow-[0_4px_0_0_#1E7E3450] p-5 bg-gradient-to-br from-white to-[#F1F8F3]">
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black bg-gradient-to-br from-[#4285F4] via-[#34A853] to-[#FBBC05] text-white shadow-md flex-shrink-0">
            G
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[17px] font-black tracking-tight text-foreground">Google Ads</p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF1D6] border border-[#E8B968] text-[#B8651A] text-[10px] font-extrabold uppercase tracking-wider">
                Coming soon
              </span>
            </div>
            <p className="text-[11.5px] text-foreground/60 font-medium mt-0.5">Search · YouTube · Display · PMax</p>
            <p className="text-[12px] text-foreground/65 font-medium mt-2 leading-relaxed">
              Google integration v1.2 ke roadmap mein hai. Abhi Meta + WhatsApp pe focus.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


// Ease-out counter from 0 → target over `duration` ms. Re-runs when target
// changes so KPIs animate on data refresh too.
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
    // Intentionally omit `n` from deps — we use it as the start value but
    // don't want to retrigger the animation on every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);
  return n;
};

const AdKPI = ({
  label, rawValue, format, sub, icon: Icon, color, trend, highlight, loading,
}: {
  label: string;
  rawValue: number;
  format: "inr" | "num" | "roas";
  sub?: string;
  icon: typeof Target;
  color: "primary" | "accent" | "success" | "hot";
  trend?: string;
  highlight?: boolean;
  loading?: boolean;
}) => {
  const styles = {
    primary: { border: "border-[#3C50E0]", shadow: "shadow-[0_4px_0_0_#2533A8]", hoverShadow: "hover:shadow-[0_6px_0_0_#2533A8]", iconBg: "bg-[#3C50E0]", trendText: "text-[#3C50E0]", glow: "from-[#3C50E0]/15" },
    accent:  { border: "border-[#FF6A1F]", shadow: "shadow-[0_4px_0_0_#B8420A]", hoverShadow: "hover:shadow-[0_6px_0_0_#B8420A]", iconBg: "bg-[#FF6A1F]", trendText: "text-[#FF6A1F]", glow: "from-[#FF6A1F]/15" },
    success: { border: "border-[#0E8A4B]", shadow: "shadow-[0_4px_0_0_#0A6E3C]", hoverShadow: "hover:shadow-[0_6px_0_0_#0A6E3C]", iconBg: "bg-[#0E8A4B]", trendText: "text-[#0E8A4B]", glow: "from-[#0E8A4B]/15" },
    hot:     { border: "border-[#D4308E]", shadow: "shadow-[0_4px_0_0_#A11A6A]", hoverShadow: "hover:shadow-[0_6px_0_0_#A11A6A]", iconBg: "bg-[#D4308E]", trendText: "text-[#D4308E]", glow: "from-[#D4308E]/15" },
  }[color];

  const animated = useAnimatedCount(rawValue);
  const display =
    format === "inr"  ? compactINR(animated) :
    format === "roas" ? `${animated.toFixed(1)}x` :
                        compactNum(animated);

  const isZero = rawValue === 0;
  return (
    <div className={cn(
      "group relative overflow-hidden bg-white border-2 rounded-2xl p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 will-change-transform",
      styles.border, styles.shadow, styles.hoverShadow
    )}>
      {/* Soft brand-color glow on hover for depth */}
      <div className={cn("pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl bg-gradient-to-br to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500", styles.glow)} />

      <div className="relative flex items-center justify-between mb-3">
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105", styles.iconBg)}>
          <Icon className="w-5 h-5" strokeWidth={2.5} />
        </div>
        {trend && (
          <span className={cn("inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#E6F7EE] border border-[#0E8A4B]/30 text-[10px] font-extrabold", styles.trendText)}>
            <ArrowUpRight className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>
      <p className="relative text-[11px] uppercase tracking-[0.15em] text-foreground/60 font-extrabold">{label}</p>
      {loading && isZero ? (
        <div className="relative h-9 w-24 mt-1 rounded-md bg-[#FFF1D6] animate-pulse" />
      ) : (
        <p className={cn(
          "relative text-3xl font-black tracking-tight tabular-nums mt-1",
          isZero ? "text-foreground/30" : highlight ? styles.trendText : "text-foreground"
        )}>
          {display}
        </p>
      )}
      {sub && <p className="relative text-[11px] text-foreground/60 font-medium mt-1 truncate">{sub}</p>}
    </div>
  );
};

const PlatformBadge = ({ p }: { p: Platform }) => {
  if (p === "meta") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#E6EEFF] border border-[#0866FF]/30 text-[#0866FF] text-[10px] font-extrabold">
        <span className="w-4 h-4 rounded-full bg-[#0866FF] text-white flex items-center justify-center text-[9px] font-black">f</span>
        Meta
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#E6F4EA] border border-[#34A853]/30 text-[#1E7E34] text-[10px] font-extrabold">
      <span className="w-4 h-4 rounded-full bg-[#34A853] text-white flex items-center justify-center text-[9px] font-black">G</span>
      Google
    </span>
  );
};

const CampaignRow = ({ c, onToggle, onClick }: { c: AdCampaign; onToggle?: () => void; onClick?: () => void }) => {
  const statusStyles = {
    active:  { dot: "bg-[#0E8A4B]", text: "text-[#0E8A4B]", bg: "bg-[#E6F7EE]", label: "Active" },
    paused:  { dot: "bg-[#B8651A]", text: "text-[#B8651A]", bg: "bg-[#FFF1D6]", label: "Paused" },
    review:  { dot: "bg-[#FFD23F]", text: "text-[#7A4A00]", bg: "bg-[#FFF8DD]", label: "In review" },
  }[c.status];

  const spentPct = Math.min(100, (c.spent_inr / Math.max(1, c.daily_budget_inr * 7)) * 100);

  return (
    <div
      onClick={onClick}
      className="grid grid-cols-[36px_1.6fr_110px_1fr_120px_120px_110px_110px_90px_60px] gap-3 px-4 py-3 border-b border-[#E8B968]/40 last:border-b-0 items-center hover:bg-[#FFF6E8] transition min-w-[1100px] cursor-pointer"
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
        className="w-7 h-7 rounded-lg bg-[#FFF1D6] border border-[#E8B968] flex items-center justify-center hover:bg-[#FFE8C7] transition"
      >
        {c.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>
      <div className="min-w-0">
        <p className="text-[13px] font-extrabold truncate">{c.name}</p>
        <p className="text-[10px] text-foreground/60 font-medium">{c.objective}</p>
      </div>
      <div><PlatformBadge p={c.platform} /></div>
      <p className="text-[12px] font-semibold text-foreground/80 truncate">{c.audience}</p>
      <div>
        <p className="text-[12px] font-extrabold tabular-nums">{fmtINR(c.daily_budget_inr)}/day</p>
        <div className="flex items-center gap-1.5 mt-1">
          <div className="flex-1 h-1.5 bg-[#FFF1D6] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#FF6A1F] to-[#FFD23F] rounded-full" style={{ width: `${spentPct}%` }} />
          </div>
          <span className="text-[10px] text-foreground/60 font-extrabold tabular-nums">{compactINR(c.spent_inr)}</span>
        </div>
      </div>
      <div>
        <p className="text-[13px] font-black tabular-nums">{c.results}</p>
        <p className="text-[10px] text-foreground/60 font-medium">{c.result_type}</p>
      </div>
      <div>
        <p className="text-[12px] font-extrabold tabular-nums">{c.ctr.toFixed(2)}%</p>
        <p className="text-[10px] text-foreground/60 font-medium tabular-nums">{c.cpc_inr > 0 ? fmtINR(c.cpc_inr) : "—"} CPC</p>
      </div>
      <div>
        {c.roas > 0 ? (
          <span className={cn(
            "inline-block px-2 py-1 rounded-md text-[11px] font-black tabular-nums",
            c.roas >= 5 ? "bg-[#E6F7EE] text-[#0E8A4B]" :
            c.roas >= 3 ? "bg-[#FFF1D6] text-[#B8651A]" :
            "bg-[#FCE5F0] text-[#D4308E]"
          )}>
            {c.roas.toFixed(1)}x
          </span>
        ) : (
          <span className="text-[11px] text-foreground/40">—</span>
        )}
      </div>
      <div>
        <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider", statusStyles.bg, statusStyles.text)}>
          <span className={cn("w-1.5 h-1.5 rounded-full", statusStyles.dot, c.status === "active" && "animate-pulse")} />
          {statusStyles.label}
        </span>
      </div>
      <button
        onClick={(e) => e.stopPropagation()}
        className="w-8 h-8 rounded-lg hover:bg-[#FFE8C7] flex items-center justify-center text-foreground/60 hover:text-foreground transition"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
    </div>
  );
};

const InsightCard = ({
  title, icon: Icon, color, stat, sub,
}: {
  title: string;
  icon: typeof Target;
  color: "primary" | "success" | "warning" | "hot";
  stat: string;
  sub: string;
}) => {
  const styles = {
    primary: { border: "border-[#3C50E0]", shadow: "shadow-[0_4px_0_0_#2533A8]", iconBg: "bg-[#3C50E0]" },
    success: { border: "border-[#0E8A4B]", shadow: "shadow-[0_4px_0_0_#0A6E3C]", iconBg: "bg-[#0E8A4B]" },
    warning: { border: "border-[#FFD23F]", shadow: "shadow-[0_4px_0_0_#E8B400]", iconBg: "bg-[#FFD23F] text-[#7A4A00]" },
    hot:     { border: "border-[#D4308E]", shadow: "shadow-[0_4px_0_0_#A11A6A]", iconBg: "bg-[#D4308E]" },
  }[color];
  return (
    <div className={cn("bg-white border-2 rounded-2xl p-5", styles.border, styles.shadow)}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md", styles.iconBg)}>
          <Icon className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <p className="text-[11px] uppercase tracking-[0.15em] text-foreground/60 font-extrabold">{title}</p>
      </div>
      <p className="text-xl font-black tracking-tight">{stat}</p>
      <p className="text-[12px] text-foreground/70 font-medium mt-1">{sub}</p>
    </div>
  );
};

const EmptyState = ({ icon: Icon, title, desc }: { icon: typeof Target; title: string; desc: string }) => (
  <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_4px_0_0_#E8B968] p-12 text-center">
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF6A1F] to-[#E85C12] text-white flex items-center justify-center shadow-md mx-auto mb-4">
      <Icon className="w-7 h-7" strokeWidth={2.5} />
    </div>
    <p className="text-xl font-black tracking-tight">{title}</p>
    <p className="text-[13px] text-foreground/70 font-medium mt-2 max-w-md mx-auto">{desc}</p>
  </div>
);

/* ============================================================
   Interest Targeting — browse Meta's pre-built interest categories
   so users can find NEW customers (vs. custom audiences which retarget
   existing CRM contacts).

   Pre-seeded with 12 popular Indian SMB interests so the panel always
   has something to scan. Search hits /ads/targeting/interests which
   talks to Meta's targeting API.
============================================================ */

// Curated Indian-SMB picks shown when no search is active. These show as
// quick-pick chips above the full list so first-time users see relevant
// categories instantly instead of an empty search box.
const INDIA_SMB_INTEREST_QUICKPICKS = [
  "Online shopping", "Small business owners", "WhatsApp Business",
  "E-commerce", "Beauty & cosmetics", "Indian cuisine",
  "Fashion", "Bollywood", "Cricket", "Diwali",
  "Yoga", "Real estate",
];

const formatReach = (lower?: number, upper?: number): string => {
  if (!lower && !upper) return "—";
  const mid = lower && upper ? Math.round((lower + upper) / 2) : (upper ?? lower ?? 0);
  if (mid >= 10_000_000) return `${(mid / 10_000_000).toFixed(1)}Cr`;
  if (mid >= 100_000) return `${(mid / 100_000).toFixed(1)}L`;
  if (mid >= 1_000) return `${(mid / 1_000).toFixed(1)}K`;
  return String(mid);
};

const InterestTargetingSection = ({ onUseInCampaign }: { onUseInCampaign: () => void }) => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // 250ms debounce on the search box — Meta's targeting API isn't free
  // and the user types faster than it returns.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const interestsQ = useQuery({
    queryKey: ["ads", "interests", debouncedSearch],
    queryFn: () => api.searchAdInterests(debouncedSearch),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const interests = interestsQ.data?.interests ?? [];
  const isDemo = interestsQ.data?.demo ?? false;

  return (
    <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_4px_0_0_#E8B968] overflow-hidden">
      <div className="px-4 py-3 border-b-2 border-[#E8B968] bg-[#FFF1D6] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF6A1F] to-[#E85C12] text-white flex items-center justify-center shadow-md">
            <Target className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-[14px] font-black tracking-tight">Meta interest categories</h3>
            <p className="text-[11px] text-foreground/60 font-medium">
              Pre-built by Meta · For finding new customers who match your audience profile
            </p>
          </div>
        </div>
        <Button size="sm" onClick={onUseInCampaign}>
          <Plus className="w-3.5 h-3.5" /> Use in campaign
        </Button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-[#E8B968]/40 bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B8651A]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Meta interests — e.g. 'yoga', 'restaurants', 'diwali'…"
            className="pl-9"
          />
        </div>

        {/* India SMB quick-picks — show when no search */}
        {!debouncedSearch && (
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-foreground/55 mb-1.5">
              Popular for Indian SMBs
            </p>
            <div className="flex flex-wrap gap-1.5">
              {INDIA_SMB_INTEREST_QUICKPICKS.map((q) => (
                <button
                  key={q}
                  onClick={() => setSearch(q)}
                  className="px-2.5 h-7 rounded-full text-[11px] font-extrabold bg-[#FFF1D6] text-[#7A4A00] border border-[#E8B968] hover:bg-[#FFE8C7] hover:scale-105 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="divide-y divide-[#E8B968]/40 max-h-[420px] overflow-y-auto">
        {interestsQ.isPending && interests.length === 0 && (
          <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-foreground/40" /></div>
        )}
        {!interestsQ.isPending && interests.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-[13px] font-extrabold">No results</p>
            <p className="text-[11px] text-foreground/55 mt-1">Try a different keyword</p>
          </div>
        )}
        {interests.map((i) => (
          <div key={i.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-[#FFF6E8] transition">
            <div className="w-9 h-9 rounded-lg bg-[#FFEAD9] text-[#FF6A1F] flex items-center justify-center flex-shrink-0">
              <Target className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-extrabold truncate">{i.name}</p>
              {i.topic && <p className="text-[10.5px] text-foreground/55 font-medium">{i.topic}</p>}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[13px] font-black tabular-nums">{formatReach(i.audience_size_lower_bound, i.audience_size_upper_bound)}</p>
              <p className="text-[9px] text-foreground/55 font-extrabold uppercase tracking-wider">Reach</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footnote */}
      <div className="px-4 py-2.5 bg-[#FFF6E8] border-t border-[#E8B968]/40 flex items-center gap-2">
        {isDemo ? (
          <>
            <AlertTriangle className="w-3.5 h-3.5 text-[#B8651A] flex-shrink-0" />
            <p className="text-[10.5px] text-foreground/65 font-medium">
              <strong>Sample data shown</strong> — connect Meta Ads to browse the full ~50,000 live interest categories.
            </p>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#0E8A4B] flex-shrink-0" />
            <p className="text-[10.5px] text-foreground/65 font-medium">
              Live from Meta — pick interests when creating a campaign to target NEW customers matching these profiles.
            </p>
          </>
        )}
      </div>
    </div>
  );
};


/* ============================================================
   BOOST WHATSAPP DIALOG (1-click)
============================================================ */

const BoostWhatsAppDialog = ({
  open, onOpenChange, isConnected,
}: { open: boolean; onOpenChange: (v: boolean) => void; isConnected: boolean }) => {
  const qc = useQueryClient();
  const [budget, setBudget] = useState("500");
  const [days, setDays] = useState("7");

  const boost = useMutation({
    mutationFn: () =>
      api.createAdCampaign({
        name: `WhatsApp Boost · ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
        objective: "MESSAGES",
        daily_budget_inr: Number(budget),
        status: "PAUSED",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ads", "campaigns"] });
      toast.success(`Boost campaign created (paused — review in Meta Ads Manager to launch)`);
      onOpenChange(false);
    },
    onError: (e) => toast.error(String(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0E8A4B] to-[#16C172] text-white flex items-center justify-center shadow-md">
              <MessageCircle className="w-5 h-5" fill="currentColor" strokeWidth={0} />
            </div>
            <div>
              <DialogTitle>WhatsApp ko boost karein</DialogTitle>
              <DialogDescription className="text-foreground/70 font-medium">
                1-click Click-to-WhatsApp ads launch karein · Meta API se
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="bg-[#FFF6E8] border-2 border-[#E8B968] rounded-xl p-3 my-2">
          <p className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold mb-1">Pre-filled by AI</p>
          <ul className="space-y-1 text-[12px] font-medium">
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#0E8A4B]" strokeWidth={3} /> Audience: FabBox lookalike 1% (2.1M)</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#0E8A4B]" strokeWidth={3} /> Creative: Diwali_offer_v3.jpg (best CTR)</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#0E8A4B]" strokeWidth={3} /> CTA opens WhatsApp pre-filled with greeting</li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="boost-budget">Daily budget</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FF6A1F]" />
              <Input id="boost-budget" type="number" value={budget} onChange={(e) => setBudget(e.target.value)} min={100} step={100} className="pl-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="boost-days">Run for (days)</Label>
            <Input id="boost-days" type="number" value={days} onChange={(e) => setDays(e.target.value)} min={1} max={30} />
          </div>
        </div>

        <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-[#0A3D24] to-[#0D4E2E] text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }} />
          <p className="relative text-[10px] uppercase tracking-[0.15em] text-[#FFD23F] font-extrabold">Total spend</p>
          <p className="relative text-2xl font-black tracking-tight mt-0.5">
            ₹{(Number(budget) * Number(days)).toLocaleString("en-IN")}
            <span className="text-[12px] opacity-80 font-medium ml-1.5">over {days} din</span>
          </p>
          <p className="relative text-[11px] text-white/80 font-medium mt-1">
            Expected: ~{Math.round(Number(budget) * Number(days) / 25)} new WhatsApp chats
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={boost.isPending}
            onClick={() => {
              if (!isConnected) {
                toast.error("Connect Meta Ads first");
                return;
              }
              boost.mutate();
            }}
          >
            {boost.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Boost shuru karein
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ============================================================
   CONNECT META ADS DIALOG
   Two flows in one dialog, OAuth-first:
     1. Facebook Login (preferred — one-click)
     2. Manual System User token paste (fallback for advanced users +
        anyone hitting App Review limits before approval)
============================================================ */

type ConnectStep = "choose" | "pickAccount" | "manual";

const ConnectMetaAdsDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => {
  const qc = useQueryClient();
  const [step, setStep] = useState<ConnectStep>("choose");
  const [oauthLoading, setOauthLoading] = useState(false);

  // Whether the server has Meta App credentials configured. If not, we hide
  // the Facebook Login button and the dialog collapses to manual-only.
  const oauthStatusQ = useQuery({
    queryKey: ["ads", "oauth-status"],
    queryFn: () => api.getMetaOAuthStatus(),
    enabled: open,
    staleTime: 5 * 60_000,
  });
  const oauthAvailable = oauthStatusQ.data?.available ?? false;

  // Listen for postMessage from the OAuth popup window
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type !== "addisonx-meta-oauth") return;
      setOauthLoading(false);
      if (e.data.ok) {
        toast.success("Facebook authorized — pick your ad account");
        setStep("pickAccount");
        qc.invalidateQueries({ queryKey: ["ads"] });
      } else {
        toast.error(e.data.error ?? "OAuth failed");
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [qc]);

  // Reset when the dialog closes
  useEffect(() => {
    if (!open) {
      setStep("choose");
      setOauthLoading(false);
    }
  }, [open]);

  const startOAuth = () => {
    setOauthLoading(true);
    const w = 600, h = 740;
    const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
    const popup = window.open(
      api.metaOAuthStartUrl(),
      "addisonx-meta-oauth",
      `width=${w},height=${h},left=${left},top=${top},popup=1`
    );
    if (!popup) {
      setOauthLoading(false);
      toast.error("Popup blocked. Allow popups for this site and try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-11 h-11 rounded-xl bg-[#0866FF] text-white flex items-center justify-center shadow-md text-xl font-black">f</div>
            <div>
              <DialogTitle>
                {step === "pickAccount" ? "Pick an ad account" :
                 step === "manual"      ? "Connect with System User token" :
                                          "Connect Meta Ads"}
              </DialogTitle>
              <DialogDescription className="text-foreground/70 font-medium">
                {step === "pickAccount" ? "Choose which account AddisonX should manage." :
                 step === "manual"      ? "Advanced flow for Business Manager admins." :
                                          "One-click via Facebook Login — no token pasting needed."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === "choose" && (
          <>
            {oauthAvailable ? (
              <>
                <button
                  onClick={startOAuth}
                  disabled={oauthLoading}
                  className="mt-2 w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-[#0866FF] hover:bg-[#0050D6] text-white font-extrabold text-[14px] shadow-md transition disabled:opacity-60"
                >
                  {oauthLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-lg font-black">f</span>}
                  {oauthLoading ? "Waiting for Facebook…" : "Continue with Facebook"}
                </button>
                <p className="text-[11px] text-foreground/60 font-medium text-center mt-2">
                  AddisonX will request <strong>ads_management</strong>, <strong>ads_read</strong>, and <strong>business_management</strong> permissions. You can revoke any time in Meta Business Settings.
                </p>
              </>
            ) : (
              <div className="mt-2 p-3 rounded-xl bg-[#FFF1D6] border-2 border-[#E8B968]">
                <p className="text-[12px] font-extrabold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-[#B8651A]" /> One-click Facebook Login isn't enabled on this server.</p>
                <p className="text-[11px] text-foreground/70 font-medium mt-1">
                  Ask your admin to set <span className="font-mono bg-white px-1 rounded">META_APP_ID</span>, <span className="font-mono bg-white px-1 rounded">META_APP_SECRET</span>, and <span className="font-mono bg-white px-1 rounded">META_OAUTH_REDIRECT_URI</span>. Until then, use the manual flow below.
                </p>
              </div>
            )}

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#E8B968]/60" /></div>
              <div className="relative flex justify-center"><span className="bg-white px-2 text-[10px] uppercase tracking-[0.18em] text-foreground/55 font-extrabold">or advanced</span></div>
            </div>

            <button
              onClick={() => setStep("manual")}
              className="w-full text-left p-3 rounded-xl border-2 border-[#E8B968] bg-[#FFF6E8] hover:bg-[#FFE8C7] transition"
            >
              <p className="text-[13px] font-extrabold">Paste a System User token</p>
              <p className="text-[11px] text-foreground/65 font-medium mt-0.5">
                For Business Manager admins who already have a token. Bypasses Facebook Login entirely.
              </p>
            </button>

            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            </DialogFooter>
          </>
        )}

        {step === "pickAccount" && (
          <PickAdAccountStep
            onDone={() => { onOpenChange(false); qc.invalidateQueries({ queryKey: ["ads"] }); }}
            onBack={() => setStep("choose")}
          />
        )}

        {step === "manual" && (
          <ManualConnectStep
            onDone={() => { onOpenChange(false); qc.invalidateQueries({ queryKey: ["ads"] }); }}
            onBack={() => setStep("choose")}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

/* ─── Step: pick an ad account after OAuth ─── */
const PickAdAccountStep = ({ onDone, onBack }: { onDone: () => void; onBack: () => void }) => {
  const accountsQ = useQuery({
    queryKey: ["ads", "accounts-available"],
    queryFn: () => api.listAvailableAdAccounts(),
    staleTime: 30_000,
  });
  const [picked, setPicked] = useState<string | null>(null);
  const selectMut = useMutation({
    mutationFn: (adAccountId: string) => api.selectAdAccount(adAccountId),
    onSuccess: (r) => { toast.success(`Connected to ${r.adAccountName} (${r.adAccountCurrency})`); onDone(); },
    onError: (e) => toast.error(String(e)),
  });

  if (accountsQ.isPending) {
    return <div className="py-10 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-foreground/40" /></div>;
  }
  if (accountsQ.error) {
    return (
      <div className="py-6 text-center">
        <p className="text-[13px] font-extrabold text-[#D4308E]">Couldn't load your ad accounts</p>
        <p className="text-[11px] text-foreground/60 mt-1">{String(accountsQ.error)}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={onBack}>Back</Button>
      </div>
    );
  }
  const accounts = accountsQ.data?.accounts ?? [];
  if (accounts.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-[14px] font-extrabold">No ad accounts visible</p>
        <p className="text-[12px] text-foreground/65 mt-1.5 max-w-sm mx-auto">
          Your Facebook user doesn't have access to any ad accounts via this app yet. In Meta Business Manager, assign at least one ad account to yourself.
        </p>
        <Button variant="outline" size="sm" className="mt-3" onClick={onBack}>Back</Button>
      </div>
    );
  }
  return (
    <>
      <div className="max-h-[360px] overflow-y-auto -mx-2 px-2 space-y-2 mt-2">
        {accounts.map((a) => {
          const disabled = a.account_status !== 1;
          const selected = picked === a.id;
          return (
            <button
              key={a.id}
              onClick={() => !disabled && setPicked(a.id)}
              disabled={disabled}
              className={cn(
                "w-full text-left p-3 rounded-xl border-2 transition flex items-center gap-3",
                selected ? "border-[#0866FF] bg-[#E6EEFF]" :
                disabled ? "border-[#E8B968]/40 bg-[#FFF6E8]/50 opacity-60 cursor-not-allowed" :
                           "border-[#E8B968] bg-white hover:bg-[#FFF6E8]"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-black",
                selected ? "bg-[#0866FF]" : "bg-[#B8651A]"
              )}>
                {a.currency || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-extrabold truncate">{a.name}</p>
                <p className="text-[11px] text-foreground/60 font-mono truncate">act_{a.account_id} · {a.business?.name ?? "personal"}</p>
              </div>
              {disabled && <span className="text-[10px] font-extrabold text-[#B8651A] uppercase tracking-wider">Inactive</span>}
              {selected && <CheckCircle2 className="w-5 h-5 text-[#0866FF] flex-shrink-0" />}
            </button>
          );
        })}
      </div>
      <DialogFooter className="gap-2 sm:gap-2 mt-3">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button
          disabled={!picked || selectMut.isPending}
          onClick={() => picked && selectMut.mutate(picked)}
        >
          {selectMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          Use this account
        </Button>
      </DialogFooter>
    </>
  );
};

/* ─── Step: manual System User token paste (fallback) ─── */
const ManualConnectStep = ({ onDone, onBack }: { onDone: () => void; onBack: () => void }) => {
  const [adAccountId, setAdAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const connect = useMutation({
    mutationFn: () => api.connectAds({ adAccountId: adAccountId.trim(), accessToken: accessToken.trim() }),
    onSuccess: (r) => { toast.success(`Connected to ${r.ad_account_name} (${r.ad_account_currency})`); onDone(); },
    onError: (e) => toast.error(String(e)),
  });
  return (
    <>
      <div className="bg-[#FFF1D6] border border-[#E8B968] rounded-xl p-3 my-1 text-[12px] leading-relaxed">
        <p className="font-extrabold mb-1.5 flex items-center gap-1.5">
          <Plug className="w-3.5 h-3.5 text-[#B8651A]" /> Where to find these
        </p>
        <ol className="space-y-0.5 pl-4 list-decimal text-foreground/80">
          <li>Open <span className="font-mono bg-white px-1 rounded">business.facebook.com</span> → Settings → Users → System Users</li>
          <li>Create or pick a system user → "Generate New Token" with <strong>ads_management</strong>, <strong>ads_read</strong>, <strong>business_management</strong> scopes</li>
          <li>Copy that token (starts with <span className="font-mono">EAA…</span>) here</li>
          <li>Ad Account ID is the number after <span className="font-mono">act_</span> in Ads Manager URL (e.g. <span className="font-mono">act_84720</span> → paste <span className="font-mono">84720</span>)</li>
        </ol>
      </div>
      <div className="space-y-3 mt-2">
        <div className="space-y-1.5">
          <Label htmlFor="ad-account-id">Ad Account ID</Label>
          <Input
            id="ad-account-id"
            value={adAccountId}
            onChange={(e) => setAdAccountId(e.target.value)}
            placeholder="e.g. 84720"
            className="font-mono"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ad-token">System User Access Token</Label>
          <Input
            id="ad-token"
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="EAA…"
            className="font-mono text-[12px]"
          />
          <p className="text-[10px] text-foreground/60 font-medium">
            Encrypted at rest. Can be revoked any time in Business Manager.
          </p>
        </div>
      </div>
      <DialogFooter className="gap-2 sm:gap-2 mt-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button
          disabled={connect.isPending || !adAccountId.trim() || !accessToken.trim()}
          onClick={() => connect.mutate()}
        >
          {connect.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plug className="w-3.5 h-3.5" />}
          Verify & connect
        </Button>
      </DialogFooter>
    </>
  );
};
