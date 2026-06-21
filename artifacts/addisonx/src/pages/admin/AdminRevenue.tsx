import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { TrendingUp, IndianRupee, Users, Loader2, Wallet, CalendarDays } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

const inr = (n: number) => `₹${Number(n ?? 0).toLocaleString("en-IN")}`;

const PLAN_COLORS: Record<string, string> = {
  free: "#94A3B8", starter: "#6366F1", growth: "#0E8A4B", scale: "#FF6A1F", enterprise: "#9333EA",
};

const StatCard = ({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon: React.ReactNode }) => (
  <div className="bg-white border-2 border-[#E8B968] rounded-2xl p-4 shadow-[0_4px_0_0_#E8B968]">
    <div className="flex items-center justify-between gap-2">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A]">{label}</p>
      <span className="text-[#FF6A1F]">{icon}</span>
    </div>
    <p className="text-[24px] font-black tracking-tight text-slate-850 mt-1.5 tabular-nums">{value}</p>
    {hint && <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{hint}</p>}
  </div>
);

const AdminRevenue = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-finance-summary"],
    queryFn: () => adminApi.financeSummary(),
  });

  const byPlan = (data?.byPlan ?? []).filter((p) => p.mrr > 0 || p.count > 0);

  return (
    <PageShell
      title="Revenue"
      subtitle="MRR, ARR aur income overview"
      icon={<TrendingUp className="w-5 h-5 text-white" strokeWidth={2.5} />}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {isLoading ? (
          <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0E8A4B]" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="MRR" value={inr(data?.mrrInr ?? 0)} hint="monthly recurring" icon={<IndianRupee className="w-4 h-4" />} />
              <StatCard label="ARR" value={inr(data?.arrInr ?? 0)} hint="annualised" icon={<TrendingUp className="w-4 h-4" />} />
              <StatCard label="Paying clients" value={String(data?.payingCount ?? 0)} hint="active + paid" icon={<Users className="w-4 h-4" />} />
              <StatCard label="All-time income" value={inr(data?.revenueAllTime ?? 0)} hint="completed payments" icon={<Wallet className="w-4 h-4" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <StatCard label="Is mahine" value={inr(data?.revenueThisMonth ?? 0)} hint="this month so far" icon={<CalendarDays className="w-4 h-4" />} />
              <StatCard label="Pichhle mahine" value={inr(data?.revenueLastMonth ?? 0)} hint="last month total" icon={<CalendarDays className="w-4 h-4" />} />
            </div>

            <div className="bg-white border-2 border-[#E8B968] rounded-2xl p-5 shadow-[0_5px_0_0_#E8B968]">
              <h2 className="text-[14px] font-black tracking-tight text-slate-850 mb-1">MRR by plan</h2>
              <p className="text-[11px] text-slate-400 font-semibold mb-4">Active subscriptions ka recurring revenue, plan ke hisaab se.</p>
              {byPlan.length === 0 ? (
                <div className="py-12 text-center text-[12px] font-semibold text-slate-400">Abhi koi paid subscription nahi.</div>
              ) : (
                <>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={byPlan} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1E9D6" vertical={false} />
                        <XAxis dataKey="plan" tick={{ fontSize: 11, fontWeight: 700, fill: "#7A4A00" }} tickLine={false} axisLine={{ stroke: "#E8B968" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          cursor={{ fill: "#FFF6E8" }}
                          contentStyle={{ borderRadius: 12, border: "2px solid #E8B968", fontWeight: 700, fontSize: 12 }}
                          formatter={(v: number) => [inr(v), "MRR"]}
                        />
                        <Bar dataKey="mrr" radius={[8, 8, 0, 0]}>
                          {byPlan.map((p) => <Cell key={p.plan} fill={PLAN_COLORS[p.plan] ?? "#0E8A4B"} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {byPlan.map((p) => (
                      <div key={p.plan} className="rounded-xl border border-slate-100 bg-[#FFF6E8]/40 px-3 py-2">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 capitalize">{p.plan}</p>
                        <p className="text-[14px] font-black text-slate-800 tabular-nums">{inr(p.mrr)}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{p.count} clients</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
};

export default AdminRevenue;
