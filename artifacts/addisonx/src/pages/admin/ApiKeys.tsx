import { useQuery } from "@tanstack/react-query";
import { adminApi, ApiKeyRow } from "@/lib/admin-api";
import { KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminScaffoldShell } from "@/components/admin/AdminScaffoldShell";

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-IN") : "—");

const ApiKeys = () => {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-api-keys"],
    queryFn: () => adminApi.apiKeys(),
  });

  const table =
    rows.length > 0 ? (
      <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_5px_0_0_#E8B968]">
        <div className="grid grid-cols-[1.4fr_1.2fr_1.6fr_120px_100px] gap-3 px-5 py-3.5 border-b-2 border-[#E8B968] bg-[#FFF6E8] text-[10px] font-extrabold uppercase tracking-wider text-[#0A3D24]">
          <div>Name</div>
          <div>Key</div>
          <div>Scopes</div>
          <div>Last Used</div>
          <div>Status</div>
        </div>
        {rows.map((k: ApiKeyRow) => (
          <div
            key={k.id}
            className="grid grid-cols-[1.4fr_1.2fr_1.6fr_120px_100px] gap-3 px-5 py-3 border-b border-slate-100 last:border-b-0 items-center hover:bg-[#FFF6E8]/30 transition"
          >
            <p className="text-[13px] font-bold text-slate-850 truncate">{k.name}</p>
            <span className="text-[12px] font-bold text-slate-700 font-mono truncate">{k.keyPrefix}••••</span>
            <span className="text-[12px] font-semibold text-slate-600 truncate">{k.scopes.join(", ") || "—"}</span>
            <span className="text-[12px] text-slate-500 font-semibold">{fmtDate(k.lastUsedAt)}</span>
            <span
              className={cn(
                "inline-flex px-2 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wider w-fit",
                k.revokedAt
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : "bg-[#E6F7EE] border-[#0E8A4B]/20 text-[#0A6E3C]"
              )}
            >
              {k.revokedAt ? "Revoked" : "Active"}
            </span>
          </div>
        ))}
      </div>
    ) : undefined;

  return (
    <AdminScaffoldShell
      title="API Keys"
      subtitle="Programmatic access ke liye platform API keys"
      icon={<KeyRound className="w-5 h-5 text-white" strokeWidth={2.5} />}
      isLoading={isLoading}
      stats={[{ label: "Total Keys", value: rows.length, icon: <KeyRound className="w-4 h-4" strokeWidth={2.4} /> }]}
      emptyTitle="Koi API key nahi banayi"
      emptyHint="Jab aap API keys generate karenge, woh yahaan scopes aur usage ke saath dikhengi. Key banane ka tool jald aa raha hai."
      emptyIcon={<KeyRound className="w-7 h-7 text-[#FF6A1F]" strokeWidth={2.2} />}
    >
      {table}
    </AdminScaffoldShell>
  );
};

export default ApiKeys;
