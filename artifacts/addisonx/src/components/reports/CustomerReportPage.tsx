import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { Users2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { formatINR, formatINRFull, downloadCsv } from "@/lib/format";
import { useDateRange, DateRangeBar, ReportCard, ChartCard, CHART_COLORS, shortDate } from "@/components/reports/reportUtils";
import { toast } from "sonner";
import type { CustomersReport } from "@/lib/api-types";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const CustomerReportPage = () => {
  const { user } = useAuth();
  const range = useDateRange("90d");
  const { data, isLoading } = useQuery({
    queryKey: ["report-customers", user?.id, range.params.from, range.params.to],
    enabled: !!user,
    queryFn: () => api.reportCustomers(range.params) as Promise<CustomersReport>,
  });

  const exportCsv = () => {
    if (!data) return;
    downloadCsv(
      `customers-report-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Customer", "Value"],
      data.top_customers.map((c) => [c.name, c.value]),
    );
    toast.success("Report exported");
  };

  return (
    <PageShell title="Customer Report" subtitle="Customer base aur top spenders" icon={<Users2 className="w-5 h-5" />}>
      <DateRangeBar range={range} onExport={exportCsv} exportDisabled={!data} />
      {isLoading || !data ? (
        <Loading />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <ReportCard label="Total Contacts" value={String(data.totals.total_contacts)} color="#3C50E0" />
            <ReportCard label="Customers" value={String(data.totals.customers)} color="#0E8A4B" />
            <ReportCard label="New in Range" value={String(data.totals.new_in_range)} color="#FF6A1F" />
            <ReportCard label="Avg Customer Value" value={formatINR(data.totals.avg_customer_value)} color="#D4308E" />
          </div>

          <ChartCard title="New contacts over time">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.timeline}>
                <defs>
                  <linearGradient id="cust" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0E8A4B" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0E8A4B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0DCB8" />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: "#8a7a5c" }} minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#8a7a5c" }} width={36} />
                <Tooltip labelFormatter={shortDate} contentStyle={{ borderRadius: 12, border: "2px solid #E8B968", fontSize: 12 }} />
                <Area type="monotone" dataKey="customers" name="New contacts" stroke="#0E8A4B" strokeWidth={2.5} fill="url(#cust)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="By temperature">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={data.by_tag.map((t) => ({ ...t, label: cap(t.tag) }))} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={90} label={(e) => `${e.label}: ${e.count}`} labelLine={false} fontSize={11}>
                    {data.by_tag.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "2px solid #E8B968", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top customers by value">
              {data.top_customers.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-[13px] font-semibold text-foreground/40">No won deals yet</div>
              ) : (
                <div className="overflow-y-auto max-h-[240px]">
                  <table className="w-full text-[13px]">
                    <thead className="sticky top-0 bg-white">
                      <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-foreground/55 border-b border-[#F0DCB8]">
                        <th className="py-2">#</th>
                        <th className="py-2">Customer</th>
                        <th className="py-2 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.top_customers.map((c, i) => (
                        <tr key={c.id} className="border-b border-[#F7EAD0]">
                          <td className="py-2 text-foreground/40 font-bold">{i + 1}</td>
                          <td className="py-2 font-semibold">{c.name}</td>
                          <td className="py-2 text-right font-bold tabular-nums text-[#0E8A4B]">{formatINRFull(c.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ChartCard>
          </div>
        </div>
      )}
    </PageShell>
  );
};

const Loading = () => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
    <Skeleton className="h-64 rounded-2xl" />
  </div>
);

export default CustomerReportPage;
