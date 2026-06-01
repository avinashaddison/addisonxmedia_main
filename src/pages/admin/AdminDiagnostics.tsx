import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, ChatOwnershipRow, WebhookOrphanGroup, DuplicateAccountUser, InspectAccountReport } from "@/lib/admin-api";
import {
  Activity, ArrowRight, Building2, Check, Inbox, Loader2, MessageSquare, Phone,
  RefreshCw, Search, Shuffle, Users as UsersIcon, AlertTriangle, CheckCircle2,
  Radio, Trash2, ChevronDown, Copy, GitMerge, UserX, ScanSearch, Crown, Zap, X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleString("en-IN") : "—");

const AdminDiagnostics = () => {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [reassignOpen, setReassignOpen] = useState(false);
  const [fromRow, setFromRow] = useState<ChatOwnershipRow | null>(null);
  const [toUserId, setToUserId] = useState<string>("");
  const [includeMetaConfig, setIncludeMetaConfig] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimGroup, setClaimGroup] = useState<WebhookOrphanGroup | null>(null);
  const [claimUserId, setClaimUserId] = useState<string>("");
  const [expandedPhone, setExpandedPhone] = useState<string | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeGroup, setMergeGroup] = useState<DuplicateAccountUser[] | null>(null);
  const [canonicalId, setCanonicalId] = useState<string>("");
  const [inspectQuery, setInspectQuery] = useState("");
  const [inspectSubmitted, setInspectSubmitted] = useState<string | null>(null);
  const [consolidateOpen, setConsolidateOpen] = useState(false);
  const [consolidateReport, setConsolidateReport] = useState<InspectAccountReport | null>(null);
  const [consolidateTargetId, setConsolidateTargetId] = useState<string>("");
  const [consolidateDeleteSources, setConsolidateDeleteSources] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-chat-ownership"],
    queryFn: () => adminApi.chatOwnership(),
    refetchInterval: 60_000,
  });

  const { data: duplicates, refetch: refetchDuplicates } = useQuery({
    queryKey: ["admin-duplicate-accounts"],
    queryFn: () => adminApi.duplicateAccounts(),
    refetchInterval: 60_000,
  });

  const { data: orphans, isFetching: orphansFetching, refetch: refetchOrphans } = useQuery({
    queryKey: ["admin-webhook-orphans"],
    queryFn: () => adminApi.webhookOrphans({ sinceDays: 7, onlyUnclaimed: true }),
    refetchInterval: 60_000,
  });

  const ownership = data?.ownership ?? [];
  const metaConfigs = data?.metaConfigs ?? [];
  const orphanGroups = orphans?.groups ?? [];
  const orphanRecent = orphans?.recent ?? [];
  const filtered = useMemo(() => {
    if (!q) return ownership;
    const needle = q.toLowerCase();
    return ownership.filter(
      (r) => r.email.toLowerCase().includes(needle) || r.name.toLowerCase().includes(needle) || r.userId.includes(needle)
    );
  }, [q, ownership]);

  const totals = useMemo(() => {
    return ownership.reduce(
      (acc, r) => ({
        conversations: acc.conversations + r.conversations,
        contacts: acc.contacts + r.contacts,
        messages: acc.messages + r.messages,
      }),
      { conversations: 0, contacts: 0, messages: 0 }
    );
  }, [ownership]);

  const openReassign = (row: ChatOwnershipRow) => {
    setFromRow(row);
    setToUserId("");
    setIncludeMetaConfig(true);
    setReassignOpen(true);
  };

  const { data: inspect, isFetching: inspectFetching } = useQuery({
    queryKey: ["admin-inspect", inspectSubmitted],
    queryFn: () => adminApi.inspectAccount(inspectSubmitted!),
    enabled: !!inspectSubmitted,
  });

  const runInspect = () => {
    const v = inspectQuery.trim();
    if (!v) return;
    setInspectSubmitted(v);
  };

  const openConsolidate = (report: InspectAccountReport) => {
    setConsolidateReport(report);
    setConsolidateTargetId(report.suggestion?.canonicalUserId ?? report.users[0]?.id ?? "");
    setConsolidateDeleteSources(false);
    setConsolidateOpen(true);
  };

  const doConsolidate = async () => {
    if (!consolidateReport || !consolidateTargetId) return;
    const sourceUserIds = consolidateReport.users
      .map((u) => u.id)
      .filter((id) => id !== consolidateTargetId);
    if (sourceUserIds.length === 0) {
      toast.error("Target must differ from sources");
      return;
    }
    setSubmitting(true);
    try {
      const res = await adminApi.consolidateAccounts({
        targetUserId: consolidateTargetId,
        sourceUserIds,
        deleteSources: consolidateDeleteSources,
      });
      const m = res.summary.moved;
      toast.success(
        `Consolidated · moved ${m.conversations} chats, ${m.contacts} contacts, ${m.messages} messages${res.summary.deletedUsers ? `, deleted ${res.summary.deletedUsers} source user(s)` : ""}`
      );
      setConsolidateOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-inspect", inspectSubmitted] });
      qc.invalidateQueries({ queryKey: ["admin-chat-ownership"] });
      qc.invalidateQueries({ queryKey: ["admin-duplicate-accounts"] });
      qc.invalidateQueries({ queryKey: ["admin-metrics"] });
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const openMerge = (group: DuplicateAccountUser[]) => {
    const best = [...group].sort((a, b) =>
      (b.conversations + b.contacts + b.messages + b.metaConfigs) -
      (a.conversations + a.contacts + a.messages + a.metaConfigs)
    )[0];
    setMergeGroup(group);
    setCanonicalId(best.id);
    setMergeOpen(true);
  };

  const doMerge = async () => {
    if (!mergeGroup || !canonicalId) return;
    const sourceUserIds = mergeGroup.map((u) => u.id).filter((id) => id !== canonicalId);
    if (sourceUserIds.length === 0) return;
    setSubmitting(true);
    try {
      const res = await adminApi.consolidateAccounts({
        targetUserId: canonicalId,
        sourceUserIds,
        deleteSources: true, // Merging always cleans up source accounts
      });
      const m = res.summary.moved;
      toast.success(
        `Merged successfully · consolidated ${m.conversations} chats, ${m.contacts} contacts, ${m.messages} messages`
      );
      setMergeOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-chat-ownership"] });
      qc.invalidateQueries({ queryKey: ["admin-duplicate-accounts"] });
      qc.invalidateQueries({ queryKey: ["admin-metrics"] });
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const openClaim = (group: WebhookOrphanGroup) => {
    setClaimGroup(group);
    setClaimUserId("");
    setClaimOpen(true);
  };

  const doClaim = async () => {
    if (!claimGroup || !claimUserId) return;
    setSubmitting(true);
    try {
      await adminApi.claimOrphans({
        phoneNumberId: claimGroup.phoneNumberId,
        userId: claimUserId,
      });
      toast.success(`Claimed all unrouted chats to user`);
      setClaimOpen(false);
      refetchOrphans();
      qc.invalidateQueries({ queryKey: ["admin-chat-ownership"] });
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const doClearOrphans = async (phoneNumberId?: string) => {
    try {
      await adminApi.clearOrphans({ phoneNumberId });
      toast.success("Webhook orphan logs cleared");
      refetchOrphans();
    } catch (e) {
      toast.error(String(e));
    }
  };

  const doReassign = async () => {
    if (!fromRow || !toUserId) return;
    setSubmitting(true);
    try {
      await adminApi.consolidateAccounts({
        targetUserId: toUserId,
        sourceUserIds: [fromRow.userId],
        deleteSources: false, // Keep source account, just shift the records
        moveMetaConfig: includeMetaConfig,
      });
      toast.success(`Chats reassigned successfully`);
      setReassignOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-chat-ownership"] });
      qc.invalidateQueries({ queryKey: ["admin-metrics"] });
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3.5 border-b border-slate-200/85 pb-5 flex-wrap">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex items-center justify-center shadow-sm">
          <Activity className="w-5.5 h-5.5 text-indigo-400" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[24px] font-black tracking-tight text-slate-900">Chat Ownership</h1>
          <p className="text-[12px] text-slate-500 font-medium">
            Who owns which conversations · where are inbound WhatsApp messages being routed
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="border-slate-250 active:scale-[0.98] transition">
          <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isFetching && "animate-spin")} /> Refresh
        </Button>
      </div>

      {/* Totals strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <TotalCard label="Total chats" value={totals.conversations} icon={Inbox} color="emerald" />
        <TotalCard label="Total contacts" value={totals.contacts} icon={UsersIcon} color="indigo" />
        <TotalCard label="Total messages" value={totals.messages} icon={MessageSquare} color="magenta" />
        <TotalCard label="Workspaces with data" value={ownership.length} icon={Building2} color="orange" />
      </div>

      {/* Deep inspector */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex-wrap">
          <ScanSearch className="w-4.5 h-4.5 text-indigo-600" />
          <p className="text-[13px] font-bold text-slate-800 flex-1 min-w-0">Inspect account · see exactly what the DB knows</p>
        </div>
        <div className="px-5 py-3.5 flex items-center gap-2.5 flex-wrap">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              value={inspectQuery}
              onChange={(e) => setInspectQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runInspect()}
              placeholder="email substring · user.id · phone_number_id · display number"
              className="pl-9 h-10 font-mono text-[12px] border-slate-200 focus-visible:ring-indigo-600"
            />
          </div>
          <Button onClick={runInspect} disabled={!inspectQuery.trim() || inspectFetching} className="bg-slate-900 text-white hover:bg-slate-800 transition active:scale-[0.98]">
            {inspectFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <ScanSearch className="w-3.5 h-3.5 mr-1.5" />} Inspect
          </Button>
        </div>
        {inspect && (
          <div className="border-t border-slate-200 px-5 py-4 bg-slate-50/30 space-y-3">
            {inspect.users.length === 0 ? (
              <p className="text-[12px] font-semibold text-slate-400 italic py-6 text-center">
                No matches for "{inspect.query}"
              </p>
            ) : (
              <>
                <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                  <p className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                    Matched {inspect.users.length} user{inspect.users.length === 1 ? "" : "s"} · {inspect.metaConfigs.length} meta_config row{inspect.metaConfigs.length === 1 ? "" : "s"} · {inspect.conversations.length} conversation{inspect.conversations.length === 1 ? "" : "s"}
                  </p>
                  {inspect.users.length > 1 && inspect.suggestion && (
                    <Button
                      onClick={() => openConsolidate(inspect)}
                      className="ml-auto h-8 bg-rose-600 hover:bg-rose-700 text-white active:scale-[0.98] text-[11px] transition-all"
                    >
                      <GitMerge className="w-3.5 h-3.5 mr-1" /> Consolidate accounts
                    </Button>
                  )}
                </div>

                {/* Users grid */}
                <div className="space-y-2 mb-3">
                  {inspect.users.map((u) => (
                    <div
                      key={u.id}
                      className={cn(
                        "grid grid-cols-[1.4fr_80px_80px_80px_80px_120px] gap-2.5 items-center px-4 py-2.5 rounded-xl border transition",
                        u.matchedDirectly ? "bg-white border-slate-200 shadow-sm" : "bg-amber-50/50 border-amber-205 text-amber-900"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-slate-800 truncate flex items-center gap-1.5">
                          {u.name}
                          {u.plan && (
                            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-650">
                              {u.plan}
                            </span>
                          )}
                          {!u.matchedDirectly && (
                            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                              via meta_config
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] font-mono text-slate-450 truncate">{u.email}</p>
                        <p className="text-[9px] font-mono text-slate-400 truncate">{u.id}</p>
                      </div>
                      <span className="text-[12px] font-bold text-emerald-600 tabular-nums">{u.conversations}<span className="text-[8px] uppercase ml-0.5 font-bold opacity-60">chat</span></span>
                      <span className="text-[12px] font-medium text-slate-700 tabular-nums">{u.contacts}<span className="text-[8px] uppercase ml-0.5 font-bold opacity-60">cont</span></span>
                      <span className="text-[12px] font-medium text-slate-700 tabular-nums">{u.messages}<span className="text-[8px] uppercase ml-0.5 font-bold opacity-60">msg</span></span>
                      <span className="text-[10px] font-bold">
                        {u.hasMetaConfig ? (
                          <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">✓ Meta</span>
                        ) : (
                          <span className="text-slate-400">— Meta</span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-450 font-medium">{fmtDate(u.createdAt)}</span>
                    </div>
                  ))}
                </div>

                {/* Meta config detail */}
                {inspect.metaConfigs.length > 0 && (
                  <div className="rounded-xl bg-emerald-50/40 border border-emerald-150 p-3 mb-3">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-705 mb-2">Meta configs</p>
                    <div className="space-y-1.5">
                      {inspect.metaConfigs.map((m) => (
                        <div key={m.id} className="grid grid-cols-[1fr_140px_180px_80px] gap-2 items-center text-[11px] py-1 border-b border-emerald-100 last:border-b-0">
                          <span className="font-bold text-slate-750 truncate">{m.userEmail || m.userId}</span>
                          <span className="font-mono text-slate-600">{m.displayPhoneNumber || "—"}</span>
                          <span className="font-mono text-slate-400 text-[9px]">{m.phoneNumberId}</span>
                          <span className={cn("inline-flex w-fit text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border", m.enabled ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200")}>
                            {m.enabled ? "live" : "off"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent conversations preview */}
                {inspect.conversations.length > 0 && (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-450 mb-2">
                      Recent conversations (first {inspect.conversations.length})
                    </p>
                    <div className="space-y-1.5">
                      {inspect.conversations.slice(0, 8).map((c) => (
                        <div key={c.id} className="grid grid-cols-[1fr_120px_80px_100px] gap-2 items-center text-[11px] py-1 border-b border-slate-100 last:border-b-0">
                          <span className="font-bold text-slate-750 truncate">{c.contactName ?? "(no name)"}</span>
                          <span className="font-mono text-slate-500 truncate">{c.contactPhone ?? "—"}</span>
                          <span className="text-[10px] text-slate-450 uppercase">{c.status}</span>
                          <span className="font-mono text-slate-400 text-[9px] truncate">{c.ownerId.slice(0, 12)}…</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Duplicate accounts */}
      {duplicates && duplicates.groups.length > 0 && (
        <div className="bg-white border border-slate-205 rounded-2xl shadow-sm mb-4 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex-wrap">
            <UserX className="w-4.5 h-4.5 text-rose-500" />
            <p className="text-[13px] font-bold text-slate-800 flex-1 min-w-0">
              Duplicate accounts · same email on multiple user rows
              <span className="ml-2.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider">
                {duplicates.groups.length} {duplicates.groups.length === 1 ? "group" : "groups"}
              </span>
            </p>
            <Button variant="outline" className="h-8 border-slate-250" onClick={() => refetchDuplicates()}>
              <RefreshCw className="w-3 h-3 mr-1" /> Reload
            </Button>
          </div>
          <p className="text-[11px] text-slate-450 font-medium px-5 pt-3">
            Most likely cause of "I don't see my chats". Sessions land on one row, data lives on the other. Merge consolidates everything onto a canonical user and deletes the rest.
          </p>
          <div className="divide-y divide-slate-100">
            {duplicates.groups.map((g) => (
              <div key={g.emailNorm} className="px-5 py-3.5 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[12px] font-bold font-mono text-rose-700">{g.emailNorm}</p>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-205">
                    {g.users.length} accounts
                  </span>
                  <div className="ml-auto">
                    <Button
                      className="h-8 bg-rose-650 hover:bg-rose-700 text-white active:scale-[0.98]"
                      onClick={() => openMerge(g.users)}
                    >
                      <GitMerge className="w-3.5 h-3.5 mr-1" /> Merge accounts
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  {g.users.map((u) => (
                    <div
                      key={u.id}
                      className="grid grid-cols-[1.4fr_90px_70px_70px_70px_70px_140px] gap-2.5 items-center px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-150 hover:border-slate-250 transition"
                    >
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-slate-800 truncate">{u.name}</p>
                        <p className="text-[10px] font-mono text-slate-400 truncate">{u.id.slice(0, 12)}…</p>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border">{u.plan ?? "—"}</span>
                      <span className="text-[10px] font-bold text-emerald-600 tabular-nums">{u.conversations} chats</span>
                      <span className="text-[10px] font-medium text-slate-600 tabular-nums">{u.contacts} cont.</span>
                      <span className="text-[10px] font-medium text-slate-600 tabular-nums">{u.messages} msg</span>
                      <span className="text-[10px] font-bold text-slate-600 tabular-nums">{u.metaConfigs > 0 ? "✓ Meta" : "— Meta"}</span>
                      <span className="text-[10px] text-slate-400 font-medium">created {fmtDate(u.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unrouted webhooks (orphans) */}
      <div className={cn(
        "bg-white border rounded-2xl mb-4 overflow-hidden shadow-sm hover:border-slate-350 transition-colors",
        orphanGroups.length > 0 ? "border-orange-500/80" : "border-slate-200/80"
      )}>
        <div className={cn(
          "flex items-center gap-2.5 px-5 py-3.5 border-b flex-wrap",
          orphanGroups.length > 0 ? "bg-orange-50/20 border-orange-200" : "bg-slate-50 border-slate-200"
        )}>
          <Radio className={cn("w-4.5 h-4.5", orphanGroups.length > 0 ? "text-orange-500 animate-pulse" : "text-slate-400")} />
          <p className="text-[13px] font-bold text-slate-850 flex-1 min-w-0">
            Unrouted webhooks · WhatsApp messages with no destination account
            {orphans?.unclaimed24h ? (
              <span className="ml-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider">
                {orphans.unclaimed24h} in 24h
              </span>
            ) : null}
          </p>
          <Button variant="outline" className="h-8 border-slate-250" onClick={() => refetchOrphans()} disabled={orphansFetching}>
            <RefreshCw className={cn("w-3 h-3 mr-1", orphansFetching && "animate-spin")} /> Reload
          </Button>
          {orphanGroups.length > 0 && (
            <Button variant="ghost" className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => doClearOrphans()}>
              <Trash2 className="w-3 h-3 mr-1" /> Clear all
            </Button>
          )}
        </div>

        {orphanGroups.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-600 mb-2" />
            <p className="text-[13px] font-bold text-slate-800">No unrouted webhooks — every inbound message is landing in an account</p>
            <p className="text-[11px] text-slate-400 mt-1">If a customer reports missing chats, the issue is account-mismatch, not delivery.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orphanGroups.map((g) => {
              const expanded = expandedPhone === g.phoneNumberId;
              const sampleEvents = orphanRecent.filter((e) => e.phoneNumberId === g.phoneNumberId).slice(0, 5);
              return (
                <div key={g.phoneNumberId} className="transition">
                  <div className="grid grid-cols-[1fr_140px_180px_120px_220px] gap-3 px-5 py-3.5 items-center hover:bg-slate-50/50">
                    <button
                      onClick={() => setExpandedPhone(expanded ? null : g.phoneNumberId)}
                      className="flex items-center gap-2 min-w-0 text-left"
                    >
                      <ChevronDown className={cn("w-3.5 h-3.5 flex-shrink-0 text-slate-400 transition-transform", expanded && "rotate-180")} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-slate-800 truncate flex items-center gap-1.5">
                          {g.displayPhoneNumber || "(unknown number)"}
                          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-205">
                            unrouted
                          </span>
                        </p>
                        <p className="text-[10px] font-mono text-slate-400 truncate">{g.phoneNumberId}</p>
                      </div>
                    </button>
                    <span className="text-[14px] font-black tabular-nums text-orange-605">{g.total}</span>
                    <p className="text-[11px] text-slate-450 font-medium">last {fmtDate(g.lastAt)}</p>
                    <Button variant="outline" className="h-8 border-slate-250 active:scale-[0.98]" onClick={() => openClaim(g)}>
                      <Check className="w-3 h-3 mr-1" /> Claim to user
                    </Button>
                    <Button variant="ghost" className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 justify-self-start" onClick={() => doClearOrphans(g.phoneNumberId)}>
                      <Trash2 className="w-3 h-3 mr-1" /> Delete events
                    </Button>
                  </div>
                  {expanded && (
                    <div className="bg-slate-50 px-5 pb-4 pt-2 border-y border-slate-100">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-450 mb-2">Recent events</p>
                      {sampleEvents.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">No sample events in cache (open the panel sooner after they arrive).</p>
                      ) : (
                        <div className="space-y-1.5">
                          {sampleEvents.map((e) => (
                            <div key={e.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-[11px] font-bold text-slate-800 truncate">{e.fromName || "(unknown sender)"}</p>
                                <p className="text-[10px] font-mono text-slate-400">{e.fromPhone || "—"}</p>
                                <p className="text-[10px] text-slate-400 ml-auto">{fmtDate(e.createdAt)}</p>
                              </div>
                              {e.messagePreview && (
                                <p className="text-[11px] text-slate-600 italic truncate" title={e.messagePreview}>
                                  "{e.messagePreview}"
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Meta config routing panel */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
          <Phone className="w-4.5 h-4.5 text-indigo-600" />
          <p className="text-[13px] font-bold text-slate-805">WhatsApp routing · which account receives inbound messages</p>
        </div>
        {isLoading ? (
          <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-650" /></div>
        ) : metaConfigs.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <AlertTriangle className="w-6 h-6 mx-auto text-amber-500" />
            <p className="text-[13px] font-bold text-slate-700">No Meta WhatsApp configurations found</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">No account has connected the WhatsApp Business API yet — inbound chats can't arrive.</p>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_140px_180px_100px_140px] gap-3 px-5 py-3 border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <div>Routes to (account)</div>
            <div>Display number</div>
            <div>Phone Number ID</div>
            <div>Enabled</div>
            <div>Last verified</div>
          </div>
        )}
        {metaConfigs.map((m) => (
          <div key={m.id} className="grid grid-cols-[1fr_140px_180px_100px_140px] gap-3 px-5 py-3 border-b border-slate-100 last:border-b-0 items-center hover:bg-slate-50/30 transition">
            <div className="min-w-0">
              <p className="text-[12px] font-bold text-slate-800 truncate">{m.name || "—"}</p>
              <p className="text-[10px] text-slate-450 font-mono truncate">{m.email || m.userId}</p>
            </div>
            <p className="text-[11px] font-mono font-semibold text-slate-650 truncate">{m.displayPhoneNumber || "—"}</p>
            <p className="text-[10px] font-mono text-slate-400 truncate">{m.phoneNumberId}</p>
            <span className={cn(
              "inline-flex w-fit px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
              m.enabled
                ? "bg-emerald-50 text-emerald-700 border-emerald-150"
                : "bg-amber-50 text-amber-700 border-amber-150"
            )}>
              {m.enabled ? "Live" : "Pending"}
            </span>
            <p className="text-[10px] text-slate-400 font-medium">{fmtDate(m.lastVerifiedAt)}</p>
          </div>
        ))}
      </div>

      {/* Ownership table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex-wrap">
          <Inbox className="w-4.5 h-4.5 text-indigo-600" />
          <p className="text-[13px] font-bold text-slate-800 flex-1 min-w-0">Per-account ownership</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-450" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email / name / user id…" className="pl-9 h-9 w-72 border-slate-200 focus-visible:ring-indigo-600 text-[12px]" />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-650" /></div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-slate-405" strokeWidth={2.2} />
            </div>
            <p className="text-[14px] font-bold text-slate-850">{q ? "No matches" : "No chat data anywhere yet"}</p>
            <p className="text-[12px] text-slate-400 mt-1 max-w-md mx-auto">
              {q ? "Try a different search." : "When the first WhatsApp message arrives, the owning account shows up here."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1.6fr_90px_100px_100px_120px] gap-3 px-5 py-3 border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <div>Account</div>
              <div>Chats</div>
              <div>Contacts</div>
              <div>Messages</div>
              <div></div>
            </div>
            {filtered.map((r) => (
              <div key={r.userId} className="grid grid-cols-[1.6fr_90px_100px_100px_120px] gap-3 px-5 py-3 border-b border-slate-100 last:border-b-0 items-center hover:bg-slate-50/50 transition">
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-slate-805 truncate flex items-center gap-1.5">
                    {r.name}
                    {r.plan && (
                      <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {r.plan}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono truncate">{r.email}</p>
                </div>
                <span className="text-[14px] font-black tabular-nums text-emerald-600">{r.conversations}</span>
                <span className="text-[13px] font-semibold tabular-nums text-slate-700">{r.contacts}</span>
                <span className="text-[13px] font-semibold tabular-nums text-slate-700">{r.messages}</span>
                <Button
                  variant="outline"
                  className="h-8 px-2.5 text-[11px] border-slate-250 active:scale-[0.98] transition"
                  onClick={() => openReassign(r)}
                  disabled={r.conversations === 0 && r.contacts === 0 && r.messages === 0}
                >
                  <Shuffle className="w-3 h-3 mr-1" /> Reassign
                </Button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Consolidate dialog */}
      <Dialog open={consolidateOpen} onOpenChange={setConsolidateOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex items-center justify-center shadow-sm">
                <GitMerge className="w-5 h-5 text-indigo-400" strokeWidth={2.2} />
              </div>
              <div>
                <DialogTitle>Consolidate accounts</DialogTitle>
                <DialogDescription>
                  Pick the target user — all data owned by the others gets moved here.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {consolidateReport && (
            <div className="space-y-3 mt-2">
              <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Target (the one to keep)</p>
              <div className="space-y-1.5">
                {consolidateReport.users.map((u) => {
                  const isTarget = consolidateTargetId === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => setConsolidateTargetId(u.id)}
                      className={cn(
                        "w-full text-left p-3.5 rounded-xl border transition-all",
                        isTarget
                          ? "border-emerald-500 bg-emerald-50/50 ring-4 ring-emerald-100 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-350 hover:-translate-y-0.5"
                      )}
                    >
                      <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-slate-800 truncate flex items-center gap-2 flex-wrap">
                            {u.name}
                            {isTarget && (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-600 text-white">
                                Target
                              </span>
                            )}
                            {u.plan && (
                              <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                {u.plan}
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] font-mono text-slate-450 truncate">{u.email}</p>
                          <p className="text-[9px] font-mono text-slate-400 truncate">{u.id}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-emerald-600 tabular-nums">{u.conversations} chats</p>
                          <p className="text-[9px] text-slate-450 font-medium tabular-nums">{u.contacts}c · {u.messages}m</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <label className="flex items-start gap-2.5 p-3.5 rounded-xl border border-slate-205 bg-slate-50/50 cursor-pointer transition hover:bg-slate-50">
                <Checkbox
                  checked={consolidateDeleteSources}
                  onCheckedChange={(v) => setConsolidateDeleteSources(Boolean(v))}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-[12px] font-bold text-slate-800 leading-tight">Delete source user rows after move</p>
                  <p className="text-[11px] text-slate-450 font-medium mt-0.5 leading-normal">
                    Only check if you're certain — cascades BetterAuth account/session. Leave unchecked to keep source rows around (data already moved; they'll just be empty husks).
                  </p>
                </div>
              </label>

              <div className="flex items-start gap-2 text-[11px] text-rose-700 font-medium p-3 rounded-xl bg-rose-50 border border-rose-150">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-rose-500" />
                <span>Single transaction. All chats, contacts, messages, deals, tasks, campaigns, broadcasts, upgrade requests, meta_config + profile move to the target. Cannot be auto-undone.</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConsolidateOpen(false)} className="border-slate-250">Cancel</Button>
            <Button
              onClick={doConsolidate}
              disabled={submitting || !consolidateTargetId}
              className="bg-rose-600 hover:bg-rose-700 text-white active:scale-[0.98] transition"
            >
              {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Consolidating…</> : <><GitMerge className="w-3.5 h-3.5 mr-1" /> Move {(consolidateReport?.users.length ?? 1) - 1} → target</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge accounts dialog */}
      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex items-center justify-center shadow-sm">
                <GitMerge className="w-5 h-5 text-indigo-400" strokeWidth={2.2} />
              </div>
              <div>
                <DialogTitle>Merge duplicate accounts</DialogTitle>
                <DialogDescription>
                  Pick the canonical user — all chats, contacts, messages, deals, tasks, broadcasts, Meta config, and profile from the others get moved here. Duplicate user rows are then deleted.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {mergeGroup && (
            <div className="space-y-3 mt-2">
              <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Choose canonical (the one to keep)</p>
              <div className="space-y-1.5">
                {mergeGroup.map((u) => {
                  const isCanon = canonicalId === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => setCanonicalId(u.id)}
                      className={cn(
                        "w-full text-left p-3.5 rounded-xl border transition-all",
                        isCanon
                          ? "border-emerald-500 bg-emerald-50/50 ring-4 ring-emerald-100 shadow-sm"
                          : "border-slate-205 bg-white hover:border-slate-350 hover:-translate-y-0.5"
                      )}
                    >
                      <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-slate-800 truncate flex items-center gap-2">
                            {u.name}
                            {isCanon && (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-600 text-white">
                                Canonical
                              </span>
                            )}
                            {u.plan && (
                              <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                {u.plan}
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] font-mono text-slate-450 truncate">{u.id}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-emerald-600 tabular-nums">{u.conversations} chats</p>
                          <p className="text-[9px] text-slate-450 font-medium tabular-nums">{u.contacts}c · {u.messages}m</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl bg-rose-50 border border-rose-150 p-3.5 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] font-medium text-rose-800 leading-relaxed">
                  <strong className="font-bold">This is destructive.</strong> The non-canonical user rows will be deleted (cascades BetterAuth account+session). All owned data is transferred first in a single transaction — but the deleted users can't log in again afterwards. Make sure the canonical email/password works.
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeOpen(false)} className="border-slate-250">Cancel</Button>
            <Button
              onClick={doMerge}
              disabled={submitting || !canonicalId}
              className="bg-rose-600 hover:bg-rose-700 text-white active:scale-[0.98] transition"
            >
              {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Merging…</> : <><GitMerge className="w-3.5 h-3.5 mr-1" /> Merge {(mergeGroup?.length ?? 1) - 1} into 1</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Claim orphan dialog */}
      <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex items-center justify-center shadow-sm">
                <Radio className="w-5 h-5 text-indigo-400" strokeWidth={2.2} />
              </div>
              <div>
                <DialogTitle>Claim orphan messages</DialogTitle>
                <DialogDescription>
                  Tags these events to a user account so admin reporting shows resolution. Note: doesn't replay the messages — the user still needs to connect Meta to receive future inbound.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {claimGroup && (
            <div className="space-y-3 mt-2">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Phone</p>
                <p className="text-[13px] font-black text-slate-800">{claimGroup.displayPhoneNumber || "(unknown)"}</p>
                <p className="text-[11px] font-mono text-slate-450">{claimGroup.phoneNumberId}</p>
                <p className="text-[11px] font-bold text-orange-600 mt-1">{claimGroup.total} unrouted event(s)</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Claim to user</Label>
                <TargetPicker excludeUserId="" value={claimUserId} onChange={setClaimUserId} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setClaimOpen(false)} className="border-slate-250">Cancel</Button>
            <Button
              onClick={doClaim}
              disabled={submitting || !claimUserId}
              className="bg-slate-900 hover:bg-slate-800 text-white active:scale-[0.98] transition"
            >
              {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Claiming…</> : <><Check className="w-3.5 h-3.5 mr-1" /> Claim {claimGroup?.total ?? 0}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign dialog */}
      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex items-center justify-center shadow-sm">
                <Shuffle className="w-5 h-5 text-indigo-400" strokeWidth={2.2} />
              </div>
              <div>
                <DialogTitle>Reassign chats</DialogTitle>
                <DialogDescription>
                  Moves all conversations, contacts, and messages from one account to another. Logged in audit.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {fromRow && (
            <div className="space-y-3 mt-2">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">From</p>
                    <p className="text-[13px] font-black text-slate-800 truncate">{fromRow.name}</p>
                    <p className="text-[11px] font-mono text-slate-500 truncate">{fromRow.email}</p>
                    <p className="text-[10px] font-bold text-emerald-600 mt-1.5">
                      {fromRow.conversations} chats · {fromRow.contacts} contacts · {fromRow.messages} messages
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">To</p>
                    <TargetPicker
                      excludeUserId={fromRow.userId}
                      value={toUserId}
                      onChange={setToUserId}
                    />
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-2.5 p-3.5 rounded-xl border border-slate-205 hover:bg-slate-50 cursor-pointer transition">
                <Checkbox
                  checked={includeMetaConfig}
                  onCheckedChange={(v) => setIncludeMetaConfig(Boolean(v))}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-[12px] font-bold text-slate-800 leading-tight">Also move WhatsApp routing (meta_config)</p>
                  <p className="text-[11px] text-slate-450 font-medium mt-0.5 leading-normal">
                    Future inbound chats will go to the destination account too. If the target already has a meta_config row, the source row is deleted.
                  </p>
                </div>
              </label>

              <div className="flex items-start gap-2 text-[11px] text-rose-700 font-medium p-3 rounded-xl bg-rose-50 border border-rose-150">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-rose-500" />
                <span>This is a hard move — the source account will lose access to these records. Cannot be auto-undone (but audit log captures the reverse mapping).</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignOpen(false)} className="border-slate-250">Cancel</Button>
            <Button
              onClick={doReassign}
              disabled={submitting || !toUserId}
              className="bg-rose-600 hover:bg-rose-700 text-white active:scale-[0.98] transition"
            >
              {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Moving…</> : <><Check className="w-3.5 h-3.5 mr-1" /> Reassign</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const TotalCard = ({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof Inbox; color: string }) => {
  const styles: Record<string, { iconClass: string }> = {
    indigo:  { iconClass: "bg-indigo-55 border-indigo-100 text-indigo-600" },
    emerald: { iconClass: "bg-emerald-55 border-emerald-100 text-emerald-600" },
    magenta: { iconClass: "bg-pink-55 border-pink-100 text-pink-605" },
    orange:  { iconClass: "bg-orange-55 border-orange-100 text-orange-600" },
  };
  const s = styles[color] ?? styles.indigo;
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:border-slate-350 hover:shadow-md transition-all duration-200">
      <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center shadow-sm flex-shrink-0", s.iconClass)}>
        <Icon className="w-4.5 h-4.5" strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold truncate">{label}</p>
        <p className="text-xl font-black text-slate-850 tabular-nums leading-tight">{value.toLocaleString("en-IN")}</p>
      </div>
    </div>
  );
};

const TargetPicker = ({
  excludeUserId, value, onChange,
}: { excludeUserId: string; value: string; onChange: (id: string) => void }) => {
  const [q, setQ] = useState("");
  const { data: workspaces = [] } = useQuery({
    queryKey: ["admin-workspaces", q || "all", "all"],
    queryFn: () => adminApi.workspaces({ q: q || undefined, includeStaff: true }),
  });
  const filtered = workspaces.filter((w) => w.id !== excludeUserId);
  const selected = workspaces.find((w) => w.id === value);
  return (
    <div className="space-y-1.5">
      {selected ? (
        <div className="flex items-center justify-between gap-2 bg-white border border-emerald-550 rounded-xl px-3 py-2 shadow-sm">
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-slate-800 truncate">{selected.name}</p>
            <p className="text-[10px] font-mono text-slate-400 truncate">{selected.email}</p>
          </div>
          <button onClick={() => onChange("")} className="text-[10px] uppercase font-bold text-rose-600 hover:underline">change</button>
        </div>
      ) : (
        <>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by email…"
            className="h-9 text-[12px] border-slate-205 focus-visible:ring-indigo-650"
            autoFocus
          />
          {filtered.length > 0 && (
            <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm mt-1">
              {filtered.slice(0, 8).map((w) => (
                <button
                  key={w.id}
                  onClick={() => { onChange(w.id); setQ(""); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 transition border-b border-slate-100 last:border-b-0"
                >
                  <p className="text-[12px] font-bold text-slate-800 truncate">{w.name}</p>
                  <p className="text-[10px] font-mono text-slate-400 truncate">{w.email}</p>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDiagnostics;
