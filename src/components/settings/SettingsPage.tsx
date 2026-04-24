import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import {
  Settings, User, Phone, Bot, Bell, Shield, LogOut, Check, Plug, Sparkles,
  CreditCard, Users, Mail, MessageSquare, Upload, Zap, Target, BookOpen,
  KeyRound, ShieldCheck, LogIn, Camera, Crown, TrendingUp, FileText,
  PlugZap, Rocket, AlertCircle, Trash2, Plus, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Section = "profile" | "integrations" | "ai" | "notifications" | "account" | "team" | "billing";

const sections: { id: Section; label: string; icon: React.ElementType; description: string; accent: string }[] = [
  { id: "profile",       label: "Profile",       icon: User,        description: "Identity & avatar",         accent: "from-primary to-primary-glow" },
  { id: "integrations",  label: "Integrations",  icon: PlugZap,     description: "WhatsApp, payments, email", accent: "from-accent to-primary" },
  { id: "ai",            label: "Addison AI",    icon: Bot,         description: "Mode, tone, knowledge",     accent: "from-primary to-accent" },
  { id: "notifications", label: "Notifications", icon: Bell,        description: "Smart alerts & channels",   accent: "from-warning to-primary" },
  { id: "team",          label: "Team",          icon: Users,       description: "Invite & assign roles",     accent: "from-accent to-primary-glow" },
  { id: "billing",       label: "Billing",       icon: CreditCard,  description: "Plan, usage & upgrade",     accent: "from-primary-glow to-accent" },
  { id: "account",       label: "Account",       icon: Shield,      description: "Security & 2FA",            accent: "from-hot to-warning" },
];

export const SettingsPage = () => {
  const [active, setActive] = useState<Section>("profile");
  const [dirty, setDirty] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <PageShell
      title="Settings"
      subtitle="Configure how your sales engine runs"
      icon={<Settings className="w-4 h-4" />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
        {/* Side nav */}
        <nav className="bg-card border border-border rounded-xl p-2 h-fit lg:sticky lg:top-24 space-y-1">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = active === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={cn(
                  "group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 relative overflow-hidden",
                  isActive
                    ? "bg-gradient-to-r from-primary/10 to-accent/5 text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:translate-x-0.5"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-[3px] rounded-r-full bg-gradient-to-b from-primary to-accent" />
                )}
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                    isActive
                      ? `bg-gradient-to-br ${s.accent} text-white shadow-md shadow-primary/30`
                      : "bg-muted text-muted-foreground group-hover:bg-card group-hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[13px] font-semibold leading-tight", isActive && "text-foreground")}>{s.label}</p>
                  <p className="text-[10px] opacity-70 truncate leading-tight mt-0.5">{s.description}</p>
                </div>
              </button>
            );
          })}

          <div className="mt-3 pt-3 border-t border-border px-2">
            <div className="rounded-lg bg-gradient-to-br from-primary/10 via-accent/5 to-transparent p-3 text-[11px]">
              <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
                <Crown className="w-3 h-3 text-warning" /> Pro tip
              </div>
              <p className="text-muted-foreground leading-snug">
                Set Addison AI to <span className="text-primary font-semibold">Assisted</span> mode while you train it.
              </p>
            </div>
          </div>
        </nav>

        {/* Section panel */}
        <div className="space-y-4 animate-fade-in" key={active}>
          {active === "profile"       && <ProfileSection user={user} onDirty={setDirty} />}
          {active === "integrations"  && <IntegrationsSection />}
          {active === "ai"            && <AISection />}
          {active === "notifications" && <NotificationsSection />}
          {active === "team"          && <TeamSection />}
          {active === "billing"       && <BillingSection />}
          {active === "account"       && <AccountSection email={user?.email} onSignOut={signOut} />}
        </div>
      </div>

      {/* Sticky save bar (visual cue when dirty) */}
      {dirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="glass-strong rounded-full px-4 py-2 flex items-center gap-3 shadow-2xl">
            <span className="text-[12px] text-muted-foreground">You have unsaved changes</span>
            <Button size="sm" className="h-7 rounded-full text-[11px] gap-1.5" onClick={() => { toast.success("All changes saved"); setDirty(false); }}>
              <Save className="w-3 h-3" /> Save all
            </Button>
          </div>
        </div>
      )}
    </PageShell>
  );
};

/* ============================== PROFILE ============================== */
const ProfileSection = ({ user, onDirty }: { user: ReturnType<typeof useAuth>["user"]; onDirty: (v: boolean) => void }) => {
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [workspace, setWorkspace] = useState("AddisonX Media");
  const [role] = useState<"Admin" | "Sales Agent">("Admin");
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const initial = useRef<{ displayName: string; phone: string; workspace: string }>({ displayName: "", phone: "", workspace: "AddisonX Media" });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setPhone(profile.phone ?? "");
      initial.current = { displayName: profile.display_name ?? "", phone: profile.phone ?? "", workspace: "AddisonX Media" };
    }
  }, [profile]);

  useEffect(() => {
    const changed = displayName !== initial.current.displayName || phone !== initial.current.phone || workspace !== initial.current.workspace;
    onDirty(changed);
  }, [displayName, phone, workspace, onDirty]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName, phone: phone || null }).eq("user_id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    initial.current = { displayName, phone, workspace };
    onDirty(false);
    toast.success("Profile updated", { icon: <Check className="w-4 h-4 text-success" /> });
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setAvatarPreview(ev.target?.result as string); toast.success("Avatar staged — click Save to apply"); };
    reader.readAsDataURL(file);
  };

  const initials = (displayName || user?.email || "U").slice(0, 2).toUpperCase();

  return (
    <SectionCard
      title="Profile"
      subtitle="How you appear inside the workspace"
      icon={<User className="w-4 h-4" />}
    >
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative group">
            <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-primary to-accent text-white text-3xl font-bold flex items-center justify-center overflow-hidden ring-4 ring-primary/10">
              {avatarPreview ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" /> : initials}
            </div>
            <button
              onClick={() => fileInput.current?.click()}
              className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
            >
              <Camera className="w-6 h-6 text-white" />
            </button>
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onPick} />
          </div>
          <Badge variant="outline" className="gap-1.5 text-[10px] font-bold">
            <ShieldCheck className="w-3 h-3 text-primary" /> {role}
          </Badge>
          <button onClick={() => fileInput.current?.click()} className="text-[11px] text-primary hover:underline font-semibold">
            Change photo
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldRow label="Display name">
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
            </FieldRow>
            <FieldRow label="Workspace">
              <Input value={workspace} onChange={(e) => setWorkspace(e.target.value)} />
            </FieldRow>
            <FieldRow label="Email" hint="Verified">
              <Input value={user?.email ?? ""} disabled className="bg-muted/40" />
            </FieldRow>
            <FieldRow label="Phone">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" />
            </FieldRow>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving} className="gap-2 shadow-md shadow-primary/20">
              {saving ? <>Saving…</> : <><Check className="w-4 h-4" /> Save changes</>}
            </Button>
            <span className="text-[11px] text-muted-foreground">Changes auto-sync across devices</span>
          </div>
        </div>
      </div>
    </SectionCard>
  );
};

/* ============================== INTEGRATIONS ============================== */
type Integration = {
  name: string; provider: string; description: string; icon: React.ElementType;
  category: "Messaging" | "Payments" | "Email"; connected: boolean; tone: "primary" | "accent" | "warning" | "hot";
};

const IntegrationsSection = () => {
  const [items, setItems] = useState<Integration[]>([
    { name: "WhatsApp Business",  provider: "Twilio",      description: "Send & receive messages, templates, media",   icon: MessageSquare, category: "Messaging", connected: true,  tone: "primary" },
    { name: "WhatsApp Cloud API", provider: "Meta",        description: "Direct integration with Meta's official API", icon: MessageSquare, category: "Messaging", connected: false, tone: "primary" },
    { name: "Razorpay",           provider: "Payments",    description: "Send payment links, capture conversions",     icon: CreditCard,    category: "Payments",  connected: true,  tone: "accent" },
    { name: "Stripe",             provider: "Payments",    description: "Global checkout for international leads",     icon: CreditCard,    category: "Payments",  connected: false, tone: "accent" },
    { name: "Gmail / SMTP",       provider: "Email",       description: "Send transactional emails & follow-ups",      icon: Mail,          category: "Email",     connected: false, tone: "warning" },
    { name: "Lovable AI Gateway", provider: "AI",          description: "Powers Addison AI replies & lead scoring",    icon: Sparkles,      category: "Messaging", connected: true,  tone: "primary" },
  ]);

  const toggle = (name: string) => {
    setItems((arr) => arr.map((i) => (i.name === name ? { ...i, connected: !i.connected } : i)));
    toast.success(`Updated ${name}`);
  };

  const test = (name: string) => toast.success(`Test ping sent to ${name}`, { icon: <Zap className="w-4 h-4 text-primary" /> });

  const grouped = useMemo(() => {
    return items.reduce<Record<string, Integration[]>>((acc, i) => {
      (acc[i.category] ??= []).push(i); return acc;
    }, {});
  }, [items]);

  return (
    <SectionCard
      title="Integrations"
      subtitle="Connect the tools that power your revenue"
      icon={<PlugZap className="w-4 h-4" />}
      headerRight={
        <Badge variant="outline" className="gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          {items.filter((i) => i.connected).length} of {items.length} connected
        </Badge>
      }
    >
      <div className="space-y-5">
        {Object.entries(grouped).map(([cat, list]) => (
          <div key={cat}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">{cat}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {list.map((i) => {
                const Icon = i.icon;
                const toneBg = {
                  primary: "from-primary/15 to-primary/5 text-primary",
                  accent:  "from-accent/15  to-accent/5  text-accent",
                  warning: "from-warning/15 to-warning/5 text-warning",
                  hot:     "from-hot/15     to-hot/5     text-hot",
                }[i.tone];
                return (
                  <div
                    key={i.name}
                    className={cn(
                      "group relative rounded-xl border p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                      i.connected ? "border-primary/30 bg-primary-soft/30" : "border-border bg-card hover:border-primary/40"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0", toneBg)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-[13px] font-bold leading-tight">{i.name}</p>
                          <span className="text-[9px] text-muted-foreground font-medium">{i.provider}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">{i.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span
                          className={cn(
                            "text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1",
                            i.connected ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"
                          )}
                        >
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              i.connected ? "bg-success animate-pulse" : "bg-muted-foreground"
                            )}
                          />
                          {i.connected ? "Live" : "Idle"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/60">
                      {i.connected ? (
                        <>
                          <Button size="sm" variant="outline" className="h-7 text-[11px] flex-1 gap-1" onClick={() => test(i.name)}>
                            <Zap className="w-3 h-3" /> Test
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-[11px] flex-1">Configure</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-[11px] text-hot hover:text-hot hover:bg-hot/10" onClick={() => toggle(i.name)}>
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" className="h-7 text-[11px] w-full gap-1.5 shadow-sm shadow-primary/20" onClick={() => toggle(i.name)}>
                          <Plug className="w-3 h-3" /> Connect {i.name}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
};

/* ============================== AI ============================== */
type AIMode = "manual" | "assisted" | "auto";
type AITone = "friendly" | "professional" | "sales" | "closer";
type AIGoal = "leads" | "appointments" | "sales";

const AISection = () => {
  const [mode, setMode] = useState<AIMode>("assisted");
  const [tone, setTone] = useState<AITone>("sales");
  const [goal, setGoal] = useState<AIGoal>("sales");
  const [autoScore, setAutoScore] = useState(true);
  const [knowledge, setKnowledge] = useState<{ name: string; size: string; type: string }[]>([
    { name: "Pricing-2025.pdf", size: "248 KB", type: "Pricing" },
    { name: "FAQ-services.md",  size: "12 KB",  type: "FAQs" },
  ]);
  const fileRef = useRef<HTMLInputElement>(null);

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setKnowledge((k) => [
      ...k,
      ...files.map((f) => ({ name: f.name, size: `${Math.round(f.size / 1024)} KB`, type: "Custom" })),
    ]);
    toast.success(`${files.length} file(s) added to AI knowledge base`);
  };

  return (
    <>
      <SectionCard
        title="Addison AI"
        subtitle="Tune how your AI sales agent thinks, talks, and closes"
        icon={<Bot className="w-4 h-4" />}
        headerRight={
          <Badge className="gap-1.5 bg-gradient-to-r from-primary to-accent text-white border-0">
            <Sparkles className="w-3 h-3" /> Active
          </Badge>
        }
      >
        {/* AI mode */}
        <div className="space-y-2 mb-5">
          <ControlLabel icon={<Zap className="w-3.5 h-3.5" />} label="AI Reply Mode" hint="Who hits send on outgoing messages" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(
              [
                { id: "manual",   title: "Manual",    desc: "You write every reply",                    icon: User },
                { id: "assisted", title: "Assisted",  desc: "AI suggests, you approve",                 icon: Sparkles },
                { id: "auto",     title: "Automatic", desc: "AI replies instantly, 24/7",               icon: Rocket, danger: true },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              const isActive = mode === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setMode(opt.id)}
                  className={cn(
                    "text-left p-3 rounded-xl border transition-all duration-200 hover:-translate-y-0.5",
                    isActive
                      ? opt.danger
                        ? "border-hot bg-hot/5 ring-2 ring-hot/30"
                        : "border-primary bg-primary-soft/40 ring-2 ring-primary/30 shadow-md shadow-primary/10"
                      : "border-border hover:border-primary/40 hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={cn("w-4 h-4", isActive ? (opt.danger ? "text-hot" : "text-primary") : "text-muted-foreground")} />
                    <p className="text-[13px] font-bold">{opt.title}</p>
                    {isActive && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tone */}
        <div className="space-y-2 mb-5">
          <ControlLabel icon={<MessageSquare className="w-3.5 h-3.5" />} label="Tone of Voice" hint="The personality your AI projects" />
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "friendly",     label: "😊 Friendly",       color: "primary" },
                { id: "professional", label: "💼 Professional",   color: "accent" },
                { id: "sales",        label: "🔥 Sales-focused",  color: "warning" },
                { id: "closer",       label: "💰 Aggressive Closer", color: "hot" },
              ] as const
            ).map((t) => {
              const isActive = tone === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  className={cn(
                    "px-3.5 py-2 rounded-full text-[12px] font-semibold border transition-all",
                    isActive
                      ? "bg-foreground text-background border-foreground shadow-md scale-105"
                      : "bg-card border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Goal */}
        <div className="space-y-2 mb-5">
          <ControlLabel icon={<Target className="w-3.5 h-3.5" />} label="Primary Goal" hint="What outcome AI should optimize for" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(
              [
                { id: "leads",        title: "Lead Generation",     emoji: "🎯", metric: "Qualify & capture" },
                { id: "appointments", title: "Appointment Booking", emoji: "📅", metric: "Schedule calls" },
                { id: "sales",        title: "Closing Sales",       emoji: "💰", metric: "Drive payments" },
              ] as const
            ).map((g) => {
              const isActive = goal === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className={cn(
                    "text-left p-3 rounded-xl border transition-all hover:-translate-y-0.5",
                    isActive
                      ? "border-primary bg-gradient-to-br from-primary/10 to-accent/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <p className="text-xl mb-1">{g.emoji}</p>
                  <p className="text-[12px] font-bold">{g.title}</p>
                  <p className="text-[10px] text-muted-foreground">{g.metric}</p>
                </button>
              );
            })}
          </div>
        </div>

        <ToggleRow
          label="Auto lead scoring"
          desc="Re-score every contact after each message based on intent"
          value={autoScore}
          onChange={setAutoScore}
        />
      </SectionCard>

      {/* Knowledge base */}
      <SectionCard
        title="Knowledge Base"
        subtitle="Upload FAQs, pricing & service docs — Addison AI learns from these"
        icon={<BookOpen className="w-4 h-4" />}
      >
        <div
          onClick={() => fileRef.current?.click()}
          className="cursor-pointer border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary-soft/30 transition-all rounded-xl p-6 text-center mb-3"
        >
          <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center mx-auto mb-2">
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-[13px] font-semibold">Drop files or click to upload</p>
          <p className="text-[11px] text-muted-foreground">PDF, DOCX, MD, TXT • up to 10 MB each</p>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={onUpload}
                 accept=".pdf,.doc,.docx,.md,.txt" />
        </div>

        <div className="space-y-1.5">
          {knowledge.map((k, idx) => (
            <div key={idx} className="flex items-center gap-3 p-2.5 border border-border rounded-lg hover:bg-muted/40 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold truncate">{k.name}</p>
                <p className="text-[10px] text-muted-foreground">{k.type} • {k.size}</p>
              </div>
              <Badge variant="outline" className="text-[9px] gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success" /> Indexed
              </Badge>
              <button
                onClick={() => { setKnowledge((arr) => arr.filter((_, i) => i !== idx)); toast.success("Removed from knowledge base"); }}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-hot/10 text-muted-foreground hover:text-hot transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
};

/* ============================== NOTIFICATIONS ============================== */
type NotificationKey = "newLead" | "hotLead" | "missedFollowup" | "paymentReceived";
type Channels = { whatsapp: boolean; email: boolean; inApp: boolean };

const NotificationsSection = () => {
  const [prefs, setPrefs] = useState<Record<NotificationKey, Channels>>({
    newLead:         { whatsapp: false, email: true,  inApp: true  },
    hotLead:         { whatsapp: true,  email: true,  inApp: true  },
    missedFollowup:  { whatsapp: true,  email: false, inApp: true  },
    paymentReceived: { whatsapp: true,  email: true,  inApp: true  },
  });

  const set = (key: NotificationKey, channel: keyof Channels, val: boolean) => {
    setPrefs((p) => ({ ...p, [key]: { ...p[key], [channel]: val } }));
  };

  const rows: { key: NotificationKey; title: string; desc: string; icon: React.ElementType; tone: string }[] = [
    { key: "newLead",         title: "New lead",          desc: "When someone messages you for the first time",   icon: Plus,         tone: "text-accent" },
    { key: "hotLead",         title: "Hot lead detected", desc: "Lead score crosses 80 — strike now",             icon: Sparkles,     tone: "text-hot" },
    { key: "missedFollowup",  title: "Missed follow-up",  desc: "A scheduled task went past due",                  icon: AlertCircle,  tone: "text-warning" },
    { key: "paymentReceived", title: "Payment received",  desc: "Razorpay or Stripe captured a payment",           icon: CreditCard,   tone: "text-primary" },
  ];

  return (
    <SectionCard
      title="Notifications"
      subtitle="Choose what wakes you up — and through which channel"
      icon={<Bell className="w-4 h-4" />}
    >
      {/* Header row */}
      <div className="hidden sm:grid grid-cols-[1fr_70px_70px_70px] gap-2 px-3 pb-2 mb-2 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <span>Event</span>
        <span className="text-center">WhatsApp</span>
        <span className="text-center">Email</span>
        <span className="text-center">In-app</span>
      </div>

      <div className="space-y-1.5">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.key} className="grid grid-cols-1 sm:grid-cols-[1fr_70px_70px_70px] gap-2 items-center p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className={cn("w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0", r.tone)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold">{r.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">{r.desc}</p>
                </div>
              </div>
              <div className="flex justify-center"><Switch checked={prefs[r.key].whatsapp} onCheckedChange={(v) => set(r.key, "whatsapp", v)} /></div>
              <div className="flex justify-center"><Switch checked={prefs[r.key].email}    onCheckedChange={(v) => set(r.key, "email",    v)} /></div>
              <div className="flex justify-center"><Switch checked={prefs[r.key].inApp}    onCheckedChange={(v) => set(r.key, "inApp",    v)} /></div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
};

/* ============================== TEAM ============================== */
type Member = { id: string; name: string; email: string; role: "Admin" | "Sales Agent"; status: "active" | "invited"; assigned: number };

const TeamSection = () => {
  const [members, setMembers] = useState<Member[]>([
    { id: "1", name: "You",         email: "you@addisonx.com",   role: "Admin",       status: "active",  assigned: 12 },
    { id: "2", name: "Karan Mehta", email: "karan@addisonx.com", role: "Sales Agent", status: "active",  assigned: 8  },
    { id: "3", name: "Priya Singh", email: "priya@addisonx.com", role: "Sales Agent", status: "invited", assigned: 0  },
  ]);
  const [invite, setInvite] = useState("");

  const sendInvite = () => {
    if (!invite.includes("@")) { toast.error("Enter a valid email"); return; }
    setMembers((m) => [...m, { id: String(Date.now()), name: invite.split("@")[0], email: invite, role: "Sales Agent", status: "invited", assigned: 0 }]);
    setInvite("");
    toast.success(`Invite sent to ${invite}`, { icon: <Mail className="w-4 h-4 text-primary" /> });
  };

  return (
    <SectionCard
      title="Team Management"
      subtitle="Invite agents, assign chats, control access"
      icon={<Users className="w-4 h-4" />}
      headerRight={<Badge variant="outline" className="gap-1.5 text-[10px]"><Users className="w-3 h-3" /> {members.length} members</Badge>}
    >
      {/* Invite */}
      <div className="flex gap-2 mb-4 p-3 rounded-xl border border-dashed border-primary/30 bg-primary-soft/20">
        <Input
          value={invite}
          onChange={(e) => setInvite(e.target.value)}
          placeholder="teammate@yourcompany.com"
          className="bg-card"
          onKeyDown={(e) => e.key === "Enter" && sendInvite()}
        />
        <Button onClick={sendInvite} className="gap-1.5 shadow-md shadow-primary/20">
          <Plus className="w-4 h-4" /> Invite
        </Button>
      </div>

      <div className="space-y-1.5">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/40 transition-colors">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              {m.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-semibold truncate">{m.name}</p>
                {m.status === "invited" && <Badge variant="outline" className="text-[9px] gap-1"><span className="w-1.5 h-1.5 rounded-full bg-warning" /> Pending</Badge>}
              </div>
              <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-[11px] font-bold text-foreground">{m.assigned}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Chats</p>
            </div>
            <Badge
              className={cn(
                "text-[10px] gap-1",
                m.role === "Admin" ? "bg-primary text-primary-foreground" : "bg-accent-soft text-accent border-0"
              )}
            >
              {m.role === "Admin" && <Crown className="w-3 h-3" />}
              {m.role}
            </Badge>
          </div>
        ))}
      </div>
    </SectionCard>
  );
};

/* ============================== BILLING ============================== */
const BillingSection = () => {
  const usage = { messages: 8420, messagesLimit: 25000, contacts: 1240, contactsLimit: 5000 };
  const msgPct = (usage.messages / usage.messagesLimit) * 100;
  const ctPct  = (usage.contacts / usage.contactsLimit) * 100;

  return (
    <>
      <SectionCard
        title="Billing & Usage"
        subtitle="Your plan, what you've used, and where to grow"
        icon={<CreditCard className="w-4 h-4" />}
      >
        {/* Plan card */}
        <div className="rounded-xl bg-gradient-to-br from-primary via-primary-glow to-accent p-5 text-primary-foreground mb-4 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-4 h-4" />
                <p className="text-[11px] font-bold uppercase tracking-widest opacity-90">Current Plan</p>
              </div>
              <p className="text-2xl font-extrabold">Growth</p>
              <p className="text-[12px] opacity-90 mt-0.5">₹4,999 / month • Renews on Dec 24</p>
            </div>
            <Button className="bg-white text-primary hover:bg-white/90 gap-1.5 shadow-lg">
              <TrendingUp className="w-4 h-4" /> Upgrade to Scale
            </Button>
          </div>
        </div>

        {/* Usage */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <UsageCard label="Messages sent" used={usage.messages} limit={usage.messagesLimit} pct={msgPct} icon={MessageSquare} unit="" />
          <UsageCard label="Active contacts" used={usage.contacts} limit={usage.contactsLimit} pct={ctPct} icon={Users} unit="" />
        </div>
      </SectionCard>

      <SectionCard title="Payment method" subtitle="How we charge for your subscription" icon={<CreditCard className="w-4 h-4" />}>
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border">
          <div className="w-12 h-8 rounded bg-foreground text-background text-[10px] font-bold flex items-center justify-center">VISA</div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold">•••• •••• •••• 4242</p>
            <p className="text-[11px] text-muted-foreground">Expires 09/27</p>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-[11px]">Update</Button>
        </div>
      </SectionCard>
    </>
  );
};

const UsageCard = ({
  label, used, limit, pct, icon: Icon,
}: { label: string; used: number; limit: number; pct: number; icon: React.ElementType; unit: string }) => {
  const tone = pct > 85 ? "hot" : pct > 65 ? "warning" : "primary";
  return (
    <div className="rounded-xl border border-border p-3.5 bg-card">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="text-xl font-extrabold leading-tight">
        {used.toLocaleString()}
        <span className="text-[12px] text-muted-foreground font-medium"> / {limit.toLocaleString()}</span>
      </p>
      <Progress value={pct} className={cn("h-1.5 mt-2.5", tone === "hot" && "[&>div]:bg-hot", tone === "warning" && "[&>div]:bg-warning")} />
      <p className="text-[10px] text-muted-foreground mt-1.5">{pct.toFixed(0)}% used this cycle</p>
    </div>
  );
};

/* ============================== ACCOUNT ============================== */
const AccountSection = ({ email, onSignOut }: { email?: string; onSignOut: () => Promise<void> }) => {
  const [twoFA, setTwoFA] = useState(false);

  return (
    <>
      <SectionCard title="Security" subtitle="Lock down your account and active sessions" icon={<Shield className="w-4 h-4" />}>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border">
            <div className="w-9 h-9 rounded-lg bg-accent-soft text-accent flex items-center justify-center"><User className="w-4 h-4" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Signed in as</p>
              <p className="text-[13px] font-semibold truncate">{email}</p>
            </div>
            <Badge variant="outline" className="gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Active</Badge>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border hover:bg-muted/30 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-warning-soft text-warning flex items-center justify-center"><KeyRound className="w-4 h-4" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold">Change password</p>
              <p className="text-[11px] text-muted-foreground">We'll send a confirmation email before applying</p>
            </div>
            <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => toast.info("Password reset email sent")}>Update</Button>
          </div>

          <div className={cn(
            "flex items-center gap-3 p-3.5 rounded-xl border transition-colors",
            twoFA ? "border-primary/30 bg-primary-soft/30" : "border-border"
          )}>
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", twoFA ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-semibold">Two-factor authentication</p>
                {twoFA && <Badge className="text-[9px] bg-success text-success-foreground border-0">Enabled</Badge>}
              </div>
              <p className="text-[11px] text-muted-foreground">Require a 6-digit code from your authenticator app</p>
            </div>
            <Switch checked={twoFA} onCheckedChange={(v) => { setTwoFA(v); toast.success(v ? "2FA enabled" : "2FA disabled"); }} />
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border hover:bg-muted/30 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center"><LogIn className="w-4 h-4" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold">Logout all devices</p>
              <p className="text-[11px] text-muted-foreground">End every active session except this one</p>
            </div>
            <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => toast.success("All other sessions terminated")}>End all</Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Danger zone" subtitle="Irreversible actions — proceed carefully" icon={<AlertCircle className="w-4 h-4" />}>
        <Button
          variant="destructive"
          className="w-full justify-start gap-2"
          onClick={async () => { await onSignOut(); toast.success("Signed out"); }}
        >
          <LogOut className="w-4 h-4" /> Sign out of this session
        </Button>
      </SectionCard>
    </>
  );
};

/* ============================== SHARED ============================== */
const SectionCard = ({
  title, subtitle, icon, children, headerRight,
}: { title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode; headerRight?: React.ReactNode }) => (
  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
    <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 text-primary flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h3 className="text-[15px] font-bold leading-tight">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {headerRight}
    </div>
    {children}
  </div>
);

const FieldRow = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <Label className="text-[11px] font-semibold text-foreground">{label}</Label>
      {hint && <span className="text-[10px] text-success font-semibold flex items-center gap-1"><Check className="w-3 h-3" />{hint}</span>}
    </div>
    {children}
  </div>
);

const ControlLabel = ({ icon, label, hint }: { icon: React.ReactNode; label: string; hint?: string }) => (
  <div className="flex items-baseline gap-2">
    <div className="flex items-center gap-1.5">
      <span className="text-primary">{icon}</span>
      <span className="text-[12px] font-bold">{label}</span>
    </div>
    {hint && <span className="text-[10px] text-muted-foreground">— {hint}</span>}
  </div>
);

const ToggleRow = ({
  label, desc, value, onChange, danger,
}: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void; danger?: boolean }) => (
  <div className={cn(
    "flex items-center gap-3 p-3 border rounded-xl transition-all",
    danger ? "border-warning/30 bg-warning-soft/20" : "border-border hover:bg-muted/40"
  )}>
    <div className="flex-1 min-w-0">
      <p className="text-[13px] font-semibold">{label}</p>
      <p className="text-[11px] text-muted-foreground">{desc}</p>
    </div>
    <Switch checked={value} onCheckedChange={onChange} />
  </div>
);
