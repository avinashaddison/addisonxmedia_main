import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi, AdminWorkspace } from "@/lib/admin-api";
import { Link } from "react-router-dom";
import { Building2, Search, Loader2, ChevronRight, IndianRupee } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-IN") : "—");

const STATUS = {
  active:    { bg: "bg-[#E6F7EE]", text: "text-[#0E8A4B]", label: "Active" },
  trial:     { bg: "bg-[#FFF1D6]", text: "text-[#B8651A]", label: "Trial" },
  suspended: { bg: "bg-[#FCE5F0]", text: "text-[#D4308E]", label: "Suspended" },
  cancelled: { bg: "bg-[#E4E8FF]", text: "text-[#3C50E0]", label: "Cancelled" },
} as const;

const AdminWorkspaces = () => {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-workspaces", q, status],
    queryFn: () => adminApi.workspaces({ q: q || undefined, status }),
  });

  return (
    <div className="px-6 lg:px-10 py-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FFD23F] to-[#E8B400] text-[#3D1A00] flex items-center justify-center shadow-md">
          <Building2 className="w-6 h-6" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-[26px] font-black tracking-tight">Workspaces</h1>
          <p className="text-[12px] text-foreground/70 font-medium">{rows.length} accounts · click any row for details</p>
        </div>
      </div>

      <div className="bg-white border-2 border-[#E8B968] rounded-2xl p-3 mb-3 flex flex-wrap items-center gap-2 shadow-[0_3px_0_0_#E8B968]">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B8651A]" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email…" className="pl-9" />
        </div>
        <div className="flex gap-1">
          {(["all", "active", "trial", "suspended", "cancelled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "px-3.5 h-10 rounded-xl text-[12px] font-extrabold capitalize transition border-2 border-transparent",
                status === s ? "bg-[#B8230C] text-white shadow-sm" : "bg-[#FFF1D6] text-foreground hover:scale-105"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_4px_0_0_#E8B968]">
        <div className="grid grid-cols-[1.6fr_120px_110px_120px_120px_60px] gap-3 px-4 py-3 border-b-2 border-[#E8B968] bg-[#FFF1D6] text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A]">
          <div>Account</div>
          <div>Plan</div>
          <div>Status</div>
          <div>MRR</div>
          <div>Joined</div>
          <div></div>
        </div>

        {isLoading && (
          <div className="px-4 py-12 text-center text-foreground/60">
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          </div>
        )}

        {!isLoading && rows.length === 0 && (
          <div className="px-4 py-16 text-center">
            <p className="text-[13px] font-extrabold">No accounts found</p>
            <p className="text-[12px] text-foreground/60 mt-1">Try a different filter</p>
          </div>
        )}

        {rows.map((w: AdminWorkspace) => {
          const st = STATUS[(w.status as keyof typeof STATUS) ?? "active"] ?? STATUS.active;
          return (
            <Link
              key={w.id}
              to={`/admin/workspaces/${w.id}`}
              className="grid grid-cols-[1.6fr_120px_110px_120px_120px_60px] gap-3 px-4 py-3 border-b border-[#E8B968]/40 last:border-b-0 items-center hover:bg-[#FFF6E8] transition"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-extrabold truncate">{w.name}</p>
                <p className="text-[11px] text-foreground/60 font-mono truncate">{w.email}</p>
              </div>
              <span className="inline-flex px-2 py-1 rounded-full bg-[#FFF1D6] border border-[#E8B968] text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A] w-fit">
                {w.plan}
              </span>
              <span className={cn("inline-flex px-2 py-1 rounded-full border text-[10px] font-extrabold uppercase tracking-wider w-fit", st.bg, st.text, "border-current/30")}>
                {st.label}
              </span>
              <span className="inline-flex items-center gap-1 text-[13px] font-extrabold tabular-nums">
                <IndianRupee className="w-3 h-3 text-foreground/60" />
                {Number(w.mrrInr ?? 0).toLocaleString("en-IN")}
              </span>
              <span className="text-[12px] text-foreground/70 font-medium">{fmtDate(w.createdAt)}</span>
              <ChevronRight className="w-4 h-4 text-foreground/40 justify-self-end" />
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default AdminWorkspaces;
