import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { Building2, ArrowLeft, ShieldOff, ShieldCheck, Eye, Mail, Phone, Users as UsersIcon, MessageSquare, Inbox, Trophy, IndianRupee, Loader2, CheckCircle2, AlertTriangle, Flame, CheckCheck, Clock, Send, Download, Zap, Crown, Sparkles, Rocket, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-650" />
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

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 space-y-6">
      <Link to="/admin/workspaces" className="inline-flex items-center gap-1.5 text-[12px] font-bold text-indigo-600 hover:underline mb-2">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to workspaces
      </Link>

      {/* Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm mb-4">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex items-center justify-center shadow-sm flex-shrink-0">
            <Building2 className="w-7 h-7 text-indigo-400" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">{w.name}</h1>
              <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-650">
                {w.plan}
              </span>
              {isSuspended ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold uppercase tracking-wider">
                  <ShieldOff className="w-3 h-3" /> Suspended
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
              )}
            </div>
            <p className="text-[12px] text-slate-500 font-mono mt-1">{w.email}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Joined {new Date(w.createdAt).toLocaleString("en-IN")}</p>
            {isSuspended && w.suspendedReason && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-850">
                <p className="text-[10px] uppercase tracking-wider text-rose-700 font-bold mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Suspended reason
                </p>
                <p className="text-[12px] font-semibold">{w.suspendedReason}</p>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={openEdit} className="border-slate-250 hover:bg-slate-50 transition active:scale-[0.98]">
              <Zap className="w-3.5 h-3.5" /> Set plan
            </Button>
            <Button onClick={() => { setReason(""); setImpersOpen(true); }} className="bg-slate-900 text-white hover:bg-slate-800 transition active:scale-[0.98]">
              <Eye className="w-3.5 h-3.5" /> Impersonate
            </Button>
            <Button
              variant="outline"
              onClick={() => { window.location.href = adminApi.workspaceExportContactsUrl(id!); }}
              className="border-slate-250 hover:bg-slate-50 transition active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5" /> Export contacts
            </Button>
            {isSuspended ? (
              <Button variant="outline" onClick={doUnsuspend} className="border-slate-250 hover:bg-slate-50 text-emerald-700 hover:text-emerald-800 transition active:scale-[0.98]">
                <ShieldCheck className="w-3.5 h-3.5" /> Unsuspend
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="bg-rose-600 hover:bg-rose-700 transition active:scale-[0.98]">
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
                    <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. spam complaint from Meta" autoFocus className="border-slate-200 focus-visible:ring-indigo-600" />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={doSuspend} disabled={submitting} className="bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.98] transition">
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
      <div className="mt-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shadow-sm">
            <Phone className="w-4 h-4" />
          </div>
          <h3 className="font-black tracking-tight text-slate-800">Meta WhatsApp Business</h3>
        </div>
        {w.meta?.enabled ? (
          <p className="text-[13px] font-semibold text-slate-700">
            ✅ Connected · <span className="font-mono">{w.meta.displayPhoneNumber}</span>
          </p>
        ) : (
          <p className="text-[13px] font-semibold text-slate-400">Not connected · running in dry-run mode</p>
        )}
      </div>

      {/* Preview cards — read-only peek at customer data to reduce impersonation churn */}
      <WorkspacePreview userId={id!} />

      {/* Set plan dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex items-center justify-center shadow-sm">
                <Zap className="w-5 h-5 text-indigo-400" strokeWidth={2.2} />
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
              <Label className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Choose plan</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {PLAN_CATALOG.map((p) => {
                  const Icon = p.icon;
                  const selected = plan === p.key;
                  const current = w.plan === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => pickPlan(p.key)}
                      className={`relative text-left p-3 rounded-xl border transition-all bg-white ${
                        selected
                          ? `${p.border} ring-4 ${p.ring} shadow-md -translate-y-0.5`
                          : "border-slate-200 hover:border-slate-350 hover:-translate-y-0.5"
                      }`}
                    >
                      {current && (
                        <span className="absolute top-1.5 right-1.5 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-650 border border-indigo-100">
                          Now
                        </span>
                      )}
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`w-8 h-8 rounded-lg ${p.iconBg} text-white flex items-center justify-center shadow-sm`}>
                          <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </div>
                        <p className="text-[13px] font-black text-slate-805">{p.label}</p>
                      </div>
                      <p className="text-[15px] font-black tabular-nums text-slate-900">{p.price}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{p.caption}</p>
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
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-405" />
                  <Input
                    type="number"
                    value={mrr}
                    onChange={(e) => { setMrr(e.target.value); setMrrTouched(true); }}
                    className="pl-9 font-mono font-bold border-slate-200 focus-visible:ring-indigo-600"
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  {mrrTouched ? "Manual override" : `Default for ${plan}`}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Trial ends (optional)</Label>
                <Input
                  type="date"
                  value={trialEndsAt}
                  onChange={(e) => setTrialEndsAt(e.target.value)}
                  className="border-slate-200 focus-visible:ring-indigo-600"
                />
                <div className="flex gap-1.5 mt-1.5">
                  <button type="button" onClick={() => extendTrialDays(7)} className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors">
                    +7d
                  </button>
                  <button type="button" onClick={() => extendTrialDays(14)} className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors">
                    +14d
                  </button>
                  <button type="button" onClick={() => extendTrialDays(30)} className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors">
                    +30d
                  </button>
                  <button type="button" onClick={() => setTrialEndsAt("")} className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-white text-slate-400 border border-slate-200 hover:bg-slate-50 transition-colors">
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Preview strip */}
            <div className="rounded-xl bg-slate-55 border border-slate-200 p-3 flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div className="text-[12px] font-semibold text-slate-700 flex-1">
                {plan === w.plan && Number(mrr || 0) === Number(w.mrrInr ?? 0) ? (
                  <span className="text-slate-400">No changes — adjust plan or MRR to activate.</span>
                ) : (
                  <>
                    Will set <span className="font-black uppercase text-indigo-600">{plan}</span> at <span className="font-black tabular-nums">{fmtINR(Number(mrr || 0))}</span>/mo
                    {trialEndsAt ? <> · trial ends <span className="font-black text-indigo-650">{new Date(trialEndsAt).toLocaleDateString("en-IN")}</span></> : null}
                  </>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} className="border-slate-250">Cancel</Button>
            <Button
              onClick={saveEdit}
              disabled={submitting || !plan}
              className="bg-emerald-600 text-white hover:bg-emerald-700 transition active:scale-[0.98]"
            >
              {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Activating…</> : <><Zap className="w-3.5 h-3.5" /> Activate plan</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Impersonate dialog */}
      <Dialog open={impersOpen} onOpenChange={setImpersOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex items-center justify-center shadow-sm">
                <Eye className="w-5 h-5 text-indigo-400" strokeWidth={2.2} />
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
              className="border-slate-200 focus-visible:ring-indigo-600"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImpersOpen(false)} className="border-slate-250">Cancel</Button>
            <Button onClick={doImpersonate} disabled={submitting || reason.length < 10} className="bg-slate-900 text-white hover:bg-slate-800 transition active:scale-[0.98]">
              <Eye className="w-3.5 h-3.5" /> Start impersonation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: typeof Building2; color: string }) => {
  const styles: Record<string, { iconClass: string }> = {
    indigo:  { iconClass: "bg-indigo-55 border-indigo-100 text-indigo-600" },
    emerald: { iconClass: "bg-emerald-55 border-emerald-100 text-emerald-600" },
    magenta: { iconClass: "bg-pink-55 border-pink-100 text-pink-605" },
    orange:  { iconClass: "bg-orange-55 border-orange-100 text-orange-600" },
    yellow:  { iconClass: "bg-amber-55 border-amber-100 text-amber-705" },
  };
  const s = styles[color] || styles.indigo;
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:border-slate-300 hover:shadow-md transition-all duration-200">
      <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center shadow-sm flex-shrink-0", s.iconClass)}>
        <Icon className="w-4.5 h-4.5" strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold truncate">{label}</p>
        <p className="text-xl font-black text-slate-850 tabular-nums leading-tight">{value}</p>
      </div>
    </div>
  );
};

/* ─────────── Workspace preview cards ─────────── */

const TAG_PILL: Record<string, string> = {
  hot: "bg-rose-50 text-rose-700 border-rose-200",
  warm: "bg-amber-50 text-amber-705 border-amber-200",
  cold: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

const STAGE_PILL: Record<string, string> = {
  new: "bg-indigo-55 text-indigo-700 border border-indigo-150",
  qualification: "bg-amber-55 text-amber-700 border border-amber-150",
  proposal: "bg-orange-55 text-orange-700 border border-orange-150",
  closing: "bg-purple-55 text-purple-700 border border-purple-150",
  won: "bg-emerald-55 text-emerald-705 border border-emerald-150",
  lost: "bg-rose-55 text-rose-705 border border-rose-150",
};

const PRIORITY_DOT: Record<string, string> = {
  low: "bg-slate-300",
  medium: "bg-amber-400",
  high: "bg-orange-500",
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
          <div key={i} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm min-h-[200px] flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-650" />
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
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                {c.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-slate-805 truncate flex items-center gap-1.5">
                  {c.name}
                  {c.tag === "hot" && <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />}
                </p>
                <p className="text-[10px] text-slate-400 font-mono truncate">{c.phone}</p>
              </div>
              <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase border", TAG_PILL[c.tag] ?? TAG_PILL.cold)}>
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
            <div key={m.id} className="flex items-start gap-2 py-2 border-b border-slate-105 last:border-b-0">
              <span
                className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center mt-0.5 ${
                  m.direction === "outbound" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                {m.direction === "outbound" ? <Send className="w-3 h-3" /> : <Inbox className="w-3 h-3" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-slate-700 truncate" title={m.body}>{m.body}</p>
                <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
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
              <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase border", STAGE_PILL[d.stage] ?? STAGE_PILL.new)}>
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
                  <p className={`text-[10px] font-medium ${overdue ? "text-rose-600" : "text-slate-400"}`}>
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
  const styles: Record<string, { iconClass: string }> = {
    indigo:  { iconClass: "bg-indigo-50 border-indigo-100 text-indigo-600" },
    magenta: { iconClass: "bg-pink-50 border-pink-100 text-pink-600" },
    orange:  { iconClass: "bg-orange-50 border-orange-100 text-orange-600" },
    yellow:  { iconClass: "bg-amber-50 border-amber-100 text-amber-700" },
  };
  const s = styles[color] ?? styles.indigo;
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:border-slate-350 hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-2.5 mb-4">
        <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center shadow-sm", s.iconClass)}>
          <Icon className="w-4.5 h-4.5" strokeWidth={2.2} />
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

export default AdminWorkspaceDetail;
