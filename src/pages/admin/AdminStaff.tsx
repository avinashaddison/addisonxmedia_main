import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { ShieldCheck, Crown, Loader2, Trash2, UserPlus, Mail } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const ROLES: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "#ef4444" },
  support:     { label: "Support",     color: "#4f46e5" },
  billing:     { label: "Billing",     color: "#10b981" },
  moderator:   { label: "Moderator",   color: "#ec4899" },
};

const AdminStaff = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("support");
  const [inviting, setInviting] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: () => adminApi.staff(),
  });

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) { toast.error("Valid email required"); return; }
    setInviting(true);
    try {
      const r = await adminApi.promoteStaff(email, inviteRole);
      toast.success(`Promoted ${r.email} to ${r.adminRole.replace("_", " ")}`);
      qc.invalidateQueries({ queryKey: ["admin-staff"] });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("support");
    } catch (e) { toast.error(String(e)); }
    finally { setInviting(false); }
  };

  const changeRole = async (id: string, role: string) => {
    try {
      await adminApi.updateStaffRole(id, role);
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["admin-staff"] });
    } catch (e) { toast.error(String(e)); }
  };

  const removeStaff = async (id: string) => {
    try {
      await adminApi.removeStaff(id);
      toast.success("Staff removed");
      qc.invalidateQueries({ queryKey: ["admin-staff"] });
    } catch (e) { toast.error(String(e)); }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3.5 border-b border-slate-200/80 pb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-5.5 h-5.5 text-indigo-400" strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-[24px] font-black tracking-tight text-slate-900">Staff management</h1>
            <p className="text-[12px] text-slate-500 font-medium">{rows.length} staff members · only super_admin can promote/demote</p>
          </div>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="bg-slate-900 text-white hover:bg-slate-800 transition active:scale-[0.98]">
          <UserPlus className="w-3.5 h-3.5 mr-1" /> Promote user to staff
        </Button>
      </div>

      {/* Staff Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1.6fr_180px_140px_140px_80px] gap-3 px-5 py-3.5 border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <div>Staff member</div>
          <div>Role</div>
          <div>Joined</div>
          <div>Last admin login</div>
          <div></div>
        </div>

        {isLoading && (
          <div className="px-4 py-12 text-center">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-650" />
          </div>
        )}

        {rows.map((s) => {
          const r = ROLES[s.adminRole] ?? { label: s.adminRole, color: "#475569" };
          const isSelf = s.id === user?.id;
          return (
            <div key={s.id} className="grid grid-cols-[1.6fr_180px_140px_140px_80px] gap-3 px-5 py-3 border-b border-slate-100 last:border-b-0 items-center">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-650 text-white flex items-center justify-center text-[12px] font-bold shadow-sm flex-shrink-0">
                  {s.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-slate-805 truncate flex items-center gap-1.5">
                    {s.name}
                    {isSelf && <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-150 text-indigo-600 font-bold uppercase">You</span>}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono truncate">{s.email}</p>
                </div>
              </div>
              <Select value={s.adminRole} onValueChange={(v) => changeRole(s.id, v)} disabled={isSelf}>
                <SelectTrigger className="h-9 border-slate-200 focus:ring-indigo-600"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[12px] text-slate-500 font-medium">{new Date(s.createdAt).toLocaleDateString("en-IN")}</p>
              <p className="text-[12px] text-slate-400 font-medium">{s.adminLastLoginAt ? new Date(s.adminLastLoginAt).toLocaleDateString("en-IN") : "—"}</p>
              {!isSelf && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="bg-rose-600 hover:bg-rose-700 active:scale-[0.98]">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove {s.name} from staff?</AlertDialogTitle>
                      <AlertDialogDescription>They will keep their account but lose all admin access immediately.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => removeStaff(s.id)} className="bg-rose-600 text-white hover:bg-rose-700">Remove</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] text-slate-400 font-medium flex items-center gap-1">
        <Crown className="w-3.5 h-3.5 text-amber-500" /> To promote a user to staff: they must sign up at <code className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded font-mono text-[10.5px]">/auth</code> first, then use the "Promote user to staff" button above.
      </p>

      {/* Promote dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex items-center justify-center shadow-sm">
                <UserPlus className="w-5 h-5 text-indigo-400" strokeWidth={2.2} />
              </div>
              <div>
                <DialogTitle>Promote user to staff</DialogTitle>
                <DialogDescription className="text-slate-400 font-medium text-[12px]">
                  Enter their email and pick a role. They must have signed up at /auth already.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">User email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@addisonxmedia.com"
                  className="pl-9 border-slate-200 focus-visible:ring-indigo-600"
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="border-slate-200 focus:ring-indigo-600"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="support">Support — read-only customer data, can impersonate</SelectItem>
                  <SelectItem value="billing">Billing — view/edit subscriptions, refunds</SelectItem>
                  <SelectItem value="moderator">Moderator — suspend abusive accounts</SelectItem>
                  <SelectItem value="super_admin">Super Admin — full access (use carefully)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} className="border-slate-250">Cancel</Button>
            <Button onClick={handleInvite} disabled={inviting} className="bg-slate-900 hover:bg-slate-800 text-white transition active:scale-[0.98]">
              {inviting ? "Promoting…" : "Promote to staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStaff;
