import { Users, Flame, Target, IndianRupee, ArrowUpRight, ArrowDownRight, LucideIcon, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type Props = {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  trend: number;
  iconBg: string;
  iconColor: string;
  delay?: number;
};

const useCount = (target: number, duration = 1000) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    let raf = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
};

const StatCard = ({ icon: Icon, label, value, sub, trend, iconBg, iconColor, delay = 0 }: Props) => {
  const positive = trend >= 0;
  return (
    <div className="surface surface-hover p-4 animate-slide-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", iconBg)}>
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
        </div>
        <span className={cn("chip text-[10px]", positive ? "bg-success-soft text-success" : "bg-hot-soft text-hot")}>
          {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {positive ? "+" : ""}{trend}%
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold tracking-tight text-foreground mt-0.5 leading-none">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1.5">{sub}</p>
    </div>
  );
};

export const StatsGrid = () => {
  const total = useCount(2847);
  const hot = useCount(184);
  const rev = useCount(847);

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
      <StatCard icon={Users} label="Total Leads" value={total.toLocaleString()} sub="324 new this week" trend={24.8} iconBg="bg-primary-soft" iconColor="hsl(142 70% 38%)" delay={0} />
      <StatCard icon={Flame} label="Hot Leads" value={hot.toString()} sub="Score 80+ · ready" trend={42.1} iconBg="bg-hot-soft" iconColor="hsl(0 84% 60%)" delay={60} />
      <StatCard icon={Target} label="Conversion" value="34.7%" sub="Above avg (28%)" trend={8.2} iconBg="bg-accent-soft" iconColor="hsl(217 91% 60%)" delay={120} />
      <StatCard icon={IndianRupee} label="Revenue" value={`₹${rev.toLocaleString()}K`} sub="₹312K from new leads" trend={56.9} iconBg="bg-warning-soft" iconColor="hsl(38 92% 50%)" delay={180} />
    </div>
  );
};
