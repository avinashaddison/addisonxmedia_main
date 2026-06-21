import { Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { ShieldCheck, Loader2, Check, Minus, Info } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { cn } from "@/lib/utils";

const ROLE_COLORS: Record<string, string> = {
  super_admin: "#0E8A4B", admin: "#6366F1", billing: "#FF6A1F", support: "#FFD23F", read_only: "#94A3B8",
};

const AdminPermissions = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-permissions"],
    queryFn: () => adminApi.permissions(),
  });

  const roles = data?.roles ?? [];
  const groups = data?.groups ?? [];

  return (
    <PageShell
      title="Permissions"
      subtitle="kaun sa role kya kar sakta hai — capability matrix"
      icon={<ShieldCheck className="w-5 h-5 text-white" strokeWidth={2.5} />}
    >
      <div className="max-w-6xl mx-auto space-y-5">
        {isLoading ? (
          <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0E8A4B]" /></div>
        ) : (
          <>
            {data?.note && (
              <div className="flex items-start gap-2.5 bg-[#FFF6E8] border-2 border-[#E8B968] rounded-2xl px-4 py-3 shadow-[0_3px_0_0_#E8B968]">
                <Info className="w-4 h-4 text-[#B8651A] flex-shrink-0 mt-0.5" strokeWidth={2.6} />
                <p className="text-[12px] font-semibold text-[#7A4A00] leading-snug">{data.note}</p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {roles.map((r) => (
                <div key={r.key} className="bg-white border-2 border-[#E8B968] rounded-2xl p-3.5 shadow-[0_4px_0_0_#E8B968]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ROLE_COLORS[r.key] ?? "#0E8A4B" }} />
                    <p className="text-[12px] font-black text-slate-850">{r.label}</p>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-1 leading-snug">{r.desc}</p>
                </div>
              ))}
            </div>

            <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_5px_0_0_#E8B968]">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#FFF6E8] border-b-2 border-[#E8B968]">
                      <th className="text-left px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-[#0A3D24] min-w-[220px]">Capability</th>
                      {roles.map((r) => (
                        <th key={r.key} className="px-3 py-3 text-[10px] font-extrabold uppercase tracking-wider text-[#0A3D24] text-center whitespace-nowrap">{r.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => (
                      <Fragment key={g.group}>
                        <tr>
                          <td colSpan={roles.length + 1} className="px-5 py-2 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 border-b border-slate-100">{g.group}</td>
                        </tr>
                        {g.capabilities.map((cap) => (
                          <tr key={cap.key} className="border-b border-slate-50 last:border-b-0 hover:bg-[#FFF6E8]/30 transition">
                            <td className="px-5 py-2.5 text-[12px] font-bold text-slate-700">{cap.label}</td>
                            {roles.map((r) => {
                              const allowed = cap.roles.includes(r.key);
                              return (
                                <td key={r.key} className="px-3 py-2.5 text-center">
                                  {allowed ? (
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#E6F7EE] mx-auto">
                                      <Check className="w-3.5 h-3.5 text-[#0A6E3C]" strokeWidth={3} />
                                    </span>
                                  ) : (
                                    <Minus className="w-3.5 h-3.5 text-slate-200 mx-auto" strokeWidth={3} />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
};

export default AdminPermissions;
