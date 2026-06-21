import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { ScrollText, Search, Loader2, Globe } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Input } from "@/components/ui/input";

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const actionStyle = (a: string) => {
  if (/delete|remove|suspend|revoke/i.test(a)) return "bg-rose-50 text-rose-600";
  if (/create|add|grant|approve/i.test(a)) return "bg-[#E6F7EE] text-[#0A6E3C]";
  if (/update|edit|change/i.test(a)) return "bg-[#FFF1D6] text-[#7A4A00]";
  return "bg-slate-100 text-slate-600";
};

const AdminActivityLogs = () => {
  const [q, setQ] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-activity-logs", q],
    queryFn: () => adminApi.activityLogs({ q: q || undefined, limit: 200 }),
  });

  return (
    <PageShell
      title="Activity Logs"
      subtitle="admin & system actions ka audit trail"
      icon={<ScrollText className="w-5 h-5 text-white" strokeWidth={2.5} />}
      actions={
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="action ya actor..." className="pl-9 w-56 border-2 border-[#E8B968] rounded-xl text-[13px]" />
        </div>
      }
    >
      <div className="max-w-6xl mx-auto">
        <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_5px_0_0_#E8B968]">
          <div className="grid grid-cols-[160px_1.4fr_1.2fr_120px_140px] gap-3 px-5 py-3 border-b-2 border-[#E8B968] bg-[#FFF6E8] text-[10px] font-extrabold uppercase tracking-wider text-[#0A3D24]">
            <div>Action</div><div>Actor</div><div>Resource</div><div>IP</div><div>Time</div>
          </div>

          {isLoading && <div className="px-4 py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0E8A4B]" /></div>}

          {!isLoading && rows.length === 0 && (
            <div className="px-6 py-16 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#FFF1D6] border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] flex items-center justify-center">
                <ScrollText className="w-7 h-7 text-[#FF6A1F]" strokeWidth={2.2} />
              </div>
              <p className="text-[14px] font-black text-slate-800">Abhi koi activity record nahi</p>
              <p className="text-[12px] text-slate-400 mt-1">Jaise hi admin actions honge, audit trail yahan banega.</p>
            </div>
          )}

          {rows.map((a) => (
            <div key={a.id} className="grid grid-cols-[160px_1.4fr_1.2fr_120px_140px] gap-3 px-5 py-3 border-b border-slate-100 last:border-b-0 items-center hover:bg-[#FFF6E8]/30 transition">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider w-fit ${actionStyle(a.action)}`}>{a.action}</span>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-slate-850 truncate">{a.name ?? "System"}</p>
                <p className="text-[11px] text-slate-400 font-mono truncate">{a.email ?? "—"}</p>
              </div>
              <div className="min-w-0">
                {a.resourceType ? (
                  <>
                    <p className="text-[12px] font-bold text-slate-600 capitalize truncate">{a.resourceType}</p>
                    {a.resourceId && <p className="text-[10px] text-slate-400 font-mono truncate">{a.resourceId}</p>}
                  </>
                ) : <span className="text-[12px] text-slate-300">—</span>}
              </div>
              <span className="inline-flex items-center gap-1 text-[12px] font-mono font-semibold text-slate-500 truncate"><Globe className="w-3 h-3 text-slate-400 flex-shrink-0" />{a.ipAddress ?? "—"}</span>
              <span className="text-[12px] font-semibold text-slate-500">{fmtDate(a.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
};

export default AdminActivityLogs;
