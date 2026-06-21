import { useMemo, useState } from "react";
import { CheckCircle2, Plug, Plus, Settings, ExternalLink, MessageCircle, IndianRupee, Mail, Webhook, Zap, Globe, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { api } from "@/lib/api";

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

// Static catalog — Meta status is overridden at runtime from /api/integrations/meta.
const INTEGRATIONS: Integration[] = [
  {
    id: "meta",
    name: "WhatsApp via Meta",
    category: "Messaging",
    description: "Direct connection to WhatsApp Business Platform from Meta. Configure in Settings → Integrations.",
    icon: MessageCircle,
    iconBg: "bg-[#25D366]",
    status: "available",
    features: ["Send & receive messages", "Native templates", "Webhook for inbound", "Pay-in-chat ready"],
  },
  {
    id: "razorpay",
    name: "Razorpay",
    category: "Payments",
    description: "Accept INR payments via UPI, cards & netbanking.",
    icon: IndianRupee,
    iconBg: "bg-[#3395FF]",
    status: "coming_soon",
    features: ["UPI / Cards / Netbanking", "Auto-reconcile", "Refunds"],
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "Payments",
    description: "Charge customers globally in 135+ currencies.",
    icon: IndianRupee,
    iconBg: "bg-[#635BFF]",
    status: "coming_soon",
    features: ["Global checkout", "Subscriptions", "Smart routing"],
  },
  {
    id: "resend",
    name: "Resend (Email)",
    category: "Email",
    description: "Transactional emails for password reset, follow-ups & receipts.",
    icon: Mail,
    iconBg: "bg-foreground",
    status: "coming_soon",
    features: ["DKIM/SPF", "Templates", "Webhooks"],
  },
  {
    id: "gmail",
    name: "Gmail",
    category: "Email",
    description: "Sync conversations to & from your Gmail inbox.",
    icon: Mail,
    iconBg: "bg-[#EA4335]",
    status: "coming_soon",
    features: ["Inbox sync", "Send as", "Auto-threading"],
  },
  {
    id: "zapier",
    name: "Zapier",
    category: "Automation",
    description: "Connect AddisonX to 6000+ apps without code.",
    icon: Zap,
    iconBg: "bg-[#FF4F00]",
    status: "coming_soon",
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
  const [active, setActive] = useState<(typeof CATEGORIES)[number]>("All");

  // Real-time Meta status from server. Other catalog items are static.
  const { data: metaCfg } = useQuery({
    queryKey: ["meta-config"],
    queryFn: () => api.getMetaConfig(),
  });

  // Merge live Meta status into the static catalog so the UI shows truth.
  const items = useMemo<Integration[]>(() => {
    return INTEGRATIONS.map((i) => {
      if (i.id === "meta" && metaCfg) {
        return {
          ...i,
          status: metaCfg.enabled ? "connected" : "available",
          connectedAccount: metaCfg.display_phone_number ?? undefined,
          enabled: metaCfg.enabled,
        };
      }
      return i;
    });
  }, [metaCfg]);

  const filtered = active === "All" ? items : items.filter((i) => i.category === active);
  const connectedCount = items.filter((i) => i.status === "connected").length;

  const connect = (id: string) => {
    const it = items.find((i) => i.id === id);
    if (it?.status === "coming_soon") {
      toast.info("This integration is launching soon — we'll notify you");
      return;
    }
    if (it?.id === "meta") {
      // Direct user to settings → integrations where the form lives
      window.location.href = "/app/settings";
      return;
    }
    toast.info(`${it?.name} setup not yet wired — check Settings → Integrations`);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#FFF6E8]">
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF6A1F] to-[#E85C12] text-white flex items-center justify-center shadow-md">
              <Plug className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-[26px] font-black tracking-tight">Integrations</h1>
              <p className="text-[12px] text-foreground/70 mt-0.5 font-medium">
                AddisonX ko aapke business tools se connect karein
              </p>
            </div>
          </div>
          <Button variant="outline" className="gap-2">
            <Plug className="w-4 h-4" />
            Browse marketplace
          </Button>
        </div>

        {/* Hero strip */}
        <div className="rounded-2xl border-2 border-[#0E8A4B] bg-white p-5 flex items-center gap-4 shadow-[0_4px_0_0_#0A6E3C]">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0E8A4B] to-[#16C172] text-white flex items-center justify-center shadow-md">
            <Plug className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-lg"><span className="text-[#0E8A4B]">{connectedCount}</span> integrations active</p>
            <p className="text-[12px] text-foreground/70 font-medium">Sab systems running · last sync abhi-abhi</p>
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
                    <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => connect(i.id)}>
                      <Settings className="w-3.5 h-3.5" />
                      Manage in Settings
                    </Button>
                  ) : i.status === "coming_soon" ? (
                    <Button size="sm" variant="outline" className="w-full" disabled>
                      Coming soon
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
