import { useEffect, useState } from "react";
import {
  Phone, Mail, Tag, Sparkles, Globe, StickyNote, UserPlus,
  CheckCircle2, X, Flame, Zap, Send, CreditCard, Clock, TrendingUp,
  AlertTriangle, Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Contact, initialsFor } from "@/lib/inbox-types";
import { toast } from "sonner";
import { ActivityTimeline, type TimelineEvent } from "@/components/global/ActivityTimeline";
import { NextBestAction, type NBAItem } from "@/components/global/NextBestAction";

type Props = {
  contact: Contact;
  onClose?: () => void;
};

const tagConfig: Record<Contact["tag"], { label: string; emoji: string; class: string }> = {
  hot: { label: "Hot Lead", emoji: "🔥", class: "bg-hot text-hot-foreground" },
  warm: { label: "Warm Lead", emoji: "🟡", class: "bg-warning text-warning-foreground" },
  cold: { label: "Cold Lead", emoji: "❄️", class: "bg-accent text-accent-foreground" },
};

const aiReasons: Record<Contact["tag"], string[]> = {
  hot: ["High purchase intent detected", "Asked about pricing 3x", "Response time: 45 sec avg"],
  warm: ["Showed interest in features", "Engaged with last 3 messages", "Needs nurture touchpoint"],
  cold: ["Low engagement detected", "Hasn't replied in 24h+", "Try re-engagement campaign"],
};

const aiVerdict: Record<Contact["tag"], { label: string; sub: string; class: string; icon: typeof Flame; alert?: string }> = {
  hot: { label: "CLOSE NOW", sub: "Lead is ready to buy", class: "from-hot to-[hsl(15_90%_55%)]", icon: Flame, alert: "Respond within 2 min to close" },
  warm: { label: "NURTURE", sub: "Needs one more push", class: "from-warning to-[hsl(28_92%_55%)]", icon: TrendingUp, alert: "Send proof in next 30 min" },
  cold: { label: "RE-ENGAGE", sub: "Try a different angle", class: "from-accent to-[hsl(217_91%_50%)]", icon: Zap },
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

// Smooth animated count-up hook
const useCount = (target: number, duration = 900) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
};

export const LeadPanel = ({ contact, onClose }: Props) => {
  const tag = tagConfig[contact.tag];
  const reasons = aiReasons[contact.tag];
  const verdict = aiVerdict[contact.tag];
  const VerdictIcon = verdict.icon;
  const conversionPct = Math.min(contact.score, 99);
  const animatedScore = useCount(contact.score);
  const animatedValue = useCount(Math.round(2000 + contact.score * 100));

  const scoreColor = contact.score >= 80 ? "text-hot" : contact.score >= 60 ? "text-warning" : "text-muted-foreground";
  const scoreBgClass = contact.score >= 80
    ? "from-hot to-warning"
    : contact.score >= 60
      ? "from-warning to-primary"
      : "from-muted-foreground to-accent";
  const initials = initialsFor(contact.name);

  // Follow-up timer
  const [followupSeconds, setFollowupSeconds] = useState(600); // 10 min default
  useEffect(() => {
    setFollowupSeconds(contact.tag === "hot" ? 120 : contact.tag === "warm" ? 600 : 1800);
  }, [contact.id, contact.tag]);
  useEffect(() => {
    if (followupSeconds <= 0) return;
    const t = setInterval(() => setFollowupSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [followupSeconds]);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-[340px] h-full bg-card border-l border-border flex flex-col flex-shrink-0 overflow-hidden relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-accent/5 to-transparent" />

      {/* Header */}
      <div className="relative h-16 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-bold">Sales Intelligence</h3>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-success-soft">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-75" />
              <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-success" />
            </span>
            <span className="text-[9px] font-bold text-success uppercase">Live</span>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors lg:hidden">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile + quick action icons */}
        <div className="p-4 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                contact.tag === "hot" ? "bg-hot-soft text-hot" : contact.tag === "warm" ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground"
              )}>
                {initials}
              </div>
              {contact.tag === "hot" && (
                <span className="absolute inset-0 rounded-full ring-2 ring-hot animate-hot-pulse" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-[14px] font-bold truncate">{contact.name}</h4>
              <p className="text-[11px] text-muted-foreground font-mono truncate">{contact.phone}</p>
              <span className={cn("inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1", tag.class)}>
                {tag.emoji} {tag.label.split(" ")[0]}
                {contact.tag === "hot" && <span className="w-1 h-1 rounded-full bg-hot-foreground animate-pulse" />}
              </span>
            </div>
          </div>

          {/* Quick contact icons */}
          <div className="grid grid-cols-3 gap-1.5">
            <button onClick={() => toast.success(`Calling ${contact.name}…`)} className="h-9 rounded-lg bg-muted hover:bg-success hover:text-success-foreground transition-all flex items-center justify-center gap-1.5 text-[11px] font-semibold group">
              <Phone className="w-3.5 h-3.5 text-success group-hover:text-success-foreground" />
              Call
            </button>
            <button onClick={() => toast(`WhatsApp ${contact.name}`)} className="h-9 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center gap-1.5 text-[11px] font-semibold group">
              <Send className="w-3.5 h-3.5 text-primary group-hover:text-primary-foreground" />
              WA
            </button>
            <button onClick={() => toast(`Email ${contact.email ?? contact.name}`)} className="h-9 rounded-lg bg-muted hover:bg-accent hover:text-accent-foreground transition-all flex items-center justify-center gap-1.5 text-[11px] font-semibold group">
              <Mail className="w-3.5 h-3.5 text-accent group-hover:text-accent-foreground" />
              Mail
            </button>
          </div>
        </div>

        {/* Follow-up timer */}
        {followupSeconds > 0 && (
          <div className="mx-4 mb-3 rounded-xl border border-border bg-card p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                contact.tag === "hot" ? "bg-hot-soft text-hot" : "bg-primary-soft text-primary"
              )}>
                <Timer className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Follow-up in</div>
                <div className={cn(
                  "text-[15px] font-bold tabular-nums",
                  contact.tag === "hot" ? "text-hot" : "text-foreground"
                )}>{fmtTime(followupSeconds)}</div>
              </div>
            </div>
            <button
              onClick={() => toast.success("Follow-up sent")}
              className="text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary-glow"
            >
              Send now
            </button>
          </div>
        )}

        {/* Deal value */}
        <div className="mx-4 mb-3 rounded-xl overflow-hidden gradient-border p-4 relative">
          <div className="absolute top-2 right-2 text-[9px] font-bold text-primary uppercase tracking-wider bg-primary-soft px-1.5 py-0.5 rounded">
            Estimated
          </div>
          <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">Deal Value</p>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums">{formatCurrency(animatedValue)}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-muted-foreground">Closing probability</span>
            <span className="font-bold text-primary tabular-nums">{conversionPct}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all duration-1000" style={{ width: `${conversionPct}%` }} />
          </div>
          <div className="flex items-center justify-between text-[10px] mt-2 pt-2 border-t border-border/60">
            <span className="text-muted-foreground">Expected close</span>
            <span className="font-semibold text-foreground">
              {contact.tag === "hot" ? "Today · 6pm" : contact.tag === "warm" ? "This week" : "Next month"}
            </span>
          </div>
        </div>

        {/* AI verdict — Addison AI block */}
        <div className="mx-4 mb-3">
          <div className={cn(
            "rounded-xl p-3.5 bg-gradient-to-br text-white relative overflow-hidden",
            verdict.class,
            contact.tag === "hot" && "shadow-lg shadow-hot/30"
          )}>
            {/* Urgency alert */}
            {verdict.alert && (
              <div className={cn(
                "absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/20 backdrop-blur",
                contact.tag === "hot" && "animate-urgency-shake"
              )}>
                <AlertTriangle className="w-2.5 h-2.5" />
                <span className="text-[9px] font-bold uppercase">Urgent</span>
              </div>
            )}

            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Addison AI says</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <VerdictIcon className="w-6 h-6" />
              <div>
                <div className="text-xl font-extrabold tracking-tight leading-none">{verdict.label}</div>
                <div className="text-[11px] opacity-90 mt-0.5">{verdict.sub}</div>
              </div>
            </div>

            {verdict.alert && (
              <div className="bg-white/15 backdrop-blur rounded-md px-2 py-1.5 mt-2 flex items-center gap-1.5">
                <Zap className="w-3 h-3" />
                <span className="text-[10px] font-bold">{verdict.alert}</span>
              </div>
            )}

            <div className="space-y-1 mt-3 pt-3 border-t border-white/20">
              {reasons.map((r, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0 opacity-90" />
                  <p className="text-[11px] opacity-95 leading-relaxed">{r}</p>
                </div>
              ))}
            </div>

            {/* BIG conversion buttons */}
            <div className="grid grid-cols-3 gap-1.5 mt-3">
              <button onClick={() => toast.success("Offer sent!")} className="bg-white/20 hover:bg-white text-white hover:text-foreground backdrop-blur rounded-lg py-2 text-[11px] font-bold flex flex-col items-center gap-0.5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <Send className="w-3.5 h-3.5" />
                Offer
              </button>
              <button onClick={() => toast.success("Calling…")} className="bg-white/20 hover:bg-white text-white hover:text-foreground backdrop-blur rounded-lg py-2 text-[11px] font-bold flex flex-col items-center gap-0.5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <Phone className="w-3.5 h-3.5" />
                Call
              </button>
              <button onClick={() => toast.success("Payment link sent!")} className="bg-white/20 hover:bg-white text-white hover:text-foreground backdrop-blur rounded-lg py-2 text-[11px] font-bold flex flex-col items-center gap-0.5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <CreditCard className="w-3.5 h-3.5" />
                Pay
              </button>
            </div>
          </div>
        </div>

        {/* Lead score — animated bar with color shift */}
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Lead Score</span>
            <span className={cn("text-base font-bold tabular-nums", scoreColor)}>{animatedScore}/100</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden relative">
            <div
              className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-1000", scoreBgClass)}
              style={{ width: `${animatedScore}%` }}
            />
            <div
              className="absolute top-0 h-full w-8 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              style={{ left: `${Math.max(0, animatedScore - 4)}%`, opacity: animatedScore > 0 ? 1 : 0 }}
            />
          </div>
          <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase mt-1">
            <span>Cold</span>
            <span>Warm</span>
            <span>Hot</span>
          </div>
        </div>

        {/* Info */}
        <div className="px-4 py-3 border-t border-border space-y-2">
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Lead Info</h4>
          {contact.source && (
            <div className="flex items-center gap-2.5">
              <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-[12px]">Source: <span className="font-medium">{contact.source}</span></span>
            </div>
          )}
          {contact.email && (
            <div className="flex items-center gap-2.5">
              <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-[12px] truncate">{contact.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-[12px] font-mono">{contact.phone}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Tag className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium">{tag.label}</span>
          </div>
        </div>

        {/* Secondary actions */}
        <div className="px-4 py-3 border-t border-border">
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">More Actions</h4>
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={() => toast.success("Marked closed")} className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-border text-[11px] font-medium hover:bg-muted hover:border-success/40 transition-all">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              Close Deal
            </button>
            <button onClick={() => toast("Note added")} className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-border text-[11px] font-medium hover:bg-muted hover:border-primary/30 transition-all">
              <StickyNote className="w-3.5 h-3.5 text-warning" />
              Add Note
            </button>
            <button onClick={() => toast("Agent assigned")} className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-border text-[11px] font-medium hover:bg-muted hover:border-primary/30 transition-all">
              <UserPlus className="w-3.5 h-3.5 text-accent" />
              Assign
            </button>
            <button onClick={() => toast("Follow-up scheduled")} className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-border text-[11px] font-medium hover:bg-muted hover:border-primary/30 transition-all">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
