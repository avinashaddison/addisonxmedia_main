import {
  LayoutDashboard, Users, Inbox, GitBranch, Megaphone, Bell as BellIcon,
  Settings, MessageCircle, ChevronDown, ChevronRight, HelpCircle, CreditCard,
  BarChart3, Zap, LogOut
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type NavItem = { icon: typeof LayoutDashboard; label: string; badge?: string; active?: boolean };
type NavGroup = { title: string; items: NavItem[]; defaultOpen?: boolean };

const groups: NavGroup[] = [
  {
    title: "Main",
    defaultOpen: true,
    items: [
      { icon: LayoutDashboard, label: "Dashboard", active: true },
      { icon: Users, label: "Leads", badge: "247" },
      { icon: GitBranch, label: "Pipeline" },
      { icon: Inbox, label: "Inbox", badge: "12" },
    ],
  },
  {
    title: "Engage",
    defaultOpen: true,
    items: [
      { icon: Megaphone, label: "Broadcasts" },
      { icon: BellIcon, label: "Follow-ups", badge: "8" },
      { icon: Zap, label: "Automations" },
    ],
  },
  {
    title: "Reports",
    defaultOpen: false,
    items: [
      { icon: BarChart3, label: "Analytics" },
      { icon: CreditCard, label: "Billing" },
    ],
  },
];

const NavGroupSection = ({ group, active, onSelect }: {
  group: NavGroup;
  active: string;
  onSelect: (label: string) => void;
}) => {
  const [open, setOpen] = useState(group.defaultOpen ?? true);

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
      >
        {group.title}
        <ChevronRight className={cn("w-3 h-3 transition-transform", open && "rotate-90")} />
      </button>

      {open && (
        <div className="mt-0.5 space-y-0.5">
          {group.items.map((item) => {
            const isActive = item.label === active;
            return (
              <button
                key={item.label}
                onClick={() => onSelect(item.label)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group relative",
                  isActive
                    ? "bg-primary-soft text-primary"
                    : "text-sidebar-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary" />}
                <div className="flex items-center gap-2.5">
                  <item.icon className={cn("w-[16px] h-[16px]", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded min-w-[20px] text-center",
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const Sidebar = () => {
  const [active, setActive] = useState("Dashboard");

  return (
    <aside className="hidden lg:flex flex-col w-[232px] h-screen sticky top-0 bg-sidebar border-r border-sidebar-border z-40">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-sidebar-border flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
          <MessageCircle className="w-4 h-4 text-white" fill="white" strokeWidth={0} />
        </div>
        <div className="min-w-0">
          <h1 className="text-[14px] font-bold tracking-tight text-foreground leading-none">AddisonX</h1>
        </div>
      </div>

      {/* Workspace */}
      <div className="px-3 pt-3 pb-1">
        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
          <div className="w-5 h-5 rounded bg-gradient-accent flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">A</div>
          <span className="text-[11px] font-semibold truncate flex-1 text-left">AddisonX Media</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        </button>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-1">
        {groups.map((g) => (
          <NavGroupSection key={g.title} group={g} active={active} onSelect={setActive} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-sidebar-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
          <span>Help & Support</span>
        </button>
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-sidebar-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <span>Settings</span>
        </button>

        {/* User */}
        <div className="mt-2 p-2 rounded-lg bg-muted/40 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-accent flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">AP</div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold leading-none truncate">Addison Patel</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Admin</p>
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors" title="Sign out">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
