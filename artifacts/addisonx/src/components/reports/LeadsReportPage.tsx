import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { Target } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { downloadCsv } from "@/lib/format";
import { useDateRange, DateRangeBar, ReportCard, ChartCard, CHART_COLORS, shortDate } from "@/components/reports/reportUtils";
import { toast } from "sonner";
import type { LeadsReport } from "@/lib/api-types";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const LeadsReportPage = () => {
  const { user } = useAuth();
  const range = useDateRange("90d");
  const { data, isLoading } = useQuery({
    queryKey: ["report-leads", user?.id, range.params.from, range.params.to],
    enabled: !!user,
    queryFn: () => api.reportLeads(range.params) as Promise<LeadsReport>,
  });

  const exportCsv = () => {
    if (!data) return;
    downloadCsv(
      `leads-report-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Source", "Leads"],
      data.by_source.map((s) => [s.source, s.count]),
    );
    toast.success("Report exported");
  };

  return (
    <PageShell title="Leads Report" subtitle="Pipeline distribution aur naye leads" icon={<Target className="w-5 h-5" />}>
      <DateRangeBar range={range} onExport={exportCsv} exportDisabled={!data} />
      {isLoading || !data ? (
        <Loading />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <ReportCard label="Total Leads" value={String(data.totals.total_leads)} color="#3C50E0" />
            <ReportCard label="New in Range" value={String(data.totals.new_in_range)} color="#FF6A1F" />
            <ReportCard label="Converted (Won)" value={String(data.totals.converted)} color="#0E8A4B" />
            <ReportCard label="Conversion Rate" value={`${data.totals.conversion_rate}%`} color="#D4308E" />
          </div>

          <ChartCard title="New leads over time">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.timeline}>
                <defs>
                  <linearGradient id="lead" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF6A1F" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#FF6A1F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0DCB8" />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: "#8a7a5c" }} minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#8a7a5c" }} width={36} />
                <Tooltip labelFormatter={shortDate} contentStyle={{ borderRadius: 12, border: "2px solid #E8B968", fontSize: 12 }} />
                <Area type="monotone" dataKey="leads" name="New leads" stroke="#FF6A1F" strokeWidth={2.5} fill="url(#lead)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="By pipeline stage">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.by_status.map((s) => ({ ...s, label: cap(s.status) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0DCB8" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#8a7a5c" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#8a7a5c" }} width={32} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "2px solid #E8B968", fontSize: 12 }} />
                  <Bar dataKey="count" name="Leads" radius={[8, 8, 0, 0]}>
                    {data.by_status.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

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
          </div>

          <ChartCard title="Top sources">
            {data.by_source.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-[13px] font-semibold text-foreground/40">No sources yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-foreground/55 border-b border-[#F0DCB8]">
                      <th className="py-2">Source</th>
                      <th className="py-2 text-right">Leads</th>
                      <th className="py-2 text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_source.slice(0, 12).map((s) => (
                      <tr key={s.source} className="border-b border-[#F7EAD0]">
                        <td className="py-2 font-semibold">{s.source}</td>
                        <td className="py-2 text-right font-bold tabular-nums">{s.count}</td>
                        <td className="py-2 text-right text-foreground/55 tabular-nums">{data.totals.total_leads ? Math.round((s.count / data.totals.total_leads) * 100) : 0}%</td>
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

export default LeadsReportPage;
