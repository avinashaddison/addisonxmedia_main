import { Sparkles, ArrowRight, type LucideIcon } from "lucide-react";
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

const toneClasses: Record<NonNullable<NBAItem["tone"]>, string> = {
  success: "border-success/30 bg-success/5 hover:bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/5 hover:bg-warning/10 text-warning",
  danger: "border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-destructive",
  info: "border-primary/30 bg-primary-soft/40 hover:bg-primary-soft/70 text-primary",
};

type Props = {
  items: NBAItem[];
  title?: string;
  compact?: boolean;
  className?: string;
};

/**
 * Addison AI – Next Best Action panel.
 * A compact, action-driven AI suggestion strip that nudges the user toward
 * conversion. Drop it on Dashboard, Deals, Inbox / chat views.
 */
export const NextBestAction = ({
  items,
  title = "Addison AI · Next best action",
  compact = false,
  className,
}: Props) => {
  if (!items?.length) return null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-success/30 bg-gradient-to-br from-success/10 via-card to-primary-soft/40",
        compact ? "p-3" : "p-4",
        className
      )}
    >
      {/* subtle ambient glow */}
      <div className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-success/15 blur-3xl" />

      <div className="relative flex items-center gap-2 mb-2.5">
        <div className="relative w-6 h-6 rounded-lg bg-gradient-to-br from-success to-primary text-primary-foreground flex items-center justify-center shadow-sm shadow-success/30">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="absolute inset-0 rounded-lg bg-success/30 animate-ping opacity-40" />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-success">{title}</p>
      </div>

      <ul className={cn("relative grid gap-1.5", compact ? "" : "")}>
        {items.map((item) => {
          const Icon = item.icon;
          const tone = item.tone ?? "success";
          return (
            <li key={item.id}>
              <button
                onClick={item.onClick}
                className={cn(
                  "group w-full flex items-center gap-2.5 text-left rounded-xl border px-2.5 py-2 transition-all hover:-translate-y-0.5",
                  toneClasses[tone]
                )}
              >
                {Icon && (
                  <span className="w-7 h-7 rounded-lg bg-card border border-border/60 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                )}
                <span className="flex-1 min-w-0">
                  <span className="block text-[12.5px] font-bold text-foreground leading-tight truncate">
                    {item.title}
                  </span>
                  {item.hint && (
                    <span className="block text-[10.5px] text-muted-foreground mt-0.5 truncate">
                      {item.hint}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider opacity-80 group-hover:opacity-100 flex-shrink-0">
                  {item.cta ?? "Do it"}
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
