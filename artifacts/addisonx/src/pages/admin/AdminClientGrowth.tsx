import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { Users, Loader2, UserPlus } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell } from "recharts";

const STATUS_COLORS: Record<string, string> = {
  active: "#0E8A4B", trial: "#FFD23F", suspended: "#FF6A1F", inactive: "#94A3B8", cancelled: "#E11D48",
};

const fmtDay = (s: string) => new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

const AdminClientGrowth = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-client-growth"],
    queryFn: () => adminApi.clientGrowth(90),
  });

  const series = (data?.series ?? []).map((d) => ({ ...d, label: fmtDay(d.date) }));
  const breakdown = data?.statusBreakdown ?? [];

  return (
    <PageShell
      title="Client Growth"
      subtitle="signups aur total clients ka trend (90 din)"
      icon={<Users className="w-5 h-5 text-white" strokeWidth={2.5} />}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {isLoading ? (
          <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0E8A4B]" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border-2 border-[#E8B968] rounded-2xl p-4 shadow-[0_4px_0_0_#E8B968]">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A]">Total clients</p>
                <p className="text-[24px] font-black tracking-tight text-slate-850 mt-1 tabular-nums">{data?.totalClients ?? 0}</p>
              </div>
              {breakdown.slice(0, 3).map((b) => (
                <div key={b.status} className="bg-white border-2 border-[#E8B968] rounded-2xl p-4 shadow-[0_4px_0_0_#E8B968]">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A] capitalize">{b.status}</p>
                  <p className="text-[24px] font-black tracking-tight mt-1 tabular-nums" style={{ color: STATUS_COLORS[b.status] ?? "#0E8A4B" }}>{b.count}</p>
                </div>
              ))}
            </div>

            <div className="bg-white border-2 border-[#E8B968] rounded-2xl p-5 shadow-[0_5px_0_0_#E8B968]">
              <h2 className="text-[14px] font-black tracking-tight text-slate-850 mb-1">Cumulative clients</h2>
              <p className="text-[11px] text-slate-400 font-semibold mb-4">Har din ka running total.</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0E8A4B" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#0E8A4B" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1E9D6" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={{ stroke: "#E8B968" }} minTickGap={28} />
                    <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} width={40} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "2px solid #E8B968", fontWeight: 700, fontSize: 12 }} />
                    <Area type="monotone" dataKey="total" name="Total" stroke="#0E8A4B" strokeWidth={2.5} fill="url(#cg)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border-2 border-[#E8B968] rounded-2xl p-5 shadow-[0_5px_0_0_#E8B968]">
              <h2 className="text-[14px] font-black tracking-tight text-slate-850 mb-1">Daily signups</h2>
              <p className="text-[11px] text-slate-400 font-semibold mb-4">Naye accounts per din.</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1E9D6" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={{ stroke: "#E8B968" }} minTickGap={28} />
                    <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                    <Tooltip cursor={{ fill: "#FFF6E8" }} contentStyle={{ borderRadius: 12, border: "2px solid #E8B968", fontWeight: 700, fontSize: 12 }} />
                    <Bar dataKey="signups" name="Signups" fill="#FF6A1F" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {breakdown.length > 0 && (
              <div className="bg-white border-2 border-[#E8B968] rounded-2xl p-5 shadow-[0_5px_0_0_#E8B968]">
                <h2 className="text-[14px] font-black tracking-tight text-slate-850 mb-4">Status breakdown</h2>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={breakdown} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1E9D6" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="status" tick={{ fontSize: 12, fontWeight: 700, fill: "#475569" }} tickLine={false} axisLine={false} width={88} />
                      <Tooltip cursor={{ fill: "#FFF6E8" }} contentStyle={{ borderRadius: 12, border: "2px solid #E8B968", fontWeight: 700, fontSize: 12 }} />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                        {breakdown.map((b) => <Cell key={b.status} fill={STATUS_COLORS[b.status] ?? "#0E8A4B"} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
};

export default AdminClientGrowth;
