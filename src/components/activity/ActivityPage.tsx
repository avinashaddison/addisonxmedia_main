import { useMemo, useState } from "react";
import { UserPlus, MessageSquare, Trophy, IndianRupee, Megaphone, Bell, Filter, Download, Search, Activity as ActivityIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

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

const now = Date.now();
const min = (m: number) => now - m * 60_000;
const hr = (h: number) => now - h * 3600_000;
const day = (d: number) => now - d * 86400_000;

const SEED: Event[] = [
  { id: "e1", type: "payment", title: "Payment received", detail: "Karan Mehta paid ₹49,000 — Growth Plan", actor: "Razorpay", time: "2m ago", amount: 49000, ts: min(2) },
  { id: "e2", type: "lead", title: "New lead captured", detail: "Riya Kapoor via Instagram Ads", actor: "AI Auto-capture", time: "8m ago", ts: min(8) },
  { id: "e3", type: "message", title: "AI replied", detail: "Sent pricing card to Aman Gupta", actor: "Addison AI", time: "14m ago", ts: min(14) },
  { id: "e4", type: "deal", title: "Deal moved → Closing", detail: "Bansal Group · ₹2.4L", actor: "Priya Sharma", time: "32m ago", amount: 240000, ts: min(32) },
  { id: "e5", type: "broadcast", title: "Broadcast sent", detail: "Festive Offer · 412 recipients", actor: "Karan Mehta", time: "1h ago", ts: hr(1) },
  { id: "e6", type: "lead", title: "New lead captured", detail: "Vikas Singh via WhatsApp form", actor: "Webhook", time: "2h ago", ts: hr(2) },
  { id: "e7", type: "deal", title: "Deal won 🏆", detail: "Sehgal Realty · ₹1.85L", actor: "Ananya Iyer", time: "3h ago", amount: 185000, ts: hr(3) },
  { id: "e8", type: "task", title: "Follow-up overdue", detail: "Call back Manish Tyagi", actor: "System", time: "4h ago", ts: hr(4) },
  { id: "e9", type: "message", title: "Inbound message", detail: "Pooja Rao: \"Can you share the demo link?\"", actor: "WhatsApp", time: "5h ago", ts: hr(5) },
  { id: "e10", type: "payment", title: "Payment received", detail: "Sehgal Realty paid ₹1,85,000", actor: "Razorpay", time: "Yesterday · 6:14 PM", amount: 185000, ts: day(1) },
  { id: "e11", type: "lead", title: "New lead captured", detail: "Aditya Khanna via Meta Ads", actor: "AI Auto-capture", time: "Yesterday · 4:02 PM", ts: day(1) + 7200_000 },
  { id: "e12", type: "broadcast", title: "Broadcast sent", detail: "Reactivation campaign · 187 recipients", actor: "Priya Sharma", time: "Yesterday · 11:28 AM", ts: day(1) + 12 * 3600_000 },
  { id: "e13", type: "deal", title: "Deal moved → Negotiation", detail: "Vikram Holdings · ₹3.2L", actor: "Rahul Verma", time: "2 days ago", amount: 320000, ts: day(2) },
];

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
  const diff = now - ts;
  if (diff < 86400_000) return "Today";
  if (diff < 2 * 86400_000) return "Yesterday";
  if (diff < 7 * 86400_000) return "This week";
  return "Earlier";
};

export const ActivityPage = () => {
  const [filter, setFilter] = useState<"all" | EventType>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return SEED.filter((e) => (filter === "all" ? true : e.type === filter)).filter((e) => {
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return e.title.toLowerCase().includes(s) || e.detail.toLowerCase().includes(s) || e.actor.toLowerCase().includes(s);
    });
  }, [filter, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, Event[]>();
    filtered.forEach((e) => {
      const k = groupKey(e.ts);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const todayCount = SEED.filter((e) => groupKey(e.ts) === "Today").length;
  const revenueToday = SEED.filter((e) => e.type === "payment" && groupKey(e.ts) === "Today").reduce((a, e) => a + (e.amount ?? 0), 0);
  const leadsToday = SEED.filter((e) => e.type === "lead" && groupKey(e.ts) === "Today").length;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-muted/20">
      <div className="max-w-[1100px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight">Activity</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Every event happening across your sales engine — in real time
            </p>
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
          <StatCard label="New leads" value={leadsToday.toString()} icon={UserPlus} tone="primary" />
          <StatCard label="Revenue today" value={`₹${(revenueToday / 1000).toFixed(0)}K`} icon={IndianRupee} tone="success" />
          <StatCard label="System uptime" value="99.98%" icon={Trophy} tone="warning" />
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
          {grouped.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary-soft text-primary mx-auto flex items-center justify-center mb-3">
                <ActivityIcon className="w-6 h-6" />
              </div>
              <p className="font-semibold">No activity matches your filter</p>
              <p className="text-sm text-muted-foreground mt-1">Try a different category or clear the search.</p>
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
