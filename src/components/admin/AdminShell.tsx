import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Building2, Users, CreditCard, ScrollText, ShieldCheck,
  Activity, Settings, LogOut, ChevronsLeft, ChevronsRight, Loader2,
  Crown, Lock, Shuffle, Brain, Sparkles, Inbox, Megaphone, Radio,
  BarChart3, Plug, ChevronRight, Workflow, UsersRound, Rocket, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { AddisonLogo, AddisonMark } from "@/components/brand/AddisonLogo";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

/* Color-coded sections (matching the sidebar groups) */
type NavItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  badge?: number;
};

type NavGroup = {
  label: string;
  color: string;
  items: NavItem[];
};

const GROUPS: NavGroup[] = [
  {
    label: "Main",
    color: "text-slate-400",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
      { icon: Building2, label: "Workspaces", path: "/admin/workspaces" },
      { icon: Users, label: "Users", path: "/admin/users" },
      { icon: Brain, label: "Agents", path: "/admin/agent-playground" },
      { icon: Inbox, label: "Chat Inbox", path: "/admin/diagnostics", badge: 23 },
      { icon: Megaphone, label: "Broadcasts", path: "/admin/marketing-agent" },
      { icon: Workflow, label: "Automation", path: "/admin/health" },
      { icon: UsersRound, label: "Contacts", path: "/admin/users" },
    ],
  },
  {
    label: "Analytics",
    color: "text-slate-400",
    items: [
      { icon: BarChart3, label: "Reports & Analytics", path: "/admin/dashboard" },
      { icon: Activity, label: "Activity Logs", path: "/admin/audit" },
    ],
  },
  {
    label: "Settings",
    color: "text-slate-400",
    items: [
      { icon: Plug, label: "Integrations", path: "/admin/meta-api" },
      { icon: CreditCard, label: "Billing & Plans", path: "/admin/subscriptions" },
      { icon: Settings, label: "Settings", path: "/admin/settings" },
    ],
  },
];

const useForceLight = () => {
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => {
      if (wasDark) root.classList.add("dark");
    };
  }, []);
};

const formatRole = (r: string) => r.replace("_", " ");

export const AdminShell = ({ children }: { children?: ReactNode }) => {
  useForceLight();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("addisonx-admin-sidebar-collapsed") === "1";
  });

  const { data: me, isLoading, isError, error } = useQuery({
    queryKey: ["admin-me"],
    queryFn: () => adminApi.me(),
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    window.localStorage.setItem("addisonx-admin-sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    if (isError) {
      const msg = String(error).toLowerCase();
      if (msg.includes("not staff") || msg.includes("forbidden") || msg.includes("403")) {
        toast.error("Admin access required");
        navigate("/app/dashboard", { replace: true });
      }
    }
  }, [isError, error, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF6E8]">
        <Loader2 className="w-6 h-6 animate-spin text-[#FF6A1F]" />
      </div>
    );
  }

  if (!me) return null;

  const role = me.adminRole || "";
  const displayName = me.name || me.email.split("@")[0] || "Admin";
  const initials = (me.name || me.email || "AD").slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/auth", { replace: true });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden text-slate-800 bg-[#FFF6E8]/20">
      <aside
        className={cn(
          "bg-[#FFF6E8] border-r-2 border-[#E8B968] flex flex-col flex-shrink-0 transition-all duration-200 text-slate-700 shadow-sm",
          collapsed ? "w-[72px]" : "w-[250px]"
        )}
      >
        {/* Logo header */}
        <div className="relative h-[72px] px-4 border-b-2 border-[#E8B968] bg-white flex items-center gap-2 flex-shrink-0 overflow-hidden">
          {/* Subtle brand saffron & emerald accent glows */}
          <div className="absolute -top-8 -left-8 w-24 h-24 bg-[#FFD23F]/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-[#FF6A1F]/10 rounded-full blur-2xl pointer-events-none" />

          {collapsed ? (
            <Link to="/admin/dashboard" className="mx-auto hover:scale-105 transition-transform" aria-label="Admin home">
              <img src="/logo-mark.png" alt="AX" className="w-9 h-9 object-contain" />
            </Link>
          ) : (
            <>
              <Link to="/admin/dashboard" className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-90 transition" aria-label="Admin home">
                <img src="/logo-mark.png" alt="AddisonX" className="w-8.5 h-8.5 object-contain flex-shrink-0" />
                <div className="flex flex-col leading-none">
                  <span className="text-[14px] font-black text-slate-850 tracking-tight">AddisonX Media</span>
                  <span className="text-[9px] font-bold text-slate-400 mt-1 tracking-wider uppercase">WhatsApp CRM</span>
                </div>
              </Link>
              <button
                onClick={() => setCollapsed(true)}
                className="relative ml-auto w-8 h-8 rounded-lg bg-[#FFF1D6] hover:bg-[#FFE8C7] border border-[#E8B968] text-slate-650 hover:text-slate-900 flex items-center justify-center transition flex-shrink-0"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <ChevronsLeft className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </>
          )}
        </div>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="mt-3 mx-auto w-8 h-8 rounded-lg bg-[#FFF1D6] hover:bg-[#FFE8C7] border border-[#E8B968] text-slate-650 hover:text-slate-900 flex items-center justify-center transition flex-shrink-0"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <ChevronsRight className="w-4 h-4" strokeWidth={2.5} />
          </button>
        )}

        {/* Admin role badge (redesigned with saffron/gold aesthetic) */}
        {!collapsed && (
          <div className="mx-3 mt-4 mb-2 p-3 rounded-2xl bg-white border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-16 h-16 bg-[#FF6A1F]/5 rounded-full blur-xl pointer-events-none" />
            <div className="relative flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8.5 h-8.5 rounded-xl bg-[#FFF1D6] border border-[#E8B968] flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Crown className="w-4 h-4 text-[#B8651A]" strokeWidth={2.2} />
                </div>
                <div className="flex flex-col leading-none min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#B8651A]">SUPER ADMIN</span>
                  <span className="text-[9px] text-slate-400 font-semibold mt-0.5">Admin Panel</span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#B8651A]" strokeWidth={2.5} />
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="relative flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {GROUPS.map((group) => {
            const groupColors: Record<string, string> = {
              Main: "text-[#0E8A4B]",
              Analytics: "text-[#FF6A1F]",
              Settings: "text-[#3C50E0]",
            };
            return (
              <div key={group.label} className="space-y-1">
                {!collapsed && (
                  <p className={cn("text-[10px] font-extrabold uppercase tracking-[0.2em] px-3 mb-2", groupColors[group.label] || "text-slate-400")}>
                    {group.label}
                  </p>
                )}
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path
                    || (item.path !== "/admin/dashboard" && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.path + item.label}
                      to={item.path}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "relative w-full h-10 rounded-xl flex items-center gap-3 px-3 transition-all group overflow-hidden",
                        isActive
                          ? "bg-[#0E8A4B] text-white font-extrabold shadow-[0_3px_0_0_#073D22]"
                          : "text-slate-650 hover:bg-[#FFE8C7] hover:text-slate-900 font-semibold",
                        collapsed && "justify-center px-0"
                      )}
                    >
                      {isActive && (
                        <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 bg-[#FFD23F] shadow" />
                      )}
                      <item.icon
                        className={cn(
                          "flex-shrink-0 transition-transform group-hover:scale-105", 
                          collapsed ? "w-[19px] h-[19px]" : "w-[18px] h-[18px]",
                          isActive ? "text-white" : "text-slate-500 group-hover:text-slate-900"
                        )}
                        strokeWidth={isActive ? 2.5 : 2.2}
                      />
                      {!collapsed && <span className="flex-1 text-left text-[13px] truncate">{item.label}</span>}
                      {item.badge && !collapsed && (
                        <span className={cn(
                          "min-w-[20px] h-[18px] px-1.5 rounded-full text-[9px] font-extrabold flex items-center justify-center",
                          isActive ? "bg-[#FFD23F] text-[#7A4A00]" : "bg-[#FF6A1F] text-white"
                        )}>
                          {item.badge}
                        </span>
                      )}
                      {collapsed && (
                        <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-[#0A3D24] text-white text-[11px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 shadow-lg">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Boost your engagement banner */}
        {!collapsed && (
          <div className="mx-3 mb-4 p-4 rounded-xl border-2 border-[#7A4A00] shadow-[0_3px_0_0_#7A4A00] bg-gradient-to-br from-[#0E8A4B] to-[#0A6E3C] text-white relative overflow-hidden group">
            <span className="absolute -top-3 -right-3 w-10 h-10 bg-[#FFD23F]/20 rounded-full blur-md pointer-events-none" />
            <div className="relative z-10 pr-10">
              <p className="text-[12.5px] font-extrabold leading-tight">Boost engagement</p>
              <p className="text-[9.5px] text-[#FFD23F] font-bold mt-0.5 tracking-wider uppercase">WhatsApp campaigns</p>
            </div>
            <div className="absolute right-2.5 bottom-2.5 w-7 h-7 rounded-lg bg-[#FFD23F] text-[#7A4A00] flex items-center justify-center flex-shrink-0 shadow-[0_2px_0_0_#B8860B] group-hover:scale-105 transition-transform">
              <Rocket className="w-4 h-4" strokeWidth={2.5} />
            </div>
          </div>
        )}

        {/* User menu */}
        <div className="p-2.5 border-t-2 border-[#E8B968] bg-white">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "w-full rounded-xl hover:bg-[#FFE8C7] border border-transparent hover:border-[#E8B968] transition-all flex items-center justify-between p-1.5",
                  collapsed && "justify-center"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative flex-shrink-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF6A1F] to-[#D4308E] text-white text-[11px] font-bold flex items-center justify-center shadow-md">
                      {initials}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                  </div>
                  {!collapsed && (
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[12px] font-bold truncate text-slate-800 leading-tight">{displayName}</p>
                      <p className="text-[9px] text-[#B8651A] truncate font-extrabold uppercase tracking-wider mt-0.5">{formatRole(role)}</p>
                    </div>
                  )}
                </div>
                {!collapsed && (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-60 bg-white border-slate-200 text-slate-800 shadow-xl rounded-xl">
              <DropdownMenuLabel className="text-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF6A1F] to-[#D4308E] text-white text-[11px] font-bold flex items-center justify-center">
                    {initials}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-semibold truncate">{displayName}</span>
                    <span className="text-[11px] text-slate-500 truncate font-normal">{user?.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-100" />
              <DropdownMenuItem asChild className="hover:bg-slate-50 focus:bg-slate-50">
                <Link to="/app/dashboard">
                  <LayoutDashboard className="w-4 h-4 mr-2 text-slate-500" />
                  Open customer app
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-100" />
              <DropdownMenuItem onClick={handleSignOut} className="text-rose-650 hover:bg-rose-50 focus:bg-rose-50">
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* 2FA warning banner */}
        {me.twoFactorEnabled === false && location.pathname !== "/admin/security" && (
          <div className="bg-amber-400 border-b border-amber-500 px-4 py-2.5 flex items-center justify-center gap-3 flex-wrap shadow-sm">
            <span className="inline-flex items-center gap-2 text-[12px] font-extrabold text-amber-950">
              <Lock className="w-3.5 h-3.5" strokeWidth={3} />
              Two-factor authentication is required for staff. Please enable it.
            </span>
            <Link
              to="/admin/security"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-950 text-amber-400 text-[11px] font-extrabold uppercase tracking-wider hover:bg-amber-900 transition"
            >
              Enable now →
            </Link>
          </div>
        )}
        <main className="flex-1 overflow-y-auto bg-slate-50/30">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
};
