import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Shared brand palette for charts (orange, green, yellow, blue, pink, purple).
export const CHART_COLORS = ["#FF6A1F", "#0E8A4B", "#FFD23F", "#3C50E0", "#D4308E", "#7C3AED", "#B8651A"];

export const PRESETS = [
  { id: "7d", label: "7D", days: 7 },
  { id: "30d", label: "30D", days: 30 },
  { id: "90d", label: "90D", days: 90 },
  { id: "1y", label: "1Y", days: 365 },
] as const;

export type RangeParams = { from: string; to: string };

export function useDateRange(defaultPreset = "90d") {
  const [preset, setPreset] = useState<string>(defaultPreset);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const params: RangeParams = useMemo(() => {
    if (preset === "custom" && customFrom && customTo) {
      return { from: new Date(customFrom).toISOString(), to: new Date(`${customTo}T23:59:59`).toISOString() };
    }
    const days = PRESETS.find((p) => p.id === preset)?.days ?? 90;
    const to = new Date();
    const from = new Date(to.getTime() - days * 864e5);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [preset, customFrom, customTo]);

  return { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, params };
}

// Short axis label from a "YYYY-MM-DD" or "YYYY-MM" timeline key.
export const shortDate = (key: string): string => {
  const parts = key.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (parts.length === 3) return `${Number(parts[2])} ${months[Number(parts[1]) - 1]}`;
  if (parts.length === 2) return `${months[Number(parts[1]) - 1]} ${parts[0].slice(2)}`;
  return key;
};

type Range = ReturnType<typeof useDateRange>;

export const DateRangeBar = ({ range, onExport, exportDisabled }: { range: Range; onExport?: () => void; exportDisabled?: boolean }) => (
  <div className="bg-white border-2 border-[#E8B968] rounded-2xl p-3 mb-4 shadow-[0_3px_0_0_#E8B968] flex flex-wrap items-center gap-2">
    <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/45 mr-1">Range</span>
    {PRESETS.map((p) => (
      <button
        key={p.id}
        onClick={() => range.setPreset(p.id)}
        className={cn(
          "h-9 px-3.5 rounded-xl text-[12px] font-extrabold transition-all border-2",
          range.preset === p.id
            ? "bg-[#FF6A1F] text-white border-[#B8420A] shadow-[0_3px_0_0_#B8420A]"
            : "bg-[#FFF6E8] text-foreground border-[#E8B968] hover:bg-[#FFE8C7]",
        )}
      >
        {p.label}
      </button>
    ))}
    <div className="flex items-center gap-1.5 ml-1">
      <Input
        type="date"
        value={range.customFrom}
        onChange={(e) => { range.setCustomFrom(e.target.value); range.setPreset("custom"); }}
        className="h-9 w-[140px] text-[12px]"
      />
      <span className="text-foreground/40 text-[12px]">→</span>
      <Input
        type="date"
        value={range.customTo}
        onChange={(e) => { range.setCustomTo(e.target.value); range.setPreset("custom"); }}
        className="h-9 w-[140px] text-[12px]"
      />
    </div>
    {onExport && (
      <Button variant="outline" size="sm" className="gap-2 ml-auto" onClick={onExport} disabled={exportDisabled}>
        <Download className="w-3.5 h-3.5" /> Export CSV
      </Button>
    )}
  </div>
);

export const ReportCard = ({ label, value, color = "#FF6A1F", sub }: { label: string; value: string; color?: string; sub?: string }) => (
  <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-3.5">
    <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/55 mb-1.5">{label}</div>
    <div className="text-[22px] font-black tabular-nums leading-none" style={{ color }}>{value}</div>
    {sub && <div className="text-[11px] font-semibold text-foreground/45 mt-1">{sub}</div>}
  </div>
);

export const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-4">
    <h3 className="text-[13px] font-extrabold mb-3">{title}</h3>
    {children}
  </div>
);
