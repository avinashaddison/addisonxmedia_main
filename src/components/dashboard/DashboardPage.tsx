import { MessageSquare, Users, CheckCircle2, IndianRupee, ArrowUpRight, TrendingUp, Flame, Bell, Megaphone, Radio, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import { initialsFor, formatRelative } from "@/lib/inbox-types";

const useCount = (target: number, duration = 1000) => {
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
        supabase.from("conversations").select("id, status, unread_count"),
        supabase.from("messages").select("id, created_at, direction"),
        supabase.from("deals").select("id, value, stage"),
        supabase.from("tasks").select("id, status, due_at, priority, title").eq("status", "pending"),
        supabase.from("campaigns").select("id, status, sent_count, replied_count"),
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

  const stats = useMemo(() => {
    if (!data) return { total: 0, open: 0, hot: 0, revenue: 0, msgs7d: 0, tasksOpen: 0 };
    const hot = data.contacts.filter((c) => c.tag === "hot").length;
    const open = data.conversations.filter((c) => c.status === "open").length;
    const revenue = data.deals.filter((d) => d.stage === "won").reduce((a, d) => a + Number(d.value), 0);
    const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const msgs7d = data.messages.filter((m) => new Date(m.created_at).getTime() > sevenDaysAgo).length;
    return { total: data.contacts.length, open, hot, revenue, msgs7d, tasksOpen: data.tasks.length };
  }, [data]);

  const recent = (data?.contacts ?? []).slice(0, 5);
  const urgentTasks = (data?.tasks ?? [])
    .filter((t) => t.due_at && new Date(t.due_at).getTime() < Date.now() + 24 * 3600 * 1000)
    .slice(0, 4);

  const tiles = [
    { icon: MessageSquare, label: "Total Contacts", value: stats.total, trend: 24, color: "text-primary", bg: "bg-primary-soft" },
    { icon: Users, label: "Open Chats", value: stats.open, trend: 12, color: "text-accent", bg: "bg-accent-soft" },
    { icon: Flame, label: "Hot Leads", value: stats.hot, trend: 38, color: "text-hot", bg: "bg-hot-soft" },
    { icon: IndianRupee, label: "Revenue", value: stats.revenue, trend: 56, color: "text-success", bg: "bg-success-soft", isCurrency: true },
  ];
  const counts = tiles.map((t) => useCount(t.value));

  return (
    <PageShell
      title="Dashboard"
      subtitle="Your sales performance at a glance"
      icon={<TrendingUp className="w-4 h-4" />}
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {tiles.map((s, i) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/20 transition-all animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", s.bg)}>
                <s.icon className={cn("w-4 h-4", s.color)} />
              </div>
              <span className="text-[10px] font-semibold text-success bg-success-soft px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> +{s.trend}%
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
            <p className="text-2xl font-bold tracking-tight mt-0.5 tabular-nums">
              {s.isCurrency ? "₹" : ""}{counts[i].toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Activity row */}
      <div className="grid lg:grid-cols-3 gap-4 mb-5">
        {/* Conversion */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <h3 className="text-[14px] font-bold">Conversion Rate</h3>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">Leads → Won</p>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke="hsl(var(--primary))" strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - 0.347)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">34.7%</span>
                <span className="text-[10px] text-muted-foreground">conversion</span>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-success text-[12px] font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              +8.2% vs last month
            </div>
          </div>
        </div>

        {/* Recent contacts */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-bold">Recent Contacts</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Latest leads added</p>
            </div>
            <span className="text-[11px] text-muted-foreground">{recent.length} of {stats.total}</span>
          </div>
          {isLoading && <p className="text-[12px] text-muted-foreground text-center py-6">Loading…</p>}
          {!isLoading && recent.length === 0 && (
            <p className="text-[12px] text-muted-foreground text-center py-6">No contacts yet — start a conversation in the Inbox.</p>
          )}
          <div className="space-y-2">
            {recent.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0",
                  c.tag === "hot" ? "bg-hot-soft text-hot" : c.tag === "warm" ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground"
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
      </div>

      {/* Bottom row: Quick actions + urgent tasks */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-primary via-primary to-primary-glow text-primary-foreground rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4" />
            <h3 className="text-[13px] font-bold uppercase tracking-wider">Quick Actions</h3>
          </div>
          <p className="text-[12px] opacity-90 mb-4">Jump straight into common workflows.</p>
          <div className="space-y-2">
            <ActionRow icon={<Megaphone className="w-3.5 h-3.5" />} label="Launch a campaign" />
            <ActionRow icon={<Radio className="w-3.5 h-3.5" />} label="Send broadcast blast" />
            <ActionRow icon={<Bell className="w-3.5 h-3.5" />} label="Schedule follow-up" />
          </div>
        </div>

        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-bold flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-warning" />
                Urgent Follow-ups
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Due within 24 hours</p>
            </div>
            <span className="text-[11px] font-bold text-warning bg-warning-soft px-2 py-0.5 rounded-full">{urgentTasks.length} due soon</span>
          </div>
          {urgentTasks.length === 0 && (
            <p className="text-[12px] text-muted-foreground text-center py-6">🎉 You're all caught up! No urgent follow-ups.</p>
          )}
          <div className="space-y-2">
            {urgentTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-warning/30 transition-all">
                <div className={cn(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  t.priority === "urgent" ? "bg-hot animate-pulse" : t.priority === "high" ? "bg-warning" : "bg-accent"
                )} />
                <p className="flex-1 text-[12px] font-semibold truncate">{t.title}</p>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">
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

const ActionRow = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-lg px-3 py-2 hover:bg-white/20 transition-colors cursor-pointer">
    {icon}
    <span className="text-[12px] font-semibold flex-1">{label}</span>
    <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
  </div>
);
