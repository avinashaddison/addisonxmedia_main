/**
 * Orders — list + detail + status updates.
 *
 * Orders come from three sources:
 *   - website: customer placed via cart on /biz/:slug
 *   - manual : seller logged a WhatsApp / offline order via "Log order"
 *   - whatsapp: (future) auto-imported from a chat
 *
 * Status flow: new → confirmed → shipped → delivered (cancelled at any step).
 * Payment status: pending → paid (or refunded).
 *
 * Each order is automatically linked to a CRM contact (deduped by phone) so
 * the seller can WhatsApp the customer with one click.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingCart, Loader2, ChevronRight, X, Package, MessageSquare, IndianRupee,
  Phone, MapPin, Mail, ExternalLink, AlertCircle, Inbox, Truck, CheckCircle2,
} from "lucide-react";
import { api, type OrderDto, type OrderItemDto } from "@/lib/api";
import { formatRelative } from "@/lib/inbox-types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_FLOW: Array<{ id: OrderDto["status"]; label: string; color: string; bg: string }> = [
  { id: "new",       label: "New",       color: "#FF6A1F", bg: "#FFEFE0" },
  { id: "confirmed", label: "Confirmed", color: "#3C50E0", bg: "#E4E8FF" },
  { id: "shipped",   label: "Shipped",   color: "#B8651A", bg: "#FFF1D6" },
  { id: "delivered", label: "Delivered", color: "#0E8A4B", bg: "#E6F7EE" },
  { id: "cancelled", label: "Cancelled", color: "#D4308E", bg: "#FCE5F0" },
];

const labelFor = (s: OrderDto["status"]) => STATUS_FLOW.find((x) => x.id === s) ?? STATUS_FLOW[0];

export const OrdersPage = () => {
  const [filter, setFilter] = useState<OrderDto["status"] | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", filter],
    queryFn: () => api.getOrders(filter === "all" ? undefined : filter),
    refetchInterval: 15_000,
  });

  const counts = STATUS_FLOW.reduce<Record<string, number>>((acc, s) => {
    acc[s.id] = orders.filter((o) => o.status === s.id).length;
    return acc;
  }, { all: orders.length } as Record<string, number>);

  return (
    <div className="flex-1 overflow-y-auto bg-[#FFF6E8]">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0 bg-[#FF6A1F]">
            <ShoppingCart className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-black leading-tight">Orders</h1>
            <p className="text-[14px] text-foreground/70 font-medium mt-1">
              All orders from your website cart + manual entries — message customers in one tap.
            </p>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill label="All" count={counts.all} active={filter === "all"} onClick={() => setFilter("all")} accent="#0A3D24" />
          {STATUS_FLOW.map((s) => (
            <FilterPill key={s.id} label={s.label} count={counts[s.id] || 0} active={filter === s.id} onClick={() => setFilter(s.id)} accent={s.color} />
          ))}
        </div>

        {/* Orders list */}
        <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] overflow-hidden">
          {isLoading ? (
            <div className="py-16 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-foreground/40" />
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center px-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FFEFE0] flex items-center justify-center mb-3">
                <Inbox className="w-7 h-7 text-[#FF6A1F]" />
              </div>
              <h3 className="text-[15px] font-extrabold mb-1">
                {filter === "all" ? "No orders yet" : `No ${labelFor(filter as OrderDto["status"]).label.toLowerCase()} orders`}
              </h3>
              <p className="text-[12.5px] text-foreground/60 max-w-md mx-auto leading-relaxed">
                Orders placed via your website's cart appear here automatically. Make sure your site is{" "}
                <a href="/app/site" className="text-[#0E8A4B] font-extrabold hover:underline">published</a> and you have{" "}
                <a href="/app/site/products" className="text-[#0E8A4B] font-extrabold hover:underline">active products</a>.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-foreground/10">
              {orders.map((o) => (
                <li key={o.id}>
                  <button
                    onClick={() => setSelectedId(o.id)}
                    className="w-full text-left px-4 sm:px-5 py-3.5 hover:bg-[#FFF6E8]/50 transition flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-extrabold tabular-nums">#{o.order_number}</span>
                        <StatusBadge status={o.status} />
                        {o.payment_status === "paid" && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#E6F7EE] text-[#0E8A4B]">
                            <IndianRupee className="w-2.5 h-2.5" /> Paid
                          </span>
                        )}
                        <span className="text-[10.5px] text-foreground/50 ml-auto">{formatRelative(o.created_at)}</span>
                      </div>
                      <p className="text-[13.5px] font-bold mt-0.5 truncate">{o.customer_name}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        {o.customer_phone && (
                          <span className="text-[11.5px] font-mono text-foreground/65">{o.customer_phone}</span>
                        )}
                        <span className="text-[12px] font-extrabold tabular-nums text-[#0E8A4B]">
                          ₹{Number(o.total_inr).toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-foreground/45">{o.source}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-foreground/30 flex-shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer hint */}
        <p className="text-[11px] text-center text-foreground/45">
          Tap an order to see details, update its status, and message the customer.
        </p>
      </div>

      {selectedId && (
        <OrderDetailDialog
          orderId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
};

// ─── Status badge ──────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: OrderDto["status"] }) => {
  const s = labelFor(status);
  return (
    <span
      className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
};

// ─── Filter pill ───────────────────────────────────────────────────────────

const FilterPill = ({ label, count, active, onClick, accent }: { label: string; count: number; active: boolean; onClick: () => void; accent: string }) => (
  <button
    onClick={onClick}
    className={cn(
      "inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[12px] font-extrabold border-2 transition",
      active
        ? "bg-white shadow-[0_2px_0_0_#E8B968]"
        : "bg-[#FFF1D6]/50 border-[#E8B968]/40 text-foreground/65 hover:bg-[#FFF1D6]"
    )}
    style={active ? { borderColor: accent, color: accent } : undefined}
  >
    {label}
    <span className={cn("text-[10.5px] tabular-nums px-1.5 py-0.5 rounded", active ? "bg-foreground/5" : "text-foreground/45")}>
      {count}
    </span>
  </button>
);

// ─── Detail dialog ─────────────────────────────────────────────────────────

const OrderDetailDialog = ({ orderId, onClose }: { orderId: string; onClose: () => void }) => {
  const qc = useQueryClient();
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => api.getOrder(orderId),
  });

  const statusMut = useMutation({
    mutationFn: (status: OrderDto["status"]) => api.updateOrder(orderId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const paidMut = useMutation({
    mutationFn: (payment_status: "pending" | "paid" | "refunded") => api.updateOrder(orderId, { payment_status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Payment updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const waLink = (() => {
    if (!order?.customer_phone) return null;
    const phone = order.customer_phone.replace(/\D+/g, "");
    if (!phone) return null;
    const items = order.items?.map((i) => `• ${i.product_name} × ${i.quantity}`).join("\n") ?? "";
    const msg = `Hi ${order.customer_name}, thanks for order #${order.order_number}!\n${items}\nTotal: ₹${Number(order.total_inr).toLocaleString("en-IN")}`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  })();

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="sticky top-0 z-10 bg-white border-b-2 border-[#E8B968] px-5 py-3 flex items-center justify-between">
          <h2 className="text-[15px] font-black">
            {order ? `Order #${order.order_number}` : "Loading…"}
          </h2>
          <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-foreground/5 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading || !order ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-foreground/40" />
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Status timeline */}
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/55 mb-2">Status</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STATUS_FLOW.slice(0, 4).map((s) => {
                  const active = order.status === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => statusMut.mutate(s.id)}
                      disabled={statusMut.isPending || active}
                      className={cn(
                        "h-10 rounded-lg border-2 text-[11.5px] font-extrabold uppercase tracking-wider transition",
                        active ? "shadow-[0_2px_0_0_rgba(0,0,0,0.1)]" : "bg-white border-[#E8B968]/60 text-foreground/55 hover:border-[#E8B968]"
                      )}
                      style={active ? { background: s.bg, borderColor: s.color, color: s.color } : undefined}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
              {order.status !== "cancelled" && (
                <button
                  onClick={() => {
                    if (confirm("Cancel this order?")) statusMut.mutate("cancelled");
                  }}
                  className="mt-2 text-[11px] font-extrabold text-[#D4308E] hover:text-[#A11A6A]"
                >
                  Cancel order
                </button>
              )}
            </div>

            {/* Customer */}
            <div className="p-4 rounded-xl bg-[#FFF1D6] border border-[#E8B968]">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/55 mb-2">Customer</p>
              <p className="text-[14px] font-extrabold">{order.customer_name}</p>
              <div className="mt-2 space-y-1.5">
                {order.customer_phone && (
                  <a href={`tel:${order.customer_phone}`} className="flex items-center gap-2 text-[12.5px] font-mono font-bold text-foreground/85 hover:text-[#0E8A4B]">
                    <Phone className="w-3.5 h-3.5" /> {order.customer_phone}
                  </a>
                )}
                {order.customer_email && (
                  <a href={`mailto:${order.customer_email}`} className="flex items-center gap-2 text-[12.5px] font-bold text-foreground/85 hover:text-[#0E8A4B] truncate">
                    <Mail className="w-3.5 h-3.5" /> {order.customer_email}
                  </a>
                )}
                {order.customer_address && (
                  <p className="flex items-start gap-2 text-[12.5px] font-medium text-foreground/85">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> <span className="whitespace-pre-line">{order.customer_address}</span>
                  </p>
                )}
              </div>
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#0E8A4B] text-white text-[12px] font-extrabold shadow-[0_2px_0_0_#073D22] hover:bg-[#0A6E3C] transition"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Message on WhatsApp
                </a>
              )}
            </div>

            {/* Items */}
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/55 mb-2">Items</p>
              <ul className="space-y-2">
                {order.items?.map((it) => <OrderItemRow key={it.id} item={it} />)}
              </ul>
            </div>

            {/* Totals */}
            <div className="p-4 rounded-xl bg-white border-2 border-[#E8B968]">
              <Row label="Subtotal" value={`₹${Number(order.subtotal_inr).toLocaleString("en-IN")}`} />
              {Number(order.shipping_inr) > 0 && <Row label="Shipping" value={`₹${Number(order.shipping_inr).toLocaleString("en-IN")}`} />}
              {Number(order.discount_inr) > 0 && <Row label="Discount" value={`−₹${Number(order.discount_inr).toLocaleString("en-IN")}`} />}
              <div className="border-t-2 border-[#E8B968] mt-2 pt-2">
                <Row label="Total" value={`₹${Number(order.total_inr).toLocaleString("en-IN")}`} big />
              </div>
            </div>

            {/* Payment */}
            <div className="p-4 rounded-xl bg-white border-2 border-[#E8B968]">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/55 mb-2">Payment</p>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="text-[12px] font-bold">Method:</span>
                <span className="text-[12.5px] font-extrabold uppercase">{order.payment_method || "—"}</span>
                <span className="text-[12px] font-bold ml-3">Status:</span>
                <span className={cn(
                  "text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded",
                  order.payment_status === "paid" ? "bg-[#E6F7EE] text-[#0E8A4B]"
                    : order.payment_status === "refunded" ? "bg-[#FCE5F0] text-[#D4308E]"
                    : "bg-[#FFF1D6] text-[#B8651A]"
                )}>
                  {order.payment_status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {order.payment_status !== "paid" && (
                  <button
                    onClick={() => paidMut.mutate("paid")}
                    disabled={paidMut.isPending}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#0E8A4B] text-white text-[12px] font-extrabold shadow-[0_2px_0_0_#073D22] hover:bg-[#0A6E3C] disabled:opacity-50 transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark paid
                  </button>
                )}
                {order.payment_status === "paid" && (
                  <button
                    onClick={() => paidMut.mutate("refunded")}
                    disabled={paidMut.isPending}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border-2 border-[#D4308E]/40 text-[#D4308E] text-[12px] font-extrabold hover:bg-[#FCE5F0] transition"
                  >
                    Mark refunded
                  </button>
                )}
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="p-4 rounded-xl bg-white border-2 border-[#E8B968]">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/55 mb-2">Notes</p>
                <p className="text-[13px] italic leading-relaxed">"{order.notes}"</p>
              </div>
            )}

            <p className="text-[10.5px] text-center text-foreground/40">
              Placed {new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} via {order.source}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const OrderItemRow = ({ item }: { item: OrderItemDto }) => (
  <li className="flex items-center gap-3 p-2.5 rounded-lg bg-[#FFF6E8]/50 border border-[#E8B968]/40">
    {item.product_photo_url ? (
      <img src={item.product_photo_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-[#E8B968]/30"
           onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
    ) : (
      <div className="w-12 h-12 rounded-lg bg-foreground/5 flex items-center justify-center text-foreground/30 flex-shrink-0">
        <Package className="w-5 h-5" />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="text-[13px] font-extrabold truncate">{item.product_name}</p>
      <p className="text-[11.5px] text-foreground/65 tabular-nums">
        ₹{Number(item.unit_price_inr).toLocaleString("en-IN")} × {item.quantity}
      </p>
    </div>
    <p className="text-[13px] font-black tabular-nums text-[#0E8A4B]">
      ₹{Number(item.line_total_inr).toLocaleString("en-IN")}
    </p>
  </li>
);

const Row = ({ label, value, big = false }: { label: string; value: string; big?: boolean }) => (
  <div className="flex items-center justify-between">
    <span className={cn(big ? "text-[14px] font-extrabold" : "text-[12.5px] font-bold text-foreground/65")}>{label}</span>
    <span className={cn(big ? "text-[18px] font-black tabular-nums text-[#0E8A4B]" : "text-[12.5px] font-extrabold tabular-nums")}>{value}</span>
  </div>
);
