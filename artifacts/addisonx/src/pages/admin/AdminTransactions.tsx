import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { Receipt, Search, IndianRupee, Loader2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const STATUS: Record<string, string> = {
  completed: "bg-[#E6F7EE] text-[#0A6E3C]",
  pending: "bg-[#FFF1D6] text-[#7A4A00]",
  failed: "bg-rose-50 text-rose-600",
  refunded: "bg-slate-100 text-slate-500",
};

const FILTERS = ["all", "completed", "pending", "failed", "refunded"] as const;

const AdminTransactions = () => {
  const [status, setStatus] = useState<string>("all");
  const [q, setQ] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-transactions", status, q],
    queryFn: () => adminApi.financeTransactions({ status: status === "all" ? undefined : status, q: q || undefined, limit: 200 }),
  });

  return (
    <PageShell
      title="Transactions"
      subtitle="saare subscription payments & upgrades"
      icon={<Receipt className="w-5 h-5 text-white" strokeWidth={2.5} />}
    >
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setStatus(f)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[11px] font-extrabold uppercase tracking-wider border-2 transition capitalize",
                  status === f
                    ? "bg-[#0E8A4B] border-[#0A6E3C] text-white shadow-[0_2px_0_0_#073D22]"
                    : "bg-white border-[#E8B968] text-[#7A4A00] hover:bg-[#FFF1D6]"
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="naam, email ya ref..."
              className="pl-9 w-60 border-2 border-[#E8B968] rounded-xl text-[13px]"
            />
          </div>
        </div>

        <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_5px_0_0_#E8B968]">
          <div className="grid grid-cols-[1.6fr_120px_110px_100px_1fr] gap-3 px-5 py-3 border-b-2 border-[#E8B968] bg-[#FFF6E8] text-[10px] font-extrabold uppercase tracking-wider text-[#0A3D24]">
            <div>Client</div><div>Plan</div><div>Amount</div><div>Status</div><div>Date / Ref</div>
          </div>

          {isLoading && <div className="px-4 py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0E8A4B]" /></div>}

          {!isLoading && rows.length === 0 && (
            <div className="px-6 py-16 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#FFF1D6] border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] flex items-center justify-center">
                <Receipt className="w-7 h-7 text-[#FF6A1F]" strokeWidth={2.2} />
              </div>
              <p className="text-[14px] font-black text-slate-800">Koi transaction nahi mila</p>
              <p className="text-[12px] text-slate-400 mt-1">Filter ya search badal ke dekhein.</p>
            </div>
          )}

          {rows.map((t) => (
            <div key={t.id} className="grid grid-cols-[1.6fr_120px_110px_100px_1fr] gap-3 px-5 py-3 border-b border-slate-100 last:border-b-0 items-center hover:bg-[#FFF6E8]/30 transition">
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-slate-850 truncate">{t.name ?? "—"}</p>
                <p className="text-[11px] text-slate-400 font-mono truncate">{t.email ?? "—"}</p>
              </div>
              <div>
                <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600 capitalize">{t.targetPlan}</span>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5 capitalize">{t.billingCycle}</p>
              </div>
              <span className="inline-flex items-center gap-0.5 text-[13px] font-black text-slate-800 tabular-nums">
                <IndianRupee className="w-3 h-3 text-slate-400" />{Number(t.amountInr ?? 0).toLocaleString("en-IN")}
              </span>
              <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider w-fit", STATUS[t.status] ?? "bg-slate-100 text-slate-500")}>{t.status}</span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-slate-600">{fmtDate(t.completedAt ?? t.createdAt)}</p>
                {t.paymentRef && <p className="text-[10px] text-slate-400 font-mono truncate">{t.paymentRef}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
};

export default AdminTransactions;
