import {
  Phone, Mail, Tag, Sparkles, Globe, StickyNote, UserPlus,
  CheckCircle2, X, Flame, Zap, Send, CreditCard, Clock, TrendingUp, Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Contact, initialsFor } from "@/lib/inbox-types";
import { toast } from "sonner";

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

const aiVerdict: Record<Contact["tag"], { label: string; sub: string; class: string; icon: typeof Flame }> = {
  hot: { label: "CLOSE NOW", sub: "Lead is ready to buy", class: "from-hot to-[hsl(15_90%_55%)]", icon: Flame },
  warm: { label: "NURTURE", sub: "Needs one more push", class: "from-warning to-[hsl(28_92%_55%)]", icon: TrendingUp },
  cold: { label: "RE-ENGAGE", sub: "Try a different angle", class: "from-accent to-[hsl(217_91%_50%)]", icon: Zap },
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const LeadPanel = ({ contact, onClose }: Props) => {
  const tag = tagConfig[contact.tag];
  const reasons = aiReasons[contact.tag];
  const verdict = aiVerdict[contact.tag];
  const VerdictIcon = verdict.icon;
  const conversionPct = Math.min(contact.score, 99);
  const scoreColor = contact.score >= 80 ? "text-hot" : contact.score >= 60 ? "text-warning" : "text-muted-foreground";
  const scoreBg = contact.score >= 80 ? "bg-hot" : contact.score >= 60 ? "bg-warning" : "bg-muted-foreground";
  const initials = initialsFor(contact.name);

  // Estimated deal value based on score (until Phase 4 AI calculates this)
  const estimatedValue = Math.round(2000 + contact.score * 100);

  return (
    <div className="w-[320px] h-full bg-card border-l border-border flex flex-col flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
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
        {/* Profile */}
        <div className="p-4 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
              contact.tag === "hot" ? "bg-hot-soft text-hot" : contact.tag === "warm" ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground"
            )}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-[14px] font-bold truncate">{contact.name}</h4>
              <p className="text-[11px] text-muted-foreground font-mono truncate">{contact.phone}</p>
            </div>
            <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1", tag.class)}>
              {tag.emoji} {tag.label.split(" ")[0]}
            </span>
          </div>
        </div>

        {/* Deal value */}
        <div className="mx-4 mb-3 rounded-xl overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary-soft via-primary-soft to-success-soft p-4 relative">
          <div className="absolute top-2 right-2 text-[9px] font-bold text-primary uppercase tracking-wider bg-card px-1.5 py-0.5 rounded">
            Estimated
          </div>
          <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">Deal Value</p>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">{formatCurrency(estimatedValue)}</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Conversion chance</span>
            <span className="font-bold text-primary">{conversionPct}%</span>
          </div>
          <div className="mt-1 h-1.5 bg-card/60 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all duration-700" style={{ width: `${conversionPct}%` }} />
          </div>
        </div>

        {/* AI verdict */}
        <div className="mx-4 mb-3">
          <div className={cn("rounded-xl p-3.5 bg-gradient-to-br text-white relative overflow-hidden", verdict.class)}>
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

            <div className="space-y-1 mt-3 pt-3 border-t border-white/20">
              {reasons.map((r, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0 opacity-90" />
                  <p className="text-[11px] opacity-95 leading-relaxed">{r}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-1.5 mt-3">
              <button onClick={() => toast.success("Offer sent!")} className="bg-white/15 hover:bg-white/25 backdrop-blur rounded-md py-1.5 text-[10px] font-bold flex flex-col items-center gap-0.5 transition-all">
                <Send className="w-3 h-3" />
                Offer
              </button>
              <button onClick={() => toast.success("Calling…")} className="bg-white/15 hover:bg-white/25 backdrop-blur rounded-md py-1.5 text-[10px] font-bold flex flex-col items-center gap-0.5 transition-all">
                <Phone className="w-3 h-3" />
                Call
              </button>
              <button onClick={() => toast.success("Payment link sent!")} className="bg-white/15 hover:bg-white/25 backdrop-blur rounded-md py-1.5 text-[10px] font-bold flex flex-col items-center gap-0.5 transition-all">
                <CreditCard className="w-3 h-3" />
                Pay
              </button>
            </div>
          </div>
        </div>

        {/* Lead score */}
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Lead Score</span>
            <span className={cn("text-base font-bold tabular-nums", scoreColor)}>{contact.score}/100</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-700", scoreBg)} style={{ width: `${contact.score}%` }} />
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
