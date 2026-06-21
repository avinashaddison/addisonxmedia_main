import { ArrowRight, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type NBAItem = {
  id: string;
  title: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: "success" | "warning" | "danger" | "info";
  onClick?: () => void;
  cta?: string;
};

type Props = {
  items: NBAItem[];
  title?: string;
  compact?: boolean;
  className?: string;
};

const TONE_CLASSES: Record<NonNullable<NBAItem["tone"]>, string> = {
  success: "bg-success-soft text-success border-success/20",
  warning: "bg-warning-soft text-warning border-warning/20",
  danger: "bg-hot-soft text-hot border-hot/30",
  info: "bg-accent-soft text-accent border-accent/20",
};

/**
 * Compact AI-suggestion strip — ranks 1-3 next best actions for the current view.
 * Used on the inbox lead panel; can drop on dashboard or deal detail too.
 */
export const NextBestAction = ({
  items,
  title = "Next best action",
  compact = false,
  className,
}: Props) => {
  if (!items || items.length === 0) return null;

  return (
    <div className={cn("rounded-xl border border-border bg-card overflow-hidden", className)}>
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-muted/30">
        <Sparkles className="w-3 h-3 text-primary" />
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </p>
      </div>
      <ul className="divide-y divide-border">
        {items.map((item) => {
          const Icon = item.icon;
          const tone = item.tone ?? "info";
          return (
            <li key={item.id}>
              <button
                onClick={item.onClick}
                disabled={!item.onClick}
                className={cn(
                  "w-full text-left flex items-start gap-2.5 transition-colors hover:bg-muted/40 disabled:opacity-60 disabled:cursor-not-allowed",
                  compact ? "px-3 py-2.5" : "px-3.5 py-3"
                )}
              >
                {Icon && (
                  <div className={cn(
                    "rounded-lg flex items-center justify-center flex-shrink-0 border",
                    compact ? "w-7 h-7" : "w-8 h-8",
                    TONE_CLASSES[tone]
                  )}>
                    <Icon className={cn(compact ? "w-3.5 h-3.5" : "w-4 h-4")} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn("font-bold leading-tight", compact ? "text-[12px]" : "text-[13px]")}>
                    {item.title}
                  </p>
                  {item.hint && (
                    <p className={cn("text-muted-foreground mt-0.5 leading-snug", compact ? "text-[10px]" : "text-[11px]")}>
                      {item.hint}
                    </p>
                  )}
                </div>
                {item.cta && (
                  <span className={cn(
                    "flex-shrink-0 font-bold flex items-center gap-1 text-primary transition-all group-hover:gap-1.5",
                    compact ? "text-[10px]" : "text-[11px]"
                  )}>
                    {item.cta}
                    <ArrowRight className={cn(compact ? "w-2.5 h-2.5" : "w-3 h-3")} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
