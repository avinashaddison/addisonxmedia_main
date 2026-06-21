import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { adminApi, RenewalRow } from "@/lib/admin-api";
import { RefreshCw, AlertTriangle, CalendarClock, IndianRupee, Loader2, ChevronRight } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { cn } from "@/lib/utils";

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

const daysFrom = (s: string | null, now: number) => {
  if (!s) return null;
  return Math.round((new Date(s).getTime() - now) / 86400000);
};

const Row = ({ r, now, overdue }: { r: RenewalRow; now: number; overdue: boolean }) => {
  const d = daysFrom(r.renewsAt, now);
  return (
    <Link
      to={`/admin/workspaces/${r.id}`}
      className="grid grid-cols-[1.8fr_100px_120px_130px_50px] gap-3 px-5 py-3 border-b border-slate-100 last:border-b-0 items-center hover:bg-[#FFF6E8]/40 transition group"
    >
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-slate-850 truncate group-hover:text-[#0E8A4B] transition">{r.name}</p>
        <p className="text-[11px] text-slate-400 font-mono truncate">{r.email}</p>
      </div>
      <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 w-fit">
        {r.plan}
      </span>
      <span className="inline-flex items-center gap-1 text-[13px] font-black text-slate-800 tabular-nums">
        <IndianRupee className="w-3 h-3 text-slate-400" />{Number(r.mrrInr ?? 0).toLocaleString("en-IN")}
      </span>
      <div className="flex flex-col">
        <span className="text-[12px] font-bold text-slate-700">{fmtDate(r.renewsAt)}</span>
        <span className={cn("text-[10px] font-extrabold uppercase tracking-wider", overdue ? "text-rose-600" : "text-[#B8651A]")}>
          {r.isTrial ? "Trial · " : ""}
          {d === null ? "—" : overdue ? `${Math.abs(d)} din late` : `${d} din baaki`}
        </span>
      </div>
      <span className="justify-self-end text-slate-400 group-hover:text-[#0E8A4B] transition"><ChevronRight className="w-4 h-4" /></span>
    </Link>
  );
};

const Section = ({
  title, icon, rows, now, overdue, emptyText, accent,
}: { title: string; icon: React.ReactNode; rows: RenewalRow[]; now: number; overdue: boolean; emptyText: string; accent: string }) => (
  <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_5px_0_0_#E8B968]">
    <div className={cn("px-5 py-3 flex items-center gap-2 border-b-2 border-[#E8B968]", accent)}>
      {icon}
      <h2 className="text-[13px] font-black tracking-tight">{title}</h2>
      <span className="ml-auto text-[11px] font-extrabold tabular-nums opacity-80">{rows.length}</span>
    </div>
    {rows.length === 0 ? (
      <div className="px-6 py-12 text-center text-[12px] font-semibold text-slate-400">{emptyText}</div>
    ) : (
      <div>
        <div className="grid grid-cols-[1.8fr_100px_120px_130px_50px] gap-3 px-5 py-2.5 bg-[#FFF6E8] text-[10px] font-extrabold uppercase tracking-wider text-[#0A3D24]">
          <div>Client</div><div>Plan</div><div>MRR</div><div>Renews</div><div></div>
        </div>
        {rows.map((r) => <Row key={r.id} r={r} now={now} overdue={overdue} />)}
      </div>
    )}
  </div>
);

const AdminRenewals = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-renewals"],
    queryFn: () => adminApi.renewals(),
  });

  const now = data ? new Date(data.now).getTime() : Date.now();
  const overdue = data?.overdue ?? [];
  const upcoming = data?.upcoming ?? [];

  return (
    <PageShell
      title="Renewals"
      subtitle="overdue aur agle 30 din ke renewals"
      icon={<RefreshCw className="w-5 h-5 text-white" strokeWidth={2.5} />}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {isLoading ? (
          <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0E8A4B]" /></div>
        ) : (
          <>
            <Section
              title="Overdue — turant follow-up karein"
              icon={<AlertTriangle className="w-4 h-4 text-rose-600" strokeWidth={2.6} />}
              rows={overdue}
              now={now}
              overdue
              emptyText="Koi overdue renewal nahi — sab up to date! 🎉"
              accent="bg-rose-50 text-rose-700"
            />
            <Section
              title="Agle 30 din"
              icon={<CalendarClock className="w-4 h-4 text-[#B8651A]" strokeWidth={2.6} />}
              rows={upcoming}
              now={now}
              overdue={false}
              emptyText="Agle 30 din mein koi renewal due nahi."
              accent="bg-[#FFF1D6] text-[#7A4A00]"
            />
          </>
        )}
      </div>
    </PageShell>
  );
};

export default AdminRenewals;
