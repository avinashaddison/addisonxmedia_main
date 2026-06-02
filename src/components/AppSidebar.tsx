import { LayoutDashboard, Inbox, Users, Megaphone, Radio, Bell, Settings, LogOut, Sparkles, Globe, ChevronsLeft, ChevronsRight, ChevronRight, Trophy, BarChart3, Brain, FileText, UsersRound, Activity, Plug, X, Bot, Workflow, Target, Shield, ScrollText, Crown, Loader2, Rocket, ArrowLeft, Palette, LayoutGrid, Package, ShoppingCart, CreditCard, Truck, Ticket, ClipboardList, Search, Store, Wrench, Layers, Calendar, MessageCircle } from "lucide-react";
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
import { api } from "@/lib/api";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { prefetchPage } from "@/lib/prefetch";
import { useConversations } from "@/hooks/useInboxData";
import { ProjectSwitcher } from "./global/ProjectSwitcher";

const SIDEBAR_COLLAPSED_KEY = "addisonx-sidebar-collapsed";

type Props = {
  active: string;
  onNavigate: (page: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

type NavItem = {
  icon: any;
  label: string;
  id: string;
  badgeKey?: "inbox" | "tasks";
  hint?: string;
  smart?: boolean;
  live?: boolean;
};

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Sales",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", hint: "Command center" },
      { icon: Inbox, label: "Chats", id: "inbox", badgeKey: "inbox", hint: "Live WhatsApp inbox", live: true },
      { icon: Users, label: "Contacts", id: "contacts", hint: "Leads & CRM" },
      { icon: Trophy, label: "Deals", id: "deals", hint: "Sales pipeline" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { icon: Target, label: "Ads Marketing", id: "ads", hint: "Meta + Google ads", smart: true },
      { icon: Megaphone, label: "Campaigns", id: "campaigns", hint: "Multi-channel" },
      { icon: Radio, label: "Broadcasts", id: "broadcasts", hint: "Mass messages" },
      { icon: FileText, label: "Templates", id: "templates", hint: "Reusable messages" },
    ],
  },
  {
    label: "Automation",
    items: [
      { icon: Bell, label: "Follow-ups", id: "followups", badgeKey: "tasks", hint: "Tasks queue" },
    ],
  },
  {
    label: "AI",
    items: [
      { icon: Brain, label: "AI Agent", id: "ai-training", hint: "Teach Addison about your business", smart: true },
    ],
  },
  {
    label: "System",
    items: [
      { icon: BarChart3, label: "Analytics", id: "analytics", hint: "Reports & insights" },
      { icon: Activity, label: "Activity", id: "activity", hint: "System history" },
      { icon: Plug, label: "Integrations", id: "integrations", hint: "Connect tools" },
      { icon: Settings, label: "Settings", id: "settings", hint: "Workspace config" },
    ],
  },
];

const websiteGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Website",
    items: [
      { icon: Store,  label: "Site Builder", id: "site",       hint: "Everything: content, theme, branding, launch" },
      { icon: Layers, label: "Pages",        id: "site/pages",  hint: "Custom pages" },
    ],
  },
  {
    label: "Leads & Chats",
    items: [
      { icon: Inbox,         label: "Conversations", id: "inbox", badgeKey: "inbox", hint: "WhatsApp live chat", live: true },
      { icon: ClipboardList, label: "Lead Forms",    id: "site/leads", hint: "CRM capture forms" },
      { icon: Calendar,      label: "Bookings",      id: "site/bookings", hint: "Appointments" },
    ],
  },
  {
    label: "Sales",
    items: [
      { icon: Package,      label: "Products",   id: "site/products", hint: "Catalog items & tabs" },
      { icon: ShoppingCart, label: "Orders",     id: "site/orders", hint: "Pipeline & shipping" },
      { icon: UsersRound,   label: "Customers",  id: "site/customers", hint: "CRM contacts" },
      { icon: CreditCard,   label: "Payments",   id: "site/payments", hint: "UPI + gateways" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { icon: Megaphone, label: "Campaigns",  id: "campaigns", hint: "Meta ads manager" },
      { icon: Radio,     label: "Broadcasts", id: "broadcasts", hint: "WhatsApp blasts" },
      { icon: Bell,      label: "Automations",id: "followups", badgeKey: "tasks", hint: "Follow-ups" },
      { icon: BarChart3, label: "Analytics",  id: "site/analytics", hint: "Store views & statistics" },
    ],
  },
  {
    label: "Growth",
    items: [
      { icon: Search, label: "SEO", id: "site/seo", hint: "Meta tags & SEO" },
    ],
  },
  {
    label: "Settings",
    items: [
      { icon: Globe,    label: "Domain",       id: "site/domain", hint: "Custom domain" },
      { icon: Users,    label: "Team",         id: "settings", hint: "Staff credentials" },
      { icon: Plug,     label: "Integrations", id: "integrations", hint: "APIs & keys" },
      { icon: Settings, label: "Settings",     id: "site/settings", hint: "Workspace config" },
    ],
  },
];


// Tasks-only badge query. The inbox badge is derived from useConversations()
// below so it updates at the same 5s cadence as the chats list — instead of
// the 30s sidebar poll which used to lag visibly behind reality.
const useTasksBadge = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sidebar-badges", user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: () => api.getSidebarBadges(),
  });
};

export const AppSidebar = ({ active, onNavigate, mobileOpen = false, onMobileClose }: Props) => {
  const { user, signOut } = useAuth();
  const { data: tasksBadges } = useTasksBadge();
  // Same query key as the app-shell mount in pages/Index.tsx — shared cache,
  // no extra fetch. Every page renders the sidebar, so the inbox badge stays
  // live everywhere.
  const { data: conversations = [] } = useConversations();
  const inboxUnread = conversations.reduce((a, c) => a + (c.unread_count || 0), 0);
  const badges = { inbox: inboxUnread, tasks: tasksBadges?.tasks ?? 0 };
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  });

  const location = useLocation();
  const mode: "primary" | "website" = location.pathname.startsWith("/app/site") ? "website" : "primary";
  const activeGroups = mode === "website" ? websiteGroups : groups;
  const websiteSubPath = location.pathname.replace(/^\/app\/site\/?/, "");
  const activeId = mode === "website" ? (websiteSubPath ? `site/${websiteSubPath}` : "site") : active;


  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

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

  // On mobile the sidebar always shows full width (never collapsed) when open
  const widthClass = collapsed ? "lg:w-[72px]" : "lg:w-[244px]";

  const handleNavigate = (page: string) => {
    onNavigate(page);
    onMobileClose?.();
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm animate-fade-in"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          "bg-[#FFF6E8] border-r-2 border-[#E8B968] flex flex-col flex-shrink-0 transition-all duration-200 ease-out",
          // Desktop: sticky in flow
          "lg:h-screen lg:sticky lg:top-0 lg:relative lg:translate-x-0 lg:z-40",
          widthClass,
          // Mobile: full-height fixed drawer
          "fixed top-0 bottom-0 left-0 z-50 w-[280px] h-screen",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        )}
      >

        {/* Logo header */}
        <div className="relative h-[72px] px-3 border-b-2 border-[#E8B968] bg-white flex items-center gap-2 flex-shrink-0 overflow-hidden">
          {/* Subtle saffron glow behind logo */}
          <div className="absolute -top-8 -left-8 w-32 h-32 bg-[#FFD23F]/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-[#FF6A1F]/15 rounded-full blur-2xl pointer-events-none" />

          {collapsed ? (
            // Collapsed (desktop only): just the FX mark, centered
            <Link
              to="/app/dashboard"
              className="mx-auto hidden lg:block hover:scale-105 transition-transform"
              aria-label="AddisonX home"
            >
              <AddisonMark size={42} />
            </Link>
          ) : (
            <>
              {/* Expanded full lockup */}
              <Link to="/app/dashboard" className="flex-1 min-w-0 hover:opacity-90 transition relative" aria-label="AddisonX home">
                <AddisonLogo size={28} />
              </Link>
              {/* Desktop collapse */}
              <button
                onClick={() => setCollapsed(true)}
                className="relative ml-1 w-8 h-8 rounded-lg bg-[#FFF1D6] hover:bg-[#FFE8C7] border border-[#E8B968] text-foreground/70 hover:text-foreground hidden lg:flex items-center justify-center transition flex-shrink-0"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <ChevronsLeft className="w-4 h-4" strokeWidth={2.5} />
              </button>
              {/* Mobile close */}
              <button
                onClick={onMobileClose}
                className="relative ml-1 w-9 h-9 rounded-lg bg-[#FFF1D6] hover:bg-[#FFE8C7] border border-[#E8B968] text-foreground/70 hover:text-foreground lg:hidden flex items-center justify-center transition flex-shrink-0"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </>
          )}
          {/* Mobile sees the full lockup even when desktop is collapsed */}
          {collapsed && (
            <div className="flex items-center gap-2 lg:hidden flex-1 min-w-0">
              <Link to="/app/dashboard" className="flex-1 min-w-0" aria-label="AddisonX home">
                <AddisonLogo size={28} />
              </Link>
              <button
                onClick={onMobileClose}
                className="ml-auto w-9 h-9 rounded-lg bg-[#FFF1D6] hover:bg-[#FFE8C7] border border-[#E8B968] flex items-center justify-center transition flex-shrink-0"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="mt-2 mx-auto w-8 h-8 rounded-lg bg-[#FFF1D6] hover:bg-[#FFE8C7] border border-[#E8B968] text-foreground/70 hover:text-foreground hidden lg:flex items-center justify-center transition flex-shrink-0"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <ChevronsRight className="w-4 h-4" strokeWidth={2.5} />
          </button>
        )}

      {/* Nav */}
      <nav className="relative flex-1 overflow-y-auto py-3 px-2.5 space-y-5">
        <div className={cn("px-1 mb-2", collapsed ? "flex justify-center" : "")}>
          <ProjectSwitcher collapsed={collapsed} />
        </div>

        {/* Website mode — back arrow returns to primary sidebar */}
        {mode === "website" && (
          <button
            onClick={() => handleNavigate("dashboard")}
            title={collapsed ? "Back to main menu" : undefined}
            className={cn(
              "w-full h-11 rounded-xl flex items-center gap-2.5 px-2.5 transition-all bg-white border-2 border-[#E8B968] text-[#0A3D24] font-extrabold shadow-[0_2px_0_0_#E8B968] hover:bg-[#FFE8C7] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] group",
              collapsed && "justify-center px-0",
            )}
          >
            <ArrowLeft className="w-4 h-4 flex-shrink-0 group-hover:-translate-x-0.5 transition" strokeWidth={2.5} />
            {!collapsed && <span className="flex-1 text-left text-[12.5px]">Back to main</span>}
            {collapsed && (
              <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-[#0A3D24] text-white text-[11px] font-extrabold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 shadow-lg">
                Back to main menu
              </span>
            )}
          </button>
        )}

        {activeGroups.map((group) => {
          const groupColors: Record<string, string> = {
            Sales: "text-[#0E8A4B]",
            Marketing: "text-[#FF6A1F]",
            Automation: "text-[#D4308E]",
            AI: "text-[#3C50E0]",
            System: "text-[#B8651A]",
            // Website-mode groups
            Website: "text-[#0E8A4B]",
            "Leads & Chats": "text-[#D4308E]",
            Growth: "text-[#3C50E0]",
            Settings: "text-[#B8651A]",
          };
          return (
          <div key={group.label} className="space-y-1">
            {!collapsed && (
              <p className={cn("text-[10px] font-extrabold uppercase tracking-[0.2em] px-2.5 mb-2", groupColors[group.label] || "text-foreground/50")}>
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const isActive = item.id === activeId;
              const badgeValue = item.badgeKey ? badges?.[item.badgeKey] : 0;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  onMouseEnter={() => prefetchPage(item.id)}
                  onFocus={() => prefetchPage(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "relative w-full h-11 rounded-xl flex items-center gap-3 px-2.5 transition-all group overflow-hidden",
                    isActive
                      ? "bg-[#0E8A4B] text-white font-extrabold shadow-[0_3px_0_0_#073D22]"
                      : "text-foreground/70 hover:bg-[#FFE8C7] hover:text-foreground font-semibold",
                    collapsed && "justify-center px-0"
                  )}
                >
                  {isActive && (
                    <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 bg-[#FFD23F] shadow" />
                  )}
                  <span className="relative">
                    <item.icon
                      className={cn(
                        "flex-shrink-0 transition-transform group-hover:scale-110",
                        collapsed ? "w-[19px] h-[19px]" : "w-[18px] h-[18px]"
                      )}
                      strokeWidth={isActive ? 2.5 : 2.2}
                    />
                    {item.live && !collapsed && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#FFD23F] animate-pulse ring-2 ring-[#0E8A4B]" />
                    )}
                  </span>
                  {!collapsed && (
                    <span className="flex-1 text-left text-[13px] truncate">{item.label}</span>
                  )}
                  {item.smart && !collapsed && (
                    <span className="text-[8px] font-extrabold uppercase tracking-[0.12em] bg-[#FFD23F] text-[#7A4A00] px-1.5 py-0.5 rounded">
                      AI
                    </span>
                  )}
                  {badgeValue && badgeValue > 0 ? (
                    collapsed ? (
                      <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[#FF6A1F] text-[9px] font-extrabold text-white flex items-center justify-center ring-2 ring-[#FFF6E8] shadow-md">
                        {badgeValue > 99 ? "99+" : badgeValue}
                      </span>
                    ) : (
                      <span className={cn(
                        "min-w-[22px] h-[20px] px-1.5 rounded-full text-[10px] font-extrabold flex items-center justify-center",
                        isActive ? "bg-[#FFD23F] text-[#7A4A00]" : "bg-[#FF6A1F] text-white"
                      )}>
                        {badgeValue > 99 ? "99+" : badgeValue}
                      </span>
                    )
                  ) : null}

                  {/* Tooltip when collapsed */}
                  {collapsed && (
                    <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-[#0A3D24] text-white text-[11px] font-extrabold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 shadow-lg">
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          );
        })}
      </nav>





      {/* User menu */}
      <div className="p-2.5 border-t-2 border-[#E8B968] bg-white">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-full rounded-xl hover:bg-[#FFE8C7] transition-all flex items-center gap-2.5 p-1.5",
                collapsed ? "justify-center" : ""
              )}
            >
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6A1F] to-[#D4308E] text-white text-[12px] font-extrabold flex items-center justify-center shadow-md">
                  {initials || "U"}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#16C172] rounded-full border-2 border-white" />
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[12px] font-extrabold truncate leading-tight">{displayName}</p>
                  <p className="text-[10px] text-foreground/60 truncate font-medium">{user?.email}</p>
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
            <DropdownMenuItem onClick={() => handleNavigate("upgrade")} className="text-[#FF6A1F] focus:text-[#FF6A1F]">
              <Crown className="w-4 h-4 mr-2" />
              Upgrade plan
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleNavigate("settings")}>
              <Settings className="w-4 h-4 mr-2" />
              Workspace settings
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/">
                <Globe className="w-4 h-4 mr-2" />
                View landing page
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/admin/dashboard">
                <Crown className="w-4 h-4 mr-2 text-[#FF6A1F]" />
                Open admin panel
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/privacy" target="_blank" rel="noopener noreferrer">
                <Shield className="w-4 h-4 mr-2" />
                Privacy Policy
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/terms" target="_blank" rel="noopener noreferrer">
                <ScrollText className="w-4 h-4 mr-2" />
                Terms of Service
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
    </>
  );
};

// ─── Sidebar upgrade card ────────────────────────────────────────────────────
//
// Renders one of four states based on /api/billing/me:
//   1. Pending upgrade   → green progress banner with "in progress" hint
//   2. Free / Starter    → saffron CTA pushing to next paid tier
//   3. Growth / Scale    → plan plate with "Manage plan" link
//   4. Enterprise        → custom plate, no upgrade arrow
//
// Stays in the same vertical slot the old "Addison AI · Online" card used.

const PLAN_NEXT: Record<string, { next: string; label: string; price: string }> = {
  free:    { next: "starter", label: "Starter",  price: "₹999/mo" },
  starter: { next: "growth",  label: "Growth",   price: "₹2,999/mo" },
  growth:  { next: "scale",   label: "Scale",    price: "₹7,999/mo" },
  scale:   { next: "",        label: "",         price: "" },
};

const PLAN_DISPLAY: Record<string, { name: string; price: string; gradient: string }> = {
  free:       { name: "Free",       price: "₹0/mo",        gradient: "from-[#0A3D24] to-[#0D4E2E]" },
  starter:    { name: "Starter",    price: "₹999/mo",      gradient: "from-[#3C50E0] to-[#2533A8]" },
  growth:     { name: "Growth",     price: "₹2,999/mo",    gradient: "from-[#0E8A4B] to-[#0A6E3C]" },
  scale:      { name: "Scale",      price: "₹7,999/mo",    gradient: "from-[#7A1052] to-[#A11A6A]" },
  enterprise: { name: "Enterprise", price: "Custom",       gradient: "from-[#0A3D24] to-[#0A3D24]" },
};

const SidebarUpgradeCard = ({ collapsed, onNavigate }: { collapsed: boolean; onNavigate: (id: string) => void }) => {
  const { user } = useAuth();
  const { data: me } = useQuery({
    queryKey: ["billing-me"],
    queryFn: () => api.getBillingMe(),
    enabled: !!user,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const plan = (me?.plan ?? "free").toLowerCase();
  const pending = me?.pending_upgrade ?? null;
  const planDisplay = PLAN_DISPLAY[plan] ?? PLAN_DISPLAY.free;
  const upgradeTarget = PLAN_NEXT[plan];
  const isPaid = plan === "growth" || plan === "scale" || plan === "enterprise";

  // Collapsed = just the crown icon (or pending shimmer)
  if (collapsed) {
    return (
      <button
        onClick={() => onNavigate("upgrade")}
        title={pending ? `Upgrade to ${pending.target_plan} pending` : isPaid ? planDisplay.name : "Upgrade plan"}
        className={cn(
          "mb-2 mx-auto w-9 h-9 rounded-xl border-2 flex items-center justify-center shadow-md transition-all hover:scale-105",
          pending
            ? "bg-gradient-to-br from-[#FFD23F] to-[#FF6A1F] border-[#7A4A00] animate-pulse"
            : isPaid
              ? `bg-gradient-to-br ${planDisplay.gradient} border-[#FFD23F]`
              : "bg-gradient-to-br from-[#FF6A1F] to-[#FFD23F] border-[#B8420A]"
        )}
        aria-label={isPaid ? `Current plan: ${planDisplay.name}` : "Upgrade plan"}
      >
        <Crown className={cn("w-4 h-4", isPaid ? "text-[#FFD23F]" : "text-white")} strokeWidth={2.5} />
      </button>
    );
  }

  // PENDING — request in flight (manual fulfillment in progress)
  if (pending) {
    return (
      <button
        onClick={() => onNavigate("upgrade")}
        className="mx-2.5 mb-2 p-3 rounded-xl bg-gradient-to-br from-[#0E8A4B] to-[#0A6E3C] border-2 border-[#FFD23F] shadow-[0_3px_0_0_#073D22] relative overflow-hidden text-left hover:translate-y-[1px] transition-all w-[calc(100%-1.25rem)] group"
      >
        <div className="absolute -top-4 -right-4 w-12 h-12 bg-[#FFD23F]/25 rounded-full blur-xl" />
        <div className="relative flex items-center gap-2 mb-1.5">
          <div className="w-8 h-8 rounded-xl bg-[#FFD23F] flex items-center justify-center text-[#7A4A00] shadow-md">
            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-extrabold leading-tight text-white truncate">Upgrade in progress</p>
            <p className="text-[10px] text-[#FFD23F] font-extrabold capitalize">→ {pending.target_plan} · {pending.billing_cycle}</p>
          </div>
        </div>
        <p className="relative text-[10px] text-white/85 leading-snug font-medium">
          Payment link WhatsApp pe bhej rahe hain — soon active.
        </p>
      </button>
    );
  }

  // PAID — Growth / Scale / Enterprise
  if (isPaid) {
    return (
      <button
        onClick={() => onNavigate("upgrade")}
        className={cn(
          "mx-2.5 mb-2 p-3 rounded-xl border-2 border-[#FFD23F] shadow-[0_3px_0_0_rgba(0,0,0,0.25)] relative overflow-hidden text-left hover:translate-y-[1px] transition-all w-[calc(100%-1.25rem)] group bg-gradient-to-br",
          planDisplay.gradient,
        )}
      >
        <div className="absolute -top-4 -right-4 w-12 h-12 bg-[#FFD23F]/25 rounded-full blur-xl" />
        <div className="relative flex items-center gap-2 mb-1.5">
          <div className="w-8 h-8 rounded-xl bg-[#FFD23F] flex items-center justify-center text-[#7A4A00] shadow-md">
            <Crown className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-extrabold leading-tight text-white truncate">{planDisplay.name} plan</p>
            <p className="text-[10px] text-[#FFD23F] font-extrabold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16C172] animate-pulse" />
              Active · {planDisplay.price}
            </p>
          </div>
        </div>
        <p className="relative text-[10px] text-white/85 leading-snug font-medium flex items-center gap-1">
          Manage plan
          <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </p>
      </button>
    );
  }

  // FREE / STARTER → push to next tier (saffron CTA)
  return (
    <button
      onClick={() => onNavigate("upgrade")}
      className="mx-2.5 mb-2 p-3 rounded-xl bg-gradient-to-br from-[#FF6A1F] to-[#E85C12] border-2 border-[#B8420A] shadow-[0_3px_0_0_#7A2A06] relative overflow-hidden text-left hover:translate-y-[1px] transition-all w-[calc(100%-1.25rem)] group"
    >
      <div className="absolute -top-4 -right-4 w-14 h-14 bg-[#FFD23F]/30 rounded-full blur-xl" />
      <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-white/10 rounded-full blur-lg" />
      <div className="relative flex items-center gap-2 mb-1.5">
        <div className="w-8 h-8 rounded-xl bg-[#FFD23F] flex items-center justify-center text-[#7A4A00] shadow-md">
          <Crown className="w-4 h-4" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-[#FFD23F] font-extrabold uppercase tracking-wider">
            {plan === "free" ? "Free plan" : "Starter plan"}
          </p>
          <p className="text-[13px] font-black leading-tight text-white truncate">
            Upgrade to {upgradeTarget?.label}
          </p>
        </div>
      </div>
      <p className="relative text-[10px] text-white/95 leading-snug font-medium flex items-center gap-1">
        From {upgradeTarget?.price}
        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform ml-auto" />
      </p>
    </button>
  );
};
