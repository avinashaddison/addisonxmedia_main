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
import { PageShell } from "@/components/PageShell";

const PLAN_BADGES = {
  free: "bg-slate-50 border-2 border-slate-300 text-slate-650 shadow-[0_2px_0_0_#cbd5e1]",
  starter: "bg-[#E6F0FA] border-2 border-[#3C50E0]/60 text-[#2533A8] shadow-[0_2px_0_0_#cbd5e1]",
  growth: "bg-[#E6F7EE] border-2 border-[#0E8A4B]/60 text-[#0A6E3C] shadow-[0_2px_0_0_#cbd5e1]",
  scale: "bg-[#FFF1D6] border-2 border-[#FF6A1F]/60 text-[#B8420A] shadow-[0_2px_0_0_#cbd5e1]",
  enterprise: "bg-[#FDF0F5] border-2 border-[#D4308E]/60 text-[#A11A6A] shadow-[0_2px_0_0_#cbd5e1]",
} as const;

const SUBS_STATUS = {
  active: "bg-[#E6F7EE] border-2 border-[#0E8A4B]/50 text-[#0A6E3C] shadow-[0_2px_0_0_#cbd5e1]",
  trial: "bg-[#FFF1D6] border-2 border-[#E8B968]/50 text-[#B8651A] shadow-[0_2px_0_0_#cbd5e1]",
  suspended: "bg-rose-50 border-2 border-rose-300 text-rose-700 shadow-[0_2px_0_0_#cbd5e1]",
  cancelled: "bg-slate-50 border-2 border-slate-300 text-slate-600 shadow-[0_2px_0_0_#cbd5e1]",
} as const;

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
    <PageShell
      title="Subscriptions"
      subtitle={`${rows.length} paying accounts · ₹${totalMrr.toLocaleString("en-IN")} total MRR`}
      icon={<CreditCard className="w-5 h-5 text-white" strokeWidth={2.5} />}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Pending upgrade requests — manual fulfillment queue */}
        <PendingUpgradesPanel />

        {/* Subscriptions List */}
        <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_5px_0_0_#E8B968]">
          <div className="grid grid-cols-[1.6fr_120px_140px_120px_160px] gap-3 px-5 py-3.5 border-b-2 border-[#E8B968] bg-[#FFF6E8] text-[10px] font-extrabold uppercase tracking-wider text-[#0A3D24]">
            <div>Account</div>
            <div>Plan</div>
            <div>MRR</div>
            <div>Status</div>
            <div></div>
          </div>

          {isLoading && (
            <div className="px-4 py-12 text-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0E8A4B]" />
            </div>
          )}

          {!isLoading && rows.length === 0 && (
            <div className="px-4 py-16 text-center">
              <p className="text-[13px] font-black text-slate-800">No paid subscriptions yet</p>
              <p className="text-[12px] text-slate-450 mt-1">When customers upgrade from starter, they'll appear here.</p>
            </div>
          )}

          {!isLoading && rows.map((r) => {
            const planKey = (r.plan || "free").toLowerCase() as keyof typeof PLAN_BADGES;
            const planBadge = PLAN_BADGES[planKey] || PLAN_BADGES.free;
            const statusKey = (r.status || "active").toLowerCase() as keyof typeof SUBS_STATUS;
            const statusBadge = SUBS_STATUS[statusKey] || SUBS_STATUS.active;

            return (
              <div
                key={r.id}
                className="grid grid-cols-[1.6fr_120px_140px_120px_160px] gap-3 px-5 py-3.5 border-b border-slate-100 last:border-b-0 items-center hover:bg-[#FFF6E8]/30 transition"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-slate-850 truncate">{r.name}</p>
                  <p className="text-[11px] text-slate-400 font-mono truncate">{r.email}</p>
                </div>
                <div>
                  <span className={cn("inline-flex px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider w-fit", planBadge)}>
                    {r.plan}
                  </span>
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 text-[13px] font-black text-slate-800 tabular-nums">
                    <IndianRupee className="w-3 h-3 text-slate-400" />
                    {Number(r.mrrInr ?? 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className={cn("inline-flex px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider w-fit", statusBadge)}>
                    {r.status}
                  </span>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setRefundId(r.id); setAmount(""); setReason(""); }}
                    className="px-3 py-1 rounded-xl text-[11px] font-extrabold bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] text-slate-700 hover:bg-[#FFF1D6] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] transition-all"
                  >
                    Refund
                  </button>
                  <button
                    as={Link}
                    className="px-3 py-1 rounded-xl text-[11px] font-extrabold bg-[#0E8A4B] border-2 border-[#0A6E3C] shadow-[0_2px_0_0_#073D22] text-white hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_1px_0_0_#073D22] transition-all flex items-center gap-1"
                  >
                    <Link to={`/admin/workspaces/${r.id}`} className="flex items-center gap-1">
                      Open <ArrowRight className="w-3 h-3" />
                    </Link>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <Dialog open={!!refundId} onOpenChange={(o) => !o && setRefundId(null)}>
          <DialogContent className="border-2 border-[#E8B968] shadow-[0_6px_0_0_#E8B968] bg-white rounded-2xl p-6 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-[18px] font-black text-slate-900">Issue refund</DialogTitle>
              <DialogDescription className="text-[12px] text-slate-500 font-semibold leading-relaxed mt-1">
                Provide Razorpay <code className="bg-[#FFF6E8] border border-[#E8B968] text-[#B8420A] px-1 rounded font-mono text-[11px] font-bold">pay_xxx</code> ID to hit live API.
                Leave blank to log to audit only. Razorpay live-mode toggle: Settings → Billing.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-extrabold uppercase tracking-wider text-[#B8651A]">Amount (₹)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1999"
                  autoFocus
                  className="border-2 border-[#E8B968] focus:border-[#0E8A4B] rounded-xl font-bold bg-white text-slate-800 text-[13px] h-10 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-extrabold uppercase tracking-wider text-[#B8651A]">Reason (min 5 chars)</Label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Customer requested cancellation refund"
                  className="border-2 border-[#E8B968] focus:border-[#0E8A4B] rounded-xl font-bold bg-white text-slate-800 text-[13px] h-10 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-extrabold uppercase tracking-wider text-[#B8651A]">
                  Razorpay payment ID <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </Label>
                <Input
                  value={paymentId}
                  onChange={(e) => setPaymentId(e.target.value)}
                  placeholder="pay_NXqWxX2YzWxX2Y"
                  className="font-mono border-2 border-[#E8B968] focus:border-[#0E8A4B] rounded-xl font-bold bg-white text-slate-800 text-[13px] h-10 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                  If provided + live mode is on + keys are configured, this will call Razorpay's refund API.
                </p>
              </div>
            </div>
            <DialogFooter className="mt-6 flex gap-2">
              <button
                onClick={() => setRefundId(null)}
                className="px-4 py-2 rounded-xl text-[12px] font-extrabold bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] text-slate-700 hover:bg-[#FFF1D6] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={doRefund}
                disabled={submitting || !amount || reason.length < 5}
                className="px-4 py-2 rounded-xl text-[12px] font-extrabold bg-[#D4308E] border-2 border-[#A11A6A] shadow-[0_2px_0_0_#5E0B3B] text-white hover:bg-[#A11A6A] active:translate-y-0.5 active:shadow-[0_1px_0_0_#5E0B3B] disabled:opacity-50 disabled:pointer-events-none transition-all"
              >
                {submitting ? "Processing…" : "Issue refund"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  );
};

// ─── Pending upgrade requests panel ──────────────────────────────────────────

const STATUS_TONE = {
  requested: "bg-[#FFF1D6] border-2 border-[#E8B968]/60 text-[#B8651A] shadow-[0_2px_0_0_#cbd5e1]",
  contacted: "bg-[#E6F0FA] border-2 border-[#3C50E0]/60 text-[#2533A8] shadow-[0_2px_0_0_#cbd5e1]",
  paid: "bg-[#E6F7EE] border-2 border-[#0E8A4B]/60 text-[#0A6E3C] shadow-[0_2px_0_0_#cbd5e1]",
  declined: "bg-rose-50 border-2 border-rose-300 text-rose-700 shadow-[0_2px_0_0_#cbd5e1]",
} as const;

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
    <div className="space-y-4 mb-8">
      {/* Title box */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-[#E8B968] border-2 border-slate-950 flex items-center justify-center shadow-[0_2px_0_0_#000] flex-shrink-0">
            <Clock className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-[16px] font-black text-slate-850">Pending upgrade requests</h2>
            <p className="text-[11px] text-slate-400 font-semibold leading-none mt-0.5">
              Customers waiting for payment link or plan activation
            </p>
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#B8651A] bg-[#FFF6E8] border-2 border-[#E8B968] rounded-xl px-3 py-1 shadow-[0_2px_0_0_#E8B968]">
          {rows.length} pending
        </span>
      </div>

      {/* Main List Container */}
      <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_4px_0_0_#E8B968]">
        {isLoading ? (
          <div className="px-4 py-12 text-center text-slate-450">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0E8A4B]" />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[#E6F7EE] border-2 border-[#0E8A4B] flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6 text-[#0A6E3C]" />
            </div>
            <p className="text-[13px] font-black text-slate-800">No pending requests</p>
            <p className="text-[11px] text-slate-450 mt-0.5">All customer upgrade requests have been processed.</p>
          </div>
        ) : (
          <div className="divide-y-2 divide-slate-100">
            {rows.map((r) => {
              const targetPlanKey = (r.targetPlan || "free").toLowerCase() as keyof typeof PLAN_BADGES;
              const planBadge = PLAN_BADGES[targetPlanKey] || PLAN_BADGES.free;
              const statusKey = (r.status || "requested").toLowerCase() as keyof typeof STATUS_TONE;
              const statusToneBadge = STATUS_TONE[statusKey] || STATUS_TONE.requested;

              return (
                <div key={r.id} className="px-5 py-4 grid grid-cols-1 lg:grid-cols-[1.8fr_160px_120px_140px_1fr] gap-4 items-center hover:bg-[#FFF6E8]/30 transition">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-bold text-slate-850 truncate">{r.userName ?? r.userEmail ?? r.userId}</p>
                    <p className="text-[11.5px] text-slate-400 font-mono truncate">{r.userEmail}</p>
                    {r.customerNote && (
                      <div className="mt-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10.5px] text-slate-600 font-semibold italic max-w-lg">
                        "{r.customerNote}"
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Wants Plan</p>
                    <div className="mt-1">
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider", planBadge)}>
                        <Crown className="w-2.5 h-2.5" />
                        {r.targetPlan}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1 capitalize">{r.billingCycle}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Currently</p>
                    <p className="text-[12px] font-bold text-slate-700 capitalize mt-0.5">{r.currentPlan ?? "free"}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <div>
                    <span className={cn("inline-flex px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider w-fit", statusToneBadge)}>
                      {r.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {r.status === "requested" && (
                      <button
                        onClick={() => updateStatus.mutate({ id: r.id, status: "contacted" })}
                        className="px-3 py-1 rounded-xl text-[11px] font-extrabold bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] text-slate-700 hover:bg-[#FFF1D6] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] transition-all"
                      >
                        Mark contacted
                      </button>
                    )}
                    <button
                      onClick={() => openActivate(r)}
                      className="px-3 py-1 rounded-xl text-[11px] font-extrabold bg-[#0E8A4B] border-2 border-[#0A6E3C] shadow-[0_2px_0_0_#073D22] text-white hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_1px_0_0_#073D22] transition-all flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Activate
                    </button>
                    <button
                      onClick={() => updateStatus.mutate({ id: r.id, status: "declined" })}
                      title="Decline"
                      className="w-8 h-8 rounded-xl bg-white border-2 border-rose-300 text-rose-500 hover:bg-rose-50 active:translate-y-0.5 flex items-center justify-center transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Activate dialog */}
      <Dialog open={!!activatingRow} onOpenChange={(o) => !o && setActivatingId(null)}>
        <DialogContent className="border-2 border-[#E8B968] shadow-[0_6px_0_0_#E8B968] bg-white rounded-2xl p-6 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-black text-slate-900">
              Activate plan → {activatingRow?.targetPlan}
            </DialogTitle>
            <DialogDescription className="text-[12px] text-slate-500 font-semibold leading-relaxed mt-1">
              Confirms payment received + flips <span className="font-mono text-slate-700 bg-slate-100 border border-slate-200 px-1 rounded">{activatingRow?.userEmail}</span> to the {activatingRow?.targetPlan} plan immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-extrabold uppercase tracking-wider text-[#B8651A]">
                MRR (₹/month) <span className="text-slate-400 font-normal lowercase">— for tracking</span>
              </Label>
              <Input
                type="number"
                value={mrr}
                onChange={(e) => setMrr(e.target.value)}
                placeholder="2999"
                autoFocus
                className="border-2 border-[#E8B968] focus:border-[#0E8A4B] rounded-xl font-bold bg-white text-slate-800 text-[13px] h-10 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                Defaults to the plan's monthly price. Override if billing annually (e.g. ₹2,499 for Growth annual).
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-extrabold uppercase tracking-wider text-[#B8651A]">
                Razorpay payment ID <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </Label>
              <Input
                value={paymentId}
                onChange={(e) => setPaymentId(e.target.value)}
                placeholder="pay_NXqWxX2YzWxX2Y"
                className="font-mono border-2 border-[#E8B968] focus:border-[#0E8A4B] rounded-xl font-bold bg-white text-slate-800 text-[13px] h-10 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-extrabold uppercase tracking-wider text-[#B8651A]">
                Admin notes <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="UPI received via Pay.in Razorpay link · invoice #2026/04/01"
                className="border-2 border-[#E8B968] focus:border-[#0E8A4B] rounded-xl font-bold bg-white text-slate-800 text-[13px] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 p-3"
              />
            </div>
          </div>
          <DialogFooter className="mt-6 flex gap-2">
            <button
              onClick={() => setActivatingId(null)}
              className="px-4 py-2 rounded-xl text-[12px] font-extrabold bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] text-slate-700 hover:bg-[#FFF1D6] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => activate.mutate({
                id: activatingRow!.id,
                mrr_inr: mrr ? Number(mrr) : undefined,
                admin_notes: notes.trim() || undefined,
                razorpay_payment_id: paymentId.trim() || undefined,
              })}
              disabled={activate.isPending}
              className="px-4 py-2 rounded-xl text-[12px] font-extrabold bg-[#0E8A4B] border-2 border-[#0A6E3C] shadow-[0_2px_0_0_#073D22] text-white hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_1px_0_0_#073D22] disabled:opacity-50 disabled:pointer-events-none transition-all"
            >
              {activate.isPending ? "Activating…" : `Activate ${activatingRow?.targetPlan} plan`}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubscriptions;
