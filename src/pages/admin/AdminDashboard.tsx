import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { Users, IndianRupee, Building2, Sparkles, MessageSquare, Inbox, Trophy, Activity, ShieldOff, AlertTriangle, Crown, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const compactINR = (n: number) => {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
};

const KPI = ({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: typeof Users; color: string }) => {
  const styles: Record<string, { border: string; shadow: string; iconBg: string; text: string }> = {
    red:     { border: "border-[#B8230C]", shadow: "shadow-[0_4px_0_0_#7A1500]", iconBg: "bg-[#B8230C]", text: "text-[#B8230C]" },
    yellow:  { border: "border-[#FFD23F]", shadow: "shadow-[0_4px_0_0_#B8860B]", iconBg: "bg-[#FFD23F] text-[#3D1A00]", text: "text-[#7A4A00]" },
    emerald: { border: "border-[#0E8A4B]", shadow: "shadow-[0_4px_0_0_#0A6E3C]", iconBg: "bg-[#0E8A4B]", text: "text-[#0E8A4B]" },
    indigo:  { border: "border-[#3C50E0]", shadow: "shadow-[0_4px_0_0_#2533A8]", iconBg: "bg-[#3C50E0]", text: "text-[#3C50E0]" },
    magenta: { border: "border-[#D4308E]", shadow: "shadow-[0_4px_0_0_#A11A6A]", iconBg: "bg-[#D4308E]", text: "text-[#D4308E]" },
    orange:  { border: "border-[#FF6A1F]", shadow: "shadow-[0_4px_0_0_#B8420A]", iconBg: "bg-[#FF6A1F]", text: "text-[#FF6A1F]" },
  };
  const s = styles[color] || styles.red;
  return (
    <div className={`bg-white border-2 ${s.border} ${s.shadow} rounded-2xl p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl ${s.iconBg} text-white flex items-center justify-center shadow-md`}>
          <Icon className="w-5 h-5" strokeWidth={2.5} />
        </div>
      </div>
      <p className="text-[11px] uppercase tracking-[0.15em] text-foreground/60 font-extrabold">{label}</p>
      <p className={`text-3xl font-black tracking-tight tabular-nums mt-1 ${s.text}`}>{value}</p>
      {sub && <p className="text-[11px] text-foreground/60 font-medium mt-1">{sub}</p>}
    </div>
  );
};

const AdminDashboard = () => {
  const { data: m, isLoading } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: () => adminApi.metrics(),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#B8230C]" />
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-10 py-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#B8230C] to-[#7A1500] text-white flex items-center justify-center shadow-md">
          <Crown className="w-6 h-6" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-[26px] font-black tracking-tight">Admin Dashboard</h1>
          <p className="text-[12px] text-foreground/70 font-medium">All-workspace operations · live · refreshes every 30s</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KPI label="Total users" value={m?.users ?? 0} sub={`${m?.staff ?? 0} staff included`} icon={Users} color="indigo" />
        <KPI label="MRR (active)" value={compactINR(Number(m?.mrrInr ?? 0))} sub={`${m?.activeUsers ?? 0} active`} icon={IndianRupee} color="emerald" />
        <KPI label="Signups (7 din)" value={m?.signupsWeek ?? 0} sub={`${m?.signups24h ?? 0} in last 24h`} icon={Sparkles} color="orange" />
        <KPI label="Suspended" value={m?.suspended ?? 0} sub="Needs review" icon={ShieldOff} color="red" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KPI label="Workspaces (active)" value={m?.activeUsers ?? 0} icon={Building2} color="yellow" />
        <KPI label="Trial accounts" value={m?.trial ?? 0} icon={AlertTriangle} color="magenta" />
        <KPI label="Messages (24h)" value={m?.messages24h ?? 0} icon={MessageSquare} color="indigo" />
        <KPI label="Deals won (24h)" value={m?.dealsWon24h ?? 0} icon={Trophy} color="emerald" />
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        <Link
          to="/admin/workspaces"
          className="p-5 rounded-2xl bg-white border-2 border-[#E8B968] shadow-[0_4px_0_0_#E8B968] hover:-translate-y-1 transition"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-[#FFD23F] text-[#3D1A00] flex items-center justify-center shadow-md">
              <Building2 className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[15px] font-black tracking-tight">Manage workspaces</p>
              <p className="text-[11px] text-foreground/60 font-medium">Suspend, change plan, impersonate</p>
            </div>
          </div>
        </Link>
        <Link
          to="/admin/audit"
          className="p-5 rounded-2xl bg-white border-2 border-[#3C50E0] shadow-[0_4px_0_0_#2533A8] hover:-translate-y-1 transition"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-[#3C50E0] text-white flex items-center justify-center shadow-md">
              <Activity className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[15px] font-black tracking-tight">Recent audit log</p>
              <p className="text-[11px] text-foreground/60 font-medium">All staff actions, plain history</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;
