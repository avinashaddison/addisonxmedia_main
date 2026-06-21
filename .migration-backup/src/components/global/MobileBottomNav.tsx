/**
 * Mobile bottom navigation bar.
 *
 * Shown only on <md (mobile) screens. The sidebar is hidden behind a hamburger
 * at that breakpoint, but jumping into the hamburger for every page switch
 * feels heavy — so the 5 most-used destinations get a thumb-reach bar at the
 * bottom of the viewport, native-app style.
 *
 * Hidden when:
 *   - viewport is md+ (sidebar already visible)
 *   - active page is "inbox" (inbox has its own mobile state machine + needs
 *     full vertical space for the chat panel)
 */

import { LayoutDashboard, MessageCircle, Trophy, Megaphone, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { id: "dashboard", label: "Home",   Icon: LayoutDashboard },
  { id: "inbox",     label: "Chats",  Icon: MessageCircle },
  { id: "deals",     label: "Deals",  Icon: Trophy },
  { id: "ads",       label: "Ads",    Icon: Megaphone },
  { id: "more",      label: "More",   Icon: MoreHorizontal },
] as const;

type Props = {
  active: string;
  onNavigate: (id: string) => void;
  onOpenMore: () => void;
  hidden?: boolean;
};

export const MobileBottomNav = ({ active, onNavigate, onOpenMore, hidden }: Props) => {
  if (hidden) return null;

  // The "More" button opens the existing sidebar drawer — same UI the
  // hamburger triggers. Keeps the secondary destinations (Contacts,
  // Broadcasts, Templates, Settings, etc.) one tap away.
  const handleTap = (id: string) => {
    if (id === "more") onOpenMore();
    else onNavigate(id);
  };

  return (
    <nav className="md:hidden flex-shrink-0 border-t-2 border-[#E8B968] bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around h-14">
        {ITEMS.map((it) => {
          const isActive = active === it.id;
          return (
            <button
              key={it.id}
              onClick={() => handleTap(it.id)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors",
                isActive ? "text-[#FF6A1F]" : "text-foreground/60 hover:text-foreground active:bg-[#FFF1D6]"
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={it.label}
            >
              <it.Icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 2} />
              <span className={cn("text-[10px] font-extrabold uppercase tracking-wider leading-none", isActive ? "text-[#FF6A1F]" : "text-foreground/65")}>
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
