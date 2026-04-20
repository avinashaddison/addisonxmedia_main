import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import { Settings, User, Phone, Bot, Bell, Shield, LogOut, Check, Plug, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Section = "profile" | "integrations" | "ai" | "notifications" | "account";

const sections: { id: Section; label: string; icon: React.ElementType; description: string }[] = [
  { id: "profile", label: "Profile", icon: User, description: "Your account details" },
  { id: "integrations", label: "Integrations", icon: Plug, description: "WhatsApp, Twilio, payments" },
  { id: "ai", label: "Addison AI", icon: Bot, description: "Tune your AI sales assistant" },
  { id: "notifications", label: "Notifications", icon: Bell, description: "Email & in-app alerts" },
  { id: "account", label: "Account", icon: Shield, description: "Security & sign out" },
];

export const SettingsPage = () => {
  const [active, setActive] = useState<Section>("profile");
  const { user, signOut } = useAuth();

  return (
    <PageShell
      title="Settings"
      subtitle="Configure your workspace"
      icon={<Settings className="w-4 h-4" />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5">
        {/* Side nav */}
        <nav className="bg-card border border-border rounded-xl p-2 h-fit lg:sticky lg:top-24">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = active === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                  isActive ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold">{s.label}</p>
                  <p className="text-[10px] opacity-70 truncate">{s.description}</p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Section panel */}
        <div className="bg-card border border-border rounded-xl p-6 min-h-[400px]">
          {active === "profile" && <ProfileSection user={user} />}
          {active === "integrations" && <IntegrationsSection />}
          {active === "ai" && <AISection />}
          {active === "notifications" && <NotificationsSection />}
          {active === "account" && <AccountSection email={user?.email} onSignOut={signOut} />}
        </div>
      </div>
    </PageShell>
  );
};

// --------- PROFILE ----------
const ProfileSection = ({ user }: { user: ReturnType<typeof useAuth>["user"] }) => {
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, phone: phone || null })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  };

  return (
    <div className="space-y-5 max-w-md">
      <SectionHeader title="Profile" subtitle="How you appear inside the workspace" />

      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground text-lg font-bold flex items-center justify-center">
          {(displayName || user?.email || "U")[0].toUpperCase()}
        </div>
        <div>
          <p className="text-[13px] font-semibold">{displayName || "—"}</p>
          <p className="text-[11px] text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="dn">Display name</Label>
          <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ph">Phone</Label>
          <Input id="ph" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
};

// --------- INTEGRATIONS ----------
const IntegrationsSection = () => {
  const items = [
    { name: "Twilio WhatsApp", description: "Send & receive messages on WhatsApp Business", icon: Phone, status: "Phase 3", connected: false },
    { name: "Lovable AI", description: "Powers Addison AI suggestions and lead scoring", icon: Sparkles, status: "Ready", connected: true },
    { name: "Razorpay Payments", description: "Send payment links inside chat", icon: Plug, status: "Phase 5", connected: false },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader title="Integrations" subtitle="Connect external services" />
      <div className="space-y-2">
        {items.map((i) => {
          const Icon = i.icon;
          return (
            <div key={i.name} className="flex items-center gap-3 p-3 border border-border rounded-xl hover:bg-muted/40 transition-colors">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                i.connected ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold">{i.name}</p>
                <p className="text-[11px] text-muted-foreground">{i.description}</p>
              </div>
              {i.connected ? (
                <span className="text-[10px] font-bold bg-success-soft text-success px-2 py-1 rounded flex items-center gap-1">
                  <Check className="w-3 h-3" /> Connected
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-1 rounded">{i.status}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --------- AI ----------
const AISection = () => {
  const [autoSuggest, setAutoSuggest] = useState(true);
  const [autoScore, setAutoScore] = useState(true);
  const [autoReply, setAutoReply] = useState(false);

  return (
    <div className="space-y-5 max-w-lg">
      <SectionHeader title="Addison AI" subtitle="Tune your AI sales assistant" />

      <div className="space-y-3">
        <ToggleRow
          label="AI reply suggestions"
          desc="Show 3 quick replies above the chat input"
          value={autoSuggest}
          onChange={setAutoSuggest}
        />
        <ToggleRow
          label="Auto lead scoring"
          desc="Re-score contacts after every message"
          value={autoScore}
          onChange={setAutoScore}
        />
        <ToggleRow
          label="Auto-reply mode"
          desc="Let AI reply to incoming messages without approval"
          value={autoReply}
          onChange={setAutoReply}
          danger
        />
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary-soft/40 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-[13px] font-bold">Sales Mode: Aggressive</p>
        </div>
        <p className="text-[11px] text-muted-foreground">
          AI prioritizes closing speed, sends offers earlier, and pushes for payment links sooner.
          Switch to balanced or nurture in Phase 4.
        </p>
      </div>
    </div>
  );
};

// --------- NOTIFICATIONS ----------
const NotificationsSection = () => {
  const [items, setItems] = useState({
    newMessage: true,
    hotLead: true,
    dailySummary: false,
    campaignReport: true,
  });

  return (
    <div className="space-y-5 max-w-lg">
      <SectionHeader title="Notifications" subtitle="What you'll be alerted about" />
      <div className="space-y-3">
        <ToggleRow label="New incoming message" desc="Browser & email" value={items.newMessage} onChange={(v) => setItems({ ...items, newMessage: v })} />
        <ToggleRow label="Hot lead detected" desc="When a lead's score crosses 80" value={items.hotLead} onChange={(v) => setItems({ ...items, hotLead: v })} />
        <ToggleRow label="Daily summary email" desc="Yesterday's conversations + revenue" value={items.dailySummary} onChange={(v) => setItems({ ...items, dailySummary: v })} />
        <ToggleRow label="Campaign reports" desc="Sent, replied, converted" value={items.campaignReport} onChange={(v) => setItems({ ...items, campaignReport: v })} />
      </div>
    </div>
  );
};

// --------- ACCOUNT ----------
const AccountSection = ({ email, onSignOut }: { email?: string; onSignOut: () => Promise<void> }) => {
  return (
    <div className="space-y-5 max-w-md">
      <SectionHeader title="Account" subtitle="Security and session" />

      <div className="rounded-xl border border-border p-4 space-y-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Signed in as</p>
        <p className="text-[14px] font-semibold">{email}</p>
      </div>

      <Button variant="outline" disabled className="w-full justify-start">
        Change password (coming soon)
      </Button>

      <Button
        variant="destructive"
        className="w-full justify-start gap-2"
        onClick={async () => {
          await onSignOut();
          toast.success("Signed out");
        }}
      >
        <LogOut className="w-4 h-4" />
        Sign out
      </Button>
    </div>
  );
};

// --------- shared ----------
const SectionHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div>
    <h3 className="text-[16px] font-bold">{title}</h3>
    <p className="text-[12px] text-muted-foreground">{subtitle}</p>
  </div>
);

const ToggleRow = ({
  label, desc, value, onChange, danger,
}: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void; danger?: boolean }) => (
  <div className={cn(
    "flex items-center gap-3 p-3 border rounded-xl transition-colors",
    danger ? "border-warning/30 bg-warning-soft/20" : "border-border hover:bg-muted/40"
  )}>
    <div className="flex-1 min-w-0">
      <p className="text-[13px] font-semibold">{label}</p>
      <p className="text-[11px] text-muted-foreground">{desc}</p>
    </div>
    <Switch checked={value} onCheckedChange={onChange} />
  </div>
);
