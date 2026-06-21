import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Trash2, Mail, ShieldCheck } from "lucide-react";
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
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import type { TeamMember, TeamRole, TeamMemberStatus } from "@/lib/api-types";

export const ROLES: { id: TeamRole; label: string }[] = [
  { id: "owner", label: "Owner" },
  { id: "admin", label: "Admin" },
  { id: "manager", label: "Manager" },
  { id: "agent", label: "Agent" },
  { id: "viewer", label: "Viewer" },
];

const roleStyle: Record<TeamRole, string> = {
  owner: "bg-[#E6F7EE] text-[#0A6E3C]",
  admin: "bg-[#FFE2CC] text-[#C24E12]",
  manager: "bg-[#E4E8FF] text-[#3C50E0]",
  agent: "bg-[#EDE4FF] text-[#6D28D9]",
  viewer: "bg-[#F1F1F1] text-[#6B7280]",
};

const statusStyle: Record<TeamMemberStatus, string> = {
  invited: "bg-[#FFF1D6] text-[#B8651A]",
  active: "bg-[#E6F7EE] text-[#0A6E3C]",
  suspended: "bg-[#FCE5F0] text-[#D4308E]",
};

const useTeam = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["team", user?.id],
    enabled: !!user,
    queryFn: () => api.listTeam() as Promise<TeamMember[]>,
  });
};

const initials = (m: TeamMember) => (m.name || m.email).slice(0, 2).toUpperCase();

export const TeamPage = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: members = [], isLoading } = useTeam();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["team", user?.id] });
  const invite = useMutation({
    mutationFn: (data: { email: string; name?: string; role?: string }) => api.inviteTeamMember(data),
    onSuccess: () => { invalidate(); toast.success("Invitation added"); setInviteOpen(false); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const update = useMutation({
    mutationFn: ({ id, ...data }: Record<string, unknown> & { id: string }) => api.updateTeamMember(id, data),
    onSuccess: () => { invalidate(); toast.success("Member updated"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.removeTeamMember(id),
    onSuccess: () => { invalidate(); toast.success("Member removed"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <PageShell
      title="Team Members"
      subtitle="Apni team ko jodo aur unka role set karo"
      icon={<Users className="w-5 h-5" />}
      actions={<Button size="sm" className="gap-2" onClick={() => setInviteOpen(true)}><Plus className="w-3.5 h-3.5" /> Invite</Button>}
    >
      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : members.length === 0 ? (
        <EmptyState onAdd={() => setInviteOpen(true)} />
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-3.5 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#FF6A1F] text-white flex items-center justify-center font-black text-[14px] flex-shrink-0">{initials(m)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-bold">{m.name || "—"}</span>
                  <span className={cn("text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded", statusStyle[m.status])}>{m.status}</span>
                </div>
                <div className="flex items-center gap-1 text-[12px] text-foreground/55"><Mail className="w-3 h-3" /> {m.email}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={m.role}
                  onChange={(e) => update.mutate({ id: m.id, role: e.target.value })}
                  className={cn("h-9 px-2 rounded-lg border-2 border-[#E8B968] text-[12px] font-bold focus:outline-none focus:border-[#FF6A1F] cursor-pointer", roleStyle[m.role])}
                >
                  {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
                {m.status !== "suspended" ? (
                  <button onClick={() => update.mutate({ id: m.id, status: "suspended" })} className="h-9 px-2.5 rounded-lg border-2 border-[#E8B968] text-[11px] font-bold text-[#B8651A] hover:bg-[#FFF1D6]" title="Suspend">Suspend</button>
                ) : (
                  <button onClick={() => update.mutate({ id: m.id, status: "active" })} className="h-9 px-2.5 rounded-lg border-2 border-[#E8B968] text-[11px] font-bold text-[#0A6E3C] hover:bg-[#E6F7EE]" title="Reactivate">Activate</button>
                )}
                <button onClick={() => setDeleteTarget(m)} className="w-9 h-9 rounded-lg hover:bg-[#FCE5F0] flex items-center justify-center text-[#D4308E]" title="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-start gap-2 text-[12px] font-semibold text-foreground/50 bg-[#FFF6E8] border-2 border-[#E8B968] rounded-xl p-3">
        <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#0E8A4B]" />
        <span>Roles here organize your team roster and define a permission blueprint. Manage detailed permissions in Roles &amp; Permissions.</span>
      </div>

      {inviteOpen && (
        <InviteDialog
          saving={invite.isPending}
          onClose={() => setInviteOpen(false)}
          onSubmit={(data) => invite.mutate(data)}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>{deleteTarget?.email} will lose their place on the roster.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-[#D4308E] hover:bg-[#B82878]" onClick={() => { if (deleteTarget) remove.mutate(deleteTarget.id); setDeleteTarget(null); }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
};

const InviteDialog = ({ saving, onClose, onSubmit }: {
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: { email: string; name?: string; role?: string }) => void;
}) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<TeamRole>("agent");

  const submit = () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { toast.error("Enter a valid email"); return; }
    onSubmit({ email: email.trim(), name: name.trim() || undefined, role });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite team member</DialogTitle>
          <DialogDescription>Add a teammate to your roster and assign a role.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@business.in" autoFocus />
          </div>
          <div>
            <Label>Name (optional)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <Label>Role</Label>
            <select value={role} onChange={(e) => setRole(e.target.value as TeamRole)} className="w-full h-10 px-2 rounded-lg bg-[#FFF6E8] border-2 border-[#E8B968] text-[13px] font-semibold focus:outline-none focus:border-[#FF6A1F]">
              {ROLES.filter((r) => r.id !== "owner").map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Adding…" : "Send invite"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const EmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-[#FFF1D6] border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] flex items-center justify-center mb-5">
      <Users className="w-7 h-7 text-[#FF6A1F]" />
    </div>
    <h3 className="text-lg font-black mb-1">No team members yet</h3>
    <p className="text-sm font-semibold text-foreground/55 max-w-sm mb-4">Invite your team so everyone can work the same inbox, CRM and pipeline.</p>
    <Button onClick={onAdd} className="gap-2"><Plus className="w-4 h-4" /> Invite member</Button>
  </div>
);

export default TeamPage;
