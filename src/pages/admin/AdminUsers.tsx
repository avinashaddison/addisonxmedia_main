// Users view — every user (customers + staff) in a flat list with role badges.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { Link } from "react-router-dom";
import { Users, Search, Loader2, ChevronRight, Mail, Crown, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";

const AdminUsers = () => {
  const [q, setQ] = useState("");
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-users", q],
    queryFn: () => adminApi.workspaces({ q: q || undefined, includeStaff: true }),
  });

  const customers = rows.filter((u) => !u.isStaff);
  const staff = rows.filter((u) => u.isStaff);

  return (
    <div className="px-6 lg:px-10 py-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#3C50E0] to-[#2533A8] text-white flex items-center justify-center shadow-md">
          <Users className="w-6 h-6" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-[26px] font-black tracking-tight">All users</h1>
          <p className="text-[12px] text-foreground/70 font-medium">
            {rows.length} total · {customers.length} customers · {staff.length} staff
          </p>
        </div>
      </div>

      <div className="bg-white border-2 border-[#E8B968] rounded-2xl p-3 mb-3 shadow-[0_3px_0_0_#E8B968]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B8651A]" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email…" className="pl-9" />
        </div>
      </div>

      <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_4px_0_0_#E8B968]">
        {isLoading && (
          <div className="px-4 py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#B8230C]" /></div>
        )}

        {!isLoading && rows.length === 0 && (
          <div className="px-6 py-16 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#FFF1D6] border-2 border-[#E8B968] flex items-center justify-center">
              <UserPlus className="w-7 h-7 text-[#B8651A]" strokeWidth={2.5} />
            </div>
            <p className="text-[14px] font-extrabold">
              {q ? "No matches for that search" : "No users yet"}
            </p>
            <p className="text-[12px] text-foreground/60 mt-1 max-w-md mx-auto leading-relaxed">
              {q
                ? "Try a different name or email."
                : "Once customers sign up at addisonx.in/auth, they appear here. To promote yourself to admin run: "}
              {!q && <code className="bg-[#FFF1D6] px-1.5 py-0.5 rounded font-mono text-[11px]">node promote-admin.mjs you@email.com</code>}
            </p>
          </div>
        )}

        {rows.map((u) => (
          <Link key={u.id} to={`/admin/workspaces/${u.id}`} className="flex items-center gap-3 px-4 py-3 border-b border-[#E8B968]/40 last:border-b-0 hover:bg-[#FFF6E8] transition">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD23F] to-[#E8B400] text-[#3D1A00] flex items-center justify-center text-[12px] font-extrabold shadow-md flex-shrink-0">
              {u.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-extrabold truncate flex items-center gap-2">
                {u.name}
                {u.isStaff && (
                  <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-[#B8230C] text-[#FFD23F] font-extrabold uppercase tracking-wider">
                    <Crown className="w-2.5 h-2.5" /> {u.adminRole?.replace("_", " ")}
                  </span>
                )}
              </p>
              <p className="text-[11px] text-foreground/60 flex items-center gap-1 font-mono truncate">
                <Mail className="w-3 h-3" /> {u.email}
              </p>
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/60">{u.plan}</span>
            <ChevronRight className="w-4 h-4 text-foreground/40" />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminUsers;
