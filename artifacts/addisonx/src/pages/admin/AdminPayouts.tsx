import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, Payout } from "@/lib/admin-api";
import { Banknote, Plus, IndianRupee, Loader2, Check, X, CheckCircle2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-IN") : "—");

const STATUS: Record<string, string> = {
  paid: "bg-[#E6F7EE] text-[#0A6E3C]",
  pending: "bg-[#FFF1D6] text-[#7A4A00]",
  failed: "bg-rose-50 text-rose-600",
  cancelled: "bg-slate-100 text-slate-500",
};

const btnPrimary =
  "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0E8A4B] border-2 border-[#0A6E3C] text-white text-[12px] font-extrabold shadow-[0_3px_0_0_#073D22] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#073D22] transition-all";

type FormState = {
  recipient: string; recipientType: string; amountInr: string; method: string; reference: string; notes: string;
};
const emptyForm: FormState = { recipient: "", recipientType: "vendor", amountInr: "", method: "bank_transfer", reference: "", notes: "" };

const AdminPayouts = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-payouts"],
    queryFn: () => adminApi.payouts(),
  });

  const totalPaid = rows.filter((p) => p.status === "paid").reduce((a, p) => a + (p.amountInr ?? 0), 0);
  const pending = rows.filter((p) => p.status === "pending").reduce((a, p) => a + (p.amountInr ?? 0), 0);

  const save = async () => {
    if (!form.recipient.trim() || !form.amountInr) { toast.error("Recipient aur amount zaroori hai"); return; }
    setSaving(true);
    try {
      await adminApi.createPayout({
        recipient: form.recipient.trim(),
        recipientType: form.recipientType,
        amountInr: Number(form.amountInr) || 0,
        method: form.method,
        reference: form.reference.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      toast.success("Payout record ho gaya");
      qc.invalidateQueries({ queryKey: ["admin-payouts"] });
      setOpen(false);
      setForm(emptyForm);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async (p: Payout) => {
    try {
      await adminApi.updatePayout(p.id, { status: "paid" });
      toast.success("Paid mark ho gaya");
      qc.invalidateQueries({ queryKey: ["admin-payouts"] });
    } catch (e) {
      toast.error(String(e));
    }
  };

  return (
    <PageShell
      title="Payouts"
      subtitle="vendors, affiliates aur refunds ke disbursements"
      icon={<Banknote className="w-5 h-5 text-white" strokeWidth={2.5} />}
      actions={<button onClick={() => { setForm(emptyForm); setOpen(true); }} className={btnPrimary}><Plus className="w-4 h-4" strokeWidth={2.6} /> Naya Payout</button>}
    >
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border-2 border-[#E8B968] rounded-2xl p-4 shadow-[0_4px_0_0_#E8B968]">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A]">Total paid out</p>
            <p className="text-[22px] font-black tracking-tight text-slate-850 mt-1 tabular-nums">₹{totalPaid.toLocaleString("en-IN")}</p>
          </div>
          <div className="bg-white border-2 border-[#E8B968] rounded-2xl p-4 shadow-[0_4px_0_0_#E8B968]">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A]">Pending</p>
            <p className="text-[22px] font-black tracking-tight text-[#FF6A1F] mt-1 tabular-nums">₹{pending.toLocaleString("en-IN")}</p>
          </div>
        </div>

        <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_5px_0_0_#E8B968]">
          <div className="grid grid-cols-[1.4fr_110px_110px_100px_120px] gap-3 px-5 py-3 border-b-2 border-[#E8B968] bg-[#FFF6E8] text-[10px] font-extrabold uppercase tracking-wider text-[#0A3D24]">
            <div>Recipient</div><div>Amount</div><div>Method</div><div>Status</div><div>Date</div>
          </div>

          {isLoading && <div className="px-4 py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0E8A4B]" /></div>}

          {!isLoading && rows.length === 0 && (
            <div className="px-6 py-16 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#FFF1D6] border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] flex items-center justify-center">
                <Banknote className="w-7 h-7 text-[#FF6A1F]" strokeWidth={2.2} />
              </div>
              <p className="text-[14px] font-black text-slate-800">Abhi koi payout nahi</p>
              <p className="text-[12px] text-slate-400 mt-1">Pehla payout record karein — vendor, affiliate ya refund ke liye.</p>
            </div>
          )}

          {rows.map((p) => (
            <div key={p.id} className="grid grid-cols-[1.4fr_110px_110px_100px_120px] gap-3 px-5 py-3 border-b border-slate-100 last:border-b-0 items-center hover:bg-[#FFF6E8]/30 transition">
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-slate-850 truncate">{p.recipient}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider capitalize">{p.recipientType}{p.reference ? ` · ${p.reference}` : ""}</p>
              </div>
              <span className="inline-flex items-center gap-0.5 text-[13px] font-black text-slate-800 tabular-nums">
                <IndianRupee className="w-3 h-3 text-slate-400" />{Number(p.amountInr ?? 0).toLocaleString("en-IN")}
              </span>
              <span className="text-[12px] font-semibold text-slate-600 capitalize">{p.method.replace("_", " ")}</span>
              <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider w-fit", STATUS[p.status] ?? "bg-slate-100 text-slate-500")}>{p.status}</span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-slate-500 font-semibold">{fmtDate(p.paidAt ?? p.createdAt)}</span>
                {p.status === "pending" && (
                  <button onClick={() => markPaid(p)} title="Mark paid" className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#E6F7EE] border border-[#0E8A4B]/30 text-[#0A6E3C] text-[10px] font-extrabold hover:bg-[#d4f0e1] transition">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white border-2 border-[#E8B968] rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-black tracking-tight">Naya Payout record karein</DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 py-2">
            <Field label="Recipient">
              <Input value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} placeholder="Naam / business" className="border-2 border-[#E8B968] rounded-xl text-[13px]" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select value={form.recipientType} onChange={(e) => setForm({ ...form, recipientType: e.target.value })} className="w-full h-10 px-3 border-2 border-[#E8B968] rounded-xl text-[13px] font-bold bg-white">
                  <option value="vendor">Vendor</option>
                  <option value="affiliate">Affiliate</option>
                  <option value="refund">Refund</option>
                  <option value="staff">Staff</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Amount (₹)">
                <Input type="number" value={form.amountInr} onChange={(e) => setForm({ ...form, amountInr: e.target.value })} className="border-2 border-[#E8B968] rounded-xl text-[13px] tabular-nums" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Method">
                <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className="w-full h-10 px-3 border-2 border-[#E8B968] rounded-xl text-[13px] font-bold bg-white">
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Reference">
                <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="UTR / txn id" className="border-2 border-[#E8B968] rounded-xl text-[13px] font-mono" />
              </Field>
            </div>
            <Field label="Notes">
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="border-2 border-[#E8B968] rounded-xl text-[13px]" />
            </Field>
          </div>
          <DialogFooter>
            <button onClick={() => setOpen(false)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border-2 border-slate-200 text-slate-600 text-[12px] font-extrabold hover:bg-slate-50 transition">
              <X className="w-4 h-4" /> Cancel
            </button>
            <button onClick={save} disabled={saving} className={cn(btnPrimary, "disabled:opacity-60")}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={2.6} />} Record
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A]">{label}</label>
    {children}
  </div>
);

export default AdminPayouts;
