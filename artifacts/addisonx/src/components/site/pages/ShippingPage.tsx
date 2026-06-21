/**
 * Shipping zones — admin CRUD. Each zone has a name, pincode prefixes,
 * flat rate, optional free-above threshold, optional ETA. Cart picks the
 * best-matching zone based on customer's pincode.
 */

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Truck, Loader2, Plus, X, Trash2, Edit2, MapPin, IndianRupee, Power, Inbox,
} from "lucide-react";
import { api, type ShippingZoneDto } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ZoneDraft = {
  name: string;
  pincode_prefixes: string;
  rate_inr: string;
  free_above_inr: string;
  eta_days: string;
  active: boolean;
};

const blank = (): ZoneDraft => ({
  name: "", pincode_prefixes: "", rate_inr: "", free_above_inr: "", eta_days: "", active: true,
});

export const ShippingPage = () => {
  const qc = useQueryClient();
  const { data: zones = [], isLoading } = useQuery({
    queryKey: ["shipping-zones"],
    queryFn: () => api.getShippingZones(),
    staleTime: 30_000,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const isNew = editingId === "new";
  const editing = editingId && editingId !== "new" ? zones.find((z) => z.id === editingId) : null;

  return (
    <div className="flex-1 overflow-y-auto bg-[#FFF6E8]">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0 bg-[#B8651A]">
            <Truck className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-black leading-tight">Shipping</h1>
            <p className="text-[14px] text-foreground/70 font-medium mt-1">
              Define delivery zones — cart auto-calculates shipping from customer pincode.
            </p>
          </div>
          <button
            onClick={() => setEditingId("new")}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0E8A4B] text-white font-extrabold text-[13px] shadow-[0_4px_0_0_#073D22] hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_2px_0_0_#073D22] transition flex-shrink-0"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} /> New zone
          </button>
        </div>

        {/* Help banner */}
        <div className="p-4 rounded-2xl border-2 border-[#3C50E0]/30 bg-gradient-to-br from-[#E4E8FF] to-white">
          <p className="text-[12.5px] text-[#2533A8] font-bold leading-relaxed">
            <strong>How it works:</strong> add a zone like "Local (Patna)" with prefixes <code className="font-mono bg-white px-1 rounded text-[11px]">800,801,802</code> and rate ₹40.
            Customers from pincode 800001 will see ₹40 delivery. Add a "Pan-India" zone with empty prefixes (catches everything else) at ₹150.
            Pincodes that don't match any active zone show "No delivery to this pincode" in the cart.
          </p>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] overflow-hidden">
          {isLoading ? (
            <div className="py-16 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-foreground/40" /></div>
          ) : zones.length === 0 ? (
            <div className="py-16 text-center px-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FFF1D6] flex items-center justify-center mb-3">
                <Truck className="w-7 h-7 text-[#B8651A]" />
              </div>
              <h3 className="text-[15px] font-extrabold mb-1">No shipping zones</h3>
              <p className="text-[12.5px] text-foreground/60 max-w-md mx-auto leading-relaxed mb-4">
                Without at least one zone, customers see "No delivery yet — contact us on WhatsApp" in the cart.
              </p>
              <button
                onClick={() => setEditingId("new")}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0E8A4B] text-white font-extrabold text-[13px] shadow-[0_4px_0_0_#073D22] hover:bg-[#0A6E3C] transition"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} /> Create first zone
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-foreground/10">
              {zones.map((z) => (
                <li key={z.id}>
                  <button onClick={() => setEditingId(z.id)} className="w-full text-left px-4 sm:px-5 py-4 hover:bg-[#FFF6E8]/50 transition flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                      z.active ? "bg-[#FFF1D6] text-[#B8651A]" : "bg-foreground/5 text-foreground/40"
                    )}>
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-[14px] font-extrabold">{z.name}</span>
                        {!z.active && <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-foreground/10 text-foreground/55">Disabled</span>}
                      </div>
                      <p className="text-[12px] text-foreground/65 mt-0.5">
                        Pincode prefixes: <span className="font-mono font-bold">{z.pincode_prefixes || "(catches all)"}</span> · ₹{Number(z.rate_inr).toLocaleString("en-IN")}
                        {z.free_above_inr != null && Number(z.free_above_inr) > 0 && ` · free above ₹${Number(z.free_above_inr).toLocaleString("en-IN")}`}
                        {z.eta_days != null && ` · ${z.eta_days} days`}
                      </p>
                    </div>
                    <Edit2 className="w-3.5 h-3.5 text-foreground/30 flex-shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {(isNew || editing) && (
        <ZoneDialog
          initial={editing
            ? {
                name: editing.name,
                pincode_prefixes: editing.pincode_prefixes,
                rate_inr: editing.rate_inr || "0",
                free_above_inr: editing.free_above_inr ?? "",
                eta_days: editing.eta_days != null ? String(editing.eta_days) : "",
                active: editing.active,
              }
            : blank()
          }
          editingId={editing?.id ?? null}
          onClose={() => setEditingId(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["shipping-zones"] }); setEditingId(null); }}
          onDelete={editing ? async () => {
            if (!confirm(`Delete zone "${editing.name}"?`)) return;
            try { await api.deleteShippingZone(editing.id); qc.invalidateQueries({ queryKey: ["shipping-zones"] }); toast.success("Deleted"); setEditingId(null); }
            catch (e) { toast.error((e as Error).message); }
          } : undefined}
        />
      )}
    </div>
  );
};

const ZoneDialog = ({ initial, editingId, onClose, onSaved, onDelete }: {
  initial: ZoneDraft; editingId: string | null;
  onClose: () => void; onSaved: () => void; onDelete?: () => void;
}) => {
  const isEdit = !!editingId;
  const [draft, setDraft] = useState<ZoneDraft>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async () => {
    if (!draft.name.trim()) { toast.error("Zone name is required"); return; }
    const payload = {
      name: draft.name.trim(),
      pincode_prefixes: draft.pincode_prefixes.replace(/\s+/g, ""),
      rate_inr: Number(draft.rate_inr) || 0,
      free_above_inr: draft.free_above_inr.trim() === "" ? null : Number(draft.free_above_inr),
      eta_days: draft.eta_days.trim() === "" ? null : Math.max(0, Math.floor(Number(draft.eta_days))),
      active: draft.active,
    };
    setSaving(true);
    try {
      if (editingId) { await api.updateShippingZone(editingId, payload); toast.success("Zone saved"); }
      else { await api.createShippingZone(payload); toast.success("Zone created"); }
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full sm:max-w-lg max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="sticky top-0 z-10 bg-white border-b-2 border-[#E8B968] px-5 py-3 flex items-center justify-between">
          <h2 className="text-[15px] font-black">{isEdit ? "Edit zone" : "New shipping zone"}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-foreground/5 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <Field label="Zone name *" hint="e.g. Local (Patna), Pan-India">
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                   placeholder="e.g. Local delivery"
                   className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[14px] font-bold" autoFocus />
          </Field>
          <Field label="Pincode prefixes" hint="Comma-separated · empty = catches all pincodes (default zone)">
            <input value={draft.pincode_prefixes} onChange={(e) => setDraft({ ...draft, pincode_prefixes: e.target.value })}
                   placeholder="e.g. 800,801,802"
                   className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[13px] font-mono font-bold" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rate (₹)">
              <div className="relative">
                <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/45" strokeWidth={2.5} />
                <input type="number" inputMode="decimal" min="0" value={draft.rate_inr}
                       onChange={(e) => setDraft({ ...draft, rate_inr: e.target.value })}
                       placeholder="0"
                       className="w-full pl-8 pr-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[14px] font-extrabold tabular-nums" />
              </div>
            </Field>
            <Field label="Free above (₹)" hint="Optional · empty = never free">
              <input type="number" inputMode="decimal" min="0" value={draft.free_above_inr}
                     onChange={(e) => setDraft({ ...draft, free_above_inr: e.target.value })}
                     placeholder="—"
                     className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[14px] font-extrabold tabular-nums" />
            </Field>
          </div>
          <Field label="ETA (days)" hint="Shown to customer at checkout · optional">
            <input type="number" inputMode="numeric" min="0" value={draft.eta_days}
                   onChange={(e) => setDraft({ ...draft, eta_days: e.target.value })}
                   placeholder="—"
                   className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[14px] font-extrabold tabular-nums" />
          </Field>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                   className="w-4 h-4 accent-[#0E8A4B]" />
            <span className="text-[12.5px] font-bold flex items-center gap-1.5"><Power className="w-3.5 h-3.5" /> Active</span>
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
              {isEdit ? "Save" : "Create zone"}
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
