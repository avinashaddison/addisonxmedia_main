import { Sparkles, ArrowRight, Zap } from "lucide-react";

const sources = [
  { name: "Facebook Ads", value: 1247, percent: 44, color: "bg-accent" },
  { name: "Instagram", value: 624, percent: 22, color: "bg-[hsl(280_70%_60%)]" },
  { name: "Google Ads", value: 482, percent: 17, color: "bg-warning" },
  { name: "Referral", value: 312, percent: 11, color: "bg-primary" },
  { name: "Website", value: 182, percent: 6, color: "bg-muted-foreground" },
];

export const SidePanels = () => {
  return (
    <div className="space-y-4">
      {/* AI Assistant card */}
      <div className="surface p-5 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary-soft rounded-full" />
        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-accent-soft rounded-full" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold tracking-tight">Addison AI</h3>
              <div className="flex items-center gap-1.5">
                <span className="relative w-1.5 h-1.5 text-success">
                  <span className="absolute inset-0 rounded-full bg-success" />
                  <span className="absolute inset-0 rounded-full bg-success live-dot" />
                </span>
                <span className="text-[10px] font-semibold text-success uppercase tracking-wider">Active</span>
              </div>
            </div>
          </div>

          <p className="text-[12px] text-foreground leading-relaxed mb-3">
            <span className="font-semibold">5 leads</span> are ready for follow-up based on engagement.
            I can send personalized WhatsApp messages now.
          </p>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-muted/40 rounded-lg p-2 text-center">
              <p className="text-base font-bold">1,284</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Replies</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-2 text-center">
              <p className="text-base font-bold text-primary">47</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Closed</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-2 text-center">
              <p className="text-base font-bold text-warning">28</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Pending</p>
            </div>
          </div>

          <button className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-primary-glow transition-all">
            <Zap className="w-3.5 h-3.5" />
            Run AI Follow-up
          </button>
        </div>
      </div>

      {/* Lead Sources */}
      <div className="surface p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[14px] font-bold tracking-tight">Lead Sources</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">2,847 total this month</p>
          </div>
          <button className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
            Details <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* stacked bar */}
        <div className="flex h-2 rounded-full overflow-hidden mb-4">
          {sources.map((s) => (
            <div key={s.name} className={s.color} style={{ width: `${s.percent}%` }} title={s.name} />
          ))}
        </div>

        <div className="space-y-2.5">
          {sources.map((s) => (
            <div key={s.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-sm ${s.color}`} />
                <span className="text-[12px] text-foreground truncate">{s.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground tabular-nums">{s.value}</span>
                <span className="text-[11px] font-semibold text-foreground tabular-nums w-9 text-right">{s.percent}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
