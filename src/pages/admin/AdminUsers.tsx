// Users view — every user (customers + staff) in a flat list with role badges.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { Link } from "react-router-dom";
import { Users, Search, Loader2, ChevronRight, Mail, Crown, UserPlus, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/PageShell";
import { cn } from "@/lib/utils";

const PLAN_BADGES = {
  free: "bg-slate-50 border-2 border-slate-300 text-slate-650 shadow-[0_2px_0_0_#cbd5e1]",
  starter: "bg-[#E6F0FA] border-2 border-[#3C50E0]/60 text-[#2533A8] shadow-[0_2px_0_0_#cbd5e1]",
  growth: "bg-[#E6F7EE] border-2 border-[#0E8A4B]/60 text-[#0A6E3C] shadow-[0_2px_0_0_#cbd5e1]",
  scale: "bg-[#FFF1D6] border-2 border-[#FF6A1F]/60 text-[#B8420A] shadow-[0_2px_0_0_#cbd5e1]",
  enterprise: "bg-[#FDF0F5] border-2 border-[#D4308E]/60 text-[#A11A6A] shadow-[0_2px_0_0_#cbd5e1]",
} as const;

const AdminUsers = () => {
  const [q, setQ] = useState("");
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-users", q],
    queryFn: () => adminApi.workspaces({ q: q || undefined, includeStaff: true }),
  });

  const customers = rows.filter((u) => !u.isStaff);
  const staff = rows.filter((u) => u.isStaff);

  const headerActions = (
    <div className="relative flex items-center">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search users or email…"
        className="pl-9 pr-4 py-1.5 w-64 rounded-full border-2 border-[#E8B968] bg-white text-[12px] font-extrabold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#0E8A4B] transition-all"
      />
    </div>
  );

  return (
    <PageShell
      title="All Users"
      subtitle={`${rows.length} total · ${customers.length} customers · ${staff.length} staff`}
      icon={<Users className="w-5 h-5 text-white" strokeWidth={2.5} />}
      actions={headerActions}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Table/List Container */}
        <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_5px_0_0_#E8B968]">
          <div className="grid grid-cols-[1.5fr_1.5fr_1fr_120px_40px] gap-3 px-5 py-3.5 border-b-2 border-[#E8B968] bg-[#FFF6E8] text-[10px] font-extrabold uppercase tracking-wider text-[#0A3D24]">
            <div>User & Account</div>
            <div>Email Address</div>
            <div>Role / Type</div>
            <div>Plan</div>
            <div></div>
          </div>

          {isLoading && (
            <div className="px-4 py-12 text-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0E8A4B]" />
            </div>
          )}

          {!isLoading && rows.length === 0 && (
            <div className="px-6 py-16 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] flex items-center justify-center">
                <UserPlus className="w-7 h-7 text-[#B8651A]" strokeWidth={2.2} />
              </div>
              <p className="text-[14px] font-black text-slate-800">
                {q ? "No matches for that search" : "No users found"}
              </p>
              <p className="text-[12px] text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                {q ? (
                  "Try searching for another name or email."
                ) : (
                  <>
                    Once users sign up, they will appear here. To promote yourself to admin, run:{" "}
                    <code className="bg-[#FFF6E8] border border-[#E8B968] text-[#B8420A] px-1.5 py-0.5 rounded font-mono text-[11px] font-bold">
                      node promote-admin.mjs you@email.com
                    </code>
                  </>
                )}
              </p>
            </div>
          )}

          {!isLoading && rows.map((u) => {
            const planKey = (u.plan || "free").toLowerCase() as keyof typeof PLAN_BADGES;
            const planBadgeClass = PLAN_BADGES[planKey] || PLAN_BADGES.free;

            // Generate a random background color for avatar if desired, or use deterministic
            const colors = ["bg-[#FF6A1F]", "bg-[#0E8A4B]", "bg-[#3C50E0]", "bg-[#D4308E]", "bg-[#E8B968]"];
            const colorIndex = (u.name.charCodeAt(0) + (u.name.charCodeAt(1) || 0)) % colors.length;
            const avatarBg = colors[colorIndex];

            return (
              <div
                key={u.id}
                className="grid grid-cols-[1.5fr_1.5fr_1fr_120px_40px] gap-3 px-5 py-3.5 border-b border-slate-100 last:border-b-0 items-center hover:bg-[#FFF6E8]/30 transition"
              >
                <Link to={`/admin/workspaces/${u.id}`} className="flex items-center gap-3 min-w-0 group">
                  <div className={cn("w-9 h-9 rounded-xl border-2 border-slate-900 text-white font-black flex items-center justify-center text-[12px] shadow-[0_2px_0_0_#000] flex-shrink-0", avatarBg)}>
                    {u.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-slate-850 truncate group-hover:text-[#0E8A4B] transition">
                      {u.name}
                    </p>
                    <p className="text-[11px] text-slate-400 font-semibold truncate">Workspace ID: {u.id.slice(0, 8)}...</p>
                  </div>
                </Link>

                <div className="min-w-0 font-mono text-[11px] text-slate-650 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{u.email}</span>
                </div>

                <div>
                  {u.isStaff ? (
                    <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-lg bg-[#D4308E] border-2 border-[#A11A6A] text-white font-extrabold uppercase tracking-wider shadow-[0_2px_0_0_#5E0B3B]">
                      <Crown className="w-2.5 h-2.5" />
                      {u.adminRole?.replace("_", " ") || "STAFF"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-lg bg-[#E6F7EE] border-2 border-[#0E8A4B]/60 text-[#0A6E3C] font-extrabold uppercase tracking-wider shadow-[0_2px_0_0_#cbd5e1]">
                      Customer
                    </span>
                  )}
                </div>

                <div>
                  <span className={cn("inline-flex px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider w-fit", planBadgeClass)}>
                    {u.plan}
                  </span>
                </div>

                <div className="justify-self-end">
                  <Link to={`/admin/workspaces/${u.id}`} className="text-slate-400 hover:text-[#0E8A4B] transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
};

export default AdminUsers;
