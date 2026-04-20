import { PageShell } from "@/components/PageShell";
import { Radio, Plus, Send, Calendar, Users, FileText, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Template = {
  id: string;
  name: string;
  category: "marketing" | "utility" | "authentication";
  approved: boolean;
  preview: string;
};

const templates: Template[] = [
  { id: "1", name: "welcome_message", category: "utility", approved: true, preview: "Hi {{1}}! 👋 Welcome to AddisonX. Your account is ready." },
  { id: "2", name: "diwali_offer_2026", category: "marketing", approved: true, preview: "🪔 Diwali Special! Get 30% off Premium until Nov 15. Reply YES to claim." },
  { id: "3", name: "appointment_reminder", category: "utility", approved: true, preview: "Reminder: Your demo is scheduled for {{1}} at {{2}}. Reply RESCHEDULE if needed." },
  { id: "4", name: "payment_link", category: "utility", approved: false, preview: "Hi {{1}}, here's your payment link: {{2}}. Valid for 24h." },
];

const categoryColor: Record<Template["category"], string> = {
  marketing: "bg-hot-soft text-hot",
  utility: "bg-primary-soft text-primary",
  authentication: "bg-accent-soft text-accent",
};

export const BroadcastsPage = () => {
  return (
    <PageShell
      title="Broadcasts"
      subtitle="One-time WhatsApp blasts to a targeted segment"
      icon={<Radio className="w-4 h-4" />}
      actions={
        <Button size="sm" className="gap-2" disabled>
          <Plus className="w-3.5 h-3.5" />
          New Broadcast
        </Button>
      }
    >
      {/* Composer preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-[13px] font-bold uppercase tracking-wider">Compose Broadcast</h3>
            <span className="ml-auto text-[10px] font-bold bg-warning-soft text-warning px-2 py-0.5 rounded">PREVIEW</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Audience</label>
              <div className="mt-1.5 h-11 px-3 rounded-lg border border-border bg-muted/40 flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">Hot leads · 256 contacts</span>
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Template</label>
              <div className="mt-1.5 h-11 px-3 rounded-lg border border-border bg-muted/40 flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">welcome_message</span>
                <FileText className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Schedule</label>
              <div className="mt-1.5 h-11 px-3 rounded-lg border border-border bg-muted/40 flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">Send immediately</span>
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            <Button className="w-full gap-2 mt-2" disabled>
              <Send className="w-4 h-4" />
              Send to 256 contacts
            </Button>
          </div>
        </div>

        {/* Phone preview */}
        <div className="bg-gradient-to-br from-primary-soft via-card to-success-soft border border-border rounded-2xl p-5 flex flex-col">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Live Preview</p>
          <div className="flex-1 bg-card rounded-xl border border-border p-3 flex flex-col gap-2 min-h-[200px]">
            <div className="self-start max-w-[85%] bg-[hsl(var(--chat-incoming))] rounded-2xl rounded-bl-md px-3 py-2 shadow-sm">
              <p className="text-[12px] leading-relaxed">Hi Priya! 👋 Welcome to AddisonX. Your account is ready.</p>
              <p className="text-[9px] text-muted-foreground mt-1">10:32 AM</p>
            </div>
          </div>
        </div>
      </div>

      {/* Templates */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-bold">Message Templates</h3>
        <Button variant="outline" size="sm" className="gap-2" disabled>
          <Plus className="w-3.5 h-3.5" />
          Submit Template
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {templates.map((t) => (
          <div key={t.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <code className="text-[12px] font-mono font-semibold truncate">{t.name}</code>
                <span className={cn("text-[9px] font-bold uppercase px-1.5 py-0.5 rounded", categoryColor[t.category])}>
                  {t.category}
                </span>
              </div>
              {t.approved ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-success">
                  <CheckCircle2 className="w-3 h-3" /> Approved
                </span>
              ) : (
                <span className="text-[10px] font-bold text-warning">Pending</span>
              )}
            </div>
            <p className="text-[12px] text-muted-foreground bg-muted/40 rounded-lg p-2.5 leading-relaxed">{t.preview}</p>
          </div>
        ))}
      </div>
    </PageShell>
  );
};
