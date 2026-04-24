import { type LucideIcon, MessageSquare, Send, CheckCircle2, CreditCard, Phone, UserPlus, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimelineEvent = {
  id: string;
  kind: "message_in" | "message_out" | "offer" | "payment" | "call" | "lead" | "task" | "note";
  title: string;
  detail?: string;
  time: string; // relative or formatted timestamp
};

const META: Record<TimelineEvent["kind"], { icon: LucideIcon; color: string; ring: string }> = {
  message_in: { icon: MessageSquare, color: "text-accent bg-accent-soft", ring: "ring-accent/30" },
  message_out: { icon: Send, color: "text-primary bg-primary-soft", ring: "ring-primary/30" },
  offer: { icon: Send, color: "text-warning bg-warning-soft", ring: "ring-warning/30" },
  payment: { icon: CreditCard, color: "text-success bg-success-soft", ring: "ring-success/30" },
  call: { icon: Phone, color: "text-success bg-success-soft", ring: "ring-success/30" },
  lead: { icon: UserPlus, color: "text-accent bg-accent-soft", ring: "ring-accent/30" },
  task: { icon: Clock, color: "text-warning bg-warning-soft", ring: "ring-warning/30" },
  note: { icon: CheckCircle2, color: "text-muted-foreground bg-muted", ring: "ring-border" },
};

type Props = {
  events: TimelineEvent[];
  className?: string;
  emptyHint?: string;
};

/**
 * Vertical activity timeline for Contact / Deal detail panels.
 * Each event = single line with icon, title, time + optional detail.
 */
export const ActivityTimeline = ({ events, className, emptyHint = "No activity yet" }: Props) => {
  if (!events.length) {
    return (
      <p className={cn("text-[11px] text-muted-foreground italic", className)}>{emptyHint}</p>
    );
  }
  return (
    <ol className={cn("relative space-y-3 pl-5 border-l border-dashed border-border", className)}>
      {events.map((e) => {
        const meta = META[e.kind];
        const Icon = meta.icon;
        return (
          <li key={e.id} className="relative">
            <span
              className={cn(
                "absolute -left-[26px] top-0 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-card",
                meta.color,
                meta.ring
              )}
            >
              <Icon className="w-2.5 h-2.5" />
            </span>
            <div className="flex items-start justify-between gap-2">
              <p className="text-[12px] font-semibold text-foreground leading-tight">{e.title}</p>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{e.time}</span>
            </div>
            {e.detail && (
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{e.detail}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
};
