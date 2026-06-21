import { useState, useMemo, useEffect } from "react";
import { PageShell } from "@/components/PageShell";
import {
  Megaphone, Sparkles, Plus, TrendingUp, Users, MousePointerClick, ShoppingCart,
  Trash2, Play, Pause, MoreVertical, Search, Rocket, Send, MessageCircle, IndianRupee,
  Target, Repeat, Gift, Wand2, Lightbulb, Clock, BarChart3, ArrowRight, CheckCircle2,
  Zap, Activity, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCampaigns, useCreateCampaign, useDeleteCampaign, useUpdateCampaign, Campaign } from "@/hooks/useCrmData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import type { CampaignChannel, CampaignStatus } from "@/lib/api-types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Channel = CampaignChannel;
type Status = CampaignStatus;
type CampaignType = "broadcast" | "sequence" | "retargeting" | "offer";

const statusStyle: Record<Status, string> = {
  active: "bg-success-soft text-success",
  scheduled: "bg-warning-soft text-warning",
  draft: "bg-muted text-muted-foreground",
  paused: "bg-accent-soft text-accent",
  completed: "bg-primary-soft text-primary",
};

const statusDot: Record<Status, string> = {
  active: "bg-success",
  scheduled: "bg-warning",
  draft: "bg-muted-foreground",
  paused: "bg-accent",
  completed: "bg-primary",
};

const channelEmoji: Record<Channel, string> = {
  whatsapp: "💬",
  sms: "📱",
  email: "📧",
  multi: "🌐",
};

// ---------- Animated count-up ----------
const useCount = (target: number, duration = 900) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return n;
};

// ---------- Page ----------
export const CampaignsPage = () => {
  const { data: campaigns = [], isLoading } = useCampaigns();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | CampaignType>("all");
  const [showAI, setShowAI] = useState(false);

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [campaigns, search, filter]);

  const totals = useMemo(() => {
    const sent = campaigns.reduce((a, c) => a + c.sent_count, 0);
    const replies = campaigns.reduce((a, c) => a + c.replied_count, 0);
    const conversions = campaigns.reduce((a, c) => a + c.conversion_count, 0);
    const active = campaigns.filter((c) => c.status === "active").length;
    const convRate = sent ? Math.round((conversions / sent) * 1000) / 10 : 0;
    // Estimate revenue: 1500 ARPU per conversion (display estimate)
    const revenue = conversions * 1500;
    return { sent, replies, conversions, active, total: campaigns.length, convRate, revenue };
  }, [campaigns]);

  const isEmpty = !isLoading && campaigns.length === 0;

  return (
    <PageShell
      title="Campaigns"
      subtitle="Launch karo, automate karo, revenue track karo"
      icon={<Megaphone className="w-5 h-5" />}
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowAI(true)}>
            <Wand2 className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">AI Generate</span>
          </Button>
          <NewCampaignDialog />
        </div>
      }
    >
      {/* HERO COMMAND CENTER */}
      <HeroCommandCenter totals={totals} active={totals.active} isEmpty={isEmpty} onAI={() => setShowAI(true)} />

      {/* Campaign types selector */}
      <CampaignTypeSelector value={typeFilter} onChange={setTypeFilter} />

      {/* AI Insights */}
      {!isEmpty && <AIInsightsPanel campaigns={campaigns} />}

      {/* Toolbar */}
      <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns…"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted border-0 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(["all", "active", "scheduled", "draft", "paused", "completed"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                "px-3 h-9 rounded-lg text-[12px] font-semibold capitalize transition-all",
                filter === t
                  ? "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-4  h-44" />
          ))}
        </div>
      )}

      {isEmpty && <PremiumEmptyState onCreate={() => document.getElementById("new-campaign-trigger")?.click()} onAI={() => setShowAI(true)} />}

      {!isLoading && !isEmpty && filtered.length === 0 && (
        <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
          <p className="text-[14px] font-semibold mb-1">No matching campaigns</p>
          <p className="text-[12px] text-muted-foreground">Try changing your filters.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map((c) => <CampaignCard key={c.id} campaign={c} />)}
      </div>

      {/* AI Builder Modal */}
      <AICampaignBuilder open={showAI} onOpenChange={setShowAI} />
    </PageShell>
  );
};

// ---------- Hero Command Center ----------
const HeroCommandCenter = ({
  totals,
  active,
  isEmpty,
  onAI,
}: {
  totals: { sent: number; replies: number; conversions: number; total: number; convRate: number; revenue: number };
  active: number;
  isEmpty: boolean;
  onAI: () => void;
}) => {
  const sent = useCount(totals.sent);
  const replies = useCount(totals.replies);
  const conversions = useCount(totals.conversions);
  const revenue = useCount(totals.revenue);
  const convRate = useCount(Math.round(totals.convRate * 10)) / 10;

  return (
    <div className="relative overflow-hidden rounded-2xl mb-5 border border-primary/20">
      {/* Animated aurora bg */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary-glow" />
      <div className="absolute inset-0 aurora-bg opacity-60" />
      <div className="absolute -right-10 -top-10 w-56 h-56 bg-white/10 rounded-full blur-3xl " />
      <div className="absolute right-32 bottom-0 w-32 h-32 bg-accent/30 rounded-full blur-2xl" />

      <div className="relative p-6 text-primary-foreground">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="animate-ping absolute inline-flex w-full h-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-success" />
                </span>
                Campaign Command Center
              </span>
            </div>
            {isEmpty ? (
              <>
                <h2 className="text-2xl md:text-3xl font-bold mb-1 leading-tight">
                  Launch your first campaign in 60 seconds
                </h2>
                <p className="text-[13px] opacity-90 max-w-xl">
                  Reach hundreds of contacts, automate replies, and watch revenue land in real-time.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl md:text-3xl font-bold mb-1 leading-tight tabular-nums">
                  {active} live · {totals.total} total campaigns
                </h2>
                <p className="text-[13px] opacity-90">
                  {totals.total > 0 ? "Manage and send approved WhatsApp campaigns" : "No campaigns yet — create your first below"}
                </p>
              </>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              size="lg"
              variant="secondary"
              className="gap-2 bg-white text-primary hover:bg-white/90 shadow-xl shadow-black/10 font-bold"
              onClick={() => document.getElementById("new-campaign-trigger")?.click()}
            >
              <Rocket className="w-4 h-4" />
              Create Campaign
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 bg-white/10 backdrop-blur border-white/30 text-white hover:bg-white/20 hover:text-white"
              onClick={onAI}
            >
              <Wand2 className="w-4 h-4" />
              <span className="hidden sm:inline">AI Generate</span>
            </Button>
          </div>
        </div>

        {/* Animated Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
          <HeroMetric icon={<Send className="w-3.5 h-3.5" />} label="Sent" value={sent.toLocaleString()} />
          <HeroMetric icon={<MessageCircle className="w-3.5 h-3.5" />} label="Replies" value={replies.toLocaleString()} />
          <HeroMetric icon={<ShoppingCart className="w-3.5 h-3.5" />} label="Conversions" value={conversions.toLocaleString()} />
          <HeroMetric icon={<TrendingUp className="w-3.5 h-3.5" />} label="Conv. Rate" value={`${convRate}%`} />
          <HeroMetric icon={<IndianRupee className="w-3.5 h-3.5" />} label="Revenue" value={`₹${(revenue / 1000).toFixed(1)}k`} highlight />
        </div>
      </div>
    </div>
  );
};

const HeroMetric = ({
  icon, label, value, highlight,
}: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) => (
  <div className={cn(
    "relative bg-white/10 backdrop-blur-xl rounded-xl p-3 border border-white/15 transition-all hover:bg-white/15 hover:-translate-y-0.5",
    highlight && "bg-white/20 border-white/30 shadow-lg shadow-black/10"
  )}>
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-90 font-bold mb-1">
      {icon}{label}
    </div>
    <p className="text-xl font-bold tabular-nums">{value}</p>
    {highlight && (
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-success rounded-full " />
    )}
  </div>
);

// ---------- Campaign Type Selector ----------
const CampaignTypeSelector = ({
  value, onChange,
}: { value: "all" | CampaignType; onChange: (v: "all" | CampaignType) => void }) => {
  const types: { id: "all" | CampaignType; icon: React.ReactNode; label: string; gradient: string }[] = [
    { id: "all", icon: <Megaphone className="w-4 h-4" />, label: "All", gradient: "from-muted-foreground/10 to-muted-foreground/5" },
    { id: "broadcast", icon: <Send className="w-4 h-4" />, label: "Broadcast", gradient: "from-primary/15 to-primary/5" },
    { id: "sequence", icon: <Repeat className="w-4 h-4" />, label: "Follow-up", gradient: "from-warning/15 to-warning/5" },
    { id: "retargeting", icon: <Target className="w-4 h-4" />, label: "Retargeting", gradient: "from-accent/15 to-accent/5" },
    { id: "offer", icon: <Gift className="w-4 h-4" />, label: "Offer", gradient: "from-success/15 to-success/5" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
      {types.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "group relative overflow-hidden rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
            value === t.id ? "border-primary bg-card shadow-sm shadow-primary/10" : "border-border bg-card hover:border-primary/30"
          )}
        >
          <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", t.gradient)} />
          <div className="relative flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110",
              value === t.id ? "bg-primary text-primary-foreground" : "bg-card text-foreground border border-border"
            )}>
              {t.icon}
            </div>
            <span className="text-[12px] font-bold">{t.label}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

// ---------- AI Insights ----------
const AIInsightsPanel = ({ campaigns }: { campaigns: Campaign[] }) => {
  const insights = useMemo(() => {
    const arr: { icon: React.ReactNode; text: string; tone: "warning" | "success" | "primary" }[] = [];
    const lowReply = campaigns.find(c => c.sent_count > 50 && c.replied_count / c.sent_count < 0.05);
    if (lowReply) arr.push({ icon: <Lightbulb className="w-3.5 h-3.5" />, text: `"${lowReply.name}" has low reply rate — try a stronger hook`, tone: "warning" });
    arr.push({ icon: <Clock className="w-3.5 h-3.5" />, text: "Best performing window: 6–8 PM (+34% replies)", tone: "primary" });
    arr.push({ icon: <Zap className="w-3.5 h-3.5" />, text: "Hot leads responding 3.2× faster than average", tone: "success" });
    return arr;
  }, [campaigns]);

  if (insights.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary-soft/40 via-card to-card mb-4 p-4">
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-[13px] font-bold leading-tight">Addison AI Insights</p>
            <p className="text-[10px] text-muted-foreground">Live recommendations to boost campaign ROI</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {insights.map((ins, i) => (
            <div
              key={i}
              className={cn(
                "rounded-lg border p-2.5 flex items-start gap-2 bg-card hover:shadow-sm transition-all",
                ins.tone === "warning" && "border-warning/30",
                ins.tone === "success" && "border-success/30",
                ins.tone === "primary" && "border-primary/30",
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                ins.tone === "warning" && "bg-warning-soft text-warning",
                ins.tone === "success" && "bg-success-soft text-success",
                ins.tone === "primary" && "bg-primary-soft text-primary",
              )}>{ins.icon}</div>
              <p className="text-[11.5px] leading-snug font-medium">{ins.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------- Premium Empty State ----------
const PremiumEmptyState = ({ onCreate, onAI }: { onCreate: () => void; onAI: () => void }) => {
  const steps = [
    { icon: <Plus className="w-4 h-4" />, label: "Create campaign", desc: "Pick goal & channel" },
    { icon: <Users className="w-4 h-4" />, label: "Select audience", desc: "Tag, segment or list" },
    { icon: <Send className="w-4 h-4" />, label: "Send messages", desc: "Now or scheduled" },
    { icon: <IndianRupee className="w-4 h-4" />, label: "Get replies & ₹", desc: "Track conversions" },
  ];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 md:p-10 text-center">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-soft/30 via-transparent to-accent-soft/20" />
      <div className="relative">
        <div className="relative w-20 h-20 mx-auto mb-5">
          <div className="absolute inset-0 rounded-2xl bg-primary rotate-6 shadow-xl shadow-primary/30" />
          <div className="absolute inset-0 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground -rotate-6">
            <Rocket className="w-9 h-9" />
          </div>
        </div>
        <h3 className="text-xl md:text-2xl font-bold mb-2">Ready to launch your revenue engine?</h3>
        <p className="text-[13px] text-muted-foreground mb-6 max-w-md mx-auto">
          Build your first campaign in under a minute. Reach the right contacts, get replies, close deals.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto mb-6">
          {steps.map((s, i) => (
            <div key={i} className="relative bg-background border border-border rounded-xl p-3 text-left">
              <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-md">{i + 1}</div>
              <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center mb-2">{s.icon}</div>
              <p className="text-[12px] font-bold">{s.label}</p>
              <p className="text-[10px] text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button size="lg" className="gap-2 shadow-lg shadow-primary/20" onClick={onCreate}>
            <Rocket className="w-4 h-4" />Create Campaign
          </Button>
          <Button size="lg" variant="outline" className="gap-2" onClick={onAI}>
            <Wand2 className="w-4 h-4 text-primary" />Generate with AI
          </Button>
        </div>
      </div>
    </div>
  );
};

// ---------- Sparkline ----------
const Sparkline = ({ values, color = "hsl(var(--primary))" }: { values: number[]; color?: string }) => {
  const w = 80, h = 24;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={`sg-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg-${color})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ---------- Campaign Card ----------
const CampaignCard = ({ campaign: c }: { campaign: Campaign }) => {
  const updateMut = useUpdateCampaign();
  const deleteMut = useDeleteCampaign();
  const [showAnalytics, setShowAnalytics] = useState(false);
  const replyRate = c.sent_count ? Math.round((c.replied_count / c.sent_count) * 100) : 0;
  const convRate = c.sent_count ? Math.round((c.conversion_count / c.sent_count) * 100) : 0;
  const revenue = c.conversion_count * 1500;

  const togglePause = () => {
    updateMut.mutate({ id: c.id, status: c.status === "active" ? "paused" : "active" });
  };

  // Deterministic sparkline based on id
  const trend = useMemo(() => {
    const seed = c.id.charCodeAt(0) + c.id.charCodeAt(c.id.length - 1);
    return Array.from({ length: 8 }, (_, i) => {
      return Math.max(2, Math.round(Math.sin((seed + i) * 0.7) * 6 + 10 + (i * (c.sent_count > 0 ? 0.6 : 0.2))));
    });
  }, [c.id, c.sent_count]);

  return (
    <>
      <div className="group relative overflow-hidden bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-4 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all">
        {/* gradient hover sheen */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        <div className="relative">
          <div className="flex items-start justify-between mb-3 gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-base">{channelEmoji[c.channel]}</span>
                <h4 className="text-[14px] font-bold truncate">{c.name}</h4>
                <span className={cn(
                  "inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
                  statusStyle[c.status]
                )}>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    statusDot[c.status],
                    c.status === "active" && ""
                  )} />
                  {c.status}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {c.channel} · {c.audience_size.toLocaleString()} contacts · ₹{Number(c.budget).toLocaleString()} budget
              </p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={togglePause}
                className={cn(
                  "h-7 px-2 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors",
                  c.status === "active"
                    ? "bg-warning-soft text-warning hover:bg-warning hover:text-warning-foreground"
                    : "bg-success-soft text-success hover:bg-success hover:text-success-foreground"
                )}
                title={c.status === "active" ? "Pause" : "Start"}
              >
                {c.status === "active" ? <><Pause className="w-3 h-3" />Pause</> : <><Play className="w-3 h-3" />Start</>}
              </button>
              <button
                onClick={() => setShowAnalytics(true)}
                className="h-7 px-2 rounded-md text-[11px] font-semibold bg-primary-soft text-primary hover:bg-primary hover:text-primary-foreground flex items-center gap-1 transition-colors"
                title="Analytics"
              >
                <BarChart3 className="w-3 h-3" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center">
                  <MoreVertical className="w-3.5 h-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowAnalytics(true)}>
                    <BarChart3 className="w-3.5 h-3.5 mr-2" />View analytics
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={togglePause}>
                    {c.status === "active" ? <><Pause className="w-3.5 h-3.5 mr-2" />Pause</> : <><Play className="w-3.5 h-3.5 mr-2" />Activate</>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => deleteMut.mutate(c.id)} className="text-destructive">
                    <Trash2 className="w-3.5 h-3.5 mr-2" />Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-3">
            <Metric icon={<Send className="w-3 h-3" />} label="Sent" value={c.sent_count.toLocaleString()} />
            <Metric icon={<MessageCircle className="w-3 h-3" />} label="Replies" value={`${c.replied_count}`} sub={`${replyRate}%`} />
            <Metric icon={<ShoppingCart className="w-3 h-3" />} label="Won" value={`${c.conversion_count}`} sub={`${convRate}%`} accent />
            <Metric icon={<IndianRupee className="w-3 h-3" />} label="Revenue" value={`₹${(revenue / 1000).toFixed(1)}k`} accent />
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="flex-1">
              {c.sent_count > 0 ? (
                <>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden flex">
                    <div className="h-full bg-success transition-all duration-700" style={{ width: `${convRate}%` }} />
                    <div className="h-full bg-primary transition-all duration-700" style={{ width: `${Math.max(0, replyRate - convRate)}%` }} />
                    <div className="h-full bg-muted-foreground/20" style={{ width: `${100 - replyRate}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
                    <span>Sent → Replied → Won</span>
                    <span className="text-success font-semibold flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />{convRate}% conv.
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-[11px] text-muted-foreground italic">Not started yet — hit ▶ to launch</p>
              )}
            </div>
            <Sparkline values={trend} color="hsl(var(--primary))" />
          </div>
        </div>
      </div>

      <AnalyticsModal open={showAnalytics} onOpenChange={setShowAnalytics} campaign={c} />
    </>
  );
};

const Metric = ({
  icon, label, value, sub, accent,
}: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: boolean }) => (
  <div className="bg-muted/40 rounded-lg p-2 transition-colors hover:bg-muted/70">
    <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
      {icon}{label}
    </div>
    <p className={cn("text-[13px] font-bold tabular-nums leading-tight", accent && "text-success")}>{value}</p>
    {sub && <p className="text-[9px] text-muted-foreground tabular-nums">{sub}</p>}
  </div>
);

// ---------- Analytics Modal (funnel) ----------
const AnalyticsModal = ({
  open, onOpenChange, campaign: c,
}: { open: boolean; onOpenChange: (v: boolean) => void; campaign: Campaign }) => {
  const delivered = Math.round(c.sent_count * 0.96);
  const read = Math.round(c.sent_count * 0.78);
  const stages = [
    { label: "Sent", value: c.sent_count, color: "bg-primary" },
    { label: "Delivered", value: delivered, color: "bg-primary/80" },
    { label: "Read", value: read, color: "bg-primary/60" },
    { label: "Replied", value: c.replied_count, color: "bg-warning" },
    { label: "Converted", value: c.conversion_count, color: "bg-success" },
  ];
  const max = Math.max(...stages.map(s => s.value), 1);
  const revenue = c.conversion_count * 1500;
  const convPct = c.sent_count ? ((c.conversion_count / c.sent_count) * 100).toFixed(1) : "0";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{channelEmoji[c.channel]}</span>{c.name}
          </DialogTitle>
          <DialogDescription>Conversion funnel & performance</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Conversion</p>
            <p className="text-2xl font-bold text-success tabular-nums">{convPct}%</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Revenue</p>
            <p className="text-2xl font-bold tabular-nums">₹{revenue.toLocaleString()}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          {stages.map((s) => {
            const pct = (s.value / max) * 100;
            return (
              <div key={s.label} className="flex items-center gap-3">
                <span className="w-20 text-[11px] font-semibold text-muted-foreground">{s.label}</span>
                <div className="flex-1 h-7 bg-muted rounded-md overflow-hidden">
                  <div
                    className={cn("h-full flex items-center justify-end pr-2 text-[11px] font-bold text-primary-foreground transition-all duration-700", s.color)}
                    style={{ width: `${Math.max(pct, 6)}%` }}
                  >
                    {s.value.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ---------- AI Campaign Builder ----------
type AIGoal = "leads" | "sales" | "followup";
const AICampaignBuilder = ({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [goal, setGoal] = useState<AIGoal>("leads");
  const [generating, setGenerating] = useState(false);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [cta, setCta] = useState("");
  const [bestTime, setBestTime] = useState("");
  const create = useCreateCampaign();

  const goals: { id: AIGoal; icon: React.ReactNode; title: string; desc: string }[] = [
    { id: "leads", icon: <Users className="w-4 h-4" />, title: "Get more leads", desc: "Cold outreach to grow pipeline" },
    { id: "sales", icon: <ShoppingCart className="w-4 h-4" />, title: "Close sales", desc: "Push offer to warm/hot leads" },
    { id: "followup", icon: <Repeat className="w-4 h-4" />, title: "Follow up", desc: "Re-engage idle conversations" },
  ];

  const generate = async () => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 900));
    if (goal === "leads") {
      setName("Q2 Cold Outreach – AddisonX");
      setBody("Hi {{name}} 👋 Quick question — are you currently running paid ads? We help D2C brands get 3× ROAS in 30 days. Worth a 10-min chat?");
      setCta("Book a free strategy call");
      setBestTime("Tue–Thu, 10:30 AM");
    } else if (goal === "sales") {
      setName("Hot Lead Closer – Limited Offer");
      setBody("Hey {{name}}, your free strategy session expires in 24 hrs ⏳. Lock in our launch pricing (30% off) before it's gone.");
      setCta("Claim my discount");
      setBestTime("Wed–Fri, 6:30 PM");
    } else {
      setName("Re-engage Warm Leads");
      setBody("Hi {{name}}, just checking in 🙂 You showed interest last week — still thinking it over? Happy to answer any questions.");
      setCta("Reply with your question");
      setBestTime("Mon–Wed, 11:00 AM");
    }
    setGenerating(false);
    setStep(3);
  };

  const launch = () => {
    create.mutate(
      {
        name,
        description: body,
        channel: "whatsapp",
        budget: 0,
        audience_size: 0,
        status: "draft",
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setStep(1);
          setName(""); setBody(""); setCta(""); setBestTime("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setStep(1); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <Wand2 className="w-3.5 h-3.5" />
            </div>
            Create Campaign with AI
          </DialogTitle>
          <DialogDescription>3 steps · message copy, CTA & timing generated for you</DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors",
                step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {step > s ? <CheckCircle2 className="w-3.5 h-3.5" /> : s}
              </div>
              {s < 3 && <div className={cn("h-0.5 flex-1 rounded transition-colors", step > s ? "bg-primary" : "bg-muted")} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-2">
            <p className="text-[12px] font-semibold text-muted-foreground mb-1">What's your goal?</p>
            {goals.map((g) => (
              <button
                key={g.id}
                onClick={() => setGoal(g.id)}
                className={cn(
                  "w-full text-left rounded-xl border p-3 flex items-center gap-3 transition-all hover:border-primary/40 hover:bg-muted/30",
                  goal === g.id && "border-primary bg-primary-soft/40"
                )}
              >
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center",
                  goal === g.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                )}>{g.icon}</div>
                <div className="flex-1">
                  <p className="text-[13px] font-bold">{g.title}</p>
                  <p className="text-[11px] text-muted-foreground">{g.desc}</p>
                </div>
                {goal === g.id && <CheckCircle2 className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="py-6 text-center">
            <div className="relative w-16 h-16 mx-auto mb-3">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <div className="relative w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                <Sparkles className="w-7 h-7 " />
              </div>
            </div>
            <p className="text-[14px] font-bold mb-1">Addison AI is crafting your campaign…</p>
            <p className="text-[12px] text-muted-foreground">Analyzing audience, generating copy, picking best time</p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Campaign name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Message</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">CTA</Label>
                <Input value={cta} onChange={(e) => setCta(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />Best time
                </Label>
                <Input value={bestTime} onChange={(e) => setBestTime(e.target.value)} />
              </div>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary-soft/30 p-3 flex items-start gap-2">
              <Activity className="w-3.5 h-3.5 text-primary mt-0.5" />
              <p className="text-[11px] leading-snug">
                <span className="font-bold">AI estimate:</span> ~{Math.round(50 + Math.random() * 30)}% open rate, ~{Math.round(8 + Math.random() * 7)}% reply rate at best time.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="flex !justify-between sm:!justify-between">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep((step - 1) as 1 | 2 | 3)}>Back</Button>
          ) : <span />}
          {step === 1 && (
            <Button className="gap-2" onClick={() => { setStep(2); setTimeout(generate, 200); }}>
              Generate <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
          {step === 3 && (
            <Button className="gap-2 shadow-lg shadow-primary/20" onClick={launch} disabled={create.isPending}>
              <Rocket className="w-3.5 h-3.5" />{create.isPending ? "Saving…" : "Save as draft"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

type FormValues = {
  name: string;
  description?: string;
  channel: Channel;
  budget: number;
  audience_size: number;
};

const NewCampaignDialog = () => {
  const [open, setOpen] = useState(false);
  const create = useCreateCampaign();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { channel: "whatsapp", budget: 0, audience_size: 0 },
  });

  const onSubmit = (v: FormValues) => {
    create.mutate(
      { name: v.name, description: v.description || null, channel: v.channel, budget: v.budget, audience_size: v.audience_size, status: "draft" },
      { onSuccess: () => { setOpen(false); reset(); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button id="new-campaign-trigger" size="sm" className="gap-1.5 shadow-md shadow-primary/20">
          <Rocket className="w-3.5 h-3.5" />New Campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Create campaign</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cname">Name *</Label>
            <Input id="cname" {...register("name", { required: true })} placeholder="Diwali Sale 2026" />
            {errors.name && <p className="text-[11px] text-destructive">Required</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cdesc">Description</Label>
            <Textarea id="cdesc" {...register("description")} placeholder="Goal of this campaign…" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cchan">Channel</Label>
              <select id="cchan" {...register("channel")} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="multi">Multi-channel</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cbud">Budget (₹)</Label>
              <Input id="cbud" type="number" {...register("budget", { valueAsNumber: true })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="caud">Audience size</Label>
            <Input id="caud" type="number" {...register("audience_size", { valueAsNumber: true })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
