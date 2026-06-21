import { Sparkles } from "lucide-react";

type Props = {
  title: string;
  description?: string;
};

/**
 * Shared titled placeholder for menu items whose real page is built in a later
 * task. Brand-styled (saffron/emerald) and theme-neutral so it reads well both
 * inside the customer shell (saffron canvas) and the admin shell (slate canvas).
 */
export const ComingSoon = ({ title, description }: Props) => {
  return (
    <div className="flex-1 w-full min-h-full overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#FFF1D6] border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] flex items-center justify-center mb-5">
          <Sparkles className="w-7 h-7 text-[#FF6A1F]" strokeWidth={2.2} />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-foreground mb-2">{title}</h1>
        <p className="text-sm font-semibold text-foreground/55 max-w-md">
          {description ?? "This section is coming soon — we're putting the finishing touches on it."}
        </p>
        <span className="mt-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6F7EE] border border-[#0E8A4B]/30 text-[11px] font-extrabold uppercase tracking-wider text-[#0A6E3C]">
          Coming soon
        </span>
      </div>
    </div>
  );
};

export default ComingSoon;
