import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi, AdminAuditEntry } from "@/lib/admin-api";
import {
  ScrollText, Loader2, Eye, ShieldOff, ShieldCheck, CreditCard, UserPlus,
  UserMinus, Shield, Edit3, Download, Filter, X, Copy,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { cn } from "@/lib/utils";

const ACTION_META: Record<string, { icon: typeof ScrollText; color: string; bg: string; label: string }> = {
  impersonate:       { icon: Eye,         color: "text-[#D4308E]", bg: "bg-[#FDF0F5] border-[#D4308E]/50", label: "Impersonate" },
  impersonate_end:   { icon: Eye,         color: "text-[#A11A6A]", bg: "bg-[#FDF0F5] border-[#A11A6A]/50", label: "Impersonate End" },
  suspend:           { icon: ShieldOff,   color: "text-rose-650", bg: "bg-rose-50 border-rose-350", label: "Suspend" },
  unsuspend:         { icon: ShieldCheck, color: "text-[#0E8A4B]", bg: "bg-[#E6F7EE] border-[#0E8A4B]/50", label: "Unsuspend" },
  change_plan:       { icon: Edit3,       color: "text-[#B8420A]", bg: "bg-[#FFF1D6] border-[#FF6A1F]/50", label: "Plan change" },
  refund:            { icon: CreditCard,  color: "text-[#2533A8]", bg: "bg-[#E6F0FA] border-[#3C50E0]/50", label: "Refund" },
  change_staff_role: { icon: Shield,      color: "text-[#3C50E0]", bg: "bg-[#E6F0FA] border-[#3C50E0]/50", label: "Staff role change" },
  remove_staff:      { icon: UserMinus,   color: "text-rose-700", bg: "bg-rose-50 border-rose-400", label: "Staff removed" },
  invite_staff:      { icon: UserPlus,    color: "text-[#0A6E3C]", bg: "bg-[#E6F7EE] border-[#0E8A4B]/50", label: "Staff invited" },
};

const prettyJson = (s: string | null) => {
  if (!s) return "(empty)";
  try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; }
};

const AdminAudit = () => {
  const [action, setAction] = useState<string>("");
  const [since, setSince] = useState<string>("");
  const [until, setUntil] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewing, setViewing] = useState<AdminAuditEntry | null>(null);

  const { data: rows = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-audit", { action, since, until }],
    queryFn: () => adminApi.audit({ action: action || undefined, since: since || undefined, until: until || undefined, limit: 500 }),
    refetchInterval: 30_000,
  });

  const handleDownload = () => {
    const url = adminApi.auditCsvUrl({
      action: action || undefined,
      since: since || undefined,
      until: until || undefined,
      limit: 500,
    });
    window.location.href = url;
  };

  const clearFilters = () => { setAction(""); setSince(""); setUntil(""); };

  const headerActions = (
    <div className="flex gap-2">
      <button
        onClick={() => setShowFilters((v) => !v)}
        className={cn(
          "px-4 py-2 rounded-xl text-[12px] font-extrabold border-2 transition-all duration-200 active:translate-y-0.5 flex items-center gap-1.5",
          showFilters
            ? "bg-[#0E8A4B] border-[#0A6E3C] text-white shadow-[0_2px_0_0_#073D22]"
            : "bg-white border-[#E8B968] text-slate-700 hover:bg-[#FFF1D6] shadow-[0_2px_0_0_#E8B968]"
        )}
      >
        <Filter className="w-3.5 h-3.5" /> Filters
      </button>
      <button
        onClick={handleDownload}
        disabled={rows.length === 0}
        className="px-4 py-2 rounded-xl text-[12px] font-extrabold bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] text-slate-700 hover:bg-[#FFF1D6] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-1.5"
      >
        <Download className="w-3.5 h-3.5" /> Export CSV
      </button>
    </div>
  );

  return (
    <PageShell
      title="Audit Log"
      subtitle={`${rows.length} entries · sorted newest first`}
      icon={<ScrollText className="w-5 h-5 text-white" strokeWidth={2.5} />}
      actions={headerActions}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white border-2 border-[#E8B968] rounded-2xl p-5 shadow-[0_4px_0_0_#E8B968] grid sm:grid-cols-4 gap-4 items-end animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="space-y-1.5">
              <Label htmlFor="filter-action" className="text-[11px] font-extrabold uppercase tracking-wider text-[#B8651A]">Action</Label>
              <select
                id="filter-action"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="h-10 px-3 rounded-xl border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:ring-0 focus-visible:outline-none bg-white text-sm font-bold w-full text-slate-800 shadow-[0_2px_0_0_#FFF1D6]"
              >
                <option value="">All actions</option>
                {Object.entries(ACTION_META).map(([k, m]) => (
                  <option key={k} value={k}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-since" className="text-[11px] font-extrabold uppercase tracking-wider text-[#B8651A]">From</Label>
              <Input
                id="filter-since"
                type="date"
                value={since}
                onChange={(e) => setSince(e.target.value)}
                className="border-2 border-[#E8B968] focus:border-[#0E8A4B] rounded-xl font-bold bg-white text-slate-800 text-[13px] h-10 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-[0_2px_0_0_#FFF1D6]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-until" className="text-[11px] font-extrabold uppercase tracking-wider text-[#B8651A]">Until</Label>
              <Input
                id="filter-until"
                type="date"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
                className="border-2 border-[#E8B968] focus:border-[#0E8A4B] rounded-xl font-bold bg-white text-slate-800 text-[13px] h-10 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-[0_2px_0_0_#FFF1D6]"
              />
            </div>
            <button
              onClick={clearFilters}
              className="h-10 px-4 rounded-xl text-[12px] font-extrabold border-2 border-rose-350 bg-white hover:bg-rose-50 text-rose-600 transition-all duration-200 active:translate-y-0.5 shadow-[0_2px_0_0_#FDA4AF] flex items-center justify-center gap-1.5"
            >
              <X className="w-4 h-4" /> Clear Filters
            </button>
          </div>
        )}

        {/* Logs Table */}
        <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_5px_0_0_#E8B968]">
          <div className="grid grid-cols-[180px_1fr_1fr_1fr_140px_60px] gap-3 px-5 py-3.5 border-b-2 border-[#E8B968] bg-[#FFF6E8] text-[10px] font-extrabold uppercase tracking-wider text-[#0A3D24]">
            <div>Action</div>
            <div>Actor</div>
            <div>Target User</div>
            <div>Payload (preview)</div>
            <div>When</div>
            <div></div>
          </div>

          {isLoading && (
            <div className="px-6 py-12 text-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0E8A4B]" />
              <p className="text-xs text-slate-450 mt-2 font-bold">Loading audit logs...</p>
            </div>
          )}

          {!isLoading && rows.length === 0 && (
            <div className="px-6 py-16 text-center">
              <p className="text-[14px] font-black text-slate-800">{action || since || until ? "No matches for those filters" : "No actions yet"}</p>
              <p className="text-[12px] text-slate-450 mt-1">{action || since || until ? "Try clearing filters." : "Once admin actions happen, they'll appear here."}</p>
            </div>
          )}

          {!isLoading && rows.map((r) => {
            const meta = ACTION_META[r.action] ?? { icon: ScrollText, color: "text-slate-600", bg: "bg-slate-50 border-slate-300", label: r.action };
            const Icon = meta.icon;
            let payloadPreview = "";
            try { payloadPreview = r.payload ? JSON.stringify(JSON.parse(r.payload)) : ""; } catch { payloadPreview = r.payload ?? ""; }

            return (
              <div
                key={r.id}
                className="grid grid-cols-[180px_1fr_1fr_1fr_140px_60px] gap-3 px-5 py-3.5 border-b border-slate-100 last:border-b-0 items-center hover:bg-[#FFF6E8]/30 transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 border-2 border-slate-900 shadow-[0_1.5px_0_0_#000]", meta.bg)}>
                    <Icon className={cn("w-3.5 h-3.5", meta.color)} strokeWidth={2.5} />
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 truncate">{meta.label}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-slate-850 truncate">{r.actorName ?? "—"}</p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">{r.actorEmail ?? r.actorUserId}</p>
                </div>
                <p className="text-[11px] font-mono text-slate-550 truncate" title={r.targetUserId ?? ""}>{r.targetUserId ?? "—"}</p>
                <p className="text-[11px] font-mono text-slate-500 truncate" title={payloadPreview}>{payloadPreview || "(empty)"}</p>
                <p className="text-[11px] text-slate-500 font-semibold">{new Date(r.createdAt).toLocaleString("en-IN")}</p>
                <div className="justify-self-end">
                  <button
                    onClick={() => setViewing(r)}
                    className="w-8 h-8 rounded-xl bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] text-slate-600 hover:bg-[#FFF1D6] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] transition-all flex items-center justify-center"
                    aria-label="View full payload"
                    title="View full payload"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
          <DialogContent className="border-2 border-[#E8B968] shadow-[0_6px_0_0_#E8B968] bg-white rounded-2xl p-6 max-w-2xl">
            {viewing && (() => {
              const meta = ACTION_META[viewing.action] ?? { icon: ScrollText, color: "text-slate-600", bg: "bg-slate-50 border-slate-300", label: viewing.action };
              const Icon = meta.icon;
              const payload = prettyJson(viewing.payload);
              return (
                <>
                  <DialogHeader>
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border-2 border-slate-900 shadow-[0_2px_0_0_#000] flex-shrink-0", meta.bg)}>
                        <Icon className={cn("w-5 h-5", meta.color)} strokeWidth={2.5} />
                      </div>
                      <div>
                        <DialogTitle className="text-[18px] font-black text-slate-900">{meta.label}</DialogTitle>
                        <DialogDescription className="text-slate-450 font-bold font-mono text-[10px] mt-0.5">
                          Log ID: {viewing.id}
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="grid grid-cols-2 gap-4 mt-6 bg-[#FFF6E8] border-2 border-[#E8B968] p-4 rounded-xl shadow-[0_2px_0_0_#E8B968]">
                    <Field label="When" value={new Date(viewing.createdAt).toLocaleString("en-IN")} />
                    <Field label="Actor" value={viewing.actorEmail ?? viewing.actorUserId} />
                    <Field label="Target User" value={viewing.targetUserId ?? "—"} mono />
                    <Field label="IP Address" value={viewing.ipAddress ?? "—"} mono />
                  </div>

                  <div className="mt-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-extrabold uppercase tracking-wider text-[#B8651A]">Full Payload</Label>
                      <button
                        onClick={() => { navigator.clipboard.writeText(payload); toast.success("Payload copied"); }}
                        className="px-3 py-1 rounded-xl text-[11px] font-extrabold bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] text-slate-700 hover:bg-[#FFF1D6] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] transition-all flex items-center gap-1"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy Payload
                      </button>
                    </div>
                    <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 text-xs font-mono leading-relaxed overflow-auto max-h-72 border-2 border-slate-900 shadow-[0_3px_0_0_#000]">
{payload}
                    </pre>
                  </div>

                  {viewing.userAgent && (
                    <div className="mt-4 bg-[#FFF6E8]/40 p-3 border-2 border-dashed border-[#E8B968] rounded-xl">
                      <Label className="text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A]">User Agent</Label>
                      <p className="text-[10px] text-slate-500 font-mono mt-1 break-all leading-normal">{viewing.userAgent}</p>
                    </div>
                  )}
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  );
};

const Field = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="space-y-0.5">
    <p className="text-[10px] uppercase tracking-wider text-[#B8651A] font-extrabold">{label}</p>
    <p className={mono ? "text-[11px] font-mono font-bold text-slate-700" : "text-xs font-bold text-slate-800"}>{value}</p>
  </div>
);

export default AdminAudit;
