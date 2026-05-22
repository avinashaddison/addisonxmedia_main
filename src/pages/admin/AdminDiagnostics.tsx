import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, ChatOwnershipRow, WebhookOrphanGroup } from "@/lib/admin-api";
import {
  Activity, ArrowRight, Building2, Check, Inbox, Loader2, MessageSquare, Phone,
  RefreshCw, Search, Shuffle, Users as UsersIcon, AlertTriangle, CheckCircle2,
  Radio, Trash2, ChevronDown,
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

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-chat-ownership"],
    queryFn: () => adminApi.chatOwnership(),
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

  const openClaim = (group: WebhookOrphanGroup) => {
    setClaimGroup(group);
    setClaimUserId("");
    setClaimOpen(true);
  };

  const doClaim = async () => {
    if (!claimGroup || !claimUserId) return;
    setSubmitting(true);
    try {
      const res = await adminApi.claimWebhookOrphans(claimGroup.phoneNumberId, claimUserId);
      toast.success(`Claimed ${res.claimedCount} orphan event(s) to user`);
      setClaimOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-webhook-orphans"] });
      qc.invalidateQueries({ queryKey: ["admin-chat-ownership"] });
      qc.invalidateQueries({ queryKey: ["admin-metrics"] });
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const doClearOrphans = async (phoneNumberId?: string) => {
    if (!confirm(phoneNumberId
      ? `Delete all orphan rows for ${phoneNumberId}? Cannot be undone.`
      : "Delete ALL orphan rows? This wipes the entire log. Cannot be undone."
    )) return;
    try {
      const res = await adminApi.clearWebhookOrphans(phoneNumberId);
      toast.success(`Deleted ${res.deletedCount} orphan row(s)`);
      qc.invalidateQueries({ queryKey: ["admin-webhook-orphans"] });
      qc.invalidateQueries({ queryKey: ["admin-metrics"] });
    } catch (e) {
      toast.error(String(e));
    }
  };

  const doReassign = async () => {
    if (!fromRow || !toUserId) return;
    setSubmitting(true);
    try {
      await adminApi.reassignChats({
        fromUserId: fromRow.userId,
        toUserId,
        includeMetaConfig,
      });
      toast.success(`Moved ${fromRow.conversations} chats from ${fromRow.email}`);
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
    <div className="px-6 lg:px-10 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4308E] to-[#A11A6A] text-white flex items-center justify-center shadow-md">
          <Activity className="w-6 h-6" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[26px] font-black tracking-tight">Chat Ownership</h1>
          <p className="text-[12px] text-foreground/70 font-medium">
            Who owns which conversations · where are inbound WhatsApp messages being routed
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} /> Refresh
        </Button>
      </div>

      {/* Totals strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <TotalCard label="Total chats" value={totals.conversations} icon={Inbox} color="emerald" />
        <TotalCard label="Total contacts" value={totals.contacts} icon={UsersIcon} color="indigo" />
        <TotalCard label="Total messages" value={totals.messages} icon={MessageSquare} color="magenta" />
        <TotalCard label="Workspaces with data" value={ownership.length} icon={Building2} color="orange" />
      </div>

      {/* Unrouted webhooks (orphans) — surface FIRST since this is the early
       *  warning signal for "where are my chats?" tickets. */}
      <div className={cn(
        "bg-white border-2 rounded-2xl mb-4 overflow-hidden",
        orphanGroups.length > 0
          ? "border-[#FF6A1F] shadow-[0_4px_0_0_#B8420A]"
          : "border-[#E8B968]/60 shadow-[0_3px_0_0_#E8B968]/60"
      )}>
        <div className={cn(
          "flex items-center gap-2.5 px-4 py-3 border-b-2 flex-wrap",
          orphanGroups.length > 0 ? "bg-[#FFEFE0] border-[#FF6A1F]" : "bg-[#FFF6E8] border-[#E8B968]/60"
        )}>
          <Radio className={cn("w-4 h-4", orphanGroups.length > 0 ? "text-[#FF6A1F] animate-pulse" : "text-foreground/50")} />
          <p className="text-[13px] font-black flex-1 min-w-0">
            Unrouted webhooks · WhatsApp messages with no destination account
            {orphans?.unclaimed24h ? (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FF6A1F] text-white text-[10px] font-extrabold uppercase tracking-wider">
                {orphans.unclaimed24h} in 24h
              </span>
            ) : null}
          </p>
          <Button variant="outline" className="h-8" onClick={() => refetchOrphans()} disabled={orphansFetching}>
            <RefreshCw className={cn("w-3 h-3", orphansFetching && "animate-spin")} /> Reload
          </Button>
          {orphanGroups.length > 0 && (
            <Button variant="ghost" className="h-8 text-[#D4308E] hover:text-[#D4308E] hover:bg-[#FCE5F0]" onClick={() => doClearOrphans()}>
              <Trash2 className="w-3 h-3" /> Clear all
            </Button>
          )}
        </div>

        {orphanGroups.length === 0 ? (
          <div className="p-6 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto text-[#0E8A4B] mb-2" />
            <p className="text-[13px] font-extrabold">No unrouted webhooks — every inbound message is landing in an account</p>
            <p className="text-[11px] text-foreground/60 mt-1">If a customer reports missing chats, the issue is account-mismatch, not delivery.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E8B968]/30">
            {orphanGroups.map((g) => {
              const expanded = expandedPhone === g.phoneNumberId;
              const sampleEvents = orphanRecent.filter((e) => e.phoneNumberId === g.phoneNumberId).slice(0, 5);
              return (
                <div key={g.phoneNumberId}>
                  <div className="grid grid-cols-[1fr_140px_180px_120px_220px] gap-3 px-4 py-3 items-center hover:bg-[#FFF6E8]">
                    <button
                      onClick={() => setExpandedPhone(expanded ? null : g.phoneNumberId)}
                      className="flex items-center gap-2 min-w-0 text-left"
                    >
                      <ChevronDown className={cn("w-3.5 h-3.5 flex-shrink-0 text-foreground/50 transition-transform", expanded && "rotate-180")} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-extrabold truncate flex items-center gap-1.5">
                          {g.displayPhoneNumber || "(unknown number)"}
                          <span className="text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#FCE5F0] text-[#D4308E] border border-[#D4308E]/30">
                            unrouted
                          </span>
                        </p>
                        <p className="text-[10px] font-mono text-foreground/60 truncate">{g.phoneNumberId}</p>
                      </div>
                    </button>
                    <span className="text-[14px] font-black tabular-nums text-[#FF6A1F]">{g.total}</span>
                    <p className="text-[11px] text-foreground/65 font-medium">last {fmtDate(g.lastAt)}</p>
                    <Button variant="outline" className="h-8" onClick={() => openClaim(g)}>
                      <Check className="w-3 h-3" /> Claim to user
                    </Button>
                    <Button variant="ghost" className="h-8 text-[#D4308E] hover:text-[#D4308E] hover:bg-[#FCE5F0] justify-self-start" onClick={() => doClearOrphans(g.phoneNumberId)}>
                      <Trash2 className="w-3 h-3" /> Delete events
                    </Button>
                  </div>
                  {expanded && (
                    <div className="bg-[#FFF6E8] px-4 pb-3 pt-1">
                      <p className="text-[10px] uppercase tracking-wider font-extrabold text-foreground/60 mb-1.5">Recent events</p>
                      {sampleEvents.length === 0 ? (
                        <p className="text-[11px] text-foreground/55 italic">No sample events in cache (open the panel sooner after they arrive).</p>
                      ) : (
                        <div className="space-y-1.5">
                          {sampleEvents.map((e) => (
                            <div key={e.id} className="bg-white border border-[#E8B968]/40 rounded-lg p-2.5">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-[11px] font-extrabold truncate">{e.fromName || "(unknown sender)"}</p>
                                <p className="text-[10px] font-mono text-foreground/55">{e.fromPhone || "—"}</p>
                                <p className="text-[10px] text-foreground/55 ml-auto">{fmtDate(e.createdAt)}</p>
                              </div>
                              {e.messagePreview && (
                                <p className="text-[11px] text-foreground/80 italic truncate" title={e.messagePreview}>
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
      <div className="bg-white border-2 border-[#0E8A4B] rounded-2xl shadow-[0_4px_0_0_#0A6E3C] mb-4 overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 bg-[#E6F7EE] border-b-2 border-[#0E8A4B]">
          <Phone className="w-4 h-4 text-[#0E8A4B]" />
          <p className="text-[13px] font-black">WhatsApp routing · which account receives inbound messages</p>
        </div>
        {isLoading ? (
          <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0E8A4B]" /></div>
        ) : metaConfigs.length === 0 ? (
          <div className="p-6 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto text-[#FF6A1F] mb-2" />
            <p className="text-[13px] font-extrabold">No Meta WhatsApp configurations found</p>
            <p className="text-[11px] text-foreground/60 mt-1">No account has connected the WhatsApp Business API yet — inbound chats can't arrive.</p>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_140px_180px_100px_140px] gap-3 px-4 py-2 border-b border-[#0E8A4B]/30 bg-[#E6F7EE]/40 text-[10px] font-extrabold uppercase tracking-wider text-[#0A6E3C]">
            <div>Routes to (account)</div>
            <div>Display number</div>
            <div>Phone Number ID</div>
            <div>Enabled</div>
            <div>Last verified</div>
          </div>
        )}
        {metaConfigs.map((m) => (
          <div key={m.id} className="grid grid-cols-[1fr_140px_180px_100px_140px] gap-3 px-4 py-2.5 border-b border-[#0E8A4B]/15 last:border-b-0 items-center">
            <div className="min-w-0">
              <p className="text-[12px] font-extrabold truncate">{m.name || "—"}</p>
              <p className="text-[10px] text-foreground/60 font-mono truncate">{m.email || m.userId}</p>
            </div>
            <p className="text-[11px] font-mono font-semibold truncate">{m.displayPhoneNumber || "—"}</p>
            <p className="text-[10px] font-mono text-foreground/70 truncate">{m.phoneNumberId}</p>
            <span className={cn(
              "inline-flex w-fit px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border",
              m.enabled
                ? "bg-[#E6F7EE] text-[#0A6E3C] border-[#0E8A4B]/40"
                : "bg-[#FFF1D6] text-[#B8651A] border-[#E8B968]"
            )}>
              {m.enabled ? "Live" : "Pending"}
            </span>
            <p className="text-[10px] text-foreground/60 font-medium">{fmtDate(m.lastVerifiedAt)}</p>
          </div>
        ))}
      </div>

      {/* Ownership table */}
      <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_4px_0_0_#E8B968] overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b-2 border-[#E8B968] bg-[#FFF1D6] flex-wrap">
          <Inbox className="w-4 h-4 text-[#B8651A]" />
          <p className="text-[13px] font-black flex-1 min-w-0">Per-account ownership</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B8651A]" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email / name / user id…" className="pl-9 h-9 w-72" />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#B8651A]" /></div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#E6F7EE] border-2 border-[#0E8A4B] flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-[#0E8A4B]" strokeWidth={2.5} />
            </div>
            <p className="text-[14px] font-extrabold">{q ? "No matches" : "No chat data anywhere yet"}</p>
            <p className="text-[12px] text-foreground/60 mt-1 max-w-md mx-auto">
              {q ? "Try a different search." : "When the first WhatsApp message arrives, the owning account shows up here."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1.6fr_90px_100px_100px_120px] gap-3 px-4 py-2 border-b-2 border-[#E8B968] bg-[#FFF1D6] text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A]">
              <div>Account</div>
              <div>Chats</div>
              <div>Contacts</div>
              <div>Messages</div>
              <div></div>
            </div>
            {filtered.map((r) => (
              <div key={r.userId} className="grid grid-cols-[1.6fr_90px_100px_100px_120px] gap-3 px-4 py-3 border-b border-[#E8B968]/40 last:border-b-0 items-center hover:bg-[#FFF6E8] transition">
                <div className="min-w-0">
                  <p className="text-[13px] font-extrabold truncate flex items-center gap-1.5">
                    {r.name}
                    {r.plan && (
                      <span className="text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#FFF1D6] text-[#B8651A] border border-[#E8B968]">
                        {r.plan}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-foreground/60 font-mono truncate">{r.email}</p>
                </div>
                <span className="text-[14px] font-black tabular-nums text-[#0E8A4B]">{r.conversations}</span>
                <span className="text-[13px] font-extrabold tabular-nums text-foreground/80">{r.contacts}</span>
                <span className="text-[13px] font-extrabold tabular-nums text-foreground/80">{r.messages}</span>
                <Button
                  variant="outline"
                  className="h-8 px-2.5 text-[11px]"
                  onClick={() => openReassign(r)}
                  disabled={r.conversations === 0 && r.contacts === 0 && r.messages === 0}
                >
                  <Shuffle className="w-3 h-3" /> Reassign
                </Button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Claim orphan dialog */}
      <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF6A1F] to-[#B8420A] text-white flex items-center justify-center shadow-md">
                <Radio className="w-5 h-5" strokeWidth={2.5} />
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
              <div className="rounded-xl bg-[#FFEFE0] border-2 border-[#FF6A1F] p-3">
                <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#B8420A]">Phone</p>
                <p className="text-[13px] font-black">{claimGroup.displayPhoneNumber || "(unknown)"}</p>
                <p className="text-[11px] font-mono text-foreground/65">{claimGroup.phoneNumberId}</p>
                <p className="text-[11px] font-extrabold text-[#FF6A1F] mt-1">{claimGroup.total} unrouted event(s)</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider font-extrabold text-foreground/60">Claim to user</Label>
                <TargetPicker excludeUserId="" value={claimUserId} onChange={setClaimUserId} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setClaimOpen(false)}>Cancel</Button>
            <Button
              onClick={doClaim}
              disabled={submitting || !claimUserId}
              className="bg-[#FF6A1F] text-white shadow-[0_4px_0_0_#B8420A] hover:bg-[#B8420A]"
            >
              {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Claiming…</> : <><Check className="w-3.5 h-3.5" /> Claim {claimGroup?.total ?? 0}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign dialog */}
      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#D4308E] to-[#A11A6A] text-white flex items-center justify-center shadow-md">
                <Shuffle className="w-5 h-5" strokeWidth={2.5} />
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
              <div className="rounded-xl bg-[#FFF1D6] border-2 border-[#E8B968] p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#B8651A]">From</p>
                    <p className="text-[13px] font-black truncate">{fromRow.name}</p>
                    <p className="text-[11px] font-mono text-foreground/60 truncate">{fromRow.email}</p>
                    <p className="text-[10px] font-extrabold text-[#0E8A4B] mt-1">
                      {fromRow.conversations} chats · {fromRow.contacts} contacts · {fromRow.messages} messages
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-foreground/40 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#B8651A]">To</p>
                    <TargetPicker
                      excludeUserId={fromRow.userId}
                      value={toUserId}
                      onChange={setToUserId}
                    />
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border-2 border-[#E8B968]/60 hover:bg-[#FFF6E8] cursor-pointer transition">
                <Checkbox
                  checked={includeMetaConfig}
                  onCheckedChange={(v) => setIncludeMetaConfig(Boolean(v))}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-[12px] font-extrabold leading-tight">Also move WhatsApp routing (meta_config)</p>
                  <p className="text-[11px] text-foreground/60 font-medium mt-0.5">
                    Future inbound chats will go to the destination account too. If the target already has a meta_config row, the source row is deleted.
                  </p>
                </div>
              </label>

              <div className="flex items-start gap-2 text-[11px] text-[#B8420A] font-semibold p-2.5 rounded-lg bg-[#FFEFE0] border border-[#FF6A1F]/40">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>This is a hard move — the source account will lose access to these records. Cannot be auto-undone (but audit log captures the reverse mapping).</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignOpen(false)}>Cancel</Button>
            <Button
              onClick={doReassign}
              disabled={submitting || !toUserId}
              className="bg-[#D4308E] text-white shadow-[0_4px_0_0_#A11A6A] hover:bg-[#C02680]"
            >
              {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Moving…</> : <><Check className="w-3.5 h-3.5" /> Reassign</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const TotalCard = ({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof Inbox; color: string }) => {
  const styles: Record<string, { border: string; shadow: string; iconBg: string }> = {
    indigo:  { border: "border-[#3C50E0]", shadow: "shadow-[0_3px_0_0_#2533A8]", iconBg: "bg-[#3C50E0]" },
    emerald: { border: "border-[#0E8A4B]", shadow: "shadow-[0_3px_0_0_#0A6E3C]", iconBg: "bg-[#0E8A4B]" },
    magenta: { border: "border-[#D4308E]", shadow: "shadow-[0_3px_0_0_#A11A6A]", iconBg: "bg-[#D4308E]" },
    orange:  { border: "border-[#FF6A1F]", shadow: "shadow-[0_3px_0_0_#B8420A]", iconBg: "bg-[#FF6A1F]" },
  };
  const s = styles[color] ?? styles.indigo;
  return (
    <div className={`bg-white border-2 ${s.border} ${s.shadow} rounded-2xl p-4 flex items-center gap-3`}>
      <div className={`w-10 h-10 rounded-xl ${s.iconBg} text-white flex items-center justify-center shadow-md flex-shrink-0`}>
        <Icon className="w-4 h-4" strokeWidth={2.5} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-foreground/60 font-extrabold truncate">{label}</p>
        <p className="text-xl font-black tabular-nums leading-tight">{value.toLocaleString("en-IN")}</p>
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
        <div className="flex items-center justify-between gap-2 bg-white border-2 border-[#0E8A4B] rounded-lg px-2 py-1.5">
          <div className="min-w-0">
            <p className="text-[12px] font-black truncate">{selected.name}</p>
            <p className="text-[10px] font-mono text-foreground/60 truncate">{selected.email}</p>
          </div>
          <button onClick={() => onChange("")} className="text-[10px] uppercase font-extrabold text-[#B8230C] hover:underline">change</button>
        </div>
      ) : (
        <>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by email…"
            className="h-8 text-[12px]"
            autoFocus
          />
          {filtered.length > 0 && (
            <div className="max-h-44 overflow-y-auto rounded-lg border border-[#E8B968]/60 bg-white">
              {filtered.slice(0, 8).map((w) => (
                <button
                  key={w.id}
                  onClick={() => { onChange(w.id); setQ(""); }}
                  className="w-full text-left px-2 py-1.5 hover:bg-[#FFF6E8] transition border-b border-[#E8B968]/20 last:border-b-0"
                >
                  <p className="text-[12px] font-extrabold truncate">{w.name}</p>
                  <p className="text-[10px] font-mono text-foreground/60 truncate">{w.email}</p>
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
