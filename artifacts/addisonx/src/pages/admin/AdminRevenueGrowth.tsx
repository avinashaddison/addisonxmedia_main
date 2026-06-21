import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { LineChart as LineIcon, Loader2, IndianRupee, TrendingUp } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ResponsiveContainer, ComposedChart, Area, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

const inr = (n: number) => `₹${Number(n ?? 0).toLocaleString("en-IN")}`;

const AdminRevenueGrowth = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-revenue-growth"],
    queryFn: () => adminApi.revenueGrowth(12),
  });

  const series = data?.series ?? [];
  const total = series.reduce((a, m) => a + (m.revenue ?? 0), 0);

  return (
    <PageShell
      title="Revenue Growth"
      subtitle="month-on-month revenue trend (12 mahine)"
      icon={<LineIcon className="w-5 h-5 text-white" strokeWidth={2.5} />}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {isLoading ? (
          <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0E8A4B]" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border-2 border-[#E8B968] rounded-2xl p-4 shadow-[0_4px_0_0_#E8B968]">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A]">Current MRR</p>
                <p className="text-[24px] font-black tracking-tight text-[#0E8A4B] mt-1 tabular-nums">{inr(data?.currentMrr ?? 0)}</p>
              </div>
              <div className="bg-white border-2 border-[#E8B968] rounded-2xl p-4 shadow-[0_4px_0_0_#E8B968]">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A]">12-month revenue</p>
                <p className="text-[24px] font-black tracking-tight text-slate-850 mt-1 tabular-nums">{inr(total)}</p>
              </div>
            </div>

            <div className="bg-white border-2 border-[#E8B968] rounded-2xl p-5 shadow-[0_5px_0_0_#E8B968]">
              <h2 className="text-[14px] font-black tracking-tight text-slate-850 mb-1">Monthly revenue & transactions</h2>
              <p className="text-[11px] text-slate-400 font-semibold mb-4">Bars = revenue, line = transaction count.</p>
              {series.length === 0 ? (
                <div className="py-12 text-center text-[12px] font-semibold text-slate-400">
                  <TrendingUp className="w-8 h-8 mx-auto text-[#FF6A1F] mb-2" strokeWidth={2} />
                  Abhi koi revenue history nahi. Pehle payment ke baad yahan trend banega.
                </div>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0E8A4B" stopOpacity={0.85} />
                          <stop offset="100%" stopColor="#0E8A4B" stopOpacity={0.5} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1E9D6" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700, fill: "#7A4A00" }} tickLine={false} axisLine={{ stroke: "#E8B968" }} minTickGap={16} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "2px solid #E8B968", fontWeight: 700, fontSize: 12 }}
                        formatter={(v: number, name: string) => name === "Revenue" ? [inr(v), name] : [v, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                      <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="url(#rg)" radius={[8, 8, 0, 0]} />
                      <Area yAxisId="right" type="monotone" dataKey="transactions" name="Transactions" stroke="#FF6A1F" strokeWidth={2.5} fill="transparent" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
};

export default AdminRevenueGrowth;
