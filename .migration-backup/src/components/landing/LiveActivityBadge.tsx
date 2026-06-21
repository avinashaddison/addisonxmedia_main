import { useEffect, useState } from "react";
import { Flame } from "lucide-react";

const MESSAGES = [
  "12 teams closed deals in last 10 min",
  "₹4.2L revenue captured in last 60 min",
  "187 hot leads converted today",
  "Avg reply time: 47 seconds",
  "Mehta Tutorials just closed ₹49,000",
];

export const LiveActivityBadge = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % MESSAGES.length), 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="inline-flex items-center gap-2 bg-card border border-hot/25 rounded-full pl-2 pr-3.5 py-1.5 mb-5 shadow-sm">
      <span className="relative flex w-5 h-5 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-hot/30 animate-ping" />
        <Flame className="relative w-3 h-3 text-hot fill-hot" />
      </span>
      <span className="text-[11px] font-bold text-hot uppercase tracking-wider">Live</span>
      <span className="w-px h-3 bg-border" />
      <span key={idx} className="text-[12px] font-semibold text-foreground animate-fade-in">
        🔥 {MESSAGES[idx]}
      </span>
    </div>
  );
};
