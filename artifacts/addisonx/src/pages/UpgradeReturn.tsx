/**
 * /app/upgrade/return — Cashfree redirect landing page.
 *
 * Cashfree calls our return_url with ?order_id=<order_id> after the
 * customer completes (or abandons) checkout. We hit the server-side verify
 * endpoint to confirm what actually happened (NEVER trust the client to
 * decide payment success — the verify endpoint goes to Cashfree's API).
 *
 * Three terminal states:
 *   - PAID         → success card, link back to dashboard
 *   - ACTIVE       → "we're waiting on Cashfree" + poll a couple times
 *   - EXPIRED/etc  → failure card, retry CTA back to /app/upgrade
 */

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CheckCircle2, AlertTriangle, Loader2, ArrowRight, Crown, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

// toSnake() in api.ts converts the server's camelCase response, so the
// frontend sees snake_case fields here.
type VerifyResult = { order_id: string; cashfree_status: string; upgrade_status: string; plan: string | null };

const UpgradeReturn = () => {
  const [params] = useSearchParams();
  const orderId = params.get("order_id");
  const qc = useQueryClient();

  const [verify, setVerify] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polls, setPolls] = useState(0);

  useEffect(() => {
    if (!orderId) {
      setError("Missing order_id in URL");
      return;
    }
    let cancelled = false;

    const tick = async () => {
      try {
        const result = await api.cashfreeVerify(orderId);
        if (cancelled) return;
        setVerify(result);
        if (result.cashfree_status === "PAID") {
          qc.invalidateQueries({ queryKey: ["billing-me"] });
          qc.invalidateQueries({ queryKey: ["billing-me-pill"] });
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Verify failed");
      }
    };

    tick();
    // Poll twice more in case the webhook is racing the redirect — typical
    // Cashfree-side reconciliation happens in <5s. Three checks at 2s
    // intervals covers the common race without spinning forever.
    const intervalA = window.setTimeout(() => { setPolls(1); tick(); }, 2000);
    const intervalB = window.setTimeout(() => { setPolls(2); tick(); }, 4500);
    return () => { cancelled = true; window.clearTimeout(intervalA); window.clearTimeout(intervalB); };
  }, [orderId, qc]);

  const status = verify?.cashfree_status;
  const isPaid = status === "PAID";
  const isPending = !verify || status === "ACTIVE";
  const isFailed = status === "EXPIRED" || status === "TERMINATED" || status === "TERMINATION_REQUESTED";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF6E8] px-6">
      <div className="w-full max-w-md bg-white border-2 border-[#E8B968] rounded-3xl shadow-[0_6px_0_0_#E8B968] p-8 text-center">
        {/* Header icon */}
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ${
          isPaid    ? "bg-gradient-to-br from-[#0E8A4B] to-[#0A6E3C] text-white"
          : isFailed ? "bg-gradient-to-br from-[#D4308E] to-[#A11A6A] text-white"
          :            "bg-gradient-to-br from-[#FFD23F] to-[#E8B400] text-[#3D1A00]"
        }`}>
          {isPaid    ? <CheckCircle2 className="w-8 h-8" strokeWidth={2.5} />
          : isFailed ? <AlertTriangle className="w-8 h-8" strokeWidth={2.5} />
          : isPending && !error ? <Loader2 className="w-8 h-8 animate-spin" strokeWidth={2.5} />
          :            <AlertTriangle className="w-8 h-8" strokeWidth={2.5} />}
        </div>

        <h1 className="text-2xl font-black mb-2">
          {isPaid    ? "Welcome aboard 🎉"
          : isFailed ? "Payment didn't go through"
          : error    ? "Couldn't verify payment"
          :            "Confirming your payment…"}
        </h1>

        <p className="text-[13px] text-foreground/65 mb-6 leading-relaxed">
          {isPaid && verify?.plan && (
            <>Your <span className="font-extrabold text-foreground capitalize">{verify.plan}</span> plan is live across the workspace. Premium features unlocked.</>
          )}
          {isFailed && (
            <>We didn't receive payment from Cashfree. No charge has been made. You can try again anytime.</>
          )}
          {!isPaid && !isFailed && !error && (
            <>Cashfree is still processing. This usually takes a few seconds — we're checking back ({polls + 1}/3).</>
          )}
          {error && <>Reason: <span className="font-mono text-[11px]">{error}</span></>}
        </p>

        {/* Order id for support */}
        {orderId && (
          <p className="text-[10px] font-mono text-foreground/40 mb-6 break-all">
            order · {orderId}
          </p>
        )}

        {/* CTAs */}
        <div className="space-y-2">
          {isPaid && (
            <Button asChild size="lg" className="w-full bg-[#0E8A4B] text-white shadow-[0_4px_0_0_#0A6E3C] hover:bg-[#0A6E3C]">
              <Link to="/app/dashboard">
                <Crown className="w-4 h-4" /> Go to dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          )}
          {isFailed && (
            <Button asChild size="lg" className="w-full bg-[#FF6A1F] text-white shadow-[0_4px_0_0_#B8420A] hover:bg-[#E85C12]">
              <Link to="/app/upgrade">Try again <ArrowRight className="w-4 h-4" /></Link>
            </Button>
          )}
          {!isPaid && (
            <Button asChild variant="outline" className="w-full">
              <Link to="/app/dashboard">
                <Home className="w-4 h-4" /> Back to dashboard
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpgradeReturn;
