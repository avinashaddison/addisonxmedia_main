import {
  MessageSquare, Users, IndianRupee, ArrowUpRight, TrendingUp, Flame, Bell, Megaphone, Radio,
  Sparkles, Zap, Loader2, Wand2, Activity, Target, Clock, ArrowRight, CheckCircle2, Send, Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import { initialsFor, formatRelative } from "@/lib/inbox-types";
import { toast } from "sonner";
import { TypingText } from "@/components/dashboard/TypingText";
import { AIAssistant } from "@/components/dashboard/AIAssistant";
import { NextBestAction, type NBAItem } from "@/components/global/NextBestAction";

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

export const DashboardPage = ({ onNavigate }: Props) => {
  const { data, isLoading } = useDashboardData();
  const qc = useQueryClient();
  const [seeding, setSeeding] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  const stats = useMemo(() => {
    if (!data) return { total: 0, open: 0, hot: 0, revenue: 0, msgs7d: 0, tasksOpen: 0, replies: 0 };
    const hot = data.contacts.filter((c) => c.tag === "hot").length;
    const open = data.conversations.filter((c) => c.status === "open").length;
    const revenue = data.deals.filter((d) => d.stage === "won").reduce((a, d) => a + Number(d.value), 0);
    const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const msgs7d = data.messages.filter((m) => new Date(m.created_at).getTime() > sevenDaysAgo).length;
    const replies = data.messages.filter((m) => m.direction === "outbound").length;
    return { total: data.contacts.length, open, hot, revenue, msgs7d, tasksOpen: data.tasks.length, replies };
  }, [data]);

  const recent = (data?.contacts ?? []).slice(0, 6);
  const urgentTasks = (data?.tasks ?? [])
    .filter((t) => t.due_at && new Date(t.due_at).getTime() < Date.now() + 24 * 3600 * 1000)
    .slice(0, 5);
  const hotContacts = (data?.contacts ?? []).filter((c) => c.tag === "hot").slice(0, 5);

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

  // Build SVG area path for revenue chart
  const chartPaths = useMemo(() => {
    const W = 600;
    const H = 180;
    const padX = 24;
    const padY = 16;
    const innerW = W - padX * 2;
    const innerH = H - padY * 2;
    const points = trend.map((d, i) => {
      const x = padX + (innerW * i) / Math.max(1, trend.length - 1);
      const y = padY + innerH - (d.value / trendMax) * innerH;
      return { x, y, value: d.value, label: d.label };
    });
    if (points.length === 0) return { line: "", area: "", points: [], W, H };
    // Smooth curve via simple cubic bezier between points
    let line = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      line += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    const area = `${line} L ${points[points.length - 1].x} ${padY + innerH} L ${points[0].x} ${padY + innerH} Z`;
    return { line, area, points, W, H };
  }, [trend, trendMax]);

  const tiles = [
    {
      icon: MessageSquare, label: "Total Contacts", value: stats.total, trend: 24, sub: "this month",
      iconBg: "bg-primary text-primary-foreground",
      ring: "from-primary/30 to-transparent",
      sparkColor: "hsl(var(--primary))",
    },
    {
      icon: Users, label: "Open Chats", value: stats.open, trend: 12, sub: "right now",
      iconBg: "bg-accent text-accent-foreground",
      ring: "from-accent/30 to-transparent",
      sparkColor: "hsl(var(--accent))",
    },
    {
      icon: Flame, label: "Hot Leads", value: stats.hot, trend: 38, sub: "ready to buy",
      iconBg: "bg-hot text-hot-foreground",
      ring: "from-hot/30 to-transparent",
      sparkColor: "hsl(var(--hot))",
    },
    {
      icon: IndianRupee, label: "Revenue Closed", value: stats.revenue, trend: 56, sub: "all time", isCurrency: true,
      iconBg: "bg-success text-success-foreground",
      ring: "from-success/30 to-transparent",
      sparkColor: "hsl(var(--success))",
    },
  ];

  // Hooks rule — call useCount the same number of times every render
  const c0 = useCount(tiles[0].value);
  const c1 = useCount(tiles[1].value);
  const c2 = useCount(tiles[2].value);
  const c3 = useCount(tiles[3].value);
  const counts = [c0, c1, c2, c3];
  const heroHotCount = useCount(stats.hot, 1300);
  const heroRevenue = useCount(stats.revenue, 1500);

  // Synthetic sparkline data per tile (deterministic from value)
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

  const conversionPct = 34.7;

  return (
    <PageShell
      title="Dashboard"
      subtitle="Your sales performance at a glance"
      icon={<TrendingUp className="w-4 h-4" />}
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
      {/* HERO — animated command center */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-foreground via-foreground to-primary text-background p-6 lg:p-8 mb-5 ring-1 ring-foreground/10 shadow-2xl shadow-primary/20">
        {/* aurora layers */}
        <div className="absolute inset-0 aurora-bg animate-aurora opacity-80 pointer-events-none" />
        <div className="absolute -top-32 -right-24 w-80 h-80 bg-primary/40 rounded-full blur-3xl pointer-events-none animate-float" />
        <div className="absolute -bottom-32 -left-24 w-80 h-80 bg-accent/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.06] grid-pattern pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-70 flex items-center gap-2">
              <Crown className="w-3 h-3" /> {greeting} · Command center live
            </p>
            <h2 className="text-2xl lg:text-[34px] font-bold tracking-tight mt-2 leading-[1.15]">
              You have{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-primary-glow via-accent to-primary-glow bg-clip-text text-transparent tabular-nums">
                  {heroHotCount}
                </span>
                <span className="absolute -inset-x-1 -bottom-1 h-1 bg-gradient-to-r from-primary-glow/0 via-primary-glow/70 to-primary-glow/0 blur-sm" />
              </span>{" "}
              hot leads waiting.
            </h2>
            <p className="text-[13px] opacity-80 mt-2.5 max-w-xl">
              {stats.open} open conversations · {stats.tasksOpen} follow-ups due · ₹{heroRevenue.toLocaleString()} closed
            </p>

            {/* Live AI typing line */}
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/10 backdrop-blur border border-background/15">
              <Sparkles className="w-3.5 h-3.5 text-primary-glow" />
              <span className="text-[12px] font-semibold opacity-95 min-w-0">
                <TypingText
                  phrases={
                    hotContacts.length > 0
                      ? [
                          `AI suggests replying to ${hotContacts[0].name}…`,
                          "Drafting a closing message for the top deal…",
                          `${stats.tasksOpen} follow-ups can be auto-sent now…`,
                        ]
                      : [
                          "AI is scanning new conversations…",
                          "Watching for high-intent signals…",
                          "Ready to auto-reply when leads come in…",
                        ]
                  }
                />
              </span>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-2.5 mt-5">
              <button
                onClick={() => onNavigate?.("inbox")}
                className="group relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-hot via-warning to-hot text-hot-foreground text-[12.5px] font-bold shadow-lg shadow-hot/40 hover:shadow-xl hover:shadow-hot/50 hover:-translate-y-0.5 transition-all"
              >
                <Flame className="w-4 h-4" />
                Reply Now (Win Deal)
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={() => {
                  toast.success("Auto-reply queued", { description: "Addison AI is drafting replies for hot leads." });
                  onNavigate?.("inbox");
                }}
                className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-background/15 hover:bg-background/25 backdrop-blur border border-background/20 text-[12.5px] font-bold transition-all"
              >
                <Zap className="w-4 h-4" />
                Auto-Reply with AI
              </button>
              <div className="px-3 py-1.5 rounded-full bg-success/20 backdrop-blur border border-success/25 text-[11px] font-bold flex items-center gap-1.5 text-success">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                AI Co-Pilot active
              </div>
            </div>
          </div>

          {/* Hot leads avatar pile with glow + pulse */}
          {hotContacts.length > 0 && (
            <div className="flex items-center gap-3 lg:border-l border-background/15 lg:pl-6 self-stretch lg:self-end">
              <div className="flex -space-x-2.5">
                {hotContacts.map((c, i) => (
                  <div key={c.id} className="relative" style={{ zIndex: hotContacts.length - i }}>
                    {i === 0 && (
                      <span className="absolute inset-0 rounded-full bg-hot/60 blur-md animate-breathe" />
                    )}
                    <div
                      className={cn(
                        "relative w-11 h-11 rounded-full bg-gradient-to-br from-hot to-warning ring-2 ring-foreground flex items-center justify-center text-[11px] font-bold text-hot-foreground shadow-md",
                        i === 0 && "ring-primary-glow"
                      )}
                      title={c.name}
                    >
                      {initialsFor(c.name)}
                      {i === 0 && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success ring-2 ring-foreground animate-pulse" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Top hot leads</p>
                <p className="text-[13px] font-semibold leading-tight">Reply now to win them</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Addison AI · Next best action — compact, action-driven */}
      {!isEmpty && (
        <div className="mb-5">
          <NextBestAction
            compact
            items={
              [
                hotContacts[0] && {
                  id: "nba-hot",
                  title: `Send offer to ${hotContacts[0].name} (high intent)`,
                  hint: "Replying within 2 min increases close rate ~3x",
                  icon: Flame,
                  tone: "danger" as const,
                  cta: "Reply now",
                  onClick: () => {
                    toast.success(`Opening chat with ${hotContacts[0].name}…`);
                    onNavigate?.("inbox");
                  },
                },
                stats.tasksOpen > 0 && {
                  id: "nba-followups",
                  title: `Follow up with ${stats.tasksOpen} lead${stats.tasksOpen > 1 ? "s" : ""} now`,
                  hint: "Overdue follow-ups → leaking pipeline",
                  icon: Clock,
                  tone: "warning" as const,
                  cta: "Open queue",
                  onClick: () => {
                    toast("Opening follow-up queue…");
                    onNavigate?.("followups");
                  },
                },
                stats.open > 0 && {
                  id: "nba-broadcast",
                  title: `Re-engage ${stats.total - stats.hot} cold contacts with a broadcast`,
                  hint: "Best send time today: 6–9 PM",
                  icon: Send,
                  tone: "success" as const,
                  cta: "Compose",
                  onClick: () => {
                    toast("Drafting broadcast…");
                    onNavigate?.("broadcasts");
                  },
                },
              ].filter(Boolean) as NBAItem[]
            }
          />
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="bg-gradient-to-br from-primary-soft via-card to-accent-soft border border-primary/20 rounded-2xl p-8 mb-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Welcome to AddisonX 🎉</h2>
          <p className="text-[13px] text-muted-foreground mt-2 max-w-md mx-auto">
            Your workspace is ready. Load a realistic demo dataset to see what AddisonX feels like in action.
          </p>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="mt-5 inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-[13px] font-bold hover:bg-primary-glow transition-all shadow-lg shadow-primary/30 disabled:opacity-60"
          >
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {seeding ? "Loading demo workspace…" : "Load demo workspace"}
          </button>
        </div>
      )}

      {/* Stat tiles with sparklines */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        {tiles.map((s, i) => {
          const spark = sparks[i];
          const sparkW = 120;
          const sparkH = 36;
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
              className={cn(
                "relative overflow-hidden gradient-border rounded-2xl p-5 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 animate-slide-up group",
                s.label === "Revenue Closed" && "ring-1 ring-primary/30 shadow-lg shadow-primary/15"
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
              <p className="relative text-[11px] text-muted-foreground font-bold uppercase tracking-wider">{s.label}</p>
              <p className={cn(
                "relative font-bold tracking-tight mt-1 tabular-nums",
                s.label === "Revenue Closed" ? "text-[34px] bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent" : "text-3xl"
              )}>
                {s.isCurrency ? "₹" : ""}{counts[i].toLocaleString()}
              </p>
              {s.label === "Revenue Closed" && stats.revenue > 0 && (
                <p className="relative text-[10.5px] font-bold text-success mt-0.5">+₹{Math.max(1234, Math.floor(stats.revenue * 0.07)).toLocaleString()} this week</p>
              )}
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
                    style={{
                      strokeDasharray: 400,
                      strokeDashoffset: 400,
                      animation: `slide-up 0.01s forwards, spark-draw 1.2s ease-out forwards`,
                      animationDelay: `${i * 80}ms`,
                    }}
                  />
                </svg>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main grid: Revenue area chart + Conversion donut */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-5">
        {/* Revenue area chart */}
        <div className="xl:col-span-8 relative overflow-hidden bg-card border border-border rounded-2xl p-5 lg:p-6">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex items-start justify-between mb-5 gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-[14px] font-bold tracking-tight">Revenue Trend</h3>
                <span className="text-[10px] font-bold text-success bg-success-soft px-1.5 py-0.5 rounded capitalize">{period}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 ml-9">Closed-won deals · hover for details</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Period toggle */}
              <div className="inline-flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
                {(["daily", "weekly", "monthly"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[10.5px] font-bold capitalize transition-all",
                      period === p
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total</p>
                <p className="text-2xl font-bold tabular-nums bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                  ₹{trendTotal.toLocaleString()}
                </p>
              </div>
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

              {/* Horizontal grid lines */}
              {[0.25, 0.5, 0.75, 1].map((p) => {
                const y = 16 + (180 - 32) * p;
                return (
                  <line
                    key={p}
                    x1="24"
                    x2={chartPaths.W - 24}
                    y1={y}
                    y2={y}
                    stroke="hsl(var(--border))"
                    strokeWidth="1"
                    strokeDasharray="2 4"
                    opacity="0.6"
                  />
                );
              })}

              {trendTotal > 0 && (
                <>
                  <path d={chartPaths.area} fill="url(#revArea)" />
                  <path
                    d={chartPaths.line}
                    fill="none"
                    stroke="url(#revLine)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {chartPaths.points.map((p, i) => (
                    <g key={i}>
                      {/* hit area */}
                      <rect
                        x={p.x - 22}
                        y={0}
                        width={44}
                        height={chartPaths.H}
                        fill="transparent"
                        onMouseEnter={() => setHoverIdx(i)}
                      />
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={hoverIdx === i ? 5 : 3}
                        fill="hsl(var(--card))"
                        stroke="hsl(var(--primary))"
                        strokeWidth="2"
                        className="transition-all"
                      />
                    </g>
                  ))}
                  {hoverIdx !== null && chartPaths.points[hoverIdx] && (
                    <g>
                      <line
                        x1={chartPaths.points[hoverIdx].x}
                        x2={chartPaths.points[hoverIdx].x}
                        y1={16}
                        y2={chartPaths.H - 16}
                        stroke="hsl(var(--primary))"
                        strokeWidth="1"
                        strokeDasharray="2 3"
                        opacity="0.4"
                      />
                    </g>
                  )}
                </>
              )}

              {trendTotal === 0 && (
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  style={{ fontSize: 11, fontWeight: 600 }}
                >
                  No closed-won deals yet
                </text>
              )}
            </svg>

            {/* Day labels */}
            <div className="flex justify-between px-6 mt-2">
              {trend.map((d, i) => (
                <span
                  key={i}
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider transition-colors",
                    hoverIdx === i ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {d.label}
                </span>
              ))}
            </div>

            {/* Hover tooltip */}
            {hoverIdx !== null && trend[hoverIdx] && trend[hoverIdx].value > 0 && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-foreground text-background text-[11px] font-bold shadow-lg pointer-events-none">
                {trend[hoverIdx].label} · ₹{trend[hoverIdx].value.toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Conversion donut */}
        <div className="xl:col-span-4 relative overflow-hidden bg-card border border-border rounded-2xl p-5 lg:p-6 flex flex-col">
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
              <Target className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-[14px] font-bold tracking-tight">Conversion</h3>
          </div>
          <p className="relative text-[11px] text-muted-foreground ml-9">Leads → Won</p>
          <div className="relative flex-1 flex flex-col items-center justify-center py-2">
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <defs>
                  <linearGradient id="donutGrad" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--primary-glow))" />
                  </linearGradient>
                </defs>
                <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke="url(#donutGrad)" strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - conversionPct / 100)}`}
                  strokeLinecap="round"
                  className="drop-shadow-md transition-all"
                  style={{ filter: "drop-shadow(0 0 8px hsl(var(--primary) / 0.4))" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold tabular-nums tracking-tight">{conversionPct}%</span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">conversion</span>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-success text-[12px] font-bold bg-success-soft px-2.5 py-1 rounded-full">
              <TrendingUp className="w-3.5 h-3.5" />
              +8.2% vs last month
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 12-col grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Recent contacts */}
        <div className="xl:col-span-5 bg-card border border-border rounded-2xl p-5 lg:p-6">
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
          {!isLoading && recent.length === 0 && (
            <p className="text-[12px] text-muted-foreground text-center py-6">No contacts yet — load demo data above.</p>
          )}
          <div className="space-y-1">
            {recent.map((c) => (
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

        {/* Urgent follow-ups */}
        <div className="xl:col-span-4 bg-card border border-border rounded-2xl p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-bold flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-warning" /> Urgent Follow-ups
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Due within 24 hours</p>
            </div>
            <span className="text-[11px] font-bold text-warning bg-warning-soft px-2 py-0.5 rounded-full">{urgentTasks.length} due</span>
          </div>
          {urgentTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-success-soft text-success flex items-center justify-center mb-2">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-[12px] font-semibold">All caught up! 🎉</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">No urgent follow-ups</p>
            </div>
          )}
          <div className="space-y-2">
            {urgentTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-warning/40 hover:shadow-sm transition-all group cursor-pointer">
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

        {/* Quick actions */}
        <div className="xl:col-span-3 bg-gradient-to-br from-primary via-primary to-primary-glow text-primary-foreground rounded-2xl p-5 lg:p-6 relative overflow-hidden shadow-xl shadow-primary/20">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary-foreground/10 rounded-full blur-2xl" />
          <div className="absolute inset-0 opacity-10 dot-pattern" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4" />
              <h3 className="text-[13px] font-bold uppercase tracking-wider">Quick Actions</h3>
            </div>
            <p className="text-[11px] opacity-80 mb-4">Jump into common workflows.</p>
            <div className="space-y-2">
              <ActionRow icon={<Megaphone className="w-3.5 h-3.5" />} label="Launch a campaign" onClick={() => onNavigate?.("campaigns")} />
              <ActionRow icon={<Radio className="w-3.5 h-3.5" />} label="Send a broadcast" onClick={() => onNavigate?.("broadcasts")} />
              <ActionRow icon={<Bell className="w-3.5 h-3.5" />} label="Schedule follow-up" onClick={() => onNavigate?.("followups")} />
              <ActionRow icon={<Send className="w-3.5 h-3.5" />} label="Open inbox" onClick={() => onNavigate?.("inbox")} />
            </div>
          </div>
        </div>
      </div>

      {/* Floating AI assistant */}
      <AIAssistant hotCount={stats.hot} pendingCount={stats.tasksOpen} onNavigate={onNavigate} />
    </PageShell>
  );
};

const ActionRow = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-2 bg-background/10 hover:bg-background/25 backdrop-blur rounded-lg px-3 py-2.5 transition-all cursor-pointer group hover:translate-x-0.5"
  >
    {icon}
    <span className="text-[12px] font-semibold flex-1 text-left">{label}</span>
    <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
  </button>
);
