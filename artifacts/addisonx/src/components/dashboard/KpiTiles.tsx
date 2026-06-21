import { memo, useEffect, useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiTileData = {
  icon: LucideIcon;
  label: string;
  value: number;
  trend: number | null;
  sub: string;
  page: string;
  borderClass: string;
  shadowClass: string;
  iconBgInline: string;
  sparkColor: string;
  sparkValues: number[];
  live: boolean;
  isCurrency?: boolean;
};

const useCount = (target: number, duration = 1100) => {
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

// Each KPI tile owns its own count-up animation. Isolating it here means the
// per-frame requestAnimationFrame setState only re-renders this one tile rather
// than the whole DashboardPage tree.
export const KpiTile = memo(function KpiTile({
  tile: s,
  index: i,
  onNavigate,
}: {
  tile: KpiTileData;
  index: number;
  onNavigate?: (page: string) => void;
}) {
  const count = useCount(s.value);

  const { sparkPath, sparkArea, sparkW, sparkH } = useMemo(() => {
    const sparkW = 120, sparkH = 36;
    const max = Math.max(1, ...s.sparkValues);
    const norm = s.sparkValues.map((v: number) => v / max);
    const sparkPath = norm
      .map((v, idx) => {
        const x = (sparkW * idx) / Math.max(1, norm.length - 1);
        const y = sparkH - 2 - v * (sparkH - 4);
        return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
    const sparkArea = norm.length > 1 ? `${sparkPath} L ${sparkW} ${sparkH} L 0 ${sparkH} Z` : "";
    return { sparkPath, sparkArea, sparkW, sparkH };
  }, [s.sparkValues]);

  const trendDelta = s.trend;

  return (
    <button
      onClick={() => onNavigate?.(s.page)}
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 bg-white p-5 hover:-translate-y-1 transition-all duration-200 group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A1F]/40",
        s.borderClass,
        s.shadowClass
      )}
      title={`Open ${s.page}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shadow-md", s.iconBgInline)}>
          <s.icon className="w-5 h-5" strokeWidth={2.5} />
        </div>
        {trendDelta !== null && trendDelta !== undefined ? (
          <span className={cn(
            "text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-0.5 border",
            trendDelta > 0 ? "text-[#0A6E3C] bg-[#E6F7EE] border-[#0E8A4B]/30" :
            trendDelta < 0 ? "text-[#B8230C] bg-[#FCE5E0] border-[#FF6A1F]/30" :
            "text-foreground/60 bg-[#FFF1D6] border-[#E8B968]"
          )}>
            <ArrowUpRight className={cn("w-3 h-3", trendDelta < 0 && "rotate-90")} />
            {trendDelta > 0 ? "+" : ""}{trendDelta}%
          </span>
        ) : (
          <span className="text-[10px] font-extrabold text-foreground/60 bg-[#FFF1D6] border border-[#E8B968] px-2.5 py-1 rounded-full">—</span>
        )}
      </div>
      <p className="relative text-[11px] text-foreground/60 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
        {s.label}
        {s.live && (
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#0E8A4B] opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#0E8A4B]" />
          </span>
        )}
      </p>
      <p className={cn(
        "relative font-black tracking-tight mt-1 tabular-nums",
        s.label.startsWith("Revenue") ? "text-[34px] text-[#FF6A1F]" : "text-3xl text-foreground"
      )}>
        {s.isCurrency ? "₹" : ""}{count.toLocaleString("en-IN")}
      </p>
      <div className="relative flex items-end justify-between mt-2 gap-2">
        <p className="text-[11px] text-muted-foreground">{s.sub}</p>
        {s.sparkValues.some((v: number) => v > 0) ? (
          <svg width={sparkW} height={sparkH} viewBox={`0 0 ${sparkW} ${sparkH}`} className="opacity-90 overflow-visible">
            <defs>
              <linearGradient id={`spark-${i}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={s.sparkColor} stopOpacity="0.4" />
                <stop offset="100%" stopColor={s.sparkColor} stopOpacity="0" />
              </linearGradient>
            </defs>
            {sparkArea && <path d={sparkArea} fill={`url(#spark-${i})`} />}
            <path
              d={sparkPath}
              fill="none"
              stroke={s.sparkColor}
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <span className="text-[10px] text-muted-foreground">No 7-day activity</span>
        )}
      </div>
    </button>
  );
});
