/**
 * Payments — read-only ledger of all orders with payment status, broken down
 * by method (UPI / Card / COD / Cashfree). Filter by status.
 *
 * This is a view layer over orders (no separate payments table) — same data,
 * different lens. "Mark paid" actions live on the order detail in OrdersPage.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CreditCard, Loader2, IndianRupee, CheckCircle2, AlertCircle, RotateCcw,
  Hash, Calendar, ExternalLink,
} from "lucide-react";
import { api, type OrderDto } from "@/lib/api";
import { formatRelative } from "@/lib/inbox-types";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const STATUS_TABS = [
  { id: "all" as const,        label: "All",       accent: "#0A3D24" },
  { id: "paid" as const,       label: "Paid",      accent: "#0E8A4B" },
  { id: "pending" as const,    label: "Pending",   accent: "#FF6A1F" },
  { id: "refunded" as const,   label: "Refunded",  accent: "#D4308E" },
];

export const PaymentsPage = () => {
  const [tab, setTab] = useState<"all" | "paid" | "pending" | "refunded">("all");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", "all-for-payments"],
    queryFn: () => api.getOrders(),
    refetchInterval: 30_000,
  });

  const stats = useMemo(() => {
    let totalCollected = 0, totalPending = 0, totalRefunded = 0;
    const methodCounts: Record<string, number> = {};
    for (const o of orders) {
      const t = Number(o.total_inr) || 0;
      if (o.payment_status === "paid") totalCollected += t;
      else if (o.payment_status === "refunded") totalRefunded += t;
      else totalPending += t;
      const m = o.payment_method || "unspecified";
      methodCounts[m] = (methodCounts[m] || 0) + 1;
    }
    return { totalCollected, totalPending, totalRefunded, methodCounts, totalOrders: orders.length };
  }, [orders]);

  const filtered = useMemo(() => {
    if (tab === "all") return orders;
    return orders.filter((o) => o.payment_status === tab);
  }, [orders, tab]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#FFF6E8]">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0 bg-[#0E8A4B]">
            <CreditCard className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-black leading-tight">Payments</h1>
            <p className="text-[14px] text-foreground/70 font-medium mt-1">
              Live ledger of every order's payment status. Mark COD orders paid from the Orders page.
            </p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Collected" value={`₹${Math.round(stats.totalCollected).toLocaleString("en-IN")}`} accent="#0E8A4B" />
          <Stat label="Pending"   value={`₹${Math.round(stats.totalPending).toLocaleString("en-IN")}`}   accent="#FF6A1F" />
          <Stat label="Refunded"  value={`₹${Math.round(stats.totalRefunded).toLocaleString("en-IN")}`}  accent="#D4308E" />
        </div>

        {/* Method mix */}
        {Object.keys(stats.methodCounts).length > 0 && (
          <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/55 mb-2">Method mix</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.methodCounts).map(([m, n]) => (
                <span key={m} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFF1D6] border border-[#E8B968] text-[11.5px] font-extrabold uppercase tracking-wider">
                  {m === "online" || m === "cashfree" ? "💳" : m === "upi" ? "📱" : m === "cod" ? "💵" : "❓"} {m}
                  <span className="text-foreground/50 ml-0.5">· {n}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[12px] font-extrabold border-2 transition",
                tab === t.id ? "bg-white shadow-[0_2px_0_0_#E8B968]" : "bg-[#FFF1D6]/50 border-[#E8B968]/40 text-foreground/65 hover:bg-[#FFF1D6]"
              )}
              style={tab === t.id ? { borderColor: t.accent, color: t.accent } : undefined}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] overflow-hidden">
          {isLoading ? (
            <div className="py-16 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-foreground/40" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-[13px] font-extrabold mb-1">No payments in this view</p>
              <p className="text-[12px] text-foreground/55">When orders come in, their payment status shows here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-foreground/10">
              {filtered.map((o) => <PaymentRow key={o.id} order={o} />)}
            </ul>
          )}
        </div>

        <p className="text-[11px] text-center text-foreground/45">
          Want to enable online payments (card / UPI / netbanking)? They're auto-enabled when your AddisonX{" "}
          <Link to="/app/integrations" className="text-[#0E8A4B] font-extrabold hover:underline">Cashfree integration</Link> is configured at workspace level.
        </p>
      </div>
    </div>
  );
};

const PaymentRow = ({ order }: { order: OrderDto }) => {
  const isPaid = order.payment_status === "paid";
  const isRefunded = order.payment_status === "refunded";
  return (
    <Link to="/app/site/orders" className="block px-4 sm:px-5 py-3.5 hover:bg-[#FFF6E8]/50 transition flex items-center gap-3">
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
        isPaid ? "bg-[#E6F7EE] text-[#0E8A4B]"
          : isRefunded ? "bg-[#FCE5F0] text-[#D4308E]"
          : "bg-[#FFEFE0] text-[#FF6A1F]"
      )}>
        {isPaid ? <CheckCircle2 className="w-4 h-4" /> : isRefunded ? <RotateCcw className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-extrabold tabular-nums">#{order.order_number}</span>
          <span className="text-[12px] font-bold truncate">{order.customer_name}</span>
          <span className="ml-auto text-[10.5px] text-foreground/45">{formatRelative(order.created_at)}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-0.5 text-[11.5px] text-foreground/65">
          <span className="font-extrabold uppercase tracking-wider">{order.payment_method || "—"}</span>
          <span>·</span>
          <span>{order.payment_status}</span>
        </div>
      </div>
      <p className={cn("text-[13.5px] font-black tabular-nums flex-shrink-0",
        isPaid ? "text-[#0E8A4B]" : isRefunded ? "text-[#D4308E]" : "text-foreground/65"
      )}>
        {isRefunded ? "−" : ""}₹{Number(order.total_inr).toLocaleString("en-IN")}
      </p>
    </Link>
  );
};

const Stat = ({ label, value, accent }: { label: string; value: string; accent: string }) => (
  <div className="p-4 rounded-xl bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968]">
    <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: accent }}>{label}</p>
    <p className="text-[18px] sm:text-[20px] font-black mt-1 leading-none tabular-nums">{value}</p>
  </div>
);
