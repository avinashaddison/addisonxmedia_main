/**
 * Compact payment-request card.
 *
 * Replaces the old image+caption rendering for UPI payment messages.
 * Detected automatically from the message body pattern that
 * server/routes/payments.ts writes — no schema change, no data migration.
 *
 * Visual: ~280px-wide card with a 140px QR, amount in big numbers, copyable
 * UPI ID chip, and a single "Open UPI app" CTA. Sits cleanly inside the
 * chat bubble without ballooning to 70%-of-viewport-wide.
 */

import { useState } from "react";
import { Copy, Check, IndianRupee, Smartphone, QrCode, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type PaymentRequestParsed = {
  amountInr: number;
  payeeName: string;
  vpa: string;
  qrUrl: string | null;
  note?: string;
  /** True if the seller marked this request as received via the "Payment
   *  received" button. Detected from the " [PAID]" marker we append on
   *  the server when /payments/mark-received fires. */
  paid: boolean;
};

const PAY_REGEX = {
  // 💳 *₹500 to Addison X Media*    OR    💳 ₹500 to Addison X Media   OR with comma+dot
  amount: /💳\s*\*?₹?\s*([\d,]+(?:\.\d+)?)\s*(?:to|→|->)\s*([^\n*]+?)\*?$/im,
  // UPI ID: `cheaproad@ybl`    OR    UPI ID: cheaproad@ybl
  vpa: /UPI\s+ID:\s*`?([a-z0-9._-]+@[a-z0-9.-]+)`?/i,
  // Optional note line — anything after "Note:" if present
  note: /Note:\s*(.+)$/im,
};

/** Returns parsed payment data if the body matches the UPI pattern that
 *  payments/upi/send writes. Returns null otherwise (regular message). */
export const parsePaymentRequest = (
  body: string,
  mediaUrl: string | null,
): PaymentRequestParsed | null => {
  if (!body) return null;
  // Must have either the 💳 marker or UPI ID line — otherwise it's not ours
  if (!body.includes("💳") && !/UPI\s+ID:/i.test(body)) return null;

  // Strip our marker before regex so it doesn't trip the payee match
  const paid = /\[PAID\]/i.test(body);
  const cleaned = paid ? body.replace(/\s*\[PAID\]\s*$/i, "").trim() : body;

  const am = cleaned.match(PAY_REGEX.amount);
  const vp = cleaned.match(PAY_REGEX.vpa);
  if (!am || !vp) return null;

  const amountInr = Number(am[1].replace(/,/g, ""));
  if (!Number.isFinite(amountInr) || amountInr <= 0) return null;

  const payeeName = am[2].trim() || "Business";
  const vpa = vp[1].trim();
  const noteMatch = cleaned.match(PAY_REGEX.note);

  // QR is the message's media. If absent we can synthesize a deep link from
  // VPA + amount but skipping the QR is fine — UPI ID alone is payable.
  const qrUrl = mediaUrl && mediaUrl.includes("api.qrserver.com") ? mediaUrl : null;

  return {
    amountInr,
    payeeName,
    vpa,
    qrUrl,
    note: noteMatch?.[1]?.trim() || undefined,
    paid,
  };
};

const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

/** Build the upi://pay deep link client-side from parsed data. Used by the
 *  "Open UPI app" button so customers on phones can tap-to-pay. */
const buildUpiDeepLink = (p: PaymentRequestParsed) => {
  const params = new URLSearchParams({
    pa: p.vpa,
    pn: p.payeeName,
    am: p.amountInr.toFixed(2),
    tn: p.note || `Payment to ${p.payeeName}`,
    cu: "INR",
  });
  return `upi://pay?${params.toString()}`;
};

export const PaymentRequestCard = ({
  payment,
  outbound,
  onMarkPaid,
  markPaidPending,
}: {
  payment: PaymentRequestParsed;
  outbound: boolean;
  /** Seller-only: called when the seller taps "Payment received". Hidden
   *  from inbound (customer-side) and from already-paid cards. */
  onMarkPaid?: () => void;
  markPaidPending?: boolean;
}) => {
  const [copied, setCopied] = useState(false);

  const copyVpa = async () => {
    try {
      await navigator.clipboard.writeText(payment.vpa);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("UPI ID copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const upiLink = buildUpiDeepLink(payment);

  return (
    <div
      className={cn(
        "w-[280px] rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)] border-2 transition",
        payment.paid ? "bg-white border-[#0E8A4B]" :
        outbound      ? "bg-white border-[#0E8A4B]/30" :
                        "bg-white border-[#E8B968]"
      )}
    >
      {/* Header strip with amount */}
      <div className={cn(
        "px-3.5 py-2.5 flex items-center gap-2 text-white",
        payment.paid
          ? "bg-gradient-to-br from-[#0E8A4B] via-[#10A35A] to-[#0A6E3C]"
          : "bg-gradient-to-br from-[#0E8A4B] to-[#0A6E3C]"
      )}>
        <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0">
          {payment.paid
            ? <CheckCircle2 className="w-5 h-5" strokeWidth={2.5} />
            : <IndianRupee className="w-4 h-4" strokeWidth={2.5} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] uppercase tracking-wider font-extrabold text-white/80 leading-none">
            {payment.paid ? "Payment received" : "Payment request"}
          </p>
          <p className="text-[18px] font-black leading-tight tabular-nums">
            {fmtINR(payment.amountInr)}
          </p>
        </div>
        <span className={cn(
          "text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded",
          payment.paid ? "text-white bg-white/25" : "text-[#FFD23F] bg-black/15"
        )}>
          {payment.paid ? "Paid ✓" : "UPI"}
        </span>
      </div>

      {/* QR — small, scannable, centered on white */}
      {payment.qrUrl ? (
        <div className="bg-white p-3 flex items-center justify-center">
          <img
            src={payment.qrUrl}
            alt="UPI QR code"
            className="w-[140px] h-[140px] object-contain"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      ) : (
        <div className="bg-white p-3 flex items-center justify-center">
          <div className="w-[140px] h-[140px] rounded-lg bg-foreground/5 flex items-center justify-center text-foreground/40">
            <QrCode className="w-10 h-10" />
          </div>
        </div>
      )}

      {/* Body — UPI ID + payee */}
      <div className="px-3.5 py-2.5 space-y-2 border-t border-foreground/8">
        <div>
          <p className="text-[9px] uppercase tracking-wider font-extrabold text-foreground/55">
            Pay to
          </p>
          <p className="text-[12px] font-extrabold text-foreground truncate" title={payment.payeeName}>
            {payment.payeeName}
          </p>
        </div>

        <button
          onClick={copyVpa}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-foreground/5 hover:bg-foreground/10 transition group"
          title="Copy UPI ID"
        >
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[9px] uppercase tracking-wider font-extrabold text-foreground/55 leading-none">
              UPI ID
            </p>
            <p className="text-[11px] font-mono font-bold text-foreground truncate">
              {payment.vpa}
            </p>
          </div>
          {copied ? (
            <Check className="w-3.5 h-3.5 text-[#0E8A4B] flex-shrink-0" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-foreground/40 group-hover:text-foreground transition flex-shrink-0" />
          )}
        </button>

        {payment.note && (
          <p className="text-[11px] text-foreground/70 italic leading-snug">
            {payment.note}
          </p>
        )}
      </div>

      {/* CTAs */}
      {payment.paid ? (
        /* Paid — banner replaces both buttons */
        <div className="w-full text-center bg-[#E6F7EE] text-[#0E8A4B] font-black text-[12px] py-3 border-t-2 border-[#0E8A4B]/30">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
            Payment received · added to revenue
          </span>
        </div>
      ) : outbound && onMarkPaid ? (
        /* Seller view — primary action is "Mark Paid" (revenue tracking),
            secondary is "Open UPI app" for the rare case the seller wants
            to test the link themselves. */
        <div className="border-t-2 border-[#E8B968] divide-y divide-[#E8B968]/40">
          <button
            onClick={onMarkPaid}
            disabled={markPaidPending}
            className="w-full text-center bg-gradient-to-br from-[#0E8A4B] to-[#0A6E3C] text-white font-black text-[12px] py-2.5 hover:from-[#10A35A] hover:to-[#0E8A4B] transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="inline-flex items-center gap-1.5">
              {markPaidPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />}
              {markPaidPending ? "Marking…" : "Payment received"}
            </span>
          </button>
          <a
            href={upiLink}
            onClick={(e) => {
              if (typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad/.test(navigator.userAgent) === false) {
                e.preventDefault();
                navigator.clipboard.writeText(upiLink).then(() => {
                  toast.success("UPI link copied — paste on your phone to pay");
                }).catch(() => toast.error("Couldn't copy"));
              }
            }}
            className="w-full block text-center text-[#7A4A00] font-extrabold text-[11px] py-2 hover:bg-[#FFF1D6] transition"
          >
            <span className="inline-flex items-center gap-1.5">
              <Smartphone className="w-3 h-3" strokeWidth={2.5} />
              Test UPI link
            </span>
          </a>
        </div>
      ) : (
        /* Customer view — only "Open UPI app to pay" */
        <a
          href={upiLink}
          onClick={(e) => {
            if (typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad/.test(navigator.userAgent) === false) {
              e.preventDefault();
              navigator.clipboard.writeText(upiLink).then(() => {
                toast.success("UPI link copied — paste on your phone to pay");
              }).catch(() => toast.error("Couldn't copy"));
            }
          }}
          className="w-full block text-center bg-gradient-to-br from-[#FFD23F] to-[#E8B400] text-[#3D1A00] font-black text-[12px] py-2.5 hover:from-[#FFC10E] hover:to-[#D9A300] transition border-t-2 border-[#E8B968]"
        >
          <span className="inline-flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5" strokeWidth={2.5} />
            Open UPI app to pay
          </span>
        </a>
      )}
    </div>
  );
};
