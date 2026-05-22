import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, AdminWorkspace } from "@/lib/admin-api";
import { Link } from "react-router-dom";
import { Building2, Search, Loader2, ChevronRight, IndianRupee, Zap, Sparkles, Rocket, Gift, Crown, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const QUICK_PLANS: Array<{ key: string; label: string; price: string; mrr: number; icon: typeof Building2; color: string }> = [
  { key: "free",       label: "Free",       price: "₹0",     mrr: 0,    icon: Gift,     color: "text-[#6B7280]" },
  { key: "starter",    label: "Starter",    price: "₹999",   mrr: 999,  icon: Sparkles, color: "text-[#3C50E0]" },
  { key: "growth",     label: "Growth",     price: "₹2,999", mrr: 2999, icon: Rocket,   color: "text-[#0E8A4B]" },
  { key: "scale",      label: "Scale",      price: "₹7,999", mrr: 7999, icon: Zap,      color: "text-[#FF6A1F]" },
  { key: "enterprise", label: "Enterprise", price: "Custom", mrr: 0,    icon: Crown,    color: "text-[#B8651A]" },
];

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-IN") : "—");

const STATUS = {
  active:    { bg: "bg-[#E6F7EE]", text: "text-[#0E8A4B]", label: "Active" },
  trial:     { bg: "bg-[#FFF1D6]", text: "text-[#B8651A]", label: "Trial" },
  suspended: { bg: "bg-[#FCE5F0]", text: "text-[#D4308E]", label: "Suspended" },
  cancelled: { bg: "bg-[#E4E8FF]", text: "text-[#3C50E0]", label: "Cancelled" },
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

  return (
    <div className="px-6 lg:px-10 py-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FFD23F] to-[#E8B400] text-[#3D1A00] flex items-center justify-center shadow-md">
          <Building2 className="w-6 h-6" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-[26px] font-black tracking-tight">Workspaces</h1>
          <p className="text-[12px] text-foreground/70 font-medium">{rows.length} accounts · click any row for details</p>
        </div>
      </div>

      <div className="bg-white border-2 border-[#E8B968] rounded-2xl p-3 mb-3 flex flex-wrap items-center gap-2 shadow-[0_3px_0_0_#E8B968]">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B8651A]" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email…" className="pl-9" />
        </div>
        <div className="flex gap-1">
          {(["all", "active", "trial", "suspended", "cancelled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "px-3.5 h-10 rounded-xl text-[12px] font-extrabold capitalize transition border-2 border-transparent",
                status === s ? "bg-[#B8230C] text-white shadow-sm" : "bg-[#FFF1D6] text-foreground hover:scale-105"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_4px_0_0_#E8B968]">
        <div className="grid grid-cols-[1.6fr_120px_110px_120px_120px_44px_60px] gap-3 px-4 py-3 border-b-2 border-[#E8B968] bg-[#FFF1D6] text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A]">
          <div>Account</div>
          <div>Plan</div>
          <div>Status</div>
          <div>MRR</div>
          <div>Joined</div>
          <div></div>
          <div></div>
        </div>

        {isLoading && (
          <div className="px-4 py-12 text-center text-foreground/60">
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          </div>
        )}

        {!isLoading && rows.length === 0 && (
          <div className="px-6 py-16 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#FFF1D6] border-2 border-[#E8B968] flex items-center justify-center">
              <Building2 className="w-7 h-7 text-[#B8651A]" strokeWidth={2.5} />
            </div>
            <p className="text-[14px] font-extrabold">
              {q || status !== "all" ? "No matches" : "No customer accounts yet"}
            </p>
            <p className="text-[12px] text-foreground/60 mt-1 max-w-md mx-auto">
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
              className="grid grid-cols-[1.6fr_120px_110px_120px_120px_44px_60px] gap-3 px-4 py-3 border-b border-[#E8B968]/40 last:border-b-0 items-center hover:bg-[#FFF6E8] transition"
            >
              <Link to={`/admin/workspaces/${w.id}`} className="min-w-0">
                <p className="text-[13px] font-extrabold truncate">{w.name}</p>
                <p className="text-[11px] text-foreground/60 font-mono truncate">{w.email}</p>
              </Link>
              <span className="inline-flex px-2 py-1 rounded-full bg-[#FFF1D6] border border-[#E8B968] text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A] w-fit">
                {w.plan}
              </span>
              <span className={cn("inline-flex px-2 py-1 rounded-full border text-[10px] font-extrabold uppercase tracking-wider w-fit", st.bg, st.text, "border-current/30")}>
                {st.label}
              </span>
              <span className="inline-flex items-center gap-1 text-[13px] font-extrabold tabular-nums">
                <IndianRupee className="w-3 h-3 text-foreground/60" />
                {Number(w.mrrInr ?? 0).toLocaleString("en-IN")}
              </span>
              <span className="text-[12px] text-foreground/70 font-medium">{fmtDate(w.createdAt)}</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    title="Quick set plan"
                    className="w-9 h-9 rounded-xl bg-[#FFF1D6] border-2 border-[#E8B968] text-[#B8651A] hover:bg-[#FFD23F] hover:text-[#3D1A00] hover:-translate-y-0.5 active:translate-y-0 transition flex items-center justify-center shadow-[0_2px_0_0_#E8B968]"
                  >
                    <Zap className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-2">
                  <p className="text-[10px] uppercase tracking-wider font-extrabold text-foreground/60 px-2 py-1.5">
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
                            current ? "bg-[#FFF1D6] cursor-default" : "hover:bg-[#FFF6E8] active:scale-[0.98]"
                          )}
                        >
                          <Icon className={cn("w-4 h-4 flex-shrink-0", p.color)} strokeWidth={2.5} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-extrabold leading-tight">{p.label}</p>
                            <p className="text-[10px] text-foreground/55 font-medium">{p.price}{p.mrr > 0 ? " · auto-MRR" : ""}</p>
                          </div>
                          {current && <Check className="w-4 h-4 text-[#0E8A4B] flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  <Link
                    to={`/admin/workspaces/${w.id}`}
                    className="mt-1 flex items-center justify-center gap-1 w-full px-2.5 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold text-[#B8230C] hover:bg-[#B8230C]/5 transition"
                  >
                    Advanced (trial, MRR override) <ChevronRight className="w-3 h-3" />
                  </Link>
                </PopoverContent>
              </Popover>
              <Link to={`/admin/workspaces/${w.id}`} className="justify-self-end">
                <ChevronRight className="w-4 h-4 text-foreground/40" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminWorkspaces;
