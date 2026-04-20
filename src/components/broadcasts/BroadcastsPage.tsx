import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Radio, Plus, Send, Calendar, Users, FileText, CheckCircle2, Sparkles, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBroadcasts, useCreateBroadcast, useDeleteBroadcast, Broadcast } from "@/hooks/useCrmData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { Database } from "@/integrations/supabase/types";
import { formatRelative } from "@/lib/inbox-types";

type Tag = Database["public"]["Enums"]["lead_tag"];
type Status = Database["public"]["Enums"]["broadcast_status"];

const statusStyle: Record<Status, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-warning-soft text-warning",
  sending: "bg-accent-soft text-accent",
  sent: "bg-success-soft text-success",
  failed: "bg-hot-soft text-hot",
};

const templates = [
  { id: "1", name: "welcome_message", category: "utility", approved: true, preview: "Hi {{1}}! 👋 Welcome to AddisonX. Your account is ready." },
  { id: "2", name: "diwali_offer_2026", category: "marketing", approved: true, preview: "🪔 Diwali Special! Get 30% off Premium until Nov 15. Reply YES." },
  { id: "3", name: "appointment_reminder", category: "utility", approved: true, preview: "Reminder: Your demo is at {{1}}. Reply RESCHEDULE if needed." },
];

export const BroadcastsPage = () => {
  const { data: broadcasts = [], isLoading } = useBroadcasts();
  const [composer, setComposer] = useState({ title: "", body: "Hi {{1}}, here's something you'll love…", audience: "hot" as Tag });

  const total = broadcasts.length;
  const sent = broadcasts.filter((b) => b.status === "sent").length;
  const totalReached = broadcasts.reduce((a, b) => a + b.delivered_count, 0);

  return (
    <PageShell
      title="Broadcasts"
      subtitle="One-time WhatsApp blasts to a targeted segment"
      icon={<Radio className="w-4 h-4" />}
      actions={<NewBroadcastDialog />}
    >
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatTile label="Total Broadcasts" value={total} icon={<Radio className="w-4 h-4" />} accent="primary" />
        <StatTile label="Successfully Sent" value={sent} icon={<CheckCircle2 className="w-4 h-4" />} accent="success" />
        <StatTile label="People Reached" value={totalReached.toLocaleString()} icon={<Users className="w-4 h-4" />} accent="accent" />
      </div>

      {/* Composer + Live preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-[13px] font-bold uppercase tracking-wider">Quick compose</h3>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="qtitle">Title</Label>
              <Input id="qtitle" value={composer.title} onChange={(e) => setComposer({ ...composer, title: e.target.value })} placeholder="Diwali sale blast" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qbody">Message</Label>
              <Textarea id="qbody" value={composer.body} onChange={(e) => setComposer({ ...composer, body: e.target.value })} rows={4} className="resize-none" />
              <p className="text-[10px] text-muted-foreground">Use {`{{1}}`} for first name, {`{{2}}`} for offer code.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Audience</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["hot", "warm", "cold"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setComposer({ ...composer, audience: t })}
                    className={cn(
                      "h-11 rounded-lg border text-[12px] font-semibold capitalize transition-all",
                      composer.audience === t ? "border-primary bg-primary-soft text-primary" : "border-border bg-card text-muted-foreground hover:border-muted-foreground"
                    )}
                  >
                    {t === "hot" ? "🔥" : t === "warm" ? "🟡" : "❄️"} {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Phone preview */}
        <div className="bg-gradient-to-br from-primary-soft via-card to-success-soft border border-border rounded-2xl p-5 flex flex-col">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Live Preview</p>
          <div className="flex-1 bg-[hsl(var(--chat-bg))] rounded-xl border border-border p-3 flex flex-col gap-2 min-h-[260px] relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_1px_1px,_currentColor_1px,_transparent_0)] bg-[length:12px_12px]" />
            <div className="relative self-start max-w-[85%] bg-[hsl(var(--chat-incoming))] rounded-2xl rounded-bl-md px-3 py-2 shadow-sm">
              <p className="text-[12px] leading-relaxed whitespace-pre-wrap break-words">
                {composer.body.replace(/\{\{1\}\}/g, "Priya").replace(/\{\{2\}\}/g, "DIWALI30") || "Your message preview…"}
              </p>
              <p className="text-[9px] text-muted-foreground mt-1">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-bold">Broadcast History</h3>
        <span className="text-[11px] text-muted-foreground">{total} total</span>
      </div>

      {isLoading && <div className="bg-card border border-border rounded-xl p-8 text-center text-[13px] text-muted-foreground">Loading…</div>}

      {!isLoading && broadcasts.length === 0 && (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-primary-soft mx-auto mb-3 flex items-center justify-center"><Radio className="w-5 h-5 text-primary" /></div>
          <p className="text-[14px] font-semibold mb-1">No broadcasts yet</p>
          <p className="text-[12px] text-muted-foreground">Click "New Broadcast" above to send your first blast.</p>
        </div>
      )}

      <div className="space-y-2 mb-6">
        {broadcasts.map((b) => (
          <BroadcastRow key={b.id} broadcast={b} />
        ))}
      </div>

      {/* Templates */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-bold">Approved Templates</h3>
        <Button variant="outline" size="sm" className="gap-2" disabled><Plus className="w-3.5 h-3.5" />Submit Template</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {templates.map((t) => (
          <div key={t.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <code className="text-[12px] font-mono font-semibold truncate">{t.name}</code>
              {t.approved && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-success">
                  <CheckCircle2 className="w-3 h-3" /> Approved
                </span>
              )}
            </div>
            <p className="text-[12px] text-muted-foreground bg-muted/40 rounded-lg p-2.5 leading-relaxed">{t.preview}</p>
          </div>
        ))}
      </div>
    </PageShell>
  );
};

const BroadcastRow = ({ broadcast: b }: { broadcast: Broadcast }) => {
  const del = useDeleteBroadcast();
  const reachRate = b.recipient_count ? Math.round((b.delivered_count / b.recipient_count) * 100) : 0;
  return (
    <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 hover:shadow-sm transition-all group">
      <div className="w-10 h-10 rounded-lg bg-primary-soft text-primary flex items-center justify-center flex-shrink-0"><Radio className="w-4 h-4" /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-[13px] font-semibold truncate">{b.title}</span>
          <span className={cn("text-[9px] font-bold uppercase px-1.5 py-0.5 rounded", statusStyle[b.status])}>{b.status}</span>
          {b.audience_tag && <span className="text-[10px] text-muted-foreground">· {b.audience_tag}</span>}
        </div>
        <p className="text-[11px] text-muted-foreground truncate">{b.body}</p>
      </div>
      <div className="hidden md:flex items-center gap-4 text-[11px] flex-shrink-0">
        <div className="text-center">
          <p className="font-bold tabular-nums">{b.recipient_count}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Sent</p>
        </div>
        <div className="text-center">
          <p className="font-bold tabular-nums text-success">{reachRate}%</p>
          <p className="text-[9px] text-muted-foreground uppercase">Delivered</p>
        </div>
        <div className="text-center min-w-[60px]">
          <p className="font-bold tabular-nums text-muted-foreground flex items-center gap-1 justify-center"><Clock className="w-3 h-3" />{formatRelative(b.created_at)}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Created</p>
        </div>
      </div>
      <button
        onClick={() => del.mutate(b.id)}
        className="w-8 h-8 rounded-lg hover:bg-hot-soft hover:text-hot flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

const StatTile = ({ label, value, icon, accent }: { label: string; value: number | string; icon: React.ReactNode; accent: "primary" | "success" | "accent" }) => {
  const cls = { primary: "bg-primary-soft text-primary", success: "bg-success-soft text-success", accent: "bg-accent-soft text-accent" }[accent];
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", cls)}>{icon}</div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className="text-xl font-bold tabular-nums">{value}</p>
      </div>
    </div>
  );
};

type FormValues = {
  title: string;
  body: string;
  audience_tag: Tag;
  scheduled_at?: string;
  recipient_count: number;
};

const NewBroadcastDialog = () => {
  const [open, setOpen] = useState(false);
  const create = useCreateBroadcast();
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: { audience_tag: "hot", recipient_count: 0, body: "Hi {{1}}, " },
  });

  const onSubmit = (v: FormValues) => {
    const scheduled = v.scheduled_at ? new Date(v.scheduled_at).toISOString() : null;
    create.mutate(
      {
        title: v.title,
        body: v.body,
        audience_tag: v.audience_tag,
        scheduled_at: scheduled,
        recipient_count: v.recipient_count,
        status: scheduled ? "scheduled" : "draft",
      },
      { onSuccess: () => { setOpen(false); reset(); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2"><Plus className="w-3.5 h-3.5" />New Broadcast</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Create broadcast</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="btitle">Title *</Label>
            <Input id="btitle" {...register("title", { required: true })} placeholder="Diwali Sale Blast" />
            {errors.title && <p className="text-[11px] text-destructive">Required</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bbody">Message *</Label>
            <Textarea id="bbody" {...register("body", { required: true })} rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="btag">Audience</Label>
              <select id="btag" {...register("audience_tag")} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="hot">🔥 Hot leads</option>
                <option value="warm">🟡 Warm leads</option>
                <option value="cold">❄️ Cold leads</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brec">Recipients</Label>
              <Input id="brec" type="number" {...register("recipient_count", { valueAsNumber: true })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bsched">Schedule (optional)</Label>
            <Input id="bsched" type="datetime-local" {...register("scheduled_at")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
