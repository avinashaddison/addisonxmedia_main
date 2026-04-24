import { type LucideIcon } from "lucide-react";

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
