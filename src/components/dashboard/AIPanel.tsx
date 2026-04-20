import { Sparkles, MessageSquareDashed, GraduationCap, Flame } from "lucide-react";

export const AIPanel = () => {
  return (
    <div className="glass-strong rounded-2xl p-5 h-full flex flex-col relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-10 w-48 h-48 bg-accent/15 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between mb-5 relative">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-primary-glow" />
          <h3 className="text-sm font-bold tracking-tight">Addison AI</h3>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/15 border border-success/30">
          <div className="relative">
            <div className="w-1.5 h-1.5 rounded-full bg-success" />
            <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-success animate-ping" />
          </div>
          <span className="text-[10px] font-bold text-success uppercase tracking-wider">Active</span>
        </div>
      </div>

      {/* AI Orb */}
      <div className="flex justify-center my-4 relative">
        <div className="relative w-28 h-28">
          <div className="absolute inset-0 rounded-full bg-gradient-primary animate-orb opacity-80 blur-lg" />
          <div className="absolute inset-2 rounded-full bg-gradient-primary animate-orb opacity-90" style={{ animationDelay: "1s" }} />
          <div className="absolute inset-6 rounded-full bg-card flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-primary-glow animate-pulse" />
          </div>
        </div>
      </div>

      {/* Mode */}
      <div className="glass rounded-xl p-3 mb-4 flex items-center justify-between border border-hot/30 relative">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-hot" />
          <span className="text-xs font-semibold">Aggressive Sales Mode</span>
        </div>
        <span className="text-base">🔥</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4 relative">
        {[
          { label: "Replies", value: "1,284" },
          { label: "Closed", value: "47" },
          { label: "Pending", value: "28" },
        ].map((s) => (
          <div key={s.label} className="bg-muted/30 rounded-xl p-2.5 text-center">
            <p className="text-base font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div className="space-y-2 mt-auto relative">
        <button className="w-full h-10 rounded-xl bg-gradient-primary text-white text-xs font-semibold flex items-center justify-center gap-2 hover:shadow-[0_0_24px_hsl(var(--primary)/0.5)] transition-all">
          <MessageSquareDashed className="w-3.5 h-3.5" />
          View Conversations
        </button>
        <button className="w-full h-10 rounded-xl glass border-border text-foreground text-xs font-semibold flex items-center justify-center gap-2 hover:border-primary/50 transition-all">
          <GraduationCap className="w-3.5 h-3.5" />
          Train AI
        </button>
      </div>
    </div>
  );
};
