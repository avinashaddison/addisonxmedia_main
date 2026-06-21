/**
 * Coupons — admin CRUD for discount codes applied at checkout.
 *
 * Each coupon: code, type (percent/flat), value, min cart, max uses, window,
 * active flag. Customer enters the code in the cart drawer; server re-validates
 * before applying the discount + incrementing used_count.
 */

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ticket, Loader2, Plus, X, Trash2, Edit2, Power, IndianRupee, Percent,
  Calendar, Hash, Inbox,
} from "lucide-react";
import { api, type CouponDto } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CouponDraft = {
  code: string;
  discount_type: "percent" | "flat";
  discount_value: string;
  min_cart_inr: string;
  max_uses: string;
  expires_at: string;
  active: boolean;
};

const blank = (): CouponDraft => ({
  code: "", discount_type: "percent", discount_value: "10",
  min_cart_inr: "", max_uses: "", expires_at: "", active: true,
});

export const CouponsPage = () => {
  const qc = useQueryClient();
  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["coupons"],
    queryFn: () => api.getCoupons(),
    staleTime: 30_000,
  });

  const [editingId, setEditingId] = useState<string | null>(null);  // null | "new" | uuid

  const isNew = editingId === "new";
  const editing = editingId && editingId !== "new" ? coupons.find((c) => c.id === editingId) : null;

  return (
    <div className="flex-1 overflow-y-auto bg-[#FFF6E8]">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0 bg-[#D4308E]">
            <Ticket className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-black leading-tight">Coupons</h1>
            <p className="text-[14px] text-foreground/70 font-medium mt-1">
              Discount codes customers enter at checkout — flat amount or percent off.
            </p>
          </div>
          <button
            onClick={() => setEditingId("new")}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0E8A4B] text-white font-extrabold text-[13px] shadow-[0_4px_0_0_#073D22] hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_2px_0_0_#073D22] transition flex-shrink-0"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} /> New coupon
          </button>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] overflow-hidden">
          {isLoading ? (
            <div className="py-16 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-foreground/40" /></div>
          ) : coupons.length === 0 ? (
            <div className="py-16 text-center px-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FCE5F0] flex items-center justify-center mb-3">
                <Ticket className="w-7 h-7 text-[#D4308E]" />
              </div>
              <h3 className="text-[15px] font-extrabold mb-1">No coupons yet</h3>
              <p className="text-[12.5px] text-foreground/60 max-w-md mx-auto leading-relaxed mb-4">
                Create your first discount code — e.g. <code className="font-mono font-extrabold bg-[#FFF1D6] px-1.5 py-0.5 rounded text-[11px]">WELCOME10</code> for 10% off first orders.
              </p>
              <button
                onClick={() => setEditingId("new")}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0E8A4B] text-white font-extrabold text-[13px] shadow-[0_4px_0_0_#073D22] hover:bg-[#0A6E3C] transition"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} /> Create first coupon
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-foreground/10">
              {coupons.map((co) => (
                <li key={co.id}>
                  <button onClick={() => setEditingId(co.id)} className="w-full text-left px-4 sm:px-5 py-4 hover:bg-[#FFF6E8]/50 transition flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                      co.active ? "bg-[#FCE5F0] text-[#D4308E]" : "bg-foreground/5 text-foreground/40"
                    )}>
                      {co.discount_type === "percent" ? <Percent className="w-4 h-4" /> : <IndianRupee className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-[14px] font-mono font-extrabold uppercase tracking-wider">{co.code}</span>
                        {!co.active && <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-foreground/10 text-foreground/55">Disabled</span>}
                        {co.expires_at && new Date(co.expires_at) < new Date() && (
                          <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FCE5F0] text-[#D4308E]">Expired</span>
                        )}
                      </div>
                      <p className="text-[12px] text-foreground/65 mt-0.5">
                        {co.discount_type === "percent"
                          ? `${Number(co.discount_value)}% off`
                          : `₹${Number(co.discount_value).toLocaleString("en-IN")} off`}
                        {Number(co.min_cart_inr) > 0 && ` · min cart ₹${Number(co.min_cart_inr).toLocaleString("en-IN")}`}
                        {co.max_uses != null && ` · used ${co.used_count}/${co.max_uses}`}
                        {co.max_uses == null && co.used_count > 0 && ` · used ${co.used_count}×`}
                      </p>
                    </div>
                    <Edit2 className="w-3.5 h-3.5 text-foreground/30 flex-shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-[11px] text-center text-foreground/45">
          Customers enter the code in the cart drawer on your public site. Used count auto-increments per checkout.
        </p>
      </div>

      {(isNew || editing) && (
        <CouponDialog
          initial={editing
            ? {
                code: editing.code,
                discount_type: editing.discount_type,
                discount_value: editing.discount_value || "0",
                min_cart_inr: Number(editing.min_cart_inr) > 0 ? editing.min_cart_inr : "",
                max_uses: editing.max_uses != null ? String(editing.max_uses) : "",
                expires_at: editing.expires_at ? editing.expires_at.slice(0, 10) : "",
                active: editing.active,
              }
            : blank()
          }
          editingId={editing?.id ?? null}
          onClose={() => setEditingId(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["coupons"] }); setEditingId(null); }}
          onDelete={editing ? async () => {
            if (!confirm(`Delete coupon "${editing.code}"? This can't be undone.`)) return;
            try { await api.deleteCoupon(editing.id); qc.invalidateQueries({ queryKey: ["coupons"] }); toast.success("Deleted"); setEditingId(null); }
            catch (e) { toast.error((e as Error).message); }
          } : undefined}
        />
      )}
    </div>
  );
};

const CouponDialog = ({ initial, editingId, onClose, onSaved, onDelete }: {
  initial: CouponDraft; editingId: string | null;
  onClose: () => void; onSaved: () => void; onDelete?: () => void;
}) => {
  const isEdit = !!editingId;
  const [draft, setDraft] = useState<CouponDraft>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async () => {
    const code = draft.code.trim().toUpperCase().replace(/\s+/g, "");
    if (!code) { toast.error("Code is required"); return; }
    if (!/^[A-Z0-9_-]+$/.test(code)) { toast.error("Code can only contain letters, numbers, _ and -"); return; }
    const value = Number(draft.discount_value);
    if (!Number.isFinite(value) || value <= 0) { toast.error("Discount value must be > 0"); return; }
    if (draft.discount_type === "percent" && value > 100) { toast.error("Percent can't be > 100"); return; }

    const payload = {
      code,
      discount_type: draft.discount_type,
      discount_value: value,
      min_cart_inr: Number(draft.min_cart_inr) || 0,
      max_uses: draft.max_uses.trim() === "" ? null : Math.max(1, Math.floor(Number(draft.max_uses))),
      expires_at: draft.expires_at ? new Date(draft.expires_at + "T23:59:59").toISOString() : null,
      active: draft.active,
    };
    setSaving(true);
    try {
      if (editingId) { await api.updateCoupon(editingId, payload); toast.success("Coupon saved"); }
      else { await api.createCoupon(payload); toast.success("Coupon created"); }
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full sm:max-w-lg max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="sticky top-0 z-10 bg-white border-b-2 border-[#E8B968] px-5 py-3 flex items-center justify-between">
          <h2 className="text-[15px] font-black">{isEdit ? "Edit coupon" : "New coupon"}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-foreground/5 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <Field label="Code *" hint="e.g. WELCOME10 — letters / numbers / _ -">
            <input
              value={draft.code}
              onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
              placeholder="WELCOME10"
              className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[16px] font-mono font-extrabold uppercase tracking-wider"
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <div className="grid grid-cols-2 gap-1.5">
                {(["percent", "flat"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setDraft({ ...draft, discount_type: t })}
                          className={cn("h-10 rounded-lg border-2 text-[12px] font-extrabold uppercase flex items-center justify-center gap-1.5 transition",
                            draft.discount_type === t ? "bg-[#FCE5F0] border-[#D4308E] text-[#D4308E]" : "border-[#E8B968]/60 text-foreground/55")}>
                    {t === "percent" ? <Percent className="w-3 h-3" /> : <IndianRupee className="w-3 h-3" />}
                    {t === "percent" ? "Percent" : "Flat"}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={draft.discount_type === "percent" ? "Value (%)" : "Value (₹)"}>
              <input type="number" inputMode="decimal" min="0" max={draft.discount_type === "percent" ? "100" : undefined}
                     value={draft.discount_value}
                     onChange={(e) => setDraft({ ...draft, discount_value: e.target.value })}
                     className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[14px] font-extrabold tabular-nums" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Minimum cart (₹)" hint="0 = no minimum">
              <input type="number" inputMode="decimal" min="0"
                     value={draft.min_cart_inr}
                     onChange={(e) => setDraft({ ...draft, min_cart_inr: e.target.value })}
                     placeholder="0"
                     className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[14px] font-extrabold tabular-nums" />
            </Field>
            <Field label="Max uses" hint="Leave blank = unlimited">
              <input type="number" inputMode="numeric" min="1"
                     value={draft.max_uses}
                     onChange={(e) => setDraft({ ...draft, max_uses: e.target.value })}
                     placeholder="Unlimited"
                     className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[14px] font-extrabold tabular-nums" />
            </Field>
          </div>

          <Field label="Expiry date" hint="Leave blank for no expiry">
            <input type="date" value={draft.expires_at}
                   onChange={(e) => setDraft({ ...draft, expires_at: e.target.value })}
                   className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[13px] font-bold" />
          </Field>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                   className="w-4 h-4 accent-[#0E8A4B]" />
            <span className="text-[12.5px] font-bold flex items-center gap-1.5"><Power className="w-3.5 h-3.5" /> Active (customers can use this code)</span>
          </label>
        </div>

        <div className="sticky bottom-0 bg-white border-t-2 border-[#E8B968] px-5 py-3 flex items-center justify-between gap-2">
          {onDelete ? (
            <button onClick={onDelete} className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-white border-2 border-[#D4308E]/40 text-[#D4308E] text-[12px] font-extrabold hover:bg-[#FCE5F0] transition">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          ) : <div />}
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="h-10 px-3 rounded-lg text-foreground/65 text-[12px] font-extrabold hover:bg-foreground/5">Cancel</button>
            <button onClick={submit} disabled={saving}
                    className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-[#0E8A4B] text-white text-[13px] font-extrabold shadow-[0_3px_0_0_#073D22] hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_1px_0_0_#073D22] transition disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {isEdit ? "Save" : "Create coupon"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div>
    <div className="flex items-baseline justify-between mb-1.5">
      <label className="text-[10.5px] font-extrabold uppercase tracking-wider text-foreground/65">{label}</label>
      {hint && <span className="text-[10px] text-foreground/45 ml-2">{hint}</span>}
    </div>
    {children}
  </div>
);
