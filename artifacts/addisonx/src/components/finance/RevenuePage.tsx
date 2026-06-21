import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { formatINR, formatINRFull } from "@/lib/format";
import { useDateRange, DateRangeBar, ReportCard, ChartCard, CHART_COLORS, shortDate } from "@/components/reports/reportUtils";
import type { RevenueReport } from "@/lib/api-types";

export const RevenuePage = () => {
  const { user } = useAuth();
  const range = useDateRange("90d");
  const { data, isLoading } = useQuery({
    queryKey: ["revenue", user?.id, range.params.from, range.params.to],
    enabled: !!user,
    queryFn: () => api.reportRevenue(range.params) as Promise<RevenueReport>,
  });

  const t = data?.totals;

  return (
    <PageShell title="Revenue" subtitle="Won deals + paid invoices, kharche ke saath" icon={<TrendingUp className="w-5 h-5" />}>
      <DateRangeBar range={range} />

      {isLoading || !data ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <ReportCard label="Total Revenue" value={formatINR(t!.total_revenue)} color="#0E8A4B" />
            <ReportCard label="From Deals" value={formatINR(t!.deal_revenue)} color="#FF6A1F" />
            <ReportCard label="From Invoices" value={formatINR(t!.invoice_revenue)} color="#3C50E0" />
            <ReportCard label="Net Profit" value={formatINR(t!.net_profit)} color={t!.net_profit >= 0 ? "#0E8A4B" : "#D4308E"} sub={`Expenses ${formatINR(t!.total_expenses)}`} />
          </div>

          <ChartCard title="Revenue vs Expenses over time">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.timeline}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0E8A4B" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0E8A4B" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4308E" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#D4308E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0DCB8" />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: "#8a7a5c" }} minTickGap={24} />
                <YAxis tickFormatter={(v) => formatINR(v)} tick={{ fontSize: 11, fill: "#8a7a5c" }} width={56} />
                <Tooltip formatter={(v: number) => formatINRFull(v)} labelFormatter={shortDate} contentStyle={{ borderRadius: 12, border: "2px solid #E8B968", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#0E8A4B" strokeWidth={2.5} fill="url(#rev)" />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#D4308E" strokeWidth={2.5} fill="url(#exp)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Revenue by source">
              {data.by_source.every((s) => s.value === 0) ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.by_source} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0DCB8" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => formatINR(v)} tick={{ fontSize: 11, fill: "#8a7a5c" }} />
                    <YAxis type="category" dataKey="source" tick={{ fontSize: 11, fill: "#8a7a5c" }} width={90} />
                    <Tooltip formatter={(v: number) => formatINRFull(v)} contentStyle={{ borderRadius: 12, border: "2px solid #E8B968", fontSize: 12 }} />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                      {data.by_source.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Expenses by category">
              {data.expenses_by_category.length === 0 ? (
                <EmptyChart label="No expenses in range" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.expenses_by_category} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0DCB8" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => formatINR(v)} tick={{ fontSize: 11, fill: "#8a7a5c" }} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: "#8a7a5c" }} width={90} />
                    <Tooltip formatter={(v: number) => formatINRFull(v)} contentStyle={{ borderRadius: 12, border: "2px solid #E8B968", fontSize: 12 }} />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                      {data.expenses_by_category.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 3) % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </div>
      )}
    </PageShell>
  );
};

const EmptyChart = ({ label = "No data in range" }: { label?: string }) => (
  <div className="h-[220px] flex items-center justify-center text-[13px] font-semibold text-foreground/40">{label}</div>
);

export default RevenuePage;
