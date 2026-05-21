import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, type AdminUpgradeRequest } from "@/lib/admin-api";
import { CreditCard, Loader2, IndianRupee, ArrowRight, Crown, Clock, CheckCircle2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const [paymentId, setPaymentId] = useState("");
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
      const r = await adminApi.refund(refundId, Number(amount), reason, paymentId.trim() || undefined);
      if (r.mode === "live") {
        toast.success("Razorpay refund initiated");
      } else {
        toast.message(r.note ?? "Audit-only refund logged");
      }
      setRefundId(null);
      setAmount("");
      setReason("");
      setPaymentId("");
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

      {/* Pending upgrade requests — manual fulfillment queue */}
      <PendingUpgradesPanel />


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
            <DialogDescription>
              Provide Razorpay <code className="bg-[#FFF1D6] px-1 rounded">pay_xxx</code> ID to hit live API.
              Leave blank to log to audit only. Razorpay live-mode toggle: Settings → Billing.
            </DialogDescription>
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
            <div className="space-y-1.5">
              <Label>Razorpay payment ID <span className="text-foreground/50 font-normal">(optional)</span></Label>
              <Input
                value={paymentId}
                onChange={(e) => setPaymentId(e.target.value)}
                placeholder="pay_NXqWxX2YzWxX2Y"
                className="font-mono"
              />
              <p className="text-[10px] text-foreground/60 font-medium">
                If provided + live mode is on + keys are configured, this will call Razorpay's refund API.
              </p>
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

// ─── Pending upgrade requests panel ──────────────────────────────────────────
// Shows every customer-submitted upgrade intent that's not yet completed.
// One-click "Activate plan" flips user.plan + completes the request (the
// only sanctioned path to change a paid customer's plan from admin).

const STATUS_TONE: Record<string, string> = {
  requested: "bg-[#FFEFE0] text-[#7A1500] border-[#FF6A1F]",
  contacted: "bg-[#FFF8DD] text-[#7A4A00] border-[#FFD23F]",
  paid:      "bg-[#E4E8FF] text-[#3C50E0] border-[#3C50E0]/30",
};
const TARGET_PLAN_COLOR: Record<string, string> = {
  starter: "#3C50E0",
  growth: "#0E8A4B",
  scale: "#D4308E",
  enterprise: "#7A1500",
};

const PendingUpgradesPanel = () => {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-upgrade-requests"],
    queryFn: () => adminApi.upgradeRequests(),
    refetchInterval: 30_000,
  });

  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [mrr, setMrr] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentId, setPaymentId] = useState("");

  const updateStatus = useMutation({
    mutationFn: (vars: { id: string; status: string }) =>
      adminApi.updateUpgradeRequest(vars.id, { status: vars.status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-upgrade-requests"] });
      toast.success("Status updated");
    },
    onError: (e) => toast.error(String(e)),
  });

  const activate = useMutation({
    mutationFn: (vars: { id: string; mrr_inr?: number; admin_notes?: string; razorpay_payment_id?: string }) =>
      adminApi.activateUpgrade(vars.id, vars),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["admin-upgrade-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-subs"] });
      toast.success(`Plan activated → ${r.plan} ✨`);
      setActivatingId(null);
      setMrr(""); setNotes(""); setPaymentId("");
    },
    onError: (e) => toast.error(String(e)),
  });

  const activatingRow = rows.find((r) => r.id === activatingId);

  // When opening dialog, pre-fill MRR based on target plan
  const openActivate = (r: AdminUpgradeRequest) => {
    setActivatingId(r.id);
    const monthly: Record<string, string> = { starter: "999", growth: "2999", scale: "7999" };
    const base = monthly[r.targetPlan] ?? "0";
    // Annual = monthly × 10 (12 months pay, 14 months access — effectively 14× monthly / 12 ≈ 0.83)
    // For MRR tracking, store the per-month equivalent.
    setMrr(base);
    setNotes("");
    setPaymentId("");
  };

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF6A1F] to-[#FFD23F] text-white flex items-center justify-center shadow-md">
            <Clock className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-[16px] font-black tracking-tight">Pending upgrade requests</h2>
            <p className="text-[11px] text-foreground/60 font-medium">
              Customers waiting for payment link or plan activation
            </p>
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-wider font-extrabold text-foreground/70 bg-[#FFF1D6] border border-[#E8B968] rounded px-2 py-1">
          {rows.length} pending
        </span>
      </div>

      <div className="bg-white border-2 border-[#FF6A1F]/30 rounded-2xl overflow-hidden shadow-[0_4px_0_0_#FFEFE0]">
        {isLoading ? (
          <div className="px-4 py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#B8230C]" /></div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <CheckCircle2 className="w-7 h-7 text-[#0E8A4B] mx-auto mb-2" />
            <p className="text-[13px] font-extrabold">No pending requests</p>
            <p className="text-[11px] text-foreground/60 mt-0.5">All customer upgrade requests have been processed.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E8B968]/40">
            {rows.map((r) => (
              <div key={r.id} className="px-4 py-3 grid grid-cols-1 lg:grid-cols-[1.8fr_160px_120px_140px_1fr] gap-3 items-center hover:bg-[#FFF6E8]/40 transition">
                <div className="min-w-0">
                  <p className="text-[13px] font-extrabold truncate">{r.userName ?? r.userEmail ?? r.userId}</p>
                  <p className="text-[11px] text-foreground/60 font-mono truncate">{r.userEmail}</p>
                  {r.customerNote && (
                    <p className="text-[10.5px] text-foreground/70 mt-1 italic line-clamp-2">"{r.customerNote}"</p>
                  )}
                </div>
                <div>
                  <p className="text-[9.5px] uppercase tracking-wider text-foreground/55 font-extrabold">Wants</p>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 mt-0.5 rounded-full text-white text-[11px] font-extrabold uppercase" style={{ background: TARGET_PLAN_COLOR[r.targetPlan] ?? "#7A1500" }}>
                    <Crown className="w-3 h-3" />
                    {r.targetPlan}
                  </span>
                  <p className="text-[10px] text-foreground/55 font-medium mt-1 capitalize">{r.billingCycle}</p>
                </div>
                <div>
                  <p className="text-[9.5px] uppercase tracking-wider text-foreground/55 font-extrabold">Currently</p>
                  <p className="text-[12px] font-extrabold capitalize">{r.currentPlan ?? "free"}</p>
                  <p className="text-[10px] text-foreground/55 font-medium">
                    {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <div>
                  <span className={cn("inline-flex px-2 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border", STATUS_TONE[r.status] ?? "bg-muted text-foreground border-foreground/30")}>
                    {r.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {r.status === "requested" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: r.id, status: "contacted" })}>
                      Mark contacted
                    </Button>
                  )}
                  <Button size="sm" onClick={() => openActivate(r)} className="bg-[#0E8A4B] hover:bg-[#0A6E3C] text-white gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Activate
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: r.id, status: "declined" })} className="text-foreground/55 hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activate dialog */}
      <Dialog open={!!activatingRow} onOpenChange={(o) => !o && setActivatingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate plan → {activatingRow?.targetPlan}</DialogTitle>
            <DialogDescription>
              Confirms payment received + flips <span className="font-mono">{activatingRow?.userEmail}</span> to the {activatingRow?.targetPlan} plan immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label>MRR (₹/month) <span className="text-foreground/50 font-normal">— for tracking</span></Label>
              <Input type="number" value={mrr} onChange={(e) => setMrr(e.target.value)} placeholder="2999" autoFocus />
              <p className="text-[10.5px] text-foreground/55 font-medium">
                Defaults to the plan's monthly price. Override if billing annually (e.g. ₹2,499 for Growth annual).
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Razorpay payment ID <span className="text-foreground/50 font-normal">(optional)</span></Label>
              <Input value={paymentId} onChange={(e) => setPaymentId(e.target.value)} placeholder="pay_NXqWxX2YzWxX2Y" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Admin notes <span className="text-foreground/50 font-normal">(optional)</span></Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="UPI received via Pay.in Razorpay link · invoice #2026/04/01" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivatingId(null)}>Cancel</Button>
            <Button
              onClick={() => activate.mutate({
                id: activatingRow!.id,
                mrr_inr: mrr ? Number(mrr) : undefined,
                admin_notes: notes.trim() || undefined,
                razorpay_payment_id: paymentId.trim() || undefined,
              })}
              disabled={activate.isPending}
              className="bg-[#0E8A4B] hover:bg-[#0A6E3C]"
            >
              {activate.isPending ? "Activating…" : `Activate ${activatingRow?.targetPlan} plan`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubscriptions;
