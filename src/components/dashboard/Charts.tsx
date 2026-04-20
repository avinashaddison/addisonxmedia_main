import { useMemo } from "react";

const velocityData = [12, 18, 22, 17, 28, 35, 30, 42, 48, 45, 58, 65, 70, 68];
const conversionData = [32, 45, 38, 52, 48, 60, 55, 68, 72, 78, 75, 85];

const LineChart = () => {
  const w = 600, h = 180, pad = 10;
  const max = Math.max(...velocityData);
  const points = velocityData.map((v, i) => {
    const x = pad + (i / (velocityData.length - 1)) * (w - pad * 2);
    const y = h - pad - (v / max) * (h - pad * 2);
    return [x, y];
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  const area = `${path} L ${points[points.length - 1][0]} ${h} L ${points[0][0]} ${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-44">
      <defs>
        <linearGradient id="velGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(263 90% 65%)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="hsl(263 90% 65%)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="velLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(263 90% 65%)" />
          <stop offset="50%" stopColor="hsl(280 100% 70%)" />
          <stop offset="100%" stopColor="hsl(190 100% 55%)" />
        </linearGradient>
      </defs>
      {/* grid */}
      {[0.25, 0.5, 0.75].map((p) => (
        <line key={p} x1={pad} x2={w - pad} y1={h * p} y2={h * p} stroke="hsl(var(--border))" strokeDasharray="2 4" opacity="0.4" />
      ))}
      <path d={area} fill="url(#velGrad)" />
      <path d={path} fill="none" stroke="url(#velLine)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="hsl(var(--background))" stroke="hsl(280 100% 70%)" strokeWidth="2" />
      ))}
    </svg>
  );
};

const BarChart = () => {
  const w = 600, h = 180, pad = 10;
  const max = Math.max(...conversionData);
  const bw = (w - pad * 2) / conversionData.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-44">
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(190 100% 60%)" />
          <stop offset="100%" stopColor="hsl(263 90% 65%)" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((p) => (
        <line key={p} x1={pad} x2={w - pad} y1={h * p} y2={h * p} stroke="hsl(var(--border))" strokeDasharray="2 4" opacity="0.4" />
      ))}
      {conversionData.map((v, i) => {
        const bh = (v / max) * (h - pad * 2);
        return (
          <rect
            key={i}
            x={pad + i * bw + bw * 0.15}
            y={h - pad - bh}
            width={bw * 0.7}
            height={bh}
            rx="3"
            fill="url(#barGrad)"
          />
        );
      })}
    </svg>
  );
};

export const Charts = () => {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="glass-strong rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold tracking-tight">Lead Velocity</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">New leads per day</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-extrabold gradient-text">+68%</p>
            <p className="text-[10px] text-muted-foreground">vs last week</p>
          </div>
        </div>
        <LineChart />
      </div>

      <div className="glass-strong rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold tracking-tight">Conversion Trend</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Closed deals per month</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-extrabold text-accent">85</p>
            <p className="text-[10px] text-muted-foreground">this month</p>
          </div>
        </div>
        <BarChart />
      </div>
    </div>
  );
};
