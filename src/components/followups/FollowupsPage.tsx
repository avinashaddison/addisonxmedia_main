import { useState, useMemo } from "react";
import { PageShell } from "@/components/PageShell";
import { Bell, Clock, Phone, Send, MessageCircle, CheckCircle2, AlertCircle, Plus, Sparkles, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useContactsLookup, Task } from "@/hooks/useCrmData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { Database, Tables } from "@/integrations/supabase/types";
import { initialsFor } from "@/lib/inbox-types";

type Priority = Database["public"]["Enums"]["task_priority"];
type Status = Database["public"]["Enums"]["task_status"];

const priorityStyle: Record<Priority, { border: string; pill: string; label: string }> = {
  urgent: { border: "border-l-hot", pill: "bg-hot-soft text-hot", label: "Urgent" },
  high: { border: "border-l-warning", pill: "bg-warning-soft text-warning", label: "High" },
  medium: { border: "border-l-accent", pill: "bg-accent-soft text-accent", label: "Medium" },
  low: { border: "border-l-muted-foreground/30", pill: "bg-muted text-muted-foreground", label: "Low" },
};

const dueLabel = (iso: string | null) => {
  if (!iso) return { text: "No due date", overdue: false };
  const due = new Date(iso).getTime();
  const now = Date.now();
  const diff = due - now;
  const minutes = Math.round(diff / 60000);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  if (diff < 0) {
    if (minutes > -60) return { text: `${-minutes}m overdue`, overdue: true };
    if (hours > -24) return { text: `${-hours}h overdue`, overdue: true };
    return { text: `${-days}d overdue`, overdue: true };
  }
  if (minutes < 60) return { text: `Due in ${minutes}m`, overdue: false };
  if (hours < 24) return { text: `Due in ${hours}h`, overdue: false };
  return { text: `Due in ${days}d`, overdue: false };
};

export const FollowupsPage = () => {
  const { data: tasks = [], isLoading } = useTasks();

  const pending = tasks.filter((t) => t.status === "pending");
  const overdue = pending.filter((t) => t.due_at && new Date(t.due_at).getTime() < Date.now());
  const today = pending.filter((t) => {
    if (!t.due_at) return false;
    const d = new Date(t.due_at);
    const now = new Date();
    return d.toDateString() === now.toDateString() && d.getTime() >= Date.now();
  });
  const upcoming = pending.filter((t) => !overdue.includes(t) && !today.includes(t));
  const completed = tasks.filter((t) => t.status === "completed");

  return (
    <PageShell
      title="Follow-ups"
      subtitle="Never let a hot lead go cold"
      icon={<Bell className="w-4 h-4" />}
      actions={<NewTaskDialog />}
    >
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <SummaryCard label="Overdue" value={overdue.length} icon={<AlertCircle className="w-4 h-4" />} accent="hot" pulse={overdue.length > 0} />
        <SummaryCard label="Today" value={today.length} icon={<Clock className="w-4 h-4" />} accent="warning" />
        <SummaryCard label="Upcoming" value={upcoming.length} icon={<Calendar className="w-4 h-4" />} accent="accent" />
        <SummaryCard label="Done" value={completed.length} icon={<CheckCircle2 className="w-4 h-4" />} accent="primary" />
      </div>

      {/* AI banner */}
      {overdue.length > 0 && (
        <div className="bg-gradient-to-r from-primary-soft via-card to-warning-soft border border-primary/20 rounded-xl p-4 mb-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold">Addison AI says: You have {overdue.length} overdue follow-up{overdue.length > 1 ? "s" : ""}</p>
            <p className="text-[11px] text-muted-foreground">Replying to overdue leads now has 3× higher conversion chance.</p>
          </div>
        </div>
      )}

      {isLoading && <div className="bg-card border border-border rounded-xl p-8 text-center text-[13px] text-muted-foreground">Loading…</div>}

      {!isLoading && tasks.length === 0 && (
        <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-primary-soft mx-auto mb-3 flex items-center justify-center"><Bell className="w-5 h-5 text-primary" /></div>
          <p className="text-[14px] font-semibold mb-1">No follow-ups yet</p>
          <p className="text-[12px] text-muted-foreground">Click "New Follow-up" above to add your first reminder.</p>
        </div>
      )}

      {overdue.length > 0 && (
        <Section title="Overdue" count={overdue.length} pulse>
          {overdue.map((t) => <TaskRow key={t.id} task={t} />)}
        </Section>
      )}
      {today.length > 0 && (
        <Section title="Today" count={today.length}>
          {today.map((t) => <TaskRow key={t.id} task={t} />)}
        </Section>
      )}
      {upcoming.length > 0 && (
        <Section title="Upcoming" count={upcoming.length}>
          {upcoming.map((t) => <TaskRow key={t.id} task={t} />)}
        </Section>
      )}
      {completed.length > 0 && (
        <Section title="Completed" count={completed.length}>
          {completed.slice(0, 5).map((t) => <TaskRow key={t.id} task={t} />)}
        </Section>
      )}
    </PageShell>
  );
};

const Section = ({ title, count, pulse, children }: { title: string; count: number; pulse?: boolean; children: React.ReactNode }) => (
  <div className="mb-5">
    <h3 className={cn("text-[12px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5", pulse ? "text-hot" : "text-muted-foreground")}>
      {pulse && (
        <span className="relative flex w-2 h-2">
          <span className="absolute inset-0 rounded-full bg-hot animate-ping opacity-75" />
          <span className="relative inline-flex rounded-full w-2 h-2 bg-hot" />
        </span>
      )}
      {title} ({count})
    </h3>
    <div className="space-y-2">{children}</div>
  </div>
);

const TaskRow = ({ task: t }: { task: Task & { contact?: Tables<"contacts"> | null } }) => {
  const update = useUpdateTask();
  const del = useDeleteTask();
  const due = dueLabel(t.due_at);
  const style = priorityStyle[t.priority];
  const isDone = t.status === "completed";
  const initials = t.contact ? initialsFor(t.contact.name) : "?";

  const toggleDone = () => {
    update.mutate({ id: t.id, status: isDone ? "pending" : "completed", completed_at: isDone ? null : new Date().toISOString() });
  };

  return (
    <div className={cn("bg-card border border-border border-l-4 rounded-xl p-3 flex items-center gap-3 hover:shadow-sm transition-all group", style.border, isDone && "opacity-60")}>
      <button
        onClick={toggleDone}
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
          isDone ? "bg-success border-success text-success-foreground" : "border-border hover:border-primary"
        )}
      >
        {isDone && <CheckCircle2 className="w-3 h-3" />}
      </button>

      <div className="w-9 h-9 rounded-full bg-muted text-foreground/80 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className={cn("text-[13px] font-semibold truncate", isDone && "line-through")}>{t.title}</span>
          <span className={cn("text-[9px] font-bold uppercase px-1.5 py-0.5 rounded", style.pill)}>{style.label}</span>
          {t.due_at && (
            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", due.overdue ? "bg-hot-soft text-hot" : "bg-muted text-muted-foreground")}>
              {due.text}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground truncate">
          {t.contact?.name ?? "No contact"} {t.notes ? `· ${t.notes}` : ""}
        </p>
      </div>

      <div className="flex gap-1 flex-shrink-0">
        {t.contact?.phone && (
          <a
            href={`tel:${t.contact.phone}`}
            className="w-8 h-8 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
            title="Call"
          >
            <Phone className="w-3.5 h-3.5" />
          </a>
        )}
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

const SummaryCard = ({ label, value, icon, accent, pulse }: { label: string; value: number; icon: React.ReactNode; accent: "primary" | "hot" | "warning" | "accent"; pulse?: boolean }) => {
  const cls = {
    primary: "bg-primary-soft text-primary",
    hot: "bg-hot-soft text-hot",
    warning: "bg-warning-soft text-warning",
    accent: "bg-accent-soft text-accent",
  }[accent];
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 relative", cls)}>
        {icon}
        {pulse && value > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-hot rounded-full animate-pulse" />}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className="text-xl font-bold tabular-nums">{value}</p>
      </div>
    </div>
  );
};

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
        <Button size="sm" className="gap-2"><Plus className="w-3.5 h-3.5" />New Follow-up</Button>
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
                <option value="high">🟠 High</option>
                <option value="medium">🟡 Medium</option>
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
