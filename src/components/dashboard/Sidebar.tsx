import { LayoutDashboard, Users, Inbox, GitBranch, Megaphone, Bell, Settings, MessageCircle, ChevronDown, HelpCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const main = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Users, label: "Leads", badge: "247" },
  { icon: GitBranch, label: "Pipeline" },
  { icon: Inbox, label: "Inbox", badge: "12" },
  { icon: Megaphone, label: "Broadcasts" },
  { icon: Bell, label: "Follow-ups", badge: "8" },
];

const bottom = [
  { icon: HelpCircle, label: "Help Center" },
  { icon: Settings, label: "Settings" },
];

export const Sidebar = () => {
  const [active, setActive] = useState("Dashboard");

  return (
    <aside className="hidden lg:flex flex-col w-60 h-screen sticky top-0 bg-sidebar border-r border-sidebar-border z-40">
      {/* Logo */}
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center">
            <MessageCircle className="w-4.5 h-4.5 text-white" fill="white" strokeWidth={0} />
          </div>
          <div>
            <h1 className="text-[15px] font-bold tracking-tight text-foreground">AddisonX</h1>
            <p className="text-[10px] text-muted-foreground">Lead Engine</p>
          </div>
        </div>
      </div>

      {/* Workspace switcher */}
      <div className="px-3 pt-3">
        <button className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-gradient-accent flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">AX</div>
            <span className="text-xs font-semibold truncate">AddisonX Media</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto mt-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">Main Menu</p>
        {main.map((item) => {
          const isActive = item.label === active;
          return (
            <button
              key={item.label}
              onClick={() => setActive(item.label)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group relative",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
              )}
            >
              {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary" />}
              <div className="flex items-center gap-2.5">
                <item.icon className={cn("w-4 h-4", isActive && "text-primary")} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center",
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 space-y-0.5 border-t border-sidebar-border">
        {bottom.map((item) => (
          <button
            key={item.label}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-colors"
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}

        {/* Status */}
        <div className="mt-2 mx-1 p-2.5 rounded-lg bg-success-soft flex items-center gap-2.5">
          <div className="relative w-2 h-2 text-success">
            <div className="absolute inset-0 rounded-full bg-success" />
            <div className="absolute inset-0 rounded-full bg-success live-dot" />
          </div>
          <span className="text-[11px] font-semibold text-success">All systems operational</span>
        </div>
      </div>
    </aside>
  );
};
