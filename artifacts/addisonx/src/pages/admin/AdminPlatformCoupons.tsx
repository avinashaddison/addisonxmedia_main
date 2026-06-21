import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, PlatformCoupon } from "@/lib/admin-api";
import { Ticket, Plus, Pencil, Trash2, Check, X, Loader2, Percent, IndianRupee } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FormState = {
  code: string;
  description: string;
  discountType: "percent" | "fixed";
  discountValue: string;
  appliesToPlan: string;
  maxRedemptions: string;
  startsAt: string;
  expiresAt: string;
  active: boolean;
};

const emptyForm: FormState = {
  code: "", description: "", discountType: "percent", discountValue: "10",
  appliesToPlan: "", maxRedemptions: "", startsAt: "", expiresAt: "", active: true,
};

const toDateInput = (s: string | null) => (s ? new Date(s).toISOString().slice(0, 10) : "");
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-IN") : "—");

const btnPrimary =
  "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0E8A4B] border-2 border-[#0A6E3C] text-white text-[12px] font-extrabold shadow-[0_3px_0_0_#073D22] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#073D22] transition-all";

const AdminPlatformCoupons = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformCoupon | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<PlatformCoupon | null>(null);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: () => adminApi.coupons(),
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (cpn: PlatformCoupon) => {
    setEditing(cpn);
    setForm({
      code: cpn.code,
      description: cpn.description ?? "",
      discountType: cpn.discountType,
      discountValue: String(cpn.discountValue),
      appliesToPlan: cpn.appliesToPlan ?? "",
      maxRedemptions: cpn.maxRedemptions != null ? String(cpn.maxRedemptions) : "",
      startsAt: toDateInput(cpn.startsAt),
      expiresAt: toDateInput(cpn.expiresAt),
      active: cpn.active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!editing && !form.code.trim()) { toast.error("Coupon code zaroori hai"); return; }
    setSaving(true);
    const payload = {
      description: form.description.trim() || null,
      discountType: form.discountType,
      discountValue: Number(form.discountValue) || 0,
      appliesToPlan: form.appliesToPlan.trim() || null,
      maxRedemptions: form.maxRedemptions.trim() ? Number(form.maxRedemptions) : null,
      startsAt: form.startsAt || null,
      expiresAt: form.expiresAt || null,
      active: form.active,
    };
    try {
      if (editing) {
        await adminApi.updateCoupon(editing.id, payload);
        toast.success("Coupon update ho gaya");
      } else {
        await adminApi.createCoupon({ ...payload, code: form.code.trim().toUpperCase() });
        toast.success("Naya coupon ban gaya");
      }
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      setOpen(false);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await adminApi.deleteCoupon(toDelete.id);
      toast.success("Coupon delete ho gaya");
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
    } catch (e) {
      toast.error(String(e));
    } finally {
      setToDelete(null);
    }
  };

  const isExpired = (cpn: PlatformCoupon) => cpn.expiresAt != null && new Date(cpn.expiresAt) < new Date();

  return (
    <PageShell
      title="Coupons"
      subtitle={`${coupons.length} platform discount codes`}
      icon={<Ticket className="w-5 h-5 text-white" strokeWidth={2.5} />}
      actions={<button onClick={openCreate} className={btnPrimary}><Plus className="w-4 h-4" strokeWidth={2.6} /> Naya Coupon</button>}
    >
      <div className="max-w-5xl mx-auto">
        <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_5px_0_0_#E8B968]">
          <div className="grid grid-cols-[1.4fr_110px_120px_120px_90px] gap-3 px-5 py-3.5 border-b-2 border-[#E8B968] bg-[#FFF6E8] text-[10px] font-extrabold uppercase tracking-wider text-[#0A3D24]">
            <div>Code</div><div>Discount</div><div>Usage</div><div>Expires</div><div></div>
          </div>

          {isLoading && <div className="px-4 py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0E8A4B]" /></div>}

          {!isLoading && coupons.length === 0 && (
            <div className="px-6 py-16 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#FFF1D6] border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] flex items-center justify-center">
                <Ticket className="w-7 h-7 text-[#FF6A1F]" strokeWidth={2.2} />
              </div>
              <p className="text-[14px] font-black text-slate-800">Abhi koi coupon nahi</p>
              <p className="text-[12px] text-slate-400 mt-1">Pehla discount code banayein — clients ke liye platform-wide offer.</p>
            </div>
          )}

          {coupons.map((cpn) => {
            const expired = isExpired(cpn);
            return (
              <div key={cpn.id} className="grid grid-cols-[1.4fr_110px_120px_120px_90px] gap-3 px-5 py-3 border-b border-slate-100 last:border-b-0 items-center hover:bg-[#FFF6E8]/30 transition">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[13px] font-black text-slate-850 tracking-wide">{cpn.code}</span>
                    {!cpn.active && <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[8px] font-extrabold uppercase tracking-wider text-slate-500">Off</span>}
                    {expired && <span className="px-1.5 py-0.5 rounded bg-rose-50 text-[8px] font-extrabold uppercase tracking-wider text-rose-600">Expired</span>}
                  </div>
                  {cpn.description && <p className="text-[11px] text-slate-400 font-medium truncate">{cpn.description}</p>}
                  {cpn.appliesToPlan && <p className="text-[10px] text-[#B8651A] font-bold uppercase tracking-wider">only {cpn.appliesToPlan}</p>}
                </div>
                <span className="inline-flex items-center gap-1 text-[13px] font-black text-[#0E8A4B] tabular-nums">
                  {cpn.discountType === "percent"
                    ? <><Percent className="w-3 h-3" />{cpn.discountValue}</>
                    : <><IndianRupee className="w-3 h-3" />{cpn.discountValue.toLocaleString("en-IN")}</>}
                </span>
                <span className="text-[12px] font-bold text-slate-600 tabular-nums">
                  {cpn.usedCount}{cpn.maxRedemptions != null ? ` / ${cpn.maxRedemptions}` : ""}
                </span>
                <span className="text-[12px] text-slate-500 font-semibold">{fmtDate(cpn.expiresAt)}</span>
                <div className="flex items-center gap-1.5 justify-self-end">
                  <button onClick={() => openEdit(cpn)} title="Edit" className="w-8 h-8 rounded-xl bg-white border-2 border-[#E8B968] text-[#B8651A] hover:bg-[#FFF1D6] transition flex items-center justify-center shadow-[0_2px_0_0_#E8B968]">
                    <Pencil className="w-3.5 h-3.5" strokeWidth={2.4} />
                  </button>
                  <button onClick={() => setToDelete(cpn)} title="Delete" className="w-8 h-8 rounded-xl bg-white border-2 border-rose-200 text-rose-600 hover:bg-rose-50 transition flex items-center justify-center shadow-[0_2px_0_0_#fecdd3]">
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={2.4} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white border-2 border-[#E8B968] rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-black tracking-tight">{editing ? `Edit ${editing.code}` : "Naya Coupon banayein"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Code">
                <Input value={form.code} disabled={!!editing} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="DIWALI50" className="border-2 border-[#E8B968] rounded-xl font-mono text-[13px] uppercase disabled:opacity-60" />
              </Field>
              <Field label="Applies to plan (optional)">
                <Input value={form.appliesToPlan} onChange={(e) => setForm({ ...form, appliesToPlan: e.target.value })} placeholder="growth" className="border-2 border-[#E8B968] rounded-xl font-mono text-[13px]" />
              </Field>
            </div>
            <Field label="Description">
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="border-2 border-[#E8B968] rounded-xl text-[13px]" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Discount type">
                <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value as "percent" | "fixed" })} className="w-full h-10 px-3 border-2 border-[#E8B968] rounded-xl text-[13px] font-bold bg-white">
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed (₹)</option>
                </select>
              </Field>
              <Field label="Value">
                <Input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} className="border-2 border-[#E8B968] rounded-xl text-[13px] tabular-nums" />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Max uses">
                <Input type="number" value={form.maxRedemptions} onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })} placeholder="∞" className="border-2 border-[#E8B968] rounded-xl text-[13px] tabular-nums" />
              </Field>
              <Field label="Starts">
                <Input type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className="border-2 border-[#E8B968] rounded-xl text-[13px]" />
              </Field>
              <Field label="Expires">
                <Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="border-2 border-[#E8B968] rounded-xl text-[13px]" />
              </Field>
            </div>
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <span className="text-[12px] font-bold text-slate-600">Active</span>
            </label>
          </div>
          <DialogFooter>
            <button onClick={() => setOpen(false)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border-2 border-slate-200 text-slate-600 text-[12px] font-extrabold hover:bg-slate-50 transition">
              <X className="w-4 h-4" /> Cancel
            </button>
            <button onClick={save} disabled={saving} className={cn(btnPrimary, "disabled:opacity-60")}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={2.6} />}
              {editing ? "Save" : "Create"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="bg-white border-2 border-[#E8B968] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black">Coupon delete karein?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-mono font-bold text-slate-700">{toDelete?.code}</span> permanently delete ho jayega.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-2 font-extrabold">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="rounded-xl bg-rose-600 hover:bg-rose-700 font-extrabold">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A]">{label}</label>
    {children}
  </div>
);

export default AdminPlatformCoupons;
