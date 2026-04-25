import { Workflow, Plus, Play, Pause, Sparkles, Zap, MessageSquare, Bell, Trophy } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { toast } from "sonner";

const FLOWS = [
  { name: "New lead → Welcome message", trigger: "Form submission", steps: 4, runs: 1248, status: "active", icon: MessageSquare },
  { name: "Hot lead → Notify owner", trigger: "Score > 80", steps: 2, runs: 312, status: "active", icon: Zap },
  { name: "No reply in 24h → Follow up", trigger: "Inactivity", steps: 3, runs: 567, status: "active", icon: Bell },
  { name: "Deal won → Send invoice", trigger: "Stage = Won", steps: 5, runs: 89, status: "paused", icon: Trophy },
];

export const WorkflowsPage = () => {
  return (
    <PageShell
      title="Workflows"
      subtitle="Automated journeys that run while you sleep"
      icon={<Workflow className="w-4 h-4" />}
      actions={
        <button
          onClick={() => toast.success("New workflow builder coming soon ✨")}
          className="flex items-center gap-2 bg-foreground text-background px-3.5 py-2 rounded-lg text-[12px] font-bold hover:opacity-90 transition-all shadow-md"
        >
          <Plus className="w-3.5 h-3.5" />
          New workflow
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {[
          { label: "Active workflows", value: "3", sub: "running now", color: "text-success" },
          { label: "Triggers fired", value: "2,216", sub: "this month", color: "text-primary" },
          { label: "Hours saved", value: "184h", sub: "vs manual work", color: "text-accent" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{s.label}</p>
            <p className={`text-3xl font-bold tabular-nums tracking-tight mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-bold">All workflows</h3>
            <p className="text-[11px] text-muted-foreground">Drag, drop, automate.</p>
          </div>
          <span className="text-[10px] font-bold text-primary bg-primary-soft px-2 py-1 rounded-full flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" /> AI-suggested
          </span>
        </div>
        <ul className="divide-y divide-border">
          {FLOWS.map((f) => (
            <li key={f.name} className="px-5 py-4 flex items-center gap-4 hover:bg-muted/40 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center flex-shrink-0">
                <f.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold truncate">{f.name}</p>
                <p className="text-[11px] text-muted-foreground">Trigger: {f.trigger} · {f.steps} steps · {f.runs.toLocaleString()} runs</p>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full flex items-center gap-1 ${
                f.status === "active" ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${f.status === "active" ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
                {f.status}
              </span>
              <button
                onClick={() => toast.success(f.status === "active" ? "Workflow paused" : "Workflow activated")}
                className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                title={f.status === "active" ? "Pause" : "Run"}
              >
                {f.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
};
