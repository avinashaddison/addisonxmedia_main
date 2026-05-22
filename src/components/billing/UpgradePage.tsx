import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, Check, X, Sparkles, ArrowRight, Loader2, ShieldCheck, MessageCircle, Clock, CheckCircle2, Trophy, IndianRupee } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Plan = {
  id: "starter" | "growth" | "scale";
  name: string;
  tag: string;
  monthly: number;
  annual: number;            // billed monthly equivalent on annual cycle
  features: string[];
  cta: string;
  highlight?: boolean;
};

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tag: "Solo founders, kirana, single-clinic",
    monthly: 999,
    annual: 832,
    cta: "Choose Starter",
    features: [
      "2,000 conversations/mo",
      "500 AI actions/mo · Hinglish replies",
      "UPI live mode — collect real payments",
      "3 team members",
      "Broadcasts + templates",
      "Email + WhatsApp support",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    tag: "D2C, coaching, multi-branch · most popular",
    monthly: 2999,
    annual: 2499,
    cta: "Choose Growth",
    highlight: true,
    features: [
      "10,000 conversations/mo",
      "5,000 AI actions/mo · all AI features",
      "Meta Ads in-app · CTW campaigns",
      "Ad-to-Sale ROAS attribution (exclusive)",
      "AI insights · follow-up automation",
      "10 team members · custom domain",
      "Priority WhatsApp + call support",
    ],
  },
  {
    id: "scale",
    name: "Scale",
    tag: "High-volume D2C, agencies, multi-location",
    monthly: 7999,
    annual: 6666,
    cta: "Choose Scale",
    features: [
      "50,000 conversations/mo",
      "25,000 AI actions/mo",
      "Up to 3 workspaces (one bill)",
      "API access · webhooks",
      "White-label (custom sender domain)",
      "25 team members",
      "Dedicated CSM (IST hours)",
    ],
  },
];

const PLAN_RANK: Record<string, number> = { free: 0, starter: 1, growth: 2, scale: 3, enterprise: 4 };

export const UpgradePage = () => {
  const qc = useQueryClient();
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");
  const [pendingPlan, setPendingPlan] = useState<Plan["id"] | null>(null);

  const { data: me, isLoading } = useQuery({
    queryKey: ["billing-me"],
    queryFn: () => api.getBillingMe(),
    staleTime: 30_000,
  });

  const currentPlan = (me?.plan ?? "free").toLowerCase();
  const currentRank = PLAN_RANK[currentPlan] ?? 0;
  const pendingUpgrade = me?.pending_upgrade ?? null;

  const submit = useMutation({
    mutationFn: (plan: Plan["id"]) =>
      api.requestUpgrade({ target_plan: plan, billing_cycle: cycle }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing-me"] });
      toast.success("Request received! Hum WhatsApp pe payment link bhejenge.", { duration: 5500 });
      setPendingPlan(null);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Could not submit request");
      setPendingPlan(null);
    },
  });

  const cancelReq = useMutation({
    mutationFn: (id: string) => api.cancelUpgradeRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing-me"] });
      toast.success("Upgrade request cancelled");
    },
  });

  // Probe Cashfree availability so we can branch between paid (instant)
  // and manual (WhatsApp link) flows. Cheap (~1ms), cached 5 minutes.
  const { data: cashfreeStatus } = useQuery({
    queryKey: ["cashfree-status"],
    queryFn: () => api.cashfreeStatus(),
    staleTime: 5 * 60_000,
  });

  const requestUpgrade = async (plan: Plan["id"]) => {
    setPendingPlan(plan);

    // Cashfree path — checkout in modal, server activates plan on success.
    if (cashfreeStatus?.configured) {
      try {
        const order = await api.cashfreeCreateOrder(plan, cycle);
        const { openCashfreeCheckout } = await import("@/lib/cashfree");
        const result = await openCashfreeCheckout({
          paymentSessionId: order.paymentSessionId,
          mode: order.mode,
          returnUrl: `${window.location.origin}/app/upgrade/return?order_id={order_id}`,
        });
        if (result.ok === false) {
          toast.error(result.error);
          setPendingPlan(null);
          return;
        }
        // Modal closed — could be success or user dismissal. Hit verify to
        // confirm; if PAID, plan flip happens server-side and billing-me
        // refetches will show the new badge.
        const verify = await api.cashfreeVerify(order.orderId);
        if (verify.cashfreeStatus === "PAID") {
          toast.success(`Welcome to ${plan} 🎉`);
        } else {
          toast.info("Payment not completed — you can retry anytime");
        }
        qc.invalidateQueries({ queryKey: ["billing-me"] });
        qc.invalidateQueries({ queryKey: ["billing-me-pill"] });
        setPendingPlan(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Checkout failed");
        setPendingPlan(null);
      }
      return;
    }

    // Manual fallback — admin sends payment link via WhatsApp.
    submit.mutate(plan);
  };

  return (
    <PageShell
      title="Upgrade plan"
      subtitle="Apne business ke saath plan grow karein · GST invoice included"
      icon={<Crown className="w-5 h-5" />}
    >
      {/* Pending upgrade banner — if a request is in flight, show clear next step */}
      {pendingUpgrade && (
        <div className="bg-gradient-to-r from-[#0E8A4B] to-[#0A6E3C] text-white rounded-2xl shadow-[0_4px_0_0_#073D22] p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFD23F] text-[#7A4A00] flex items-center justify-center shadow-md flex-shrink-0">
            <MessageCircle className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#FFD23F] font-extrabold">Upgrade in progress</p>
            <p className="text-[14px] font-extrabold leading-tight">
              {pendingUpgrade.target_plan.charAt(0).toUpperCase() + pendingUpgrade.target_plan.slice(1)} ({pendingUpgrade.billing_cycle}) · status: {pendingUpgrade.status}
            </p>
            <p className="text-[11px] opacity-90 mt-0.5">
              Hum WhatsApp pe payment link bhej rahe hain. Aaya nahi? <a href="https://wa.me/916206153116" className="underline font-extrabold">Yahan ping karein</a>.
            </p>
          </div>
          <button
            onClick={() => cancelReq.mutate(pendingUpgrade.id)}
            disabled={cancelReq.isPending}
            className="text-[11px] font-bold bg-white/15 hover:bg-white/25 rounded-lg px-3 py-1.5 transition disabled:opacity-50 flex-shrink-0"
          >
            Cancel request
          </button>
        </div>
      )}

      {/* Current plan strip */}
      {!isLoading && me && (
        <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-4 mb-4 flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#FFD23F] text-[#7A4A00] flex items-center justify-center shadow-md flex-shrink-0">
            <Trophy className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10.5px] uppercase tracking-[0.18em] text-foreground/60 font-extrabold">Current plan</p>
            <p className="text-[18px] font-black tracking-tight leading-tight capitalize">{currentPlan === "free" ? "Free" : currentPlan}</p>
          </div>
          {me.account_status !== "active" && (
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#7A1500] bg-[#FFEFE0] border border-[#FF6A1F] rounded px-2 py-1">
              {me.account_status}
            </span>
          )}
        </div>
      )}

      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center mb-5">
        <div className="inline-flex rounded-xl bg-white border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-1">
          {([
            { id: "monthly", label: "Monthly" },
            { id: "annual",  label: "Annual · 2 months free" },
          ] as const).map((c) => (
            <button
              key={c.id}
              onClick={() => setCycle(c.id)}
              className={cn(
                "px-4 h-9 rounded-lg text-[12px] font-extrabold transition",
                cycle === c.id
                  ? "bg-foreground text-white"
                  : "text-foreground/70 hover:text-foreground"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3-tier grid */}
      <div className="grid md:grid-cols-3 gap-4">
        {PLANS.map((p) => {
          const isCurrent = p.id === currentPlan;
          const isDowngrade = PLAN_RANK[p.id] < currentRank;
          const isHighlight = p.highlight && !isCurrent;
          const price = cycle === "annual" ? p.annual : p.monthly;
          const submitting = pendingPlan === p.id;
          const disabled = isCurrent || !!pendingUpgrade || isDowngrade || submit.isPending;

          return (
            <div
              key={p.id}
              className={cn(
                "relative bg-white rounded-2xl p-5 transition-all",
                isHighlight
                  ? "border-2 border-[#0E8A4B] shadow-[0_6px_0_0_#073D22] lg:-translate-y-1 z-10"
                  : "border-2 border-[#E8B968] shadow-[0_4px_0_0_#E8B968]",
                isCurrent && "opacity-95 ring-2 ring-[#FFD23F]"
              )}
            >
              {isHighlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#FF6A1F] text-white text-[10px] font-extrabold uppercase tracking-wider rounded-full shadow-md flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Most popular
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-3 right-4 px-3 py-1 bg-[#FFD23F] text-[#7A4A00] text-[10px] font-extrabold uppercase tracking-wider rounded-full shadow-md flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Current
                </span>
              )}

              <h3 className="text-xl font-black tracking-tight">{p.name}</h3>
              <p className="text-[11.5px] text-foreground/60 font-medium mt-0.5">{p.tag}</p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-black tracking-tight">₹{price.toLocaleString("en-IN")}</span>
                <span className="text-[12px] text-foreground/60 font-bold">/mo</span>
              </div>
              {cycle === "annual" && (
                <p className="text-[10.5px] text-[#0E8A4B] font-extrabold mt-0.5">
                  Save ₹{((p.monthly - p.annual) * 12).toLocaleString("en-IN")}/yr
                </p>
              )}

              <Button
                onClick={() => requestUpgrade(p.id)}
                disabled={disabled}
                size="lg"
                className={cn(
                  "w-full mt-4 gap-2 font-extrabold",
                  isHighlight
                    ? "bg-[#FF6A1F] hover:bg-[#E85C12] text-white shadow-[0_4px_0_0_#B8420A] hover:shadow-[0_2px_0_0_#B8420A] hover:translate-y-[2px]"
                    : ""
                )}
                variant={isHighlight ? "default" : "outline"}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> :
                  isCurrent ? "Your current plan" :
                  isDowngrade ? "Contact support to downgrade" :
                  pendingUpgrade ? "Upgrade in progress…" :
                  <>{p.cta} <ArrowRight className="w-4 h-4" /></>}
              </Button>

              <ul className="mt-5 space-y-2">
                {p.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12.5px] text-foreground/80 font-medium">
                    <div className="w-4 h-4 rounded-full bg-[#0E8A4B] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                    </div>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Enterprise strip */}
      <div className="mt-5 rounded-2xl border-2 border-[#0A3D24] bg-[#0A3D24] text-white p-5 flex flex-col lg:flex-row lg:items-center gap-4 shadow-[0_4px_0_0_#072917]">
        <div className="flex-1 min-w-0">
          <span className="inline-block px-2.5 py-0.5 bg-[#FFD23F] text-[#7A4A00] text-[10px] uppercase tracking-[0.18em] font-extrabold rounded-full mb-2">
            Enterprise
          </span>
          <p className="text-lg lg:text-xl font-black tracking-tight leading-tight">
            Listed companies, 10+ workspaces, custom integrations, DPDP compliance
          </p>
          <p className="text-[12px] text-white/80 font-medium mt-1">
            Unlimited everything · Dedicated CSM · Custom integrations (Tally, ERP) · SLA · From ₹19,999/mo
          </p>
        </div>
        <a
          href="https://wa.me/916206153116"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#FFD23F] text-[#7A4A00] font-extrabold text-sm hover:bg-white transition shadow-[0_3px_0_0_#B8911A] whitespace-nowrap"
        >
          <MessageCircle className="w-4 h-4" fill="currentColor" strokeWidth={0} />
          Contact sales
        </a>
      </div>

      {/* How it works (the manual fulfillment explanation — set expectations) */}
      <div className="mt-6 rounded-2xl border-2 border-dashed border-[#E8B968] bg-[#FFF6E8] p-5">
        <h4 className="text-[13px] font-black mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#0E8A4B]" /> Upgrade kaise hota hai
        </h4>
        <ol className="space-y-2 text-[12.5px] text-foreground/80 font-medium">
          <Step n={1} text="Plan choose karein — hum aapki request receive karte hain." />
          <Step n={2} text="2 ghante ke andar hum WhatsApp pe Razorpay payment link bhejte hain (UPI / card / netbanking)." />
          <Step n={3} text="Payment complete hone ke baad, plan instantly active ho jata hai. GST invoice email pe milta hai." />
          <Step n={4} text="Koi question? Direct WhatsApp karein +91 6206 153116." />
        </ol>
      </div>
    </PageShell>
  );
};

const Step = ({ n, text }: { n: number; text: string }) => (
  <li className="flex items-start gap-2.5">
    <span className="w-5 h-5 rounded-full bg-[#0E8A4B] text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">{n}</span>
    <span>{text}</span>
  </li>
);
