import { PageShell } from "@/components/PageShell";
import { Megaphone, Sparkles, Plus, TrendingUp, Users, MousePointerClick, ShoppingCart, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Campaign = {
  id: string;
  name: string;
  status: "active" | "scheduled" | "draft";
  audience: number;
  sent: number;
  replies: number;
  conversions: number;
  channel: "WhatsApp" | "SMS";
};

const sample: Campaign[] = [
  { id: "1", name: "Premium Plan Launch", status: "active", audience: 1240, sent: 1198, replies: 312, conversions: 47, channel: "WhatsApp" },
  { id: "2", name: "Diwali Sale Reminder", status: "scheduled", audience: 856, sent: 0, replies: 0, conversions: 0, channel: "WhatsApp" },
  { id: "3", name: "Cart Abandonment Recovery", status: "active", audience: 432, sent: 421, replies: 89, conversions: 23, channel: "WhatsApp" },
  { id: "4", name: "New Feature Announcement", status: "draft", audience: 0, sent: 0, replies: 0, conversions: 0, channel: "WhatsApp" },
];

const statusStyle: Record<Campaign["status"], string> = {
  active: "bg-success-soft text-success",
  scheduled: "bg-warning-soft text-warning",
  draft: "bg-muted text-muted-foreground",
};

export const CampaignsPage = () => {
  return (
    <PageShell
      title="Campaigns"
      subtitle="WhatsApp marketing campaigns with AI-driven targeting"
      icon={<Megaphone className="w-4 h-4" />}
      actions={
        <Button size="sm" className="gap-2" disabled>
          <Plus className="w-3.5 h-3.5" />
          New Campaign
        </Button>
      }
    >
      {/* Phase preview banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-success p-6 mb-5 text-primary-foreground">
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute right-20 bottom-0 w-24 h-24 bg-white/10 rounded-full blur-xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Phase 6 preview</span>
            </div>
            <h2 className="text-2xl font-bold mb-1">Campaigns are coming</h2>
            <p className="text-[13px] opacity-90 max-w-md">
              Send WhatsApp templates to thousands of contacts, A/B test copy, and watch conversions land in your Inbox in real time.
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-[10px] uppercase tracking-wider opacity-75">Unlocks at</span>
            <span className="text-3xl font-bold leading-none">Phase 6</span>
          </div>
        </div>
      </div>

      {/* Campaign cards (sample) */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-bold">Sample Campaigns <span className="text-muted-foreground font-normal text-[12px]">(preview)</span></h3>
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Lock className="w-3 h-3" /> Read-only until Phase 6
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {sample.map((c) => {
          const replyRate = c.sent ? Math.round((c.replies / c.sent) * 100) : 0;
          const convRate = c.sent ? Math.round((c.conversions / c.sent) * 100) : 0;
          return (
            <div key={c.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-[14px] font-bold truncate">{c.name}</h4>
                    <span className={cn("text-[9px] font-bold uppercase px-1.5 py-0.5 rounded", statusStyle[c.status])}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{c.channel} · {c.audience.toLocaleString()} contacts</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <Metric icon={<MousePointerClick className="w-3 h-3" />} label="Sent" value={c.sent.toLocaleString()} />
                <Metric icon={<Users className="w-3 h-3" />} label="Replies" value={`${c.replies} (${replyRate}%)`} />
                <Metric icon={<ShoppingCart className="w-3 h-3" />} label="Won" value={`${c.conversions} (${convRate}%)`} accent />
              </div>

              {c.sent > 0 && (
                <div className="h-1 bg-muted rounded-full overflow-hidden flex">
                  <div className="h-full bg-success" style={{ width: `${convRate}%` }} />
                  <div className="h-full bg-primary" style={{ width: `${replyRate - convRate}%` }} />
                  <div className="h-full bg-muted-foreground/20" style={{ width: `${100 - replyRate}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-center text-[12px] text-muted-foreground">
        <TrendingUp className="w-4 h-4 inline mr-1.5 -mt-0.5 text-primary" />
        Campaigns will unlock after Twilio (Phase 3) is connected.
      </div>
    </PageShell>
  );
};

const Metric = ({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) => (
  <div className="bg-muted/40 rounded-lg p-2">
    <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
      {icon}
      {label}
    </div>
    <p className={cn("text-[13px] font-bold tabular-nums", accent && "text-success")}>{value}</p>
  </div>
);
