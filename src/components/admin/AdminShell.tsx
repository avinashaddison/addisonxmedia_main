import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Building2, Users, CreditCard, ScrollText, ShieldCheck,
  Activity, Settings, LogOut, ChevronsLeft, ChevronsRight, Loader2,
  Crown, Lock, Shuffle, Brain, Sparkles,
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

/* Color-coded sections (mirrors the customer sidebar's group palette) */
type NavGroup = {
  label: string;
  color: string;
  items: { icon: typeof LayoutDashboard; label: string; path: string }[];
};

const GROUPS: NavGroup[] = [
  {
    label: "Operations",
    color: "text-[#0E8A4B]",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
      { icon: Building2, label: "Workspaces", path: "/admin/workspaces" },
      { icon: Users, label: "Users", path: "/admin/users" },
      { icon: Brain, label: "Agent Playground", path: "/admin/agent-playground" },
      { icon: Sparkles, label: "Marketing Agent", path: "/admin/marketing-agent" },
    ],
  },
  {
    label: "Billing",
    color: "text-[#FF6A1F]",
    items: [
      { icon: CreditCard, label: "Subscriptions", path: "/admin/subscriptions" },
    ],
  },
  {
    label: "Compliance",
    color: "text-[#D4308E]",
    items: [
      { icon: ScrollText, label: "Audit log", path: "/admin/audit" },
      { icon: ShieldCheck, label: "Staff", path: "/admin/staff" },
      { icon: Lock, label: "Security (2FA)", path: "/admin/security" },
    ],
  },
  {
    label: "System",
    color: "text-[#B8651A]",
    items: [
      { icon: Activity, label: "Health", path: "/admin/health" },
      { icon: Shuffle, label: "Chat ownership", path: "/admin/diagnostics" },
      { icon: ShieldCheck, label: "Meta API", path: "/admin/meta-api" },
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

  const role = me.adminRole;
  const initials = me.name.slice(0, 2).toUpperCase();
  const displayName = me.name || me.email.split("@")[0];

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/auth", { replace: true });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden text-slate-800 bg-slate-50/30">
      <aside
        className={cn(
          "bg-white/95 backdrop-blur-md border-r border-[#E8B968]/30 flex flex-col flex-shrink-0 transition-all duration-200 text-slate-650 shadow-[0_0_20px_-5px_rgba(0,0,0,0.04)]",
          collapsed ? "w-[72px]" : "w-[250px]"
        )}
      >
        {/* Logo header */}
        <div className="relative h-[72px] px-4 border-b border-[#E8B968]/20 bg-white flex items-center gap-2 flex-shrink-0 overflow-hidden">
          {/* Subtle brand saffron & emerald accent glows */}
          <div className="absolute -top-8 -left-8 w-24 h-24 bg-[#FFD23F]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-[#0E8A4B]/5 rounded-full blur-2xl pointer-events-none" />

          {collapsed ? (
            <Link to="/admin/dashboard" className="mx-auto hover:scale-105 transition-transform" aria-label="Admin home">
              <AddisonMark size={36} />
            </Link>
          ) : (
            <>
              <Link to="/admin/dashboard" className="flex-1 min-w-0 hover:opacity-90 transition relative" aria-label="Admin home">
                <AddisonLogo size={24} />
              </Link>
              <button
                onClick={() => setCollapsed(true)}
                className="relative ml-auto w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition flex-shrink-0"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <ChevronsLeft className="w-4 h-4" strokeWidth={2.2} />
              </button>
            </>
          )}
        </div>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="mt-3 mx-auto w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-850 flex items-center justify-center transition flex-shrink-0"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <ChevronsRight className="w-4 h-4" strokeWidth={2.2} />
          </button>
        )}

        {/* Admin role badge (redesigned with saffron/gold aesthetic) */}
        {!collapsed && (
          <div className="mx-3 mt-4 mb-2 p-3 rounded-xl bg-gradient-to-br from-[#FFF1D6] to-[#FFE9BD] border border-[#E8B968]/40 shadow-sm relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-16 h-16 bg-[#0E8A4B]/5 rounded-full blur-xl pointer-events-none" />
            <div className="relative flex items-center gap-2.5">
              <div className="w-7.5 h-7.5 rounded-lg bg-[#0E8A4B]/10 flex items-center justify-center flex-shrink-0">
                <Crown className="w-3.5 h-3.5 text-[#0E8A4B]" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col leading-none min-w-0 flex-1">
                <span className="text-[9px] uppercase tracking-[0.16em] font-extrabold text-[#B8651A]">Admin Panel</span>
                <span className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-800 mt-0.5 truncate">{formatRole(role)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="relative flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {GROUPS.map((group) => {
            const groupColors: Record<string, string> = {
              Operations: "text-[#0E8A4B]",
              Billing: "text-[#FF6A1F]",
              Compliance: "text-[#D4308E]",
              System: "text-[#B8651A]",
            };
            return (
              <div key={group.label} className="space-y-1.5">
                {!collapsed && (
                  <p className={cn("text-[9px] font-bold uppercase tracking-[0.2em] px-3 mb-2", groupColors[group.label] || "text-slate-400")}>
                    {group.label}
                  </p>
                )}
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path
                    || (item.path !== "/admin/dashboard" && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "relative w-full h-10 rounded-xl flex items-center gap-3 px-3 transition-all group overflow-hidden",
                        isActive
                          ? "bg-[#0E8A4B] text-white font-extrabold shadow-sm"
                          : "text-slate-650 hover:bg-[#FFE8C7]/30 hover:text-[#B8651A] font-semibold",
                        collapsed && "justify-center px-0"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "flex-shrink-0 transition-transform group-hover:scale-105", 
                          collapsed ? "w-[19px] h-[19px]" : "w-[18px] h-[18px]",
                          isActive ? "text-white" : "text-slate-500 group-hover:text-[#B8651A]"
                        )}
                        strokeWidth={isActive ? 2.5 : 2.2}
                      />
                      {!collapsed && <span className="flex-1 text-left text-[13px] truncate">{item.label}</span>}
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

        {/* Open-customer-app card (Light design with brand accents) */}
        {!collapsed ? (
          <div className="mx-3 mb-3">
            <Link
              to="/app/dashboard"
              className="block p-3 rounded-xl bg-[#E6F7EE]/30 hover:bg-[#E6F7EE]/50 border border-[#0E8A4B]/20 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0E8A4B]/15 text-[#0E8A4B] flex items-center justify-center shadow-sm flex-shrink-0 group-hover:bg-[#0E8A4B] group-hover:text-white transition">
                  <LayoutDashboard className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold leading-tight text-slate-700">Customer app</p>
                  <p className="text-[9px] text-[#0E8A4B] font-extrabold uppercase tracking-wider mt-0.5">Switch over →</p>
                </div>
              </div>
            </Link>
          </div>
        ) : (
          <div className="mb-3 mx-auto">
            <Link
              to="/app/dashboard"
              className="block w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-sm hover:bg-slate-100 transition"
              title="Open customer app"
            >
              <LayoutDashboard className="w-4 h-4 text-[#0E8A4B]" strokeWidth={2.2} />
            </Link>
          </div>
        )}

        {/* User menu */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "w-full rounded-xl hover:bg-[#FFE8C7]/30 transition-all flex items-center gap-2.5 p-1.5",
                  collapsed && "justify-center"
                )}
              >
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
        <main className="flex-1 overflow-y-auto bg-slate-50/50">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
};
