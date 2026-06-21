import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { Activity, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { cn } from "@/lib/utils";

const ICON: Record<string, { Icon: typeof CheckCircle2; bg: string; border: string; text: string; label: string }> = {
  ok:   { Icon: CheckCircle2,  bg: "bg-[#E6F7EE]", border: "border-[#0E8A4B]", text: "text-[#0A6E3C]", label: "Healthy" },
  warn: { Icon: AlertTriangle, bg: "bg-[#FFF1D6]", border: "border-[#E8B968]", text: "text-[#B8651A]", label: "Warning" },
  fail: { Icon: XCircle,       bg: "bg-rose-50 border-rose-350", border: "border-rose-500", text: "text-rose-700", label: "Down" },
};

const AdminHealth = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-health"],
    queryFn: () => adminApi.health(),
    refetchInterval: 30_000,
  });

  return (
    <PageShell
      title="System Health"
      subtitle={`Upstream service status · refreshes every 30s ${data?.timestamp ? `· last checked ${new Date(data.timestamp).toLocaleTimeString("en-IN")}` : ""}`}
      icon={<Activity className="w-5 h-5 text-white" strokeWidth={2.5} />}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#0E8A4B]" />
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {!isLoading && data?.checks.map((c) => {
            const i = ICON[c.status] || ICON.ok;
            return (
              <div key={c.service} className="bg-white border-2 border-[#E8B968] rounded-2xl p-5 shadow-[0_4px_0_0_#E8B968] hover:-translate-y-0.5 active:translate-y-0 transition-all">
                <div className="flex items-center gap-3.5 mb-3">
                  <div className={cn("w-11 h-11 rounded-xl border-2 border-slate-900 flex items-center justify-center shadow-[0_2.5px_0_0_#000] flex-shrink-0", i.bg, i.text)}>
                    <i.Icon className="w-5 h-5" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-black text-slate-850 truncate capitalize">{c.service}</p>
                    <p className={cn("text-[11px] uppercase tracking-wider font-extrabold flex items-center gap-1", i.text)}>
                      <span>{i.label}</span>
                      {c.latencyMs > 0 && <span>· {c.latencyMs}ms latency</span>}
                    </p>
                  </div>
                </div>
                {c.detail && (
                  <div className="mt-3 p-3 bg-[#FFF6E8] border border-dashed border-[#E8B968] rounded-xl text-[11.5px] text-slate-650 font-mono leading-relaxed break-all">
                    {c.detail}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
};

export default AdminHealth;
