import { Flame, IndianRupee, MessageSquare, TrendingUp, Users, Zap, Clock, Target } from "lucide-react";

const items = [
  { icon: IndianRupee, text: "₹1.4L closed by Mehta Tutorials", color: "text-success" },
  { icon: Flame, text: "12 hot leads detected in Mumbai", color: "text-hot" },
  { icon: MessageSquare, text: "4,820 replies sent in last hour", color: "text-primary" },
  { icon: Zap, text: "AI replied in 1.8s — Pune", color: "text-accent" },
  { icon: TrendingUp, text: "FitLab conversion +312% this week", color: "text-success" },
  { icon: Users, text: "+38 new leads captured · last 5 min", color: "text-primary" },
  { icon: Target, text: "Karan paid ₹49,000 via UPI", color: "text-success" },
  { icon: Clock, text: "Median response time: 92 seconds", color: "text-accent" },
];

/**
 * Infinite horizontal ticker — gives a "live trading desk" feeling.
 * Used between hero and stats to drive urgency.
 */
export const MetricsTicker = () => {
  const row = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-border bg-foreground/[0.02] py-3">
      {/* fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />

      <div
        className="flex gap-10 whitespace-nowrap"
        style={{ animation: "ticker-scroll 45s linear infinite", width: "max-content" }}
      >
        {row.map((it, i) => (
          <div key={i} className="flex items-center gap-2 text-[13px] font-semibold">
            <span className="inline-flex w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <it.icon className={`w-3.5 h-3.5 ${it.color}`} />
            <span className="text-foreground/80">{it.text}</span>
            <span className="text-muted-foreground/40">•</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MetricsTicker;
