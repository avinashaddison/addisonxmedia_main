import { Sparkles, ArrowRight, Zap, TrendingUp, Clock, CheckCircle2 } from "lucide-react";

const sources = [
  { name: "Facebook Ads", value: 1247, percent: 44, color: "bg-accent" },
  { name: "Instagram", value: 624, percent: 22, color: "bg-[hsl(280_70%_60%)]" },
  { name: "Google Ads", value: 482, percent: 17, color: "bg-warning" },
  { name: "Referral", value: 312, percent: 11, color: "bg-primary" },
  { name: "Website", value: 182, percent: 6, color: "bg-muted-foreground" },
];

const quickActions = [
  { icon: TrendingUp, label: "View reports", color: "text-accent" },
  { icon: Clock, label: "Pending follow-ups", badge: "28", color: "text-warning" },
  { icon: CheckCircle2, label: "Won this week", badge: "12", color: "text-primary" },
];

export const SidePanels = () => {
  return (
    <div className="space-y-4">
      {/* AI Assistant */}
      <div className="surface p-4 relative overflow-hidden">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-[13px] font-bold">AI Assistant</h3>
            <div className="flex items-center gap-1">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-75" />
                <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-success" />
              </span>
              <span className="text-[10px] text-success font-medium">Active</span>
            </div>
          </div>
        </div>

        <div className="bg-muted/40 rounded-lg p-3 mb-3">
          <p className="text-[12px] text-foreground leading-relaxed">
            <span className="font-semibold">5 leads</span> are ready for follow-up. I can send personalized WhatsApp messages.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {[{ v: "1,284", l: "Replies" }, { v: "47", l: "Closed" }, { v: "28", l: "Pending" }].map((s) => (
            <div key={s.l} className="bg-muted/30 rounded-md p-2 text-center">
              <p className="text-sm font-bold">{s.v}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.l}</p>
            </div>
          ))}
        </div>

        <button className="w-full h-8 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold flex items-center justify-center gap-1.5 hover:bg-primary-glow transition-all shadow-sm">
          <Zap className="w-3.5 h-3.5" />
          Run AI Follow-up
        </button>
      </div>

      {/* Quick actions */}
      <div className="surface p-4">
        <h3 className="text-[13px] font-bold mb-3">Quick Actions</h3>
        <div className="space-y-1">
          {quickActions.map((a) => (
            <button key={a.label} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors group">
              <a.icon className={`w-4 h-4 ${a.color}`} />
              <span className="flex-1 text-left text-[12px] text-foreground font-medium">{a.label}</span>
              {a.badge && <span className="chip text-[10px] bg-muted text-muted-foreground">{a.badge}</span>}
              <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>

      {/* Lead Sources */}
      <div className="surface p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-bold">Lead Sources</h3>
          <span className="text-[10px] text-muted-foreground">2,847 total</span>
        </div>

        <div className="flex h-2 rounded-full overflow-hidden mb-3">
          {sources.map((s) => (
            <div key={s.name} className={s.color} style={{ width: `${s.percent}%` }} title={s.name} />
          ))}
        </div>

        <div className="space-y-2">
          {sources.map((s) => (
            <div key={s.name} className="flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-sm flex-shrink-0 ${s.color}`} />
                <span className="text-[12px] text-foreground truncate group-hover:text-primary transition-colors">{s.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-muted-foreground tabular-nums">{s.value.toLocaleString()}</span>
                <span className="text-[11px] font-semibold text-foreground tabular-nums w-8 text-right">{s.percent}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
