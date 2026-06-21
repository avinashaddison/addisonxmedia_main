import { useMemo, useState } from "react";
import { CheckSquare, Plus, Trash2, Pencil, Calendar, CheckCircle2, Circle, Download } from "lucide-react";
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
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useContactsLookup } from "@/hooks/useCrmData";
import { cn } from "@/lib/utils";
import { formatDate, toDateInput, downloadCsv } from "@/lib/format";
import { toast } from "sonner";
import type { Task, TaskPriority, Contact } from "@/lib/api-types";

type TaskWithContact = Task & { contact?: Contact | null };

const PRIORITIES: { id: TaskPriority; label: string; pill: string }[] = [
  { id: "urgent", label: "Urgent", pill: "bg-[#FCE5F0] text-[#D4308E]" },
  { id: "high", label: "High", pill: "bg-[#FFF1D6] text-[#B8651A]" },
  { id: "medium", label: "Medium", pill: "bg-[#E4E8FF] text-[#3C50E0]" },
  { id: "low", label: "Low", pill: "bg-[#F1F1F1] text-[#6B7280]" },
];
const priorityPill = (p: TaskPriority) => PRIORITIES.find((x) => x.id === p)?.pill ?? PRIORITIES[2].pill;

type Filter = "all" | "pending" | "completed";

export const TasksPage = () => {
  const { data: tasks = [], isLoading } = useTasks();
  const create = useCreateTask();
  const update = useUpdateTask();
  const del = useDeleteTask();
  const { data: contacts = [] } = useContactsLookup();

  const [filter, setFilter] = useState<Filter>("all");
  const [editTask, setEditTask] = useState<TaskWithContact | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TaskWithContact | null>(null);

  const filtered = useMemo(() => {
    const list = tasks as TaskWithContact[];
    if (filter === "pending") return list.filter((t) => t.status !== "completed" && t.status !== "cancelled");
    if (filter === "completed") return list.filter((t) => t.status === "completed");
    return list;
  }, [tasks, filter]);

  const counts = useMemo(() => {
    const list = tasks as TaskWithContact[];
    return {
      all: list.length,
      pending: list.filter((t) => t.status !== "completed" && t.status !== "cancelled").length,
      completed: list.filter((t) => t.status === "completed").length,
    };
  }, [tasks]);

  const toggleDone = (t: TaskWithContact) => {
    const done = t.status === "completed";
    update.mutate({ id: t.id, status: done ? "pending" : "completed", completed_at: done ? null : new Date().toISOString() });
  };

  const exportCsv = () => {
    if (filtered.length === 0) { toast.error("No tasks to export"); return; }
    downloadCsv(
      `tasks-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Title", "Status", "Priority", "Due", "Contact", "Notes"],
      filtered.map((t) => [t.title, t.status, t.priority, t.due_at ? formatDate(t.due_at) : "", t.contact?.name ?? "", t.notes ?? ""]),
    );
    toast.success(`Exported ${filtered.length} tasks`);
  };

  return (
    <PageShell
      title="Tasks"
      subtitle="Saare to-dos ek jagah — team ke liye"
      icon={<CheckSquare className="w-5 h-5" />}
      actions={
        <>
          <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <Button size="sm" className="gap-2" onClick={() => { setEditTask(null); setFormOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> New Task
          </Button>
        </>
      }
    >
      {/* FILTER TABS */}
      <div className="flex items-center gap-2 mb-4">
        {(["all", "pending", "completed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "h-9 px-4 rounded-xl text-[12px] font-extrabold capitalize transition-all border-2",
              filter === f
                ? "bg-[#FF6A1F] text-white border-[#B8420A] shadow-[0_3px_0_0_#B8420A]"
                : "bg-white text-foreground border-[#E8B968] hover:bg-[#FFE8C7]",
            )}
          >
            {f} <span className="opacity-70">({counts[f]})</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState onAdd={() => { setEditTask(null); setFormOpen(true); }} />
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const done = t.status === "completed";
            return (
              <div
                key={t.id}
                className={cn(
                  "bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-3.5 flex items-center gap-3",
                  done && "opacity-60",
                )}
              >
                <button onClick={() => toggleDone(t)} className="flex-shrink-0" title={done ? "Mark pending" : "Mark done"}>
                  {done ? <CheckCircle2 className="w-6 h-6 text-[#0E8A4B]" /> : <Circle className="w-6 h-6 text-foreground/30 hover:text-[#FF6A1F]" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-[14px] font-bold", done && "line-through")}>{t.title}</span>
                    <span className={cn("text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded", priorityPill(t.priority))}>{t.priority}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[11px] font-semibold text-foreground/55 flex-wrap">
                    {t.due_at && <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(t.due_at)}</span>}
                    {t.contact?.name && <span>· {t.contact.name}</span>}
                    {t.notes && <span className="truncate">· {t.notes}</span>}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => { setEditTask(t); setFormOpen(true); }} className="w-8 h-8 rounded-lg hover:bg-[#FFF1D6] flex items-center justify-center text-foreground/60" title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteTarget(t)} className="w-8 h-8 rounded-lg hover:bg-[#FCE5F0] flex items-center justify-center text-[#D4308E]" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formOpen && (
        <TaskFormDialog
          task={editTask}
          contacts={contacts}
          saving={create.isPending || update.isPending}
          onClose={() => { setFormOpen(false); setEditTask(null); }}
          onSubmit={(data) => {
            if (editTask) update.mutate({ id: editTask.id, ...data }, { onSuccess: () => { setFormOpen(false); setEditTask(null); toast.success("Task updated"); } });
            else create.mutate(data, { onSuccess: () => setFormOpen(false) });
          }}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>"{deleteTarget?.title}" will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#D4308E] hover:bg-[#B82878]"
              onClick={() => { if (deleteTarget) del.mutate(deleteTarget.id); setDeleteTarget(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
};

const TaskFormDialog = ({ task, contacts, saving, onClose, onSubmit }: {
  task: TaskWithContact | null;
  contacts: { id: string; name: string }[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
}) => {
  const [title, setTitle] = useState(task?.title ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [dueAt, setDueAt] = useState(toDateInput(task?.due_at));
  const [contactId, setContactId] = useState(task?.contact_id ?? "");

  const submit = () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    onSubmit({
      title: title.trim(),
      notes: notes.trim() || null,
      priority,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      contact_id: contactId || null,
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>{task ? "Update this to-do." : "Add a to-do for you or your team."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Call back, send quote…" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="w-full h-10 px-2 rounded-lg bg-[#FFF6E8] border-2 border-[#E8B968] text-[13px] font-semibold focus:outline-none focus:border-[#FF6A1F]">
                {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Due date</Label>
              <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Linked contact (optional)</Label>
            <select value={contactId} onChange={(e) => setContactId(e.target.value)} className="w-full h-10 px-2 rounded-lg bg-[#FFF6E8] border-2 border-[#E8B968] text-[13px] font-semibold focus:outline-none focus:border-[#FF6A1F]">
              <option value="">No contact</option>
              {contacts.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Extra detail…" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : task ? "Save" : "Add task"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const EmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-[#FFF1D6] border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] flex items-center justify-center mb-5">
      <CheckSquare className="w-7 h-7 text-[#FF6A1F]" />
    </div>
    <h3 className="text-lg font-black mb-1">No tasks here</h3>
    <p className="text-sm font-semibold text-foreground/55 max-w-sm mb-4">Create a task to keep track of what needs doing.</p>
    <Button onClick={onAdd} className="gap-2"><Plus className="w-4 h-4" /> New Task</Button>
  </div>
);

export default TasksPage;
