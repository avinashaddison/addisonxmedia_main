import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, SubscriptionPlan } from "@/lib/admin-api";
import { Layers, Plus, Pencil, Trash2, IndianRupee, Users, Check, X, Loader2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FormState = {
  key: string;
  name: string;
  description: string;
  priceInr: string;
  billingCycle: string;
  features: string;
  isActive: boolean;
  isPublic: boolean;
  sortOrder: string;
};

const emptyForm: FormState = {
  key: "", name: "", description: "", priceInr: "0",
  billingCycle: "monthly", features: "", isActive: true, isPublic: true, sortOrder: "0",
};

const btnPrimary =
  "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0E8A4B] border-2 border-[#0A6E3C] text-white text-[12px] font-extrabold shadow-[0_3px_0_0_#073D22] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#073D22] transition-all";

const AdminPlans = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<SubscriptionPlan | null>(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: () => adminApi.plans(),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (p: SubscriptionPlan) => {
    setEditing(p);
    setForm({
      key: p.key,
      name: p.name,
      description: p.description ?? "",
      priceInr: String(p.priceInr),
      billingCycle: p.billingCycle,
      features: (p.features ?? []).join("\n"),
      isActive: p.isActive,
      isPublic: p.isPublic,
      sortOrder: String(p.sortOrder),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || (!editing && !form.key.trim())) {
      toast.error("Key aur name zaroori hai");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      priceInr: Number(form.priceInr) || 0,
      billingCycle: form.billingCycle,
      features: form.features.split("\n").map((f) => f.trim()).filter(Boolean),
      isActive: form.isActive,
      isPublic: form.isPublic,
      sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      if (editing) {
        await adminApi.updatePlan(editing.id, payload);
        toast.success("Plan update ho gaya");
      } else {
        await adminApi.createPlan({ ...payload, key: form.key.trim().toLowerCase() });
        toast.success("Naya plan ban gaya");
      }
      qc.invalidateQueries({ queryKey: ["admin-plans"] });
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
      await adminApi.deletePlan(toDelete.id);
      toast.success("Plan delete ho gaya");
      qc.invalidateQueries({ queryKey: ["admin-plans"] });
    } catch (e) {
      toast.error(String(e));
    } finally {
      setToDelete(null);
    }
  };

  return (
    <PageShell
      title="Plans"
      subtitle={`${plans.length} subscription plans · pricing & features`}
      icon={<Layers className="w-5 h-5 text-white" strokeWidth={2.5} />}
      actions={<button onClick={openCreate} className={btnPrimary}><Plus className="w-4 h-4" strokeWidth={2.6} /> Naya Plan</button>}
    >
      <div className="max-w-6xl mx-auto">
        {isLoading ? (
          <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0E8A4B]" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {plans.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "bg-white border-2 rounded-2xl p-5 shadow-[0_5px_0_0_#E8B968] relative flex flex-col",
                  p.isActive ? "border-[#E8B968]" : "border-slate-200 opacity-75"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[15px] font-black text-slate-850 tracking-tight">{p.name}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">{p.key}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!p.isPublic && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Hidden</span>
                    )}
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider",
                      p.isActive ? "bg-[#E6F7EE] text-[#0A6E3C]" : "bg-slate-100 text-slate-500"
                    )}>
                      {p.isActive ? "Active" : "Off"}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-baseline gap-1">
                  <IndianRupee className="w-4 h-4 text-[#0E8A4B]" />
                  <span className="text-[26px] font-black tracking-tight text-slate-850 tabular-nums">{p.priceInr.toLocaleString("en-IN")}</span>
                  <span className="text-[11px] font-bold text-slate-400">/{p.billingCycle === "annual" ? "saal" : "mahina"}</span>
                </div>

                {p.description && <p className="text-[12px] text-slate-500 font-medium mt-2 leading-snug">{p.description}</p>}

                <ul className="mt-3 space-y-1.5 flex-1">
                  {(p.features ?? []).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] text-slate-600 font-medium">
                      <Check className="w-3.5 h-3.5 text-[#0E8A4B] flex-shrink-0 mt-0.5" strokeWidth={3} />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                    <Users className="w-3.5 h-3.5 text-slate-400" /> {p.subscribers ?? 0} clients
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openEdit(p)} title="Edit" className="w-8 h-8 rounded-xl bg-white border-2 border-[#E8B968] text-[#B8651A] hover:bg-[#FFF1D6] transition flex items-center justify-center shadow-[0_2px_0_0_#E8B968]">
                      <Pencil className="w-3.5 h-3.5" strokeWidth={2.4} />
                    </button>
                    <button onClick={() => setToDelete(p)} title="Delete" className="w-8 h-8 rounded-xl bg-white border-2 border-rose-200 text-rose-600 hover:bg-rose-50 transition flex items-center justify-center shadow-[0_2px_0_0_#fecdd3]">
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={2.4} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white border-2 border-[#E8B968] rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-black tracking-tight">{editing ? `Edit ${editing.name}` : "Naya Plan banayein"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Plan key">
                <Input
                  value={form.key}
                  disabled={!!editing}
                  onChange={(e) => setForm({ ...form, key: e.target.value })}
                  placeholder="growth"
                  className="border-2 border-[#E8B968] rounded-xl font-mono text-[13px] disabled:opacity-60"
                />
              </Field>
              <Field label="Naam">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Growth" className="border-2 border-[#E8B968] rounded-xl text-[13px]" />
              </Field>
            </div>
            <Field label="Description">
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="border-2 border-[#E8B968] rounded-xl text-[13px]" />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Price (₹)">
                <Input type="number" value={form.priceInr} onChange={(e) => setForm({ ...form, priceInr: e.target.value })} className="border-2 border-[#E8B968] rounded-xl text-[13px] tabular-nums" />
              </Field>
              <Field label="Cycle">
                <select value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })} className="w-full h-10 px-3 border-2 border-[#E8B968] rounded-xl text-[13px] font-bold bg-white">
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </Field>
              <Field label="Sort order">
                <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} className="border-2 border-[#E8B968] rounded-xl text-[13px] tabular-nums" />
              </Field>
            </div>
            <Field label="Features (har line ek feature)">
              <Textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} rows={5} placeholder={"2 WhatsApp numbers\n10,000 messages/mahina\nBroadcasts + campaigns"} className="border-2 border-[#E8B968] rounded-xl text-[13px]" />
            </Field>
            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                <span className="text-[12px] font-bold text-slate-600">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch checked={form.isPublic} onCheckedChange={(v) => setForm({ ...form, isPublic: v })} />
                <span className="text-[12px] font-bold text-slate-600">Public (pricing page par dikhe)</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setOpen(false)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border-2 border-slate-200 text-slate-600 text-[12px] font-extrabold hover:bg-slate-50 transition">
              <X className="w-4 h-4" /> Cancel
            </button>
            <button onClick={save} disabled={saving} className={cn(btnPrimary, "disabled:opacity-60")}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={2.6} />}
              {editing ? "Save changes" : "Create plan"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="bg-white border-2 border-[#E8B968] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black">Plan delete karein?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-bold text-slate-700">{toDelete?.name}</span> delete ho jayega. Existing clients ka plan field change nahi hoga, lekin yeh plan ab list mein nahi rahega.
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

export default AdminPlans;
