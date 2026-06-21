import { useQuery } from "@tanstack/react-query";
import { adminApi, SupportTicketRow } from "@/lib/admin-api";
import { LifeBuoy, CircleDot, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminScaffoldShell } from "@/components/admin/AdminScaffoldShell";

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-IN") : "—");

const PRIORITY: Record<string, string> = {
  urgent: "bg-rose-50 border-rose-200 text-rose-700",
  high: "bg-[#FFF1D6] border-[#E8B968]/40 text-[#B8651A]",
  medium: "bg-[#FFF6E8] border-[#E8B968]/30 text-[#7A4A00]",
  low: "bg-slate-50 border-slate-200 text-slate-600",
};

const STATUS: Record<string, string> = {
  open: "bg-[#E6F7EE] border-[#0E8A4B]/20 text-[#0A6E3C]",
  pending: "bg-[#FFF1D6] border-[#E8B968]/40 text-[#B8651A]",
  resolved: "bg-slate-50 border-slate-200 text-slate-600",
  closed: "bg-slate-50 border-slate-200 text-slate-600",
};

const SupportTickets = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-support-tickets"],
    queryFn: () => adminApi.supportTickets(),
  });

  const tickets = data?.tickets ?? [];
  const countFor = (status: string) =>
    data?.counts.find((c) => c.status === status)?.count ?? 0;

  const table =
    tickets.length > 0 ? (
      <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_5px_0_0_#E8B968]">
        <div className="grid grid-cols-[2fr_1fr_100px_100px_1.4fr_110px] gap-3 px-5 py-3.5 border-b-2 border-[#E8B968] bg-[#FFF6E8] text-[10px] font-extrabold uppercase tracking-wider text-[#0A3D24]">
          <div>Subject</div>
          <div>Category</div>
          <div>Priority</div>
          <div>Status</div>
          <div>Client</div>
          <div>Created</div>
        </div>
        {tickets.map((t: SupportTicketRow) => (
          <div
            key={t.id}
            className="grid grid-cols-[2fr_1fr_100px_100px_1.4fr_110px] gap-3 px-5 py-3 border-b border-slate-100 last:border-b-0 items-center hover:bg-[#FFF6E8]/30 transition"
          >
            <p className="text-[13px] font-bold text-slate-850 truncate">{t.subject}</p>
            <span className="text-[12px] font-semibold text-slate-600 truncate">{t.category}</span>
            <span
              className={cn(
                "inline-flex px-2 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wider w-fit",
                PRIORITY[t.priority] ?? "bg-slate-50 border-slate-200 text-slate-600"
              )}
            >
              {t.priority}
            </span>
            <span
              className={cn(
                "inline-flex px-2 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wider w-fit",
                STATUS[t.status] ?? "bg-slate-50 border-slate-200 text-slate-600"
              )}
            >
              {t.status}
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-bold text-slate-800 truncate">{t.name ?? "—"}</p>
              <p className="text-[11px] text-slate-400 font-mono truncate">{t.email ?? "—"}</p>
            </div>
            <span className="text-[12px] text-slate-500 font-semibold">{fmtDate(t.createdAt)}</span>
          </div>
        ))}
      </div>
    ) : undefined;

  return (
    <AdminScaffoldShell
      title="Support Tickets"
      subtitle="Clients ke support requests ek queue mein"
      icon={<LifeBuoy className="w-5 h-5 text-white" strokeWidth={2.5} />}
      isLoading={isLoading}
      stats={[
        { label: "Open", value: countFor("open"), icon: <CircleDot className="w-4 h-4" strokeWidth={2.4} /> },
        { label: "Pending", value: countFor("pending"), icon: <Clock className="w-4 h-4" strokeWidth={2.4} /> },
        { label: "Resolved", value: countFor("resolved"), icon: <CheckCircle2 className="w-4 h-4" strokeWidth={2.4} /> },
      ]}
      emptyTitle="Abhi koi ticket nahi"
      emptyHint="Jab clients support ticket raise karenge, woh yahaan priority ke saath dikhne lagenge. Filhaal sab clear hai!"
      emptyIcon={<LifeBuoy className="w-7 h-7 text-[#FF6A1F]" strokeWidth={2.2} />}
    >
      {table}
    </AdminScaffoldShell>
  );
};

export default SupportTickets;
