import {
  MessageSquare, Users, IndianRupee, ArrowUpRight, TrendingUp, Flame, Bell, Megaphone, Radio,
  Sparkles, Zap, Loader2, Wand2, Activity, Clock, ArrowRight, Send, Bot, Target,
  Rocket, MousePointerClick, Brain, CheckCircle2, Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
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
    queryFn: () => api.getDashboard(),
  });
};

type Props = { onNavigate?: (page: string) => void };

// Helpers for honest data (no fake numbers)
const DAY = 24 * 3600 * 1000;

// Generic helpers — items are loosely typed because the dashboard payload is mixed shapes.
type Bag = Record<string, any>;

const wowDelta = (items: Bag[], dateKey: string, valueFn: (i: Bag) => number = () => 1): number | null => {
  const now = Date.now();
  let last7 = 0, prior7 = 0;
  for (const it of items) {
    const raw = it[dateKey];
    if (!raw) continue;
    const t = new Date(raw).getTime();
    if (t > now - 7 * DAY) last7 += valueFn(it);
    else if (t > now - 14 * DAY) prior7 += valueFn(it);
  }
  if (prior7 === 0) return last7 > 0 ? null : 0;
  return Math.round(((last7 - prior7) / prior7) * 100);
};

const dailySeries = (items: Bag[], dateKey: string, days = 7, valueFn: (i: Bag) => number = () => 1): number[] => {
  const buckets = new Array(days).fill(0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (const it of items) {
    const raw = it[dateKey];
    if (!raw) continue;
    const t = new Date(raw).getTime();
    for (let i = 0; i < days; i++) {
      const start = new Date(now);
      start.setDate(now.getDate() - (days - 1 - i));
      const end = start.getTime() + DAY;
      if (t >= start.getTime() && t < end) {
        buckets[i] += valueFn(it);
        break;
      }
    }
  }
  return buckets;
};

const sumLastNDays = (items: Bag[], dateKey: string, n: number, valueFn: (i: Bag) => number = () => 1): number => {
  const cutoff = Date.now() - n * DAY;
  let total = 0;
  for (const it of items) {
    const raw = it[dateKey];
    if (!raw) continue;
    if (new Date(raw).getTime() > cutoff) total += valueFn(it);
  }
  return total;
};

export const DashboardPage = ({ onNavigate }: Props) => {
  const { data, isLoading } = useDashboardData();
  const qc = useQueryClient();
  const [seeding, setSeeding] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const stats = useMemo(() => {
    if (!data) return { total: 0, open: 0, hot: 0, revenue7d: 0, revenueAll: 0, tasksOpen: 0, replies: 0, dealsWon: 0 };
    const hot = data.contacts.filter((c) => c.tag === "hot").length;
    const open = data.conversations.filter((c) => c.status === "open").length;
    const wonDeals = data.deals.filter((d) => d.stage === "won");
    const revenueAll = wonDeals.reduce((a, d) => a + Number(d.value), 0);
    const revenue7d = sumLastNDays(wonDeals, "closed_at", 7, (d) => Number(d.value));
    return {
      total: data.contacts.length,
      open, hot, revenue7d, revenueAll,
      tasksOpen: data.tasks.length,
      replies: data.messages.filter((m) => m.direction === "outbound").length,
      dealsWon: wonDeals.length,
    };
  }, [data]);

  // REAL week-over-week deltas (null = not enough data to compare)
  const trends = useMemo(() => {
    if (!data) return { contacts: null, hot: null, revenue: null };
    const wonDeals = data.deals.filter((d) => d.stage === "won");
    const hotContacts = data.contacts.filter((c) => c.tag === "hot");
    return {
      contacts: wowDelta(data.contacts, "created_at"),
      hot: wowDelta(hotContacts, "created_at"),
      revenue: wowDelta(wonDeals, "closed_at", (d) => Number(d.value)),
    };
  }, [data]);

  // REAL 7-day sparklines (no Math.sin decoration)
  const series = useMemo(() => {
    if (!data) return { contacts: [], chats: [], hot: [], revenue: [] };
    const wonDeals = data.deals.filter((d) => d.stage === "won");
    const hotContacts = data.contacts.filter((c) => c.tag === "hot");
    const inboundMsgs = data.messages.filter((m) => m.direction === "inbound");
    return {
      contacts: dailySeries(data.contacts, "created_at", 7),
      chats: dailySeries(inboundMsgs, "created_at", 7),
      hot: dailySeries(hotContacts, "created_at", 7),
      revenue: dailySeries(wonDeals, "closed_at", 7, (d) => Number(d.value)),
    };
  }, [data]);

  // Real "needs attention" signals — drives the AI hero panel
  const insights = useMemo(() => {
    if (!data) return [] as Array<{ label: string; sub: string; icon: any; page: string; tone: "hot" | "primary" | "warning" }>;
    const out: Array<{ label: string; sub: string; icon: any; page: string; tone: "hot" | "primary" | "warning" }> = [];

    const hotIds = new Set(data.contacts.filter((c) => c.tag === "hot").map((c) => c.id));
    const hotWaiting = data.conversations.filter((c) => hotIds.has(c.contact_id) && c.unread_count > 0);
    if (hotWaiting.length > 0) {
      out.push({
        label: `${hotWaiting.length} hot lead${hotWaiting.length > 1 ? "s" : ""} waiting on you`,
        sub: "Unanswered messages from highest-intent buyers",
        icon: Flame, page: "inbox", tone: "hot",
      });
    }

    const overdue = data.tasks.filter((t) => t.due_at && new Date(t.due_at).getTime() < Date.now());
    if (overdue.length > 0) {
      const earliest = overdue.slice().sort((a, b) =>
        new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime()
      )[0];
      out.push({
        label: `${overdue.length} overdue follow-up${overdue.length > 1 ? "s" : ""}`,
        sub: `Earliest: "${earliest.title}" · ${formatRelative(earliest.due_at)}`,
        icon: Bell, page: "followups", tone: "warning",
      });
    }

    const drafts = data.campaigns.filter((c) => c.status === "draft");
    if (drafts.length > 0) {
      out.push({
        label: `${drafts.length} campaign${drafts.length > 1 ? "s" : ""} ready to launch`,
        sub: drafts[0].name,
        icon: Megaphone, page: "campaigns", tone: "primary",
      });
    }

    const stale = data.conversations.filter((c) =>
      c.unread_count > 0 && c.last_message_at &&
      Date.now() - new Date(c.last_message_at).getTime() > 4 * 3600 * 1000
    );
    if (stale.length > 0) {
      out.push({
        label: `${stale.length} chat${stale.length > 1 ? "s" : ""} stale 4h+`,
        sub: "Reply now or you'll lose them",
        icon: Clock, page: "inbox", tone: "warning",
      });
    }

    return out.slice(0, 4);
  }, [data]);

  // Most recent unanswered inbound conversation — for the right side of the AI hero
  const topUnanswered = useMemo(() => {
    if (!data) return null;
    const candidates = data.conversations.filter((c) => c.unread_count > 0 && c.last_message_at);
    if (candidates.length === 0) return null;
    const c = candidates.slice().sort((a, b) =>
      new Date(b.last_message_at!).getTime() - new Date(a.last_message_at!).getTime()
    )[0];
    const contact = data.contacts.find((x) => x.id === c.contact_id);
    return { conv: c, contact };
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

  // KPI tiles — real numbers, real trends, real sparklines, clickable
  const tiles = [
    {
      icon: MessageSquare, label: "Total Contacts", value: stats.total,
      trend: trends.contacts, sub: "vs pichla hafta",
      page: "contacts",
      borderClass: "border-[#3C50E0]",
      shadowClass: "shadow-[0_5px_0_0_#2533A8]",
      iconBgInline: "bg-[#3C50E0] text-white",
      sparkColor: "#3C50E0",
      sparkValues: series.contacts,
      live: false,
    },
    {
      icon: Inbox, label: "Active Chats", value: stats.open,
      trend: null, sub: "abhi open hain",
      page: "inbox",
      borderClass: "border-[#0E8A4B]",
      shadowClass: "shadow-[0_5px_0_0_#0A6E3C]",
      iconBgInline: "bg-[#0E8A4B] text-white",
      sparkColor: "#0E8A4B",
      sparkValues: series.chats,
      live: true,
    },
    {
      icon: Flame, label: "Hot Leads", value: stats.hot,
      trend: trends.hot, sub: "vs pichla hafta",
      page: "contacts",
      borderClass: "border-[#D4308E]",
      shadowClass: "shadow-[0_5px_0_0_#A11A6A]",
      iconBgInline: "bg-[#D4308E] text-white",
      sparkColor: "#D4308E",
      sparkValues: series.hot,
      live: false,
    },
    {
      icon: IndianRupee, label: "Revenue (7 din)", value: stats.revenue7d,
      trend: trends.revenue, sub: "vs prior week", isCurrency: true,
      page: "deals",
      borderClass: "border-[#FF6A1F]",
      shadowClass: "shadow-[0_5px_0_0_#B8420A]",
      iconBgInline: "bg-[#FF6A1F] text-white",
      sparkColor: "#FF6A1F",
      sparkValues: series.revenue,
      live: false,
    },
  ];

  const c0 = useCount(tiles[0].value);
  const c1 = useCount(tiles[1].value);
  const c2 = useCount(tiles[2].value);
  const c3 = useCount(tiles[3].value);
  const counts = [c0, c1, c2, c3];

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const result = await api.seed();
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
    if (h < 12) return "Namaste";
    if (h < 17) return "Good afternoon";
    return "Shubh sandhya";
  })();
  const displayName = useAuth().user?.user_metadata?.display_name || useAuth().user?.email?.split("@")[0] || "dost";

  // Funnel — Leads → Chatted → Deals → Won. Honest counts, no clamping.
  // "Chatted" = unique contacts who have at least one conversation.
  const funnel = useMemo(() => {
    if (!data) return [
      { label: "Leads", value: 0, count: "0", page: "contacts", color: "from-accent to-primary" },
      { label: "Chatted", value: 0, count: "0", page: "inbox", color: "from-primary to-primary-glow" },
      { label: "Deals (open)", value: 0, count: "0", page: "deals", color: "from-primary-glow to-warning" },
      { label: "Won", value: 0, count: "0", page: "deals", color: "from-warning to-success" },
    ];
    const chattedContacts = new Set(data.conversations.map((c) => c.contact_id));
    const dealsOpen = data.deals.filter((d) => d.stage !== "won" && d.stage !== "lost").length;
    const dealsWon = data.deals.filter((d) => d.stage === "won").length;
    return [
      { label: "Leads", value: data.contacts.length, count: data.contacts.length.toLocaleString("en-IN"), page: "contacts", color: "from-accent to-primary" },
      { label: "Chatted", value: chattedContacts.size, count: chattedContacts.size.toLocaleString("en-IN"), page: "inbox", color: "from-primary to-primary-glow" },
      { label: "Deals (open)", value: dealsOpen, count: dealsOpen.toLocaleString("en-IN"), page: "deals", color: "from-primary-glow to-warning" },
      { label: "Won", value: dealsWon, count: dealsWon.toLocaleString("en-IN"), page: "deals", color: "from-warning to-success" },
    ];
  }, [data]);
  const funnelMax = Math.max(...funnel.map((f) => f.value), 1);
  const overallConv = stats.total > 0 ? ((stats.dealsWon / stats.total) * 100).toFixed(1) : "0.0";

  // Demo seed only available when ?dev=1 is in the URL — protects prospects
  // from accidentally polluting their workspace with fake "Priya Mehta" data.
  const showDemoSeed = typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("dev") === "1";

  return (
    <PageShell
      title={`${greeting}, ${displayName} 🙏`}
      subtitle="Aaj ka business · aapka dashboard"
      icon={<Sparkles className="w-4 h-4" />}
      actions={
        showDemoSeed ? (
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 bg-[#FF6A1F] text-white px-4 py-2 rounded-xl text-[12px] font-extrabold hover:bg-[#E85C12] transition-all disabled:opacity-60 shadow-[0_4px_0_0_#B8420A] hover:shadow-[0_2px_0_0_#B8420A] hover:translate-y-[2px]"
          >
            {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            {seeding ? "Loading…" : "Load demo data"}
          </button>
        ) : null
      }
    >
      {/* Empty state — first-run guidance, no fake data */}
      {isEmpty && (
        <div className="relative overflow-hidden bg-white border-2 border-[#E8B968] rounded-2xl p-8 mb-5 text-center max-w-2xl mx-auto shadow-[0_6px_0_0_#E8B968]">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#FFD23F]/30 rounded-full blur-3xl pointer-events-none" />
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF6A1F] to-[#E85C12] flex items-center justify-center mx-auto mb-4 shadow-md text-white">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="relative text-2xl font-black tracking-tight">AddisonX mein swagat hai!</h2>
          <p className="relative text-[13px] text-foreground/70 mt-2 max-w-md mx-auto leading-relaxed font-medium">
            Shuru karne ke liye: Settings se WhatsApp Business account connect karein, phir contacts add karein ya inbound messages ka wait karein.
          </p>
          <div className="relative mt-6 flex items-center justify-center gap-2 flex-wrap">
            <a href="/app/settings" className="inline-flex items-center gap-2 bg-[#0E8A4B] text-white px-5 py-2.5 rounded-xl text-[12px] font-extrabold hover:bg-[#0A6E3C] transition shadow-[0_4px_0_0_#073D22] hover:shadow-[0_2px_0_0_#073D22] hover:translate-y-[2px]">
              WhatsApp connect karein
            </a>
            <a href="/app/contacts" className="inline-flex items-center gap-2 bg-white border-2 border-[#E8B968] text-foreground px-5 py-2.5 rounded-xl text-[12px] font-extrabold hover:bg-[#FFF1D6] transition">
              Contact add karein
            </a>
            {showDemoSeed && (
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="inline-flex items-center gap-2 bg-[#FF6A1F] text-white px-5 py-2.5 rounded-xl text-[12px] font-extrabold disabled:opacity-60 shadow-[0_4px_0_0_#B8420A]"
              >
                {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Demo load karein
              </button>
            )}
          </div>
        </div>
      )}

      {/* ===== SECTION 1 — KPI CARDS ===== */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        {tiles.map((s, i) => {
          const sparkW = 120, sparkH = 36;
          const max = Math.max(1, ...s.sparkValues);
          const norm = s.sparkValues.map((v: number) => v / max);
          const sparkPath = norm
            .map((v, idx) => {
              const x = (sparkW * idx) / Math.max(1, norm.length - 1);
              const y = sparkH - 2 - v * (sparkH - 4);
              return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
            })
            .join(" ");
          const sparkArea = norm.length > 1 ? `${sparkPath} L ${sparkW} ${sparkH} L 0 ${sparkH} Z` : "";
          const trendDelta = s.trend;
          return (
            <button
              key={s.label}
              onClick={() => onNavigate?.(s.page)}
              className={cn(
                "relative overflow-hidden rounded-2xl border-2 bg-white p-5 hover:-translate-y-1 transition-all duration-200 group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A1F]/40",
                s.borderClass,
                s.shadowClass
              )}
              title={`Open ${s.page}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shadow-md", s.iconBgInline)}>
                  <s.icon className="w-5 h-5" strokeWidth={2.5} />
                </div>
                {trendDelta !== null && trendDelta !== undefined ? (
                  <span className={cn(
                    "text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-0.5 border",
                    trendDelta > 0 ? "text-[#0A6E3C] bg-[#E6F7EE] border-[#0E8A4B]/30" :
                    trendDelta < 0 ? "text-[#B8230C] bg-[#FCE5E0] border-[#FF6A1F]/30" :
                    "text-foreground/60 bg-[#FFF1D6] border-[#E8B968]"
                  )}>
                    <ArrowUpRight className={cn("w-3 h-3", trendDelta < 0 && "rotate-90")} />
                    {trendDelta > 0 ? "+" : ""}{trendDelta}%
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold text-foreground/60 bg-[#FFF1D6] border border-[#E8B968] px-2.5 py-1 rounded-full">—</span>
                )}
              </div>
              <p className="relative text-[11px] text-foreground/60 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                {s.label}
                {s.live && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[#0E8A4B] opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#0E8A4B]" />
                  </span>
                )}
              </p>
              <p className={cn(
                "relative font-black tracking-tight mt-1 tabular-nums",
                s.label.startsWith("Revenue") ? "text-[34px] text-[#FF6A1F]" : "text-3xl text-foreground"
              )}>
                {s.isCurrency ? "₹" : ""}{counts[i].toLocaleString("en-IN")}
              </p>
              <div className="relative flex items-end justify-between mt-2 gap-2">
                <p className="text-[11px] text-muted-foreground">{s.sub}</p>
                {s.sparkValues.some((v: number) => v > 0) ? (
                  <svg width={sparkW} height={sparkH} viewBox={`0 0 ${sparkW} ${sparkH}`} className="opacity-90 overflow-visible">
                    <defs>
                      <linearGradient id={`spark-${i}`} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={s.sparkColor} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={s.sparkColor} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {sparkArea && <path d={sparkArea} fill={`url(#spark-${i})`} />}
                    <path
                      d={sparkPath}
                      fill="none"
                      stroke={s.sparkColor}
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span className="text-[10px] text-muted-foreground">No 7-day activity</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ===== SECTION 2 — NEEDS ATTENTION (real signals) ===== */}
      <AddisonAIHero
        insights={insights}
        topUnanswered={topUnanswered}
        onNavigate={onNavigate}
      />

      {/* ===== SECTION 3 — LIVE CHAT PREVIEW ===== */}
      <LiveChatPreview chats={liveChats} onNavigate={onNavigate} isLoading={isLoading} />

      {/* ===== SECTION 4 — REVENUE + FUNNEL ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-5">
        {/* Revenue area chart */}
        <div className="xl:col-span-7 relative overflow-hidden bg-white border-2 border-[#FF6A1F] rounded-2xl p-5 lg:p-6 shadow-[0_5px_0_0_#B8420A]">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#FFD23F]/30 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex items-start justify-between mb-5 gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FF6A1F] text-white flex items-center justify-center shadow-md">
                  <Activity className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-[15px] font-black tracking-tight flex items-center gap-2">
                    Revenue trend
                    <span className="text-[10px] font-extrabold text-[#7A4A00] bg-[#FFD23F] border border-[#E8B400] px-2 py-0.5 rounded-full">7 din</span>
                  </h3>
                  <p className="text-[11px] text-foreground/60 mt-0.5 font-medium">Closed-won deals · hover for details</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-foreground/60 font-extrabold uppercase tracking-wider">Total kamai</p>
              <p className="text-3xl font-black tabular-nums text-[#FF6A1F]">
                ₹{trendTotal.toLocaleString("en-IN")}
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
                  <stop offset="0%" stopColor="#FF6A1F" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#FFD23F" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="revLine" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#FF6A1F" />
                  <stop offset="100%" stopColor="#FFD23F" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75, 1].map((p) => {
                const y = 16 + (180 - 32) * p;
                return (
                  <line key={p} x1="24" x2={chartPaths.W - 24} y1={y} y2={y}
                    stroke="#E8B968" strokeWidth="1" strokeDasharray="2 4" opacity="0.6" />
                );
              })}
              {trendTotal > 0 && (
                <>
                  <path d={chartPaths.area} fill="url(#revArea)" />
                  <path d={chartPaths.line} fill="none" stroke="url(#revLine)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  {chartPaths.points.map((p, i) => (
                    <g key={i}>
                      <rect x={p.x - 22} y={0} width={44} height={chartPaths.H} fill="transparent" onMouseEnter={() => setHoverIdx(i)} />
                      <circle cx={p.x} cy={p.y} r={hoverIdx === i ? 6 : 4}
                        fill="white" stroke="#FF6A1F" strokeWidth="2.5" className="transition-all" />
                    </g>
                  ))}
                </>
              )}
              {trendTotal === 0 && (
                <text x="50%" y="50%" textAnchor="middle" className="fill-foreground/40" style={{ fontSize: 11, fontWeight: 600 }}>
                  Abhi koi closed-won deal nahi
                </text>
              )}
            </svg>
            <div className="flex justify-between px-6 mt-2">
              {trend.map((d, i) => (
                <span key={i} className={cn("text-[10px] font-extrabold uppercase tracking-wider transition-colors", hoverIdx === i ? "text-[#FF6A1F]" : "text-foreground/60")}>
                  {d.label}
                </span>
              ))}
            </div>
            {hoverIdx !== null && trend[hoverIdx] && trend[hoverIdx].value > 0 && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-[#0A3D24] text-white text-[11px] font-extrabold shadow-lg pointer-events-none">
                {trend[hoverIdx].label} · ₹{trend[hoverIdx].value.toLocaleString("en-IN")}
              </div>
            )}
          </div>
        </div>

        {/* Funnel */}
        <div className="xl:col-span-5 relative overflow-hidden bg-white border-2 border-[#0E8A4B] rounded-2xl p-5 lg:p-6 shadow-[0_5px_0_0_#0A6E3C]">
          <div className="absolute -bottom-20 -right-20 w-56 h-56 bg-[#16C172]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex items-start justify-between mb-5 gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0E8A4B] text-white flex items-center justify-center shadow-md">
                  <Target className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-[15px] font-black tracking-tight">Conversion funnel</h3>
                  <p className="text-[11px] text-foreground/60 mt-0.5 font-medium">Leads → Chats → Deals → Revenue</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-foreground/60 font-extrabold uppercase tracking-wider">Overall</p>
              <p className="text-3xl font-black tabular-nums text-[#0E8A4B]">{overallConv}%</p>
            </div>
          </div>
          <div className="relative space-y-3">
            {funnel.map((f, i) => {
              const widthPct = (f.value / funnelMax) * 100;
              const prev = i > 0 ? funnel[i - 1] : null;
              const stepKept = prev && prev.value > 0 ? Math.round((f.value / prev.value) * 100) : null;
              const stepLost = stepKept !== null ? 100 - stepKept : null;
              const fillColors = [
                "from-[#3C50E0] to-[#5B6FE8]",
                "from-[#0E8A4B] to-[#16C172]",
                "from-[#FFD23F] to-[#FF6A1F]",
                "from-[#FF6A1F] to-[#D4308E]",
              ];
              return (
                <button
                  key={f.label}
                  onClick={() => onNavigate?.(f.page)}
                  className="w-full text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A1F]/40 rounded-lg"
                  title={`Open ${f.page}`}
                >
                  <div className="flex items-center justify-between text-[11px] font-extrabold mb-1.5">
                    <span className="flex items-center gap-1.5">
                      {f.label}
                      {stepKept !== null && (
                        <span className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded",
                          stepLost! > 70 ? "text-[#B8230C] bg-[#FCE5E0]" : stepLost! > 40 ? "text-[#7A4A00] bg-[#FFD23F]" : "text-[#0A6E3C] bg-[#E6F7EE]"
                        )}>
                          {stepKept}% kept
                        </span>
                      )}
                    </span>
                    <span className="tabular-nums text-foreground">{f.count}</span>
                  </div>
                  <div className="h-8 bg-[#FFF1D6] border border-[#E8B968] rounded-lg overflow-hidden relative group-hover:ring-2 group-hover:ring-[#FF6A1F]/30 transition">
                    <div
                      className={cn("h-full rounded-lg bg-gradient-to-r transition-all duration-700 shadow-sm", fillColors[i])}
                      style={{ width: f.value === 0 ? "0%" : `${Math.max(6, widthPct)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== BOTTOM ROW — Recent contacts + pending follow-ups ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white border-2 border-[#3C50E0] rounded-2xl p-5 lg:p-6 shadow-[0_5px_0_0_#2533A8]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#3C50E0] text-white flex items-center justify-center shadow-md">
                <Users className="w-4 h-4" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-[15px] font-black tracking-tight">Naye contacts</h3>
                <p className="text-[11px] text-foreground/60 mt-0.5 font-medium">Latest leads added</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate?.("contacts")}
              className="text-[11px] text-[#3C50E0] font-extrabold hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {isLoading && <p className="text-[12px] text-foreground/60 text-center py-6 font-medium">Loading…</p>}
          {!isLoading && (data?.contacts ?? []).length === 0 && (
            <p className="text-[12px] text-foreground/60 text-center py-6 font-medium">Abhi koi contact nahi.</p>
          )}
          <div className="space-y-1.5">
            {(data?.contacts ?? []).slice(0, 5).map((c, idx) => {
              const avatarColors = ["bg-[#0E8A4B]", "bg-[#FF6A1F]", "bg-[#D4308E]", "bg-[#3C50E0]", "bg-[#B8651A]"];
              return (
                <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#FFF6E8] transition group cursor-pointer border border-transparent hover:border-[#E8B968]">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-extrabold flex-shrink-0 text-white shadow-md transition-transform group-hover:scale-105",
                    avatarColors[idx % avatarColors.length]
                  )}>
                    {initialsFor(c.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-extrabold truncate flex items-center gap-1.5">
                      {c.name}
                      {c.tag === "hot" && <span className="text-[8px] px-1.5 py-0.5 bg-[#D4308E] text-white rounded font-extrabold uppercase">Hot</span>}
                    </p>
                    <p className="text-[11px] text-foreground/60 font-mono truncate">{c.phone}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[11px] font-extrabold tabular-nums text-[#0E8A4B]">Score {c.score}</p>
                    <p className="text-[10px] text-foreground/60 font-medium">{formatRelative(c.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border-2 border-[#D4308E] rounded-2xl p-5 lg:p-6 shadow-[0_5px_0_0_#A11A6A]">
          {(() => {
            const pending = (data?.tasks ?? [])
              .slice()
              .sort((a, b) => {
                const at = a.due_at ? new Date(a.due_at).getTime() : Number.MAX_SAFE_INTEGER;
                const bt = b.due_at ? new Date(b.due_at).getTime() : Number.MAX_SAFE_INTEGER;
                return at - bt;
              });
            const overdueCount = pending.filter((t) => t.due_at && new Date(t.due_at).getTime() < Date.now()).length;
            return (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#D4308E] text-white flex items-center justify-center shadow-md">
                      <Bell className="w-4 h-4" strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-black tracking-tight">Pending follow-ups</h3>
                      <p className="text-[11px] text-foreground/60 mt-0.5 font-medium">
                        {pending.length} pending · {overdueCount > 0 ? <span className="text-[#B8230C] font-extrabold">{overdueCount} overdue</span> : "koi overdue nahi"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate?.("followups")}
                    className="text-[11px] text-[#D4308E] font-extrabold hover:underline flex items-center gap-1"
                  >
                    View all <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                {pending.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#E6F7EE] text-[#0E8A4B] flex items-center justify-center mb-2 shadow-md">
                      <CheckCircle2 className="w-6 h-6" strokeWidth={2.5} />
                    </div>
                    <p className="text-[13px] font-extrabold">Sab caught up! 🎉</p>
                    <p className="text-[11px] text-foreground/60 mt-0.5 font-medium">Koi follow-up pending nahi</p>
                  </div>
                )}
                <div className="space-y-2">
                  {pending.slice(0, 6).map((t) => {
                    const overdue = t.due_at && new Date(t.due_at).getTime() < Date.now();
                    return (
                      <button
                        key={t.id}
                        onClick={() => onNavigate?.("followups")}
                        className={cn(
                          "w-full text-left flex items-center gap-3 p-3 rounded-xl border-2 transition-all hover:-translate-y-0.5",
                          overdue ? "border-[#FF6A1F] bg-[#FFEFE0] hover:bg-[#FFE3CC]" : "border-[#E8B968] bg-[#FFF6E8] hover:bg-[#FFF1D6]"
                        )}
                      >
                        <div className={cn(
                          "w-2.5 h-2.5 rounded-full flex-shrink-0",
                          t.priority === "urgent" ? "bg-[#D4308E] animate-pulse" :
                          t.priority === "high" ? "bg-[#FF6A1F]" :
                          t.priority === "medium" ? "bg-[#FFD23F]" : "bg-foreground/40"
                        )} />
                        <p className="flex-1 text-[12.5px] font-extrabold truncate">{t.title}</p>
                        <span className={cn(
                          "text-[10px] flex-shrink-0 flex items-center gap-1 font-extrabold px-2 py-0.5 rounded-full",
                          overdue ? "text-white bg-[#FF6A1F]" : "text-foreground/70 bg-white border border-[#E8B968]"
                        )}>
                          <Clock className="w-2.5 h-2.5" />
                          {overdue ? "Overdue · " : ""}{t.due_at ? formatRelative(t.due_at) : "no due"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </PageShell>
  );
};

/* ============ NEEDS ATTENTION HERO ============ */

type Insight = { label: string; sub: string; icon: any; page: string; tone: "hot" | "primary" | "warning" };

type HeroProps = {
  insights: Insight[];
  topUnanswered: { conv: any; contact: any } | null;
  onNavigate?: (page: string) => void;
};

const AddisonAIHero = ({ insights, topUnanswered, onNavigate }: HeroProps) => {
  const toneStyles = {
    hot: "bg-[#D4308E] text-white",
    primary: "bg-[#FFD23F] text-[#7A4A00]",
    warning: "bg-[#FF6A1F] text-white",
  } as const;

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-[#0A3D24] bg-gradient-to-br from-[#0A3D24] via-[#0D4E2E] to-[#0A3D24] text-white p-5 sm:p-7 mb-5 shadow-[0_8px_0_0_#072917]">
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#FFD23F]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#FF6A1F]/20 rounded-full blur-3xl pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left — needs-attention list (real signals) */}
        <div className={cn(topUnanswered ? "lg:col-span-7" : "lg:col-span-12")}>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="relative w-12 h-12 rounded-2xl bg-[#FFD23F] flex items-center justify-center text-[#7A4A00] shadow-lg">
              <Sparkles className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#FFD23F]">
                Aapka dhyan chahiye
              </p>
              <h2 className="text-[20px] sm:text-[24px] font-black tracking-tight leading-tight">
                {insights.length === 0 ? "Sab clear hai!" : `${insights.length} kaam pending`}
              </h2>
            </div>
          </div>

          {insights.length === 0 ? (
            <div className="bg-white/10 border border-white/15 rounded-xl p-5 text-center">
              <CheckCircle2 className="w-10 h-10 text-[#16C172] mx-auto mb-2" strokeWidth={2.5} />
              <p className="text-[13px] font-extrabold">Koi hot lead waiting nahi, koi overdue task nahi, koi draft campaign nahi.</p>
              <p className="text-[11px] opacity-75 mt-1 font-medium">Ek broadcast bhejo ya inbox kholo — activity laao.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {insights.map((s) => (
                <button
                  key={s.label}
                  onClick={() => onNavigate?.(s.page)}
                  className="w-full group relative bg-white/10 backdrop-blur hover:bg-white/20 border-2 border-white/15 hover:border-[#FFD23F]/50 rounded-xl p-3.5 transition-all flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD23F]"
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md", toneStyles[s.tone])}>
                    <s.icon className="w-4 h-4" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-extrabold leading-tight truncate">{s.label}</p>
                    <p className="text-[11px] opacity-80 mt-0.5 truncate font-medium">{s.sub}</p>
                  </div>
                  <span className="text-[11px] font-extrabold bg-[#FFD23F] text-[#7A4A00] px-3 py-1.5 rounded-lg flex items-center gap-1 flex-shrink-0 shadow-md group-hover:gap-1.5 transition-all">
                    Kholo
                    <ArrowRight className="w-3 h-3" strokeWidth={3} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right — most recent unanswered chat (real preview) */}
        {topUnanswered && (
          <div className="lg:col-span-5">
            <div className="bg-white/10 backdrop-blur-xl border-2 border-white/15 rounded-2xl p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] opacity-90 flex items-center gap-1.5">
                  <Inbox className="w-3 h-3" />
                  Naya unanswered
                </p>
                <span className="text-[9px] font-extrabold bg-[#D4308E] text-white px-2 py-0.5 rounded-full">
                  {topUnanswered.conv.unread_count} unread
                </span>
              </div>

              <div className="flex justify-start mb-2">
                <div className="bg-white rounded-xl rounded-bl-sm px-3 py-2 max-w-full shadow-md text-foreground">
                  <p className="text-[9px] font-extrabold text-[#0A6E3C] mb-0.5">
                    {topUnanswered.contact?.name ?? "Unknown"} · {topUnanswered.conv.last_message_at ? formatRelative(topUnanswered.conv.last_message_at) : ""}
                  </p>
                  <p className="text-[12px] leading-snug line-clamp-3 font-medium">
                    {topUnanswered.conv.last_message_preview ?? "(no preview)"}
                  </p>
                </div>
              </div>

              <div className="mt-auto pt-3 border-t border-white/15">
                <button
                  onClick={() => onNavigate?.("inbox")}
                  className="w-full bg-[#FF6A1F] text-white rounded-xl py-2.5 text-[12px] font-extrabold hover:bg-[#E85C12] transition shadow-[0_3px_0_0_#B8420A] hover:shadow-[0_1px_0_0_#B8420A] hover:translate-y-[2px] flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Chat kholo & reply karein
                </button>
              </div>
            </div>
          </div>
        )}
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
    <div className="bg-white border-2 border-[#E8B968] rounded-2xl p-5 lg:p-6 mb-5 relative overflow-hidden shadow-[0_5px_0_0_#E8B968]">
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#FFD23F]/30 rounded-full blur-3xl pointer-events-none" />
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#0E8A4B] text-white flex items-center justify-center shadow-md">
            <MessageSquare className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-[15px] font-black tracking-tight">Naye chats</h3>
            <p className="text-[11px] text-foreground/60 mt-0.5 font-medium">Last 3 conversations · WhatsApp</p>
          </div>
        </div>
        <button
          onClick={() => onNavigate?.("inbox")}
          className="bg-[#0E8A4B] text-white rounded-xl px-4 py-2 text-[11px] font-extrabold hover:bg-[#0A6E3C] transition flex items-center gap-1.5 shadow-[0_3px_0_0_#073D22] hover:shadow-[0_1px_0_0_#073D22] hover:translate-y-[2px]"
        >
          Inbox kholo
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {isLoading && <p className="text-[12px] text-foreground/60 text-center py-6 font-medium">Loading live chats…</p>}

      {!isLoading && chats.length === 0 && (
        <div className="text-center py-8">
          <Inbox className="w-10 h-10 text-foreground/30 mx-auto mb-2" />
          <p className="text-[12px] text-foreground/60 font-medium">Abhi koi conversation nahi</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {chats.map((c, i) => {
          const isTyping = i === 0;
          const palette = [
            { bg: "bg-[#E6F7EE]", border: "border-[#0E8A4B]", avatarBg: "bg-[#0E8A4B]" },
            { bg: "bg-[#FFEFE0]", border: "border-[#FF6A1F]", avatarBg: "bg-[#FF6A1F]" },
            { bg: "bg-[#FCE5F0]", border: "border-[#D4308E]", avatarBg: "bg-[#D4308E]" },
          ];
          const p = palette[i % palette.length];
          return (
            <button
              key={c.id}
              onClick={() => onNavigate?.("inbox")}
              className={cn(
                "group relative text-left rounded-xl p-3.5 transition-all hover:-translate-y-1 border-2",
                p.bg,
                p.border,
              )}
            >
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="relative flex-shrink-0">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white shadow-md",
                    p.avatarBg
                  )}>
                    {initialsFor(c.contact?.name || "Unknown")}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#0E8A4B] border-2 border-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-extrabold truncate flex items-center gap-1">
                    {c.contact?.name || "Unknown"}
                    {c.contact?.tag === "hot" && <Flame className="w-3 h-3 text-[#D4308E] flex-shrink-0" />}
                  </p>
                  <p className="text-[10px] text-foreground/60 font-medium">{c.last_message_at ? formatRelative(c.last_message_at) : "now"}</p>
                </div>
                {c.unread_count > 0 && (
                  <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-[#FF6A1F] text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0 shadow-sm">
                    {c.unread_count}
                  </span>
                )}
              </div>
              {isTyping ? (
                <div className="flex items-center gap-1.5 px-2.5 py-2 bg-white rounded-lg border border-foreground/10">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="text-[10px] text-foreground/60 ml-1 italic font-medium">type kar rahe hain…</span>
                </div>
              ) : (
                <p className="text-[11.5px] text-foreground/75 line-clamp-2 leading-snug font-medium">
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
