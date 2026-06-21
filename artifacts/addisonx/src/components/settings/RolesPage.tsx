import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Check, Minus, Eye } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ROLES } from "@/components/settings/TeamPage";
import type { TeamMember, TeamRole } from "@/lib/api-types";

const ROLE_DESC: Record<TeamRole, string> = {
  owner: "Full access including billing & team management",
  admin: "Manage everything except billing",
  manager: "CRM, finance, reports and broadcasts",
  agent: "Inbox and contacts only",
  viewer: "Read-only access across the workspace",
};

const FEATURES: { id: string; label: string }[] = [
  { id: "inbox", label: "Inbox & Chat" },
  { id: "broadcasts", label: "Broadcasts & Campaigns" },
  { id: "crm", label: "CRM & Contacts" },
  { id: "finance", label: "Finance & Invoices" },
  { id: "reports", label: "Reports" },
  { id: "settings", label: "Team & Settings" },
  { id: "billing", label: "Billing & Plans" },
];

type Perm = "full" | "read" | "none";
// Permission blueprint per role (MVP — organizational, not auth-enforced).
const MATRIX: Record<TeamRole, Record<string, Perm>> = {
  owner: { inbox: "full", broadcasts: "full", crm: "full", finance: "full", reports: "full", settings: "full", billing: "full" },
  admin: { inbox: "full", broadcasts: "full", crm: "full", finance: "full", reports: "full", settings: "full", billing: "none" },
  manager: { inbox: "full", broadcasts: "full", crm: "full", finance: "full", reports: "full", settings: "read", billing: "none" },
  agent: { inbox: "full", broadcasts: "read", crm: "full", finance: "none", reports: "read", settings: "none", billing: "none" },
  viewer: { inbox: "read", broadcasts: "read", crm: "read", finance: "read", reports: "read", settings: "none", billing: "none" },
};

const roleColor: Record<TeamRole, string> = {
  owner: "#0E8A4B", admin: "#FF6A1F", manager: "#3C50E0", agent: "#7C3AED", viewer: "#B8651A",
};

const PermCell = ({ perm }: { perm: Perm }) => {
  if (perm === "full") return <span className="inline-flex w-6 h-6 rounded-md bg-[#E6F7EE] text-[#0A6E3C] items-center justify-center"><Check className="w-3.5 h-3.5" /></span>;
  if (perm === "read") return <span className="inline-flex w-6 h-6 rounded-md bg-[#E4E8FF] text-[#3C50E0] items-center justify-center"><Eye className="w-3.5 h-3.5" /></span>;
  return <span className="inline-flex w-6 h-6 rounded-md bg-[#F1F1F1] text-foreground/30 items-center justify-center"><Minus className="w-3.5 h-3.5" /></span>;
};

const useTeam = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["team", user?.id],
    enabled: !!user,
    queryFn: () => api.listTeam() as Promise<TeamMember[]>,
  });
};

export const RolesPage = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: members = [], isLoading } = useTeam();
  const update = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.updateTeamMember(id, { role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["team", user?.id] }); toast.success("Role updated"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <PageShell title="Roles & Permissions" subtitle="Role catalog aur har member ka access" icon={<ShieldCheck className="w-5 h-5" />}>
      <div className="space-y-4">
        {/* ROLE CATALOG */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {ROLES.map((r) => (
            <div key={r.id} className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: roleColor[r.id] }} />
                <span className="text-[13px] font-extrabold">{r.label}</span>
              </div>
              <p className="text-[11px] font-semibold text-foreground/55 leading-snug">{ROLE_DESC[r.id]}</p>
            </div>
          ))}
        </div>

        {/* PERMISSION MATRIX */}
        <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-4">
          <h3 className="text-[13px] font-extrabold mb-1">Permission matrix</h3>
          <p className="text-[11px] font-semibold text-foreground/45 mb-3">Planning reference — har role ka intended access. Single-login workspace hai, isliye abhi runtime enforcement nahi hota; roles members ko neeche assign hote hain.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-foreground/55 border-b border-[#F0DCB8]">
                  <th className="py-2 pr-3">Feature</th>
                  {ROLES.map((r) => <th key={r.id} className="py-2 px-2 text-center">{r.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((f) => (
                  <tr key={f.id} className="border-b border-[#F7EAD0]">
                    <td className="py-2.5 pr-3 font-semibold whitespace-nowrap">{f.label}</td>
                    {ROLES.map((r) => <td key={r.id} className="py-2.5 px-2 text-center"><PermCell perm={MATRIX[r.id][f.id]} /></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 mt-3 text-[11px] font-semibold text-foreground/55">
            <span className="inline-flex items-center gap-1"><PermCell perm="full" /> Full</span>
            <span className="inline-flex items-center gap-1"><PermCell perm="read" /> Read-only</span>
            <span className="inline-flex items-center gap-1"><PermCell perm="none" /> No access</span>
          </div>
        </div>

        {/* ASSIGN ROLES */}
        <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-4">
          <h3 className="text-[13px] font-extrabold mb-3">Assign roles</h3>
          {isLoading ? (
            <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          ) : members.length === 0 ? (
            <p className="text-[13px] font-semibold text-foreground/45 py-4 text-center">No team members yet. Invite people from Team Members to assign roles.</p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FFF6E8] border border-[#E8B968]">
                  <div className="w-9 h-9 rounded-lg bg-[#FF6A1F] text-white flex items-center justify-center font-black text-[12px] flex-shrink-0">{(m.name || m.email).slice(0, 2).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold truncate">{m.name || m.email}</div>
                    {m.name && <div className="text-[11px] text-foreground/50 truncate">{m.email}</div>}
                  </div>
                  <select
                    value={m.role}
                    onChange={(e) => update.mutate({ id: m.id, role: e.target.value })}
                    className="h-9 px-2 rounded-lg bg-white border-2 border-[#E8B968] text-[12px] font-bold focus:outline-none focus:border-[#FF6A1F] cursor-pointer"
                  >
                    {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
};

export default RolesPage;
