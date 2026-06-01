import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi, AdminAuditEntry } from "@/lib/admin-api";
import {
  ScrollText, Loader2, Eye, ShieldOff, ShieldCheck, CreditCard, UserPlus,
  UserMinus, Shield, Edit3, Download, Filter, X, Copy,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const ACTION_META: Record<string, { icon: typeof ScrollText; color: string; bg: string; label: string }> = {
  impersonate:       { icon: Eye,         color: "text-rose-600", bg: "bg-rose-50 border-rose-100", label: "Impersonate" },
  impersonate_end:   { icon: Eye,         color: "text-rose-700", bg: "bg-rose-100/50 border-rose-200/50", label: "Impersonate ended" },
  suspend:           { icon: ShieldOff,   color: "text-pink-600", bg: "bg-pink-50 border-pink-100", label: "Suspend" },
  unsuspend:         { icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100", label: "Unsuspend" },
  change_plan:       { icon: Edit3,       color: "text-amber-600", bg: "bg-amber-50 border-amber-100", label: "Plan change" },
  refund:            { icon: CreditCard,  color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100", label: "Refund" },
  change_staff_role: { icon: Shield,      color: "text-violet-600", bg: "bg-violet-50 border-violet-100", label: "Staff role change" },
  remove_staff:      { icon: UserMinus,   color: "text-rose-600", bg: "bg-rose-50 border-rose-100", label: "Staff removed" },
  invite_staff:      { icon: UserPlus,    color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100", label: "Staff invited" },
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

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white flex items-center justify-center shadow-md">
            <ScrollText className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit log</h1>
            <p className="text-xs text-slate-500 font-medium">
              {rows.length} entries · sorted newest first {isFetching && <Loader2 className="w-3 h-3 inline animate-spin ml-1" />}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters((v) => !v)}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Filter className="w-3.5 h-3.5 mr-2" /> Filters
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDownload} 
            disabled={rows.length === 0}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm grid sm:grid-cols-4 gap-4 items-end animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="space-y-1.5">
            <Label htmlFor="filter-action" className="text-xs font-semibold text-slate-600">Action</Label>
            <select
              id="filter-action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
            >
              <option value="">All actions</option>
              {Object.entries(ACTION_META).map(([k, m]) => (
                <option key={k} value={k}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-since" className="text-xs font-semibold text-slate-600">From</Label>
            <Input 
              id="filter-since" 
              type="date" 
              value={since} 
              onChange={(e) => setSince(e.target.value)}
              className="rounded-xl border-slate-200 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500" 
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-until" className="text-xs font-semibold text-slate-600">Until</Label>
            <Input 
              id="filter-until" 
              type="date" 
              value={until} 
              onChange={(e) => setUntil(e.target.value)}
              className="rounded-xl border-slate-200 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500" 
            />
          </div>
          <Button 
            variant="ghost" 
            onClick={clearFilters}
            className="rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="w-3.5 h-3.5 mr-2" /> Clear Filters
          </Button>
        </div>
      )}

      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-[180px_1fr_1fr_1fr_120px_60px] gap-3 px-6 py-3 border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <div>Action</div>
          <div>Actor</div>
          <div>Target user</div>
          <div>Payload (preview)</div>
          <div>When</div>
          <div></div>
        </div>

        {isLoading && (
          <div className="px-6 py-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
            <p className="text-xs text-slate-400 mt-2 font-medium">Loading audit logs...</p>
          </div>
        )}

        {!isLoading && rows.length === 0 && (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-semibold text-slate-700">{action || since || until ? "No matches for those filters" : "No actions yet"}</p>
            <p className="text-xs text-slate-400 mt-1">{action || since || until ? "Try clearing filters." : "Once admin actions happen, they'll appear here."}</p>
          </div>
        )}

        {!isLoading && rows.map((r) => {
          const meta = ACTION_META[r.action] ?? { icon: ScrollText, color: "text-slate-600", bg: "bg-slate-50 border-slate-100", label: r.action };
          const Icon = meta.icon;
          let payloadPreview = "";
          try { payloadPreview = r.payload ? JSON.stringify(JSON.parse(r.payload)) : ""; } catch { payloadPreview = r.payload ?? ""; }
          return (
            <div key={r.id} className="grid grid-cols-[180px_1fr_1fr_1fr_120px_60px] gap-3 px-6 py-3.5 border-b border-slate-100 last:border-b-0 items-center hover:bg-slate-50/50 transition">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${meta.bg}`}>
                  <Icon className={`w-4 h-4 ${meta.color}`} strokeWidth={2.5} />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 truncate">{meta.label}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">{r.actorName ?? "—"}</p>
                <p className="text-[10px] text-slate-500 font-mono truncate">{r.actorEmail ?? r.actorUserId}</p>
              </div>
              <p className="text-[11px] font-mono text-slate-600 truncate" title={r.targetUserId ?? ""}>{r.targetUserId ?? "—"}</p>
              <p className="text-[11px] font-mono text-slate-500 truncate" title={payloadPreview}>{payloadPreview || "(empty)"}</p>
              <p className="text-[11px] text-slate-500">{new Date(r.createdAt).toLocaleString("en-IN")}</p>
              <button
                onClick={() => setViewing(r)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition justify-self-end"
                aria-label="View full payload"
                title="View full payload"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl rounded-2xl border-slate-100">
          {viewing && (() => {
            const meta = ACTION_META[viewing.action] ?? { icon: ScrollText, color: "text-slate-600", bg: "bg-slate-50 border-slate-100", label: viewing.action };
            const Icon = meta.icon;
            const payload = prettyJson(viewing.payload);
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3 mb-1">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-sm ${meta.bg}`}>
                      <Icon className={`w-5 h-5 ${meta.color}`} strokeWidth={2.5} />
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-bold text-slate-900">{meta.label}</DialogTitle>
                      <DialogDescription className="text-slate-400 font-medium font-mono text-[10px]">
                        ID: {viewing.id}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <dl className="grid grid-cols-2 gap-4 mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <Field label="When" value={new Date(viewing.createdAt).toLocaleString("en-IN")} />
                  <Field label="Actor" value={viewing.actorEmail ?? viewing.actorUserId} />
                  <Field label="Target user" value={viewing.targetUserId ?? "—"} mono />
                  <Field label="IP address" value={viewing.ipAddress ?? "—"} mono />
                </dl>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-600">Full payload</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { navigator.clipboard.writeText(payload); toast.success("Payload copied"); }}
                      className="rounded-lg h-8 border-slate-200 text-slate-600 text-xs hover:bg-slate-50"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                    </Button>
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 text-xs font-mono leading-relaxed overflow-auto max-h-72 border border-slate-800">
{payload}
                  </pre>
                </div>

                {viewing.userAgent && (
                  <div className="mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">User agent</Label>
                    <p className="text-[10px] text-slate-500 font-mono mt-1 break-all leading-normal">{viewing.userAgent}</p>
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Field = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="space-y-0.5">
    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{label}</p>
    <p className={mono ? "text-[11px] font-mono font-semibold text-slate-700" : "text-xs font-semibold text-slate-800"}>{value}</p>
  </div>
);

export default AdminAudit;
