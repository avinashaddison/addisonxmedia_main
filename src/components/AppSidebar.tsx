import { Inbox, LayoutDashboard, Users, Megaphone, Radio, Bell, Settings, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  active: string;
  onNavigate: (page: string) => void;
};

const items = [
  { icon: Inbox, label: "Inbox", id: "inbox", badge: 6 },
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: Users, label: "Contacts", id: "contacts" },
  { icon: Megaphone, label: "Campaigns", id: "campaigns" },
  { icon: Radio, label: "Broadcasts", id: "broadcasts" },
  { icon: Bell, label: "Follow-ups", id: "followups", badge: 8 },
  { icon: Settings, label: "Settings", id: "settings" },
];

export const AppSidebar = ({ active, onNavigate }: Props) => {
  return (
    <aside className="w-[60px] h-screen sticky top-0 bg-card border-r border-border flex flex-col items-center z-50 flex-shrink-0">
      {/* Logo */}
      <div className="w-full flex items-center justify-center h-14 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <MessageCircle className="w-4 h-4 text-primary-foreground" fill="currentColor" strokeWidth={0} />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col items-center gap-1 py-3 w-full px-2">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={item.label}
              className={cn(
                "relative w-10 h-10 rounded-lg flex items-center justify-center transition-all group",
                isActive
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.badge && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-hot text-[9px] font-bold text-hot-foreground flex items-center justify-center">
                  {item.badge}
                </span>
              )}
              {/* Tooltip */}
              <span className="absolute left-full ml-2 px-2 py-1 rounded bg-foreground text-background text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="pb-3">
        <button className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center hover:ring-2 hover:ring-primary/30 transition-all">
          AP
        </button>
      </div>
    </aside>
  );
};
