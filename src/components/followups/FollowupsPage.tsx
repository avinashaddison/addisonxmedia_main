import { useState, useMemo, useEffect } from "react";
import { PageShell } from "@/components/PageShell";
import {
  Bell, Clock, Phone, Send, MessageCircle, CheckCircle2, AlertCircle, Plus,
  Sparkles, Trash2, Calendar, IndianRupee, Zap, Bot, RefreshCw, TrendingUp,
  Flame, Target, ArrowUpRight, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useContactsLookup, Task } from "@/hooks/useCrmData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useForm } from "react-hook-form";
import { Database, Tables } from "@/integrations/supabase/types";
import { initialsFor } from "@/lib/inbox-types";
import { toast } from "sonner";

type Priority = Database["public"]["Enums"]["task_priority"];
type TaskWithContact = Task & { contact?: Tables<"contacts"> | null };

// ---------- helpers ----------
const priorityStyle: Record<Priority, {
  border: string; pill: string; label: string; row: string; glow: string; dot: string;
}> = {
  urgent: { border: "border-l-hot", pill: "bg-hot text-hot-foreground", label: "🔴 Urgent",
    row: "bg-gradient-to-r from-hot/[0.06] to-transparent", glow: "shadow-[0_0_0_1px_hsl(var(--hot)/0.25)]", dot: "bg-hot" },
  high:   { border: "border-l-warning", pill: "bg-warning text-warning-foreground", label: "🟡 High",
    row: "bg-gradient-to-r from-warning/[0.05] to-transparent", glow: "", dot: "bg-warning" },
  medium: { border: "border-l-accent", pill: "bg-accent text-accent-foreground", label: "🔵 Medium",
    row: "", glow: "", dot: "bg-accent" },
  low:    { border: "border-l-muted-foreground/30", pill: "bg-muted text-muted-foreground", label: "⚪ Low",
    row: "", glow: "", dot: "bg-muted-foreground/40" },
};

// Deterministic deal value pseudo-random based on task id
const dealValueFor = (t: TaskWithContact): number => {
  const seed = (t.id || "x").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const tier = t.priority === "urgent" ? 25000 : t.priority === "high" ? 15000 : t.priority === "medium" ? 8000 : 3500;
  return tier + (seed % 50) * 180;
};

const aiInsightFor = (t: TaskWithContact, due: { overdue: boolean; minsLeft: number }) => {
  if (due.overdue) return { label: "Going cold — reply now", tone: "hot" as const };
  if (t.priority === "urgent") return { label: "High chance to close", tone: "success" as const };
  if (due.minsLeft < 120) return { label: "Needs quick reply", tone: "warning" as const };
  if (t.priority === "high") return { label: "Warm — push for demo", tone: "accent" as const };
  return { label: "Re-engage softly", tone: "muted" as const };
};

const insightTone: Record<string, string> = {
  hot: "bg-hot-soft text-hot border-hot/20",
  success: "bg-success-soft text-success border-success/20",
  warning: "bg-warning-soft text-warning border-warning/20",
  accent: "bg-accent-soft text-accent border-accent/20",
  muted: "bg-muted text-muted-foreground border-border",
};

// ---------- live countdown hook ----------
const useTick = (ms = 30_000) => {
  const [, setT] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setT((x) => x + 1), ms);
    return () => clearInterval(i);
  }, [ms]);
};

const computeDue = (iso: string | null) => {
  if (!iso) return { text: "No due date", overdue: false, minsLeft: Infinity };
  const due = new Date(iso).getTime();
  const diff = due - Date.now();
  const minutes = Math.round(diff / 60000);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  if (diff < 0) {
    if (minutes > -60) return { text: `Overdue by ${-minutes}m`, overdue: true, minsLeft: minutes };
    if (hours > -24) return { text: `Overdue by ${-hours}h`, overdue: true, minsLeft: minutes };
    return { text: `Overdue by ${-days}d`, overdue: true, minsLeft: minutes };
  }
  if (minutes < 60) return { text: `Due in ${minutes}m`, overdue: false, minsLeft: minutes };
  if (hours < 24) return { text: `Due in ${hours}h`, overdue: false, minsLeft: minutes };
  return { text: `Due in ${days}d`, overdue: false, minsLeft: minutes };
};

// Animated counter
const useCount = (target: number, duration = 700) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
};

const formatINR = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${n}`;

// ============================================================
// MAIN PAGE
// ============================================================
export const FollowupsPage = () => {
  useTick(30_000); // live countdown ticks
  const { data: tasks = [], isLoading } = useTasks();
  const [autoMode, setAutoMode] = useState(false);
  const [groupBy, setGroupBy] = useState<"urgency" | "value" | "probability">("urgency");

  const enriched = useMemo(
    () => tasks.map((t) => ({ ...t, _value: dealValueFor(t), _due: computeDue(t.due_at) })),
    [tasks]
  );

  const pending = enriched.filter((t) => t.status === "pending");
  const overdue = pending.filter((t) => t._due.overdue);
  const today = pending.filter((t) => {
    if (!t.due_at || t._due.overdue) return false;
    const d = new Date(t.due_at);
    return d.toDateString() === new Date().toDateString();
  });
  const upcoming = pending.filter((t) => !overdue.includes(t) && !today.includes(t));
  const completed = enriched.filter((t) => t.status === "completed");
  const completedToday = completed.filter(
    (t) => t.completed_at && new Date(t.completed_at).toDateString() === new Date().toDateString()
  );

  // Smart metrics
  const atRiskRevenue = [...overdue, ...today].reduce((s, t) => s + t._value, 0);
  const readyToClose = pending.filter((t) => t.priority === "urgent" || t.priority === "high").length;
  const totalToday = completedToday.length + overdue.length + today.length;
  const progressPct = totalToday ? Math.round((completedToday.length / totalToday) * 100) : 0;

  // Animated values
  const aOver = useCount(overdue.length);
  const aToday = useCount(today.length);
  const aUp = useCount(upcoming.length);
  const aDone = useCount(completed.length);
  const aRisk = useCount(atRiskRevenue);
  const aReady = useCount(readyToClose);

  // Smart grouping
  const sortedPending = useMemo(() => {
    const arr = [...pending];
    if (groupBy === "value") arr.sort((a, b) => b._value - a._value);
    else if (groupBy === "probability") {
      const score = (p: Priority) => ({ urgent: 4, high: 3, medium: 2, low: 1 }[p]);
      arr.sort((a, b) => score(b.priority) - score(a.priority));
    } else {
      arr.sort((a, b) => (a._due.minsLeft ?? 0) - (b._due.minsLeft ?? 0));
    }
    return arr;
  }, [pending, groupBy]);

  // AI recommendations
  const recommendations = useMemo(() => {
    const recs: { icon: any; text: string; tone: string; cta: string }[] = [];
    const topOverdue = overdue.sort((a, b) => b._value - a._value)[0];
    if (topOverdue) {
      recs.push({
        icon: Flame,
        text: `Follow up with ${topOverdue.contact?.name ?? "lead"} now → high intent (${formatINR(topOverdue._value)})`,
        tone: "hot",
        cta: "Reply now",
      });
    }
    const goingCold = pending.filter((t) => !t._due.overdue && t._due.minsLeft < 60).length;
    if (goingCold > 0) {
      recs.push({
        icon: Clock,
        text: `${goingCold} lead${goingCold > 1 ? "s" : ""} will go cold in under 1 hour`,
        tone: "warning",
        cta: "Send nudges",
      });
    }
    const topToday = today.sort((a, b) => b._value - a._value)[0];
    if (topToday) {
      recs.push({
        icon: Send,
        text: `Send reminder to ${topToday.contact?.name ?? "lead"} — ${formatINR(topToday._value)} on the line`,
        tone: "accent",
        cta: "Open chat",
      });
    }
    if (recs.length === 0 && pending.length > 0) {
      recs.push({
        icon: Sparkles,
        text: `Best time to follow up: 7:00–9:00 PM (highest reply rate today)`,
        tone: "accent",
        cta: "Schedule",
      });
    }
    return recs.slice(0, 3);
  }, [overdue, today, pending]);

  return (
    <PageShell
      title="Follow-ups"
      subtitle="Every overdue task is money on the table"
      icon={<Bell className="w-4 h-4" />}
      actions={
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 px-3 h-9 rounded-lg border border-border bg-card">
            <Bot className={cn("w-4 h-4 transition-colors", autoMode ? "text-success" : "text-muted-foreground")} />
            <span className="text-[12px] font-semibold">AI Auto Follow-ups</span>
            <Switch
              checked={autoMode}
              onCheckedChange={(v) => {
                setAutoMode(v);
                toast.success(v ? "AI will now nudge leads automatically" : "Auto follow-ups disabled");
              }}
            />
          </div>
          <NewTaskDialog />
        </div>
      }
    >
      {/* ============ TOP METRICS ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-5">
        <MetricCard label="Overdue" value={aOver} icon={<AlertCircle className="w-4 h-4" />} accent="hot" pulse={overdue.length > 0} sub={overdue.length ? "Act now" : "All clear"} />
        <MetricCard label="Today" value={aToday} icon={<Clock className="w-4 h-4" />} accent="warning" sub="Due today" />
        <MetricCard label="Upcoming" value={aUp} icon={<Calendar className="w-4 h-4" />} accent="accent" sub="Scheduled" />
        <MetricCard label="Completed" value={aDone} icon={<CheckCircle2 className="w-4 h-4" />} accent="success" sub={`${completedToday.length} today`} />
        <MetricCard label="At Risk Revenue" valueText={formatINR(aRisk)} icon={<IndianRupee className="w-4 h-4" />} accent="hot" highlight sub="Overdue + today" />
        <MetricCard label="Ready to Close" value={aReady} icon={<Zap className="w-4 h-4" />} accent="success" highlight sub="High intent leads" />
      </div>

      {/* ============ PROGRESS TRACKER ============ */}
      {totalToday > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-[13px] font-bold">Today's progress</span>
              <span className="text-[12px] text-muted-foreground">
                {completedToday.length}/{totalToday} follow-ups completed
              </span>
            </div>
            <span className="text-[12px] font-bold text-primary tabular-nums">{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>
      )}

      {/* ============ AI RECOMMENDATIONS ============ */}
      {recommendations.length > 0 && (
        <div className="relative bg-gradient-to-br from-primary-soft via-card to-accent-soft border border-primary/20 rounded-xl p-4 mb-5 overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="text-[12px] font-bold uppercase tracking-wider">Addison AI Recommendations</span>
              <span className="ml-auto text-[10px] text-muted-foreground">Live</span>
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-75" />
                <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-success" />
              </span>
            </div>
            <div className="grid sm:grid-cols-3 gap-2">
              {recommendations.map((r, i) => {
                const Icon = r.icon;
                return (
                  <button
                    key={i}
                    className={cn(
                      "group text-left rounded-lg border p-3 hover:shadow-md hover:-translate-y-0.5 transition-all bg-card",
                      insightTone[r.tone]
                    )}
                  >
                    <Icon className="w-4 h-4 mb-1.5" />
                    <p className="text-[12px] font-semibold leading-tight mb-2">{r.text}</p>
                    <span className="text-[11px] inline-flex items-center gap-1 font-bold opacity-90 group-hover:opacity-100">
                      {r.cta} <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============ GROUPING TOOLBAR ============ */}
      {pending.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mr-1">Sort by</span>
          {([
            { id: "urgency", label: "Urgency", icon: Flame },
            { id: "value", label: "Deal value", icon: IndianRupee },
            { id: "probability", label: "Closing probability", icon: TrendingUp },
          ] as const).map((g) => {
            const Icon = g.icon;
            const active = groupBy === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setGroupBy(g.id)}
                className={cn(
                  "h-7 px-2.5 rounded-md text-[11px] font-semibold inline-flex items-center gap-1.5 border transition-all",
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border hover:border-primary/40 text-foreground"
                )}
              >
                <Icon className="w-3 h-3" />
                {g.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ============ STATES ============ */}
      {isLoading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && tasks.length === 0 && <EmptyAllDone hasNothing />}
      {!isLoading && tasks.length > 0 && pending.length === 0 && <EmptyAllDone />}

      {/* ============ LISTS ============ */}
      {groupBy === "urgency" ? (
        <>
          {overdue.length > 0 && (
            <Section title="Overdue" count={overdue.length} pulse subtitle="Replying now = 3× higher conversion">
              {overdue.sort((a, b) => a._due.minsLeft - b._due.minsLeft).map((t) => <TaskRow key={t.id} task={t} />)}
            </Section>
          )}
          {today.length > 0 && (
            <Section title="Today" count={today.length} subtitle="Close them before EOD">
              {today.sort((a, b) => a._due.minsLeft - b._due.minsLeft).map((t) => <TaskRow key={t.id} task={t} />)}
            </Section>
          )}
          {upcoming.length > 0 && (
            <Section title="Upcoming" count={upcoming.length}>
              {upcoming.map((t) => <TaskRow key={t.id} task={t} />)}
            </Section>
          )}
        </>
      ) : (
        sortedPending.length > 0 && (
          <Section title={groupBy === "value" ? "By deal value" : "By closing probability"} count={sortedPending.length}>
            {sortedPending.map((t) => <TaskRow key={t.id} task={t} />)}
          </Section>
        )
      )}

      {completed.length > 0 && (
        <Section title="Completed" count={completed.length}>
          {completed.slice(0, 5).map((t) => <TaskRow key={t.id} task={t} />)}
        </Section>
      )}
    </PageShell>
  );
};

// ============================================================
// SECTION
// ============================================================
const Section = ({
  title, count, pulse, subtitle, children,
}: { title: string; count: number; pulse?: boolean; subtitle?: string; children: React.ReactNode }) => (
  <div className="mb-5">
    <div className="flex items-center justify-between mb-2">
      <h3 className={cn("text-[12px] font-bold uppercase tracking-wider flex items-center gap-1.5", pulse ? "text-hot" : "text-muted-foreground")}>
        {pulse && (
          <span className="relative flex w-2 h-2">
            <span className="absolute inset-0 rounded-full bg-hot animate-ping opacity-75" />
            <span className="relative inline-flex rounded-full w-2 h-2 bg-hot" />
          </span>
        )}
        {title}
        <span className="ml-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">{count}</span>
      </h3>
      {subtitle && <span className="text-[11px] text-muted-foreground italic">{subtitle}</span>}
    </div>
    <div className="space-y-2">{children}</div>
  </div>
);

// ============================================================
// TASK ROW
// ============================================================
const TaskRow = ({ task: t }: { task: TaskWithContact & { _value?: number; _due?: ReturnType<typeof computeDue> } }) => {
  const update = useUpdateTask();
  const del = useDeleteTask();
  const due = t._due ?? computeDue(t.due_at);
  const value = t._value ?? dealValueFor(t);
  const style = priorityStyle[t.priority];
  const isDone = t.status === "completed";
  const initials = t.contact ? initialsFor(t.contact.name) : "?";
  const insight = aiInsightFor(t, due);

  const toggleDone = () => {
    update.mutate({
      id: t.id,
      status: isDone ? "pending" : "completed",
      completed_at: isDone ? null : new Date().toISOString(),
    });
  };

  const reschedule = () => {
    const next = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    update.mutate({ id: t.id, due_at: next });
    toast.success("Rescheduled +2 hours");
  };

  return (
    <div
      className={cn(
        "relative bg-card border border-border border-l-4 rounded-xl p-3 flex items-center gap-3 transition-all group hover:-translate-y-0.5 hover:shadow-md",
        style.border,
        style.row,
        style.glow,
        due.overdue && !isDone && "animate-[shake_4s_ease-in-out_infinite]",
        isDone && "opacity-50"
      )}
    >
      {/* Priority dot indicator */}
      {t.priority === "urgent" && !isDone && (
        <span className={cn("absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full", style.dot, "animate-pulse shadow-[0_0_8px_2px_hsl(var(--hot)/0.6)]")} />
      )}

      <button
        onClick={toggleDone}
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
          isDone ? "bg-success border-success text-success-foreground" : "border-border hover:border-primary hover:scale-110"
        )}
        title={isDone ? "Mark pending" : "Mark complete"}
      >
        {isDone && <CheckCircle2 className="w-3 h-3" />}
      </button>

      <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-muted to-card border border-border text-foreground/80 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
        {initials}
        {due.overdue && !isDone && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-hot border-2 border-card animate-pulse" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={cn("text-[13px] font-bold truncate", isDone && "line-through")}>
            {t.contact?.name ?? "Unknown lead"}
          </span>
          <span className={cn("text-[9px] font-bold uppercase px-1.5 py-0.5 rounded tracking-wider", style.pill)}>
            {style.label}
          </span>
          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-success tabular-nums">
            <IndianRupee className="w-3 h-3" />{value.toLocaleString("en-IN")}
          </span>
          {t.due_at && (
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1 tabular-nums",
              due.overdue ? "bg-hot text-hot-foreground" : due.minsLeft < 120 ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground"
            )}>
              <Clock className="w-2.5 h-2.5" />{due.text}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] text-foreground/80 truncate">{t.title}</span>
          <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border", insightTone[insight.tone])}>
            <Sparkles className="w-2.5 h-2.5" />{insight.label}
          </span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-1 flex-shrink-0 opacity-100 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity">
        {t.contact?.phone && (
          <a
            href={`https://wa.me/${t.contact.phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="w-8 h-8 rounded-lg bg-success-soft text-success hover:bg-success hover:text-success-foreground transition-colors flex items-center justify-center"
            title="Open chat"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </a>
        )}
        {t.contact?.phone && (
          <a
            href={`tel:${t.contact.phone}`}
            className="w-8 h-8 rounded-lg bg-accent-soft text-accent hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-center"
            title="Call"
          >
            <Phone className="w-3.5 h-3.5" />
          </a>
        )}
        <button
          onClick={() => toast.success(`Offer sent to ${t.contact?.name ?? "lead"}`)}
          className="w-8 h-8 rounded-lg bg-primary-soft text-primary hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
          title="Send offer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={reschedule}
          className="w-8 h-8 rounded-lg bg-muted hover:bg-warning hover:text-warning-foreground transition-colors flex items-center justify-center"
          title="Reschedule +2h"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => del.mutate(t.id)}
          className="w-8 h-8 rounded-lg bg-muted hover:bg-hot hover:text-hot-foreground transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// ============================================================
// METRIC CARD
// ============================================================
const MetricCard = ({
  label, value, valueText, icon, accent, pulse, highlight, sub,
}: {
  label: string; value?: number; valueText?: string; icon: React.ReactNode;
  accent: "primary" | "hot" | "warning" | "accent" | "success"; pulse?: boolean; highlight?: boolean; sub?: string;
}) => {
  const cls = {
    primary: "bg-primary-soft text-primary",
    hot: "bg-hot-soft text-hot",
    warning: "bg-warning-soft text-warning",
    accent: "bg-accent-soft text-accent",
    success: "bg-success-soft text-success",
  }[accent];
  const ring = highlight
    ? accent === "hot"
      ? "ring-1 ring-hot/30"
      : accent === "success"
      ? "ring-1 ring-success/30"
      : ""
    : "";
  return (
    <div className={cn("relative bg-card border border-border rounded-xl p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md", ring)}>
      <div className="flex items-center justify-between mb-1.5">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center relative", cls)}>
          {icon}
          {pulse && (value ?? 0) > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-hot rounded-full animate-ping" />
          )}
        </div>
      </div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="text-[20px] font-bold tabular-nums leading-tight mt-0.5">
        {valueText ?? value}
      </p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
};

// ============================================================
// EMPTY STATE
// ============================================================
const EmptyAllDone = ({ hasNothing }: { hasNothing?: boolean }) => (
  <div className="bg-gradient-to-br from-success-soft via-card to-primary-soft border border-success/20 rounded-2xl p-10 text-center">
    <div className="text-5xl mb-3">{hasNothing ? "📋" : "🎉"}</div>
    <p className="text-[16px] font-bold mb-1">
      {hasNothing ? "No follow-ups yet" : "All follow-ups done!"}
    </p>
    <p className="text-[12px] text-muted-foreground mb-5 max-w-sm mx-auto">
      {hasNothing
        ? "Add your first follow-up and never let a hot lead go cold."
        : "Inbox zero feels great. Want to keep the momentum going? Re-engage cold leads with a smart broadcast."}
    </p>
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {!hasNothing && (
        <Button variant="outline" size="sm" className="gap-1.5">
          <Flame className="w-3.5 h-3.5" /> Re-engage cold leads
        </Button>
      )}
      <NewTaskDialog />
    </div>
  </div>
);

// ============================================================
// NEW TASK DIALOG
// ============================================================
type FormValues = {
  title: string;
  notes?: string;
  due_at?: string;
  priority: Priority;
  contact_id?: string;
};

const NewTaskDialog = () => {
  const [open, setOpen] = useState(false);
  const create = useCreateTask();
  const { data: contacts = [] } = useContactsLookup();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { priority: "medium" },
  });

  const onSubmit = (v: FormValues) => {
    create.mutate(
      {
        title: v.title,
        notes: v.notes || null,
        due_at: v.due_at ? new Date(v.due_at).toISOString() : null,
        priority: v.priority,
        contact_id: v.contact_id || null,
        status: "pending",
      },
      { onSuccess: () => { setOpen(false); reset(); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-md">
          <Plus className="w-3.5 h-3.5" />New Follow-up
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add follow-up</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ttitle">Task *</Label>
            <Input id="ttitle" {...register("title", { required: true })} placeholder="Send pricing PDF" />
            {errors.title && <p className="text-[11px] text-destructive">Required</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tnotes">Notes</Label>
            <Textarea id="tnotes" {...register("notes")} rows={2} placeholder="Context, what was promised…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tprio">Priority</Label>
              <select id="tprio" {...register("priority")} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="urgent">🔴 Urgent</option>
                <option value="high">🟡 High</option>
                <option value="medium">🔵 Medium</option>
                <option value="low">⚪ Low</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tdue">Due</Label>
              <Input id="tdue" type="datetime-local" {...register("due_at")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tcontact">Contact (optional)</Label>
            <select id="tcontact" {...register("contact_id")} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">— None —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? "Saving…" : "Add"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
