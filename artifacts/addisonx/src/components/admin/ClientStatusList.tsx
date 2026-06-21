import { ReactNode, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { adminApi, AdminWorkspace } from "@/lib/admin-api";
import { Search, Loader2, ChevronRight, IndianRupee } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/PageShell";

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-IN") : "—");

const STATUS_BADGE: Record<string, string> = {
  active: "bg-[#E6F7EE] border-[#0E8A4B]/20 text-[#0A6E3C]",
  trial: "bg-[#FFF1D6] border-[#E8B968]/30 text-[#B8651A]",
  suspended: "bg-rose-50 border-rose-200 text-rose-700",
  cancelled: "bg-slate-50 border-slate-200 text-slate-600",
};

type Props = {
  status: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  emptyTitle: string;
  emptyHint: string;
};

/**
 * Filtered client list reused by the Active / Suspended client pages. Pulls the
 * same /workspaces feed as the master list, scoped to a single account status.
 */
export const ClientStatusList = ({ status, title, subtitle, icon, emptyTitle, emptyHint }: Props) => {
  const [q, setQ] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-workspaces", q, status],
    queryFn: () => adminApi.workspaces({ q: q || undefined, status }),
  });

  const headerActions = (
    <div className="relative flex items-center">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Client search…"
        className="pl-9 pr-4 py-1.5 w-56 rounded-full border-2 border-[#E8B968] bg-white text-[12px] font-extrabold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#0E8A4B] transition-all"
      />
    </div>
  );

  return (
    <PageShell title={title} subtitle={`${rows.length} ${subtitle}`} icon={icon} actions={headerActions}>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_5px_0_0_#E8B968]">
          <div className="grid grid-cols-[1.8fr_110px_120px_120px_60px] gap-3 px-5 py-3.5 border-b-2 border-[#E8B968] bg-[#FFF6E8] text-[10px] font-extrabold uppercase tracking-wider text-[#0A3D24]">
            <div>Account</div>
            <div>Plan</div>
            <div>MRR</div>
            <div>Joined</div>
            <div></div>
          </div>

          {isLoading && (
            <div className="px-4 py-12 text-center">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0E8A4B]" />
            </div>
          )}

          {!isLoading && rows.length === 0 && (
            <div className="px-6 py-16 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#FFF1D6] border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] flex items-center justify-center">
                {icon}
              </div>
              <p className="text-[14px] font-black text-slate-800">{q ? "No matches" : emptyTitle}</p>
              <p className="text-[12px] text-slate-400 mt-1 max-w-md mx-auto">{q ? "Doosra search try karein." : emptyHint}</p>
            </div>
          )}

          {rows.map((w: AdminWorkspace) => (
            <Link
              key={w.id}
              to={`/admin/workspaces/${w.id}`}
              className="grid grid-cols-[1.8fr_110px_120px_120px_60px] gap-3 px-5 py-3 border-b border-slate-100 last:border-b-0 items-center hover:bg-[#FFF6E8]/40 transition group"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-slate-850 truncate group-hover:text-[#0E8A4B] transition">{w.name}</p>
                <p className="text-[11px] text-slate-400 font-mono truncate">{w.email}</p>
              </div>
              <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 w-fit">
                {w.plan}
              </span>
              <span className="inline-flex items-center gap-1 text-[13px] font-black text-slate-800 tabular-nums">
                <IndianRupee className="w-3 h-3 text-slate-400" />
                {Number(w.mrrInr ?? 0).toLocaleString("en-IN")}
              </span>
              <span className="text-[12px] text-slate-500 font-semibold">{fmtDate(w.createdAt)}</span>
              <span className="justify-self-end text-slate-400 group-hover:text-[#0E8A4B] transition-colors">
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
          ))}
        </div>
        <p className="text-center">
          <span className={cn("inline-flex px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wider", STATUS_BADGE[status] ?? STATUS_BADGE.active)}>
            {status} clients
          </span>
        </p>
      </div>
    </PageShell>
  );
};

export default ClientStatusList;
