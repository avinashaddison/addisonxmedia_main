/**
 * WhatsApp Catalog — manage which products appear in your WhatsApp Business
 * profile and push them to Meta's Commerce Manager.
 *
 * Pulls the same `product` rows used by the website storefront and the inbox
 * 'Send products' button. One sync covers all three surfaces.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageCircle, Loader2, Package, Send, ExternalLink, CheckCircle2,
  AlertCircle, RefreshCcw, ShoppingBag, Sparkles, Link as LinkIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export const WhatsAppCatalogPage = () => {
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<{ synced: number; failed: number; at: Date } | null>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.getProducts(),
    staleTime: 30_000,
  });

  const activeProducts = products.filter((p) => p.status === "active");

  const onSync = async () => {
    if (!confirm(`Sync ${activeProducts.length} active products to your WhatsApp Catalog (Meta Commerce Manager)?\n\nProducts will appear in your WhatsApp Business profile.`)) return;
    setSyncing(true);
    try {
      const res = await api.syncCatalogToMeta();
      setLastSync({ synced: res.synced, failed: res.failed, at: new Date() });
      if (res.failed > 0) {
        toast.warning(`Synced ${res.synced} · ${res.failed} failed — check console for details`);
        console.warn("[whatsapp-catalog] failures:", res.results.filter((r) => !r.ok));
      } else {
        toast.success(`✓ Synced ${res.synced} products to WhatsApp Catalog`);
      }
      qc.invalidateQueries({ queryKey: ["products"] });
    } catch (e) { toast.error((e as Error).message); }
    finally { setSyncing(false); }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#FFF6E8]">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0 bg-[#25D366]">
            <MessageCircle className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-black leading-tight">WhatsApp Catalog</h1>
            <p className="text-[14px] text-foreground/70 font-medium mt-1">
              Push your products to Meta's Commerce Manager so they appear inside your WhatsApp Business profile.
            </p>
          </div>
        </div>

        {/* Hero card — big sync button */}
        <div className="rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl"
             style={{ background: "linear-gradient(135deg, #25D366, #075E54)" }}>
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-25 bg-white"></div>
          <div className="relative">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] opacity-80 mb-2">WhatsApp Business Catalog</p>
            <h2 className="text-[26px] sm:text-[32px] font-black leading-tight mb-3">
              {activeProducts.length} product{activeProducts.length === 1 ? "" : "s"} ready to sync
            </h2>
            <p className="text-[13px] sm:text-[14px] opacity-90 mb-5 max-w-xl">
              Customers can browse your catalog right inside WhatsApp — no website visit needed. Tap a product, message you, done.
            </p>
            <div className="flex flex-wrap gap-3">
              <button onClick={onSync} disabled={syncing || activeProducts.length === 0}
                      className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-white text-[#075E54] font-black text-[14px] shadow-[0_4px_0_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 disabled:opacity-50">
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                {syncing ? "Syncing…" : lastSync ? "Sync again" : "Sync to WhatsApp"}
              </button>
              <Link to="/app/site/products" className="inline-flex items-center gap-2 h-12 px-5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-extrabold text-[13px] transition">
                <Package className="w-4 h-4" /> Manage products
              </Link>
            </div>
            {lastSync && (
              <p className="mt-4 text-[12px] font-bold opacity-80">
                Last sync: {lastSync.synced} ok{lastSync.failed > 0 ? ` · ${lastSync.failed} failed` : ""} · {lastSync.at.toLocaleTimeString("en-IN")}
              </p>
            )}
          </div>
        </div>

        {/* What this does */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: ShoppingBag, title: "Appears in your WA profile", desc: "Customers tap 'Catalog' inside your WhatsApp Business chat and browse products without leaving WhatsApp." },
            { icon: Send, title: "Send catalog from inbox", desc: "Use the 'Send products' button in any chat to push selected items as a product carousel." },
            { icon: Sparkles, title: "AI shopping replies", desc: "When buyers ask about products in chat, Addison AI suggests matching items + auto-creates orders with UPI QR." },
          ].map((card) => (
            <div key={card.title} className="bg-white rounded-2xl border-2 border-[#E8B968] p-4 shadow-[0_2px_0_0_#E8B968]">
              <div className="w-10 h-10 rounded-xl bg-[#E6FFE9] text-[#075E54] flex items-center justify-center mb-2">
                <card.icon className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <p className="text-[13px] font-extrabold mb-1">{card.title}</p>
              <p className="text-[11.5px] text-foreground/65 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* Setup required */}
        <div className="rounded-2xl border-2 border-[#E8B968] bg-white p-5">
          <div className="flex items-start gap-3 mb-3">
            <AlertCircle className="w-5 h-5 text-[#FF6A1F] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
            <div className="flex-1">
              <h3 className="text-[13px] font-extrabold">One-time setup: connect a Meta Commerce Catalog</h3>
              <p className="text-[12px] text-foreground/65 mt-0.5 leading-relaxed">
                Create a catalog in Meta Commerce Manager, then paste its ID into your AddisonX Meta API settings.
                Without this, sync calls will fail with "Connect a Meta Catalog first".
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            <a href="https://business.facebook.com/commerce/catalogs/" target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-white border-2 border-[#3C50E0]/40 text-[12px] font-extrabold text-[#3C50E0] hover:bg-[#E4E8FF] transition">
              <ExternalLink className="w-3.5 h-3.5" /> Open Meta Commerce Manager
            </a>
            <Link to="/app/integrations"
                  className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-white border-2 border-[#E8B968] text-[12px] font-extrabold hover:bg-[#FFE8C7] transition">
              <LinkIcon className="w-3.5 h-3.5" /> Configure Meta API
            </Link>
          </div>
        </div>

        {/* Product list preview */}
        <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E8B968]/40 flex items-center justify-between">
            <h3 className="text-[13px] font-extrabold uppercase tracking-[0.15em] text-foreground/55">
              Products that will sync ({activeProducts.length})
            </h3>
            <Link to="/app/site/products" className="text-[11px] font-extrabold text-[#0E8A4B] hover:text-[#0A6E3C]">
              Manage →
            </Link>
          </div>
          {activeProducts.length === 0 ? (
            <div className="py-12 text-center px-6">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-foreground/5 flex items-center justify-center mb-2">
                <Package className="w-6 h-6 text-foreground/30" />
              </div>
              <p className="text-[13px] font-extrabold">No active products yet</p>
              <p className="text-[11.5px] text-foreground/55 mt-1">Add products + set them Active to enable sync.</p>
              <Link to="/app/site/products" className="inline-flex items-center gap-1.5 mt-3 h-9 px-4 rounded-lg bg-[#0E8A4B] text-white text-[12px] font-extrabold hover:bg-[#0A6E3C] transition">
                + Add product
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-foreground/10">
              {activeProducts.slice(0, 20).map((p) => (
                <li key={p.id} className="px-4 py-3 flex items-center gap-3">
                  {p.photo_url ? (
                    <img src={p.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                         onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-foreground/30" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-extrabold truncate">{p.name}</p>
                    {Number(p.price_inr) > 0 && <p className="text-[12px] font-bold text-[#0E8A4B] tabular-nums">₹{Number(p.price_inr).toLocaleString("en-IN")}</p>}
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-[#0E8A4B]/60 flex-shrink-0" />
                </li>
              ))}
              {activeProducts.length > 20 && (
                <li className="px-4 py-3 text-[12px] text-foreground/55 text-center italic">+ {activeProducts.length - 20} more</li>
              )}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
};
