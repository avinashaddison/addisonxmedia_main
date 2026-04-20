import { ArrowRight } from "lucide-react";

const stages = [
  { label: "Greeting", emoji: "👋", count: 847, percent: 100, color: "from-primary to-primary-glow", glow: "hsl(263 90% 65%)" },
  { label: "Qualification", emoji: "📋", count: 624, percent: 73, color: "from-primary-glow to-accent", glow: "hsl(280 100% 70%)" },
  { label: "Pitch", emoji: "💬", count: 412, percent: 49, color: "from-accent to-[hsl(190_100%_70%)]", glow: "hsl(190 100% 55%)" },
  { label: "Objections", emoji: "⚡", count: 218, percent: 26, color: "from-warning to-hot", glow: "hsl(38 100% 60%)" },
  { label: "Closing", emoji: "💰", count: 147, percent: 17, color: "from-success to-[hsl(170_80%_50%)]", glow: "hsl(142 76% 50%)" },
];

export const Pipeline = () => {
  return (
    <div className="glass-strong rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-bold tracking-tight">Sales Pipeline Flow</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Lead progression across stages</p>
        </div>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Last 7 days</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {stages.map((stage, i) => (
          <div key={stage.label} className="relative group">
            <div
              className="glass rounded-xl p-4 hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden"
              style={{
                borderColor: `${stage.glow}40`,
              }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ boxShadow: `0 0 30px ${stage.glow}50`, borderRadius: 'inherit' }}
              />
              <div className="flex items-center justify-between mb-2 relative">
                <span className="text-2xl">{stage.emoji}</span>
                <span className="text-[10px] text-muted-foreground font-mono">#{i + 1}</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium mb-1">{stage.label}</p>
              <p className="text-2xl font-extrabold tracking-tight">{stage.count}</p>

              <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${stage.color} transition-all duration-1000 rounded-full`}
                  style={{ width: `${stage.percent}%`, boxShadow: `0 0 12px ${stage.glow}` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">{stage.percent}% retention</p>
            </div>

            {/* Arrow between stages */}
            {i < stages.length - 1 && (
              <ArrowRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 z-10" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
