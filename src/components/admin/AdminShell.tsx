import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Building2, Users, CreditCard, ScrollText, ShieldCheck,
  Activity, Settings, LogOut, ChevronsLeft, ChevronsRight, Loader2,
  Crown, Lock,
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
    <div className="flex h-screen w-full overflow-hidden">
      <aside
        className={cn(
          "bg-[#FFF6E8] border-r-2 border-[#E8B968] flex flex-col flex-shrink-0 transition-all duration-200",
          collapsed ? "w-[72px]" : "w-[244px]"
        )}
      >
        {/* Logo header */}
        <div className="relative h-[72px] px-3 border-b-2 border-[#E8B968] bg-white flex items-center gap-2 flex-shrink-0 overflow-hidden">
          {/* Subtle accent glows */}
          <div className="absolute -top-8 -left-8 w-32 h-32 bg-[#FFD23F]/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-[#FF6A1F]/15 rounded-full blur-2xl pointer-events-none" />

          {collapsed ? (
            <Link to="/admin/dashboard" className="mx-auto hover:scale-105 transition-transform" aria-label="Admin home">
              <AddisonMark size={42} />
            </Link>
          ) : (
            <>
              <Link to="/admin/dashboard" className="flex-1 min-w-0 hover:opacity-90 transition relative" aria-label="Admin home">
                <AddisonLogo size={28} />
              </Link>
              <button
                onClick={() => setCollapsed(true)}
                className="relative ml-1 w-8 h-8 rounded-lg bg-[#FFF1D6] hover:bg-[#FFE8C7] border border-[#E8B968] text-foreground/70 hover:text-foreground flex items-center justify-center transition flex-shrink-0"
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
            className="mt-2 mx-auto w-8 h-8 rounded-lg bg-[#FFF1D6] hover:bg-[#FFE8C7] border border-[#E8B968] text-foreground/70 hover:text-foreground flex items-center justify-center transition flex-shrink-0"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <ChevronsRight className="w-4 h-4" strokeWidth={2.5} />
          </button>
        )}

        {/* Admin role badge — saffron sticker so admin mode is unmistakable */}
        {!collapsed && (
          <div className="mx-2.5 mt-3 mb-1 p-2.5 rounded-xl bg-gradient-to-br from-[#FF6A1F] to-[#E85C12] shadow-[0_3px_0_0_#B8420A] relative overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "10px 10px" }} />
            <div className="relative flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
                <Crown className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col leading-none min-w-0 flex-1">
                <span className="text-[9px] uppercase tracking-[0.16em] font-extrabold text-white/85">Admin panel</span>
                <span className="text-[11px] font-black uppercase tracking-[0.1em] text-white mt-0.5 truncate">{formatRole(role)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Nav — grouped, color-coded labels, emerald-fill active state, yellow diamond, 3D shadow */}
        <nav className="relative flex-1 overflow-y-auto py-3 px-2.5 space-y-5">
          {GROUPS.map((group) => (
            <div key={group.label} className="space-y-1">
              {!collapsed && (
                <p className={cn("text-[10px] font-extrabold uppercase tracking-[0.2em] px-2.5 mb-2", group.color)}>
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
                    <item.icon
                      className={cn("flex-shrink-0 transition-transform group-hover:scale-110", collapsed ? "w-[19px] h-[19px]" : "w-[18px] h-[18px]")}
                      strokeWidth={isActive ? 2.5 : 2.2}
                    />
                    {!collapsed && <span className="flex-1 text-left text-[13px] truncate">{item.label}</span>}
                    {collapsed && (
                      <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-[#0A3D24] text-white text-[11px] font-extrabold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 shadow-lg">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Open-customer-app card (mirrors Addison-AI card in customer sidebar) */}
        {!collapsed ? (
          <div className="mx-2.5 mb-2">
            <Link
              to="/app/dashboard"
              className="block p-3 rounded-xl bg-gradient-to-br from-[#0A3D24] to-[#0D4E2E] border-2 border-[#FFD23F] shadow-[0_3px_0_0_#072917] relative overflow-hidden hover:shadow-[0_1px_0_0_#072917] hover:translate-y-[2px] transition-all"
            >
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-[#FFD23F]/20 rounded-full blur-xl" />
              <div className="relative flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FFD23F] flex items-center justify-center text-[#7A4A00] shadow-md flex-shrink-0">
                  <LayoutDashboard className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-extrabold leading-tight text-white">Customer app</p>
                  <p className="text-[9px] text-[#FFD23F]/90 font-extrabold uppercase tracking-wider mt-0.5">Switch over →</p>
                </div>
              </div>
            </Link>
          </div>
        ) : (
          <div className="mb-2 mx-auto">
            <Link
              to="/app/dashboard"
              className="block w-9 h-9 rounded-xl bg-[#0A3D24] border-2 border-[#FFD23F] flex items-center justify-center shadow-md hover:scale-105 transition"
              title="Open customer app"
            >
              <LayoutDashboard className="w-4 h-4 text-[#FFD23F]" />
            </Link>
          </div>
        )}

        {/* User menu */}
        <div className="p-2.5 border-t-2 border-[#E8B968] bg-white">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "w-full rounded-xl hover:bg-[#FFE8C7] transition-all flex items-center gap-2.5 p-1.5",
                  collapsed && "justify-center"
                )}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6A1F] to-[#D4308E] text-white text-[12px] font-extrabold flex items-center justify-center shadow-md">
                    {initials}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#16C172] rounded-full border-2 border-white" />
                </div>
                {!collapsed && (
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[12px] font-extrabold truncate leading-tight">{displayName}</p>
                    <p className="text-[10px] text-[#B8651A] truncate font-extrabold uppercase tracking-wider mt-0.5">{formatRole(role)}</p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-60">
              <DropdownMenuLabel>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF6A1F] to-[#D4308E] text-white text-[12px] font-extrabold flex items-center justify-center">
                    {initials}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-semibold truncate">{displayName}</span>
                    <span className="text-[11px] text-muted-foreground truncate font-normal">{user?.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/app/dashboard">
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Open customer app
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

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* 2FA warning banner — only shown to staff without 2FA enabled */}
        {me.twoFactorEnabled === false && location.pathname !== "/admin/security" && (
          <div className="bg-[#FFD23F] border-b-2 border-[#E8B400] px-4 py-2.5 flex items-center justify-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-2 text-[12px] font-extrabold text-[#3D1A00]">
              <Lock className="w-3.5 h-3.5" strokeWidth={3} />
              Two-factor authentication is required for staff. Please enable it.
            </span>
            <Link
              to="/admin/security"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#3D1A00] text-[#FFD23F] text-[11px] font-extrabold uppercase tracking-wider hover:bg-[#7A4A00] transition"
            >
              Enable now →
            </Link>
          </div>
        )}
        <main className="flex-1 overflow-y-auto bg-[#FFF6E8]">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
};
