import { memo, useMemo, useState } from "react";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export type RevenuePoint = { label: string; value: number };

// Memoized so the chart's hover state (and its own re-renders) stay isolated
// from the rest of DashboardPage.
export const RevenueChart = memo(function RevenueChart({ trend }: { trend: RevenuePoint[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const trendMax = useMemo(() => Math.max(1, ...trend.map((t) => t.value)), [trend]);
  const trendTotal = useMemo(() => trend.reduce((a, t) => a + t.value, 0), [trend]);

  const chartPaths = useMemo(() => {
    const W = 600, H = 180, padX = 24, padY = 16;
    const innerW = W - padX * 2;
    const innerH = H - padY * 2;
    const points = trend.map((d, i) => {
      const x = padX + (innerW * i) / Math.max(1, trend.length - 1);
      const y = padY + innerH - (d.value / trendMax) * innerH;
      return { x, y, value: d.value, label: d.label };
    });
    if (points.length === 0) return { line: "", area: "", points: [] as typeof points, W, H };
    let line = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i], p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      line += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    const area = `${line} L ${points[points.length - 1].x} ${padY + innerH} L ${points[0].x} ${padY + innerH} Z`;
    return { line, area, points, W, H };
  }, [trend, trendMax]);

  return (
    <div className="xl:col-span-7 relative overflow-hidden bg-white border-2 border-[#FF6A1F] rounded-2xl p-5 lg:p-6 shadow-[0_5px_0_0_#B8420A]">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#FFD23F]/30 rounded-full blur-3xl pointer-events-none" />
      <div className="relative flex items-start justify-between mb-5 gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF6A1F] text-white flex items-center justify-center shadow-md">
              <Activity className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[15px] font-black tracking-tight flex items-center gap-2">
                Revenue trend
                <span className="text-[10px] font-extrabold text-[#7A4A00] bg-[#FFD23F] border border-[#E8B400] px-2 py-0.5 rounded-full">7 din</span>
              </h3>
              <p className="text-[11px] text-foreground/60 mt-0.5 font-medium">Closed-won deals · hover for details</p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-foreground/60 font-extrabold uppercase tracking-wider">Total kamai</p>
          <p className="text-3xl font-black tabular-nums text-[#FF6A1F]">
            ₹{trendTotal.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${chartPaths.W} ${chartPaths.H}`}
          className="w-full h-56"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="revArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#FF6A1F" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#FFD23F" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="revLine" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#FF6A1F" />
              <stop offset="100%" stopColor="#FFD23F" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((p) => {
            const y = 16 + (180 - 32) * p;
            return (
              <line key={p} x1="24" x2={chartPaths.W - 24} y1={y} y2={y}
                stroke="#E8B968" strokeWidth="1" strokeDasharray="2 4" opacity="0.6" />
            );
          })}
          {trendTotal > 0 && (
            <>
              <path d={chartPaths.area} fill="url(#revArea)" />
              <path d={chartPaths.line} fill="none" stroke="url(#revLine)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {chartPaths.points.map((p, i) => (
                <g key={i}>
                  <rect x={p.x - 22} y={0} width={44} height={chartPaths.H} fill="transparent" onMouseEnter={() => setHoverIdx(i)} />
                  <circle cx={p.x} cy={p.y} r={hoverIdx === i ? 6 : 4}
                    fill="white" stroke="#FF6A1F" strokeWidth="2.5" className="transition-all" />
                </g>
              ))}
            </>
          )}
          {trendTotal === 0 && (
            <text x="50%" y="50%" textAnchor="middle" className="fill-foreground/40" style={{ fontSize: 11, fontWeight: 600 }}>
              Abhi koi closed-won deal nahi
            </text>
          )}
        </svg>
        <div className="flex justify-between px-6 mt-2">
          {trend.map((d, i) => (
            <span key={i} className={cn("text-[10px] font-extrabold uppercase tracking-wider transition-colors", hoverIdx === i ? "text-[#FF6A1F]" : "text-foreground/60")}>
              {d.label}
            </span>
          ))}
        </div>
        {hoverIdx !== null && trend[hoverIdx] && trend[hoverIdx].value > 0 && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-[#0A3D24] text-white text-[11px] font-extrabold shadow-lg pointer-events-none">
            {trend[hoverIdx].label} · ₹{trend[hoverIdx].value.toLocaleString("en-IN")}
          </div>
        )}
      </div>
    </div>
  );
});
