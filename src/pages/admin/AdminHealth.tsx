import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { Activity, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";

const ICON: Record<string, { Icon: typeof CheckCircle2; color: string; label: string }> = {
  ok:   { Icon: CheckCircle2,  color: "#0E8A4B", label: "Healthy" },
  warn: { Icon: AlertTriangle, color: "#FF6A1F", label: "Warning" },
  fail: { Icon: XCircle,       color: "#D4308E", label: "Down" },
};

const AdminHealth = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-health"],
    queryFn: () => adminApi.health(),
    refetchInterval: 30_000,
  });

  return (
    <div className="px-6 lg:px-10 py-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0E8A4B] to-[#16C172] text-white flex items-center justify-center shadow-md">
          <Activity className="w-6 h-6" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-[26px] font-black tracking-tight">System health</h1>
          <p className="text-[12px] text-foreground/70 font-medium">
            Upstream service status · refreshes every 30s {data?.timestamp && <>· last checked {new Date(data.timestamp).toLocaleTimeString("en-IN")}</>}
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#B8230C]" />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-3">
        {data?.checks.map((c) => {
          const i = ICON[c.status];
          return (
            <div key={c.service} className="bg-white border-2 rounded-2xl p-5 shadow-[0_4px_0_0_#E8B968]" style={{ borderColor: i.color }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-11 h-11 rounded-xl text-white flex items-center justify-center shadow-md" style={{ background: i.color }}>
                  <i.Icon className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-black truncate">{c.service}</p>
                  <p className="text-[11px] uppercase tracking-wider font-extrabold" style={{ color: i.color }}>
                    {i.label}{c.latencyMs > 0 && <> · {c.latencyMs}ms</>}
                  </p>
                </div>
              </div>
              {c.detail && <p className="text-[12px] text-foreground/70 font-medium">{c.detail}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminHealth;
