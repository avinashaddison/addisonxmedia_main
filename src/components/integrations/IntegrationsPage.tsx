import { useState } from "react";
import { CheckCircle2, Plug, Plus, Settings, ExternalLink, MessageCircle, IndianRupee, Mail, Webhook, Zap, Globe, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Status = "connected" | "available" | "coming_soon";

type Integration = {
  id: string;
  name: string;
  category: "Messaging" | "Payments" | "Email" | "Automation" | "Analytics";
  description: string;
  icon: typeof MessageCircle;
  iconBg: string;
  status: Status;
  connectedAccount?: string;
  features: string[];
  enabled?: boolean;
};

const INTEGRATIONS: Integration[] = [
  {
    id: "twilio",
    name: "WhatsApp via Twilio",
    category: "Messaging",
    description: "Send & receive WhatsApp messages with Twilio's official API.",
    icon: MessageCircle,
    iconBg: "bg-success",
    status: "connected",
    connectedAccount: "AC9d…f12 · +91 81234 56780",
    features: ["2-way messaging", "Media support", "Delivery receipts"],
    enabled: true,
  },
  {
    id: "meta",
    name: "WhatsApp via Meta",
    category: "Messaging",
    description: "Direct connection to WhatsApp Business Platform from Meta.",
    icon: MessageCircle,
    iconBg: "bg-[#25D366]",
    status: "available",
    features: ["Lower cost per message", "Native templates", "Higher trust score"],
  },
  {
    id: "razorpay",
    name: "Razorpay",
    category: "Payments",
    description: "Accept INR payments via UPI, cards & netbanking.",
    icon: IndianRupee,
    iconBg: "bg-[#3395FF]",
    status: "connected",
    connectedAccount: "rzp_live_4Xj…aQ",
    features: ["UPI / Cards / Netbanking", "Auto-reconcile", "Refunds"],
    enabled: true,
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "Payments",
    description: "Charge customers globally in 135+ currencies.",
    icon: IndianRupee,
    iconBg: "bg-[#635BFF]",
    status: "available",
    features: ["Global checkout", "Subscriptions", "Smart routing"],
  },
  {
    id: "resend",
    name: "Resend (Email)",
    category: "Email",
    description: "Transactional & marketing email with domain auth.",
    icon: Mail,
    iconBg: "bg-foreground",
    status: "connected",
    connectedAccount: "noreply@addisonx.media",
    features: ["DKIM/SPF", "Templates", "Webhooks"],
    enabled: true,
  },
  {
    id: "gmail",
    name: "Gmail",
    category: "Email",
    description: "Sync conversations to & from your Gmail inbox.",
    icon: Mail,
    iconBg: "bg-[#EA4335]",
    status: "available",
    features: ["Inbox sync", "Send as", "Auto-threading"],
  },
  {
    id: "zapier",
    name: "Zapier",
    category: "Automation",
    description: "Connect AddisonX to 6000+ apps without code.",
    icon: Zap,
    iconBg: "bg-[#FF4F00]",
    status: "available",
    features: ["Triggers & actions", "Multi-step zaps", "Webhooks"],
  },
  {
    id: "webhook",
    name: "Custom Webhooks",
    category: "Automation",
    description: "Push events to any URL — leads, payments, deal updates.",
    icon: Webhook,
    iconBg: "bg-accent",
    status: "connected",
    connectedAccount: "3 endpoints active",
    features: ["Real-time events", "Retry logic", "Signed payloads"],
    enabled: true,
  },
  {
    id: "ga",
    name: "Google Analytics 4",
    category: "Analytics",
    description: "Send conversion events to GA4 for attribution.",
    icon: BarChart3,
    iconBg: "bg-[#F9AB00]",
    status: "coming_soon",
    features: ["Conversion tracking", "Audience sync", "UTM mapping"],
  },
  {
    id: "site",
    name: "Website lead form",
    category: "Messaging",
    description: "Embed a WhatsApp-first lead form on your site.",
    icon: Globe,
    iconBg: "bg-primary",
    status: "available",
    features: ["1-click embed", "Auto-tag source", "Conversion ready"],
  },
];

const CATEGORIES = ["All", "Messaging", "Payments", "Email", "Automation", "Analytics"] as const;

const STATUS_BADGE: Record<Status, { label: string; className: string }> = {
  connected: { label: "Connected", className: "bg-success/15 text-success border-success/30" },
  available: { label: "Available", className: "bg-muted text-muted-foreground border-border" },
  coming_soon: { label: "Coming soon", className: "bg-warning/10 text-warning border-warning/30" },
};

export const IntegrationsPage = () => {
  const [items, setItems] = useState<Integration[]>(INTEGRATIONS);
  const [active, setActive] = useState<(typeof CATEGORIES)[number]>("All");

  const filtered = active === "All" ? items : items.filter((i) => i.category === active);
  const connectedCount = items.filter((i) => i.status === "connected").length;

  const toggle = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, enabled: !i.enabled } : i))
    );
    const it = items.find((i) => i.id === id);
    toast.success(`${it?.name} ${it?.enabled ? "paused" : "resumed"}`);
  };

  const connect = (id: string) => {
    const it = items.find((i) => i.id === id);
    if (it?.status === "coming_soon") {
      toast.info("This integration is launching soon — we'll notify you");
      return;
    }
    toast.success(`Opening ${it?.name} setup wizard…`);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-muted/20">
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight">Integrations</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Connect AddisonX to the tools that power your business
            </p>
          </div>
          <Button variant="outline" className="gap-2">
            <Plug className="w-4 h-4" />
            Browse marketplace
          </Button>
        </div>

        {/* Hero strip */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary-soft via-card to-accent-soft p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground flex items-center justify-center shadow-md">
            <Plug className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold">{connectedCount} integrations active</p>
            <p className="text-sm text-muted-foreground">All systems operational · last sync just now</p>
          </div>
          <div className="flex items-center gap-2 text-success text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Live
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => {
            const isActive = c === active;
            return (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap border",
                  isActive
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
                )}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((i) => {
            const Icon = i.icon;
            const badge = STATUS_BADGE[i.status];
            return (
              <div
                key={i.id}
                className="bg-card border border-border rounded-2xl p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={cn("w-11 h-11 rounded-xl text-white flex items-center justify-center shadow-sm flex-shrink-0", i.iconBg)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[14px] truncate">{i.name}</p>
                      {i.status === "connected" && <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{i.category}</p>
                  </div>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-semibold", badge.className)}>
                    {badge.label}
                  </span>
                </div>

                <p className="text-[13px] text-muted-foreground leading-relaxed flex-1">{i.description}</p>

                <ul className="mt-3 space-y-1">
                  {i.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[12px] text-foreground/80">
                      <CheckCircle2 className="w-3 h-3 text-success/70 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {i.connectedAccount && (
                  <div className="mt-3 px-2.5 py-2 rounded-lg bg-muted/60 text-[11px] text-muted-foreground truncate">
                    <span className="font-semibold text-foreground">Account: </span>
                    {i.connectedAccount}
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                  {i.status === "connected" ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Switch checked={i.enabled} onCheckedChange={() => toggle(i.id)} />
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {i.enabled ? "Enabled" : "Paused"}
                        </span>
                      </div>
                      <Button size="sm" variant="ghost" className="h-8 gap-1.5">
                        <Settings className="w-3.5 h-3.5" />
                        Configure
                      </Button>
                    </>
                  ) : i.status === "coming_soon" ? (
                    <Button size="sm" variant="outline" className="w-full" disabled>
                      Notify me
                    </Button>
                  ) : (
                    <Button size="sm" className="w-full gap-1.5" onClick={() => connect(i.id)}>
                      <Plus className="w-3.5 h-3.5" />
                      Connect
                      <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
