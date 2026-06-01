import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { Activity, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ICON: Record<string, { Icon: typeof CheckCircle2; color: string; label: string }> = {
  ok:   { Icon: CheckCircle2,  color: "#10b981", label: "Healthy" },
  warn: { Icon: AlertTriangle, color: "#f97316", label: "Warning" },
  fail: { Icon: XCircle,       color: "#ef4444", label: "Down" },
};

const AdminHealth = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-health"],
    queryFn: () => adminApi.health(),
    refetchInterval: 30_000,
  });

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3.5 border-b border-slate-200/80 pb-5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex items-center justify-center shadow-sm">
          <Activity className="w-5.5 h-5.5 text-indigo-400" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-[24px] font-black tracking-tight text-slate-900">System health</h1>
          <p className="text-[12px] text-slate-500 font-medium">
            Upstream service status · refreshes every 30s {data?.timestamp && <>· last checked {new Date(data.timestamp).toLocaleTimeString("en-IN")}</>}
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-650" />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {data?.checks.map((c) => {
          const i = ICON[c.status];
          return (
            <div key={c.service} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-350 transition-colors">
              <div className="flex items-center gap-3.5 mb-3">
                <div className="w-11 h-11 rounded-xl border flex items-center justify-center shadow-sm" style={{ background: `${i.color}10`, borderColor: `${i.color}25`, color: i.color }}>
                  <i.Icon className="w-5 h-5" strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-black text-slate-800 truncate">{c.service}</p>
                  <p className="text-[11px] uppercase tracking-wider font-extrabold" style={{ color: i.color }}>
                    {i.label}{c.latencyMs > 0 && <> · {c.latencyMs}ms</>}
                  </p>
                </div>
              </div>
              {c.detail && <p className="text-[12px] text-slate-500 font-medium mt-1 leading-relaxed">{c.detail}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminHealth;
