import { Users, Flame, MessageSquare, Target, IndianRupee, Clock, TrendingUp, TrendingDown, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  trend: number;
  spark: number[];
  variant?: "default" | "hot";
  iconColor?: string;
  delay?: number;
};

const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 100}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-12">
      <defs>
        <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,100 ${points} 100,100`} fill={`url(#spark-${color})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const useCount = (target: number, duration = 1200) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    let raf = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.floor(target * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
};

const StatCard = ({ icon: Icon, label, value, trend, spark, variant = "default", iconColor = "hsl(var(--primary))", delay = 0 }: StatCardProps) => {
  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  const isHot = variant === "hot";
  const positive = trend >= 0;

  return (
    <div
      onMouseMove={handleMove}
      className={cn(
        "stat-card animate-fade-in",
        isHot && "border-hot/40"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {isHot && <div className="absolute inset-0 bg-gradient-hot opacity-[0.07] pointer-events-none" />}

      <div className="flex items-start justify-between mb-4 relative">
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center relative",
            isHot ? "bg-hot/15" : "bg-primary/15"
          )}
          style={{ boxShadow: isHot ? "0 0 24px hsl(var(--hot) / 0.4)" : "0 0 24px hsl(var(--primary) / 0.3)" }}
        >
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>

        <div className={cn(
          "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg",
          positive ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
        )}>
          {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {positive ? "+" : ""}{trend}%
        </div>
      </div>

      <div className="relative">
        <p className="text-xs text-muted-foreground font-medium mb-1 tracking-wide">{label}</p>
        <p className={cn(
          "text-3xl font-extrabold tracking-tight mb-2",
          isHot && "gradient-text"
        )}>{value}</p>
      </div>

      <div className="relative -mx-2 mt-2">
        <Sparkline data={spark} color={iconColor} />
      </div>
    </div>
  );
};

export const StatsGrid = () => {
  const totalLeads = useCount(2847);
  const hotLeads = useCount(184);
  const conversations = useCount(63);
  const revenue = useCount(847250);
  const followUps = useCount(28);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      <StatCard
        icon={Users}
        label="Total Leads"
        value={totalLeads.toLocaleString()}
        trend={24.8}
        spark={[12, 18, 15, 25, 22, 30, 28, 38, 42, 48]}
        iconColor="hsl(263 90% 70%)"
        delay={0}
      />
      <StatCard
        icon={Flame}
        label="Hot Leads"
        value={hotLeads.toString()}
        trend={42.1}
        spark={[5, 8, 12, 9, 15, 18, 22, 28, 32, 38]}
        variant="hot"
        iconColor="hsl(12 100% 65%)"
        delay={80}
      />
      <StatCard
        icon={MessageSquare}
        label="Active Conversations"
        value={conversations.toString()}
        trend={12.4}
        spark={[20, 25, 22, 30, 28, 35, 32, 40, 38, 45]}
        iconColor="hsl(190 100% 60%)"
        delay={160}
      />
      <StatCard
        icon={Target}
        label="Conversion Rate"
        value="34.7%"
        trend={8.2}
        spark={[15, 20, 18, 25, 23, 28, 30, 32, 35, 34]}
        iconColor="hsl(280 100% 75%)"
        delay={240}
      />
      <StatCard
        icon={IndianRupee}
        label="Revenue Generated"
        value={`₹${(revenue / 1000).toFixed(1)}K`}
        trend={56.9}
        spark={[10, 15, 22, 28, 35, 42, 50, 58, 68, 80]}
        iconColor="hsl(142 76% 55%)"
        delay={320}
      />
      <StatCard
        icon={Clock}
        label="Pending Follow-ups"
        value={followUps.toString()}
        trend={-6.3}
        spark={[40, 35, 38, 32, 30, 28, 32, 28, 25, 28]}
        iconColor="hsl(38 100% 65%)"
        delay={400}
      />
    </div>
  );
};
