import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Plus, Trash2, Pencil, Send, CheckCircle2, Download, X, IndianRupee,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useContactsLookup } from "@/hooks/useCrmData";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatINRFull, formatDate, toDateInput, downloadCsv } from "@/lib/format";
import { toast } from "sonner";
import type { Invoice, InvoiceStatus } from "@/lib/api-types";

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  draft: "bg-[#F1F1F1] text-[#6B7280]",
  sent: "bg-[#E4E8FF] text-[#3C50E0]",
  paid: "bg-[#E6F7EE] text-[#0A6E3C]",
  overdue: "bg-[#FCE5F0] text-[#D4308E]",
  cancelled: "bg-[#F1F1F1] text-[#9CA3AF]",
};

type LineRow = { description: string; quantity: string; unit_price: string };

const useInvoices = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["invoices", user?.id],
    enabled: !!user,
    queryFn: () => api.listInvoices() as Promise<Invoice[]>,
  });
};

export const InvoicesPage = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: invoices = [], isLoading } = useInvoices();
  const { data: contacts = [] } = useContactsLookup();
  const [formOpen, setFormOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["invoices", user?.id] });
    qc.invalidateQueries({ queryKey: ["payments", user?.id] });
    qc.invalidateQueries({ queryKey: ["revenue", user?.id] });
    qc.invalidateQueries({ queryKey: ["report-revenue", user?.id] });
    qc.invalidateQueries({ queryKey: ["report-performance", user?.id] });
  };
  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createInvoice(data),
    onSuccess: () => { invalidate(); toast.success("Invoice created"); setFormOpen(false); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const update = useMutation({
    mutationFn: ({ id, ...data }: Record<string, unknown> & { id: string }) => api.updateInvoice(id, data),
    onSuccess: () => { invalidate(); toast.success("Invoice updated"); setFormOpen(false); setEditInvoice(null); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const send = useMutation({
    mutationFn: (id: string) => api.sendInvoice(id),
    onSuccess: () => { invalidate(); toast.success("Invoice marked as sent"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const markPaid = useMutation({
    mutationFn: (id: string) => api.markInvoicePaid(id),
    onSuccess: () => { invalidate(); toast.success("Invoice marked as paid"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.deleteInvoice(id),
    onSuccess: () => { invalidate(); toast.success("Invoice deleted"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const stats = useMemo(() => {
    let total = 0, paid = 0, outstanding = 0, overdue = 0;
    for (const inv of invoices) {
      const t = Number(inv.total || 0);
      total += t;
      if (inv.status === "paid") paid += t;
      if (inv.status === "sent" || inv.status === "overdue") outstanding += t;
      if (inv.status === "overdue") overdue += 1;
    }
    return { total, paid, outstanding, overdue };
  }, [invoices]);

  const exportCsv = () => {
    if (invoices.length === 0) { toast.error("No invoices to export"); return; }
    downloadCsv(
      `invoices-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Invoice #", "Contact", "Status", "Total", "Issued", "Due"],
      invoices.map((i) => [i.invoice_number, i.contact_name ?? "", i.status, Number(i.total || 0), formatDate(i.issue_date), i.due_at ? formatDate(i.due_at) : ""]),
    );
    toast.success(`Exported ${invoices.length} invoices`);
  };

  return (
    <PageShell
      title="Invoices"
      subtitle="Bill banao, bhejo aur paid mark karo"
      icon={<FileText className="w-5 h-5" />}
      actions={
        <>
          <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv}><Download className="w-3.5 h-3.5" /> Export</Button>
          <Button size="sm" className="gap-2" onClick={() => { setEditInvoice(null); setFormOpen(true); }}><Plus className="w-3.5 h-3.5" /> New Invoice</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat label="Total Invoiced" value={formatINRFull(stats.total)} color="#3C50E0" />
        <Stat label="Paid" value={formatINRFull(stats.paid)} color="#0E8A4B" />
        <Stat label="Outstanding" value={formatINRFull(stats.outstanding)} color="#FF6A1F" />
        <Stat label="Overdue" value={String(stats.overdue)} color="#D4308E" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : invoices.length === 0 ? (
        <EmptyState onAdd={() => { setEditInvoice(null); setFormOpen(true); }} />
      ) : (
        <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#FFF1D6] text-left text-[11px] font-bold uppercase tracking-wider text-foreground/55">
                  <th className="px-4 py-2.5">Invoice</th>
                  <th className="px-4 py-2.5">Contact</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                  <th className="px-4 py-2.5">Due</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-[#F0DCB8] hover:bg-[#FFFBF2]">
                    <td className="px-4 py-3 font-bold">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-foreground/70">{inv.contact_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[10px] font-extrabold uppercase px-2 py-0.5 rounded", STATUS_STYLE[inv.status])}>{inv.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">{formatINRFull(inv.total)}</td>
                    <td className="px-4 py-3 text-foreground/60">{inv.due_at ? formatDate(inv.due_at) : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {inv.status === "draft" && (
                          <button onClick={() => send.mutate(inv.id)} className="w-8 h-8 rounded-lg hover:bg-[#E4E8FF] flex items-center justify-center text-[#3C50E0]" title="Send"><Send className="w-3.5 h-3.5" /></button>
                        )}
                        {inv.status !== "paid" && inv.status !== "cancelled" && (
                          <button onClick={() => markPaid.mutate(inv.id)} className="w-8 h-8 rounded-lg hover:bg-[#E6F7EE] flex items-center justify-center text-[#0E8A4B]" title="Mark paid"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                        )}
                        <button onClick={() => { setEditInvoice(inv); setFormOpen(true); }} className="w-8 h-8 rounded-lg hover:bg-[#FFF1D6] flex items-center justify-center text-foreground/60" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteTarget(inv)} className="w-8 h-8 rounded-lg hover:bg-[#FCE5F0] flex items-center justify-center text-[#D4308E]" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {formOpen && (
        <InvoiceFormDialog
          invoice={editInvoice}
          contacts={contacts}
          saving={create.isPending || update.isPending}
          onClose={() => { setFormOpen(false); setEditInvoice(null); }}
          onSubmit={(data) => { if (editInvoice) update.mutate({ id: editInvoice.id, ...data }); else create.mutate(data); }}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
            <AlertDialogDescription>"{deleteTarget?.invoice_number}" and its line items will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-[#D4308E] hover:bg-[#B82878]" onClick={() => { if (deleteTarget) del.mutate(deleteTarget.id); setDeleteTarget(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
};

const Stat = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-3.5">
    <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/55 mb-1.5">{label}</div>
    <div className="text-[20px] font-black tabular-nums leading-none" style={{ color }}>{value}</div>
  </div>
);

const InvoiceFormDialog = ({ invoice, contacts, saving, onClose, onSubmit }: {
  invoice: Invoice | null;
  contacts: { id: string; name: string }[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
}) => {
  const [contactId, setContactId] = useState(invoice?.contact_id ?? "");
  const [status, setStatus] = useState<InvoiceStatus>(invoice?.status ?? "draft");
  const [issueDate, setIssueDate] = useState(toDateInput(invoice?.issue_date) || new Date().toISOString().slice(0, 10));
  const [dueAt, setDueAt] = useState(toDateInput(invoice?.due_at));
  const [taxRate, setTaxRate] = useState(String(invoice?.tax_rate ?? "18"));
  const [discount, setDiscount] = useState(String(invoice?.discount ?? "0"));
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [lines, setLines] = useState<LineRow[]>(
    invoice?.line_items?.length
      ? invoice.line_items.map((l) => ({ description: l.description, quantity: String(l.quantity), unit_price: String(l.unit_price) }))
      : [{ description: "", quantity: "1", unit_price: "" }],
  );

  const subtotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0), 0);
  const taxAmount = (subtotal * (Number(taxRate) || 0)) / 100;
  const total = subtotal + taxAmount - (Number(discount) || 0);

  const updateLine = (i: number, patch: Partial<LineRow>) => setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, { description: "", quantity: "1", unit_price: "" }]);
  const removeLine = (i: number) => setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  const submit = () => {
    const valid = lines.filter((l) => l.description.trim());
    if (valid.length === 0) { toast.error("Add at least one line item with a description"); return; }
    onSubmit({
      contact_id: contactId || null,
      status,
      issue_date: issueDate ? new Date(issueDate).toISOString() : new Date().toISOString(),
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      tax_rate: Number(taxRate) || 0,
      discount: Number(discount) || 0,
      notes: notes.trim() || null,
      line_items: valid.map((l) => ({ description: l.description.trim(), quantity: Number(l.quantity) || 0, unit_price: Number(l.unit_price) || 0 })),
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{invoice ? `Edit ${invoice.invoice_number}` : "New invoice"}</DialogTitle>
          <DialogDescription>Add line items — totals calculate automatically.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Contact</Label>
              <select value={contactId} onChange={(e) => setContactId(e.target.value)} className="w-full h-10 px-2 rounded-lg bg-[#FFF6E8] border-2 border-[#E8B968] text-[13px] font-semibold focus:outline-none focus:border-[#FF6A1F]">
                <option value="">No contact</option>
                {contacts.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Issue date</Label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div>
              <Label>Due date</Label>
              <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </div>
          </div>

          {/* LINE ITEMS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Line items</Label>
              <Button variant="outline" size="sm" className="gap-1 h-8" onClick={addLine}><Plus className="w-3.5 h-3.5" /> Add row</Button>
            </div>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} placeholder="Description" className="flex-1" />
                  <Input value={l.quantity} onChange={(e) => updateLine(i, { quantity: e.target.value })} placeholder="Qty" type="number" className="w-16" />
                  <Input value={l.unit_price} onChange={(e) => updateLine(i, { unit_price: e.target.value })} placeholder="Price" type="number" className="w-24" />
                  <div className="w-24 text-right text-[13px] font-bold tabular-nums">{formatINRFull((Number(l.quantity) || 0) * (Number(l.unit_price) || 0))}</div>
                  <button onClick={() => removeLine(i)} className="w-8 h-8 rounded-lg hover:bg-[#FCE5F0] flex items-center justify-center text-[#D4308E] flex-shrink-0" title="Remove"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Tax rate (%)</Label>
              <Input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
            </div>
            <div>
              <Label>Discount (₹)</Label>
              <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div>
              <Label>Status</Label>
              <select value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)} className="w-full h-10 px-2 rounded-lg bg-[#FFF6E8] border-2 border-[#E8B968] text-[13px] font-semibold focus:outline-none focus:border-[#FF6A1F]">
                {(["draft", "sent", "paid", "overdue", "cancelled"] as InvoiceStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* TOTALS */}
          <div className="rounded-xl bg-[#FFF6E8] border-2 border-[#E8B968] p-3 space-y-1 text-[13px]">
            <Row label="Subtotal" value={formatINRFull(subtotal)} />
            <Row label={`Tax (${Number(taxRate) || 0}%)`} value={formatINRFull(taxAmount)} />
            <Row label="Discount" value={`- ${formatINRFull(Number(discount) || 0)}`} />
            <div className="flex items-center justify-between pt-1.5 border-t border-[#E8B968] mt-1.5">
              <span className="text-[14px] font-extrabold inline-flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" /> Total</span>
              <span className="text-[18px] font-black tabular-nums text-[#0E8A4B]">{formatINRFull(total)}</span>
            </div>
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, thank-you note…" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : invoice ? "Save" : "Create invoice"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between text-foreground/70">
    <span>{label}</span>
    <span className="font-bold tabular-nums">{value}</span>
  </div>
);

const EmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-[#FFF1D6] border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] flex items-center justify-center mb-5">
      <FileText className="w-7 h-7 text-[#FF6A1F]" />
    </div>
    <h3 className="text-lg font-black mb-1">No invoices yet</h3>
    <p className="text-sm font-semibold text-foreground/55 max-w-sm mb-4">Create your first invoice, add line items, then send it and mark it paid.</p>
    <Button onClick={onAdd} className="gap-2"><Plus className="w-4 h-4" /> New Invoice</Button>
  </div>
);

export default InvoicesPage;
