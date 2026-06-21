import { useMemo, useState } from "react";
import { UserPlus, MessageSquare, Trophy, IndianRupee, Megaphone, Bell, Filter, Download, Search, Activity as ActivityIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/inbox-types";

type EventType = "lead" | "message" | "deal" | "payment" | "broadcast" | "task";

type Event = {
  id: string;
  type: EventType;
  title: string;
  detail: string;
  actor: string;
  time: string;
  amount?: number;
  ts: number; // for grouping
};

const META: Record<EventType, { color: string; icon: typeof UserPlus; label: string }> = {
  lead: { color: "bg-primary/10 text-primary border-primary/20", icon: UserPlus, label: "New lead" },
  message: { color: "bg-accent/10 text-accent border-accent/20", icon: MessageSquare, label: "Message" },
  deal: { color: "bg-warning/10 text-warning border-warning/20", icon: Trophy, label: "Deal moved" },
  payment: { color: "bg-success/10 text-success border-success/20", icon: IndianRupee, label: "Payment" },
  broadcast: { color: "bg-hot/10 text-hot border-hot/20", icon: Megaphone, label: "Broadcast" },
  task: { color: "bg-muted text-muted-foreground border-border", icon: Bell, label: "Task" },
};

const FILTERS: { id: "all" | EventType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "lead", label: "Leads" },
  { id: "message", label: "Messages" },
  { id: "deal", label: "Deals" },
  { id: "payment", label: "Payments" },
  { id: "broadcast", label: "Broadcasts" },
  { id: "task", label: "Tasks" },
];

const groupKey = (ts: number) => {
  const diff = Date.now() - ts;
  if (diff < 86400_000) return "Today";
  if (diff < 2 * 86400_000) return "Yesterday";
  if (diff < 7 * 86400_000) return "This week";
  return "Earlier";
};

// Derive an activity feed from real workspace tables. We don't have a dedicated
// "events" table — instead we synthesize events from contacts/messages/deals/tasks/broadcasts
// timestamps, sorted desc.
const buildEvents = (data: any): Event[] => {
  if (!data) return [];
  const events: Event[] = [];

  for (const c of data.contacts ?? []) {
    if (!c.created_at) continue;
    events.push({
      id: `lead-${c.id}`,
      type: "lead",
      title: c.tag === "hot" ? "Hot lead captured 🔥" : "New lead captured",
      detail: `${c.name} · ${c.phone}`,
      actor: c.source ?? "Manual",
      time: formatRelative(c.created_at),
      ts: new Date(c.created_at).getTime(),
    });
  }

  for (const d of data.deals ?? []) {
    if (d.stage === "won" && d.closed_at) {
      events.push({
        id: `won-${d.id}`,
        type: "payment",
        title: "Deal closed-won 🏆",
        detail: `${d.title ?? "Deal"} · ₹${Number(d.value).toLocaleString("en-IN")}`,
        actor: "You",
        time: formatRelative(d.closed_at),
        amount: Number(d.value),
        ts: new Date(d.closed_at).getTime(),
      });
    } else if (d.created_at) {
      events.push({
        id: `deal-${d.id}`,
        type: "deal",
        title: `Deal in pipeline (${d.stage})`,
        detail: `${d.title ?? "Deal"} · ₹${Number(d.value).toLocaleString("en-IN")}`,
        actor: "You",
        time: formatRelative(d.created_at),
        amount: Number(d.value),
        ts: new Date(d.created_at).getTime(),
      });
    }
  }

  for (const t of data.tasks ?? []) {
    if (!t.created_at) continue;
    const overdue = t.due_at && new Date(t.due_at).getTime() < Date.now();
    events.push({
      id: `task-${t.id}`,
      type: "task",
      title: overdue ? "Follow-up overdue" : "Follow-up scheduled",
      detail: t.title,
      actor: "System",
      time: formatRelative(t.created_at),
      ts: new Date(t.created_at).getTime(),
    });
  }

  for (const b of data.campaigns ?? []) {
    if (b.status !== "draft" && b.created_at) {
      events.push({
        id: `campaign-${b.id}`,
        type: "broadcast",
        title: `Campaign ${b.status}`,
        detail: `${b.name} · ${b.sent_count ?? 0} sent`,
        actor: "You",
        time: formatRelative(b.created_at),
        ts: new Date(b.created_at).getTime(),
      });
    }
  }

  // Sort desc by timestamp
  events.sort((a, b) => b.ts - a.ts);
  return events;
};

export const ActivityPage = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | EventType>("all");
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: !!user,
    queryFn: () => api.getDashboard(),
  });

  const events = useMemo(() => buildEvents(data), [data]);

  const filtered = useMemo(() => {
    return events.filter((e) => (filter === "all" ? true : e.type === filter)).filter((e) => {
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return e.title.toLowerCase().includes(s) || e.detail.toLowerCase().includes(s) || e.actor.toLowerCase().includes(s);
    });
  }, [events, filter, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, Event[]>();
    filtered.forEach((e) => {
      const k = groupKey(e.ts);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const todayCount = events.filter((e) => groupKey(e.ts) === "Today").length;
  const revenueToday = events.filter((e) => e.type === "payment" && groupKey(e.ts) === "Today").reduce((a, e) => a + (e.amount ?? 0), 0);
  const leadsToday = events.filter((e) => e.type === "lead" && groupKey(e.ts) === "Today").length;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#FFF6E8]">
      <div className="max-w-[1100px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF6A1F] to-[#E85C12] text-white flex items-center justify-center shadow-md">
              <ActivityIcon className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-[26px] font-black tracking-tight">Activity</h1>
              <p className="text-[12px] text-foreground/70 mt-0.5 font-medium">
                Aapke sales engine ki har activity · real time mein
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Date range
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Events today" value={todayCount.toString()} icon={ActivityIcon} />
          <StatCard label="New leads today" value={leadsToday.toString()} icon={UserPlus} tone="primary" />
          <StatCard label="Revenue today" value={revenueToday > 0 ? `₹${(revenueToday / 1000).toFixed(0)}K` : "₹0"} icon={IndianRupee} tone="success" />
          <StatCard label="Total events" value={events.length.toString()} icon={Trophy} tone="warning" />
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="overflow-x-auto">
            <TabsList>
              {FILTERS.map((f) => (
                <TabsTrigger key={f.id} value={f.id}>{f.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative md:ml-auto md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search activity..." className="pl-9" />
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary-soft text-primary mx-auto flex items-center justify-center mb-3 animate-pulse">
                <ActivityIcon className="w-6 h-6" />
              </div>
              <p className="font-semibold">Loading activity…</p>
            </div>
          ) : grouped.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary-soft text-primary mx-auto flex items-center justify-center mb-3">
                <ActivityIcon className="w-6 h-6" />
              </div>
              <p className="font-semibold">{events.length === 0 ? "No activity yet" : "No activity matches your filter"}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {events.length === 0 ? "As leads come in, deals close, and tasks get scheduled, you'll see them here." : "Try a different category or clear the search."}
              </p>
            </div>
          ) : (
            grouped.map(([label, events]) => (
              <div key={label}>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-3 px-1">
                  {label} · {events.length} event{events.length === 1 ? "" : "s"}
                </p>
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="relative">
                    <div className="absolute left-[34px] top-0 bottom-0 w-px bg-border" />
                    {events.map((e, idx) => {
                      const m = META[e.type];
                      const Icon = m.icon;
                      return (
                        <div
                          key={e.id}
                          className={cn(
                            "relative flex items-start gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors",
                            idx !== events.length - 1 && "border-b border-border/40"
                          )}
                        >
                          <div className={cn("relative z-10 w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0", m.color)}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-[13.5px] leading-tight">{e.title}</p>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                                {m.label}
                              </span>
                            </div>
                            <p className="text-[12.5px] text-muted-foreground mt-0.5 truncate">{e.detail}</p>
                            <p className="text-[11px] text-muted-foreground/70 mt-1">by {e.actor}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {e.amount && (
                              <p className="text-[13px] font-bold text-success">+₹{e.amount.toLocaleString("en-IN")}</p>
                            )}
                            <p className="text-[11px] text-muted-foreground mt-0.5">{e.time}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof UserPlus;
  tone?: "primary" | "success" | "warning";
}) => (
  <div className="rounded-xl border border-border bg-card p-3.5">
    <div className="flex items-center justify-between">
      <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
      <div
        className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center",
          tone === "primary" && "bg-primary/10 text-primary",
          tone === "success" && "bg-success/10 text-success",
          tone === "warning" && "bg-warning/10 text-warning",
          !tone && "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>
    </div>
    <p className="text-2xl font-bold mt-1">{value}</p>
  </div>
);
