import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, ComposedChart, Area, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { IndianRupee } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { formatINR, formatINRFull, downloadCsv } from "@/lib/format";
import { useDateRange, DateRangeBar, ReportCard, ChartCard, shortDate } from "@/components/reports/reportUtils";
import { toast } from "sonner";
import type { RevenueReport } from "@/lib/api-types";

export const RevenueReportPage = () => {
  const { user } = useAuth();
  const range = useDateRange("90d");
  const { data, isLoading } = useQuery({
    queryKey: ["report-revenue", user?.id, range.params.from, range.params.to],
    enabled: !!user,
    queryFn: () => api.reportRevenue(range.params) as Promise<RevenueReport>,
  });

  const exportCsv = () => {
    if (!data) return;
    downloadCsv(
      `revenue-report-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Date", "Revenue", "Expenses", "Net"],
      data.timeline.map((r) => [r.date, r.revenue, r.expenses, r.net]),
    );
    toast.success("Report exported");
  };

  return (
    <PageShell title="Revenue Report" subtitle="Aamdani, kharch aur munafa — time ke saath" icon={<IndianRupee className="w-5 h-5" />}>
      <DateRangeBar range={range} onExport={exportCsv} exportDisabled={!data} />
      {isLoading || !data ? (
        <Loading />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <ReportCard label="Total Revenue" value={formatINR(data.totals.total_revenue)} color="#0E8A4B" />
            <ReportCard label="Deal Revenue" value={formatINR(data.totals.deal_revenue)} color="#FF6A1F" />
            <ReportCard label="Invoice Revenue" value={formatINR(data.totals.invoice_revenue)} color="#3C50E0" />
            <ReportCard label="Expenses" value={formatINR(data.totals.total_expenses)} color="#D4308E" />
            <ReportCard label="Net Profit" value={formatINR(data.totals.net_profit)} color={data.totals.net_profit >= 0 ? "#0E8A4B" : "#D4308E"} />
          </div>

          <ChartCard title="Revenue, expenses & net profit">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data.timeline}>
                <defs>
                  <linearGradient id="rrev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0E8A4B" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#0E8A4B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0DCB8" />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: "#8a7a5c" }} minTickGap={24} />
                <YAxis tickFormatter={(v) => formatINR(v)} tick={{ fontSize: 11, fill: "#8a7a5c" }} width={56} />
                <Tooltip formatter={(v: number) => formatINRFull(v)} labelFormatter={shortDate} contentStyle={{ borderRadius: 12, border: "2px solid #E8B968", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#0E8A4B" strokeWidth={2.5} fill="url(#rrev)" />
                <Bar dataKey="expenses" name="Expenses" fill="#D4308E" radius={[6, 6, 0, 0]} barSize={14} />
                <Line type="monotone" dataKey="net" name="Net" stroke="#3C50E0" strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Timeline breakdown">
            <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-foreground/55 border-b border-[#F0DCB8]">
                    <th className="py-2">Period</th>
                    <th className="py-2 text-right">Revenue</th>
                    <th className="py-2 text-right">Expenses</th>
                    <th className="py-2 text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.timeline].reverse().map((r) => (
                    <tr key={r.date} className="border-b border-[#F7EAD0]">
                      <td className="py-2 font-semibold">{shortDate(r.date)}</td>
                      <td className="py-2 text-right tabular-nums text-[#0E8A4B] font-bold">{formatINRFull(r.revenue)}</td>
                      <td className="py-2 text-right tabular-nums text-[#D4308E]">{formatINRFull(r.expenses)}</td>
                      <td className="py-2 text-right tabular-nums font-bold" style={{ color: r.net >= 0 ? "#0A6E3C" : "#D4308E" }}>{formatINRFull(r.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>
      )}
    </PageShell>
  );
};

const Loading = () => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
    <Skeleton className="h-72 rounded-2xl" />
  </div>
);

export default RevenueReportPage;
