import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { CreditCard, Loader2, IndianRupee, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PLAN_COLOR: Record<string, string> = {
  starter: "#3C50E0",
  growth: "#0E8A4B",
  enterprise: "#D4308E",
};

const AdminSubscriptions = () => {
  const [refundId, setRefundId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-subs"],
    queryFn: () => adminApi.subscriptions(),
  });

  const totalMrr = rows.reduce((sum, r) => sum + Number(r.mrrInr ?? 0), 0);

  const doRefund = async () => {
    if (!refundId) return;
    setSubmitting(true);
    try {
      await adminApi.refund(refundId, Number(amount), reason);
      toast.success("Refund queued in audit log");
      setRefundId(null);
      setAmount("");
      setReason("");
    } catch (e) { toast.error(String(e)); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="px-6 lg:px-10 py-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0E8A4B] to-[#0A6E3C] text-white flex items-center justify-center shadow-md">
          <CreditCard className="w-6 h-6" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-[26px] font-black tracking-tight">Subscriptions</h1>
          <p className="text-[12px] text-foreground/70 font-medium">
            {rows.length} paying accounts · ₹{totalMrr.toLocaleString("en-IN")} total MRR
          </p>
        </div>
      </div>

      <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_4px_0_0_#E8B968]">
        <div className="grid grid-cols-[1.6fr_120px_140px_120px_140px] gap-3 px-4 py-3 border-b-2 border-[#E8B968] bg-[#FFF1D6] text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A]">
          <div>Account</div>
          <div>Plan</div>
          <div>MRR</div>
          <div>Status</div>
          <div></div>
        </div>

        {isLoading && (
          <div className="px-4 py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#B8230C]" /></div>
        )}

        {!isLoading && rows.length === 0 && (
          <div className="px-4 py-16 text-center">
            <p className="text-[13px] font-extrabold">No paid subscriptions yet</p>
            <p className="text-[12px] text-foreground/60 mt-1">When customers upgrade from starter, they'll appear here.</p>
          </div>
        )}

        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-[1.6fr_120px_140px_120px_140px] gap-3 px-4 py-3 border-b border-[#E8B968]/40 last:border-b-0 items-center hover:bg-[#FFF6E8] transition">
            <div className="min-w-0">
              <p className="text-[13px] font-extrabold truncate">{r.name}</p>
              <p className="text-[11px] text-foreground/60 font-mono truncate">{r.email}</p>
            </div>
            <span className="inline-flex px-2 py-1 rounded-full text-white text-[10px] font-extrabold uppercase tracking-wider w-fit" style={{ background: PLAN_COLOR[r.plan] ?? "#7A1500" }}>
              {r.plan}
            </span>
            <span className="inline-flex items-center gap-1 text-[14px] font-black tabular-nums">
              <IndianRupee className="w-3.5 h-3.5 text-foreground/60" />
              {Number(r.mrrInr ?? 0).toLocaleString("en-IN")}
            </span>
            <span className={cn(
              "inline-flex px-2 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider w-fit border",
              r.status === "active" && "bg-[#E6F7EE] text-[#0E8A4B] border-[#0E8A4B]/30",
              r.status === "trial" && "bg-[#FFF1D6] text-[#B8651A] border-[#E8B968]",
              r.status === "suspended" && "bg-[#FCE5F0] text-[#D4308E] border-[#D4308E]/30",
              r.status === "cancelled" && "bg-[#E4E8FF] text-[#3C50E0] border-[#3C50E0]/30",
            )}>{r.status}</span>
            <div className="flex gap-1.5 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setRefundId(r.id); setAmount(""); setReason(""); }}>
                Refund
              </Button>
              <Button asChild size="sm">
                <Link to={`/admin/workspaces/${r.id}`}>
                  Open <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!refundId} onOpenChange={(o) => !o && setRefundId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue refund</DialogTitle>
            <DialogDescription>Logs to audit. Actual Razorpay refund wire-up coming with v1.1.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1999" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Reason (min 5 chars)</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Customer requested cancellation refund" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundId(null)}>Cancel</Button>
            <Button onClick={doRefund} disabled={submitting || !amount || reason.length < 5}>
              {submitting ? "Processing…" : "Issue refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubscriptions;
