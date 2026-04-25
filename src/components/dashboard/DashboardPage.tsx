import {
  MessageSquare, Users, IndianRupee, ArrowUpRight, TrendingUp, Flame, Bell, Megaphone, Radio,
  Sparkles, Zap, Loader2, Wand2, Activity, Clock, ArrowRight, Send, Bot, Target,
  Rocket, MousePointerClick, Brain, CheckCircle2, Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import { initialsFor, formatRelative } from "@/lib/inbox-types";
import { toast } from "sonner";

const useCount = (target: number, duration = 1100) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    let raf = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
};

const useDashboardData = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [contacts, conversations, messages, deals, tasks, campaigns] = await Promise.all([
        supabase.from("contacts").select("id, name, phone, tag, score, created_at"),
        supabase.from("conversations").select("id, status, unread_count, last_message_at, last_message_preview, contact_id"),
        supabase.from("messages").select("id, created_at, direction"),
        supabase.from("deals").select("id, value, stage, closed_at"),
        supabase.from("tasks").select("id, status, due_at, priority, title").eq("status", "pending"),
        supabase.from("campaigns").select("id, name, status, sent_count, replied_count, conversion_count"),
      ]);
      return {
        contacts: contacts.data ?? [],
        conversations: conversations.data ?? [],
        messages: messages.data ?? [],
        deals: deals.data ?? [],
        tasks: tasks.data ?? [],
        campaigns: campaigns.data ?? [],
      };
    },
  });
};

type Props = { onNavigate?: (page: string) => void };

const SUCCESS_TOASTS = [
  { title: "Lead converted 🎉", desc: "Priya M. just paid ₹2,499" },
  { title: "AI replied in 1.2s ⚡", desc: "Closed-won draft sent" },
  { title: "Hot lead detected 🔥", desc: "Score jumped to 92" },
  { title: "Broadcast delivered 📢", desc: "1,248 messages sent" },
];

export const DashboardPage = ({ onNavigate }: Props) => {
  const { data, isLoading } = useDashboardData();
  const qc = useQueryClient();
  const [seeding, setSeeding] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [appliedSuggestion, setAppliedSuggestion] = useState<string | null>(null);
  const toastIndex = useRef(0);

  const stats = useMemo(() => {
    if (!data) return { total: 0, open: 0, hot: 0, revenue: 0, msgs7d: 0, tasksOpen: 0, replies: 0, deals: 0 };
    const hot = data.contacts.filter((c) => c.tag === "hot").length;
    const open = data.conversations.filter((c) => c.status === "open").length;
    const revenue = data.deals.filter((d) => d.stage === "won").reduce((a, d) => a + Number(d.value), 0);
    const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const msgs7d = data.messages.filter((m) => new Date(m.created_at).getTime() > sevenDaysAgo).length;
    const replies = data.messages.filter((m) => m.direction === "outbound").length;
    return {
      total: data.contacts.length,
      open, hot, revenue, msgs7d,
      tasksOpen: data.tasks.length,
      replies,
      deals: data.deals.filter((d) => d.stage === "won").length,
    };
  }, [data]);

  // Live chat preview — top 3 conversations with most recent activity
  const liveChats = useMemo(() => {
    const convos = (data?.conversations ?? [])
      .slice()
      .sort((a, b) => new Date(b.last_message_at ?? 0).getTime() - new Date(a.last_message_at ?? 0).getTime())
      .slice(0, 3);
    return convos.map((c) => {
      const contact = data?.contacts.find((x) => x.id === c.contact_id);
      return { ...c, contact };
    });
  }, [data]);

  // Periodic success toast — feels alive
  useEffect(() => {
    if (isLoading || stats.total === 0) return;
    const t = setInterval(() => {
      const next = SUCCESS_TOASTS[toastIndex.current % SUCCESS_TOASTS.length];
      toast.success(next.title, { description: next.desc, duration: 3500 });
      toastIndex.current += 1;
    }, 22_000);
    return () => clearInterval(t);
  }, [isLoading, stats.total]);

  // Build a 7-day revenue trend from won deals
  const trend = useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      const next = d.getTime() + 86400000;
      const value = (data?.deals ?? [])
        .filter((deal) => deal.stage === "won" && deal.closed_at)
        .filter((deal) => {
          const t = new Date(deal.closed_at!).getTime();
          return t >= d.getTime() && t < next;
        })
        .reduce((a, deal) => a + Number(deal.value), 0);
      return { label: d.toLocaleDateString(undefined, { weekday: "short" }), value };
    });
    return days;
  }, [data]);
  const trendMax = Math.max(1, ...trend.map((t) => t.value));
  const trendTotal = trend.reduce((a, t) => a + t.value, 0);

  // SVG area path for revenue chart
  const chartPaths = useMemo(() => {
    const W = 600, H = 180, padX = 24, padY = 16;
    const innerW = W - padX * 2;
    const innerH = H - padY * 2;
    const points = trend.map((d, i) => {
      const x = padX + (innerW * i) / Math.max(1, trend.length - 1);
      const y = padY + innerH - (d.value / trendMax) * innerH;
      return { x, y, value: d.value, label: d.label };
    });
    if (points.length === 0) return { line: "", area: "", points: [], W, H };
    let line = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i], p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      line += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    const area = `${line} L ${points[points.length - 1].x} ${padY + innerH} L ${points[0].x} ${padY + innerH} Z`;
    return { line, area, points, W, H };
  }, [trend, trendMax]);

  // KPI tiles
  const tiles = [
    {
      icon: MessageSquare, label: "Total Contacts", value: stats.total, trend: 24, sub: "+12 today",
      tooltip: "+12 leads today",
      iconBg: "bg-primary text-primary-foreground",
      ring: "from-primary/30 to-transparent",
      sparkColor: "hsl(var(--primary))",
      live: false,
    },
    {
      icon: Inbox, label: "Active Chats", value: stats.open, trend: 12, sub: "right now",
      tooltip: "Live conversations in your inbox",
      iconBg: "bg-accent text-accent-foreground",
      ring: "from-accent/30 to-transparent",
      sparkColor: "hsl(var(--accent))",
      live: true,
    },
    {
      icon: Flame, label: "Hot Leads", value: stats.hot, trend: 38, sub: "ready to buy",
      tooltip: "Score ≥ 80 — close them today",
      iconBg: "bg-hot text-hot-foreground",
      ring: "from-hot/30 to-transparent",
      sparkColor: "hsl(var(--hot))",
      live: false,
    },
    {
      icon: IndianRupee, label: "Revenue", value: stats.revenue, trend: 56, sub: "all-time", isCurrency: true,
      tooltip: "Closed-won deals · all time",
      iconBg: "bg-success text-success-foreground",
      ring: "from-success/30 to-transparent",
      sparkColor: "hsl(var(--success))",
      live: false,
    },
  ];

  const c0 = useCount(tiles[0].value);
  const c1 = useCount(tiles[1].value);
  const c2 = useCount(tiles[2].value);
  const c3 = useCount(tiles[3].value);
  const counts = [c0, c1, c2, c3];

  const sparkSeed = (seed: number) =>
    Array.from({ length: 12 }).map((_, i) => {
      const x = Math.sin(seed * (i + 1) * 0.7) * 0.5 + 0.5;
      return 0.25 + x * 0.65;
    });
  const sparks = [
    sparkSeed(stats.total + 3),
    sparkSeed(stats.open + 7),
    sparkSeed(stats.hot + 11),
    sparkSeed(Math.max(1, Math.floor(stats.revenue / 1000)) + 5),
  ];

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("seed-demo-data");
      if (error) throw error;
      if (result?.skipped) toast.info("Demo data already loaded");
      else toast.success("Demo data loaded — your workspace just got real ✨");
      await qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load demo data");
    } finally {
      setSeeding(false);
    }
  };

  const isEmpty = !isLoading && stats.total === 0;
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();
  const displayName = useAuth().user?.user_metadata?.display_name || useAuth().user?.email?.split("@")[0] || "there";

  // Funnel data — Leads → Chats → Deals → Revenue
  const funnel = useMemo(() => {
    const leads = Math.max(stats.total, 1);
    const chats = Math.max(stats.open + stats.replies, 1);
    const deals = Math.max(stats.deals, 0);
    const closed = stats.revenue;
    return [
      { label: "Leads", value: leads, count: leads.toLocaleString(), color: "from-accent to-primary" },
      { label: "Chats", value: Math.min(chats, leads), count: Math.min(chats, leads).toLocaleString(), color: "from-primary to-primary-glow" },
      { label: "Deals", value: deals, count: deals.toLocaleString(), color: "from-primary-glow to-warning" },
      { label: "Revenue", value: Math.max(deals, 1), count: `₹${closed.toLocaleString()}`, color: "from-warning to-success" },
    ];
  }, [stats]);
  const funnelMax = Math.max(...funnel.map((f) => f.value), 1);
  const overallConv = stats.total > 0 ? ((stats.deals / stats.total) * 100).toFixed(1) : "0.0";

  return (
    <PageShell
      title={`${greeting}, ${displayName}`}
      subtitle="Your AI command center · live"
      icon={<Sparkles className="w-4 h-4" />}
      actions={
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="flex items-center gap-2 bg-foreground text-background px-3.5 py-2 rounded-lg text-[12px] font-bold hover:opacity-90 transition-all disabled:opacity-60 shadow-md"
        >
          {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          {seeding ? "Loading…" : "Load demo data"}
        </button>
      }
    >
      {/* Empty state */}
      {isEmpty && (
        <div className="bg-gradient-to-br from-primary-soft via-card to-accent-soft border border-primary/20 rounded-2xl p-8 mb-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Welcome to AddisonX 🎉</h2>
          <p className="text-[13px] text-muted-foreground mt-2 max-w-md mx-auto">
            Your workspace is ready. Load a realistic demo dataset to see AddisonX in action.
          </p>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="mt-5 inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-[13px] font-bold hover:bg-primary-glow transition-all shadow-lg shadow-primary/30 disabled:opacity-60"
          >
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {seeding ? "Loading…" : "Load demo workspace"}
          </button>
        </div>
      )}

      {/* ===== SECTION 1 — KPI CARDS ===== */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        {tiles.map((s, i) => {
          const spark = sparks[i];
          const sparkW = 120, sparkH = 36;
          const sparkPath = spark
            .map((v, idx) => {
              const x = (sparkW * idx) / (spark.length - 1);
              const y = sparkH - v * sparkH;
              return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
            })
            .join(" ");
          const sparkArea = `${sparkPath} L ${sparkW} ${sparkH} L 0 ${sparkH} Z`;
          return (
            <div
              key={s.label}
              title={s.tooltip}
              className={cn(
                "relative overflow-hidden gradient-border rounded-2xl p-5 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 animate-slide-up group",
                s.label === "Revenue" && "ring-1 ring-primary/30 shadow-lg shadow-primary/15"
              )}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={cn("absolute -top-16 -right-16 w-44 h-44 rounded-full blur-2xl opacity-70 bg-gradient-to-br group-hover:opacity-100 transition-opacity", s.ring)} />
              <div className="relative flex items-center justify-between mb-4">
                <div className={cn("relative w-10 h-10 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform", s.iconBg)}>
                  <span className="absolute inset-0 rounded-xl blur-md opacity-50" style={{ background: s.sparkColor }} />
                  <s.icon className="relative w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-success bg-success-soft px-2 py-1 rounded-full flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" /> +{s.trend}%
                </span>
              </div>
              <p className="relative text-[11px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1.5">
                {s.label}
                {s.live && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
                  </span>
                )}
              </p>
              <p className={cn(
                "relative font-bold tracking-tight mt-1 tabular-nums",
                s.label === "Revenue" ? "text-[34px] bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent" : "text-3xl"
              )}>
                {s.isCurrency ? "₹" : ""}{counts[i].toLocaleString()}
              </p>
              <div className="relative flex items-end justify-between mt-2 gap-2">
                <p className="text-[11px] text-muted-foreground">{s.sub}</p>
                <svg width={sparkW} height={sparkH} viewBox={`0 0 ${sparkW} ${sparkH}`} className="opacity-90 overflow-visible">
                  <defs>
                    <linearGradient id={`spark-${i}`} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={s.sparkColor} stopOpacity="0.4" />
                      <stop offset="100%" stopColor={s.sparkColor} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={sparkArea} fill={`url(#spark-${i})`} />
                  <path
                    d={sparkPath}
                    fill="none"
                    stroke={s.sparkColor}
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== SECTION 2 — ADDISON AI INSIGHTS (HERO) ===== */}
      <AddisonAIHero
        hot={stats.hot}
        pending={stats.tasksOpen}
        applied={appliedSuggestion}
        onApply={(label) => {
          setAppliedSuggestion(label);
          toast.success("AI suggestion applied ✨", { description: label, duration: 3500 });
        }}
        onNavigate={onNavigate}
      />

      {/* ===== SECTION 3 — LIVE CHAT PREVIEW ===== */}
      <LiveChatPreview chats={liveChats} onNavigate={onNavigate} isLoading={isLoading} />

      {/* ===== SECTION 4 — REVENUE + FUNNEL ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-5">
        {/* Revenue area chart */}
        <div className="xl:col-span-7 relative overflow-hidden bg-card border border-border rounded-2xl p-5 lg:p-6">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex items-start justify-between mb-5 gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-[14px] font-bold tracking-tight">Revenue Trend</h3>
                <span className="text-[10px] font-bold text-success bg-success-soft px-1.5 py-0.5 rounded">7d</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 ml-9">Closed-won deals · hover for details</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total</p>
              <p className="text-2xl font-bold tabular-nums bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                ₹{trendTotal.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="relative">
            <svg
              viewBox={`0 0 ${chartPaths.W} ${chartPaths.H}`}
              className="w-full h-56"
              preserveAspectRatio="none"
              onMouseLeave={() => setHoverIdx(null)}
            >
              <defs>
                <linearGradient id="revArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="revLine" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--primary-glow))" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75, 1].map((p) => {
                const y = 16 + (180 - 32) * p;
                return (
                  <line key={p} x1="24" x2={chartPaths.W - 24} y1={y} y2={y}
                    stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="2 4" opacity="0.6" />
                );
              })}
              {trendTotal > 0 && (
                <>
                  <path d={chartPaths.area} fill="url(#revArea)" />
                  <path d={chartPaths.line} fill="none" stroke="url(#revLine)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  {chartPaths.points.map((p, i) => (
                    <g key={i}>
                      <rect x={p.x - 22} y={0} width={44} height={chartPaths.H} fill="transparent" onMouseEnter={() => setHoverIdx(i)} />
                      <circle cx={p.x} cy={p.y} r={hoverIdx === i ? 5 : 3}
                        fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2" className="transition-all" />
                    </g>
                  ))}
                </>
              )}
              {trendTotal === 0 && (
                <text x="50%" y="50%" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11, fontWeight: 600 }}>
                  No closed-won deals yet
                </text>
              )}
            </svg>
            <div className="flex justify-between px-6 mt-2">
              {trend.map((d, i) => (
                <span key={i} className={cn("text-[10px] font-bold uppercase tracking-wider transition-colors", hoverIdx === i ? "text-primary" : "text-muted-foreground")}>
                  {d.label}
                </span>
              ))}
            </div>
            {hoverIdx !== null && trend[hoverIdx] && trend[hoverIdx].value > 0 && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-foreground text-background text-[11px] font-bold shadow-lg pointer-events-none">
                {trend[hoverIdx].label} · ₹{trend[hoverIdx].value.toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Funnel */}
        <div className="xl:col-span-5 relative overflow-hidden bg-card border border-border rounded-2xl p-5 lg:p-6">
          <div className="absolute -bottom-20 -right-20 w-56 h-56 bg-success/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex items-start justify-between mb-5 gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-success-soft text-success flex items-center justify-center">
                  <Target className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-[14px] font-bold tracking-tight">Conversion Funnel</h3>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 ml-9">Leads → Chats → Deals → Revenue</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Overall</p>
              <p className="text-2xl font-bold tabular-nums text-success">{overallConv}%</p>
            </div>
          </div>
          <div className="relative space-y-2.5">
            {funnel.map((f, i) => {
              const widthPct = (f.value / funnelMax) * 100;
              const stepConv = i > 0 && funnel[i - 1].value > 0 ? ((f.value / funnel[i - 1].value) * 100).toFixed(0) : null;
              return (
                <div key={f.label}>
                  <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                    <span className="flex items-center gap-1.5">
                      {f.label}
                      {stepConv && <span className="text-[9px] text-muted-foreground font-semibold">{stepConv}% kept</span>}
                    </span>
                    <span className="tabular-nums">{f.count}</span>
                  </div>
                  <div className="h-7 bg-muted/60 rounded-lg overflow-hidden relative">
                    <div
                      className={cn("h-full rounded-lg bg-gradient-to-r transition-all duration-700 relative overflow-hidden", f.color)}
                      style={{ width: `${Math.max(8, widthPct)}%` }}
                    >
                      <span className="absolute inset-0 animate-shimmer pointer-events-none" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== SECTION 5 — QUICK ACTIONS (BOLD CTAs) ===== */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[14px] font-bold flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Quick Actions
            </h3>
            <p className="text-[11px] text-muted-foreground">High-impact moves, one click away.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Launch Campaign", emoji: "🚀", icon: Megaphone, page: "campaigns",
              gradient: "from-primary via-primary to-primary-glow", glow: "shadow-primary/30 hover:shadow-primary/60" },
            { label: "Send Broadcast", emoji: "📢", icon: Radio, page: "broadcasts",
              gradient: "from-accent via-accent to-primary", glow: "shadow-accent/30 hover:shadow-accent/60" },
            { label: "Enable Automation", emoji: "🤖", icon: Bot, page: "workflows",
              gradient: "from-warning via-warning to-accent", glow: "shadow-warning/30 hover:shadow-warning/60" },
            { label: "Capture Leads", emoji: "🎯", icon: MousePointerClick, page: "contacts",
              gradient: "from-success via-success to-primary-glow", glow: "shadow-success/30 hover:shadow-success/60" },
          ].map((a, i) => (
            <button
              key={a.label}
              onClick={() => { onNavigate?.(a.page); toast.success(`Opening ${a.label.toLowerCase()}…`); }}
              className={cn(
                "group relative overflow-hidden rounded-2xl p-5 text-left text-primary-foreground bg-gradient-to-br transition-all hover:-translate-y-1 shadow-lg",
                a.gradient, a.glow,
                "animate-slide-up"
              )}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="absolute inset-0 bg-gradient-to-tr from-primary-foreground/0 via-primary-foreground/10 to-primary-foreground/0 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-primary-foreground/10 blur-2xl group-hover:bg-primary-foreground/20 transition-all" />
              <div className="relative flex items-center justify-between mb-4">
                <span className="w-9 h-9 rounded-xl bg-primary-foreground/15 backdrop-blur flex items-center justify-center ring-1 ring-primary-foreground/20">
                  <a.icon className="w-4 h-4" />
                </span>
                <span className="text-2xl">{a.emoji}</span>
              </div>
              <p className="relative text-[14px] font-bold leading-tight">{a.label}</p>
              <p className="relative text-[11px] opacity-80 mt-1 flex items-center gap-1 group-hover:gap-2 transition-all">
                Go now <ArrowRight className="w-3 h-3" />
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* ===== BOTTOM ROW — Recent contacts + urgent follow-ups ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-bold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" /> Recent Contacts
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Latest leads added</p>
            </div>
            <button
              onClick={() => onNavigate?.("contacts")}
              className="text-[11px] text-primary font-bold hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {isLoading && <p className="text-[12px] text-muted-foreground text-center py-6">Loading…</p>}
          {!isLoading && (data?.contacts ?? []).length === 0 && (
            <p className="text-[12px] text-muted-foreground text-center py-6">No contacts yet.</p>
          )}
          <div className="space-y-1">
            {(data?.contacts ?? []).slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer">
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ring-2 transition-transform group-hover:scale-105",
                  c.tag === "hot" ? "bg-hot-soft text-hot ring-hot/20" : c.tag === "warm" ? "bg-warning-soft text-warning ring-warning/20" : "bg-muted text-muted-foreground ring-transparent"
                )}>
                  {initialsFor(c.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate flex items-center gap-1.5">
                    {c.name}
                    {c.tag === "hot" && <Flame className="w-3 h-3 text-hot" />}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono truncate">{c.phone}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[11px] font-bold tabular-nums">Score {c.score}</p>
                  <p className="text-[10px] text-muted-foreground">{formatRelative(c.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-bold flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-warning" /> Urgent Follow-ups
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Due within 24 hours</p>
            </div>
            <span className="text-[11px] font-bold text-warning bg-warning-soft px-2 py-0.5 rounded-full">
              {(data?.tasks ?? []).filter((t) => t.due_at && new Date(t.due_at).getTime() < Date.now() + 24 * 3600 * 1000).length} due
            </span>
          </div>
          {(data?.tasks ?? []).filter((t) => t.due_at && new Date(t.due_at).getTime() < Date.now() + 24 * 3600 * 1000).length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-success-soft text-success flex items-center justify-center mb-2">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-[12px] font-semibold">All caught up! 🎉</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">No urgent follow-ups</p>
            </div>
          )}
          <div className="space-y-2">
            {(data?.tasks ?? [])
              .filter((t) => t.due_at && new Date(t.due_at).getTime() < Date.now() + 24 * 3600 * 1000)
              .slice(0, 5)
              .map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-warning/40 hover:shadow-sm transition-all cursor-pointer">
                  <div className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    t.priority === "urgent" ? "bg-hot animate-pulse" : t.priority === "high" ? "bg-warning" : "bg-accent"
                  )} />
                  <p className="flex-1 text-[12px] font-semibold truncate">{t.title}</p>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {t.due_at ? formatRelative(t.due_at) : "—"}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
};

/* ============ ADDISON AI INSIGHTS HERO ============ */

type HeroProps = {
  hot: number;
  pending: number;
  applied: string | null;
  onApply: (label: string) => void;
  onNavigate?: (page: string) => void;
};

const AddisonAIHero = ({ hot, pending, applied, onApply, onNavigate }: HeroProps) => {
  const suggestions = [
    {
      label: hot > 0 ? `Follow up with ${hot} hot lead${hot > 1 ? "s" : ""}` : "Re-engage 12 cold leads",
      sub: hot > 0 ? "Highest intent buyers waiting" : "AI will craft personalized openers",
      icon: Flame, page: "inbox",
      tone: "hot",
    },
    {
      label: "Best time to send campaign: 6:00 PM",
      sub: "+38% open rate based on your audience",
      icon: Clock, page: "campaigns",
      tone: "primary",
    },
    {
      label: pending > 0 ? `Clear ${pending} pending follow-up${pending > 1 ? "s" : ""}` : "Schedule a re-engagement broadcast",
      sub: pending > 0 ? "Top priority due in 2 hours" : "Reach 1,248 dormant leads",
      icon: Bell, page: pending > 0 ? "followups" : "broadcasts",
      tone: "warning",
    },
  ];

  const toneStyles = {
    hot: "bg-hot text-hot-foreground",
    primary: "bg-primary text-primary-foreground",
    warning: "bg-warning text-warning-foreground",
  } as const;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-foreground via-foreground to-primary text-background p-5 sm:p-7 mb-5 shadow-2xl shadow-primary/20">
      {/* Background decorations */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary-glow/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.04] dot-pattern pointer-events-none" />

      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left — title + suggestions */}
        <div className="lg:col-span-7">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="relative w-11 h-11 rounded-2xl bg-background/15 backdrop-blur flex items-center justify-center ring-1 ring-background/20">
              <Sparkles className="w-5 h-5" />
              <span className="absolute -inset-1 rounded-2xl bg-primary-glow/40 blur-md -z-10 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                AI Command Center · Live
              </p>
              <h2 className="text-[20px] sm:text-[24px] font-bold tracking-tight leading-tight">
                Addison AI Insights
              </h2>
            </div>
          </div>

          <p className="text-[13px] opacity-80 mb-5 max-w-md">
            I've analyzed your inbox in the last 60 seconds. Here's what to do next:
          </p>

          <div className="space-y-2">
            {suggestions.map((s, i) => {
              const isApplied = applied === s.label;
              return (
                <div
                  key={s.label}
                  className={cn(
                    "group relative bg-background/10 backdrop-blur hover:bg-background/20 border border-background/15 rounded-xl p-3.5 transition-all flex items-center gap-3",
                    isApplied && "ring-2 ring-success bg-success/15"
                  )}
                >
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md", toneStyles[s.tone as keyof typeof toneStyles])}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold leading-tight truncate">{s.label}</p>
                    <p className="text-[11px] opacity-75 mt-0.5 truncate">{s.sub}</p>
                  </div>
                  {isApplied ? (
                    <span className="text-[11px] font-bold text-success-foreground bg-success px-2.5 py-1.5 rounded-lg flex items-center gap-1 flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> Applied
                    </span>
                  ) : (
                    <button
                      onClick={() => onApply(s.label)}
                      className="text-[11px] font-bold bg-background text-foreground px-3 py-1.5 rounded-lg hover:scale-105 transition-transform flex items-center gap-1 flex-shrink-0 shadow-md"
                    >
                      Apply
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right — auto-reply preview */}
        <div className="lg:col-span-5">
          <div className="bg-background/10 backdrop-blur-xl border border-background/20 rounded-2xl p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-80 flex items-center gap-1.5">
                <Brain className="w-3 h-3" />
                Auto-reply preview
              </p>
              <span className="text-[9px] font-bold bg-success/20 text-success-foreground px-1.5 py-0.5 rounded flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-success animate-pulse" />
                Drafting
              </span>
            </div>

            {/* Incoming */}
            <div className="flex justify-start mb-2 animate-fade-in">
              <div className="bg-background/15 rounded-xl rounded-bl-sm px-3 py-2 max-w-[85%]">
                <p className="text-[9px] font-bold opacity-70 mb-0.5">Priya Mehta · 2s ago</p>
                <p className="text-[12px] leading-snug">Hey! What's the price for 100 students?</p>
              </div>
            </div>

            {/* AI draft */}
            <div className="flex justify-end mb-3 animate-fade-in" style={{ animationDelay: "200ms" }}>
              <div className="bg-primary text-primary-foreground rounded-xl rounded-br-sm px-3 py-2 max-w-[90%] shadow-lg shadow-primary/40 ring-1 ring-primary-glow/30">
                <p className="text-[9px] font-bold opacity-90 mb-0.5 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Addison drafted
                </p>
                <p className="text-[12px] leading-snug">
                  Hi Priya! Growth plan covers 100+ students at ₹2,499/mo. Want me to send the pay link? 💳
                </p>
              </div>
            </div>

            <div className="mt-auto pt-3 border-t border-background/15 flex gap-2">
              <button
                onClick={() => { onApply("Auto-reply to Priya"); onNavigate?.("inbox"); }}
                className="flex-1 bg-background text-foreground rounded-lg py-2 text-[11px] font-bold hover:scale-[1.02] transition-transform shadow-md flex items-center justify-center gap-1.5"
              >
                <Send className="w-3 h-3" />
                Apply AI Suggestion
              </button>
              <button
                onClick={() => toast.info("Generating new draft…")}
                className="px-3 bg-background/10 hover:bg-background/20 rounded-lg text-[11px] font-bold transition-colors"
                title="Regenerate"
              >
                <Wand2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============ LIVE CHAT PREVIEW ============ */

type LivePreviewProps = {
  chats: any[];
  isLoading: boolean;
  onNavigate?: (page: string) => void;
};

const LiveChatPreview = ({ chats, isLoading, onNavigate }: LivePreviewProps) => {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 lg:p-6 mb-5 relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-success/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-bold flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            Live Chats
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 ml-4">Last 3 conversations · WhatsApp</p>
        </div>
        <button
          onClick={() => onNavigate?.("inbox")}
          className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-[11px] font-bold hover:bg-primary-glow transition-colors flex items-center gap-1.5 shadow-md shadow-primary/30"
        >
          Open Inbox
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {isLoading && <p className="text-[12px] text-muted-foreground text-center py-6">Loading live chats…</p>}

      {!isLoading && chats.length === 0 && (
        <div className="text-center py-8">
          <Inbox className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-[12px] text-muted-foreground">No conversations yet</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {chats.map((c, i) => {
          const isTyping = i === 0; // first one shows typing for "live" feel
          return (
            <button
              key={c.id}
              onClick={() => onNavigate?.("inbox")}
              className="group relative text-left bg-muted/40 hover:bg-muted/70 border border-border hover:border-primary/30 rounded-xl p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{ background: "linear-gradient(135deg, hsl(var(--chat-bg)/0.5), hsl(var(--card)))" }}
            >
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="relative flex-shrink-0">
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold ring-2",
                    c.contact?.tag === "hot" ? "bg-hot-soft text-hot ring-hot/20" : "bg-primary-soft text-primary ring-primary/20"
                  )}>
                    {initialsFor(c.contact?.name || "Unknown")}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-card" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-bold truncate flex items-center gap-1">
                    {c.contact?.name || "Unknown"}
                    {c.contact?.tag === "hot" && <Flame className="w-2.5 h-2.5 text-hot flex-shrink-0" />}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{c.last_message_at ? formatRelative(c.last_message_at) : "now"}</p>
                </div>
                {c.unread_count > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-hot text-hot-foreground text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                    {c.unread_count}
                  </span>
                )}
              </div>
              {isTyping ? (
                <div className="flex items-center gap-1.5 px-2 py-1.5 bg-card rounded-lg">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="text-[10px] text-muted-foreground ml-1 italic">typing…</span>
                </div>
              ) : (
                <p className="text-[11.5px] text-muted-foreground line-clamp-2 leading-snug">
                  {c.last_message_preview || "No messages yet"}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
