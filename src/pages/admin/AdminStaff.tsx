import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { ShieldCheck, Crown, Loader2, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const ROLES: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "#B8230C" },
  support:     { label: "Support",     color: "#3C50E0" },
  billing:     { label: "Billing",     color: "#0E8A4B" },
  moderator:   { label: "Moderator",   color: "#D4308E" },
};

const AdminStaff = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: () => adminApi.staff(),
  });

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
    <div className="px-6 lg:px-10 py-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0E8A4B] to-[#0A6E3C] text-white flex items-center justify-center shadow-md">
          <ShieldCheck className="w-6 h-6" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-[26px] font-black tracking-tight">Staff management</h1>
          <p className="text-[12px] text-foreground/70 font-medium">{rows.length} staff members · only super_admin can promote/demote</p>
        </div>
      </div>

      <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_4px_0_0_#E8B968]">
        <div className="grid grid-cols-[1.6fr_180px_140px_140px_80px] gap-3 px-4 py-3 border-b-2 border-[#E8B968] bg-[#FFF1D6] text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A]">
          <div>Staff member</div>
          <div>Role</div>
          <div>Joined</div>
          <div>Last admin login</div>
          <div></div>
        </div>

        {isLoading && (
          <div className="px-4 py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#B8230C]" /></div>
        )}

        {rows.map((s) => {
          const r = ROLES[s.adminRole] ?? { label: s.adminRole, color: "#7A1500" };
          const isSelf = s.id === user?.id;
          return (
            <div key={s.id} className="grid grid-cols-[1.6fr_180px_140px_140px_80px] gap-3 px-4 py-3 border-b border-[#E8B968]/40 last:border-b-0 items-center">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD23F] to-[#E8B400] text-[#3D1A00] flex items-center justify-center text-[12px] font-extrabold shadow-md flex-shrink-0">
                  {s.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-extrabold truncate flex items-center gap-1.5">
                    {s.name}
                    {isSelf && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FFD23F] text-[#7A4A00] font-extrabold uppercase">You</span>}
                  </p>
                  <p className="text-[11px] text-foreground/60 font-mono truncate">{s.email}</p>
                </div>
              </div>
              <Select value={s.adminRole} onValueChange={(v) => changeRole(s.id, v)} disabled={isSelf}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[12px] text-foreground/70">{new Date(s.createdAt).toLocaleDateString("en-IN")}</p>
              <p className="text-[12px] text-foreground/70">{s.adminLastLoginAt ? new Date(s.adminLastLoginAt).toLocaleDateString("en-IN") : "—"}</p>
              {!isSelf && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
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
                      <AlertDialogAction onClick={() => removeStaff(s.id)} className="bg-[#D4308E] text-white">Remove</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] text-foreground/60 font-medium">
        <Crown className="w-3 h-3 inline text-[#FFD23F]" /> To invite a new admin: create their AddisonX user account first, then run{" "}
        <code className="bg-[#FFF1D6] px-1.5 py-0.5 rounded font-mono">UPDATE "user" SET is_staff=true, admin_role='support' WHERE email=…</code>{" "}
        — invite-by-email flow coming in v1.1.
      </p>
    </div>
  );
};

export default AdminStaff;
