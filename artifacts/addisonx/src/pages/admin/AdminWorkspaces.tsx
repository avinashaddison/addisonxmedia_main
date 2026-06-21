import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, AdminWorkspace } from "@/lib/admin-api";
import { Link } from "react-router-dom";
import { Building2, Search, Loader2, ChevronRight, IndianRupee, Zap, Sparkles, Rocket, Gift, Crown, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/PageShell";

const QUICK_PLANS: Array<{ key: string; label: string; price: string; mrr: number; icon: typeof Building2; color: string }> = [
  { key: "free",       label: "Free",       price: "₹0",     mrr: 0,    icon: Gift,     color: "text-slate-550" },
  { key: "starter",    label: "Starter",    price: "₹999",   mrr: 999,  icon: Sparkles, color: "text-indigo-500" },
  { key: "growth",     label: "Growth",     price: "₹2,999", mrr: 2999, icon: Rocket,   color: "text-emerald-500" },
  { key: "scale",      label: "Scale",      price: "₹7,999", mrr: 7999, icon: Zap,      color: "text-orange-500" },
  { key: "enterprise", label: "Enterprise", price: "Custom", mrr: 0,    icon: Crown,    color: "text-purple-500" },
];

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-IN") : "—");

const STATUS = {
  active:    { bg: "bg-[#E6F7EE] border-[#0E8A4B]/20 text-[#0A6E3C]", label: "Active" },
  trial:     { bg: "bg-[#FFF1D6] border-[#E8B968]/30 text-[#B8651A]", label: "Trial" },
  suspended: { bg: "bg-rose-50 border-rose-200 text-rose-700", label: "Suspended" },
  cancelled: { bg: "bg-slate-50 border-slate-200 text-slate-600", label: "Cancelled" },
} as const;

const AdminWorkspaces = () => {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-workspaces", q, status],
    queryFn: () => adminApi.workspaces({ q: q || undefined, status }),
  });

  const setPlan = async (id: string, planKey: string, mrr: number) => {
    try {
      await adminApi.updateWorkspace(id, { plan: planKey, mrrInr: mrr });
      toast.success(`Plan set to ${planKey}`);
      qc.invalidateQueries({ queryKey: ["admin-workspaces"] });
      qc.invalidateQueries({ queryKey: ["admin-metrics"] });
    } catch (e) {
      toast.error(String(e));
    }
  };

  const headerActions = (
    <div className="relative flex items-center">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search workspaces…"
        className="pl-9 pr-4 py-1.5 w-60 rounded-full border-2 border-[#E8B968] bg-white text-[12px] font-extrabold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#0E8A4B] transition-all"
      />
    </div>
  );

  return (
    <PageShell
      title="Workspaces"
      subtitle={`${rows.length} accounts · click any row for details`}
      icon={<Building2 className="w-5 h-5 text-white" strokeWidth={2.5} />}
      actions={headerActions}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Status filters */}
        <div className="bg-white border-2 border-[#E8B968] rounded-2xl p-4 shadow-[0_4px_0_0_#E8B968] flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#B8651A]">Filter Status</span>
          <div className="flex flex-wrap gap-1.5">
            {(["all", "active", "trial", "suspended", "cancelled"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-[12px] font-extrabold capitalize border-2 transition-all duration-200 active:translate-y-0.5",
                  status === s
                    ? "bg-[#0E8A4B] border-[#0A6E3C] text-white shadow-[0_2px_0_0_#073D22]"
                    : "bg-white border-[#E8B968] text-slate-700 hover:bg-[#FFF1D6] shadow-[0_2px_0_0_#E8B968]"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_5px_0_0_#E8B968]">
          <div className="grid grid-cols-[1.6fr_120px_110px_120px_120px_44px_60px] gap-3 px-5 py-3.5 border-b-2 border-[#E8B968] bg-[#FFF6E8] text-[10px] font-extrabold uppercase tracking-wider text-[#0A3D24]">
            <div>Account</div>
            <div>Plan</div>
            <div>Status</div>
            <div>MRR</div>
            <div>Joined</div>
            <div></div>
            <div></div>
          </div>

          {isLoading && (
            <div className="px-4 py-12 text-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0E8A4B]" />
            </div>
          )}

          {!isLoading && rows.length === 0 && (
            <div className="px-6 py-16 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] flex items-center justify-center">
                <Building2 className="w-7 h-7 text-[#B8651A]" strokeWidth={2.2} />
              </div>
              <p className="text-[14px] font-black text-slate-800">
                {q || status !== "all" ? "No matches" : "No customer accounts yet"}
              </p>
              <p className="text-[12px] text-slate-400 mt-1 max-w-md mx-auto">
                {q || status !== "all"
                  ? "Try a different filter or search."
                  : "When customers sign up at /auth, they appear here automatically."}
              </p>
            </div>
          )}

          {rows.map((w: AdminWorkspace) => {
            const st = STATUS[(w.status as keyof typeof STATUS) ?? "active"] ?? STATUS.active;
            return (
              <div
                key={w.id}
                className="grid grid-cols-[1.6fr_120px_110px_120px_120px_44px_60px] gap-3 px-5 py-3 border-b border-slate-100 last:border-b-0 items-center hover:bg-[#FFF6E8]/30 transition"
              >
                <Link to={`/admin/workspaces/${w.id}`} className="min-w-0">
                  <p className="text-[13px] font-bold text-slate-850 truncate hover:text-[#0E8A4B] transition">{w.name}</p>
                  <p className="text-[11px] text-slate-400 font-mono truncate">{w.email}</p>
                </Link>
                <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 w-fit">
                  {w.plan}
                </span>
                <span className={cn("inline-flex px-2 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wider w-fit", st.bg)}>
                  {st.label}
                </span>
                <span className="inline-flex items-center gap-1 text-[13px] font-black text-slate-800 tabular-nums">
                  <IndianRupee className="w-3 h-3 text-slate-400" />
                  {Number(w.mrrInr ?? 0).toLocaleString("en-IN")}
                </span>
                <span className="text-[12px] text-slate-500 font-semibold">{fmtDate(w.createdAt)}</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      title="Quick set plan"
                      className="w-8 h-8 rounded-xl bg-white border-2 border-[#E8B968] text-slate-650 hover:bg-[#FFF1D6] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#E8B968] transition-all flex items-center justify-center shadow-[0_2px_0_0_#E8B968]"
                    >
                      <Zap className="w-3.5 h-3.5 text-[#B8651A]" strokeWidth={2.2} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-64 p-2 border-2 border-[#E8B968] shadow-[0_4px_0_0_#E8B968] bg-white rounded-2xl">
                    <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#B8651A] px-2 py-1.5 border-b border-slate-100 mb-1">
                      Set plan for {w.name.split(" ")[0]}
                    </p>
                    <div className="space-y-1">
                      {QUICK_PLANS.map((p) => {
                        const Icon = p.icon;
                        const current = w.plan === p.key;
                        return (
                          <button
                            key={p.key}
                            onClick={() => setPlan(w.id, p.key, p.mrr)}
                            disabled={current}
                            className={cn(
                              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition",
                              current ? "bg-slate-50 cursor-default" : "hover:bg-[#FFF6E8] active:scale-[0.98]"
                            )}
                          >
                            <Icon className={cn("w-4 h-4 flex-shrink-0", p.color)} strokeWidth={2.5} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-bold leading-tight text-slate-800">{p.label}</p>
                              <p className="text-[10px] text-slate-400 font-semibold">{p.price}{p.mrr > 0 ? " · auto-MRR" : ""}</p>
                            </div>
                            {current && <Check className="w-4 h-4 text-[#0E8A4B] flex-shrink-0" strokeWidth={3} />}
                          </button>
                        );
                      })}
                    </div>
                    <Link
                      to={`/admin/workspaces/${w.id}`}
                      className="mt-1.5 flex items-center justify-center gap-1 w-full px-2.5 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold text-[#0E8A4B] hover:bg-[#E6F7EE] transition border border-transparent hover:border-[#0E8A4B]/20"
                    >
                      Advanced (trial, MRR override) <ChevronRight className="w-3 h-3" />
                    </Link>
                  </PopoverContent>
                </Popover>
                <Link to={`/admin/workspaces/${w.id}`} className="justify-self-end text-slate-400 hover:text-[#0E8A4B] transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
};

export default AdminWorkspaces;
