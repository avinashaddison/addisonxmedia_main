import { useQuery } from "@tanstack/react-query";
import { adminApi, FinanceReports } from "@/lib/admin-api";
import { FileSpreadsheet, Download, Loader2, IndianRupee } from "lucide-react";
import { PageShell } from "@/components/PageShell";

const inr = (n: number) => `₹${Number(n ?? 0).toLocaleString("en-IN")}`;

const downloadCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const ExportBtn = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button onClick={onClick} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border-2 border-[#E8B968] text-[#7A4A00] text-[11px] font-extrabold hover:bg-[#FFF1D6] transition shadow-[0_2px_0_0_#E8B968]">
    <Download className="w-3.5 h-3.5" strokeWidth={2.6} /> {label}
  </button>
);

const Card = ({ title, subtitle, action, children }: { title: string; subtitle: string; action: React.ReactNode; children: React.ReactNode }) => (
  <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_5px_0_0_#E8B968]">
    <div className="px-5 py-3.5 border-b-2 border-[#E8B968] bg-[#FFF6E8] flex items-center justify-between gap-3">
      <div>
        <h2 className="text-[14px] font-black tracking-tight text-slate-850">{title}</h2>
        <p className="text-[11px] text-slate-400 font-semibold">{subtitle}</p>
      </div>
      {action}
    </div>
    {children}
  </div>
);

const AdminFinancialReports = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-finance-reports"],
    queryFn: () => adminApi.financeReports(12),
  });

  const monthly = data?.monthly ?? [];
  const byPlan = data?.byPlan ?? [];

  const exportMonthly = () =>
    downloadCsv("addisonx-monthly-revenue.csv", ["Month", "Revenue (INR)", "Transactions"], monthly.map((m) => [m.month, m.revenue, m.transactions]));
  const exportByPlan = () =>
    downloadCsv("addisonx-revenue-by-plan.csv", ["Plan", "Revenue (INR)", "Transactions"], byPlan.map((p) => [p.plan, p.revenue, p.transactions]));

  return (
    <PageShell
      title="Financial Reports"
      subtitle="month-wise aur plan-wise revenue — CSV export ke saath"
      icon={<FileSpreadsheet className="w-5 h-5 text-white" strokeWidth={2.5} />}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {isLoading ? (
          <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0E8A4B]" /></div>
        ) : (
          <>
            <Card title="Monthly revenue" subtitle="pichhle 12 mahine" action={<ExportBtn onClick={exportMonthly} label="CSV" />}>
              <div className="grid grid-cols-[1fr_140px_120px] gap-3 px-5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-[#0A3D24] bg-white border-b border-slate-100">
                <div>Month</div><div>Revenue</div><div>Txns</div>
              </div>
              {monthly.length === 0 ? (
                <div className="px-6 py-10 text-center text-[12px] font-semibold text-slate-400">Abhi koi revenue data nahi.</div>
              ) : monthly.map((m) => (
                <div key={m.month} className="grid grid-cols-[1fr_140px_120px] gap-3 px-5 py-2.5 border-b border-slate-50 last:border-b-0 items-center">
                  <span className="text-[12px] font-bold text-slate-700">{m.month}</span>
                  <span className="inline-flex items-center gap-0.5 text-[13px] font-black text-slate-800 tabular-nums"><IndianRupee className="w-3 h-3 text-slate-400" />{Number(m.revenue).toLocaleString("en-IN")}</span>
                  <span className="text-[12px] font-semibold text-slate-500 tabular-nums">{m.transactions}</span>
                </div>
              ))}
            </Card>

            <Card title="Revenue by plan" subtitle="all-time, plan ke hisaab se" action={<ExportBtn onClick={exportByPlan} label="CSV" />}>
              <div className="grid grid-cols-[1fr_140px_120px] gap-3 px-5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-[#0A3D24] bg-white border-b border-slate-100">
                <div>Plan</div><div>Revenue</div><div>Txns</div>
              </div>
              {byPlan.length === 0 ? (
                <div className="px-6 py-10 text-center text-[12px] font-semibold text-slate-400">Abhi koi revenue data nahi.</div>
              ) : byPlan.map((p) => (
                <div key={p.plan} className="grid grid-cols-[1fr_140px_120px] gap-3 px-5 py-2.5 border-b border-slate-50 last:border-b-0 items-center">
                  <span className="text-[12px] font-bold text-slate-700 capitalize">{p.plan}</span>
                  <span className="inline-flex items-center gap-0.5 text-[13px] font-black text-slate-800 tabular-nums"><IndianRupee className="w-3 h-3 text-slate-400" />{Number(p.revenue).toLocaleString("en-IN")}</span>
                  <span className="text-[12px] font-semibold text-slate-500 tabular-nums">{p.transactions}</span>
                </div>
              ))}
            </Card>
          </>
        )}
      </div>
    </PageShell>
  );
};

export default AdminFinancialReports;
