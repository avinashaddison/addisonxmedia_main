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
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3.5 border-b border-slate-200/80 pb-5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex items-center justify-center shadow-sm">
          <Users className="w-5.5 h-5.5 text-indigo-400" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-[24px] font-black tracking-tight text-slate-900">All users</h1>
          <p className="text-[12px] text-slate-500 font-medium">
            {rows.length} total · {customers.length} customers · {staff.length} staff
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 mb-3 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-450" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email…" className="pl-9 border-slate-200 focus-visible:ring-indigo-600" />
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        {isLoading && (
          <div className="px-4 py-12 text-center">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-650" />
          </div>
        )}

        {!isLoading && rows.length === 0 && (
          <div className="px-6 py-16 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
              <UserPlus className="w-7 h-7 text-slate-400" strokeWidth={2.2} />
            </div>
            <p className="text-[14px] font-bold text-slate-800">
              {q ? "No matches for that search" : "No users yet"}
            </p>
            <p className="text-[12px] text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
              {q
                ? "Try a different name or email."
                : "Once customers sign up at addisonx.in/auth, they appear here. To promote yourself to admin run: "}
              {!q && (
                <code className="bg-slate-50 border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[11px]">
                  node promote-admin.mjs you@email.com
                </code>
              )}
            </p>
          </div>
        )}

        {rows.map((u) => (
          <Link key={u.id} to={`/admin/workspaces/${u.id}`} className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-650 text-white flex items-center justify-center text-[12px] font-bold shadow-sm flex-shrink-0">
              {u.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-slate-800 truncate flex items-center gap-2">
                {u.name}
                {u.isStaff && (
                  <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold uppercase tracking-wider">
                    <Crown className="w-2.5 h-2.5" /> {u.adminRole?.replace("_", " ")}
                  </span>
                )}
              </p>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 font-mono truncate">
                <Mail className="w-3 h-3" /> {u.email}
              </p>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border border-slate-200 rounded px-2 py-0.5">{u.plan}</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminUsers;
