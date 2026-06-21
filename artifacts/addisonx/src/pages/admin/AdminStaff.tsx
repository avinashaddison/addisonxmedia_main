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
import { PageShell } from "@/components/PageShell";
import { cn } from "@/lib/utils";

const ROLES: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "#D4308E" },
  support:     { label: "Support",     color: "#3C50E0" },
  billing:     { label: "Billing",     color: "#0E8A4B" },
  moderator:   { label: "Moderator",   color: "#FF6A1F" },
};

const colors = ["bg-[#FF6A1F]", "bg-[#0E8A4B]", "bg-[#3C50E0]", "bg-[#D4308E]", "bg-[#E8B968]"];

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

  const headerActions = (
    <button
      onClick={() => setInviteOpen(true)}
      className="px-4 py-2 rounded-xl text-[12px] font-extrabold bg-[#0E8A4B] border-2 border-[#0A6E3C] shadow-[0_2px_0_0_#073D22] text-white hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_1px_0_0_#073D22] transition-all flex items-center gap-1.5"
    >
      <UserPlus className="w-4 h-4" /> Promote user to staff
    </button>
  );

  return (
    <PageShell
      title="Staff Management"
      subtitle={`${rows.length} staff members · only super_admin can promote/demote`}
      icon={<ShieldCheck className="w-5 h-5 text-white" strokeWidth={2.5} />}
      actions={headerActions}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Staff Table */}
        <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_5px_0_0_#E8B968]">
          <div className="grid grid-cols-[1.6fr_180px_140px_140px_80px] gap-3 px-5 py-3.5 border-b-2 border-[#E8B968] bg-[#FFF6E8] text-[10px] font-extrabold uppercase tracking-wider text-[#0A3D24]">
            <div>Staff Member</div>
            <div>Role</div>
            <div>Joined</div>
            <div>Last Login</div>
            <div></div>
          </div>

          {isLoading && (
            <div className="px-4 py-12 text-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0E8A4B]" />
            </div>
          )}

          {!isLoading && rows.map((s) => {
            const isSelf = s.id === user?.id;
            const staffName = s.name || s.email || "Staff";
            const colorIndex = (staffName.charCodeAt(0) + (staffName.charCodeAt(1) || 0)) % colors.length;
            const avatarBg = colors[colorIndex];

            return (
              <div
                key={s.id}
                className="grid grid-cols-[1.6fr_180px_140px_140px_80px] gap-3 px-5 py-3.5 border-b border-slate-100 last:border-b-0 items-center hover:bg-[#FFF6E8]/30 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("w-9 h-9 rounded-xl border-2 border-slate-900 text-white font-black flex items-center justify-center text-[12px] shadow-[0_2px_0_0_#000] flex-shrink-0", avatarBg)}>
                    {staffName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-slate-855 truncate flex items-center gap-1.5">
                      {staffName}
                      {isSelf && (
                        <span className="text-[9px] px-2 py-0.5 rounded-lg bg-[#E6F0FA] border-2 border-[#3C50E0]/60 text-[#2533A8] font-extrabold uppercase shadow-[0_2.5px_0_0_#cbd5e1]">
                          You
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono truncate">{s.email}</p>
                  </div>
                </div>

                <div>
                  <Select value={s.adminRole} onValueChange={(v) => changeRole(s.id, v)} disabled={isSelf}>
                    <SelectTrigger className="h-9 border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:ring-0 focus:ring-offset-0 focus-visible:outline-none font-bold rounded-xl bg-white shadow-[0_2px_0_0_#FFF1D6] hover:bg-[#FFF6E8]/30 transition-all text-[12px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] bg-white rounded-xl">
                      <SelectItem value="super_admin" className="font-bold text-[12px]">Super Admin</SelectItem>
                      <SelectItem value="support" className="font-bold text-[12px]">Support</SelectItem>
                      <SelectItem value="billing" className="font-bold text-[12px]">Billing</SelectItem>
                      <SelectItem value="moderator" className="font-bold text-[12px]">Moderator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <p className="text-[12px] text-slate-500 font-bold">{new Date(s.createdAt).toLocaleDateString("en-IN")}</p>
                <p className="text-[12px] text-slate-400 font-semibold">{s.adminLastLoginAt ? new Date(s.adminLastLoginAt).toLocaleDateString("en-IN") : "—"}</p>

                <div className="justify-self-end">
                  {!isSelf && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          title="Remove staff"
                          className="w-8 h-8 rounded-xl bg-white border-2 border-rose-300 text-rose-500 hover:bg-rose-50 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#FDA4AF] transition-all flex items-center justify-center shadow-[0_2px_0_0_#FDA4AF]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-2 border-[#E8B968] shadow-[0_6px_0_0_#E8B968] bg-white rounded-2xl p-6 max-w-md">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-[18px] font-black text-slate-900">
                            Remove {s.name} from staff?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-[12px] text-slate-500 font-semibold leading-relaxed mt-1">
                            They will keep their account but lose all admin access immediately.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-6 flex gap-2">
                          <AlertDialogCancel className="px-4 py-2 rounded-xl text-[12px] font-extrabold bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] text-slate-700 hover:bg-[#FFF1D6] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] border-none hover:border-none">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeStaff(s.id)}
                            className="px-4 py-2 rounded-xl text-[12px] font-extrabold bg-rose-600 border-2 border-rose-700 shadow-[0_2px_0_0_#5E0B3B] text-white hover:bg-rose-700 active:translate-y-0.5 active:shadow-[0_1px_0_0_#5E0B3B] hover:border-none focus:ring-0 border-none"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 p-4 bg-[#FFF6E8] border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968]">
          <Crown className="w-5 h-5 text-[#B8651A]" strokeWidth={2.5} />
          <p className="text-[11px] text-slate-650 font-bold leading-normal">
            To promote a user to staff: they must sign up at <code className="bg-white border border-[#E8B968] px-1.5 py-0.5 rounded font-mono text-[10.5px]">/auth</code> first, then use the "Promote user to staff" button above.
          </p>
        </div>

        {/* Promote dialog */}
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent className="border-2 border-[#E8B968] shadow-[0_6px_0_0_#E8B968] bg-white rounded-2xl p-6 max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-[#E8B968] border-2 border-slate-950 flex items-center justify-center shadow-[0_2px_0_0_#000] flex-shrink-0">
                  <UserPlus className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div>
                  <DialogTitle className="text-[18px] font-black text-slate-900">Promote user to staff</DialogTitle>
                  <DialogDescription className="text-[12px] text-slate-500 font-semibold leading-relaxed mt-0.5">
                    Enter their email and pick a role. They must have signed up at /auth already.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email" className="text-[11px] font-extrabold uppercase tracking-wider text-[#B8651A]">
                  User Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@addisonxmedia.com"
                    className="pl-9 border-2 border-[#E8B968] focus:border-[#0E8A4B] rounded-xl font-bold bg-white text-slate-800 text-[13px] h-10 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-extrabold uppercase tracking-wider text-[#B8651A]">
                  Role
                </Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="h-10 border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:ring-0 focus:ring-offset-0 focus-visible:outline-none font-bold rounded-xl bg-white shadow-[0_2px_0_0_#FFF1D6] hover:bg-[#FFF6E8]/30 transition-all text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] bg-white rounded-xl">
                    <SelectItem value="support" className="font-bold text-[12px]">Support — read-only customer data, can impersonate</SelectItem>
                    <SelectItem value="billing" className="font-bold text-[12px]">Billing — view/edit subscriptions, refunds</SelectItem>
                    <SelectItem value="moderator" className="font-bold text-[12px]">Moderator — suspend abusive accounts</SelectItem>
                    <SelectItem value="super_admin" className="font-bold text-[12px]">Super Admin — full access (use carefully)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="mt-6 flex gap-2">
              <button
                onClick={() => setInviteOpen(false)}
                className="px-4 py-2 rounded-xl text-[12px] font-extrabold bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] text-slate-700 hover:bg-[#FFF1D6] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={inviting}
                className="px-4 py-2 rounded-xl text-[12px] font-extrabold bg-[#0E8A4B] border-2 border-[#0A6E3C] shadow-[0_2px_0_0_#073D22] text-white hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_1px_0_0_#073D22] disabled:opacity-50 disabled:pointer-events-none transition-all"
              >
                {inviting ? "Promoting…" : "Promote to staff"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  );
};

export default AdminStaff;
