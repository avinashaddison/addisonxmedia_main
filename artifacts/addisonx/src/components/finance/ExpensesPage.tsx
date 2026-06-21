import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Receipt, Plus, Trash2, Pencil, Download } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatINRFull, formatDate, toDateInput, downloadCsv } from "@/lib/format";
import { toast } from "sonner";
import type { Expense } from "@/lib/api-types";

const CATEGORIES = ["Marketing", "Software", "Salary", "Rent", "Travel", "Utilities", "Supplies", "Taxes", "General"];

const catColor = (cat: string) => {
  const palette = ["#FF6A1F", "#0E8A4B", "#3C50E0", "#D4308E", "#7C3AED", "#B8651A", "#FFD23F"];
  let h = 0;
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) % palette.length;
  return palette[h];
};

const useExpenses = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["expenses", user?.id],
    enabled: !!user,
    queryFn: () => api.listExpenses() as Promise<Expense[]>,
  });
};

export const ExpensesPage = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: expenses = [], isLoading } = useExpenses();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["expenses", user?.id] });
    qc.invalidateQueries({ queryKey: ["revenue", user?.id] });
  };
  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createExpense(data),
    onSuccess: () => { invalidate(); toast.success("Expense added"); setFormOpen(false); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const update = useMutation({
    mutationFn: ({ id, ...data }: Record<string, unknown> & { id: string }) => api.updateExpense(id, data),
    onSuccess: () => { invalidate(); toast.success("Expense updated"); setFormOpen(false); setEditExpense(null); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.deleteExpense(id),
    onSuccess: () => { invalidate(); toast.success("Expense deleted"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const categories = useMemo(() => {
    const set = new Set<string>(expenses.map((e) => e.category));
    return ["all", ...[...set].sort()];
  }, [expenses]);

  const filtered = useMemo(
    () => (categoryFilter === "all" ? expenses : expenses.filter((e) => e.category === categoryFilter)),
    [expenses, categoryFilter],
  );
  const total = useMemo(() => filtered.reduce((s, e) => s + Number(e.amount || 0), 0), [filtered]);

  const exportCsv = () => {
    if (filtered.length === 0) { toast.error("No expenses to export"); return; }
    downloadCsv(
      `expenses-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Date", "Category", "Description", "Vendor", "Amount"],
      filtered.map((e) => [formatDate(e.spent_at), e.category, e.description, e.vendor ?? "", Number(e.amount || 0)]),
    );
    toast.success(`Exported ${filtered.length} expenses`);
  };

  return (
    <PageShell
      title="Expenses"
      subtitle="Business kharche track karo, category-wise"
      icon={<Receipt className="w-5 h-5" />}
      actions={
        <>
          <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv}><Download className="w-3.5 h-3.5" /> Export</Button>
          <Button size="sm" className="gap-2" onClick={() => { setEditExpense(null); setFormOpen(true); }}><Plus className="w-3.5 h-3.5" /> New Expense</Button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 px-3 rounded-xl bg-white border-2 border-[#E8B968] text-[12px] font-bold focus:outline-none focus:border-[#FF6A1F] shadow-[0_3px_0_0_#E8B968]"
        >
          {categories.map((c) => <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>)}
        </select>
        <div className="ml-auto bg-white border-2 border-[#E8B968] rounded-xl px-4 h-9 flex items-center gap-2 shadow-[0_3px_0_0_#E8B968]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/55">Total</span>
          <span className="text-[15px] font-black tabular-nums text-[#D4308E]">{formatINRFull(total)}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState onAdd={() => { setEditExpense(null); setFormOpen(true); }} hasFilter={categoryFilter !== "all"} />
      ) : (
        <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#FFF1D6] text-left text-[11px] font-bold uppercase tracking-wider text-foreground/55">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Description</th>
                  <th className="px-4 py-2.5">Vendor</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-t border-[#F0DCB8] hover:bg-[#FFFBF2]">
                    <td className="px-4 py-3 text-foreground/60 whitespace-nowrap">{formatDate(e.spent_at)}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded text-white" style={{ backgroundColor: catColor(e.category) }}>{e.category}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{e.description}</td>
                    <td className="px-4 py-3 text-foreground/70">{e.vendor ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-[#D4308E]">{formatINRFull(e.amount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditExpense(e); setFormOpen(true); }} className="w-8 h-8 rounded-lg hover:bg-[#FFF1D6] flex items-center justify-center text-foreground/60" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteTarget(e)} className="w-8 h-8 rounded-lg hover:bg-[#FCE5F0] flex items-center justify-center text-[#D4308E]" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
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
        <ExpenseFormDialog
          expense={editExpense}
          saving={create.isPending || update.isPending}
          onClose={() => { setFormOpen(false); setEditExpense(null); }}
          onSubmit={(data) => { if (editExpense) update.mutate({ id: editExpense.id, ...data }); else create.mutate(data); }}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>"{deleteTarget?.description}" will be permanently removed.</AlertDialogDescription>
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

const ExpenseFormDialog = ({ expense, saving, onClose, onSubmit }: {
  expense: Expense | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
}) => {
  const [category, setCategory] = useState(expense?.category ?? "General");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [amount, setAmount] = useState(String(expense?.amount ?? ""));
  const [vendor, setVendor] = useState(expense?.vendor ?? "");
  const [spentAt, setSpentAt] = useState(toDateInput(expense?.spent_at) || new Date().toISOString().slice(0, 10));

  const submit = () => {
    if (!description.trim()) { toast.error("Description is required"); return; }
    if (!(Number(amount) > 0)) { toast.error("Enter a valid amount"); return; }
    onSubmit({
      category: category.trim() || "General",
      description: description.trim(),
      amount: Number(amount),
      vendor: vendor.trim() || null,
      spent_at: spentAt ? new Date(spentAt).toISOString() : new Date().toISOString(),
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{expense ? "Edit expense" : "New expense"}</DialogTitle>
          <DialogDescription>{expense ? "Update this expense." : "Record a business cost."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-10 px-2 rounded-lg bg-[#FFF6E8] border-2 border-[#E8B968] text-[13px] font-semibold focus:outline-none focus:border-[#FF6A1F]">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>Amount (₹)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was this for?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Vendor (optional)</Label>
              <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Paid to…" />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={spentAt} onChange={(e) => setSpentAt(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : expense ? "Save" : "Add expense"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const EmptyState = ({ onAdd, hasFilter }: { onAdd: () => void; hasFilter: boolean }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-[#FFF1D6] border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] flex items-center justify-center mb-5">
      <Receipt className="w-7 h-7 text-[#FF6A1F]" />
    </div>
    <h3 className="text-lg font-black mb-1">{hasFilter ? "No expenses in this category" : "No expenses yet"}</h3>
    <p className="text-sm font-semibold text-foreground/55 max-w-sm mb-4">{hasFilter ? "Try another category." : "Track your business costs to see net profit in Revenue."}</p>
    {!hasFilter && <Button onClick={onAdd} className="gap-2"><Plus className="w-4 h-4" /> New Expense</Button>}
  </div>
);

export default ExpensesPage;
