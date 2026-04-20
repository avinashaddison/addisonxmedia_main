import { LayoutDashboard, Users, MessageSquare, GitBranch, Megaphone, Bell, Settings, Zap } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Users, label: "Leads", badge: "247" },
  { icon: MessageSquare, label: "Chat", badge: "12" },
  { icon: GitBranch, label: "Pipeline" },
  { icon: Megaphone, label: "Campaigns" },
  { icon: Bell, label: "Follow-ups", badge: "8" },
  { icon: Settings, label: "Settings" },
];

export const Sidebar = () => {
  const [active, setActive] = useState("Dashboard");

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-sidebar border-r border-sidebar-border z-40">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center glow-primary">
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-sidebar-foreground">AddisonX</h1>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Media Engine</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-3">Workspace</p>
        {navItems.map((item) => {
          const isActive = item.label === active;
          return (
            <button
              key={item.label}
              onClick={() => setActive(item.label)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group relative",
                isActive
                  ? "bg-gradient-primary text-white shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", isActive && "drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]")} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                  isActive ? "bg-white/20 text-white" : "bg-primary/20 text-primary-glow"
                )}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Status */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="glass rounded-xl p-3 flex items-center gap-3">
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-success animate-ping opacity-75" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-sidebar-foreground">All systems operational</p>
            <p className="text-[10px] text-muted-foreground">99.98% uptime</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
