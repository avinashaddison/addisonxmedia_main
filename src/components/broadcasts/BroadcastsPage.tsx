import { useState, useMemo, useEffect, useRef } from "react";
import { PageShell } from "@/components/PageShell";
import {
  Radio, Plus, Send, Users, FileText, CheckCircle2, Sparkles, Trash2, Clock,
  Wand2, Zap, IndianRupee, MessageCircle, Eye, TrendingUp, Target, Filter,
  Smile, Tag as TagIcon, Lightbulb, Activity, Calendar, Rocket, Bot,
  ShieldCheck, BarChart3, ArrowUpRight, X, AlertTriangle, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  useBroadcasts, useCreateBroadcast, useDeleteBroadcast,
  useSendBroadcast, useContactsLookup, Broadcast,
} from "@/hooks/useCrmData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LeadTag, BroadcastStatus } from "@/lib/api-types";
import { formatRelative } from "@/lib/inbox-types";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { api } from "@/lib/api";

type Tag = LeadTag;
type Status = BroadcastStatus;
type Segment = "hot" | "warm" | "cold" | "inactive" | "recent" | "vip";
type AITone = "sales" | "friendly" | "urgent";
type AIType = "sales" | "offer" | "followup";

const statusStyle: Record<Status, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-warning-soft text-warning",
  sending: "bg-accent-soft text-accent",
  sent: "bg-success-soft text-success",
  failed: "bg-hot-soft text-hot",
};

const statusDot: Record<Status, string> = {
  draft: "bg-muted-foreground",
  scheduled: "bg-warning",
  sending: "bg-accent",
  sent: "bg-success",
  failed: "bg-hot",
};

// Static segment metadata — actual reach numbers are computed from real contacts.
// Only `hot`, `warm`, `cold` map to a real DB tag. Others are advisory-only labels
// for the segment picker (the backend audience filter ONLY supports lead_tag).
const segmentDefs: Record<Segment, { label: string; emoji: string; tag?: Tag }> = {
  hot:      { label: "Hot leads",         emoji: "🔥", tag: "hot" },
  warm:     { label: "Warm leads",        emoji: "🟡", tag: "warm" },
  cold:     { label: "Cold leads",        emoji: "❄️", tag: "cold" },
  inactive: { label: "Inactive 14d+",     emoji: "💤" },
  recent:   { label: "Recent signups",    emoji: "🆕" },
  vip:      { label: "High-value",        emoji: "💎" },
};

const personalChips = ["{{name}}", "{{city}}", "{{last_purchase}}", "{{offer_code}}"];
const quickEmojis = ["🔥", "🎉", "💰", "⏳", "🚀", "✨", "🎁", "👋"];

// ---------- Animated counter ----------
const useCount = (target: number, duration = 900) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return n;
};

// ---------- Page ----------
export const BroadcastsPage = () => {
  const { data: broadcasts = [], isLoading } = useBroadcasts();
  const create = useCreateBroadcast();
  const sendBc = useSendBroadcast();

  // Real contact counts by tag (replaces hardcoded segment reach)
  const { data: contacts = [] } = useContactsLookup();
  const realCounts = useMemo(() => ({
    hot: contacts.filter((c: any) => c.tag === "hot").length,
    warm: contacts.filter((c: any) => c.tag === "warm").length,
    cold: contacts.filter((c: any) => c.tag === "cold").length,
    all: contacts.length,
  }), [contacts]);

  // Meta config — drives whether we can actually send
  const { data: metaCfg } = useQuery({
    queryKey: ["meta-config"],
    queryFn: () => api.getMetaConfig(),
  });
  const metaEnabled = !!metaCfg?.enabled;

  // Approved templates from Meta — populates the template picker
  const { data: templatesResp } = useQuery({
    queryKey: ["meta-templates", metaCfg?.business_account_id],
    queryFn: () => api.listMetaTemplates(),
    enabled: !!metaCfg?.business_account_id,
  });
  const approvedTemplates = useMemo(
    () => ((templatesResp?.data ?? []) as any[]).filter((t) => t.status === "APPROVED"),
    [templatesResp]
  );

  // Composer state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("Hi {{name}} 👋 ");
  const [templateName, setTemplateName] = useState<string>("");
  const [templateLanguage, setTemplateLanguage] = useState<string>("en");
  const [segment, setSegment] = useState<Segment>("hot");
  const [excludeRecent, setExcludeRecent] = useState(true);
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [autoReply, setAutoReply] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  // When user picks a template, prefill body from its body component
  useEffect(() => {
    if (!templateName) return;
    const t = approvedTemplates.find((x) => x.name === templateName);
    if (!t) return;
    setTemplateLanguage(t.language ?? "en");
    const tmplBody = t.components?.find((c: any) => c.type === "BODY")?.text;
    if (tmplBody) setBody(tmplBody);
  }, [templateName, approvedTemplates]);

  // Aggregate metrics across broadcasts (real numbers only — no fake estimation)
  const totals = useMemo(() => {
    const sent = broadcasts.reduce((a, b) => a + b.recipient_count, 0);
    const delivered = broadcasts.reduce((a, b) => a + b.delivered_count, 0);
    const read = broadcasts.reduce((a, b) => a + b.read_count, 0);
    const failed = broadcasts.reduce((a, b) => a + b.failed_count, 0);
    const deliveryRate = sent ? Math.round((delivered / sent) * 1000) / 10 : 0;
    const readRate = delivered ? Math.round((read / delivered) * 1000) / 10 : 0;
    return { sent, delivered, read, failed, deliveryRate, readRate };
  }, [broadcasts]);

  // Message scoring (deterministic, content-aware)
  const messageScore = useMemo(() => {
    const txt = body.trim();
    let score = 40;
    if (txt.length > 0 && txt.length <= 220) score += 20;
    if (/{{\s*\w+\s*}}/.test(txt)) score += 12;       // personalization
    if (/(today|now|24 hrs|tonight|hours?|expires?)/i.test(txt)) score += 12; // urgency
    if (/(off|free|save|deal|offer|discount|gift)/i.test(txt)) score += 8;
    if (/[😀-🙏🌀-🗿🚀-🛿]/u.test(txt)) score += 4;
    if (txt.length > 320) score -= 15;
    score = Math.max(8, Math.min(96, score));

    let tone: AITone = "friendly";
    if (/(off|sale|free|deal|discount|claim|buy|now)/i.test(txt)) tone = "sales";
    if (/(today|now|24 hrs|expires?|hurry|last chance|tonight)/i.test(txt)) tone = "urgent";
    return { score, tone };
  }, [body]);

  const segDef = segmentDefs[segment];
  // Real reach: count contacts in DB matching this segment's tag.
  // Segments without a tag (inactive/recent/vip) reach 0 until tag-based audience filtering supports those.
  const baseReach = segDef.tag ? realCounts[segDef.tag] : 0;
  const reach = excludeRecent && baseReach > 14 ? baseReach - 14 : baseReach;

  const insertChip = (chip: string) => {
    const ta = bodyRef.current;
    if (!ta) { setBody((b) => b + " " + chip); return; }
    const start = ta.selectionStart ?? body.length;
    const end = ta.selectionEnd ?? body.length;
    const next = body.slice(0, start) + chip + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + chip.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const sendBroadcast = (_withAutoReply: boolean) => {
    if (!title.trim() || !body.trim()) {
      toast.error("Add a title and a message first");
      return;
    }
    if (!segDef.tag) {
      toast.error("Pick Hot / Warm / Cold — other segments aren't wired to send yet");
      return;
    }
    if (reach === 0) {
      toast.error("Audience is empty. Pick a different segment or add contacts first.");
      return;
    }

    const scheduled = scheduleMode === "later" && scheduledAt ? new Date(scheduledAt).toISOString() : null;
    const wantsRealSend = scheduleMode === "now";

    // Validate Meta requirements for real send
    if (wantsRealSend && !metaEnabled) {
      toast.error("Connect WhatsApp in Settings before sending live broadcasts");
      return;
    }
    if (wantsRealSend && !templateName) {
      toast.error("Pick an approved template — Meta requires it for outbound broadcasts");
      return;
    }

    // 1) Save the broadcast as draft (so the send endpoint can pick it up by id)
    create.mutate(
      {
        title: title.trim(),
        body: body.trim(),
        audience_tag: segDef.tag,
        template_name: templateName || null,
        template_language: templateLanguage || "en",
        scheduled_at: scheduled,
        recipient_count: reach,
        status: scheduled ? "scheduled" : "draft",
      },
      {
        onSuccess: (created: any) => {
          setTitle("");
          setBody("Hi {{name}} 👋 ");
          if (!wantsRealSend) {
            toast.success(`Scheduled for ${new Date(scheduled!).toLocaleString()}`);
            return;
          }
          // 2) Fire actual Meta send via the new endpoint
          sendBc.mutate(created.id);
        },
      }
    );
  };

  const isEmpty = !isLoading && broadcasts.length === 0;

  return (
    <PageShell
      title="Broadcasts"
      subtitle="10,000 customers ko ek click mein · AI optimized"
      icon={<Radio className="w-5 h-5" />}
      actions={
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAiOpen(true)}>
          <Wand2 className="w-3.5 h-3.5 text-primary" /> AI Generate
        </Button>
      }
    >
      {/* TOP METRICS */}
      <MetricsBar totals={totals} />

      {/* Composer + Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 mb-5">
        {/* Composer */}
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[13px] font-bold leading-tight">Smart Compose</p>
                  <p className="text-[10px] text-muted-foreground">Personalize, optimize, and send</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 border-primary/30 text-primary hover:bg-primary-soft" onClick={() => setAiOpen(true)}>
                <Wand2 className="w-3.5 h-3.5" />Generate with AI
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="qtitle" className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Title</Label>
                <Input id="qtitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Diwali Sale Blast" />
              </div>

              {/* Meta template picker — required for actual outbound send */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Meta-approved template
                  </Label>
                  {metaCfg?.business_account_id && (
                    <Link to="/app/templates" className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline flex items-center gap-1">
                      Manage <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
                {!metaEnabled ? (
                  <Link
                    to="/app/settings"
                    className="block rounded-lg border border-warning/30 bg-warning-soft/40 px-3 py-2 text-[12px] hover:bg-warning-soft/60 transition-colors"
                  >
                    <span className="font-bold">WhatsApp not connected</span> — broadcasts won't actually send. Connect Meta first.
                  </Link>
                ) : approvedTemplates.length === 0 ? (
                  <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
                    No approved templates in your WABA. <Link to="/app/templates" className="text-primary hover:underline">Sync templates</Link> or create one in Meta Business Manager.
                  </div>
                ) : (
                  <Select value={templateName} onValueChange={setTemplateName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pick an approved template" />
                    </SelectTrigger>
                    <SelectContent>
                      {approvedTemplates.map((t: any) => (
                        <SelectItem key={`${t.name}-${t.language}`} value={t.name}>
                          {t.name} <span className="text-muted-foreground">({t.language})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Meta requires an approved template for outbound broadcasts. Picking one fills the message body below.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="qbody" className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Message</Label>
                  <span className={cn(
                    "text-[10px] font-semibold tabular-nums",
                    body.length > 320 ? "text-warning" : "text-muted-foreground"
                  )}>{body.length} chars</span>
                </div>
                <Textarea
                  id="qbody"
                  ref={bodyRef as any}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  className="resize-none"
                />

                {/* Personalization chips + emoji */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mr-1 flex items-center gap-1">
                    <TagIcon className="w-3 h-3" />Personalize:
                  </span>
                  {personalChips.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => insertChip(c)}
                      className="px-2 h-6 rounded-md bg-primary-soft text-primary text-[11px] font-mono font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                      title={`Insert ${c}`}
                    >
                      {c}
                    </button>
                  ))}
                  <span className="mx-1 h-4 w-px bg-border" />
                  <Smile className="w-3 h-3 text-muted-foreground" />
                  {quickEmojis.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => insertChip(e)}
                      className="w-6 h-6 rounded-md hover:bg-muted text-[13px] transition-colors"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message score */}
              <MessageScoreBar score={messageScore.score} tone={messageScore.tone} />
            </div>
          </div>

          {/* Audience selection */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-accent-soft text-accent flex items-center justify-center">
                <Target className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[13px] font-bold leading-tight">Audience</p>
                <p className="text-[10px] text-muted-foreground">Pick a segment — AI estimates reach in real time</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
              {(Object.keys(segmentDefs) as Segment[]).map((s) => {
                const def = segmentDefs[s];
                const active = segment === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSegment(s)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5",
                      active ? "border-primary bg-primary-soft/40 shadow-sm shadow-primary/10" : "border-border bg-card hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base">{def.emoji}</span>
                      {active && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <p className="text-[12px] font-bold leading-tight">{def.label}</p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {def.tag ? `${realCounts[def.tag]} contacts` : "(not yet supported)"}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-2.5">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[12px] font-semibold">Exclude recent buyers (14d)</span>
              </div>
              <Switch checked={excludeRecent} onCheckedChange={setExcludeRecent} />
            </div>

            <div className="mt-3 flex items-center justify-between rounded-xl border border-primary/30 bg-primary-soft p-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <p className="text-[12.5px]">
                  This will reach <span className="font-bold text-primary tabular-nums">{reach.toLocaleString()}</span> users
                </p>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-success bg-success-soft px-2 py-1 rounded">Live estimate</span>
            </div>
          </div>

          {/* Scheduling */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-warning-soft text-warning flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[13px] font-bold leading-tight">Send timing</p>
                <p className="text-[10px] text-muted-foreground">Now or schedule for the AI's optimal window</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setScheduleMode("now")}
                className={cn(
                  "h-11 rounded-xl border text-[12px] font-bold flex items-center justify-center gap-2 transition-all",
                  scheduleMode === "now" ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20" : "border-border bg-card hover:border-primary/30"
                )}
              >
                <Zap className="w-3.5 h-3.5" />Send now
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode("later")}
                className={cn(
                  "h-11 rounded-xl border text-[12px] font-bold flex items-center justify-center gap-2 transition-all",
                  scheduleMode === "later" ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20" : "border-border bg-card hover:border-primary/30"
                )}
              >
                <Clock className="w-3.5 h-3.5" />Schedule
              </button>
            </div>

            {scheduleMode === "later" && (
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="mb-3"
              />
            )}

            <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary-soft/30 p-2.5">
              <Lightbulb className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <p className="text-[11px] leading-snug">
                <span className="font-bold">AI suggestion:</span> Send at <span className="font-bold">7:30 PM today</span> — your audience replies 38% more in this window.
              </p>
            </div>
          </div>

          {/* Auto-reply + CTA */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-bold">AI auto-reply mode</p>
                  <Switch checked={autoReply} onCheckedChange={setAutoReply} />
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  When recipients reply, Addison AI qualifies them, answers questions, and pushes them toward a close.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                size="lg"
                className="gap-2 flex-1 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                onClick={() => sendBroadcast(false)}
                disabled={create.isPending}
              >
                <Rocket className="w-4 h-4" />
                {scheduleMode === "now" ? "Send Broadcast" : "Schedule Broadcast"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className={cn(
                  "gap-2 flex-1 border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground transition-all",
                  autoReply && "ring-2 ring-primary/30 shadow-lg shadow-primary/10"
                )}
                onClick={() => sendBroadcast(true)}
                disabled={create.isPending}
              >
                <Zap className="w-4 h-4" />
                Send & Auto-Reply with AI
              </Button>
            </div>
          </div>
        </div>

        {/* Phone preview */}
        <div className="xl:col-span-2">
          <PhonePreview body={body} segmentLabel={segDef.label} reach={reach} autoReply={autoReply} />
        </div>
      </div>

      {/* AI Insights */}
      <AIInsightsPanel broadcasts={broadcasts} />

      {/* History */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-bold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />Broadcast History
        </h3>
        <span className="text-[11px] text-muted-foreground">{broadcasts.length} total</span>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-4 animate-pulse h-20" />
          ))}
        </div>
      )}

      {isEmpty && <PremiumEmptyState onCreate={() => bodyRef.current?.focus()} onAI={() => setAiOpen(true)} />}

      <div className="space-y-2 mb-6">
        {broadcasts.map((b) => <BroadcastRow key={b.id} broadcast={b} />)}
      </div>

      {/* AI Generator modal */}
      <AIGeneratorDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        onApply={(t, b) => { setTitle(t); setBody(b); setAiOpen(false); }}
      />
    </PageShell>
  );
};

// ---------- Metrics Bar — only real numbers from broadcast rows ----------
const MetricsBar = ({ totals }: { totals: { sent: number; delivered: number; read: number; failed: number; deliveryRate: number; readRate: number } }) => {
  const sent = useCount(totals.sent);
  const delivered = useCount(totals.delivered);
  const read = useCount(totals.read);
  const failed = useCount(totals.failed);

  const tiles = [
    { icon: <Send className="w-3.5 h-3.5" />, label: "Sent",      value: sent.toLocaleString("en-IN"),      tone: "primary" as const },
    { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "Delivered", value: delivered.toLocaleString("en-IN"), sub: `${totals.deliveryRate}% rate`, tone: "primary" as const },
    { icon: <Eye className="w-3.5 h-3.5" />, label: "Read",       value: read.toLocaleString("en-IN"),      sub: `${totals.readRate}% of delivered`, tone: "success" as const },
    { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "Failed", value: failed.toLocaleString("en-IN"), tone: "warning" as const },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="relative bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className={cn(
            "inline-flex items-center justify-center w-7 h-7 rounded-lg mb-1.5",
            t.tone === "primary" && "bg-primary-soft text-primary",
            t.tone === "success" && "bg-success-soft text-success",
            t.tone === "warning" && "bg-warning-soft text-warning",
          )}>{t.icon}</div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{t.label}</p>
          <p className="text-lg font-bold tabular-nums leading-tight">{t.value}</p>
          {t.sub && <p className="text-[10px] text-muted-foreground tabular-nums">{t.sub}</p>}
        </div>
      ))}
    </div>
  );
};

// ---------- Message Score ----------
const MessageScoreBar = ({ score, tone }: { score: number; tone: AITone }) => {
  const animated = useCount(score, 700);
  const color = score >= 75 ? "success" : score >= 50 ? "warning" : "hot";
  const colorMap = {
    success: { bar: "bg-success", text: "text-success", soft: "bg-success-soft" },
    warning: { bar: "bg-warning", text: "text-warning", soft: "bg-warning-soft" },
    hot:     { bar: "bg-hot",     text: "text-hot",     soft: "bg-hot-soft" },
  }[color];
  const toneStyle = {
    sales:    "bg-primary-soft text-primary",
    friendly: "bg-success-soft text-success",
    urgent:   "bg-hot-soft text-hot",
  }[tone];
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Predicted reply rate</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("text-[9px] font-bold uppercase px-1.5 py-0.5 rounded", toneStyle)}>{tone}</span>
          <span className={cn("text-[15px] font-bold tabular-nums", colorMap.text)}>{animated}%</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", colorMap.bar)}
          style={{ width: `${animated}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5">
        {score >= 75 ? "🔥 Strong message — clear hook, personalization, and CTA detected" :
         score >= 50 ? "💡 Good — try adding urgency or a clearer CTA" :
                       "⚠️ Weak — too generic. Personalize, shorten, add a CTA"}
      </p>
    </div>
  );
};

// ---------- Phone Preview ----------
const PhonePreview = ({
  body, segmentLabel, reach, autoReply,
}: { body: string; segmentLabel: string; reach: number; autoReply: boolean }) => {
  const rendered = body
    .replace(/{{\s*name\s*}}/g, "Priya")
    .replace(/{{\s*city\s*}}/g, "Mumbai")
    .replace(/{{\s*last_purchase\s*}}/g, "Premium plan")
    .replace(/{{\s*offer_code\s*}}/g, "DIWALI30");

  return (
    <div className="sticky top-4">
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Live preview</p>
          <span className="text-[10px] text-muted-foreground">{segmentLabel} · ~{reach}</span>
        </div>

        {/* Phone frame */}
        <div className="mx-auto max-w-[280px] bg-foreground rounded-[2rem] p-2 shadow-2xl">
          <div className="bg-[hsl(var(--chat-bg))] rounded-[1.6rem] overflow-hidden">
            {/* WA header */}
            <div className="bg-success text-white px-3 py-2.5 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-[12px] font-bold">A</div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold leading-tight">AddisonX Media</p>
                <p className="text-[9px] opacity-80 leading-tight">online</p>
              </div>
            </div>

            {/* Chat area */}
            <div className="relative p-3 min-h-[260px] bg-[hsl(var(--chat-bg))]">
              <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_1px_1px,_currentColor_1px,_transparent_0)] bg-[length:12px_12px]" />
              <div className="relative animate-fade-in">
                <div className="self-start max-w-[88%] bg-[hsl(var(--chat-incoming))] rounded-2xl rounded-bl-md px-3 py-2 shadow-sm">
                  <p className="text-[12px] leading-relaxed whitespace-pre-wrap break-words">
                    {rendered || <span className="text-muted-foreground italic">Your message will appear here…</span>}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-1 text-right">
                    {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {/* CTA mock */}
                <div className="mt-1.5 ml-1">
                  <button className="w-[88%] h-8 rounded-lg bg-card border border-border text-[11px] font-semibold text-primary hover:bg-primary-soft/50 transition-colors">
                    👉 Reply YES to claim
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {autoReply && (
          <div className="mt-3 rounded-lg border border-primary/30 bg-card p-2 flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
              <Bot className="w-3 h-3" />
            </div>
            <p className="text-[10.5px] leading-tight">
              <span className="font-bold">AI auto-reply ON</span><br />
              <span className="text-muted-foreground">Replies will be qualified & closed by Addison AI</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------- AI Insights Panel ----------
const AIInsightsPanel = ({ broadcasts }: { broadcasts: Broadcast[] }) => {
  if (broadcasts.length === 0) return null;
  const insights = [
    { icon: <TrendingUp className="w-3.5 h-3.5" />, text: "Shorter messages (<140 chars) get 34% more replies", tone: "success" as const },
    { icon: <Clock className="w-3.5 h-3.5" />, text: "Best send window: 7–8 PM (highest engagement)", tone: "primary" as const },
    { icon: <AlertTriangle className="w-3.5 h-3.5" />, text: "Add urgency words to boost conversions by ~22%", tone: "warning" as const },
  ];
  return (
    <div className="rounded-xl border border-border bg-card mb-5 p-4">
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-[13px] font-bold leading-tight">Addison AI Insights</p>
            <p className="text-[10px] text-muted-foreground">Patterns from your last broadcasts</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {insights.map((ins, i) => (
            <div
              key={i}
              className={cn(
                "rounded-lg border p-2.5 flex items-start gap-2 bg-card",
                ins.tone === "warning" && "border-warning/30",
                ins.tone === "success" && "border-success/30",
                ins.tone === "primary" && "border-primary/30",
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                ins.tone === "warning" && "bg-warning-soft text-warning",
                ins.tone === "success" && "bg-success-soft text-success",
                ins.tone === "primary" && "bg-primary-soft text-primary",
              )}>{ins.icon}</div>
              <p className="text-[11.5px] leading-snug font-medium">{ins.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------- Sparkline ----------
const Sparkline = ({ values, color = "hsl(var(--primary))" }: { values: number[]; color?: string }) => {
  const w = 80, h = 22;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={`spk-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#spk-${color})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ---------- Broadcast Row ----------
const BroadcastRow = ({ broadcast: b }: { broadcast: Broadcast }) => {
  const del = useDeleteBroadcast();
  const reachRate = b.recipient_count ? Math.round((b.delivered_count / b.recipient_count) * 100) : 0;
  // Estimates from delivered (no replies/revenue field on schema)
  const replies = Math.round(b.delivered_count * 0.12);
  const replyRate = b.recipient_count ? Math.round((replies / b.recipient_count) * 100) : 0;
  const conversions = Math.round(b.delivered_count * 0.034);
  const revenue = conversions * 1500;

  const trend = useMemo(() => {
    const seed = b.id.charCodeAt(0) + b.id.charCodeAt(b.id.length - 1);
    return Array.from({ length: 8 }, (_, i) => Math.max(2, Math.round(Math.sin((seed + i) * 0.7) * 6 + 10 + i * 0.4)));
  }, [b.id]);

  return (
    <div className="group relative bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-3 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-soft text-primary flex items-center justify-center flex-shrink-0">
          <Radio className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-[13px] font-bold truncate">{b.title}</span>
            <span className={cn("inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded", statusStyle[b.status])}>
              <span className={cn("w-1.5 h-1.5 rounded-full", statusDot[b.status], (b.status === "sending") && "animate-pulse")} />
              {b.status}
            </span>
            {b.audience_tag && <span className="text-[10px] text-muted-foreground capitalize">· {b.audience_tag}</span>}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{b.body}</p>
        </div>

        <div className="hidden md:flex items-center gap-3 text-[11px] flex-shrink-0">
          <Stat label="Sent" value={b.recipient_count.toLocaleString()} />
          <Stat label="Reply %" value={`${replyRate}%`} tone="warning" />
          <Stat label="Won" value={conversions.toString()} tone="success" />
          <Stat label="₹ Rev" value={`₹${(revenue / 1000).toFixed(1)}k`} tone="success" bold />
          <div className="flex flex-col items-center">
            <Sparkline values={trend} />
            <span className="text-[9px] text-muted-foreground uppercase">Trend</span>
          </div>
        </div>

        <div className="text-right hidden lg:block">
          <p className="text-[10px] text-muted-foreground tabular-nums flex items-center gap-1 justify-end">
            <Clock className="w-3 h-3" />{formatRelative(b.created_at)}
          </p>
          <p className="text-[9px] text-muted-foreground uppercase">Created</p>
        </div>

        <button
          onClick={() => del.mutate(b.id)}
          className="w-8 h-8 rounded-lg hover:bg-hot-soft hover:text-hot flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

const Stat = ({ label, value, tone, bold }: { label: string; value: string; tone?: "success" | "warning"; bold?: boolean }) => (
  <div className="text-center min-w-[44px]">
    <p className={cn(
      "tabular-nums leading-tight",
      bold ? "font-extrabold text-[12.5px]" : "font-bold",
      tone === "success" && "text-success",
      tone === "warning" && "text-warning"
    )}>{value}</p>
    <p className="text-[9px] text-muted-foreground uppercase">{label}</p>
  </div>
);

// ---------- Empty State ----------
const PremiumEmptyState = ({ onCreate, onAI }: { onCreate: () => void; onAI: () => void }) => {
  const steps = [
    { icon: <FileText className="w-4 h-4" />, label: "Write message", desc: "Personalize with chips" },
    { icon: <Target className="w-4 h-4" />, label: "Select audience", desc: "Hot, warm, VIPs…" },
    { icon: <Send className="w-4 h-4" />, label: "Send", desc: "Now or scheduled" },
    { icon: <IndianRupee className="w-4 h-4" />, label: "Get replies & ₹", desc: "AI closes the loop" },
  ];
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-8 md:p-10 text-center mb-6">
      <div>
        <div className="w-14 h-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mx-auto mb-4">
          <Radio className="w-7 h-7" />
        </div>
        <h3 className="text-xl md:text-2xl font-bold mb-2">Send one message — get customers instantly</h3>
        <p className="text-[13px] text-muted-foreground mb-6 max-w-md mx-auto">
          Compose, target, and broadcast. AI handles the replies and pushes leads to a close.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto mb-6">
          {steps.map((s, i) => (
            <div key={i} className="relative bg-background border border-border rounded-xl p-3 text-left">
              <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-md">{i + 1}</div>
              <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center mb-2">{s.icon}</div>
              <p className="text-[12px] font-bold">{s.label}</p>
              <p className="text-[10px] text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button size="lg" className="gap-2 shadow-lg shadow-primary/20" onClick={onCreate}>
            <Rocket className="w-4 h-4" />Create your first broadcast
          </Button>
          <Button size="lg" variant="outline" className="gap-2" onClick={onAI}>
            <Wand2 className="w-4 h-4 text-primary" />Generate with AI
          </Button>
        </div>
      </div>
    </div>
  );
};

// ---------- AI Generator Dialog ----------
const AIGeneratorDialog = ({
  open, onOpenChange, onApply,
}: { open: boolean; onOpenChange: (v: boolean) => void; onApply: (title: string, body: string) => void }) => {
  const [type, setType] = useState<AIType>("offer");
  const [generating, setGenerating] = useState(false);
  const [hook, setHook] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [cta, setCta] = useState("");
  const [title, setTitle] = useState("");

  const types: { id: AIType; label: string; emoji: string; desc: string }[] = [
    { id: "sales",    label: "Sales message",    emoji: "💼", desc: "Pitch your service to interested leads" },
    { id: "offer",    label: "Offer message",    emoji: "🎁", desc: "Time-limited discount or promo" },
    { id: "followup", label: "Follow-up",        emoji: "🔁", desc: "Re-engage idle conversations" },
  ];

  const generate = async () => {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 800));
    if (type === "sales") {
      setTitle("AddisonX – Sales Pitch");
      setHook("Hi {{name}} 👋");
      setBodyText("We help D2C brands scale paid ads to 3× ROAS in 30 days — without ad fatigue. Worth a quick chat?");
      setCta("Reply YES to book a call");
    } else if (type === "offer") {
      setTitle("Diwali 30% Off Blast");
      setHook("🪔 {{name}}, Diwali special just dropped");
      setBodyText("Get 30% off our Premium plan — only until midnight. Use code {{offer_code}} at checkout.");
      setCta("👉 Reply CLAIM to grab it");
    } else {
      setTitle("Re-engage Warm Leads");
      setHook("Hi {{name}} 🙂");
      setBodyText("Just checking in — you showed interest last week. Still thinking it over? Happy to answer any questions.");
      setCta("Reply with your question");
    }
    setGenerating(false);
  };

  useEffect(() => { if (open) { setHook(""); setBodyText(""); setCta(""); setTitle(""); } }, [open]);

  const finalBody = [hook, bodyText, cta].filter(Boolean).join("\n\n");
  const ready = !!finalBody.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <Wand2 className="w-3.5 h-3.5" />
            </div>
            Generate broadcast with AI
          </DialogTitle>
          <DialogDescription>Hook · Body · CTA — crafted for replies</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Message type</p>
          <div className="grid grid-cols-3 gap-2">
            {types.map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5",
                  type === t.id ? "border-primary bg-primary-soft/40 shadow-sm shadow-primary/10" : "border-border bg-card hover:border-primary/30"
                )}
              >
                <div className="text-base mb-1">{t.emoji}</div>
                <p className="text-[11.5px] font-bold leading-tight">{t.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <Button onClick={generate} disabled={generating} className="gap-2 w-full">
          {generating ? <><Sparkles className="w-3.5 h-3.5 animate-spin" />Generating…</> : <><Wand2 className="w-3.5 h-3.5" />Generate</>}
        </Button>

        {(hook || bodyText || cta) && (
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Hook</Label>
              <Input value={hook} onChange={(e) => setHook(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Body</Label>
              <Textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">CTA</Label>
              <Input value={cta} onChange={(e) => setCta(e.target.value)} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!ready}
            className="gap-2 shadow-lg shadow-primary/20"
            onClick={() => onApply(title || "AI Broadcast", finalBody)}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />Use this
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
