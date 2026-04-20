import {
  Phone, Mail, Tag, ExternalLink, User, Sparkles, Target,
  IndianRupee, Globe, StickyNote, UserPlus, CheckCircle2, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Lead, LeadTag } from "@/data/conversations";
import { toast } from "sonner";
import { useState } from "react";

type Props = {
  lead: Lead;
  onClose?: () => void;
};

const tagConfig: Record<LeadTag, { label: string; emoji: string; class: string }> = {
  hot: { label: "Hot Lead", emoji: "🔥", class: "bg-hot-soft text-hot border-hot/20" },
  warm: { label: "Warm Lead", emoji: "🟡", class: "bg-warning-soft text-warning border-warning/20" },
  cold: { label: "Cold Lead", emoji: "❄️", class: "bg-accent-soft text-accent border-accent/20" },
};

const aiInsights: Record<string, string[]> = {
  hot: ["Lead is highly interested — close now", "Responded 3x faster than average", "Best time to close: right now"],
  warm: ["Needs one more touchpoint", "Send a case study or testimonial", "Schedule a follow-up call"],
  cold: ["Low engagement — try re-targeting", "Switch to email outreach", "Consider a special offer"],
};

export const LeadPanel = ({ lead, onClose }: Props) => {
  const [showPanel, setShowPanel] = useState(true);
  const tag = tagConfig[lead.tag];
  const insights = aiInsights[lead.tag];
  const scoreColor = lead.score >= 80 ? "text-hot" : lead.score >= 60 ? "text-warning" : "text-muted-foreground";
  const scoreBg = lead.score >= 80 ? "bg-hot" : lead.score >= 60 ? "bg-warning" : "bg-muted-foreground";

  return (
    <div className="w-[300px] h-full bg-card border-l border-border flex flex-col flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
        <h3 className="text-[13px] font-bold">Lead Details</h3>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors lg:hidden"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold",
              lead.tag === "hot" ? "bg-hot-soft text-hot" : lead.tag === "warm" ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground"
            )}>
              {lead.avatar}
            </div>
            <div className="min-w-0">
              <h4 className="text-[14px] font-bold truncate">{lead.name}</h4>
              <p className="text-[11px] text-muted-foreground font-mono">{lead.phone}</p>
            </div>
          </div>

          <div className={cn("px-3 py-2 rounded-lg border text-[12px] font-semibold flex items-center gap-2", tag.class)}>
            <span>{tag.emoji}</span>
            {tag.label}
            <span className="ml-auto text-[10px] opacity-70">Score: {lead.score}</span>
          </div>
        </div>

        {/* Lead Score Visual */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Lead Score</span>
            <span className={cn("text-lg font-bold tabular-nums", scoreColor)}>{lead.score}/100</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-700", scoreBg)} style={{ width: `${lead.score}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {lead.score >= 80 ? "High conversion probability" : lead.score >= 60 ? "Medium interest — nurture needed" : "Low engagement"}
          </p>
        </div>

        {/* Info */}
        <div className="p-4 border-b border-border space-y-2.5">
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Info</h4>
          <div className="flex items-center gap-2.5">
            <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-[12px]">Source: <span className="font-medium">{lead.source}</span></span>
          </div>
          {lead.email && (
            <div className="flex items-center gap-2.5">
              <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-[12px] truncate">{lead.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <IndianRupee className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-[12px]">Value: <span className="font-bold text-primary">{lead.value}</span></span>
          </div>
          <div className="flex items-center gap-2.5">
            <Target className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-[12px]">Stage: <span className="font-medium">{lead.stage}</span></span>
          </div>
          <div className="flex items-center gap-2.5">
            <Tag className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <div className="flex gap-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium">VIP</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium">WhatsApp</span>
            </div>
          </div>
        </div>

        {/* AI Assistant */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Addison AI</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-soft">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              <span className="text-[9px] font-bold text-success uppercase">Active</span>
            </div>
          </div>

          <div className="space-y-1.5">
            {insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-primary-soft/50">
                <Sparkles className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-foreground leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4">
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => toast.success("Calling...")} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-[11px] font-medium hover:bg-muted hover:border-primary/30 transition-all">
              <Phone className="w-3.5 h-3.5 text-primary" />
              Call
            </button>
            <button onClick={() => toast.success("Marked as closed")} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-[11px] font-medium hover:bg-muted hover:border-primary/30 transition-all">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              Close Deal
            </button>
            <button onClick={() => toast("Note added")} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-[11px] font-medium hover:bg-muted hover:border-primary/30 transition-all">
              <StickyNote className="w-3.5 h-3.5 text-warning" />
              Add Note
            </button>
            <button onClick={() => toast("Agent assigned")} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-[11px] font-medium hover:bg-muted hover:border-primary/30 transition-all">
              <UserPlus className="w-3.5 h-3.5 text-accent" />
              Assign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
