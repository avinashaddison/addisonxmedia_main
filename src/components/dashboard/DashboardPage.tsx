import {
  MessageSquare, Users, IndianRupee, ArrowUpRight, TrendingUp, Flame, Bell, Megaphone, Radio,
  Sparkles, Zap, Loader2, Wand2, Activity, Target, Clock, ArrowRight, CheckCircle2, Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useMemo } from "react";
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

export const DashboardPage = () => {
  const { data, isLoading } = useDashboardData();
  const qc = useQueryClient();
  const [seeding, setSeeding] = useState(false);

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

  // Build a simple 7-day revenue trend from won deals
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

  const tiles = [
    {
      icon: MessageSquare, label: "Total Contacts", value: stats.total, trend: 24, sub: "this month",
      gradient: "from-primary/10 via-primary/5 to-transparent",
      iconBg: "bg-primary text-primary-foreground",
    },
    {
      icon: Users, label: "Open Chats", value: stats.open, trend: 12, sub: "right now",
      gradient: "from-accent/10 via-accent/5 to-transparent",
      iconBg: "bg-accent text-accent-foreground",
    },
    {
      icon: Flame, label: "Hot Leads", value: stats.hot, trend: 38, sub: "ready to buy",
      gradient: "from-hot/10 via-hot/5 to-transparent",
      iconBg: "bg-hot text-hot-foreground",
    },
    {
      icon: IndianRupee, label: "Revenue Closed", value: stats.revenue, trend: 56, sub: "all time", isCurrency: true,
      gradient: "from-success/10 via-success/5 to-transparent",
      iconBg: "bg-success text-success-foreground",
    },
  ];

  // Hooks rule — call useCount the same number of times every render
  const c0 = useCount(tiles[0].value);
  const c1 = useCount(tiles[1].value);
  const c2 = useCount(tiles[2].value);
  const c3 = useCount(tiles[3].value);
  const counts = [c0, c1, c2, c3];

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

  return (
    <PageShell
      title="Dashboard"
      subtitle="Your sales performance at a glance"
      icon={<TrendingUp className="w-4 h-4" />}
      actions={
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="flex items-center gap-2 bg-foreground text-background px-3.5 py-2 rounded-lg text-[12px] font-bold hover:opacity-90 transition-all disabled:opacity-60"
        >
          {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          {seeding ? "Loading…" : "Load demo data"}
        </button>
      }
    >
      {/* Hero greeting banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-foreground via-foreground to-primary text-background p-6 lg:p-8 mb-5">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-70">{greeting}</p>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mt-1">
              You have <span className="bg-gradient-to-r from-primary-glow to-accent bg-clip-text text-transparent">{stats.hot} hot leads</span> waiting.
            </h2>
            <p className="text-[13px] opacity-80 mt-2 max-w-xl">
              {stats.open} open conversations · {stats.tasksOpen} follow-ups due · ₹{stats.revenue.toLocaleString()} closed
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-full bg-background/10 backdrop-blur border border-background/10 text-[11px] font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              AI Co-Pilot active
            </div>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="bg-gradient-to-br from-primary-soft via-card to-accent-soft border border-primary/20 rounded-2xl p-8 mb-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4">
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

      {/* Stat tiles */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        {tiles.map((s, i) => (
          <div
            key={s.label}
            className={cn(
              "relative overflow-hidden bg-card border border-border rounded-2xl p-5 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 transition-all animate-slide-up bg-gradient-to-br",
              s.gradient
            )}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm", s.iconBg)}>
                <s.icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-success bg-success-soft px-2 py-1 rounded-full flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> +{s.trend}%
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">{s.label}</p>
            <p className="text-3xl font-bold tracking-tight mt-1 tabular-nums">
              {s.isCurrency ? "₹" : ""}{counts[i].toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Main grid: Revenue trend (wide) + Conversion donut */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-5">
        {/* Revenue chart */}
        <div className="xl:col-span-8 bg-card border border-border rounded-2xl p-5 lg:p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <h3 className="text-[14px] font-bold tracking-tight">Revenue Trend</h3>
                <span className="text-[10px] font-bold text-success bg-success-soft px-1.5 py-0.5 rounded">Last 7 days</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Closed-won deals per day</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">7d Total</p>
              <p className="text-2xl font-bold tabular-nums">₹{trend.reduce((a, t) => a + t.value, 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="h-56 flex items-end gap-2 lg:gap-3 pt-4">
            {trend.map((d, i) => {
              const h = (d.value / trendMax) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="relative w-full flex-1 flex items-end">
                    <div
                      className={cn(
                        "w-full rounded-t-lg transition-all group-hover:opacity-90",
                        d.value > 0
                          ? "bg-gradient-to-t from-primary to-primary-glow shadow-md shadow-primary/20"
                          : "bg-muted"
                      )}
                      style={{ height: `${Math.max(h, 4)}%` }}
                    />
                    {d.value > 0 && (
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover:opacity-100 bg-foreground text-background px-1.5 py-0.5 rounded whitespace-nowrap transition-opacity">
                        ₹{d.value.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Conversion donut */}
        <div className="xl:col-span-4 bg-card border border-border rounded-2xl p-5 lg:p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-primary" />
            <h3 className="text-[14px] font-bold tracking-tight">Conversion</h3>
          </div>
          <p className="text-[11px] text-muted-foreground">Leads → Won</p>
          <div className="flex-1 flex flex-col items-center justify-center py-2">
            <div className="relative w-36 h-36">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke="hsl(var(--primary))" strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - 0.347)}`}
                  strokeLinecap="round"
                  className="drop-shadow-md"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold tabular-nums">34.7%</span>
                <span className="text-[10px] text-muted-foreground font-medium">conversion</span>
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
            <span className="text-[11px] text-muted-foreground font-semibold">{recent.length} of {stats.total}</span>
          </div>
          {isLoading && <p className="text-[12px] text-muted-foreground text-center py-6">Loading…</p>}
          {!isLoading && recent.length === 0 && (
            <p className="text-[12px] text-muted-foreground text-center py-6">No contacts yet — load demo data above.</p>
          )}
          <div className="space-y-1">
            {recent.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0",
                  c.tag === "hot" ? "bg-hot-soft text-hot ring-1 ring-hot/20" : c.tag === "warm" ? "bg-warning-soft text-warning ring-1 ring-warning/20" : "bg-muted text-muted-foreground"
                )}>
                  {initialsFor(c.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate">{c.name}</p>
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
              <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-warning/40 hover:shadow-sm transition-all">
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
        <div className="xl:col-span-3 bg-gradient-to-br from-primary via-primary to-primary-glow text-primary-foreground rounded-2xl p-5 lg:p-6 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary-foreground/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4" />
              <h3 className="text-[13px] font-bold uppercase tracking-wider">Quick Actions</h3>
            </div>
            <p className="text-[11px] opacity-80 mb-4">Jump into common workflows.</p>
            <div className="space-y-2">
              <ActionRow icon={<Megaphone className="w-3.5 h-3.5" />} label="Launch a campaign" />
              <ActionRow icon={<Radio className="w-3.5 h-3.5" />} label="Send a broadcast" />
              <ActionRow icon={<Bell className="w-3.5 h-3.5" />} label="Schedule follow-up" />
              <ActionRow icon={<Send className="w-3.5 h-3.5" />} label="Open inbox" />
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

const ActionRow = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="flex items-center gap-2 bg-background/10 backdrop-blur rounded-lg px-3 py-2 hover:bg-background/20 transition-colors cursor-pointer group">
    {icon}
    <span className="text-[12px] font-semibold flex-1">{label}</span>
    <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
  </div>
);
