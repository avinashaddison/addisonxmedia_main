import { MessageSquare, Users, CheckCircle2, IndianRupee, ArrowUpRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

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

const stats = [
  { icon: MessageSquare, label: "Total Chats", value: 1284, suffix: "", trend: 24, color: "text-primary", bg: "bg-primary-soft" },
  { icon: Users, label: "Open Conversations", value: 63, suffix: "", trend: 12, color: "text-accent", bg: "bg-accent-soft" },
  { icon: CheckCircle2, label: "Closed Deals", value: 147, suffix: "", trend: 38, color: "text-success", bg: "bg-success-soft" },
  { icon: IndianRupee, label: "Revenue", value: 847, suffix: "K", trend: 56, color: "text-warning", bg: "bg-warning-soft" },
];

const weekData = [
  { day: "Mon", leads: 34, closed: 8 },
  { day: "Tue", leads: 52, closed: 14 },
  { day: "Wed", leads: 61, closed: 12 },
  { day: "Thu", leads: 48, closed: 18 },
  { day: "Fri", leads: 73, closed: 24 },
  { day: "Sat", leads: 65, closed: 20 },
  { day: "Sun", leads: 88, closed: 30 },
];

export const DashboardPage = () => {
  const counts = stats.map((s) => useCount(s.value));
  const max = Math.max(...weekData.map((d) => d.leads));

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Overview of your WhatsApp sales performance</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {stats.map((s, i) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-center justify-between mb-3">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", s.bg)}>
                  <s.icon className={cn("w-4 h-4", s.color)} />
                </div>
                <span className="text-[10px] font-semibold text-success bg-success-soft px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" /> +{s.trend}%
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
              <p className="text-2xl font-bold tracking-tight mt-0.5">
                {s.suffix === "K" ? "₹" : ""}{counts[i].toLocaleString()}{s.suffix}
              </p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[14px] font-bold">Weekly Performance</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Leads vs closed deals</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-primary" /><span className="text-[10px] text-muted-foreground">Leads</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-accent" /><span className="text-[10px] text-muted-foreground">Closed</span></div>
              </div>
            </div>
            <div className="flex items-end justify-between gap-4 h-40">
              {weekData.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex items-end justify-center gap-[3px] h-full">
                    <div className="flex-1 max-w-[16px] bg-primary rounded-t transition-all" style={{ height: `${(d.leads / max) * 100}%` }} />
                    <div className="flex-1 max-w-[16px] bg-accent rounded-t transition-all" style={{ height: `${(d.closed / max) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Conversion */}
          <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
            <h3 className="text-[14px] font-bold mb-1">Conversion Rate</h3>
            <p className="text-[11px] text-muted-foreground mb-4">This month</p>
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--primary))" strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - 0.347)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">34.7%</span>
                  <span className="text-[10px] text-muted-foreground">conversion</span>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 text-success text-[12px] font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                +8.2% vs last month
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
