import { Users, Flame, Target, IndianRupee, ArrowUpRight, ArrowDownRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type Props = {
  icon: LucideIcon;
  label: string;
  value: string;
  trend: number;
  helper: string;
  iconBg: string;
  iconColor: string;
  spark: number[];
  delay?: number;
};

const useCount = (target: number, duration = 1200) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    let raf = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
};

const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 100}`).join(" ");
  const id = `sp-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-10">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,100 ${points} 100,100`} fill={`url(#${id})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const StatCard = ({ icon: Icon, label, value, trend, helper, iconBg, iconColor, spark, delay = 0 }: Props) => {
  const positive = trend >= 0;
  return (
    <div
      className="surface surface-hover p-5 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("icon-tile", iconBg)}>
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
        <span className={cn(
          "chip",
          positive ? "bg-success-soft text-success" : "bg-hot-soft text-hot"
        )}>
          {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {positive ? "+" : ""}{trend}%
        </span>
      </div>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="text-[26px] font-bold tracking-tight text-foreground mt-1 leading-none">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1.5">{helper}</p>
      <div className="mt-3 -mx-1">
        <Sparkline data={spark} color={iconColor} />
      </div>
    </div>
  );
};

export const StatsGrid = () => {
  const total = useCount(2847);
  const hot = useCount(184);
  const conv = useCount(347);
  const rev = useCount(847);

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
      <StatCard
        icon={Users}
        label="Total Leads"
        value={total.toLocaleString()}
        trend={24.8}
        helper="324 new this week"
        iconBg="bg-primary-soft"
        iconColor="hsl(142 70% 38%)"
        spark={[12, 18, 15, 25, 22, 30, 28, 38, 42, 48]}
        delay={0}
      />
      <StatCard
        icon={Flame}
        label="Hot Leads"
        value={hot.toString()}
        trend={42.1}
        helper="Score 80+ · ready to close"
        iconBg="bg-hot-soft"
        iconColor="hsl(0 84% 60%)"
        spark={[5, 8, 12, 9, 15, 18, 22, 28, 32, 38]}
        delay={80}
      />
      <StatCard
        icon={Target}
        label="Conversion Rate"
        value={`${(conv / 10).toFixed(1)}%`}
        trend={8.2}
        helper="Above industry avg (28%)"
        iconBg="bg-accent-soft"
        iconColor="hsl(217 91% 60%)"
        spark={[15, 20, 18, 25, 23, 28, 30, 32, 35, 34]}
        delay={160}
      />
      <StatCard
        icon={IndianRupee}
        label="Revenue This Month"
        value={`₹${rev.toLocaleString()}K`}
        trend={56.9}
        helper="₹312K from new leads"
        iconBg="bg-warning-soft"
        iconColor="hsl(38 92% 50%)"
        spark={[10, 15, 22, 28, 35, 42, 50, 58, 68, 80]}
        delay={240}
      />
    </div>
  );
};
