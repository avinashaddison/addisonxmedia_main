import { PageShell } from "@/components/PageShell";
import { Bell, Clock, Phone, Send, MessageCircle, CheckCircle2, AlertCircle, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FollowUp = {
  id: string;
  contactName: string;
  initials: string;
  reason: string;
  due: string; // human label
  overdue: boolean;
  channel: "whatsapp" | "call";
  priority: "high" | "medium" | "low";
};

const sample: FollowUp[] = [
  { id: "1", contactName: "Priya Sharma", initials: "PS", reason: "Sent pricing 2h ago, no reply", due: "Due now", overdue: true, channel: "whatsapp", priority: "high" },
  { id: "2", contactName: "Rohit Verma", initials: "RV", reason: "Promised case study yesterday", due: "Due in 30m", overdue: false, channel: "whatsapp", priority: "high" },
  { id: "3", contactName: "Anjali Mehta", initials: "AM", reason: "Demo call scheduled", due: "Today, 4:00 PM", overdue: false, channel: "call", priority: "medium" },
  { id: "4", contactName: "Karan Singh", initials: "KS", reason: "Asked for WATI comparison", due: "Tomorrow", overdue: false, channel: "whatsapp", priority: "medium" },
  { id: "5", contactName: "Sneha Reddy", initials: "SR", reason: "Cold lead — re-engage", due: "In 2 days", overdue: false, channel: "whatsapp", priority: "low" },
];

const priorityClass = {
  high: "border-l-hot",
  medium: "border-l-warning",
  low: "border-l-muted-foreground/30",
};

export const FollowupsPage = () => {
  const due = sample.filter((f) => f.overdue);
  const upcoming = sample.filter((f) => !f.overdue);

  return (
    <PageShell
      title="Follow-ups"
      subtitle="Never let a hot lead go cold"
      icon={<Bell className="w-4 h-4" />}
      actions={
        <Button size="sm" className="gap-2" disabled>
          <Plus className="w-3.5 h-3.5" />
          New Follow-up
        </Button>
      }
    >
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <SummaryCard label="Overdue" value={due.length} icon={<AlertCircle className="w-4 h-4" />} accent="hot" />
        <SummaryCard label="Today" value={3} icon={<Clock className="w-4 h-4" />} accent="warning" />
        <SummaryCard label="This Week" value={sample.length} icon={<CheckCircle2 className="w-4 h-4" />} accent="primary" />
      </div>

      {/* AI suggestion banner */}
      <div className="bg-gradient-to-r from-primary-soft via-card to-warning-soft border border-primary/20 rounded-xl p-4 mb-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold">Addison AI says: Focus on Priya & Rohit first</p>
          <p className="text-[11px] text-muted-foreground">Both are hot leads with 90+ scores. A reply now has 3× higher conversion chance.</p>
        </div>
        <Button size="sm" variant="outline" disabled className="gap-1.5 flex-shrink-0">
          <Send className="w-3.5 h-3.5" />
          Auto-reply all
        </Button>
      </div>

      {/* Overdue */}
      {due.length > 0 && (
        <>
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-hot mb-2 flex items-center gap-1.5">
            <span className="relative flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-hot animate-ping opacity-75" />
              <span className="relative inline-flex rounded-full w-2 h-2 bg-hot" />
            </span>
            Overdue ({due.length})
          </h3>
          <div className="space-y-2 mb-5">
            {due.map((f) => (
              <FollowupRow key={f.id} f={f} />
            ))}
          </div>
        </>
      )}

      {/* Upcoming */}
      <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
        Upcoming ({upcoming.length})
      </h3>
      <div className="space-y-2">
        {upcoming.map((f) => (
          <FollowupRow key={f.id} f={f} />
        ))}
      </div>
    </PageShell>
  );
};

const FollowupRow = ({ f }: { f: FollowUp }) => (
  <div className={cn("bg-card border border-border border-l-4 rounded-xl p-3 flex items-center gap-3 hover:shadow-sm transition-all", priorityClass[f.priority])}>
    <div className="w-10 h-10 rounded-full bg-muted text-foreground/80 text-[12px] font-bold flex items-center justify-center flex-shrink-0">
      {f.initials}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-[13px] font-semibold truncate">{f.contactName}</span>
        <span className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded",
          f.overdue ? "bg-hot-soft text-hot" : "bg-muted text-muted-foreground"
        )}>
          {f.due}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground truncate">{f.reason}</p>
    </div>
    <div className="flex gap-1 flex-shrink-0">
      <button className="w-8 h-8 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center" title={f.channel === "call" ? "Call" : "Message"}>
        {f.channel === "call" ? <Phone className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
      </button>
      <button className="w-8 h-8 rounded-lg bg-muted hover:bg-success hover:text-success-foreground transition-colors flex items-center justify-center" title="Mark done">
        <CheckCircle2 className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

const SummaryCard = ({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent: "primary" | "hot" | "warning" }) => {
  const accentClass = {
    primary: "bg-primary-soft text-primary",
    hot: "bg-hot-soft text-hot",
    warning: "bg-warning-soft text-warning",
  }[accent];
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", accentClass)}>{icon}</div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className="text-xl font-bold tabular-nums">{value}</p>
      </div>
    </div>
  );
};
