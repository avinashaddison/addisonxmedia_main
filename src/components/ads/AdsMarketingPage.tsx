import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Target, IndianRupee, MousePointerClick, Eye, TrendingUp, Sparkles, Plus,
  Play, Pause, Copy, MoreHorizontal, Crown, Flame, ArrowRight, ArrowUpRight,
  ShoppingBag, Users, MessageCircle, CheckCircle2, AlertTriangle, Search,
  ChevronDown, Image as ImageIcon, Megaphone, Zap, Globe, BarChart3, Heart,
  Tag, Wallet, Brain, Plug, Loader2,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

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

type Audience = { id: string; name: string; type: "custom" | "lookalike" | "saved"; size: number; source: string; status: "ready" | "building" };

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
  const qc = useQueryClient();
  const [tab, setTab] = useState("campaigns");
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<"all" | Platform>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "review">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);

  const connectionQ = useQuery({ queryKey: ["ads", "connection"], queryFn: () => api.getAdsConnection() });
  const campaignsQ = useQuery({ queryKey: ["ads", "campaigns"], queryFn: () => api.listAdCampaigns() });
  const insightsQ = useQuery({ queryKey: ["ads", "insights", "last_7d"], queryFn: () => api.getAdInsights("last_7d") });
  const audiencesQ = useQuery({ queryKey: ["ads", "audiences"], queryFn: () => api.listAdAudiences() });

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
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            Naya campaign
          </Button>
        </div>
      }
    >
      {/* ============ DEMO BANNER (when no connection yet) ============ */}
      {!isConnected && !connectionQ.isPending && (
        <div className="bg-[#FFF1D6] border-2 border-[#E8B968] rounded-2xl px-4 py-3 mb-3 flex items-center gap-3 shadow-[0_3px_0_0_#E8B968]">
          <div className="w-9 h-9 rounded-xl bg-[#FFD23F] text-[#7A4A00] flex items-center justify-center shadow-md flex-shrink-0">
            <AlertTriangle className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-extrabold">Demo mode</p>
            <p className="text-[11px] text-foreground/70 font-medium">
              Yeh sab demo data hai. Connect Meta Ads to see your real campaigns + insights.
            </p>
          </div>
          <Button size="sm" onClick={() => setConnectOpen(true)}>
            <Plug className="w-3.5 h-3.5" /> Connect now
          </Button>
        </div>
      )}

      {/* ============ CONNECTION STATUS ============ */}
      <div className="grid md:grid-cols-2 gap-3 mb-4">
        <ConnectionCard
          platform="meta"
          name="Meta Ads"
          subtitle="Facebook · Instagram · WhatsApp"
          accountName={
            isConnected
              ? `${connectionQ.data?.ad_account_name ?? "—"} · #${connectionQ.data?.ad_account_id ?? ""}`
              : "Connect to see your campaigns"
          }
          connected={isConnected}
          loading={connectionQ.isPending}
          onConnect={() => setConnectOpen(true)}
          onDisconnect={() => disconnect.mutate()}
        />
        <ConnectionCard
          platform="google"
          name="Google Ads"
          subtitle="Search · YouTube · Display · PMax"
          accountName="Coming soon"
        />
      </div>

      {/* ============ KPI STATS ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <AdKPI
          label="Total spend (7 din)"
          value={compactINR(stats.spent)}
          sub={`${CAMPAIGNS.filter((c) => c.status === "active").length} active campaigns`}
          icon={IndianRupee}
          color="accent"
          trend="+18% vs last week"
        />
        <AdKPI
          label="Impressions"
          value={compactNum(stats.impressions)}
          sub={`Reach: ${compactNum(Math.round(stats.impressions * 0.42))}`}
          icon={Eye}
          color="primary"
          trend="+22% vs last week"
        />
        <AdKPI
          label="Clicks · CTR"
          value={compactNum(stats.clicks)}
          sub={`${stats.ctr.toFixed(2)}% CTR · ${fmtINR(stats.spent / Math.max(1, stats.clicks))} CPC`}
          icon={MousePointerClick}
          color="hot"
          trend="+8% vs last week"
        />
        <AdKPI
          label="ROAS"
          value={`${stats.roas.toFixed(1)}x`}
          sub={`Revenue: ${compactINR(stats.revenue)}`}
          icon={TrendingUp}
          color="success"
          highlight
          trend={`+ ${compactINR(stats.revenue - stats.spent)} profit`}
        />
      </div>

      {/* ============ AI SUGGESTIONS STRIP ============ */}
      <div className="relative bg-gradient-to-r from-[#0A3D24] to-[#0D4E2E] text-white rounded-2xl border-2 border-[#0A3D24] shadow-[0_4px_0_0_#072917] p-4 mb-4 flex items-center gap-4 flex-wrap overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }}
        />
        <div className="relative w-10 h-10 rounded-xl bg-[#FFD23F] text-[#7A4A00] flex items-center justify-center shadow-md flex-shrink-0">
          <Brain className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <div className="relative flex-1 min-w-[220px]">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#FFD23F] font-extrabold">Addison AI Suggestions</p>
          <p className="text-[14px] font-extrabold mt-0.5">2 campaigns ka budget badhao · ROAS 5x se upar hai</p>
        </div>
        <div className="relative flex items-center gap-2">
          <button className="text-[11px] font-extrabold bg-[#FFD23F] text-[#7A4A00] px-3 py-1.5 rounded-lg shadow-md hover:scale-105 transition">
            Apply (+₹500/day)
          </button>
          <button className="text-[11px] font-bold opacity-80 hover:opacity-100 transition">Dismiss</button>
        </div>
      </div>

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
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Audience list */}
          <div className="lg:col-span-2 bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_4px_0_0_#E8B968] overflow-hidden">
            <div className="px-4 py-3 border-b-2 border-[#E8B968] bg-[#FFF1D6] flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#3C50E0] text-white flex items-center justify-center shadow-md">
                  <Users className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-[14px] font-black tracking-tight">Audiences</h3>
                  <p className="text-[11px] text-foreground/60 font-medium">Custom · Lookalike · Saved targeting</p>
                </div>
              </div>
              <Button size="sm" variant="outline">
                <Plus className="w-3.5 h-3.5" /> Naya audience
              </Button>
            </div>

            <div className="divide-y divide-[#E8B968]/40">
              {audiences.length === 0 && audiencesQ.isPending && (
                <div className="px-4 py-12 text-center">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#B8230C]" />
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
                      {a.status === "ready" ? (
                        <p className="text-[10px] text-[#0E8A4B] font-extrabold uppercase tracking-wider">Ready</p>
                      ) : (
                        <p className="text-[10px] text-[#B8651A] font-extrabold uppercase tracking-wider flex items-center gap-1">
                          <Loader2Sm /> Building
                        </p>
                      )}
                    </div>
                    <button className="w-8 h-8 rounded-lg hover:bg-[#FFE8C7] flex items-center justify-center text-foreground/60 hover:text-foreground transition">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
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

      {/* ============ INSIGHTS TAB ============ */}
      {tab === "insights" && (
        <div className="grid lg:grid-cols-2 gap-4">
          <InsightCard
            title="Best performer"
            icon={Crown}
            color="success"
            stat="Class 10 Admissions"
            sub="ROAS 6.2x · ₹2.16 CPC · 318 form fills"
          />
          <InsightCard
            title="Needs attention"
            icon={AlertTriangle}
            color="warning"
            stat="Salon Bookings · PMax"
            sub="ROAS 3.2x — below threshold · paused 2 din pehle"
          />
          <InsightCard
            title="Most clicked creative"
            icon={Flame}
            color="hot"
            stat="Diwali_offer_v3.jpg"
            sub="CTR 4.8% · 12,400 clicks across 3 ads"
          />
          <InsightCard
            title="Top audience"
            icon={Users}
            color="primary"
            stat="FabBox buyers lookalike 1%"
            sub="₹1.84 CPC · 2.1M reach · running 14 days"
          />
        </div>
      )}

      {/* ============ CREATE CAMPAIGN DIALOG ============ */}
      <CreateCampaignDialog open={createOpen} onOpenChange={setCreateOpen} audiences={audiences} isConnected={isConnected} />

      {/* ============ BOOST WHATSAPP DIALOG ============ */}
      <BoostWhatsAppDialog open={boostOpen} onOpenChange={setBoostOpen} isConnected={isConnected} />

      {/* ============ CONNECT META ADS DIALOG ============ */}
      <ConnectMetaAdsDialog open={connectOpen} onOpenChange={setConnectOpen} />
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

const ConnectionCard = ({
  platform, name, subtitle, accountName, connected, loading, onConnect, onDisconnect,
}: {
  platform: Platform;
  name: string;
  subtitle: string;
  accountName: string;
  connected?: boolean;
  loading?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
}) => {
  const styles = platform === "meta"
    ? { iconBg: "bg-[#0866FF]", border: "border-[#0866FF]", shadow: "shadow-[0_4px_0_0_#0050D6]", logo: "f" }
    : { iconBg: "bg-[#34A853]", border: "border-[#34A853]", shadow: "shadow-[0_4px_0_0_#1E7E34]", logo: "G" };

  return (
    <div className={cn("relative bg-white border-2 rounded-2xl p-4 flex items-center gap-3", styles.border, styles.shadow)}>
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-black shadow-md", styles.iconBg)}>
        {styles.logo}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[15px] font-black tracking-tight truncate">{name}</p>
          {connected ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E6F7EE] border border-[#0E8A4B]/30 text-[#0E8A4B] text-[10px] font-extrabold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0E8A4B] animate-pulse" />
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF1D6] border border-[#E8B968] text-[#B8651A] text-[10px] font-extrabold uppercase tracking-wider">
              Not connected
            </span>
          )}
        </div>
        <p className="text-[11px] text-foreground/60 font-medium">{subtitle}</p>
        <p className="text-[11px] text-foreground/80 mt-0.5 font-extrabold">{accountName}</p>
      </div>
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-foreground/40" />
      ) : connected ? (
        <Button variant="outline" size="sm" onClick={onDisconnect}>Disconnect</Button>
      ) : platform === "meta" ? (
        <Button size="sm" onClick={onConnect}>
          Connect <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={() => toast.info("Google Ads integration is on the v1.2 roadmap")}>
          Coming soon
        </Button>
      )}
    </div>
  );
};

const AdKPI = ({
  label, value, sub, icon: Icon, color, trend, highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Target;
  color: "primary" | "accent" | "success" | "hot";
  trend?: string;
  highlight?: boolean;
}) => {
  const styles = {
    primary: { border: "border-[#3C50E0]", shadow: "shadow-[0_4px_0_0_#2533A8]", iconBg: "bg-[#3C50E0]", trendText: "text-[#3C50E0]" },
    accent:  { border: "border-[#FF6A1F]", shadow: "shadow-[0_4px_0_0_#B8420A]", iconBg: "bg-[#FF6A1F]", trendText: "text-[#FF6A1F]" },
    success: { border: "border-[#0E8A4B]", shadow: "shadow-[0_4px_0_0_#0A6E3C]", iconBg: "bg-[#0E8A4B]", trendText: "text-[#0E8A4B]" },
    hot:     { border: "border-[#D4308E]", shadow: "shadow-[0_4px_0_0_#A11A6A]", iconBg: "bg-[#D4308E]", trendText: "text-[#D4308E]" },
  }[color];

  return (
    <div className={cn("relative overflow-hidden bg-white border-2 rounded-2xl p-4", styles.border, styles.shadow)}>
      <div className="flex items-center justify-between mb-3">
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md", styles.iconBg)}>
          <Icon className="w-5 h-5" strokeWidth={2.5} />
        </div>
        {trend && (
          <span className={cn("inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#E6F7EE] border border-[#0E8A4B]/30 text-[10px] font-extrabold", styles.trendText)}>
            <ArrowUpRight className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>
      <p className="text-[11px] uppercase tracking-[0.15em] text-foreground/60 font-extrabold">{label}</p>
      <p className={cn("text-3xl font-black tracking-tight tabular-nums mt-1", highlight && styles.trendText)}>{value}</p>
      {sub && <p className="text-[11px] text-foreground/60 font-medium mt-1">{sub}</p>}
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

const CampaignRow = ({ c, onToggle }: { c: AdCampaign; onToggle?: () => void }) => {
  const statusStyles = {
    active:  { dot: "bg-[#0E8A4B]", text: "text-[#0E8A4B]", bg: "bg-[#E6F7EE]", label: "Active" },
    paused:  { dot: "bg-[#B8651A]", text: "text-[#B8651A]", bg: "bg-[#FFF1D6]", label: "Paused" },
    review:  { dot: "bg-[#FFD23F]", text: "text-[#7A4A00]", bg: "bg-[#FFF8DD]", label: "In review" },
  }[c.status];

  const spentPct = Math.min(100, (c.spent_inr / Math.max(1, c.daily_budget_inr * 7)) * 100);

  return (
    <div className="grid grid-cols-[36px_1.6fr_110px_1fr_120px_120px_110px_110px_90px_60px] gap-3 px-4 py-3 border-b border-[#E8B968]/40 last:border-b-0 items-center hover:bg-[#FFF6E8] transition min-w-[1100px]">
      <button onClick={onToggle} className="w-7 h-7 rounded-lg bg-[#FFF1D6] border border-[#E8B968] flex items-center justify-center hover:bg-[#FFE8C7] transition">
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
      <button className="w-8 h-8 rounded-lg hover:bg-[#FFE8C7] flex items-center justify-center text-foreground/60 hover:text-foreground transition">
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
   CREATE CAMPAIGN DIALOG
============================================================ */

const OBJECTIVE_TO_META: Record<string, string> = {
  ctw: "MESSAGES",
  leads: "OUTCOME_LEADS",
  sales: "OUTCOME_SALES",
  traffic: "OUTCOME_TRAFFIC",
  engagement: "OUTCOME_ENGAGEMENT",
  catalog: "OUTCOME_SALES",
};

const CreateCampaignDialog = ({
  open, onOpenChange, audiences, isConnected,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  audiences: Audience[];
  isConnected: boolean;
}) => {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [objective, setObjective] = useState("ctw");
  const [platform, setPlatform] = useState<Platform>("meta");
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("1000");
  const [audience, setAudience] = useState<string>(audiences[0]?.id ?? "");
  const [optimizeAI, setOptimizeAI] = useState(true);

  const create = useMutation({
    mutationFn: (vars: { name: string; objective: string; daily_budget_inr: number }) =>
      api.createAdCampaign({ ...vars, status: "PAUSED" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ads", "campaigns"] });
      toast.success(`Campaign "${name}" created (paused — review in Meta Ads Manager before going live)`);
      onOpenChange(false);
      reset();
    },
    onError: (e) => toast.error(String(e)),
  });

  const reset = () => { setStep(1); setObjective("ctw"); setName(""); setBudget("1000"); setAudience(audiences[0]?.id ?? ""); };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF6A1F] to-[#E85C12] text-white flex items-center justify-center shadow-md">
              <Megaphone className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div>
              <DialogTitle>Naya campaign banaiye</DialogTitle>
              <DialogDescription className="text-foreground/70 font-medium">
                Step {step} of 3 · {step === 1 ? "Objective" : step === 2 ? "Audience & Budget" : "Review"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 my-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "flex-1 h-2 rounded-full transition-all",
                s <= step ? "bg-[#FF6A1F]" : "bg-[#FFF1D6] border border-[#E8B968]"
              )}
            />
          ))}
        </div>

        {/* Step 1: Objective + Platform */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Objective kya hai?</Label>
              <div className="grid grid-cols-2 gap-2">
                {objectives.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setObjective(o.id)}
                    className={cn(
                      "relative p-3 rounded-xl border-2 text-left transition-all",
                      objective === o.id
                        ? "border-[#FF6A1F] bg-[#FFEFE0] shadow-[0_2px_0_0_#B8420A]"
                        : "border-[#E8B968] bg-white hover:bg-[#FFF6E8]"
                    )}
                  >
                    {o.recommended && (
                      <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded-full bg-[#FFD23F] text-[#7A4A00] text-[9px] font-extrabold uppercase tracking-wider">
                        AI pick
                      </span>
                    )}
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center",
                        objective === o.id ? "bg-[#FF6A1F] text-white" : "bg-[#FFF1D6] text-[#B8651A]"
                      )}>
                        <o.icon className="w-4 h-4" strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-extrabold">{o.label}</p>
                        <p className="text-[10px] text-foreground/60 font-medium">{o.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Platform</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPlatform("meta")}
                  className={cn(
                    "p-3 rounded-xl border-2 flex items-center gap-2.5 transition-all",
                    platform === "meta"
                      ? "border-[#0866FF] bg-[#E6EEFF] shadow-[0_2px_0_0_#0050D6]"
                      : "border-[#E8B968] bg-white hover:bg-[#FFF6E8]"
                  )}
                >
                  <div className="w-9 h-9 rounded-lg bg-[#0866FF] text-white flex items-center justify-center text-base font-black">f</div>
                  <div className="text-left">
                    <p className="text-[13px] font-extrabold">Meta</p>
                    <p className="text-[10px] text-foreground/60 font-medium">FB · IG · WhatsApp</p>
                  </div>
                </button>
                <button
                  onClick={() => setPlatform("google")}
                  className={cn(
                    "p-3 rounded-xl border-2 flex items-center gap-2.5 transition-all",
                    platform === "google"
                      ? "border-[#34A853] bg-[#E6F4EA] shadow-[0_2px_0_0_#1E7E34]"
                      : "border-[#E8B968] bg-white hover:bg-[#FFF6E8]"
                  )}
                >
                  <div className="w-9 h-9 rounded-lg bg-[#34A853] text-white flex items-center justify-center text-base font-black">G</div>
                  <div className="text-left">
                    <p className="text-[13px] font-extrabold">Google</p>
                    <p className="text-[10px] text-foreground/60 font-medium">Search · YT · PMax</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Name + Audience + Budget */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ad-campaign-name">Campaign ka naam</Label>
              <Input
                id="ad-campaign-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Diwali Sale · CTW Ads"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label>Audience</Label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {audiences.filter((a) => a.status === "ready").map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} <span className="text-foreground/60">· {compactNum(a.size)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ad-budget">Daily budget (₹)</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FF6A1F]" />
                <Input
                  id="ad-budget"
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  min={100}
                  step={100}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-1.5 mt-1">
                {["500", "1000", "2500", "5000"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setBudget(p)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-extrabold border-2 transition-all",
                      budget === p
                        ? "bg-[#FF6A1F] text-white border-[#B8420A]"
                        : "bg-white text-foreground/70 border-[#E8B968] hover:bg-[#FFF1D6]"
                    )}
                  >
                    ₹{p}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FFF1D6] border-2 border-[#E8B968]">
              <Switch checked={optimizeAI} onCheckedChange={setOptimizeAI} />
              <div className="flex-1">
                <p className="text-[13px] font-extrabold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF6A1F]" />
                  Addison AI ko optimize karne dein
                </p>
                <p className="text-[11px] text-foreground/70 font-medium">Budget, bid aur creatives auto-adjust honge</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-3">
            <ReviewRow label="Objective" value={objectives.find((o) => o.id === objective)?.label || objective} />
            <ReviewRow label="Platform" value={platform === "meta" ? "Meta (FB · IG · WhatsApp)" : "Google Ads"} />
            <ReviewRow label="Name" value={name || "(no name)"} />
            <ReviewRow label="Audience" value={audiences.find((a) => a.id === audience)?.name || "—"} />
            <ReviewRow label="Daily budget" value={`₹${Number(budget).toLocaleString("en-IN")}/day · ₹${(Number(budget) * 7).toLocaleString("en-IN")}/week`} />
            <ReviewRow label="AI optimization" value={optimizeAI ? "On" : "Off"} />

            <div className="mt-4 p-3 rounded-xl bg-[#E6F7EE] border-2 border-[#0E8A4B]">
              <p className="text-[12px] font-extrabold text-[#0E8A4B] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Estimated reach: 18,000–42,000 logon tak
              </p>
              <p className="text-[11px] text-foreground/70 mt-1 font-medium">
                Expected: ~{Math.round(Number(budget) / 3)} clicks per din at avg ₹3 CPC
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2 mt-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={step === 2 && !name.trim()}>
              Continue <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              disabled={create.isPending}
              onClick={() => {
                if (!isConnected) {
                  toast.error("Connect Meta Ads first (the Connect button on top of the page)");
                  return;
                }
                if (platform === "google") {
                  toast.info("Google Ads is on the v1.2 roadmap. For now, create your campaign in Meta.");
                  return;
                }
                create.mutate({
                  name,
                  objective: OBJECTIVE_TO_META[objective] ?? "MESSAGES",
                  daily_budget_inr: Number(budget),
                });
              }}
            >
              {create.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Launch karein
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ReviewRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#FFF6E8] border border-[#E8B968]">
    <span className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold">{label}</span>
    <span className="text-[13px] font-extrabold text-foreground text-right">{value}</span>
  </div>
);

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
   CONNECT META ADS DIALOG (manual System User token paste)
============================================================ */

const ConnectMetaAdsDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => {
  const qc = useQueryClient();
  const [adAccountId, setAdAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");

  const connect = useMutation({
    mutationFn: () => api.connectAds({ adAccountId: adAccountId.trim(), accessToken: accessToken.trim() }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["ads"] });
      toast.success(`Connected to ${r.ad_account_name} (${r.ad_account_currency})`);
      onOpenChange(false);
      setAdAccountId("");
      setAccessToken("");
    },
    onError: (e) => toast.error(String(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-11 h-11 rounded-xl bg-[#0866FF] text-white flex items-center justify-center shadow-md text-xl font-black">f</div>
            <div>
              <DialogTitle>Connect Meta Ads</DialogTitle>
              <DialogDescription className="text-foreground/70 font-medium">
                Paste your Business Manager System User token + Ad Account ID
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="bg-[#FFF1D6] border border-[#E8B968] rounded-xl p-3 my-1 text-[12px] leading-relaxed">
          <p className="font-extrabold mb-1.5 flex items-center gap-1.5">
            <Plug className="w-3.5 h-3.5 text-[#B8651A]" /> Yeh kahan se laaye?
          </p>
          <ol className="space-y-0.5 pl-4 list-decimal text-foreground/80">
            <li>Open <span className="font-mono bg-white px-1 rounded">business.facebook.com</span> → Settings → Users → System Users</li>
            <li>Create or pick a system user → "Generate New Token" with <strong>ads_management</strong>, <strong>ads_read</strong>, <strong>business_management</strong> scopes</li>
            <li>Copy that token (starts with <span className="font-mono">EAA…</span>) here</li>
            <li>Ad Account ID is the number after <span className="font-mono">act_</span> in your Ads Manager URL (e.g. <span className="font-mono">act_84720</span> → paste <span className="font-mono">84720</span>)</li>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={connect.isPending || !adAccountId.trim() || !accessToken.trim()}
            onClick={() => connect.mutate()}
          >
            {connect.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plug className="w-3.5 h-3.5" />}
            Verify & connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
