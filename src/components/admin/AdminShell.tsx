import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Building2, Users, CreditCard, ScrollText, ShieldCheck,
  Activity, Settings, LogOut, Crown, Lock, ChevronsLeft, ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
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

export const AdminShell = ({ children }: { children?: ReactNode }) => {
  useForceLight();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("addisonx-admin-sidebar-collapsed") === "1";
  });

  useEffect(() => {
    window.localStorage.setItem("addisonx-admin-sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  // @ts-expect-error — user_metadata is BetterAuth-shaped
  const role = (user?.user_metadata?.admin_role ?? "super_admin") as string;
  const initials = (user?.email ?? "U").slice(0, 2).toUpperCase();
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Admin";

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/auth", { replace: true });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FFF6E8]">
      <aside
        className={cn(
          "bg-[#1A0808] border-r-2 border-[#7A1500] flex flex-col flex-shrink-0 transition-all duration-200",
          collapsed ? "w-[72px]" : "w-[244px]"
        )}
      >
        {/* Header */}
        <div className="relative h-[72px] px-3 border-b-2 border-[#7A1500] bg-[#3D0808] flex items-center gap-2 flex-shrink-0 overflow-hidden">
          <div className="absolute -top-8 -left-8 w-32 h-32 bg-[#FF6A1F]/15 rounded-full blur-2xl pointer-events-none" />
          {collapsed ? (
            <Link to="/admin/dashboard" className="mx-auto pt-1" aria-label="Admin home">
              <span className="relative inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6A1F] to-[#B8420A] shadow-md">
                <Crown className="w-5 h-5 text-white" strokeWidth={2.5} />
              </span>
            </Link>
          ) : (
            <>
              <Link to="/admin/dashboard" className="flex-1 min-w-0 pt-1 relative" aria-label="Admin home">
                <AddisonLogo size={22} />
              </Link>
              <button
                onClick={() => setCollapsed(true)}
                className="relative ml-1 w-8 h-8 rounded-lg bg-[#7A1500] hover:bg-[#B8230C] text-[#FFD23F] flex items-center justify-center transition flex-shrink-0"
                aria-label="Collapse sidebar"
              >
                <ChevronsLeft className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </>
          )}
        </div>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="mt-2 mx-auto w-8 h-8 rounded-lg bg-[#7A1500] hover:bg-[#B8230C] text-[#FFD23F] flex items-center justify-center transition flex-shrink-0"
            aria-label="Expand sidebar"
          >
            <ChevronsRight className="w-4 h-4" strokeWidth={2.5} />
          </button>
        )}

        {/* ADMIN MODE strip */}
        {!collapsed && (
          <div className="mx-2.5 mt-3 mb-1 p-2.5 rounded-xl bg-gradient-to-br from-[#B8230C] to-[#7A1500] border-2 border-[#FFD23F] shadow-[0_3px_0_0_#3D0808] relative overflow-hidden">
            <div className="absolute inset-0 opacity-15" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #FFD23F 1px, transparent 0)", backgroundSize: "10px 10px" }} />
            <div className="relative flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-[#FFD23F]" strokeWidth={3} />
              <span className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-[#FFD23F]">Admin mode</span>
            </div>
            <p className="relative text-[10px] text-white/85 mt-0.5 font-extrabold uppercase tracking-wider">{role.replace("_", " ")}</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1">
          {NAV.map((it) => {
            const isActive = location.pathname.startsWith(it.path);
            return (
              <Link
                key={it.path}
                to={it.path}
                title={collapsed ? it.label : undefined}
                className={cn(
                  "relative w-full h-11 rounded-xl flex items-center gap-3 px-2.5 transition-all group overflow-hidden",
                  isActive
                    ? "bg-[#FF6A1F] text-white font-extrabold shadow-[0_3px_0_0_#7A1500]"
                    : "text-white/70 hover:bg-[#7A1500] hover:text-white font-semibold",
                  collapsed && "justify-center px-0"
                )}
              >
                {isActive && (
                  <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 bg-[#FFD23F] shadow" />
                )}
                <it.icon className={cn("flex-shrink-0", collapsed ? "w-[19px] h-[19px]" : "w-[18px] h-[18px]")} strokeWidth={isActive ? 2.5 : 2.2} />
                {!collapsed && <span className="flex-1 text-left text-[13px] truncate">{it.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User menu */}
        <div className="p-2.5 border-t-2 border-[#7A1500] bg-[#3D0808]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn("w-full rounded-xl hover:bg-[#7A1500] transition flex items-center gap-2.5 p-1.5", collapsed && "justify-center")}>
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD23F] to-[#E8B400] text-[#3D1A00] text-[12px] font-extrabold flex items-center justify-center shadow-md">
                    {initials}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#16C172] rounded-full border-2 border-[#3D0808]" />
                </div>
                {!collapsed && (
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[12px] font-extrabold text-white truncate leading-tight">{displayName}</p>
                    <p className="text-[10px] text-[#FFD23F] truncate font-extrabold uppercase tracking-wider">{role.replace("_", " ")}</p>
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
        {/* ADMIN strip */}
        <div className="h-9 bg-gradient-to-r from-[#7A1500] via-[#B8230C] to-[#7A1500] text-[#FFD23F] flex items-center justify-center text-[11px] font-extrabold uppercase tracking-[0.22em] flex-shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 opacity-15" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #FFD23F 1px, transparent 0)", backgroundSize: "10px 10px" }} />
          <span className="relative inline-flex items-center gap-2">
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
