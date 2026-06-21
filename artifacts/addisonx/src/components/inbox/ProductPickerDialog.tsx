/**
 * Product Picker — used by the inbox 'Send products' flow.
 *
 * Multi-select picker that lets the seller pick 1-30 products to send as
 * WhatsApp cards to the current conversation. Each card has photo, name,
 * price and a UPI deep-link the buyer can tap to pay instantly.
 *
 * Two modes:
 *   send  → send selected products as catalog (no order created yet)
 *   order → create a draft order from selected products + auto-send UPI QR
 *
 * Seller picks the mode in the footer; same picker UI, different submit.
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Loader2, Package, Check, Send, ShoppingBag, MessageSquare } from "lucide-react";
import { api, type ProductDto } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Mode = "send" | "order";

export const ProductPickerDialog = ({ conversationId, contactName, onClose, onSent }: {
  conversationId: string;
  contactName?: string;
  onClose: () => void;
  onSent: () => void;
}) => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [intro, setIntro] = useState("");
  const [mode, setMode] = useState<Mode>("send");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products-search", debouncedSearch],
    queryFn: () => api.searchProducts(debouncedSearch),
    staleTime: 10_000,
  });

  const toggle = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else if (next.size < 30) next.add(id);
    else toast.error("Max 30 products per send");
    setPicked(next);
  };

  const submit = async () => {
    if (picked.size === 0) { toast.error("Pick at least one product"); return; }
    setSubmitting(true);
    try {
      if (mode === "send") {
        const res = await api.sendProductsToConversation({
          conversation_id: conversationId,
          product_ids: Array.from(picked),
          intro: intro.trim() || undefined,
        });
        toast.success(`Sent ${res.sent} product${res.sent === 1 ? "" : "s"}${res.mode === "dry-run" ? " (dry-run)" : ""}`);
      } else {
        const res = await api.createOrderFromMessage({
          conversation_id: conversationId,
          product_ids: Array.from(picked),
        });
        toast.success(`Order #${res.order_number} created · ₹${res.total_inr.toLocaleString("en-IN")} UPI QR sent`);
      }
      onSent();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalPicked = useMemo(() => {
    return products
      .filter((p) => picked.has(p.id))
      .reduce((s, p) => s + (Number(p.price_inr) || 0), 0);
  }, [products, picked]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full sm:max-w-2xl max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="border-b-2 border-[#E8B968] px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#0E8A4B] text-white flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-black truncate">Send products</h2>
              <p className="text-[11px] text-foreground/55 truncate">
                {contactName ? `to ${contactName}` : "to this conversation"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-foreground/5 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="px-5 py-3 border-b border-[#E8B968]/40 flex-shrink-0">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#FFF1D6] border border-[#E8B968]/60">
            <button
              onClick={() => setMode("send")}
              className={cn(
                "h-10 rounded-lg text-[12px] font-extrabold flex items-center justify-center gap-1.5 transition",
                mode === "send" ? "bg-white text-[#0E8A4B] shadow-[0_2px_0_0_#073D22]/30" : "text-foreground/55"
              )}
            >
              <Send className="w-3.5 h-3.5" /> Send catalog
            </button>
            <button
              onClick={() => setMode("order")}
              className={cn(
                "h-10 rounded-lg text-[12px] font-extrabold flex items-center justify-center gap-1.5 transition",
                mode === "order" ? "bg-white text-[#FF6A1F] shadow-[0_2px_0_0_#B8420A]/30" : "text-foreground/55"
              )}
            >
              <Package className="w-3.5 h-3.5" /> Create order + UPI QR
            </button>
          </div>
          <p className="text-[10.5px] text-foreground/55 mt-2 px-1">
            {mode === "send"
              ? "Sends product cards to the chat. Customer browses, replies 'I want this'."
              : "Creates a draft order from selected products and auto-sends UPI QR to the customer for payment."}
          </p>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-[#E8B968]/40 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or description…"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[13px]"
              autoFocus
            />
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="py-16 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-foreground/40" />
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center text-foreground/55">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-[13px] font-bold">No products found</p>
              <p className="text-[11px] mt-1">{debouncedSearch ? "Try a different search." : "Add products in the Products tab first."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {products.map((p) => {
                const isPicked = picked.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    className={cn(
                      "text-left rounded-xl border-2 overflow-hidden transition relative",
                      isPicked ? "border-[#0E8A4B] shadow-[0_3px_0_0_#0A6E3C]" : "border-[#E8B968]/60 hover:border-[#E8B968]"
                    )}
                  >
                    {isPicked && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#0E8A4B] text-white flex items-center justify-center shadow-md z-10">
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      </div>
                    )}
                    <div className="aspect-square bg-gray-50 overflow-hidden">
                      {p.photo_url ? (
                        <img src={p.photo_url} alt="" className="w-full h-full object-cover"
                             onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-foreground/30">
                          <Package className="w-10 h-10" />
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-[12px] font-extrabold leading-tight line-clamp-2">{p.name}</p>
                      {Number(p.price_inr) > 0 && (
                        <p className="text-[13px] font-black tabular-nums mt-1 text-[#0E8A4B]">₹{Number(p.price_inr).toLocaleString("en-IN")}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Intro text (send mode only) */}
        {mode === "send" && (
          <div className="px-5 pt-3 pb-2 border-t border-[#E8B968]/40 flex-shrink-0">
            <textarea
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              placeholder="Optional intro message (e.g. 'Here are our top sellers ✨')"
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[12.5px] resize-none"
            />
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-[#E8B968] px-5 py-3 flex items-center justify-between gap-3 flex-shrink-0 bg-[#FFF6E8]/60">
          <div className="min-w-0">
            <p className="text-[12px] font-extrabold">
              {picked.size} selected
              {totalPicked > 0 && <span className="text-foreground/55 font-bold ml-2">· ₹{totalPicked.toLocaleString("en-IN")} total</span>}
            </p>
            <p className="text-[10.5px] text-foreground/55 mt-0.5">{30 - picked.size} more allowed</p>
          </div>
          <button
            onClick={submit}
            disabled={submitting || picked.size === 0}
            className={cn(
              "inline-flex items-center gap-1.5 h-11 px-5 rounded-xl text-white text-[13px] font-extrabold shadow-[0_3px_0_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 disabled:opacity-50",
              mode === "send" ? "bg-[#0E8A4B]" : "bg-[#FF6A1F]"
            )}
          >
            {submitting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : mode === "send" ? <><Send className="w-4 h-4" /> Send to WhatsApp</> : <><Package className="w-4 h-4" /> Create order + send QR</>}
          </button>
        </div>
      </div>
    </div>
  );
};
