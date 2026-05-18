import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Building2, Users, CreditCard, ScrollText, ShieldCheck,
  Activity, Settings, LogOut, Lock, ChevronsLeft, ChevronsRight, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { AddisonLogo } from "@/components/brand/AddisonLogo";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
  { icon: Building2, label: "Workspaces", path: "/admin/workspaces" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: CreditCard, label: "Subscriptions", path: "/admin/subscriptions" },
  { icon: ScrollText, label: "Audit log", path: "/admin/audit" },
  { icon: ShieldCheck, label: "Staff", path: "/admin/staff" },
  { icon: Activity, label: "System health", path: "/admin/health" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
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

  // Client-side gate — fetch real admin profile. If 403, redirect to /app.
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
        <Loader2 className="w-6 h-6 animate-spin text-[#B8230C]" />
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
    <div className="flex h-screen w-full overflow-hidden bg-[#FFF6E8]">
      <aside
        className={cn(
          "bg-[#1F0808] flex flex-col flex-shrink-0 transition-all duration-200 border-r border-[#3D0808]",
          collapsed ? "w-[68px]" : "w-[232px]"
        )}
      >
        {/* Header — logo + collapse stacked cleanly */}
        <div className="relative h-16 flex items-center justify-between px-3 flex-shrink-0 border-b border-[#3D0808]">
          {collapsed ? (
            <Link to="/admin/dashboard" className="mx-auto" aria-label="Admin home">
              <span className="w-9 h-9 rounded-lg bg-[#FFD23F] text-[#3D1A00] flex items-center justify-center shadow-sm font-black text-sm">
                AX
              </span>
            </Link>
          ) : (
            <>
              <Link to="/admin/dashboard" className="flex-1 min-w-0 pt-0.5" aria-label="Admin home">
                <AddisonLogo size={20} />
              </Link>
              <button
                onClick={() => setCollapsed(true)}
                className="w-7 h-7 rounded-md text-[#FFD23F]/70 hover:text-[#FFD23F] hover:bg-[#3D0808] flex items-center justify-center transition flex-shrink-0"
                aria-label="Collapse sidebar"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="mt-3 mx-auto w-7 h-7 rounded-md text-[#FFD23F]/70 hover:text-[#FFD23F] hover:bg-[#3D0808] flex items-center justify-center transition flex-shrink-0"
            aria-label="Expand sidebar"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        )}

        {/* ADMIN MODE pill — compact */}
        {!collapsed && (
          <div className="mx-3 mt-3 mb-1 px-2.5 py-2 rounded-lg bg-[#3D0808] border border-[#7A1500] flex items-center gap-2">
            <Lock className="w-3 h-3 text-[#FFD23F] flex-shrink-0" strokeWidth={2.5} />
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[9px] uppercase tracking-[0.15em] font-bold text-[#FFD23F]/70">Admin mode</span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-white mt-0.5 truncate">{formatRole(role)}</span>
            </div>
          </div>
        )}

        {/* Nav — tighter spacing, simpler active state */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {NAV.map((it) => {
            const isActive = location.pathname === it.path
              || (it.path !== "/admin/dashboard" && location.pathname.startsWith(it.path));
            return (
              <Link
                key={it.path}
                to={it.path}
                title={collapsed ? it.label : undefined}
                className={cn(
                  "relative w-full h-9 rounded-md flex items-center gap-3 px-2.5 transition-colors text-[13px] font-semibold",
                  isActive
                    ? "bg-[#FF6A1F] text-white"
                    : "text-white/65 hover:bg-[#3D0808] hover:text-white",
                  collapsed && "justify-center px-0"
                )}
              >
                <it.icon className={cn("flex-shrink-0", collapsed ? "w-[17px] h-[17px]" : "w-[16px] h-[16px]")} strokeWidth={isActive ? 2.4 : 2} />
                {!collapsed && <span className="flex-1 text-left truncate">{it.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User card — compact */}
        <div className="p-2 border-t border-[#3D0808]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn("w-full rounded-md hover:bg-[#3D0808] transition flex items-center gap-2.5 p-1.5", collapsed && "justify-center")}>
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-[#FFD23F] text-[#3D1A00] text-[11px] font-extrabold flex items-center justify-center">
                    {initials}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-[#16C172] rounded-full border-2 border-[#1F0808]" />
                </div>
                {!collapsed && (
                  <div className="flex-1 min-w-0 text-left leading-tight">
                    <p className="text-[12px] font-bold text-white truncate">{displayName}</p>
                    <p className="text-[9px] text-[#FFD23F]/80 truncate font-extrabold uppercase tracking-[0.1em]">{formatRole(role)}</p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-60">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold truncate">{displayName}</span>
                  <span className="text-[11px] text-muted-foreground truncate font-normal">{user?.email}</span>
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
        {/* Slimmer ADMIN strip */}
        <div className="h-7 bg-[#7A1500] text-[#FFD23F] flex items-center justify-center text-[10px] font-extrabold uppercase tracking-[0.22em] flex-shrink-0">
          <span className="inline-flex items-center gap-2">
            <Lock className="w-3 h-3" strokeWidth={3} /> Admin panel · Addison X Media internal
          </span>
        </div>
        <main className="flex-1 overflow-y-auto bg-[#FFF6E8]">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
};
