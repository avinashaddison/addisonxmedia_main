import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, ChatOwnershipRow, WebhookOrphanGroup, DuplicateAccountUser, InspectAccountReport } from "@/lib/admin-api";
import {
  Activity, ArrowRight, Building2, Check, Inbox, Loader2, MessageSquare, Phone,
  RefreshCw, Search, Shuffle, Users as UsersIcon, AlertTriangle, CheckCircle2,
  Radio, Trash2, ChevronDown, Copy, GitMerge, UserX, ScanSearch, Crown, Zap, X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/PageShell";

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
    <PageShell
      title="Chat Ownership & Routing"
      subtitle="Who owns which conversations · inbound WhatsApp routing & diagnostic controls"
      icon={<Activity className="w-5 h-5 text-white" strokeWidth={2.5} />}
      actions={
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="px-4 py-2 rounded-xl text-[12px] font-extrabold bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] text-slate-700 hover:bg-[#FFF1D6] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] transition-all flex items-center gap-1.5"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} /> Refresh
        </button>
      }
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Totals strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <TotalCard label="Total chats" value={totals.conversations} icon={Inbox} color="emerald" />
          <TotalCard label="Total contacts" value={totals.contacts} icon={UsersIcon} color="indigo" />
          <TotalCard label="Total messages" value={totals.messages} icon={MessageSquare} color="magenta" />
          <TotalCard label="Workspaces with data" value={ownership.length} icon={Building2} color="orange" />
        </div>

        {/* Deep inspector */}
        <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_4px_0_0_#E8B968] overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 bg-[#FFF6E8] border-b-2 border-[#E8B968] flex-wrap">
            <ScanSearch className="w-4.5 h-4.5 text-[#B8651A]" strokeWidth={2.5} />
            <p className="text-[13px] font-black text-slate-800 flex-1 min-w-0">Inspect account · see exactly what the DB knows</p>
          </div>
          <div className="px-5 py-4 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                value={inspectQuery}
                onChange={(e) => setInspectQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runInspect()}
                placeholder="email substring · user.id · phone_number_id · display number"
                className="pl-9 h-10 font-mono text-[12px] border-2 border-[#E8B968] focus:border-[#0E8A4B] rounded-xl bg-white text-slate-800 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <button
              onClick={runInspect}
              disabled={!inspectQuery.trim() || inspectFetching}
              className="h-10 px-4 rounded-xl text-[12px] font-extrabold bg-slate-900 border-2 border-slate-950 text-white hover:bg-slate-800 active:translate-y-0.5 active:shadow-[0_1px_0_0_#000] shadow-[0_2px_0_0_#000] transition-all flex items-center gap-1.5"
            >
              {inspectFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanSearch className="w-3.5 h-3.5" />} Inspect
            </button>
          </div>
          {inspect && (
            <div className="border-t-2 border-[#E8B968] px-5 py-5 bg-[#FFF6E8]/20 space-y-4">
              {inspect.users.length === 0 ? (
                <p className="text-[12px] font-bold text-slate-400 italic py-6 text-center">
                  No matches for "{inspect.query}"
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#B8651A]">
                      Matched {inspect.users.length} user{inspect.users.length === 1 ? "" : "s"} · {inspect.metaConfigs.length} meta_config row{inspect.metaConfigs.length === 1 ? "" : "s"} · {inspect.conversations.length} conversation{inspect.conversations.length === 1 ? "" : "s"}
                    </p>
                    {inspect.users.length > 1 && inspect.suggestion && (
                      <button
                        onClick={() => openConsolidate(inspect)}
                        className="ml-auto px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-[#D4308E] border-2 border-[#A11A6A] shadow-[0_2px_0_0_#5E0B3B] text-white hover:bg-[#A11A6A] active:translate-y-0.5 active:shadow-[0_1px_0_0_#5E0B3B] transition-all flex items-center gap-1"
                      >
                        <GitMerge className="w-3.5 h-3.5" /> Consolidate accounts
                      </button>
                    )}
                  </div>

                  {/* Users grid */}
                  <div className="space-y-3">
                    {inspect.users.map((u) => (
                      <div
                        key={u.id}
                        className={cn(
                          "grid grid-cols-[1.4fr_80px_80px_80px_80px_120px] gap-2.5 items-center px-4 py-3 rounded-xl border-2 transition",
                          u.matchedDirectly
                            ? "bg-white border-[#E8B968] shadow-[0_2px_0_0_#E8B968]"
                            : "bg-[#FFF1D6] border-[#E8B968]/70 text-[#B8420A] shadow-[0_2px_0_0_#FFF1D6]"
                        )}
                      >
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-slate-800 truncate flex items-center gap-1.5 flex-wrap">
                            {u.name}
                            {u.plan && (
                              <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white border border-[#E8B968] text-slate-650">
                                {u.plan}
                              </span>
                            )}
                            {!u.matchedDirectly && (
                              <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FFF6E8] text-[#B8420A] border border-[#E8B968]">
                                via meta_config
                              </span>
                            )}
                          </p>
                          <p className="text-[10.5px] font-mono text-slate-450 truncate">{u.email}</p>
                          <p className="text-[9px] font-mono text-slate-400 truncate">{u.id}</p>
                        </div>
                        <span className="text-[12px] font-extrabold text-[#0E8A4B] tabular-nums">{u.conversations}<span className="text-[8px] uppercase ml-0.5 font-bold opacity-60">chat</span></span>
                        <span className="text-[12px] font-bold text-[#3C50E0] tabular-nums">{u.contacts}<span className="text-[8px] uppercase ml-0.5 font-bold opacity-60">cont</span></span>
                        <span className="text-[12px] font-bold text-slate-650 tabular-nums">{u.messages}<span className="text-[8px] uppercase ml-0.5 font-bold opacity-60">msg</span></span>
                        <span>
                          {u.hasMetaConfig ? (
                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-[#E6F7EE] border border-[#0E8A4B]/40 text-[#0A6E3C]">✓ Meta</span>
                          ) : (
                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-400">— Meta</span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-450 font-bold">{fmtDate(u.createdAt)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Meta config detail */}
                  {inspect.metaConfigs.length > 0 && (
                    <div className="rounded-xl bg-[#E6F7EE]/60 border-2 border-[#0E8A4B]/40 p-4 shadow-[0_2px_0_0_#cbd5e1]">
                      <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#0A6E3C] mb-2.5">Meta Configs</p>
                      <div className="space-y-2">
                        {inspect.metaConfigs.map((m) => (
                          <div key={m.id} className="grid grid-cols-[1fr_140px_180px_80px] gap-2 items-center text-[11px] py-1 border-b border-emerald-100 last:border-b-0">
                            <span className="font-bold text-slate-750 truncate">{m.userEmail || m.userId}</span>
                            <span className="font-mono text-slate-600 font-bold">{m.displayPhoneNumber || "—"}</span>
                            <span className="font-mono text-slate-450 text-[9px] truncate">{m.phoneNumberId}</span>
                            <span className={cn("inline-flex w-fit text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-lg border", m.enabled ? "bg-[#E6F7EE] text-[#0A6E3C] border-[#0E8A4B]" : "bg-slate-50 text-slate-550 border-slate-350")}>
                              {m.enabled ? "live" : "off"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent conversations preview */}
                  {inspect.conversations.length > 0 && (
                    <div className="rounded-xl bg-white border-2 border-slate-200 p-4 shadow-[0_2px_0_0_#cbd5e1]">
                      <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-450 mb-2.5">
                        Recent Conversations (first {inspect.conversations.length})
                      </p>
                      <div className="space-y-2">
                        {inspect.conversations.slice(0, 8).map((c) => (
                          <div key={c.id} className="grid grid-cols-[1fr_120px_80px_100px] gap-2 items-center text-[11px] py-1 border-b border-slate-100 last:border-b-0">
                            <span className="font-bold text-slate-750 truncate">{c.contactName ?? "(no name)"}</span>
                            <span className="font-mono text-slate-500 font-bold truncate">{c.contactPhone ?? "—"}</span>
                            <span className="text-[9px] font-extrabold text-slate-450 uppercase tracking-wider">{c.status}</span>
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
          <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_4px_0_0_#E8B968] overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-3.5 bg-[#FFF6E8] border-b-2 border-[#E8B968] flex-wrap">
              <UserX className="w-4.5 h-4.5 text-rose-600" strokeWidth={2.5} />
              <p className="text-[13px] font-black text-slate-800 flex-1 min-w-0">
                Duplicate accounts · same email on multiple user rows
                <span className="ml-2.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-600 text-white text-[9px] font-extrabold uppercase tracking-wider shadow-[0_1.5px_0_0_#000]">
                  {duplicates.groups.length} {duplicates.groups.length === 1 ? "group" : "groups"}
                </span>
              </p>
              <button
                className="px-3 py-1 rounded-xl text-[11px] font-extrabold bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] text-slate-700 hover:bg-[#FFF1D6] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] transition-all flex items-center gap-1"
                onClick={() => refetchDuplicates()}
              >
                <RefreshCw className="w-3 h-3" /> Reload
              </button>
            </div>
            <p className="text-[11.5px] text-slate-500 font-semibold px-5 pt-4">
              Most likely cause of "I don't see my chats". Sessions land on one row, data lives on the other. Merge consolidates everything onto a canonical user and deletes the rest.
            </p>
            <div className="divide-y-2 divide-slate-100 p-5 space-y-4">
              {duplicates.groups.map((g) => (
                <div key={g.emailNorm} className="border-2 border-slate-150 p-4 rounded-2xl bg-white shadow-[0_2.5px_0_0_#cbd5e1] space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[12px] font-bold font-mono text-rose-700">{g.emailNorm}</p>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border-2 border-rose-350">
                      {g.users.length} accounts
                    </span>
                    <div className="ml-auto">
                      <button
                        className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-[#D4308E] border-2 border-[#A11A6A] shadow-[0_2px_0_0_#5E0B3B] text-white hover:bg-[#A11A6A] active:translate-y-0.5 active:shadow-[0_1px_0_0_#5E0B3B] transition-all flex items-center gap-1"
                        onClick={() => openMerge(g.users)}
                      >
                        <GitMerge className="w-3.5 h-3.5" /> Merge accounts
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    {g.users.map((u) => (
                      <div
                        key={u.id}
                        className="grid grid-cols-[1.4fr_90px_70px_70px_70px_70px_140px] gap-2.5 items-center px-3.5 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-150 hover:border-slate-350 transition"
                      >
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-bold text-slate-800 truncate">{u.name}</p>
                          <p className="text-[10px] font-mono text-slate-400 truncate">{u.id.slice(0, 12)}…</p>
                        </div>
                        <div>
                          <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded border">{u.plan ?? "—"}</span>
                        </div>
                        <span className="text-[11px] font-extrabold text-[#0E8A4B] tabular-nums">{u.conversations} chats</span>
                        <span className="text-[10.5px] font-bold text-[#3C50E0] tabular-nums">{u.contacts} c.</span>
                        <span className="text-[10.5px] font-bold text-slate-600 tabular-nums">{u.messages} m.</span>
                        <span className="text-[10.5px] font-bold text-slate-650">
                          {u.metaConfigs > 0 ? (
                            <span className="text-emerald-705">✓ Meta</span>
                          ) : (
                            <span className="text-slate-400">— Meta</span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-450 font-semibold">created {fmtDate(u.createdAt)}</span>
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
          "bg-white border-2 rounded-2xl overflow-hidden shadow-[0_4px_0_0_#E8B968]",
          orphanGroups.length > 0 ? "border-[#FF6A1F]" : "border-[#E8B968]"
        )}>
          <div className={cn(
            "flex items-center gap-2.5 px-5 py-3.5 border-b-2 flex-wrap",
            orphanGroups.length > 0 ? "bg-[#FFF1D6] border-[#E8B968]" : "bg-[#FFF6E8] border-[#E8B968]"
          )}>
            <Radio className={cn("w-4.5 h-4.5", orphanGroups.length > 0 ? "text-[#FF6A1F] animate-pulse" : "text-slate-400")} />
            <p className="text-[13px] font-black text-slate-850 flex-1 min-w-0">
              Unrouted Webhooks · WhatsApp messages with no destination account
              {orphans?.unclaimed24h ? (
                <span className="ml-2.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#FF6A1F] text-white text-[9px] font-extrabold uppercase tracking-wider shadow-[0_1.5px_0_0_#000]">
                  {orphans.unclaimed24h} in 24h
                </span>
              ) : null}
            </p>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 rounded-xl text-[11px] font-extrabold bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] text-slate-700 hover:bg-[#FFF1D6] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] transition-all flex items-center gap-1"
                onClick={() => refetchOrphans()}
                disabled={orphansFetching}
              >
                <RefreshCw className={cn("w-3.5 h-3.5", orphansFetching && "animate-spin")} /> Reload
              </button>
              {orphanGroups.length > 0 && (
                <button
                  className="px-3 py-1 rounded-xl text-[11px] font-extrabold bg-white border-2 border-rose-300 shadow-[0_2px_0_0_#FDA4AF] text-rose-600 hover:bg-rose-50 active:translate-y-0.5 active:shadow-[0_1px_0_0_#FDA4AF] transition-all flex items-center gap-1"
                  onClick={() => doClearOrphans()}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear all
                </button>
              )}
            </div>
          </div>

          {orphanGroups.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-[#E6F7EE] border-2 border-[#0E8A4B] flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-[#0A6E3C]" />
              </div>
              <p className="text-[13px] font-black text-slate-800">No unrouted webhooks — every inbound message is landing in an account</p>
              <p className="text-[11px] text-slate-450 mt-1">If a customer reports missing chats, the issue is account-mismatch, not delivery.</p>
            </div>
          ) : (
            <div className="divide-y-2 divide-slate-100">
              {orphanGroups.map((g) => {
                const expanded = expandedPhone === g.phoneNumberId;
                const sampleEvents = orphanRecent.filter((e) => e.phoneNumberId === g.phoneNumberId).slice(0, 5);
                return (
                  <div key={g.phoneNumberId} className="transition">
                    <div className="grid grid-cols-[1fr_140px_180px_140px_140px] gap-3 px-5 py-3.5 items-center hover:bg-[#FFF6E8]/30">
                      <button
                        onClick={() => setExpandedPhone(expanded ? null : g.phoneNumberId)}
                        className="flex items-center gap-2 min-w-0 text-left"
                      >
                        <ChevronDown className={cn("w-4 h-4 flex-shrink-0 text-slate-400 transition-transform", expanded && "rotate-180")} />
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-bold text-slate-850 truncate flex items-center gap-1.5">
                            {g.displayPhoneNumber || "(unknown number)"}
                            <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-300">
                              unrouted
                            </span>
                          </p>
                          <p className="text-[10px] font-mono text-slate-400 truncate">{g.phoneNumberId}</p>
                        </div>
                      </button>
                      <span className="text-[15px] font-black tabular-nums text-[#FF6A1F]">{g.total} events</span>
                      <p className="text-[11.5px] text-slate-450 font-bold">last {fmtDate(g.lastAt)}</p>
                      <button
                        className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-[#0E8A4B] border-2 border-[#0A6E3C] shadow-[0_2px_0_0_#073D22] text-white hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_1px_0_0_#073D22] transition-all flex items-center justify-center gap-1"
                        onClick={() => openClaim(g)}
                      >
                        <Check className="w-3.5 h-3.5" /> Claim to user
                      </button>
                      <button
                        className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-white border-2 border-rose-300 shadow-[0_2px_0_0_#FDA4AF] text-rose-500 hover:bg-rose-50 active:translate-y-0.5 active:shadow-[0_1px_0_0_#FDA4AF] transition-all flex items-center justify-center gap-1"
                        onClick={() => doClearOrphans(g.phoneNumberId)}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete events
                      </button>
                    </div>
                    {expanded && (
                      <div className="bg-[#FFF6E8]/10 px-8 pb-4 pt-2 border-y border-slate-100 space-y-2">
                        <p className="text-[9px] uppercase tracking-wider font-extrabold text-slate-450 mb-1.5">Recent events</p>
                        {sampleEvents.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">No sample events in cache (open the panel sooner after they arrive).</p>
                        ) : (
                          <div className="space-y-2">
                            {sampleEvents.map((e) => (
                              <div key={e.id} className="bg-white border-2 border-[#E8B968] rounded-xl p-3 shadow-[0_2.5px_0_0_#E8B968]">
                                <div className="flex items-center gap-2 mb-1 flex-wrap text-[11px]">
                                  <p className="font-extrabold text-slate-800 truncate">{e.fromName || "(unknown sender)"}</p>
                                  <p className="font-mono font-bold text-slate-450">{e.fromPhone || "—"}</p>
                                  <p className="text-[10px] text-slate-400 ml-auto font-bold">{fmtDate(e.createdAt)}</p>
                                </div>
                                {e.messagePreview && (
                                  <div className="mt-1 text-[11.5px] text-slate-600 font-semibold italic bg-slate-50 p-2 border border-dashed rounded-lg">
                                    "{e.messagePreview}"
                                  </div>
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
        <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_4px_0_0_#E8B968] overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 bg-[#FFF6E8] border-b-2 border-[#E8B968]">
            <Phone className="w-4.5 h-4.5 text-[#B8651A]" strokeWidth={2.5} />
            <p className="text-[13px] font-black text-slate-805">WhatsApp routing · which account receives inbound messages</p>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0E8A4B]" /></div>
          ) : metaConfigs.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <AlertTriangle className="w-6 h-6 mx-auto text-amber-500" />
              <p className="text-[13px] font-black text-slate-700">No Meta WhatsApp configurations found</p>
              <p className="text-[11px] text-slate-450 mt-1 max-w-md mx-auto">No account has connected the WhatsApp Business API yet — inbound chats can't arrive.</p>
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_140px_180px_100px_140px] gap-3 px-5 py-3 border-b-2 border-[#E8B968] bg-[#FFF6E8] text-[10px] font-extrabold uppercase tracking-wider text-[#0A3D24]">
              <div>Routes to (account)</div>
              <div>Display number</div>
              <div>Phone Number ID</div>
              <div>Enabled</div>
              <div>Last verified</div>
            </div>
          )}
          {metaConfigs.map((m) => (
            <div key={m.id} className="grid grid-cols-[1fr_140px_180px_100px_140px] gap-3 px-5 py-3.5 border-b border-slate-100 last:border-b-0 items-center hover:bg-[#FFF6E8]/30 transition">
              <div className="min-w-0">
                <p className="text-[12.5px] font-bold text-slate-850 truncate">{m.name || "—"}</p>
                <p className="text-[10px] text-slate-450 font-mono truncate">{m.email || m.userId}</p>
              </div>
              <p className="text-[11.5px] font-mono font-bold text-slate-650 truncate">{m.displayPhoneNumber || "—"}</p>
              <p className="text-[10.5px] font-mono text-slate-400 truncate">{m.phoneNumberId}</p>
              <div>
                <span className={cn(
                  "inline-flex w-fit px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border-2 shadow-[0_1.5px_0_0_#cbd5e1]",
                  m.enabled
                    ? "bg-[#E6F7EE] text-[#0A6E3C] border-[#0E8A4B]"
                    : "bg-[#FFF1D6] text-[#B8651A] border-[#E8B968]"
                )}>
                  {m.enabled ? "Live" : "Pending"}
                </span>
              </div>
              <p className="text-[11px] text-slate-450 font-bold">{fmtDate(m.lastVerifiedAt)}</p>
            </div>
          ))}
        </div>

        {/* Ownership table */}
        <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_5px_0_0_#E8B968] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5 bg-[#FFF6E8] border-b-2 border-[#E8B968] flex-wrap">
            <Inbox className="w-4.5 h-4.5 text-[#B8651A]" strokeWidth={2.5} />
            <p className="text-[13px] font-black text-slate-800 flex-1 min-w-0">Per-account ownership</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search email / name / user id…"
                className="pl-9 h-9 w-72 border-2 border-[#E8B968] focus:border-[#0E8A4B] rounded-xl bg-white text-slate-800 text-[12px] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-450"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0E8A4B]" /></div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-[#B8651A]" strokeWidth={2.2} />
              </div>
              <p className="text-[14px] font-black text-slate-850">{q ? "No matches" : "No chat data anywhere yet"}</p>
              <p className="text-[12px] text-slate-450 mt-1 max-w-md mx-auto">
                {q ? "Try a different search." : "When the first WhatsApp message arrives, the owning account shows up here."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1.6fr_90px_100px_100px_120px] gap-3 px-5 py-3.5 border-b-2 border-[#E8B968] bg-[#FFF6E8] text-[10px] font-extrabold uppercase tracking-wider text-[#0A3D24]">
                <div>Account</div>
                <div>Chats</div>
                <div>Contacts</div>
                <div>Messages</div>
                <div></div>
              </div>
              {filtered.map((r) => (
                <div key={r.userId} className="grid grid-cols-[1.6fr_90px_100px_100px_120px] gap-3 px-5 py-3.5 border-b border-slate-100 last:border-b-0 items-center hover:bg-[#FFF6E8]/30 transition">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-slate-855 truncate flex items-center gap-1.5">
                      {r.name}
                      {r.plan && (
                        <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-650">
                          {r.plan}
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono truncate">{r.email}</p>
                  </div>
                  <span className="text-[14px] font-black tabular-nums text-[#0E8A4B]">{r.conversations}</span>
                  <span className="text-[13px] font-bold tabular-nums text-[#3C50E0]">{r.contacts}</span>
                  <span className="text-[13px] font-bold tabular-nums text-slate-700">{r.messages}</span>
                  <button
                    className="px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] text-slate-700 hover:bg-[#FFF1D6] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] transition-all flex items-center gap-1 justify-center disabled:opacity-50 disabled:pointer-events-none"
                    onClick={() => openReassign(r)}
                    disabled={r.conversations === 0 && r.contacts === 0 && r.messages === 0}
                  >
                    <Shuffle className="w-3.5 h-3.5" /> Reassign
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Consolidate dialog */}
        <Dialog open={consolidateOpen} onOpenChange={setConsolidateOpen}>
          <DialogContent className="border-2 border-[#E8B968] shadow-[0_6px_0_0_#E8B968] bg-white rounded-2xl p-6 sm:max-w-[640px]">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-[#E8B968] border-2 border-slate-950 flex items-center justify-center shadow-[0_2px_0_0_#000] flex-shrink-0">
                  <GitMerge className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div>
                  <DialogTitle className="text-[18px] font-black text-slate-900">Consolidate Accounts</DialogTitle>
                  <DialogDescription className="text-[12px] text-slate-500 font-semibold leading-relaxed mt-0.5">
                    Pick the target user — all data owned by the others gets moved here.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {consolidateReport && (
              <div className="space-y-4 mt-4">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#B8651A]">Target (the one to keep)</p>
                <div className="space-y-2">
                  {consolidateReport.users.map((u) => {
                    const isTarget = consolidateTargetId === u.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => setConsolidateTargetId(u.id)}
                        className={cn(
                          "w-full text-left p-3.5 rounded-xl border-2 transition-all duration-200 active:translate-y-0.5",
                          isTarget
                            ? "border-[#0E8A4B] bg-[#E6F7EE]/30 shadow-[0_3px_0_0_#0E8A4B]"
                            : "border-[#E8B968] bg-white hover:bg-[#FFF6E8]/30 shadow-[0_3px_0_0_#E8B968]"
                        )}
                      >
                        <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                          <div className="min-w-0">
                            <p className="text-[13px] font-black text-slate-800 truncate flex items-center gap-2 flex-wrap">
                              {u.name}
                              {isTarget && (
                                <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-[#0E8A4B] text-white">
                                  Target
                                </span>
                              )}
                              {u.plan && (
                                <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white border border-[#E8B968] text-slate-600">
                                  {u.plan}
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] font-mono text-slate-450 truncate">{u.email}</p>
                            <p className="text-[9px] font-mono text-slate-400 truncate">{u.id}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] font-black text-[#0E8A4B] tabular-nums">{u.conversations} chats</p>
                            <p className="text-[9.5px] text-slate-455 font-bold tabular-nums">{u.contacts}c · {u.messages}m</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-dashed border-[#E8B968] bg-[#FFF6E8]/20 cursor-pointer transition hover:bg-[#FFF6E8]/35">
                  <Checkbox
                    checked={consolidateDeleteSources}
                    onCheckedChange={(v) => setConsolidateDeleteSources(Boolean(v))}
                    className="mt-0.5 border-[#E8B968] text-[#0E8A4B] focus:ring-0"
                  />
                  <div>
                    <p className="text-[12px] font-extrabold text-slate-800 leading-tight">Delete source user rows after move</p>
                    <p className="text-[11px] text-slate-450 font-semibold mt-0.5 leading-normal">
                      Only check if you're certain — cascades BetterAuth account/session. Leave unchecked to keep source rows around (data already moved; they'll just be empty husks).
                    </p>
                  </div>
                </label>

                <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border-2 border-rose-300 rounded-xl shadow-[0_2.5px_0_0_#5E0B3B]">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                  <span className="text-[11.5px] font-semibold text-rose-850 leading-relaxed">Single transaction. All chats, contacts, messages, deals, tasks, campaigns, broadcasts, upgrade requests, meta_config + profile move to the target. Cannot be auto-undone.</span>
                </div>
              </div>
            )}

            <DialogFooter className="mt-6 flex gap-2">
              <button
                onClick={() => setConsolidateOpen(false)}
                className="px-4 py-2 rounded-xl text-[12px] font-extrabold bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] text-slate-700 hover:bg-[#FFF1D6] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={doConsolidate}
                disabled={submitting || !consolidateTargetId}
                className="px-4 py-2 rounded-xl text-[12px] font-extrabold bg-rose-600 border-2 border-rose-700 shadow-[0_2px_0_0_#5E0B3B] text-white hover:bg-rose-700 active:translate-y-0.5 active:shadow-[0_1px_0_0_#5E0B3B] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-1.5 justify-center"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><GitMerge className="w-3.5 h-3.5" /> Move {(consolidateReport?.users.length ?? 1) - 1} → Target</>}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Merge accounts dialog */}
        <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
          <DialogContent className="border-2 border-[#E8B968] shadow-[0_6px_0_0_#E8B968] bg-white rounded-2xl p-6 sm:max-w-[640px]">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-[#E8B968] border-2 border-slate-950 flex items-center justify-center shadow-[0_2px_0_0_#000] flex-shrink-0">
                  <GitMerge className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div>
                  <DialogTitle className="text-[18px] font-black text-slate-900">Merge Duplicate Accounts</DialogTitle>
                  <DialogDescription className="text-[12px] text-slate-500 font-semibold leading-relaxed mt-0.5">
                    Pick the canonical user — all chats, contacts, messages, deals, tasks, broadcasts, Meta config, and profile from the others get moved here. Duplicate user rows are then deleted.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {mergeGroup && (
              <div className="space-y-4 mt-4">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#B8651A]">Choose Canonical (the one to keep)</p>
                <div className="space-y-2">
                  {mergeGroup.map((u) => {
                    const isCanon = canonicalId === u.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => setCanonicalId(u.id)}
                        className={cn(
                          "w-full text-left p-3.5 rounded-xl border-2 transition-all duration-200 active:translate-y-0.5",
                          isCanon
                            ? "border-[#0E8A4B] bg-[#E6F7EE]/30 shadow-[0_3px_0_0_#0E8A4B]"
                            : "border-[#E8B968] bg-white hover:bg-[#FFF6E8]/30 shadow-[0_3px_0_0_#E8B968]"
                        )}
                      >
                        <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                          <div className="min-w-0">
                            <p className="text-[13px] font-black text-slate-800 truncate flex items-center gap-2">
                              {u.name}
                              {isCanon && (
                                <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-[#0E8A4B] text-white">
                                  Canonical
                                </span>
                              )}
                              {u.plan && (
                                <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white border border-[#E8B968] text-slate-650">
                                  {u.plan}
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] font-mono text-slate-450 truncate">{u.id}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] font-black text-[#0E8A4B] tabular-nums">{u.conversations} chats</p>
                            <p className="text-[9.5px] text-slate-450 font-bold tabular-nums">{u.contacts}c · {u.messages}m</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border-2 border-rose-300 rounded-xl shadow-[0_2.5px_0_0_#5E0B3B]">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="text-[11.5px] font-semibold text-rose-850 leading-relaxed">
                    <strong className="font-extrabold">This is destructive.</strong> The non-canonical user rows will be deleted (cascades BetterAuth account+session). All owned data is transferred first in a single transaction — but the deleted users can't log in again afterwards. Make sure the canonical email/password works.
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="mt-6 flex gap-2">
              <button
                onClick={() => setMergeOpen(false)}
                className="px-4 py-2 rounded-xl text-[12px] font-extrabold bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] text-slate-700 hover:bg-[#FFF1D6] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={doMerge}
                disabled={submitting || !canonicalId}
                className="px-4 py-2 rounded-xl text-[12px] font-extrabold bg-rose-600 border-2 border-rose-700 shadow-[0_2px_0_0_#5E0B3B] text-white hover:bg-rose-700 active:translate-y-0.5 active:shadow-[0_1px_0_0_#5E0B3B] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-1.5"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><GitMerge className="w-3.5 h-3.5" /> Merge {(mergeGroup?.length ?? 1) - 1} into 1</>}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Claim orphan dialog */}
        <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
          <DialogContent className="border-2 border-[#E8B968] shadow-[0_6px_0_0_#E8B968] bg-white rounded-2xl p-6 sm:max-w-[520px]">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-[#E8B968] border-2 border-slate-950 flex items-center justify-center shadow-[0_2px_0_0_#000] flex-shrink-0">
                  <Radio className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div>
                  <DialogTitle className="text-[18px] font-black text-slate-900">Claim Orphan Messages</DialogTitle>
                  <DialogDescription className="text-[12px] text-slate-500 font-semibold leading-relaxed mt-0.5">
                    Tags these events to a user account so admin reporting shows resolution. Note: doesn't replay the messages — the user still needs to connect Meta to receive future inbound.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {claimGroup && (
              <div className="space-y-4 mt-4">
                <div className="rounded-xl bg-[#FFF6E8] border-2 border-[#E8B968] p-4 shadow-[0_2px_0_0_#E8B968]">
                  <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#B8651A]">Phone</p>
                  <p className="text-[14px] font-black text-slate-800">{claimGroup.displayPhoneNumber || "(unknown)"}</p>
                  <p className="text-[11px] font-mono text-slate-500 mt-0.5">{claimGroup.phoneNumberId}</p>
                  <p className="text-[11px] font-extrabold text-[#FF6A1F] mt-2">{claimGroup.total} unrouted event(s)</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-extrabold uppercase tracking-wider text-[#B8651A]">Claim to User</Label>
                  <TargetPicker excludeUserId="" value={claimUserId} onChange={setClaimUserId} />
                </div>
              </div>
            )}

            <DialogFooter className="mt-6 flex gap-2">
              <button
                onClick={() => setClaimOpen(false)}
                className="px-4 py-2 rounded-xl text-[12px] font-extrabold bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] text-slate-700 hover:bg-[#FFF1D6] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={doClaim}
                disabled={submitting || !claimUserId}
                className="px-4 py-2 rounded-xl text-[12px] font-extrabold bg-[#0E8A4B] border-2 border-[#0A6E3C] shadow-[0_2px_0_0_#073D22] text-white hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_1px_0_0_#073D22] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-1.5"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Claim {claimGroup?.total ?? 0}</>}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reassign dialog */}
        <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
          <DialogContent className="border-2 border-[#E8B968] shadow-[0_6px_0_0_#E8B968] bg-white rounded-2xl p-6 sm:max-w-[560px]">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-[#E8B968] border-2 border-slate-950 flex items-center justify-center shadow-[0_2px_0_0_#000] flex-shrink-0">
                  <Shuffle className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div>
                  <DialogTitle className="text-[18px] font-black text-slate-900">Reassign Chats</DialogTitle>
                  <DialogDescription className="text-[12px] text-slate-500 font-semibold leading-relaxed mt-0.5">
                    Moves all conversations, contacts, and messages from one account to another. Logged in audit.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {fromRow && (
              <div className="space-y-4 mt-4">
                <div className="rounded-xl bg-[#FFF6E8] border-2 border-[#E8B968] p-4 shadow-[0_2px_0_0_#E8B968]">
                  <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#B8651A]">From</p>
                      <p className="text-[13px] font-black text-slate-800 truncate">{fromRow.name}</p>
                      <p className="text-[11px] font-mono text-slate-500 truncate">{fromRow.email}</p>
                      <p className="text-[10.5px] font-bold text-[#0E8A4B] mt-1.5">
                        {fromRow.conversations} chats · {fromRow.contacts} contacts · {fromRow.messages} messages
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0 hidden sm:block" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#B8651A] mb-1">To</p>
                      <TargetPicker
                        excludeUserId={fromRow.userId}
                        value={toUserId}
                        onChange={setToUserId}
                      />
                    </div>
                  </div>
                </div>

                <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-dashed border-[#E8B968] bg-[#FFF6E8]/20 cursor-pointer transition hover:bg-[#FFF6E8]/35">
                  <Checkbox
                    checked={includeMetaConfig}
                    onCheckedChange={(v) => setIncludeMetaConfig(Boolean(v))}
                    className="mt-0.5 border-[#E8B968] text-[#0E8A4B] focus:ring-0"
                  />
                  <div>
                    <p className="text-[12px] font-extrabold text-slate-800 leading-tight">Also move WhatsApp routing (meta_config)</p>
                    <p className="text-[11px] text-slate-450 font-semibold mt-0.5 leading-normal">
                      Future inbound chats will go to the destination account too. If the target already has a meta_config row, the source row is deleted.
                    </p>
                  </div>
                </label>

                <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border-2 border-rose-300 rounded-xl shadow-[0_2.5px_0_0_#5E0B3B]">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                  <span className="text-[11.5px] font-semibold text-rose-850 leading-relaxed">This is a hard move — the source account will lose access to these records. Cannot be auto-undone (but audit log captures the reverse mapping).</span>
                </div>
              </div>
            )}

            <DialogFooter className="mt-6 flex gap-2">
              <button
                onClick={() => setReassignOpen(false)}
                className="px-4 py-2 rounded-xl text-[12px] font-extrabold bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] text-slate-700 hover:bg-[#FFF1D6] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={doReassign}
                disabled={submitting || !toUserId}
                className="px-4 py-2 rounded-xl text-[12px] font-extrabold bg-rose-600 border-2 border-rose-700 shadow-[0_2px_0_0_#5E0B3B] text-white hover:bg-rose-700 active:translate-y-0.5 active:shadow-[0_1px_0_0_#5E0B3B] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-1.5"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Shuffle className="w-3.5 h-3.5" /> Reassign</>}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  );
};

const TotalCard = ({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof Inbox; color: string }) => {
  const styles: Record<string, { iconClass: string; bgClass: string }> = {
    indigo:  { iconClass: "bg-[#E6F0FA] border-[#3C50E0] text-[#2533A8]", bgClass: "border-[#E8B968] shadow-[0_4px_0_0_#E8B968]" },
    emerald: { iconClass: "bg-[#E6F7EE] border-[#0E8A4B] text-[#0A6E3C]", bgClass: "border-[#E8B968] shadow-[0_4px_0_0_#E8B968]" },
    magenta: { iconClass: "bg-[#FDF0F5] border-[#D4308E] text-[#A11A6A]", bgClass: "border-[#E8B968] shadow-[0_4px_0_0_#E8B968]" },
    orange:  { iconClass: "bg-[#FFF1D6] border-[#FF6A1F] text-[#B8420A]", bgClass: "border-[#E8B968] shadow-[0_4px_0_0_#E8B968]" },
  };
  const s = styles[color] ?? styles.indigo;
  return (
    <div className={cn("bg-white border-2 rounded-2xl p-4 flex items-center gap-3 hover:-translate-y-0.5 transition-all duration-200", s.bgClass)}>
      <div className={cn("w-10 h-10 rounded-xl border-2 border-slate-900 flex items-center justify-center shadow-[0_2px_0_0_#000] flex-shrink-0", s.iconClass)}>
        <Icon className="w-4.5 h-4.5" strokeWidth={2.5} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold truncate">{label}</p>
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
    <div className="space-y-1.5 w-full">
      {selected ? (
        <div className="flex items-center justify-between gap-2 bg-white border-2 border-[#0E8A4B] rounded-xl px-3 py-2 shadow-[0_2px_0_0_#0E8A4B]">
          <div className="min-w-0">
            <p className="text-[12px] font-extrabold text-slate-800 truncate">{selected.name}</p>
            <p className="text-[10px] font-mono text-slate-400 truncate">{selected.email}</p>
          </div>
          <button onClick={() => onChange("")} className="text-[10px] uppercase font-extrabold text-rose-650 hover:underline">Change</button>
        </div>
      ) : (
        <div className="relative w-full">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by email…"
            className="h-10 text-[12px] border-2 border-[#E8B968] focus:border-[#0E8A4B] rounded-xl bg-white text-slate-800 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
            autoFocus
          />
          {filtered.length > 0 && q && (
            <div className="absolute left-0 right-0 max-h-44 overflow-y-auto rounded-xl border-2 border-[#E8B968] bg-white shadow-[0_4px_0_0_#E8B968] mt-1 z-10">
              {filtered.slice(0, 8).map((w) => (
                <button
                  key={w.id}
                  onClick={() => { onChange(w.id); setQ(""); }}
                  className="w-full text-left px-3 py-2.5 hover:bg-[#FFF6E8]/30 transition border-b border-slate-100 last:border-b-0"
                >
                  <p className="text-[12px] font-extrabold text-slate-800 truncate">{w.name}</p>
                  <p className="text-[10px] font-mono text-slate-400 truncate">{w.email}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDiagnostics;
