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

const ACTION_META: Record<string, { icon: typeof ScrollText; color: string; label: string }> = {
  impersonate:       { icon: Eye,         color: "#B8230C", label: "Impersonate" },
  impersonate_end:   { icon: Eye,         color: "#7A1500", label: "Impersonate ended" },
  suspend:           { icon: ShieldOff,   color: "#D4308E", label: "Suspend" },
  unsuspend:         { icon: ShieldCheck, color: "#0E8A4B", label: "Unsuspend" },
  change_plan:       { icon: Edit3,       color: "#FF6A1F", label: "Plan change" },
  refund:            { icon: CreditCard,  color: "#3C50E0", label: "Refund" },
  change_staff_role: { icon: Shield,      color: "#FFD23F", label: "Staff role change" },
  remove_staff:      { icon: UserMinus,   color: "#D4308E", label: "Staff removed" },
  invite_staff:     { icon: UserPlus,    color: "#0E8A4B", label: "Staff invited" },
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
    <div className="px-6 lg:px-10 py-6">
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#3C50E0] to-[#2533A8] text-white flex items-center justify-center shadow-md">
            <ScrollText className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-[26px] font-black tracking-tight">Audit log</h1>
            <p className="text-[12px] text-foreground/70 font-medium">
              {rows.length} entries · sorted newest first {isFetching && <Loader2 className="w-3 h-3 inline animate-spin ml-1" />}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters((v) => !v)}
          >
            <Filter className="w-3.5 h-3.5" /> Filters
          </Button>
          <Button variant="outline" onClick={handleDownload} disabled={rows.length === 0}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white border-2 border-[#E8B968] rounded-2xl p-4 mb-3 shadow-[0_3px_0_0_#E8B968] grid sm:grid-cols-4 gap-3 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="filter-action">Action</Label>
            <select
              id="filter-action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="h-10 px-3 rounded-xl border-2 border-[#E8B968] bg-white text-sm font-semibold w-full"
            >
              <option value="">All actions</option>
              {Object.entries(ACTION_META).map(([k, m]) => (
                <option key={k} value={k}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-since">From</Label>
            <Input id="filter-since" type="date" value={since} onChange={(e) => setSince(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-until">Until</Label>
            <Input id="filter-until" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
          </div>
          <Button variant="outline" onClick={clearFilters}>
            <X className="w-3.5 h-3.5" /> Clear
          </Button>
        </div>
      )}

      <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_4px_0_0_#E8B968]">
        <div className="grid grid-cols-[180px_1fr_1fr_1fr_120px_60px] gap-3 px-4 py-3 border-b-2 border-[#E8B968] bg-[#FFF1D6] text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A]">
          <div>Action</div>
          <div>Actor</div>
          <div>Target user</div>
          <div>Payload (preview)</div>
          <div>When</div>
          <div></div>
        </div>

        {isLoading && (
          <div className="px-4 py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#FF6A1F]" /></div>
        )}

        {!isLoading && rows.length === 0 && (
          <div className="px-4 py-16 text-center">
            <p className="text-[13px] font-extrabold">{action || since || until ? "No matches for those filters" : "No actions yet"}</p>
            <p className="text-[12px] text-foreground/60 mt-1">{action || since || until ? "Try clearing filters." : "Once admin actions happen, they'll appear here."}</p>
          </div>
        )}

        {rows.map((r) => {
          const meta = ACTION_META[r.action] ?? { icon: ScrollText, color: "#7A1500", label: r.action };
          const Icon = meta.icon;
          let payloadPreview = "";
          try { payloadPreview = r.payload ? JSON.stringify(JSON.parse(r.payload)) : ""; } catch { payloadPreview = r.payload ?? ""; }
          return (
            <div key={r.id} className="grid grid-cols-[180px_1fr_1fr_1fr_120px_60px] gap-3 px-4 py-3 border-b border-[#E8B968]/40 last:border-b-0 items-center hover:bg-[#FFF6E8] transition">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white" style={{ background: meta.color }}>
                  <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                </span>
                <span className="text-[11px] font-extrabold uppercase tracking-wider truncate">{meta.label}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-extrabold truncate">{r.actorName ?? "—"}</p>
                <p className="text-[10px] text-foreground/60 font-mono truncate">{r.actorEmail ?? r.actorUserId}</p>
              </div>
              <p className="text-[11px] font-mono text-foreground/70 truncate" title={r.targetUserId ?? ""}>{r.targetUserId ?? "—"}</p>
              <p className="text-[11px] font-mono text-foreground/60 truncate" title={payloadPreview}>{payloadPreview || "(empty)"}</p>
              <p className="text-[11px] text-foreground/60">{new Date(r.createdAt).toLocaleString("en-IN")}</p>
              <button
                onClick={() => setViewing(r)}
                className="w-8 h-8 rounded-lg hover:bg-[#FFE8C7] flex items-center justify-center text-foreground/60 hover:text-foreground transition justify-self-end"
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
        <DialogContent className="max-w-2xl">
          {viewing && (() => {
            const meta = ACTION_META[viewing.action] ?? { icon: ScrollText, color: "#7A1500", label: viewing.action };
            const Icon = meta.icon;
            const payload = prettyJson(viewing.payload);
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-11 h-11 rounded-xl text-white flex items-center justify-center shadow-md" style={{ background: meta.color }}>
                      <Icon className="w-5 h-5" strokeWidth={2.5} />
                    </div>
                    <div>
                      <DialogTitle>{meta.label}</DialogTitle>
                      <DialogDescription className="text-foreground/70 font-medium font-mono text-[11px]">
                        {viewing.id}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <dl className="grid grid-cols-2 gap-3 mt-2">
                  <Field label="When" value={new Date(viewing.createdAt).toLocaleString("en-IN")} />
                  <Field label="Actor" value={viewing.actorEmail ?? viewing.actorUserId} />
                  <Field label="Target user" value={viewing.targetUserId ?? "—"} mono />
                  <Field label="IP address" value={viewing.ipAddress ?? "—"} mono />
                </dl>

                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <Label>Full payload</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { navigator.clipboard.writeText(payload); toast.success("Payload copied"); }}
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </Button>
                  </div>
                  <pre className="p-3 rounded-xl bg-[#0F172A] text-[#FFD23F] text-[11px] font-mono leading-relaxed overflow-auto max-h-72 border-2 border-[#1E293B]">
{payload}
                  </pre>
                </div>

                {viewing.userAgent && (
                  <div className="mt-3">
                    <Label className="text-[10px]">User agent</Label>
                    <p className="text-[10px] text-foreground/60 font-mono mt-1 break-all">{viewing.userAgent}</p>
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
    <p className="text-[10px] uppercase tracking-wider text-[#B8651A] font-extrabold">{label}</p>
    <p className={mono ? "text-[11px] font-mono font-semibold" : "text-[12px] font-semibold"}>{value}</p>
  </div>
);

export default AdminAudit;
