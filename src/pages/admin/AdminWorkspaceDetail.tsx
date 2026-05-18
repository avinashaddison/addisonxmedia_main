import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { Building2, ArrowLeft, ShieldOff, ShieldCheck, Eye, Edit3, Mail, Phone, Users as UsersIcon, MessageSquare, Inbox, Trophy, IndianRupee, Loader2, CheckCircle2, AlertTriangle, Flame, CheckCheck, Clock, Send, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const AdminWorkspaceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [impersOpen, setImpersOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [plan, setPlan] = useState("");
  const [mrr, setMrr] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: w, isLoading } = useQuery({
    queryKey: ["admin-workspace", id],
    queryFn: () => adminApi.workspaceDetail(id!),
    enabled: !!id,
  });

  if (isLoading || !w) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#B8230C]" />
      </div>
    );
  }

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-workspace", id] });

  const openEdit = () => {
    setPlan(w.plan);
    setMrr(String(w.mrrInr ?? 0));
    setEditOpen(true);
  };

  const saveEdit = async () => {
    setSubmitting(true);
    try {
      await adminApi.updateWorkspace(id!, { plan, mrrInr: Number(mrr) });
      toast.success("Plan updated");
      setEditOpen(false);
      refresh();
    } catch (e) { toast.error(String(e)); }
    finally { setSubmitting(false); }
  };

  const doSuspend = async () => {
    if (reason.length < 5) { toast.error("Reason required (min 5 chars)"); return; }
    setSubmitting(true);
    try {
      await adminApi.suspend(id!, reason);
      toast.success("Account suspended");
      setSuspendOpen(false);
      setReason("");
      refresh();
    } catch (e) { toast.error(String(e)); }
    finally { setSubmitting(false); }
  };

  const doUnsuspend = async () => {
    try {
      await adminApi.unsuspend(id!);
      toast.success("Account re-activated");
      refresh();
    } catch (e) { toast.error(String(e)); }
  };

  const doImpersonate = async () => {
    if (reason.length < 10) { toast.error("Reason required (min 10 chars)"); return; }
    setSubmitting(true);
    try {
      await adminApi.impersonate(id!, reason);
      toast.success(`Impersonating ${w.name}`);
      navigate("/app/dashboard");
    } catch (e) { toast.error(String(e)); }
    finally { setSubmitting(false); }
  };

  const isSuspended = w.status === "suspended";

  return (
    <div className="px-6 lg:px-10 py-6">
      <Link to="/admin/workspaces" className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-[#B8230C] hover:underline mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to workspaces
      </Link>

      {/* Header */}
      <div className="bg-white border-2 border-[#E8B968] rounded-2xl p-5 shadow-[0_4px_0_0_#E8B968] mb-4">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FFD23F] to-[#E8B400] text-[#3D1A00] flex items-center justify-center shadow-md flex-shrink-0">
            <Building2 className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight">{w.name}</h1>
              <span className="inline-flex px-2 py-0.5 rounded-full bg-[#FFF1D6] border border-[#E8B968] text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A]">
                {w.plan}
              </span>
              {isSuspended ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FCE5F0] border border-[#D4308E]/30 text-[#D4308E] text-[10px] font-extrabold uppercase tracking-wider">
                  <ShieldOff className="w-3 h-3" /> Suspended
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E6F7EE] border border-[#0E8A4B]/30 text-[#0E8A4B] text-[10px] font-extrabold uppercase tracking-wider">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
              )}
            </div>
            <p className="text-[12px] text-foreground/60 font-mono mt-1">{w.email}</p>
            <p className="text-[11px] text-foreground/50 font-medium mt-0.5">Joined {new Date(w.createdAt).toLocaleString("en-IN")}</p>
            {isSuspended && w.suspendedReason && (
              <div className="mt-3 p-3 rounded-xl bg-[#FCE5F0] border-2 border-[#D4308E]">
                <p className="text-[10px] uppercase tracking-wider text-[#D4308E] font-extrabold mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Suspended reason
                </p>
                <p className="text-[12px] font-semibold">{w.suspendedReason}</p>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={openEdit}>
              <Edit3 className="w-3.5 h-3.5" /> Edit plan
            </Button>
            <Button onClick={() => { setReason(""); setImpersOpen(true); }}>
              <Eye className="w-3.5 h-3.5" /> Impersonate
            </Button>
            <Button
              variant="outline"
              onClick={() => { window.location.href = adminApi.workspaceExportContactsUrl(id!); }}
            >
              <Download className="w-3.5 h-3.5" /> Export contacts
            </Button>
            {isSuspended ? (
              <Button variant="outline" onClick={doUnsuspend}>
                <ShieldCheck className="w-3.5 h-3.5" /> Unsuspend
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <ShieldOff className="w-3.5 h-3.5" /> Suspend
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Suspend {w.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      All inbound/outbound messaging stops immediately. Reason will be logged for compliance.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-1.5">
                    <Label>Reason (logged forever)</Label>
                    <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. spam complaint from Meta" autoFocus />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={doSuspend} disabled={submitting} className="bg-[#D4308E] text-white shadow-[0_4px_0_0_#A11A6A] hover:bg-[#C02680]">
                      {submitting ? "Suspending…" : "Suspend account"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Contacts" value={w.counts.contacts} icon={UsersIcon} color="indigo" />
        <StatCard label="Conversations" value={w.counts.conversations} icon={Inbox} color="emerald" />
        <StatCard label="Messages" value={w.counts.messages} icon={MessageSquare} color="magenta" />
        <StatCard label="Deals" value={w.counts.deals} icon={Trophy} color="orange" />
        <StatCard label="Won revenue" value={fmtINR(w.counts.revenueInr)} icon={IndianRupee} color="yellow" />
      </div>

      {/* Meta WhatsApp */}
      <div className="mt-4 bg-white border-2 border-[#0E8A4B] rounded-2xl p-5 shadow-[0_4px_0_0_#0A6E3C]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl bg-[#0E8A4B] text-white flex items-center justify-center shadow-md">
            <Phone className="w-4 h-4" />
          </div>
          <h3 className="font-black tracking-tight">Meta WhatsApp Business</h3>
        </div>
        {w.meta?.enabled ? (
          <p className="text-[13px] font-semibold">
            ✅ Connected · <span className="font-mono">{w.meta.displayPhoneNumber}</span>
          </p>
        ) : (
          <p className="text-[13px] font-semibold text-foreground/60">Not connected · running in dry-run mode</p>
        )}
      </div>

      {/* Preview cards — read-only peek at customer data to reduce impersonation churn */}
      <WorkspacePreview userId={id!} />

      {/* Edit plan dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit plan & MRR</DialogTitle>
            <DialogDescription>Manual override for {w.email}. Logged in audit.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter · ₹499/mo</SelectItem>
                  <SelectItem value="growth">Growth · ₹1,999/mo</SelectItem>
                  <SelectItem value="enterprise">Enterprise · Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>MRR (₹)</Label>
              <Input type="number" value={mrr} onChange={(e) => setMrr(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={submitting}>{submitting ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Impersonate dialog */}
      <Dialog open={impersOpen} onOpenChange={setImpersOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#B8230C] to-[#7A1500] text-white flex items-center justify-center shadow-md">
                <Eye className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <div>
                <DialogTitle>Impersonate {w.name}?</DialogTitle>
                <DialogDescription>
                  Session expires in 4 hours. A yellow banner will be visible on every customer-app page. All actions audit-logged.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-1.5 mt-2">
            <Label>Reason (required, min 10 chars)</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer reported broadcast not sending"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImpersOpen(false)}>Cancel</Button>
            <Button onClick={doImpersonate} disabled={submitting || reason.length < 10}>
              <Eye className="w-3.5 h-3.5" /> Start impersonation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: typeof Building2; color: string }) => {
  const styles: Record<string, { border: string; shadow: string; iconBg: string }> = {
    indigo:  { border: "border-[#3C50E0]", shadow: "shadow-[0_3px_0_0_#2533A8]", iconBg: "bg-[#3C50E0]" },
    emerald: { border: "border-[#0E8A4B]", shadow: "shadow-[0_3px_0_0_#0A6E3C]", iconBg: "bg-[#0E8A4B]" },
    magenta: { border: "border-[#D4308E]", shadow: "shadow-[0_3px_0_0_#A11A6A]", iconBg: "bg-[#D4308E]" },
    orange:  { border: "border-[#FF6A1F]", shadow: "shadow-[0_3px_0_0_#B8420A]", iconBg: "bg-[#FF6A1F]" },
    yellow:  { border: "border-[#FFD23F]", shadow: "shadow-[0_3px_0_0_#B8860B]", iconBg: "bg-[#FFD23F] text-[#3D1A00]" },
  };
  const s = styles[color] || styles.indigo;
  return (
    <div className={`bg-white border-2 ${s.border} ${s.shadow} rounded-2xl p-4 flex items-center gap-3`}>
      <div className={`w-10 h-10 rounded-xl ${s.iconBg} text-white flex items-center justify-center shadow-md flex-shrink-0`}>
        <Icon className="w-4 h-4" strokeWidth={2.5} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-foreground/60 font-extrabold truncate">{label}</p>
        <p className="text-xl font-black tabular-nums leading-tight">{value}</p>
      </div>
    </div>
  );
};

/* ─────────── Workspace preview cards ─────────── */

const TAG_PILL: Record<string, string> = {
  hot: "bg-[#FCE5F0] text-[#D4308E] border-[#D4308E]/30",
  warm: "bg-[#FFEFE0] text-[#FF6A1F] border-[#FF6A1F]/30",
  cold: "bg-[#E4E8FF] text-[#3C50E0] border-[#3C50E0]/30",
};

const STAGE_PILL: Record<string, string> = {
  new: "bg-[#E4E8FF] text-[#3C50E0]",
  qualification: "bg-[#FFF1D6] text-[#B8651A]",
  proposal: "bg-[#FFEFE0] text-[#FF6A1F]",
  closing: "bg-[#FFD23F]/30 text-[#7A4A00]",
  won: "bg-[#E6F7EE] text-[#0E8A4B]",
  lost: "bg-[#FCE5F0] text-[#D4308E]",
};

const PRIORITY_DOT: Record<string, string> = {
  low: "bg-foreground/40",
  medium: "bg-[#FFD23F]",
  high: "bg-[#FF6A1F]",
  urgent: "bg-[#D4308E] animate-pulse",
};

const fmtRelative = (s: string) => {
  const ms = Date.now() - new Date(s).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};

const WorkspacePreview = ({ userId }: { userId: string }) => {
  const { data: p, isLoading } = useQuery({
    queryKey: ["admin-ws-preview", userId],
    queryFn: () => adminApi.workspacePreview(userId),
    staleTime: 60_000,
  });

  if (isLoading || !p) {
    return (
      <div className="mt-4 grid lg:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white border-2 border-[#E8B968] rounded-2xl p-5 shadow-[0_3px_0_0_#E8B968] min-h-[200px] flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-[#FF6A1F]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4 grid lg:grid-cols-2 gap-3">
      {/* Recent contacts */}
      <PreviewCard title="Recent contacts" icon={UsersIcon} color="indigo" count={p.recentContacts.length}>
        {p.recentContacts.length === 0 ? (
          <Empty label="No contacts yet" />
        ) : (
          p.recentContacts.map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-2 border-b border-[#E8B968]/30 last:border-b-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3C50E0] to-[#1E40AF] text-white flex items-center justify-center text-[11px] font-extrabold flex-shrink-0">
                {c.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-extrabold truncate flex items-center gap-1.5">
                  {c.name}
                  {c.tag === "hot" && <Flame className="w-3 h-3 text-[#D4308E]" />}
                </p>
                <p className="text-[10px] text-foreground/60 font-mono truncate">{c.phone}</p>
              </div>
              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase border ${TAG_PILL[c.tag] ?? TAG_PILL.cold}`}>
                {c.tag}
              </span>
            </div>
          ))
        )}
      </PreviewCard>

      {/* Recent messages */}
      <PreviewCard title="Recent messages" icon={MessageSquare} color="magenta" count={p.recentMessages.length}>
        {p.recentMessages.length === 0 ? (
          <Empty label="No messages yet" />
        ) : (
          p.recentMessages.map((m) => (
            <div key={m.id} className="flex items-start gap-2 py-2 border-b border-[#E8B968]/30 last:border-b-0">
              <span
                className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center mt-0.5 ${
                  m.direction === "outbound" ? "bg-[#E6F7EE] text-[#0E8A4B]" : "bg-[#FFF1D6] text-[#B8651A]"
                }`}
              >
                {m.direction === "outbound" ? <Send className="w-3 h-3" /> : <Inbox className="w-3 h-3" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold truncate" title={m.body}>{m.body}</p>
                <p className="text-[10px] text-foreground/60 font-medium flex items-center gap-1.5">
                  <span>{m.direction}</span>
                  <span>·</span>
                  <span className="capitalize">{m.status}</span>
                  <span>·</span>
                  <span>{fmtRelative(m.createdAt)}</span>
                </p>
              </div>
            </div>
          ))
        )}
      </PreviewCard>

      {/* Recent deals */}
      <PreviewCard title="Recent deals" icon={Trophy} color="orange" count={p.recentDeals.length}>
        {p.recentDeals.length === 0 ? (
          <Empty label="No deals yet" />
        ) : (
          p.recentDeals.map((d) => (
            <div key={d.id} className="flex items-center gap-3 py-2 border-b border-[#E8B968]/30 last:border-b-0">
              <Trophy className="w-3.5 h-3.5 text-[#FF6A1F] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-extrabold truncate">{d.title}</p>
                <p className="text-[10px] text-foreground/60 font-medium">
                  <IndianRupee className="w-2.5 h-2.5 inline" />
                  {Number(d.value).toLocaleString("en-IN")} · {d.probability}% prob
                </p>
              </div>
              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase ${STAGE_PILL[d.stage] ?? STAGE_PILL.new}`}>
                {d.stage}
              </span>
            </div>
          ))
        )}
      </PreviewCard>

      {/* Recent tasks */}
      <PreviewCard title="Open tasks" icon={Clock} color="yellow" count={p.recentTasks.length}>
        {p.recentTasks.length === 0 ? (
          <Empty label="No tasks yet" />
        ) : (
          p.recentTasks.map((t) => {
            const overdue = t.dueAt && new Date(t.dueAt).getTime() < Date.now() && t.status !== "completed";
            return (
              <div key={t.id} className="flex items-center gap-3 py-2 border-b border-[#E8B968]/30 last:border-b-0">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[t.priority] ?? PRIORITY_DOT.medium}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-extrabold truncate flex items-center gap-1.5">
                    {t.title}
                    {t.status === "completed" && <CheckCheck className="w-3 h-3 text-[#0E8A4B]" />}
                  </p>
                  <p className={`text-[10px] font-medium ${overdue ? "text-[#D4308E]" : "text-foreground/60"}`}>
                    {overdue ? "Overdue · " : ""}
                    {t.dueAt ? new Date(t.dueAt).toLocaleDateString("en-IN") : "no due date"}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </PreviewCard>
    </div>
  );
};

const PreviewCard = ({
  title, icon: Icon, color, count, children,
}: {
  title: string;
  icon: typeof Building2;
  color: string;
  count: number;
  children: React.ReactNode;
}) => {
  const styles: Record<string, { border: string; shadow: string; iconBg: string }> = {
    indigo:  { border: "border-[#3C50E0]", shadow: "shadow-[0_3px_0_0_#2533A8]", iconBg: "bg-[#3C50E0]" },
    magenta: { border: "border-[#D4308E]", shadow: "shadow-[0_3px_0_0_#A11A6A]", iconBg: "bg-[#D4308E]" },
    orange:  { border: "border-[#FF6A1F]", shadow: "shadow-[0_3px_0_0_#B8420A]", iconBg: "bg-[#FF6A1F]" },
    yellow:  { border: "border-[#FFD23F]", shadow: "shadow-[0_3px_0_0_#E8B400]", iconBg: "bg-[#FFD23F] text-[#3D1A00]" },
  };
  const s = styles[color] ?? styles.indigo;
  return (
    <div className={`bg-white border-2 ${s.border} ${s.shadow} rounded-2xl p-4`}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-9 h-9 rounded-xl ${s.iconBg} text-white flex items-center justify-center shadow-md`}>
          <Icon className="w-4 h-4" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-black truncate">{title}</p>
          <p className="text-[10px] uppercase tracking-wider text-foreground/60 font-extrabold">{count} shown</p>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
};

const Empty = ({ label }: { label: string }) => (
  <p className="text-[11px] text-foreground/50 italic font-medium py-6 text-center">{label}</p>
);

export default AdminWorkspaceDetail;
