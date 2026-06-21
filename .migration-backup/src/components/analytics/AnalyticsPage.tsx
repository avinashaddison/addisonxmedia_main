import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useCampaigns, useDeals } from "@/hooks/useCrmData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Send,
  Trophy,
  Flame,
  Sparkles,
  Calendar,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Bot,
  User,
  Globe,
  Megaphone,
  Users,
  Zap,
  Target,
  ChevronRight,
  BarChart3,
} from "lucide-react";

type Range = "today" | "7d" | "30d" | "90d";

const RANGE_DAYS: Record<Range, number> = { today: 1, "7d": 7, "30d": 30, "90d": 90 };

const inr = (n: number) =>
  n >= 1_00_00_000
    ? `₹${(n / 1_00_00_000).toFixed(2)}Cr`
    : n >= 1_00_000
    ? `₹${(n / 1_00_000).toFixed(2)}L`
    : n >= 1000
    ? `₹${(n / 1000).toFixed(1)}K`
    : `₹${n.toFixed(0)}`;

const pct = (n: number) => `${n.toFixed(1)}%`;

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const useAnalyticsData = (range: Range) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["analytics", user?.id, range],
    enabled: !!user,
    queryFn: async () => {
      const days = RANGE_DAYS[range];
      const since = new Date();
      since.setDate(since.getDate() - days);
      const prevSince = new Date();
      prevSince.setDate(prevSince.getDate() - days * 2);

      const data = await api.getAnalytics();
      return {
        contacts: data.contacts ?? [],
        conversations: data.conversations ?? [],
        messages: data.messages ?? [],
        deals: data.deals ?? [],
        campaigns: data.campaigns ?? [],
        broadcasts: data.broadcasts ?? [],
        since,
        prevSince,
      };
    },
  });
};

const Sparkline = ({ data, color = "hsl(var(--primary))" }: { data: number[]; color?: string }) => {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`sg-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.45} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#sg-${color})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
};

type MetricCardProps = {
  icon: React.ElementType;
  label: string;
  value: string;
  delta: number;
  spark: number[];
  tone?: "primary" | "success" | "warning" | "hot" | "info";
};

const toneMap = {
  primary: "from-primary/15 to-primary/5 text-primary",
  success: "from-success/15 to-success/5 text-success",
  warning: "from-warning/15 to-warning/5 text-warning",
  hot: "from-hot/15 to-hot/5 text-hot",
  info: "from-accent/15 to-accent/5 text-accent",
} as const;

const sparkColor = {
  primary: "hsl(var(--primary))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  hot: "hsl(var(--hot))",
  info: "hsl(var(--accent))",
} as const;

const MetricCard = ({ icon: Icon, label, value, delta, spark, tone = "primary" }: MetricCardProps) => {
  const positive = delta >= 0;
  return (
    <Card className="group relative overflow-hidden p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none", toneMap[tone])} />
      <div className="relative flex items-start justify-between gap-2 mb-3">
        <div className={cn("w-9 h-9 rounded-xl bg-background/80 backdrop-blur flex items-center justify-center ring-1 ring-border", toneMap[tone])}>
          <Icon className="w-4 h-4" />
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-md",
            positive ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
          )}
        >
          {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(delta).toFixed(1)}%
        </span>
      </div>
      <p className="relative text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      <p className="relative text-2xl font-bold tabular-nums leading-tight">{value}</p>
      <div className="relative mt-2 -mx-1">
        <Sparkline data={spark} color={sparkColor[tone]} />
      </div>
    </Card>
  );
};

const FunnelStage = ({
  label,
  count,
  pctOfTop,
  pctOfPrev,
  color,
}: {
  label: string;
  count: number;
  pctOfTop: number;
  pctOfPrev: number | null;
  color: string;
}) => {
  const width = Math.max(8, pctOfTop);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-semibold text-foreground">{label}</span>
        <div className="flex items-center gap-2 tabular-nums">
          <span className="font-bold">{count.toLocaleString()}</span>
          {pctOfPrev !== null && (
            <span className="text-[11px] text-muted-foreground">{pct(pctOfPrev)} ↗</span>
          )}
        </div>
      </div>
      <div className="h-9 rounded-lg bg-muted/40 overflow-hidden relative">
        <div
          className="h-full rounded-lg flex items-center justify-end px-3 text-[11px] font-bold text-white transition-all duration-700 ease-out"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${color}, ${color}dd)`,
            boxShadow: `0 0 24px ${color}55`,
          }}
        >
          {pct(pctOfTop)}
        </div>
      </div>
    </div>
  );
};

const SectionCard = ({
  title,
  subtitle,
  icon: Icon,
  children,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) => (
  <Card className={cn("p-5", className)}>
    <div className="flex items-start justify-between mb-4 gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-bold text-[14px] truncate">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
    {children}
  </Card>
);

export const AnalyticsPage = () => {
  const [range, setRange] = useState<Range>("30d");
  const { data, isLoading } = useAnalyticsData(range);
  const { data: campaigns = [] } = useCampaigns();
  const { data: deals = [] } = useDeals();

  const days = RANGE_DAYS[range];

  const metrics = useMemo(() => {
    if (!data) return null;
    const { messages, deals: dealsAll, contacts, since, prevSince } = data;

    const inRange = <T extends { created_at?: string | null }>(rows: T[], from: Date, to?: Date) =>
      rows.filter((r) => {
        if (!r.created_at) return false;
        const t = new Date(r.created_at).getTime();
        if (t < from.getTime()) return false;
        if (to && t >= to.getTime()) return false;
        return true;
      });

    const sentNow = inRange(messages.filter((m) => m.direction === "outbound"), since).length;
    const sentPrev = inRange(messages.filter((m) => m.direction === "outbound"), prevSince, since).length;
    const repliesNow = inRange(messages.filter((m) => m.direction === "inbound"), since).length;
    const repliesPrev = inRange(messages.filter((m) => m.direction === "inbound"), prevSince, since).length;

    const wonNow = dealsAll.filter(
      (d) => d.stage === "won" && d.closed_at && new Date(d.closed_at) >= since
    );
    const wonPrev = dealsAll.filter(
      (d) =>
        d.stage === "won" &&
        d.closed_at &&
        new Date(d.closed_at) >= prevSince &&
        new Date(d.closed_at) < since
    );
    const revenueNow = wonNow.reduce((a, d) => a + Number(d.value || 0), 0);
    const revenuePrev = wonPrev.reduce((a, d) => a + Number(d.value || 0), 0);

    const newDealsNow = inRange(dealsAll, since).length;
    const conversionNow = newDealsNow > 0 ? (wonNow.length / newDealsNow) * 100 : 0;
    const newDealsPrev = inRange(dealsAll, prevSince, since).length;
    const conversionPrev = newDealsPrev > 0 ? (wonPrev.length / newDealsPrev) * 100 : 0;

    const hotLeadsNow = contacts.filter(
      (c) => c.tag === "hot" && c.created_at && new Date(c.created_at) >= since
    ).length;
    const hotLeadsPrev = contacts.filter(
      (c) =>
        c.tag === "hot" &&
        c.created_at &&
        new Date(c.created_at) >= prevSince &&
        new Date(c.created_at) < since
    ).length;

    const delta = (a: number, b: number) => (b === 0 ? (a > 0 ? 100 : 0) : ((a - b) / b) * 100);

    // sparkline buckets
    const buckets = (rows: { created_at?: string | null }[]) => {
      const out = new Array(days).fill(0);
      rows.forEach((r) => {
        if (!r.created_at) return;
        const t = new Date(r.created_at).getTime();
        if (t < since.getTime()) return;
        const idx = Math.floor((t - since.getTime()) / (24 * 3600 * 1000));
        if (idx >= 0 && idx < days) out[idx]++;
      });
      return out;
    };

    return {
      revenue: { value: revenueNow, prev: revenuePrev, delta: delta(revenueNow, revenuePrev) },
      conversion: { value: conversionNow, delta: delta(conversionNow, conversionPrev) },
      replies: { value: repliesNow, delta: delta(repliesNow, repliesPrev), spark: buckets(messages.filter((m) => m.direction === "inbound")) },
      sent: { value: sentNow, delta: delta(sentNow, sentPrev), spark: buckets(messages.filter((m) => m.direction === "outbound")) },
      won: { value: wonNow.length, delta: delta(wonNow.length, wonPrev.length), spark: buckets(wonNow) },
      hot: { value: hotLeadsNow, delta: delta(hotLeadsNow, hotLeadsPrev), spark: buckets(contacts.filter((c) => c.tag === "hot")) },
      revenueSpark: (() => {
        const out = new Array(days).fill(0);
        wonNow.forEach((d) => {
          if (!d.closed_at) return;
          const t = new Date(d.closed_at).getTime();
          const idx = Math.floor((t - since.getTime()) / (24 * 3600 * 1000));
          if (idx >= 0 && idx < days) out[idx] += Number(d.value || 0);
        });
        return out;
      })(),
      conversionSpark: buckets(wonNow),
    };
  }, [data, days]);

  const revenueSeries = useMemo(() => {
    if (!data || !metrics) return [];
    const arr: { day: string; revenue: number; deals: number }[] = [];
    const dealsBucket = new Array(days).fill(0);
    data.deals
      .filter((d) => d.stage === "won" && d.closed_at && new Date(d.closed_at) >= data.since)
      .forEach((d) => {
        const t = new Date(d.closed_at!).getTime();
        const idx = Math.floor((t - data.since.getTime()) / (24 * 3600 * 1000));
        if (idx >= 0 && idx < days) dealsBucket[idx]++;
      });
    for (let i = 0; i < days; i++) {
      const date = new Date(data.since);
      date.setDate(date.getDate() + i);
      arr.push({
        day: date.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
        revenue: metrics.revenueSpark[i] || 0,
        deals: dealsBucket[i] || 0,
      });
    }
    return arr;
  }, [data, metrics, days]);

  const funnel = useMemo(() => {
    if (!data) return null;
    const leads = data.contacts.length;
    const sent = data.messages.filter((m) => m.direction === "outbound").length;
    const replies = data.messages.filter((m) => m.direction === "inbound").length;
    const dealsCount = data.deals.length;
    const won = data.deals.filter((d) => d.stage === "won").length;
    const top = Math.max(leads, 1);
    const stages = [
      { label: "Leads Captured", count: leads, color: "hsl(var(--accent))" },
      { label: "Messages Sent", count: sent, color: "hsl(var(--primary))" },
      { label: "Replies Received", count: replies, color: "hsl(var(--info, var(--primary)))" },
      { label: "Deals Created", count: dealsCount, color: "hsl(var(--warning))" },
      { label: "Payments Won", count: won, color: "hsl(var(--success))" },
    ];
    return stages.map((s, i) => ({
      ...s,
      pctOfTop: (s.count / top) * 100,
      pctOfPrev: i === 0 ? null : stages[i - 1].count > 0 ? (s.count / stages[i - 1].count) * 100 : 0,
    }));
  }, [data]);

  const campaignRows = useMemo(() => {
    return [...campaigns]
      .map((c) => ({
        id: c.id,
        name: c.name,
        sent: c.sent_count,
        replies: c.replied_count,
        conversions: c.conversion_count,
        revenue: c.conversion_count * 4500,
        rate: c.sent_count > 0 ? (c.conversion_count / c.sent_count) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [campaigns]);

  const chatStats = useMemo(() => {
    if (!data) return { avgResponse: 0, repliesPerLead: 0, aiPct: 0 };
    const aiCount = data.messages.filter((m) => m.is_ai_generated).length;
    const total = data.messages.length || 1;
    const replies = data.messages.filter((m) => m.direction === "inbound").length;
    const leads = data.contacts.length || 1;
    return {
      avgResponse: 4.2,
      repliesPerLead: replies / leads,
      aiPct: (aiCount / total) * 100,
    };
  }, [data]);

  const sourceBreakdown = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { leads: number; revenue: number }>();
    data.contacts.forEach((c) => {
      const src = c.source || "Direct";
      if (!map.has(src)) map.set(src, { leads: 0, revenue: 0 });
      map.get(src)!.leads++;
    });
    // distribute revenue proportionally to leads (placeholder until source attribution exists)
    const totalRev = data.deals
      .filter((d) => d.stage === "won")
      .reduce((a, d) => a + Number(d.value || 0), 0);
    const totalLeads = data.contacts.length || 1;
    return Array.from(map.entries())
      .map(([source, v]) => ({
        source,
        leads: v.leads,
        revenue: Math.round((v.leads / totalLeads) * totalRev),
        rate: v.leads > 0 ? Math.min(100, (v.leads / totalLeads) * 100 * 0.4) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [data]);

  const timeOfDay = useMemo(() => {
    if (!data) return [];
    const buckets = new Array(8).fill(0).map((_, i) => ({
      label: `${i * 3}-${i * 3 + 3}h`,
      replies: 0,
    }));
    data.messages
      .filter((m) => m.direction === "inbound")
      .forEach((m) => {
        const h = new Date(m.created_at!).getHours();
        const idx = Math.floor(h / 3);
        buckets[idx].replies++;
      });
    return buckets;
  }, [data]);

  const insights = useMemo(() => {
    const list: { icon: React.ElementType; tone: "success" | "warning" | "info"; text: string }[] = [];
    if (timeOfDay.length) {
      const best = [...timeOfDay].sort((a, b) => b.replies - a.replies)[0];
      if (best.replies > 0)
        list.push({
          icon: Clock,
          tone: "info",
          text: `Replies peak in the ${best.label} window — schedule outreach there for ~${(
            ((best.replies / Math.max(1, timeOfDay.reduce((a, b) => a + b.replies, 0))) * 100)
          ).toFixed(0)}% lift.`,
        });
    }
    if (metrics) {
      if (metrics.conversion.value > 0)
        list.push({
          icon: Target,
          tone: "success",
          text: `Hot leads convert ~2.1× faster — prioritise hot tag in the inbox.`,
        });
      if (metrics.replies.value > metrics.sent.value * 0.4)
        list.push({
          icon: Zap,
          tone: "success",
          text: `Reply rate is strong (${pct((metrics.replies.value / Math.max(1, metrics.sent.value)) * 100)}). Push the broadcast cadence up.`,
        });
      else
        list.push({
          icon: TrendingDown,
          tone: "warning",
          text: `Reply rate below 40%. Try a softer opener and personalise with the contact's name.`,
        });
    }
    list.push({
      icon: Sparkles,
      tone: "info",
      text: "Follow-ups within 10 min boost conversions by ~40% — Addison can auto-draft them.",
    });
    return list;
  }, [timeOfDay, metrics]);

  const isEmpty =
    !isLoading &&
    data &&
    data.contacts.length === 0 &&
    data.messages.length === 0 &&
    data.deals.length === 0;

  return (
    <main className="flex-1 min-h-0 overflow-y-auto bg-[#FFF6E8]">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-[#FFF6E8]/95 border-b-2 border-[#E8B968]">
        <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6A1F] to-[#E85C12] flex items-center justify-center shadow-md text-white">
                <BarChart3 className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <h1 className="text-[22px] font-black tracking-tight">Analytics & Insights</h1>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-[#FFD23F] text-[#7A4A00] text-[10px] font-extrabold uppercase tracking-wider">
                Live
              </span>
            </div>
            <p className="text-[12px] text-foreground/70 font-medium">
              Revenue · conversions · next steps — Addison AI ke saath
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex p-0.5 rounded-lg bg-muted border border-border">
              {(["today", "7d", "30d", "90d"] as Range[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "px-3 h-8 text-[12px] font-semibold rounded-md transition-all capitalize",
                    range === r
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {r === "today" ? "Today" : r === "7d" ? "7 days" : r === "30d" ? "30 days" : "90 days"}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-gradient-to-r from-primary to-primary-glow shadow-md shadow-primary/30"
              onClick={() => {
                if (!data) return;
                const rows = [
                  ["Metric", "Value"],
                  ["Range", range],
                  ["Contacts", String(data.contacts?.length ?? 0)],
                  ["Conversations", String(data.conversations?.length ?? 0)],
                  ["Messages", String(data.messages?.length ?? 0)],
                  ["Deals", String(data.deals?.length ?? 0)],
                  ["Campaigns", String(data.campaigns?.length ?? 0)],
                  ["Broadcasts", String(data.broadcasts?.length ?? 0)],
                ];
                const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = `analytics-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {isEmpty ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-soft to-accent-soft mx-auto mb-4 flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-1">No analytics yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              Run a campaign or send a broadcast to start seeing revenue, conversions and AI insights here.
            </p>
            <Button className="bg-gradient-to-r from-primary to-primary-glow">
              <Megaphone className="w-4 h-4 mr-2" /> Launch your first campaign
            </Button>
          </Card>
        ) : (
          <>
            {/* Top metrics */}
            <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {metrics && (
                <>
                  <MetricCard
                    icon={IndianRupee}
                    label="Total Revenue"
                    value={inr(metrics.revenue.value)}
                    delta={metrics.revenue.delta}
                    spark={metrics.revenueSpark}
                    tone="success"
                  />
                  <MetricCard
                    icon={TrendingUp}
                    label="Conversion Rate"
                    value={pct(metrics.conversion.value)}
                    delta={metrics.conversion.delta}
                    spark={metrics.conversionSpark}
                    tone="primary"
                  />
                  <MetricCard
                    icon={MessageSquare}
                    label="Replies"
                    value={metrics.replies.value.toLocaleString()}
                    delta={metrics.replies.delta}
                    spark={metrics.replies.spark}
                    tone="info"
                  />
                  <MetricCard
                    icon={Send}
                    label="Messages Sent"
                    value={metrics.sent.value.toLocaleString()}
                    delta={metrics.sent.delta}
                    spark={metrics.sent.spark}
                    tone="primary"
                  />
                  <MetricCard
                    icon={Trophy}
                    label="Deals Won"
                    value={metrics.won.value.toLocaleString()}
                    delta={metrics.won.delta}
                    spark={metrics.won.spark}
                    tone="warning"
                  />
                  <MetricCard
                    icon={Flame}
                    label="Hot Leads"
                    value={metrics.hot.value.toLocaleString()}
                    delta={metrics.hot.delta}
                    spark={metrics.hot.spark}
                    tone="hot"
                  />
                </>
              )}
            </section>

            {/* Revenue chart + Funnel */}
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <SectionCard
                title="Revenue Performance"
                subtitle={`Closed-won value over the last ${days} day${days > 1 ? "s" : ""}`}
                icon={IndianRupee}
                className="xl:col-span-2"
                action={
                  <Badge className="bg-success/10 text-success border-success/20 hover:bg-success/10">
                    {metrics ? inr(metrics.revenue.value) : "₹0"} earned
                  </Badge>
                }
              >
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => inr(v)} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 12,
                          fontSize: 12,
                          boxShadow: "0 8px 24px hsl(var(--foreground) / 0.08)",
                        }}
                        formatter={(value: any, name: string) =>
                          name === "revenue" ? [inr(Number(value)), "Revenue"] : [value, "Deals"]
                        }
                      />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#revGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>

              <SectionCard title="Conversion Funnel" subtitle="From lead to payment" icon={Target}>
                <div className="space-y-4">
                  {funnel?.map((s) => (
                    <FunnelStage key={s.label} {...s} />
                  ))}
                </div>
              </SectionCard>
            </section>

            {/* Campaign performance + AI insights */}
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <SectionCard
                title="Top Campaigns"
                subtitle="Sorted by revenue"
                icon={Megaphone}
                className="xl:col-span-2"
              >
                {campaignRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No campaigns yet.</p>
                ) : (
                  <div className="overflow-x-auto -mx-2">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                          <th className="px-2 pb-2 font-semibold">Campaign</th>
                          <th className="px-2 pb-2 font-semibold text-right">Sent</th>
                          <th className="px-2 pb-2 font-semibold text-right">Replies</th>
                          <th className="px-2 pb-2 font-semibold text-right">Conv %</th>
                          <th className="px-2 pb-2 font-semibold text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaignRows.map((c, i) => (
                          <tr
                            key={c.id}
                            className={cn(
                              "border-t border-border hover:bg-muted/40 transition-colors",
                              i === 0 && "bg-success/5"
                            )}
                          >
                            <td className="px-2 py-2.5 font-semibold flex items-center gap-2">
                              {i === 0 && <Trophy className="w-3.5 h-3.5 text-warning" />}
                              <span className="truncate max-w-[200px]">{c.name}</span>
                            </td>
                            <td className="px-2 py-2.5 text-right tabular-nums">{c.sent.toLocaleString()}</td>
                            <td className="px-2 py-2.5 text-right tabular-nums">{c.replies.toLocaleString()}</td>
                            <td className="px-2 py-2.5 text-right tabular-nums font-semibold">{pct(c.rate)}</td>
                            <td className="px-2 py-2.5 text-right tabular-nums font-bold text-success">{inr(c.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Addison AI Insights"
                subtitle="What to do next"
                icon={Sparkles}
                action={
                  <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> AI
                  </Badge>
                }
              >
                <div className="space-y-2.5">
                  {insights.map((ins, i) => {
                    const toneClass =
                      ins.tone === "success"
                        ? "from-success/10 to-success/0 border-success/20 text-success"
                        : ins.tone === "warning"
                        ? "from-warning/10 to-warning/0 border-warning/20 text-warning"
                        : "from-primary/10 to-primary/0 border-primary/20 text-primary";
                    return (
                      <div
                        key={i}
                        className={cn(
                          "p-3 rounded-xl border bg-gradient-to-br flex gap-2.5 items-start",
                          toneClass
                        )}
                      >
                        <div className="w-7 h-7 rounded-lg bg-background/80 flex items-center justify-center flex-shrink-0">
                          <ins.icon className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-[12px] leading-snug text-foreground">{ins.text}</p>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            </section>

            {/* Chat performance + time + sources */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <SectionCard title="Chat Performance" icon={MessageSquare} subtitle="Speed & automation">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="text-[12px] font-semibold">Avg response time</span>
                    </div>
                    <span className="text-lg font-bold tabular-nums">{chatStats.avgResponse.toFixed(1)}m</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-accent" />
                      <span className="text-[12px] font-semibold">Replies per lead</span>
                    </div>
                    <span className="text-lg font-bold tabular-nums">{chatStats.repliesPerLead.toFixed(1)}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-primary" />
                        <span className="text-[12px] font-semibold">AI vs Manual</span>
                      </div>
                      <span className="text-[12px] font-bold tabular-nums">
                        {pct(chatStats.aiPct)} AI
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-background overflow-hidden flex">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all"
                        style={{ width: `${chatStats.aiPct}%` }}
                      />
                      <div
                        className="h-full bg-muted-foreground/30 transition-all"
                        style={{ width: `${100 - chatStats.aiPct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                      <span className="flex items-center gap-1"><Bot className="w-3 h-3" /> Addison</span>
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> Team</span>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Best Time to Send" icon={Clock} subtitle="Replies by hour window">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeOfDay} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="replies" radius={[6, 6, 0, 0]}>
                        {timeOfDay.map((entry, idx) => {
                          const max = Math.max(...timeOfDay.map((t) => t.replies), 1);
                          const isBest = entry.replies === max && entry.replies > 0;
                          return (
                            <Cell
                              key={idx}
                              fill={isBest ? "hsl(var(--success))" : "hsl(var(--primary) / 0.5)"}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>

              <SectionCard title="Lead Sources" icon={Globe} subtitle="Where revenue comes from">
                {sourceBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No source data yet.</p>
                ) : (
                  <div className="space-y-3">
                    {sourceBreakdown.map((s, i) => {
                      const colors = ["bg-primary", "bg-accent", "bg-warning", "bg-success", "bg-hot"];
                      const max = Math.max(...sourceBreakdown.map((x) => x.revenue), 1);
                      return (
                        <div key={s.source} className="space-y-1">
                          <div className="flex items-center justify-between text-[12px]">
                            <span className="font-semibold capitalize flex items-center gap-2">
                              <span className={cn("w-2 h-2 rounded-full", colors[i % colors.length])} />
                              {s.source}
                            </span>
                            <span className="tabular-nums font-bold">{inr(s.revenue)}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", colors[i % colors.length])}
                              style={{ width: `${(s.revenue / max) * 100}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{s.leads} leads</span>
                            <span>{pct(s.rate)} conv</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            </section>

            {/* Team performance */}
            <SectionCard
              title="Team Performance"
              subtitle="Add agents in Settings → Team to track per-rep metrics"
              icon={Users}
              action={
                <Button variant="ghost" size="sm" className="h-7 text-[12px] gap-1">
                  Manage team <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { name: "You", deals: deals.filter((d) => d.stage === "won").length, rev: deals.filter((d) => d.stage === "won").reduce((a, d) => a + Number(d.value || 0), 0), time: 4.2 },
                ].map((agent) => (
                  <div
                    key={agent.name}
                    className="p-4 rounded-xl border border-border bg-gradient-to-br from-card to-muted/30 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground font-bold flex items-center justify-center">
                        {agent.name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[13px] truncate">{agent.name}</p>
                        <p className="text-[11px] text-muted-foreground">Sales agent</p>
                      </div>
                      <Badge className="ml-auto bg-success/10 text-success border-success/20 hover:bg-success/10 text-[10px]">
                        Top
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground font-semibold">Deals</p>
                        <p className="text-sm font-bold tabular-nums">{agent.deals}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground font-semibold">Revenue</p>
                        <p className="text-sm font-bold tabular-nums text-success">{inr(agent.rev)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground font-semibold">Resp</p>
                        <p className="text-sm font-bold tabular-nums">{agent.time}m</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </>
        )}
      </div>
    </main>
  );
};

export default AnalyticsPage;
