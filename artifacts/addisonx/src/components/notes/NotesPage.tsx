import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StickyNote, Plus, Trash2, Pencil, Pin, PinOff, Search, User } from "lucide-react";
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
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import type { Note } from "@/lib/api-types";

const useNotes = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notes", user?.id],
    enabled: !!user,
    queryFn: () => api.listNotes() as Promise<Note[]>,
  });
};

export const NotesPage = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: notes = [], isLoading } = useNotes();
  const { data: contacts = [] } = useContactsLookup();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["notes", user?.id] });

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createNote(data),
    onSuccess: () => { invalidate(); toast.success("Note saved"); setFormOpen(false); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const update = useMutation({
    mutationFn: ({ id, ...data }: Record<string, unknown> & { id: string }) => api.updateNote(id, data),
    onSuccess: () => { invalidate(); toast.success("Note updated"); setFormOpen(false); setEditNote(null); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.deleteNote(id),
    onSuccess: () => { invalidate(); toast.success("Note removed"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const togglePin = (n: Note) => update.mutate({ id: n.id, pinned: !n.pinned });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = q
      ? notes.filter((n) =>
          (n.title ?? "").toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q) ||
          (n.contact_name ?? "").toLowerCase().includes(q))
      : notes;
    return [...list].sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
  }, [notes, search]);

  return (
    <PageShell
      title="Notes"
      subtitle="Quick notes — kisi bhi contact se jodo"
      icon={<StickyNote className="w-5 h-5" />}
      actions={
        <Button size="sm" className="gap-2" onClick={() => { setEditNote(null); setFormOpen(true); }}>
          <Plus className="w-3.5 h-3.5" /> New Note
        </Button>
      }
    >
      <div className="bg-white border-2 border-[#E8B968] rounded-2xl p-3 mb-4 shadow-[0_3px_0_0_#E8B968]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B8651A]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes…"
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#FFF6E8] border-2 border-[#E8B968] text-[13px] font-medium focus:outline-none focus:border-[#FF6A1F] focus:bg-white"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState onAdd={() => { setEditNote(null); setFormOpen(true); }} hasQuery={!!search} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((n) => (
            <div key={n.id} className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-4 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h3 className="text-[14px] font-bold leading-tight flex-1">{n.title || "Untitled note"}</h3>
                {n.pinned && <Pin className="w-3.5 h-3.5 text-[#FF6A1F] flex-shrink-0 fill-[#FF6A1F]" />}
              </div>
              <p className="text-[13px] text-foreground/70 whitespace-pre-wrap line-clamp-5 flex-1">{n.body}</p>
              <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-[#F0DCB8]">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/45 min-w-0">
                  {n.contact_name ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#E6F7EE] text-[#0A6E3C] truncate">
                      <User className="w-3 h-3" /> {n.contact_name}
                    </span>
                  ) : (
                    <span>{formatDate(n.updated_at)}</span>
                  )}
                </div>
                <div className="flex gap-0.5 flex-shrink-0">
                  <button onClick={() => togglePin(n)} className="w-7 h-7 rounded-lg hover:bg-[#FFF1D6] flex items-center justify-center text-foreground/55" title={n.pinned ? "Unpin" : "Pin"}>
                    {n.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => { setEditNote(n); setFormOpen(true); }} className="w-7 h-7 rounded-lg hover:bg-[#FFF1D6] flex items-center justify-center text-foreground/55" title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteTarget(n)} className="w-7 h-7 rounded-lg hover:bg-[#FCE5F0] flex items-center justify-center text-[#D4308E]" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <NoteFormDialog
          note={editNote}
          contacts={contacts}
          saving={create.isPending || update.isPending}
          onClose={() => { setFormOpen(false); setEditNote(null); }}
          onSubmit={(data) => {
            if (editNote) update.mutate({ id: editNote.id, ...data });
            else create.mutate(data);
          }}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>This note will be permanently removed.</AlertDialogDescription>
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

const NoteFormDialog = ({ note, contacts, saving, onClose, onSubmit }: {
  note: Note | null;
  contacts: { id: string; name: string }[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
}) => {
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [contactId, setContactId] = useState(note?.contact_id ?? "");
  const [pinned, setPinned] = useState(note?.pinned ?? false);

  const submit = () => {
    if (!body.trim()) { toast.error("Note body is required"); return; }
    onSubmit({ title: title.trim() || null, body: body.trim(), contact_id: contactId || null, pinned });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{note ? "Edit note" : "New note"}</DialogTitle>
          <DialogDescription>{note ? "Update this note." : "Jot something down and optionally link a contact."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title (optional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title…" autoFocus />
          </div>
          <div>
            <Label>Note</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your note…" rows={5} />
          </div>
          <div>
            <Label>Linked contact (optional)</Label>
            <select value={contactId} onChange={(e) => setContactId(e.target.value)} className="w-full h-10 px-2 rounded-lg bg-[#FFF6E8] border-2 border-[#E8B968] text-[13px] font-semibold focus:outline-none focus:border-[#FF6A1F]">
              <option value="">No contact</option>
              {contacts.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="w-4 h-4 accent-[#FF6A1F]" />
            <span className="text-[13px] font-semibold">Pin to top</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : note ? "Save" : "Add note"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const EmptyState = ({ onAdd, hasQuery }: { onAdd: () => void; hasQuery: boolean }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-[#FFF1D6] border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] flex items-center justify-center mb-5">
      <StickyNote className="w-7 h-7 text-[#FF6A1F]" />
    </div>
    <h3 className="text-lg font-black mb-1">{hasQuery ? "No matching notes" : "No notes yet"}</h3>
    <p className="text-sm font-semibold text-foreground/55 max-w-sm mb-4">
      {hasQuery ? "Try a different search." : "Capture ideas, reminders and context — link them to contacts when useful."}
    </p>
    {!hasQuery && <Button onClick={onAdd} className="gap-2"><Plus className="w-4 h-4" /> New Note</Button>}
  </div>
);

export default NotesPage;
