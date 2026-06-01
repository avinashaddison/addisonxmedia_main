import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, type AdminUpgradeRequest } from "@/lib/admin-api";
import { CreditCard, Loader2, IndianRupee, ArrowRight, Crown, Clock, CheckCircle2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PLAN_COLOR: Record<string, string> = {
  starter: "#4f46e5",
  growth: "#059669",
  scale: "#ea580c",
  enterprise: "#c026d3",
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
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 space-y-6">
      <div className="flex items-center gap-3.5 border-b border-slate-200/80 pb-5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex items-center justify-center shadow-sm">
          <CreditCard className="w-5.5 h-5.5 text-indigo-400" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-[24px] font-black tracking-tight text-slate-900">Subscriptions</h1>
          <p className="text-[12px] text-slate-500 font-medium">
            {rows.length} paying accounts · ₹{totalMrr.toLocaleString("en-IN")} total MRR
          </p>
        </div>
      </div>

      {/* Pending upgrade requests — manual fulfillment queue */}
      <PendingUpgradesPanel />

      {/* Subscriptions List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1.6fr_120px_140px_120px_140px] gap-3 px-5 py-3.5 border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <div>Account</div>
          <div>Plan</div>
          <div>MRR</div>
          <div>Status</div>
          <div></div>
        </div>

        {isLoading && (
          <div className="px-4 py-12 text-center">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-650" />
          </div>
        )}

        {!isLoading && rows.length === 0 && (
          <div className="px-4 py-16 text-center text-slate-400">
            <p className="text-[13px] font-bold text-slate-800">No paid subscriptions yet</p>
            <p className="text-[12px] text-slate-400 mt-1">When customers upgrade from starter, they'll appear here.</p>
          </div>
        )}

        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-[1.6fr_120px_140px_120px_140px] gap-3 px-5 py-3 border-b border-slate-100 last:border-b-0 items-center hover:bg-slate-50/50 transition">
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-slate-800 truncate">{r.name}</p>
              <p className="text-[11px] text-slate-400 font-mono truncate">{r.email}</p>
            </div>
            <span className="inline-flex px-2 py-0.5 rounded-full text-white text-[10px] font-bold uppercase tracking-wider w-fit" style={{ background: PLAN_COLOR[r.plan] ?? "#475569" }}>
              {r.plan}
            </span>
            <span className="inline-flex items-center gap-1 text-[14px] font-bold text-slate-850 tabular-nums">
              <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
              {Number(r.mrrInr ?? 0).toLocaleString("en-IN")}
            </span>
            <span className={cn(
              "inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit border",
              r.status === "active" && "bg-emerald-50 text-emerald-700 border-emerald-200",
              r.status === "trial" && "bg-amber-50 text-amber-700 border-amber-250",
              r.status === "suspended" && "bg-rose-50 text-rose-700 border-rose-250",
              r.status === "cancelled" && "bg-slate-50 text-slate-600 border-slate-205",
            )}>{r.status}</span>
            <div className="flex gap-1.5 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setRefundId(r.id); setAmount(""); setReason(""); }} className="border-slate-250 active:scale-[0.98]">
                Refund
              </Button>
              <Button asChild size="sm" className="bg-slate-900 hover:bg-slate-800 text-white active:scale-[0.98]">
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
              Provide Razorpay <code className="bg-slate-50 border border-slate-200 px-1 rounded">pay_xxx</code> ID to hit live API.
              Leave blank to log to audit only. Razorpay live-mode toggle: Settings → Billing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1999" autoFocus className="border-slate-250 focus-visible:ring-indigo-650" />
            </div>
            <div className="space-y-1.5">
              <Label>Reason (min 5 chars)</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Customer requested cancellation refund" className="border-slate-250 focus-visible:ring-indigo-650" />
            </div>
            <div className="space-y-1.5">
              <Label>Razorpay payment ID <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input
                value={paymentId}
                onChange={(e) => setPaymentId(e.target.value)}
                placeholder="pay_NXqWxX2YzWxX2Y"
                className="font-mono border-slate-250 focus-visible:ring-indigo-650"
              />
              <p className="text-[10px] text-slate-400 font-medium">
                If provided + live mode is on + keys are configured, this will call Razorpay's refund API.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundId(null)} className="border-slate-250">Cancel</Button>
            <Button onClick={doRefund} disabled={submitting || !amount || reason.length < 5} className="bg-rose-600 hover:bg-rose-700 text-white transition active:scale-[0.98]">
              {submitting ? "Processing…" : "Issue refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Pending upgrade requests panel ──────────────────────────────────────────

const STATUS_TONE: Record<string, string> = {
  requested: "bg-amber-50 text-amber-700 border-amber-200",
  contacted: "bg-indigo-50 text-indigo-700 border-indigo-200",
  paid:      "bg-emerald-50 text-emerald-705 border-emerald-250",
};

const TARGET_PLAN_COLOR: Record<string, string> = {
  starter: "#4f46e5",
  growth: "#059669",
  scale: "#ea580c",
  enterprise: "#c026d3",
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

  const openActivate = (r: AdminUpgradeRequest) => {
    setActivatingId(r.id);
    const monthly: Record<string, string> = { starter: "999", growth: "2999", scale: "7999" };
    const base = monthly[r.targetPlan] ?? "0";
    setMrr(base);
    setNotes("");
    setPaymentId("");
  };

  return (
    <div className="mb-5 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-indigo-400 border border-slate-800 flex items-center justify-center shadow-sm">
            <Clock className="w-4 h-4" strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="text-[16px] font-black tracking-tight text-slate-800">Pending upgrade requests</h2>
            <p className="text-[11px] text-slate-400 font-medium">
              Customers waiting for payment link or plan activation
            </p>
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded px-2.5 py-1">
          {rows.length} pending
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="px-4 py-12 text-center">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-650" />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto mb-2" />
            <p className="text-[13px] font-bold text-slate-800">No pending requests</p>
            <p className="text-[11px] text-slate-400 mt-0.5">All customer upgrade requests have been processed.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((r) => (
              <div key={r.id} className="px-5 py-3.5 grid grid-cols-1 lg:grid-cols-[1.8fr_160px_120px_140px_1fr] gap-3 items-center hover:bg-slate-50/50 transition">
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-slate-805 truncate">{r.userName ?? r.userEmail ?? r.userId}</p>
                  <p className="text-[11px] text-slate-450 font-mono truncate">{r.userEmail}</p>
                  {r.customerNote && (
                    <p className="text-[10.5px] text-slate-500 mt-1 italic line-clamp-2">"{r.customerNote}"</p>
                  )}
                </div>
                <div>
                  <p className="text-[9.5px] uppercase tracking-wider text-slate-400 font-bold">Wants</p>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 mt-0.5 rounded-full text-white text-[10px] font-bold uppercase" style={{ background: TARGET_PLAN_COLOR[r.targetPlan] ?? "#475569" }}>
                    <Crown className="w-3 h-3" />
                    {r.targetPlan}
                  </span>
                  <p className="text-[10px] text-slate-400 font-medium mt-1 capitalize">{r.billingCycle}</p>
                </div>
                <div>
                  <p className="text-[9.5px] uppercase tracking-wider text-slate-400 font-bold">Currently</p>
                  <p className="text-[12px] font-bold text-slate-700 capitalize">{r.currentPlan ?? "free"}</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <div>
                  <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", STATUS_TONE[r.status] ?? "bg-slate-50 text-slate-500 border-slate-200")}>
                    {r.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {r.status === "requested" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: r.id, status: "contacted" })} className="border-slate-250 text-slate-650 hover:bg-slate-50 active:scale-[0.98]">
                      Mark contacted
                    </Button>
                  )}
                  <Button size="sm" onClick={() => openActivate(r)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 active:scale-[0.98] transition">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Activate
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: r.id, status: "declined" })} className="text-slate-400 hover:text-slate-600 active:scale-[0.98]">
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
              <Label>MRR (₹/month) <span className="text-slate-400 font-normal">— for tracking</span></Label>
              <Input type="number" value={mrr} onChange={(e) => setMrr(e.target.value)} placeholder="2999" autoFocus className="border-slate-250 focus-visible:ring-indigo-650" />
              <p className="text-[10.5px] text-slate-400 font-medium">
                Defaults to the plan's monthly price. Override if billing annually (e.g. ₹2,499 for Growth annual).
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Razorpay payment ID <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input value={paymentId} onChange={(e) => setPaymentId(e.target.value)} placeholder="pay_NXqWxX2YzWxX2Y" className="font-mono border-slate-250 focus-visible:ring-indigo-650" />
            </div>
            <div className="space-y-1.5">
              <Label>Admin notes <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="UPI received via Pay.in Razorpay link · invoice #2026/04/01" className="border-slate-250 focus-visible:ring-indigo-650" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivatingId(null)} className="border-slate-250">Cancel</Button>
            <Button
              onClick={() => activate.mutate({
                id: activatingRow!.id,
                mrr_inr: mrr ? Number(mrr) : undefined,
                admin_notes: notes.trim() || undefined,
                razorpay_payment_id: paymentId.trim() || undefined,
              })}
              disabled={activate.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98] transition"
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
