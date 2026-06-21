import { useQuery } from "@tanstack/react-query";
import { Wallet, Download, FileText, Handshake, ArrowDownLeft } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatINRFull, formatDate, downloadCsv } from "@/lib/format";
import { toast } from "sonner";
import type { PaymentsSummary } from "@/lib/api-types";

const usePayments = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["payments", user?.id],
    enabled: !!user,
    queryFn: () => api.getPayments() as Promise<PaymentsSummary>,
  });
};

export const PaymentsPage = () => {
  const { data, isLoading } = usePayments();
  const payments = data?.payments ?? [];

  const exportCsv = () => {
    if (payments.length === 0) { toast.error("No payments to export"); return; }
    downloadCsv(
      `payments-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Date", "Source", "Reference", "Contact", "Amount"],
      payments.map((p) => [formatDate(p.date), p.source, p.label, p.contact_name ?? "", Number(p.amount || 0)]),
    );
    toast.success(`Exported ${payments.length} payments`);
  };

  return (
    <PageShell
      title="Payments"
      subtitle="Saara paisa jo aaya — deals & invoices se"
      icon={<Wallet className="w-5 h-5" />}
      actions={<Button variant="outline" size="sm" className="gap-2" onClick={exportCsv}><Download className="w-3.5 h-3.5" /> Export</Button>}
    >
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-gradient-to-br from-[#0E8A4B] to-[#0A6E3C] text-white rounded-2xl shadow-[0_3px_0_0_#075230] p-4">
          <div className="flex items-center gap-2 mb-1.5 opacity-90">
            <ArrowDownLeft className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Received</span>
          </div>
          <div className="text-[26px] font-black tabular-nums leading-none">{formatINRFull(data?.total_received ?? 0)}</div>
        </div>
        <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/55 mb-1.5">Payments</div>
          <div className="text-[26px] font-black tabular-nums leading-none">{data?.count ?? 0}</div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
      ) : payments.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#FFF1D6] text-left text-[11px] font-bold uppercase tracking-wider text-foreground/55">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Source</th>
                  <th className="px-4 py-2.5">Reference</th>
                  <th className="px-4 py-2.5">Contact</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-[#F0DCB8] hover:bg-[#FFFBF2]">
                    <td className="px-4 py-3 text-foreground/60 whitespace-nowrap">{formatDate(p.date)}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded",
                        p.source === "deal" ? "bg-[#E6F7EE] text-[#0A6E3C]" : "bg-[#E4E8FF] text-[#3C50E0]",
                      )}>
                        {p.source === "deal" ? <Handshake className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                        {p.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{p.label}</td>
                    <td className="px-4 py-3 text-foreground/70">{p.contact_name ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-[#0E8A4B]">{formatINRFull(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageShell>
  );
};

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-[#FFF1D6] border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] flex items-center justify-center mb-5">
      <Wallet className="w-7 h-7 text-[#FF6A1F]" />
    </div>
    <h3 className="text-lg font-black mb-1">No payments yet</h3>
    <p className="text-sm font-semibold text-foreground/55 max-w-sm">
      When you win a deal or mark an invoice as paid, it shows up here as money received.
    </p>
  </div>
);

export default PaymentsPage;
