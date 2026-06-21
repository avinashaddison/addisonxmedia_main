import { ReactNode } from "react";
import { Loader2, Wrench } from "lucide-react";
import { PageShell } from "@/components/PageShell";

export type ScaffoldStat = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
};

type Props = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  /** Small real-data stat cards shown above the empty state. */
  stats?: ScaffoldStat[];
  isLoading?: boolean;
  /** Headline for the empty / in-progress state. */
  emptyTitle: string;
  /** Supporting line (Hinglish microcopy). */
  emptyHint: string;
  /** Optional icon for the empty state (defaults to a wrench). */
  emptyIcon?: ReactNode;
  /** When provided (e.g. a populated table) it renders instead of the empty state. */
  children?: ReactNode;
  /** Force the empty state even if children are passed (rarely needed). */
  forceEmpty?: boolean;
};

/**
 * Shared shell for scaffolded admin modules. Renders a branded PageShell with
 * optional real-data stat cards, a "completing next" marker, and a friendly
 * empty / in-progress state. Honest scaffolding — no fake data.
 */
export const AdminScaffoldShell = ({
  title,
  subtitle,
  icon,
  actions,
  stats,
  isLoading,
  emptyTitle,
  emptyHint,
  emptyIcon,
  children,
  forceEmpty,
}: Props) => {
  const showEmpty = forceEmpty || !children;

  return (
    <PageShell title={title} subtitle={subtitle} icon={icon} actions={actions}>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* "completing next" marker */}
        <div className="flex items-center justify-between gap-3 flex-wrap rounded-2xl border-2 border-[#E8B968] bg-[#FFF1D6]/60 px-4 py-3 shadow-[0_3px_0_0_#E8B968]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-white border border-[#E8B968] flex items-center justify-center flex-shrink-0">
              <Wrench className="w-4 h-4 text-[#B8651A]" strokeWidth={2.4} />
            </span>
            <p className="text-[12px] font-bold text-[#7A4A00] leading-tight">
              Yeh module abhi taiyaar ho raha hai — live data jald aa raha hai.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF6A1F] text-white text-[10px] font-extrabold uppercase tracking-wider flex-shrink-0">
            Completing next
          </span>
        </div>

        {/* Real-data stat cards */}
        {stats && stats.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="bg-white border-2 border-[#E8B968] rounded-2xl p-4 shadow-[0_4px_0_0_#E8B968]"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A]">{s.label}</p>
                  {s.icon && <span className="text-[#FF6A1F]">{s.icon}</span>}
                </div>
                <p className="text-[24px] font-black tracking-tight text-slate-850 mt-1.5 tabular-nums">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-[#0E8A4B]" /> : s.value}
                </p>
                {s.hint && <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{s.hint}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Body: loading → spinner, data → children, else empty state */}
        {isLoading && (!stats || stats.length === 0) ? (
          <div className="bg-white border-2 border-[#E8B968] rounded-2xl px-6 py-16 text-center shadow-[0_4px_0_0_#E8B968]">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0E8A4B]" />
          </div>
        ) : showEmpty ? (
          <div className="bg-white border-2 border-[#E8B968] rounded-2xl px-6 py-16 text-center shadow-[0_4px_0_0_#E8B968]">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#FFF1D6] border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] flex items-center justify-center">
              {emptyIcon ?? <Wrench className="w-7 h-7 text-[#FF6A1F]" strokeWidth={2.2} />}
            </div>
            <h2 className="text-[16px] font-black tracking-tight text-slate-850">{emptyTitle}</h2>
            <p className="text-[12.5px] font-semibold text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
              {emptyHint}
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    </PageShell>
  );
};

export default AdminScaffoldShell;
