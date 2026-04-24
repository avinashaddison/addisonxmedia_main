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
  void items;
  void title;
  void compact;
  void className;
  return null;
};
