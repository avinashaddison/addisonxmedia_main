import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { LogIn, Loader2, ShieldCheck, Globe } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { cn } from "@/lib/utils";

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const shortAgent = (ua: string | null) => {
  if (!ua) return "—";
  if (/iphone|android|mobile/i.test(ua)) return "Mobile";
  const m = ua.match(/(Chrome|Firefox|Safari|Edg|Edge)\/?\s*([\d.]+)?/i);
  return m ? m[1].replace("Edg", "Edge") : "Browser";
};

const AdminLoginLogs = () => {
  const [staffOnly, setStaffOnly] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-login-logs", staffOnly],
    queryFn: () => adminApi.loginLogs({ limit: 200, staff: staffOnly || undefined }),
  });

  return (
    <PageShell
      title="Login Logs"
      subtitle="active aur recent sessions — security audit"
      icon={<LogIn className="w-5 h-5 text-white" strokeWidth={2.5} />}
      actions={
        <button
          onClick={() => setStaffOnly((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wider border-2 transition",
            staffOnly ? "bg-[#0E8A4B] border-[#0A6E3C] text-white shadow-[0_2px_0_0_#073D22]" : "bg-white border-[#E8B968] text-[#7A4A00] hover:bg-[#FFF1D6]"
          )}
        >
          <ShieldCheck className="w-4 h-4" strokeWidth={2.6} /> Sirf staff
        </button>
      }
    >
      <div className="max-w-6xl mx-auto">
        <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_5px_0_0_#E8B968]">
          <div className="grid grid-cols-[1.6fr_130px_110px_150px_90px] gap-3 px-5 py-3 border-b-2 border-[#E8B968] bg-[#FFF6E8] text-[10px] font-extrabold uppercase tracking-wider text-[#0A3D24]">
            <div>User</div><div>IP</div><div>Device</div><div>Started</div><div>Status</div>
          </div>

          {isLoading && <div className="px-4 py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0E8A4B]" /></div>}

          {!isLoading && rows.length === 0 && (
            <div className="px-6 py-16 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#FFF1D6] border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] flex items-center justify-center">
                <LogIn className="w-7 h-7 text-[#FF6A1F]" strokeWidth={2.2} />
              </div>
              <p className="text-[14px] font-black text-slate-800">Koi session nahi mila</p>
            </div>
          )}

          {rows.map((s) => (
            <div key={s.id} className="grid grid-cols-[1.6fr_130px_110px_150px_90px] gap-3 px-5 py-3 border-b border-slate-100 last:border-b-0 items-center hover:bg-[#FFF6E8]/30 transition">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-bold text-slate-850 truncate">{s.name ?? "—"}</p>
                  {s.isStaff && (
                    <span className="px-1.5 py-0.5 rounded bg-[#E6F7EE] text-[8px] font-extrabold uppercase tracking-wider text-[#0A6E3C]">{s.adminRole ?? "staff"}</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-mono truncate">{s.email ?? "—"}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-[12px] font-mono font-semibold text-slate-600 truncate"><Globe className="w-3 h-3 text-slate-400 flex-shrink-0" />{s.ipAddress ?? "—"}</span>
              <span className="text-[12px] font-semibold text-slate-600">{shortAgent(s.userAgent)}</span>
              <span className="text-[12px] font-semibold text-slate-500">{fmtDate(s.createdAt)}</span>
              <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider w-fit", s.active ? "bg-[#E6F7EE] text-[#0A6E3C]" : "bg-slate-100 text-slate-500")}>
                {s.active ? "Active" : "Expired"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
};

export default AdminLoginLogs;
