import { Inbox, LayoutDashboard, Users, Megaphone, Radio, Bell, Settings, MessageCircle, LogOut, Sparkles, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  active: string;
  onNavigate: (page: string) => void;
};

const groups: { label: string; items: { icon: any; label: string; id: string; badgeKey?: "inbox" | "tasks" }[] }[] = [
  {
    label: "Workspace",
    items: [
      { icon: Inbox, label: "Inbox", id: "inbox", badgeKey: "inbox" },
      { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
      { icon: Users, label: "Contacts", id: "contacts" },
    ],
  },
  {
    label: "Outreach",
    items: [
      { icon: Megaphone, label: "Campaigns", id: "campaigns" },
      { icon: Radio, label: "Broadcasts", id: "broadcasts" },
      { icon: Bell, label: "Follow-ups", id: "followups", badgeKey: "tasks" },
    ],
  },
  {
    label: "System",
    items: [{ icon: Settings, label: "Settings", id: "settings" }],
  },
];

const useSidebarBadges = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sidebar-badges", user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const [unread, tasks] = await Promise.all([
        supabase.from("conversations").select("unread_count").gt("unread_count", 0),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      const inbox = (unread.data ?? []).reduce((a, c) => a + (c.unread_count ?? 0), 0);
      return { inbox, tasks: tasks.count ?? 0 };
    },
  });
};

export const AppSidebar = ({ active, onNavigate }: Props) => {
  const { user, signOut } = useAuth();
  const { data: badges } = useSidebarBadges();

  const initials = (user?.user_metadata?.display_name || user?.email || "U")
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase())
    .join("");

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
  };

  return (
    <aside className="w-[68px] h-screen sticky top-0 bg-card border-r border-border flex flex-col items-center z-50 flex-shrink-0">
      {/* Logo */}
      <div className="w-full flex items-center justify-center h-14 border-b border-border">
        <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-md shadow-primary/30">
          <MessageCircle className="w-4 h-4 text-primary-foreground" fill="currentColor" strokeWidth={0} />
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-card animate-pulse" />
        </div>
      </div>

      {/* Nav with groups */}
      <nav className="flex-1 flex flex-col items-center gap-3 py-3 w-full px-2 overflow-y-auto">
        {groups.map((group, gi) => (
          <div key={group.label} className="w-full flex flex-col items-center gap-1">
            {gi > 0 && <div className="w-7 h-px bg-border my-1" />}
            {group.items.map((item) => {
              const isActive = item.id === active;
              const badgeValue = item.badgeKey ? badges?.[item.badgeKey] : 0;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={item.label}
                  className={cn(
                    "relative w-11 h-11 rounded-xl flex items-center justify-center transition-all group",
                    isActive
                      ? "bg-primary-soft text-primary shadow-sm ring-1 ring-primary/20"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground hover:scale-105"
                  )}
                >
                  {/* active indicator bar */}
                  {isActive && (
                    <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary" />
                  )}
                  <item.icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.4 : 2} />
                  {badgeValue && badgeValue > 0 ? (
                    <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-hot text-[9px] font-bold text-hot-foreground flex items-center justify-center ring-2 ring-card">
                      {badgeValue > 99 ? "99+" : badgeValue}
                    </span>
                  ) : null}

                  {/* Tooltip */}
                  <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-foreground text-background text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 shadow-lg flex items-center gap-1.5">
                    {item.label}
                    {badgeValue && badgeValue > 0 ? (
                      <span className="text-[9px] bg-hot text-hot-foreground px-1.5 rounded-full">{badgeValue}</span>
                    ) : null}
                    <ChevronRight className="w-3 h-3 opacity-50" />
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* AI status pill */}
      <div className="mb-2 group relative">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <span className="absolute left-full ml-3 bottom-0 px-2.5 py-1.5 rounded-lg bg-foreground text-background text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-lg">
          Addison AI · Ready
        </span>
      </div>

      {/* User */}
      <div className="pb-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground text-[12px] font-bold flex items-center justify-center hover:ring-2 hover:ring-primary/30 transition-all relative">
              {initials || "U"}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-card" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground text-[12px] font-bold flex items-center justify-center">
                  {initials || "U"}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-semibold truncate">
                    {user?.user_metadata?.display_name || "Agent"}
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate font-normal">
                    {user?.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onNavigate("settings")}>
              <Settings className="w-4 h-4 mr-2" />
              Workspace settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
};
