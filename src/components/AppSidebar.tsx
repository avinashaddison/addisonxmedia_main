import { LayoutDashboard, Inbox, Users, Megaphone, Radio, Bell, Settings, LogOut, Sparkles, Globe, ChevronsLeft, ChevronsRight, Trophy, BarChart3, Brain, FileText, UsersRound, Activity, Plug, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { AddisonMark, AddisonLogo } from "@/components/brand/AddisonLogo";
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
import { Link } from "react-router-dom";
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

type Props = {
  active: string;
  onNavigate: (page: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

const groups: { label: string; items: { icon: any; label: string; id: string; badgeKey?: "inbox" | "tasks"; hint?: string }[] }[] = [
  {
    label: "Workspace",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", hint: "Overview & KPIs" },
      { icon: Inbox, label: "Chats", id: "inbox", badgeKey: "inbox", hint: "WhatsApp inbox" },
      { icon: Users, label: "Contacts", id: "contacts", hint: "Leads & CRM" },
      { icon: Trophy, label: "Deals", id: "deals", hint: "Sales pipeline" },
      { icon: BarChart3, label: "Analytics", id: "analytics", hint: "Reports & insights" },
    ],
  },
  {
    label: "Outreach",
    items: [
      { icon: Megaphone, label: "Campaigns", id: "campaigns", hint: "Multi-channel" },
      { icon: Radio, label: "Broadcasts", id: "broadcasts", hint: "Mass messages" },
      { icon: FileText, label: "Templates", id: "templates", hint: "Reusable messages" },
      { icon: Bell, label: "Follow-ups", id: "followups", badgeKey: "tasks", hint: "Tasks queue" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { icon: Brain, label: "AI Training", id: "ai-training", hint: "Train Addison AI" },
      { icon: Activity, label: "Activity", id: "activity", hint: "System history" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { icon: UsersRound, label: "Team", id: "team", hint: "Members & roles" },
      { icon: Plug, label: "Integrations", id: "integrations", hint: "Connect tools" },
      { icon: Settings, label: "Settings", id: "settings", hint: "Workspace config" },
    ],
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
  const [collapsed, setCollapsed] = useState(false);

  const initials = (user?.user_metadata?.display_name || user?.email || "U")
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase())
    .join("");

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Agent";

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
  };

  const widthClass = collapsed ? "w-[72px]" : "w-[244px]";

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 bg-card border-r border-border flex flex-col z-50 flex-shrink-0 transition-[width] duration-200 ease-out relative",
        widthClass
      )}
    >
      {/* subtle top glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/5 to-transparent" />

      {/* Logo header */}
      <div className="relative h-16 px-3 border-b border-border flex items-center gap-2.5 flex-shrink-0">
        {collapsed ? (
          <AddisonMark size={40} className="mx-auto" />
        ) : (
          <>
            <AddisonLogo size={40} />
            <button
              onClick={() => setCollapsed(true)}
              className="ml-auto w-7 h-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors flex-shrink-0"
              title="Collapse sidebar"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mt-2 mx-auto w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors flex-shrink-0"
          title="Expand sidebar"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      )}

      {/* Nav */}
      <nav className="relative flex-1 overflow-y-auto py-3 px-2.5 space-y-5">
        {groups.map((group) => (
          <div key={group.label} className="space-y-0.5">
            {!collapsed && (
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60 px-2.5 mb-2">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const isActive = item.id === active;
              const badgeValue = item.badgeKey ? badges?.[item.badgeKey] : 0;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "relative w-full h-10 rounded-xl flex items-center gap-3 px-2.5 transition-all group overflow-hidden",
                    isActive
                      ? "bg-gradient-to-r from-primary-soft via-primary-soft to-transparent text-primary font-semibold shadow-sm"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                    collapsed && "justify-center px-0"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-gradient-to-b from-primary to-primary-glow shadow-[0_0_12px_hsl(var(--primary)/0.6)]" />
                  )}
                  <item.icon
                    className={cn(
                      "flex-shrink-0 transition-transform group-hover:scale-105",
                      collapsed ? "w-[18px] h-[18px]" : "w-[17px] h-[17px]"
                    )}
                    strokeWidth={isActive ? 2.4 : 2}
                  />
                  {!collapsed && (
                    <span className="flex-1 text-left text-[13px] truncate">{item.label}</span>
                  )}
                  {badgeValue && badgeValue > 0 ? (
                    collapsed ? (
                      <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-hot text-[9px] font-bold text-hot-foreground flex items-center justify-center ring-2 ring-card shadow-md shadow-hot/40">
                        {badgeValue > 99 ? "99+" : badgeValue}
                      </span>
                    ) : (
                      <span className="min-w-[20px] h-[18px] px-1.5 rounded-full bg-gradient-to-br from-hot to-destructive text-[10px] font-bold text-hot-foreground flex items-center justify-center shadow-sm shadow-hot/40">
                        {badgeValue > 99 ? "99+" : badgeValue}
                      </span>
                    )
                  ) : null}

                  {/* Tooltip when collapsed */}
                  {collapsed && (
                    <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-foreground text-background text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 shadow-lg">
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* AI status card */}
      {!collapsed ? (
        <div className="relative mx-2.5 mb-2 p-3 rounded-xl bg-gradient-to-br from-primary-soft via-card to-accent-soft border border-primary/15 overflow-hidden">
          <div className="absolute inset-0 animate-shimmer pointer-events-none" />
          <div className="relative flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-md shadow-primary/30 ring-1 ring-primary-foreground/10">
              <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-bold leading-tight">Addison AI</p>
              <p className="text-[10px] text-success font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Online · Ready
              </p>
            </div>
          </div>
          <p className="relative text-[10px] text-muted-foreground leading-snug">Suggesting replies in real time</p>
        </div>
      ) : (
        <div className="mb-2 mx-auto group relative">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-soft to-accent-soft border border-primary/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
        </div>
      )}

      {/* Theme toggle */}
      <div className="px-2.5 pb-2">
        <ThemeToggle collapsed={collapsed} />
      </div>

      {/* User menu */}
      <div className="p-2.5 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-full rounded-xl hover:bg-muted transition-all flex items-center gap-2.5 p-1.5",
                collapsed ? "justify-center" : ""
              )}
            >
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground text-[12px] font-bold flex items-center justify-center">
                  {initials || "U"}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-card" />
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[12px] font-bold truncate leading-tight">{displayName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground text-[12px] font-bold flex items-center justify-center">
                  {initials || "U"}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-semibold truncate">{displayName}</span>
                  <span className="text-[11px] text-muted-foreground truncate font-normal">{user?.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onNavigate("settings")}>
              <Settings className="w-4 h-4 mr-2" />
              Workspace settings
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/">
                <Globe className="w-4 h-4 mr-2" />
                View landing page
              </Link>
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
