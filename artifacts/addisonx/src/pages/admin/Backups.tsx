import { useQuery } from "@tanstack/react-query";
import { adminApi, BackupRow } from "@/lib/admin-api";
import { Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminScaffoldShell } from "@/components/admin/AdminScaffoldShell";

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-IN") : "—");

const fmtSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const STATUS: Record<string, string> = {
  completed: "bg-[#E6F7EE] border-[#0E8A4B]/20 text-[#0A6E3C]",
  success: "bg-[#E6F7EE] border-[#0E8A4B]/20 text-[#0A6E3C]",
  pending: "bg-[#FFF1D6] border-[#E8B968]/40 text-[#B8651A]",
  running: "bg-[#FFF1D6] border-[#E8B968]/40 text-[#B8651A]",
  failed: "bg-rose-50 border-rose-200 text-rose-700",
};

const Backups = () => {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-backups"],
    queryFn: () => adminApi.backups(),
  });

  const table =
    rows.length > 0 ? (
      <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_5px_0_0_#E8B968]">
        <div className="grid grid-cols-[2fr_1fr_110px_110px_120px] gap-3 px-5 py-3.5 border-b-2 border-[#E8B968] bg-[#FFF6E8] text-[10px] font-extrabold uppercase tracking-wider text-[#0A3D24]">
          <div>Filename</div>
          <div>Kind</div>
          <div>Size</div>
          <div>Status</div>
          <div>Created</div>
        </div>
        {rows.map((b: BackupRow) => (
          <div
            key={b.id}
            className="grid grid-cols-[2fr_1fr_110px_110px_120px] gap-3 px-5 py-3 border-b border-slate-100 last:border-b-0 items-center hover:bg-[#FFF6E8]/30 transition"
          >
            <p className="text-[13px] font-bold text-slate-850 font-mono truncate">{b.filename}</p>
            <span className="text-[12px] font-semibold text-slate-600 truncate">{b.kind}</span>
            <span className="text-[12px] font-bold text-slate-700 tabular-nums">{fmtSize(b.sizeBytes)}</span>
            <span
              className={cn(
                "inline-flex px-2 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wider w-fit",
                STATUS[b.status] ?? "bg-slate-50 border-slate-200 text-slate-600"
              )}
            >
              {b.status}
            </span>
            <span className="text-[12px] text-slate-500 font-semibold">{fmtDate(b.createdAt)}</span>
          </div>
        ))}
      </div>
    ) : undefined;

  return (
    <AdminScaffoldShell
      title="Backups"
      subtitle="Database aur platform backups ka record"
      icon={<Database className="w-5 h-5 text-white" strokeWidth={2.5} />}
      isLoading={isLoading}
      stats={[{ label: "Total Backups", value: rows.length, icon: <Database className="w-4 h-4" strokeWidth={2.4} /> }]}
      emptyTitle="Abhi koi backup nahi"
      emptyHint="Jab backups schedule ya manually trigger honge, woh yahaan size aur status ke saath dikhne lagenge. Backup controls jald aa rahe hain."
      emptyIcon={<Database className="w-7 h-7 text-[#FF6A1F]" strokeWidth={2.2} />}
    >
      {table}
    </AdminScaffoldShell>
  );
};

export default Backups;
