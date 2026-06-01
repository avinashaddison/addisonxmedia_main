import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { Building2, ArrowLeft, ShieldOff, ShieldCheck, Eye, Mail, Phone, Users as UsersIcon, MessageSquare, Inbox, Trophy, IndianRupee, Loader2, CheckCircle2, AlertTriangle, Flame, CheckCheck, Clock, Send, Download, Zap, Crown, Sparkles, Rocket, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/PageShell";

const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

type PlanKey = "free" | "starter" | "growth" | "scale" | "enterprise";

const PLAN_DEFAULT_MRR: Record<string, number> = {
  free: 0,
  starter: 999,
  growth: 2999,
  scale: 7999,
  enterprise: 0,
};

const PLAN_CATALOG: Array<{
  key: PlanKey;
  label: string;
  price: string;
  caption: string;
  icon: typeof Building2;
  border: string;
  ring: string;
  badge: string;
  iconBg: string;
}> = [
  { key: "free",       label: "Free",       price: "₹0",      caption: "Trial / waiver", icon: Gift,     border: "border-slate-350", ring: "ring-slate-100", badge: "bg-slate-100 text-slate-650", iconBg: "bg-slate-500" },
  { key: "starter",    label: "Starter",    price: "₹999",    caption: "/ month",        icon: Sparkles, border: "border-indigo-500", ring: "ring-indigo-100", badge: "bg-indigo-50 text-indigo-700", iconBg: "bg-indigo-600" },
  { key: "growth",     label: "Growth",     price: "₹2,999",  caption: "/ month",        icon: Rocket,   border: "border-emerald-500", ring: "ring-emerald-100", badge: "bg-emerald-50 text-emerald-700", iconBg: "bg-emerald-600" },
  { key: "scale",      label: "Scale",      price: "₹7,999",  caption: "/ month",        icon: Zap,      border: "border-orange-500", ring: "ring-orange-100", badge: "bg-orange-50 text-orange-705", iconBg: "bg-orange-600" },
  { key: "enterprise", label: "Enterprise", price: "Custom",  caption: "Negotiated",     icon: Crown,    border: "border-purple-500", ring: "ring-purple-100", badge: "bg-purple-50 text-purple-700", iconBg: "bg-purple-600" },
];

const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: typeof Building2; color: string }) => {
  const styles: Record<string, { border: string; shadow: string; iconBg: string; text: string }> = {
    indigo:  { border: "border-[#3C50E0]", shadow: "shadow-[0_4px_0_0_#2533A8]", iconBg: "bg-[#3C50E0]", text: "text-slate-800" },
    emerald: { border: "border-[#0E8A4B]", shadow: "shadow-[0_4px_0_0_#0A6E3C]", iconBg: "bg-[#0E8A4B]", text: "text-slate-805" },
    magenta: { border: "border-[#D4308E]", shadow: "shadow-[0_4px_0_0_#A11A6A]", iconBg: "bg-[#D4308E]", text: "text-slate-800" },
    orange:  { border: "border-[#FF6A1F]", shadow: "shadow-[0_4px_0_0_#B8420A]", iconBg: "bg-[#FF6A1F]", text: "text-slate-805" },
    yellow:  { border: "border-[#E8B968]", shadow: "shadow-[0_4px_0_0_#B8651A]", iconBg: "bg-[#B8651A]", text: "text-slate-800" },
  };
  const s = styles[color] || styles.indigo;
  return (
    <div className={cn("bg-white border-2 rounded-2xl p-4 flex items-center gap-3 transition-all duration-200", s.border, s.shadow)}>
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 text-white", s.iconBg)}>
        <Icon className="w-4.5 h-4.5" strokeWidth={2.5} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold truncate">{label}</p>
        <p className={cn("text-xl font-black tabular-nums leading-none mt-1", s.text)}>{value}</p>
      </div>
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
    indigo:  { border: "border-[#3C50E0]", shadow: "shadow-[0_4px_0_0_#2533A8]", iconBg: "bg-[#3C50E0]" },
    magenta: { border: "border-[#D4308E]", shadow: "shadow-[0_4px_0_0_#A11A6A]", iconBg: "bg-[#D4308E]" },
    orange:  { border: "border-[#FF6A1F]", shadow: "shadow-[0_4px_0_0_#B8420A]", iconBg: "bg-[#FF6A1F]" },
    yellow:  { border: "border-[#E8B968]", shadow: "shadow-[0_4px_0_0_#B8651A]", iconBg: "bg-[#B8651A]" },
  };
  const s = styles[color] ?? styles.indigo;
  return (
    <div className={cn("bg-white border-2 rounded-2xl p-5 transition-all duration-200", s.border, s.shadow)}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shadow-md text-white flex-shrink-0", s.iconBg)}>
          <Icon className="w-4.5 h-4.5" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-black text-slate-800 truncate">{title}</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{count} shown</p>
        </div>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
};

const Empty = ({ label }: { label: string }) => (
  <p className="text-[11px] text-slate-400 italic font-medium py-6 text-center">{label}</p>
);

const TAG_PILL: Record<string, string> = {
  hot: "bg-rose-50 text-rose-700 border-rose-200",
  warm: "bg-amber-50 text-amber-705 border-amber-200",
  cold: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

const STAGE_PILL: Record<string, string> = {
  new: "bg-indigo-50 text-indigo-700 border border-indigo-150",
  qualification: "bg-amber-50 text-amber-700 border border-amber-150",
  proposal: "bg-orange-50 text-orange-700 border border-orange-150",
  closing: "bg-purple-50 text-purple-700 border border-purple-150",
  won: "bg-emerald-50 text-emerald-705 border border-emerald-150",
  lost: "bg-rose-50 text-rose-705 border border-rose-150",
};

const PRIORITY_DOT: Record<string, string> = {
  low: "bg-slate-350",
  medium: "bg-[#FFD23F]",
  high: "bg-[#FF6A1F]",
  urgent: "bg-rose-600 animate-pulse",
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
      <div className="mt-4 grid lg:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm min-h-[200px] flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-[#0E8A4B]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4 grid lg:grid-cols-2 gap-4">
      {/* Recent contacts */}
      <PreviewCard title="Recent contacts" icon={UsersIcon} color="indigo" count={p.recentContacts.length}>
        {p.recentContacts.length === 0 ? (
          <Empty label="No contacts yet" />
        ) : (
          p.recentContacts.map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-b-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF6A1F] to-[#D4308E] text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                {c.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-slate-805 truncate flex items-center gap-1.5">
                  {c.name}
                  {c.tag === "hot" && <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />}
                </p>
                <p className="text-[10px] text-slate-400 font-mono truncate">{c.phone}</p>
              </div>
              <span className={cn("text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase border leading-none", TAG_PILL[c.tag] ?? TAG_PILL.cold)}>
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
            <div key={m.id} className="flex items-start gap-2 py-2 border-b border-slate-100 last:border-b-0">
              <span
                className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center mt-0.5 ${
                  m.direction === "outbound" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                {m.direction === "outbound" ? <Send className="w-3 h-3" /> : <Inbox className="w-3 h-3" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-slate-700 truncate" title={m.body}>{m.body}</p>
                <p className="text-[10px] text-slate-450 font-semibold flex items-center gap-1.5">
                  <span className="uppercase text-[9px] tracking-wide font-bold">{m.direction}</span>
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
            <div key={d.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-b-0">
              <Trophy className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-slate-800 truncate">{d.title}</p>
                <p className="text-[10px] text-slate-400 font-medium">
                  <IndianRupee className="w-2.5 h-2.5 inline text-slate-405" />
                  {Number(d.value).toLocaleString("en-IN")} · {d.probability}% prob
                </p>
              </div>
              <span className={cn("text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase border leading-none", STAGE_PILL[d.stage] ?? STAGE_PILL.new)}>
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
              <div key={t.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-b-0">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[t.priority] ?? PRIORITY_DOT.medium}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-slate-800 truncate flex items-center gap-1.5">
                    {t.title}
                    {t.status === "completed" && <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />}
                  </p>
                  <p className={`text-[10px] font-semibold ${overdue ? "text-rose-650" : "text-slate-405"}`}>
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

const AdminWorkspaceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [impersOpen, setImpersOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [plan, setPlan] = useState("");
  const [mrr, setMrr] = useState("");
  const [trialEndsAt, setTrialEndsAt] = useState<string>("");
  const [mrrTouched, setMrrTouched] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: w, isLoading } = useQuery({
    queryKey: ["admin-workspace", id],
    queryFn: () => adminApi.workspaceDetail(id!),
    enabled: !!id,
  });

  if (isLoading || !w) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] bg-[#FFF6E8]">
        <Loader2 className="w-6 h-6 animate-spin text-[#0E8A4B]" />
      </div>
    );
  }

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-workspace", id] });

  const openEdit = () => {
    setPlan(w.plan);
    setMrr(String(w.mrrInr ?? 0));
    setTrialEndsAt(w.trialEndsAt ? new Date(w.trialEndsAt).toISOString().slice(0, 10) : "");
    setMrrTouched(false);
    setEditOpen(true);
  };

  const pickPlan = (next: string) => {
    setPlan(next);
    if (!mrrTouched) {
      const def = PLAN_DEFAULT_MRR[next];
      if (def !== undefined) setMrr(String(def));
    }
  };

  const saveEdit = async () => {
    setSubmitting(true);
    try {
      await adminApi.updateWorkspace(id!, {
        plan,
        mrrInr: Number(mrr || 0),
        trialEndsAt: trialEndsAt ? new Date(trialEndsAt).toISOString() : null,
      });
      toast.success(`Plan set to ${plan}`);
      setEditOpen(false);
      refresh();
    } catch (e) { toast.error(String(e)); }
    finally { setSubmitting(false); }
  };

  const extendTrialDays = (days: number) => {
    const base = trialEndsAt ? new Date(trialEndsAt) : new Date();
    base.setDate(base.getDate() + days);
    setTrialEndsAt(base.toISOString().slice(0, 10));
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

  const headerActions = (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={openEdit}
        className="px-3.5 py-2 rounded-xl bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] text-slate-805 hover:bg-[#FFF1D6] font-extrabold text-[12px] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] transition-all flex items-center gap-1.5"
      >
        <Zap className="w-4 h-4 text-[#B8651A]" strokeWidth={2.5} /> Set plan
      </button>
      <button
        onClick={() => { setReason(""); setImpersOpen(true); }}
        className="px-3.5 py-2 rounded-xl bg-[#0E8A4B] border-2 border-[#0A6E3C] shadow-[0_2px_0_0_#073D22] text-white font-extrabold text-[12px] hover:bg-[#0A6E3C] hover:translate-y-0.5 transition-all flex items-center gap-1.5"
      >
        <Eye className="w-4 h-4 text-white" strokeWidth={2.5} /> Impersonate
      </button>
      <button
        onClick={() => { window.location.href = adminApi.workspaceExportContactsUrl(id!); }}
        className="px-3.5 py-2 rounded-xl bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] text-slate-805 hover:bg-[#FFF1D6] font-extrabold text-[12px] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] transition-all flex items-center gap-1.5"
      >
        <Download className="w-4 h-4 text-slate-500" strokeWidth={2.5} /> Export
      </button>
      {isSuspended ? (
        <button
          onClick={doUnsuspend}
          className="px-3.5 py-2 rounded-xl bg-[#0E8A4B] border-2 border-[#0A6E3C] shadow-[0_2px_0_0_#073D22] text-white font-extrabold text-[12px] hover:bg-[#0A6E3C] hover:translate-y-0.5 transition-all flex items-center gap-1.5"
        >
          <ShieldCheck className="w-4 h-4 text-white" strokeWidth={2.5} /> Unsuspend
        </button>
      ) : (
        <button
          onClick={() => { setReason(""); setSuspendOpen(true); }}
          className="px-3.5 py-2 rounded-xl bg-[#EF4444] border-2 border-[#B91C1C] shadow-[0_2px_0_0_#991B1B] text-white font-extrabold text-[12px] hover:bg-[#B91C1C] hover:translate-y-0.5 transition-all flex items-center gap-1.5"
        >
          <ShieldOff className="w-4 h-4 text-white" strokeWidth={2.5} /> Suspend
        </button>
      )}
    </div>
  );

  return (
    <PageShell
      title={w.name}
      subtitle={w.email}
      icon={<Building2 className="w-5 h-5 text-white" strokeWidth={2.5} />}
      actions={headerActions}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        <Link to="/admin/workspaces" className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-[#0E8A4B] hover:underline mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to workspaces
        </Link>

        {/* Info card (Brutalist gold border) */}
        <div className="bg-white border-2 border-[#E8B968] rounded-2xl p-5 shadow-[0_4px_0_0_#E8B968] relative overflow-hidden">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-14 h-14 rounded-2xl bg-[#FFF1D6] border-2 border-[#E8B968] text-[#B8651A] flex items-center justify-center shadow-sm flex-shrink-0">
              <Building2 className="w-7 h-7" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-black tracking-tight text-slate-850">{w.name}</h2>
                <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-650">
                  {w.plan}
                </span>
                {isSuspended ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 border-2 border-rose-200 text-rose-700 text-[10px] font-bold uppercase tracking-wider leading-none">
                    <ShieldOff className="w-3.5 h-3.5" /> Suspended
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E6F7EE] border-2 border-[#0E8A4B]/20 text-[#0A6E3C] text-[10px] font-bold uppercase tracking-wider leading-none">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active
                  </span>
                )}
              </div>
              <p className="text-[12.5px] text-slate-500 font-mono mt-1">{w.email}</p>
              <p className="text-[11.5px] text-slate-400 font-semibold mt-0.5">Joined {new Date(w.createdAt).toLocaleString("en-IN")}</p>
              {isSuspended && w.suspendedReason && (
                <div className="mt-3 p-3 rounded-xl bg-rose-50 border-2 border-rose-200 text-rose-850">
                  <p className="text-[10px] uppercase tracking-wider text-rose-700 font-extrabold mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Suspended reason
                  </p>
                  <p className="text-[12px] font-semibold">{w.suspendedReason}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Contacts" value={w.counts.contacts} icon={UsersIcon} color="indigo" />
          <StatCard label="Conversations" value={w.counts.conversations} icon={Inbox} color="emerald" />
          <StatCard label="Messages" value={w.counts.messages} icon={MessageSquare} color="magenta" />
          <StatCard label="Deals" value={w.counts.deals} icon={Trophy} color="orange" />
          <StatCard label="Won revenue" value={fmtINR(w.counts.revenueInr)} icon={IndianRupee} color="yellow" />
        </div>

        {/* Meta WhatsApp (Outlined emerald) */}
        <div className="bg-white border-2 border-[#0E8A4B] rounded-2xl p-5 shadow-[0_4px_0_0_#0A6E3C]">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#E6F7EE] text-[#0A6E3C] border border-[#0E8A4B]/20 flex items-center justify-center shadow-sm">
              <Phone className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <h3 className="font-black tracking-tight text-slate-800">Meta WhatsApp Business</h3>
          </div>
          {w.meta?.enabled ? (
            <p className="text-[13px] font-bold text-slate-700">
              ✅ Connected · <span className="font-mono">{w.meta.displayPhoneNumber}</span>
            </p>
          ) : (
            <p className="text-[13px] font-semibold text-slate-400">Not connected · running in dry-run mode</p>
          )}
        </div>

        {/* Preview cards */}
        <WorkspacePreview userId={id!} />

        {/* Set plan dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-[640px] border-2 border-[#E8B968]">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-11 h-11 rounded-xl bg-[#FFF1D6] border-2 border-[#E8B968] text-[#B8651A] flex items-center justify-center shadow-sm">
                  <Zap className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div>
                  <DialogTitle>Set plan for {w.name}</DialogTitle>
                  <DialogDescription>
                    Instantly activate any plan. MRR auto-fills — override if discounted. Logged in audit.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {/* Plan grid */}
              <div>
                <Label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Choose plan</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2">
                  {PLAN_CATALOG.map((p) => {
                    const Icon = p.icon;
                    const selected = plan === p.key;
                    const current = w.plan === p.key;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => pickPlan(p.key)}
                        className={`relative text-left p-3 rounded-xl border-2 transition-all bg-white ${
                          selected
                            ? `border-[#0E8A4B] shadow-[0_3px_0_0_#0A6E3C] -translate-y-0.5`
                            : "border-slate-200 hover:border-slate-350 hover:-translate-y-0.5"
                        }`}
                      >
                        {current && (
                          <span className="absolute top-1.5 right-1.5 text-[8.5px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#E6F7EE] text-[#0A6E3C] border border-[#0E8A4B]/20 leading-none">
                            Now
                          </span>
                        )}
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={`w-8 h-8 rounded-lg ${p.iconBg} text-white flex items-center justify-center shadow-sm`}>
                            <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                          </div>
                          <p className="text-[13px] font-black text-slate-805">{p.label}</p>
                        </div>
                        <p className="text-[15px] font-black tabular-nums text-slate-900 leading-none">{p.price}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">{p.caption}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* MRR + Trial row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>MRR (₹/month)</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input
                      type="number"
                      value={mrr}
                      onChange={(e) => { setMrr(e.target.value); setMrrTouched(true); }}
                      className="pl-9 font-mono font-bold border-2 border-slate-200 focus-visible:ring-[#0E8A4B]"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    {mrrTouched ? "Manual override" : `Default for ${plan}`}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Trial ends (optional)</Label>
                  <Input
                    type="date"
                    value={trialEndsAt}
                    onChange={(e) => setTrialEndsAt(e.target.value)}
                    className="border-2 border-slate-200 focus-visible:ring-[#0E8A4B]"
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    <button type="button" onClick={() => extendTrialDays(7)} className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded bg-[#FFF6E8] text-[#B8651A] border border-[#E8B968] hover:bg-[#FFE8C7] transition-all">
                      +7d
                    </button>
                    <button type="button" onClick={() => extendTrialDays(14)} className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded bg-[#FFF6E8] text-[#B8651A] border border-[#E8B968] hover:bg-[#FFE8C7] transition-all">
                      +14d
                    </button>
                    <button type="button" onClick={() => extendTrialDays(30)} className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded bg-[#FFF6E8] text-[#B8651A] border border-[#E8B968] hover:bg-[#FFE8C7] transition-all">
                      +30d
                    </button>
                    <button type="button" onClick={() => setTrialEndsAt("")} className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded bg-white text-slate-400 border border-slate-200 hover:bg-slate-50 transition-all">
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {/* Preview strip */}
              <div className="rounded-xl bg-[#E6F7EE] border-2 border-[#0E8A4B]/20 p-3 flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-[#0E8A4B] flex-shrink-0" />
                <div className="text-[12px] font-extrabold text-slate-700 flex-1">
                  {plan === w.plan && Number(mrr || 0) === Number(w.mrrInr ?? 0) ? (
                    <span className="text-slate-400 font-semibold">No changes — adjust plan or MRR to activate.</span>
                  ) : (
                    <>
                      Will set <span className="font-black uppercase text-[#0E8A4B]">{plan}</span> at <span className="font-black tabular-nums">{fmtINR(Number(mrr || 0))}</span>/mo
                      {trialEndsAt ? <> · trial ends <span className="font-black text-[#0E8A4B]">{new Date(trialEndsAt).toLocaleDateString("en-IN")}</span></> : null}
                    </>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)} className="border-slate-250 font-bold">Cancel</Button>
              <button
                onClick={saveEdit}
                disabled={submitting || !plan}
                className="px-4 py-2 rounded-xl bg-[#0E8A4B] border-2 border-[#0A6E3C] shadow-[0_2px_0_0_#073D22] text-white font-extrabold text-[12px] hover:bg-[#0A6E3C] transition-all flex items-center gap-1.5"
              >
                {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Activating…</> : <><Zap className="w-3.5 h-3.5 text-[#FFD23F]" strokeWidth={2.5} /> Activate plan</>}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Impersonate dialog */}
        <Dialog open={impersOpen} onOpenChange={setImpersOpen}>
          <DialogContent className="border-2 border-[#0E8A4B]">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-11 h-11 rounded-xl bg-[#E6F7EE] border-2 border-[#0E8A4B]/20 text-[#0A6E3C] flex items-center justify-center shadow-sm">
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
                className="border-2 border-slate-200 focus-visible:ring-[#0E8A4B]"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setImpersOpen(false)} className="border-slate-250 font-bold">Cancel</Button>
              <button
                onClick={doImpersonate}
                disabled={submitting || reason.length < 10}
                className="px-4 py-2 rounded-xl bg-[#0E8A4B] border-2 border-[#0A6E3C] shadow-[0_2px_0_0_#073D22] text-white font-extrabold text-[12px] hover:bg-[#0A6E3C] transition-all flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5 text-white" strokeWidth={2.5} /> Start impersonation
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Suspend dialog */}
        <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
          <DialogContent className="border-2 border-rose-500">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-11 h-11 rounded-xl bg-rose-50 border-2 border-rose-200 text-rose-605 flex items-center justify-center shadow-sm">
                  <ShieldOff className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div>
                  <DialogTitle>Suspend {w.name}?</DialogTitle>
                  <DialogDescription>
                    All inbound/outbound messaging stops immediately. Reason will be logged for compliance.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-1.5 mt-2">
              <Label>Reason (logged forever)</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. spam complaint from Meta"
                autoFocus
                className="border-2 border-slate-200 focus-visible:ring-rose-500"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSuspendOpen(false)} className="border-slate-250 font-bold">Cancel</Button>
              <button
                onClick={doSuspend}
                disabled={submitting || reason.length < 5}
                className="px-4 py-2 rounded-xl bg-rose-600 border-2 border-rose-700 shadow-[0_2px_0_0_#991B1B] text-white font-extrabold text-[12px] hover:bg-rose-700 transition-all flex items-center gap-1"
              >
                {submitting ? "Suspending…" : "Suspend account"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  );
};

export default AdminWorkspaceDetail;
