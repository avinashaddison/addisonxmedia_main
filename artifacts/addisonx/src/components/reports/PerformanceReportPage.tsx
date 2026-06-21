import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { Activity } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { formatINR, downloadCsv } from "@/lib/format";
import { useDateRange, DateRangeBar, ReportCard, ChartCard, shortDate } from "@/components/reports/reportUtils";
import { toast } from "sonner";
import type { PerformanceReport } from "@/lib/api-types";

export const PerformanceReportPage = () => {
  const { user } = useAuth();
  const range = useDateRange("90d");
  const { data, isLoading } = useQuery({
    queryKey: ["report-performance", user?.id, range.params.from, range.params.to],
    enabled: !!user,
    queryFn: () => api.reportPerformance(range.params) as Promise<PerformanceReport>,
  });

  const exportCsv = () => {
    if (!data) return;
    downloadCsv(
      `performance-report-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Campaign", "Sent", "Replied", "Conversions", "Conversion %"],
      data.campaign_performance.map((c) => [c.name, c.sent, c.replied, c.conversions, c.conversion_rate]),
    );
    toast.success("Report exported");
  };

  const t = data?.totals;

  return (
    <PageShell title="Performance Report" subtitle="Sales, tasks aur messaging ka pradarshan" icon={<Activity className="w-5 h-5" />}>
      <DateRangeBar range={range} onExport={exportCsv} exportDisabled={!data} />
      {isLoading || !data ? (
        <Loading />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <ReportCard label="Deals Won" value={String(t!.deals_won)} color="#0E8A4B" sub={`${t!.deals_lost} lost`} />
            <ReportCard label="Win Rate" value={`${t!.win_rate}%`} color="#FF6A1F" />
            <ReportCard label="Open Pipeline" value={formatINR(t!.open_pipeline)} color="#3C50E0" />
            <ReportCard label="Broadcasts Sent" value={String(t!.broadcasts_sent)} color="#D4308E" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <ReportCard label="Tasks Completed" value={String(t!.tasks_completed)} color="#0E8A4B" />
            <ReportCard label="Tasks Pending" value={String(t!.tasks_pending)} color="#B8651A" />
            <ReportCard label="Messages Sent" value={String(t!.messages_out)} color="#FF6A1F" />
            <ReportCard label="Messages Received" value={String(t!.messages_in)} color="#3C50E0" />
          </div>

          <ChartCard title="Message volume over time">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0DCB8" />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: "#8a7a5c" }} minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#8a7a5c" }} width={36} />
                <Tooltip labelFormatter={shortDate} contentStyle={{ borderRadius: 12, border: "2px solid #E8B968", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                <Line type="monotone" dataKey="sent" name="Sent" stroke="#FF6A1F" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="received" name="Received" stroke="#0E8A4B" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Campaign performance">
            {data.campaign_performance.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-[13px] font-semibold text-foreground/40">No campaigns yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-foreground/55 border-b border-[#F0DCB8]">
                      <th className="py-2">Campaign</th>
                      <th className="py-2 text-right">Sent</th>
                      <th className="py-2 text-right">Replied</th>
                      <th className="py-2 text-right">Conversions</th>
                      <th className="py-2 text-right">Conv. %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.campaign_performance.map((c) => (
                      <tr key={c.id} className="border-b border-[#F7EAD0]">
                        <td className="py-2 font-semibold">{c.name}</td>
                        <td className="py-2 text-right tabular-nums">{c.sent}</td>
                        <td className="py-2 text-right tabular-nums">{c.replied}</td>
                        <td className="py-2 text-right tabular-nums font-bold text-[#0E8A4B]">{c.conversions}</td>
                        <td className="py-2 text-right tabular-nums font-bold text-[#FF6A1F]">{c.conversion_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChartCard>
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

export default PerformanceReportPage;
