import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { ScrollText, Loader2, Eye, ShieldOff, ShieldCheck, CreditCard, UserPlus, UserMinus, Shield, Edit3 } from "lucide-react";

const ACTION_META: Record<string, { icon: typeof ScrollText; color: string; label: string }> = {
  impersonate:       { icon: Eye,         color: "#B8230C", label: "Impersonate" },
  impersonate_end:   { icon: Eye,         color: "#7A1500", label: "Impersonate ended" },
  suspend:           { icon: ShieldOff,   color: "#D4308E", label: "Suspend" },
  unsuspend:         { icon: ShieldCheck, color: "#0E8A4B", label: "Unsuspend" },
  change_plan:       { icon: Edit3,       color: "#FF6A1F", label: "Plan change" },
  refund:            { icon: CreditCard,  color: "#3C50E0", label: "Refund" },
  change_staff_role: { icon: Shield,      color: "#FFD23F", label: "Staff role change" },
  remove_staff:      { icon: UserMinus,   color: "#D4308E", label: "Staff removed" },
  invite_staff:      { icon: UserPlus,    color: "#0E8A4B", label: "Staff invited" },
};

const AdminAudit = () => {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-audit"],
    queryFn: () => adminApi.audit(),
    refetchInterval: 30_000,
  });

  return (
    <div className="px-6 lg:px-10 py-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#3C50E0] to-[#2533A8] text-white flex items-center justify-center shadow-md">
          <ScrollText className="w-6 h-6" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-[26px] font-black tracking-tight">Audit log</h1>
          <p className="text-[12px] text-foreground/70 font-medium">Every staff action · sorted newest first · 100 rows max</p>
        </div>
      </div>

      <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_4px_0_0_#E8B968]">
        <div className="grid grid-cols-[180px_1fr_1fr_1fr_120px] gap-3 px-4 py-3 border-b-2 border-[#E8B968] bg-[#FFF1D6] text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A]">
          <div>Action</div>
          <div>Actor</div>
          <div>Target user</div>
          <div>Payload</div>
          <div>When</div>
        </div>

        {isLoading && (
          <div className="px-4 py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#B8230C]" /></div>
        )}

        {!isLoading && rows.length === 0 && (
          <div className="px-4 py-16 text-center">
            <p className="text-[13px] font-extrabold">No actions yet</p>
            <p className="text-[12px] text-foreground/60 mt-1">Once you take admin actions they'll appear here.</p>
          </div>
        )}

        {rows.map((r) => {
          const meta = ACTION_META[r.action] ?? { icon: ScrollText, color: "#7A1500", label: r.action };
          const Icon = meta.icon;
          let payload = "";
          try { payload = r.payload ? JSON.stringify(JSON.parse(r.payload)) : ""; } catch { payload = r.payload ?? ""; }
          return (
            <div key={r.id} className="grid grid-cols-[180px_1fr_1fr_1fr_120px] gap-3 px-4 py-3 border-b border-[#E8B968]/40 last:border-b-0 items-center hover:bg-[#FFF6E8] transition">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white" style={{ background: meta.color }}>
                  <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                </span>
                <span className="text-[11px] font-extrabold uppercase tracking-wider">{meta.label}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-extrabold truncate">{r.actorName ?? "—"}</p>
                <p className="text-[10px] text-foreground/60 font-mono truncate">{r.actorEmail ?? r.actorUserId}</p>
              </div>
              <p className="text-[11px] font-mono text-foreground/70 truncate">{r.targetUserId ?? "—"}</p>
              <p className="text-[11px] font-mono text-foreground/60 truncate">{payload}</p>
              <p className="text-[11px] text-foreground/60">{new Date(r.createdAt).toLocaleString("en-IN")}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminAudit;
