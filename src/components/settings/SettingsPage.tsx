import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Section = "profile" | "integrations" | "account";

const sections: { id: Section; label: string }[] = [
  { id: "profile",      label: "Profile" },
  { id: "integrations", label: "Integrations" },
  { id: "account",      label: "Account" },
];

export const SettingsPage = () => {
  const [active, setActive] = useState<Section>("profile");
  const [, setDirty] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <PageShell title="Settings" subtitle="Workspace configuration · sab kuch yahan se control karein" icon={<Settings className="w-5 h-5" />}>
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8 max-w-5xl">
        {/* Side nav — plain text, no icons, no descriptions */}
        <nav className="lg:sticky lg:top-20 h-fit">
          <ul className="space-y-px">
            {sections.map((s) => {
              const isActive = active === s.id;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setActive(s.id)}
                    className={cn(
                      "w-full text-left px-3 py-1.5 rounded-md text-[13px] transition-colors",
                      isActive
                        ? "bg-muted text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {s.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Section panel */}
        <div className="min-w-0">
          {active === "profile"       && (
            <div className="space-y-4">
              <ProfileSection user={user} onDirty={setDirty} />
              <SocialLinksSection user={user} />
            </div>
          )}
          {active === "integrations"  && <IntegrationsSection />}
          {active === "account"       && <AccountSection email={user?.email} onSignOut={signOut} />}
        </div>
      </div>
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
    queryFn: () => api.getProfile(),
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
    try {
      await api.updateProfile({ display_name: displayName, phone: phone || null });
      initial.current = { displayName, phone, workspace };
      onDirty(false);
      toast.success("Profile updated", { icon: <Check className="w-4 h-4 text-success" /> });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setAvatarPreview(ev.target?.result as string); toast.success("Avatar staged — click Save to apply"); };
    reader.readAsDataURL(file);
  };

  const initials = (displayName || user?.email || "U").slice(0, 2).toUpperCase();

  return (
    <SectionCard title="Profile" subtitle="How you appear in this workspace.">
      <div className="space-y-6">
        {/* Avatar row */}
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground text-lg font-semibold flex items-center justify-center overflow-hidden">
              {avatarPreview ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" /> : initials}
            </div>
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onPick} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium">{displayName || user?.email?.split("@")[0] || "—"}</p>
            <p className="text-[12px] text-muted-foreground">{role}</p>
          </div>
          <button
            onClick={() => fileInput.current?.click()}
            className="text-[12px] font-medium text-foreground hover:text-primary border border-border hover:border-primary rounded-md px-3 py-1.5 transition-colors"
          >
            Change photo
          </button>
        </div>

        {/* Form fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          <FieldRow label="Display name">
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
          </FieldRow>
          <FieldRow label="Workspace">
            <Input value={workspace} onChange={(e) => setWorkspace(e.target.value)} />
          </FieldRow>
          <FieldRow label="Email" hint="Verified">
            <Input value={user?.email ?? ""} disabled />
          </FieldRow>
          <FieldRow label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
          </FieldRow>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
};

/* ============================== SOCIAL LINKS ============================== */
// Public workspace links shared with customers from the LeadPanel "Quick share"
// buttons (WhatsApp Community, Instagram, Website, Facebook). Saved on the
// `profile` row so they live with the rest of workspace identity (display name,
// UPI VPA, etc).
const SocialLinksSection = ({ user }: { user: ReturnType<typeof useAuth>["user"] }) => {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: () => api.getProfile(),
  });

  const [community, setCommunity] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");
  const [facebook, setFacebook] = useState("");
  const [saving, setSaving] = useState(false);
  const initial = useRef({ community: "", instagram: "", website: "", facebook: "" });

  useEffect(() => {
    if (profile) {
      const c = profile.whatsapp_community_url ?? "";
      const i = profile.instagram_url ?? "";
      const w = profile.website_url ?? "";
      const f = profile.facebook_url ?? "";
      setCommunity(c); setInstagram(i); setWebsite(w); setFacebook(f);
      initial.current = { community: c, instagram: i, website: w, facebook: f };
    }
  }, [profile]);

  const dirty =
    community !== initial.current.community ||
    instagram !== initial.current.instagram ||
    website !== initial.current.website ||
    facebook !== initial.current.facebook;

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateProfile({
        whatsapp_community_url: community.trim() || null,
        instagram_url: instagram.trim() || null,
        website_url: website.trim() || null,
        facebook_url: facebook.trim() || null,
      });
      initial.current = { community, instagram, website, facebook };
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success("Social links saved — abhi se inbox mein quick-share buttons active hain");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Public links & socials"
      subtitle="Yeh links inbox ki LeadPanel mein 'Quick share' buttons se ek-click WhatsApp pe bhej sakte hain"
    >
      {isLoading ? (
        <div className="h-32 rounded-xl bg-muted/30 animate-pulse" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            <FieldRow label="WhatsApp Community link" hint="chat.whatsapp.com/... — invite link from your community settings">
              <Input value={community} onChange={(e) => setCommunity(e.target.value)} placeholder="https://chat.whatsapp.com/..." />
            </FieldRow>
            <FieldRow label="Instagram profile" hint="Full URL to your Instagram page">
              <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/yourbrand" />
            </FieldRow>
            <FieldRow label="Website" hint="Optional — main website / product page">
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourbrand.com" />
            </FieldRow>
            <FieldRow label="Facebook page" hint="Optional — public Facebook page URL">
              <Input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/yourbrand" />
            </FieldRow>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border mt-4">
            <Button onClick={handleSave} disabled={!dirty || saving} size="sm">
              {saving ? "Saving…" : "Save links"}
            </Button>
          </div>
        </>
      )}
    </SectionCard>
  );
};

/* ============================== INTEGRATIONS ============================== */
type Integration = {
  name: string; provider: string; description: string; icon: React.ElementType;
  category: "Messaging" | "Payments" | "Email"; connected: boolean; tone: "primary" | "accent" | "warning" | "hot";
};

const IntegrationsSection = () => {
  const qc = useQueryClient();
  const { data: cfg, isLoading } = useQuery({
    queryKey: ["meta-config"],
    queryFn: () => api.getMetaConfig(),
  });

  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const isConnected = !!cfg && cfg.enabled;
  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/meta` : "";

  // Pre-fill non-secret fields when config exists
  useEffect(() => {
    if (cfg) {
      setPhoneNumberId(cfg.phone_number_id ?? "");
      setBusinessAccountId(cfg.business_account_id ?? "");
    }
  }, [cfg]);

  const handleSave = async () => {
    if (!accessToken.trim() || !phoneNumberId.trim()) {
      toast.error("Access token and phone number ID are required");
      return;
    }
    setSaving(true);
    try {
      const res = await api.saveMetaConfig({
        access_token: accessToken.trim(),
        phone_number_id: phoneNumberId.trim(),
        business_account_id: businessAccountId.trim() || undefined,
      });
      toast.success(`Connected to ${res.display_phone_number ?? "WhatsApp"}`);
      setAccessToken("");
      qc.invalidateQueries({ queryKey: ["meta-config"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await api.testMetaConfig();
      if (res.ok) {
        toast.success(`✓ Connected · ${res.display_phone_number ?? "WhatsApp"}${res.quality_rating ? ` · quality: ${res.quality_rating}` : ""}`);
        qc.invalidateQueries({ queryKey: ["meta-config"] });
      } else {
        toast.error(res.error ?? "Connection test failed");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.deleteMetaConfig();
      toast.success("Disconnected");
      qc.invalidateQueries({ queryKey: ["meta-config"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl).then(() => toast.success("Webhook URL copied"));
  };

  return (
    <SectionCard
      title="Integrations"
      subtitle="Connect WhatsApp Business and other services"
      icon={<PlugZap className="w-4 h-4" />}
      headerRight={
        isConnected ? (
          <Badge variant="outline" className="gap-1.5 border-success/40 text-success">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            WhatsApp connected
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
            Not configured
          </Badge>
        )
      }
    >
      <div className="space-y-6">
        {/* WhatsApp Cloud API — primary integration */}
        <div className={cn(
          "rounded-xl border p-5",
          isConnected ? "border-success/30 bg-success-soft/30" : "border-border bg-card"
        )}>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-bold">WhatsApp Cloud API</h3>
                <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Meta</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Send and receive WhatsApp messages directly via Meta's official Business API.
              </p>
              {isConnected && cfg?.display_phone_number && (
                <p className="text-[12px] mt-2 font-semibold text-success">
                  ✓ Active on {cfg.display_phone_number}
                  {cfg.last_verified_at && (
                    <span className="text-muted-foreground font-normal"> · last verified {new Date(cfg.last_verified_at).toLocaleString()}</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Webhook URL (always visible — user needs to copy this into Meta App) */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Webhook URL (paste this in Meta App)</p>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={copyWebhookUrl}>Copy</Button>
            </div>
            <code className="text-[11px] font-mono break-all">{webhookUrl}</code>
            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
              In Meta App → WhatsApp → Configuration → Webhooks: paste the URL above, set the verify token to match
              <code className="text-[10px] mx-1 px-1 py-0.5 bg-card rounded border border-border">META_WEBHOOK_VERIFY_TOKEN</code>
              from your <code className="text-[10px] mx-1 px-1 py-0.5 bg-card rounded border border-border">.env.local</code>, and subscribe to the <strong>messages</strong> field.
            </p>
          </div>

          {/* Credential form */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="meta-token" className="text-[12px] font-semibold">
                Access Token {isConnected && <span className="text-muted-foreground font-normal">(leave blank to keep current)</span>}
              </Label>
              <div className="relative mt-1">
                <Input
                  id="meta-token"
                  type={showToken ? "text" : "password"}
                  autoComplete="off"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder={isConnected ? "••••••••••••••••" : "EAAGm... (system user token)"}
                  className="h-10 pr-16 font-mono text-[12px]"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted-foreground hover:text-foreground px-2 py-1"
                >
                  {showToken ? "Hide" : "Show"}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Generate a System User token in Meta Business Manager → Users → System Users → Generate New Token. Grant <code>whatsapp_business_messaging</code> + <code>whatsapp_business_management</code> permissions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="meta-phone" className="text-[12px] font-semibold">Phone Number ID *</Label>
                <Input
                  id="meta-phone"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="123456789012345"
                  className="h-10 mt-1 font-mono text-[12px]"
                />
              </div>
              <div>
                <Label htmlFor="meta-waba" className="text-[12px] font-semibold">Business Account ID</Label>
                <Input
                  id="meta-waba"
                  value={businessAccountId}
                  onChange={(e) => setBusinessAccountId(e.target.value)}
                  placeholder="WABA ID (for templates)"
                  className="h-10 mt-1 font-mono text-[12px]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving || (!accessToken.trim() && !isConnected)} className="gap-1.5">
                {saving ? "Verifying with Meta…" : isConnected ? "Update credentials" : "Save & verify"}
                {!saving && <ShieldCheck className="w-3.5 h-3.5" />}
              </Button>
              {isConnected && (
                <>
                  <Button variant="outline" onClick={handleTest} disabled={testing} className="gap-1.5">
                    {testing ? "Testing…" : <>Test connection <Zap className="w-3.5 h-3.5" /></>}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        className="text-[#D4308E] hover:text-[#D4308E] hover:bg-[#FCE5F0] ml-auto"
                      >
                        Disconnect
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>WhatsApp disconnect karein?</AlertDialogTitle>
                        <AlertDialogDescription className="text-foreground/70 font-medium">
                          Outbound messages dry-run mode mein chale jaayenge · customers tak message nahi pahunchega jab tak wapas connect nahi karte.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDisconnect}
                          className="bg-[#D4308E] text-white shadow-[0_4px_0_0_#A11A6A] hover:bg-[#C02680] hover:shadow-[0_2px_0_0_#A11A6A] hover:translate-y-[2px]"
                        >
                          Disconnect karein
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>

          {isLoading && <p className="text-[11px] text-muted-foreground mt-3">Loading config…</p>}
        </div>

        {/* Other integrations — honest "coming soon" cards */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">Coming soon</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {[
              { name: "Razorpay", provider: "Payments", icon: CreditCard, desc: "Send pay-in-chat links + auto-reconcile" },
              { name: "Resend", provider: "Email", icon: Mail, desc: "Transactional emails for follow-ups + reset" },
              { name: "Shiprocket", provider: "Logistics", icon: Plug, desc: "AWB tracking pushed to chat on order ship" },
            ].map((i) => (
              <div key={i.name} className="rounded-xl border border-border bg-card p-3.5 opacity-60">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    <i.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[13px] font-bold leading-tight">{i.name}</p>
                      <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">{i.provider}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">{i.desc}</p>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Soon</span>
                </div>
              </div>
            ))}
          </div>
        </div>
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
                { id: "manual",   title: "Manual",    desc: "You write every reply",      icon: User,     danger: false },
                { id: "assisted", title: "Assisted",  desc: "AI suggests, you approve",   icon: Sparkles, danger: false },
                { id: "auto",     title: "Automatic", desc: "AI replies instantly, 24/7", icon: Rocket,   danger: true  },
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
    { id: "1", name: "You",         email: "you@addisonxmedia.com",   role: "Admin",       status: "active",  assigned: 12 },
    { id: "2", name: "Karan Mehta", email: "karan@addisonxmedia.com", role: "Sales Agent", status: "active",  assigned: 8  },
    { id: "3", name: "Priya Singh", email: "priya@addisonxmedia.com", role: "Sales Agent", status: "invited", assigned: 0  },
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
const PLAN_LABELS: Record<string, { label: string; price: string; nextTier?: string }> = {
  free:       { label: "Free",       price: "₹0 / mo",       nextTier: "Starter" },
  starter:    { label: "Starter",    price: "₹999 / mo",     nextTier: "Growth" },
  growth:     { label: "Growth",     price: "₹2,999 / mo",   nextTier: "Scale" },
  scale:      { label: "Scale",      price: "₹7,999 / mo" },
  enterprise: { label: "Enterprise", price: "Custom" },
};

const BillingSection = () => {
  const navigate = useNavigate();
  const { data: me } = useQuery({
    queryKey: ["billing-me"],
    queryFn: () => api.getBillingMe(),
    staleTime: 30_000,
  });
  const { data: aiUsage } = useQuery({
    queryKey: ["ai-usage"],
    queryFn: () => api.getAiUsage(),
    staleTime: 30_000,
  });

  const currentPlan = (me?.plan ?? "free").toLowerCase();
  const plan = PLAN_LABELS[currentPlan] ?? PLAN_LABELS.free;
  const pending = me?.pending_upgrade;

  const aiUsed = aiUsage?.used ?? 0;
  const aiCap = aiUsage?.cap ?? 0;
  const aiPct = aiCap === -1 ? 0 : aiCap > 0 ? Math.min(100, (aiUsed / aiCap) * 100) : 0;

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
          <div className="relative flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-4 h-4" />
                <p className="text-[11px] font-bold uppercase tracking-widest opacity-90">Current Plan</p>
              </div>
              <p className="text-2xl font-extrabold">{plan.label}</p>
              <p className="text-[12px] opacity-90 mt-0.5">{plan.price}</p>
              {pending && (
                <p className="text-[11px] mt-1.5 bg-white/15 rounded px-2 py-0.5 inline-block font-bold">
                  Upgrade to {pending.target_plan} pending · status: {pending.status}
                </p>
              )}
            </div>
            {plan.nextTier ? (
              <Button onClick={() => navigate("/app/upgrade")} className="bg-white text-primary hover:bg-white/90 gap-1.5 shadow-lg">
                <TrendingUp className="w-4 h-4" /> Upgrade to {plan.nextTier}
              </Button>
            ) : (
              <Button onClick={() => navigate("/app/upgrade")} variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-1.5">
                See plans
              </Button>
            )}
          </div>
        </div>

        {/* AI usage (real) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <UsageCard
            label="AI actions this month"
            used={aiUsed}
            limit={aiCap === -1 ? aiUsed : aiCap}
            pct={aiPct}
            icon={Sparkles}
            unit=""
          />
          <div className="rounded-xl border border-border bg-card p-3 flex flex-col justify-center">
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Need more AI?</p>
            <p className="text-[12px] text-foreground/80 leading-snug mb-2">AI Power Pack adds 10,000 actions for ₹999/mo</p>
            <Button onClick={() => navigate("/app/upgrade")} size="sm" variant="outline" className="self-start gap-1.5">
              <Zap className="w-3.5 h-3.5" /> See options
            </Button>
          </div>
        </div>
      </SectionCard>

      <MetaSpendCard />

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

// Meta will bill the customer's connected WhatsApp account separately (we
// don't take a cut). This card surfaces "what Meta will charge you this month"
// so customers don't get sticker shock when Meta's auto-charge fires.
const MetaSpendCard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["meta-cost-estimate"],
    queryFn: () => api.getMetaCostEstimate(),
    staleTime: 60_000,
  });

  return (
    <SectionCard
      title="Meta WhatsApp spend (separate from your AddisonX bill)"
      subtitle="Meta charges your connected WhatsApp account directly — we don't add any markup"
      icon={<MessageSquare className="w-4 h-4" />}
    >
      {isLoading || !data ? (
        <div className="h-24 rounded-xl bg-muted/30 animate-pulse" />
      ) : (
        <>
          <div className="rounded-xl border-2 border-dashed border-[#E8B968] bg-[#FFF6E8] p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[10.5px] uppercase tracking-wider font-extrabold text-foreground/55">Outbound messages this month</p>
                <p className="text-3xl font-black tabular-nums leading-tight">
                  {data.outbound_count.toLocaleString("en-IN")}
                </p>
              </div>
              <Badge variant="outline" className="gap-1.5 border-[#0E8A4B]/40 text-[#0E8A4B] bg-white">
                Direct from Meta · No markup
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <EstimateTile label="If all marketing" subLabel={`@ ₹${data.rates.marketing}/msg`} value={data.estimate_marketing_inr} tone="warn" />
              <EstimateTile label="If all utility" subLabel={`@ ₹${data.rates.utility}/msg`} value={data.estimate_utility_inr} tone="ok" />
              <EstimateTile label="If all auth (OTP)" subLabel={`@ ₹${data.rates.authentication}/msg`} value={data.estimate_auth_inr} tone="neutral" />
            </div>
            <p className="text-[10.5px] text-foreground/55 mt-2.5 leading-snug">
              {data.note} Aapka actual bill aap ke Meta Business Manager account mein dikhega — hum is amount ko nahi lete.
            </p>
          </div>
        </>
      )}
    </SectionCard>
  );
};

const EstimateTile = ({ label, subLabel, value, tone }: { label: string; subLabel: string; value: number; tone: "ok" | "warn" | "neutral" }) => {
  const bg = tone === "ok" ? "bg-[#E6F7EE] border-[#0E8A4B]/30" : tone === "warn" ? "bg-[#FFEFE0] border-[#FF6A1F]/30" : "bg-white border-[#E8B968]";
  const text = tone === "ok" ? "text-[#0E8A4B]" : tone === "warn" ? "text-[#7A1500]" : "text-foreground/85";
  return (
    <div className={cn("rounded-lg border-2 p-2.5", bg)}>
      <p className="text-[9.5px] uppercase tracking-wider font-extrabold text-foreground/60">{label}</p>
      <p className={cn("text-[16px] font-black tabular-nums leading-tight", text)}>
        ~₹{value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
      </p>
      <p className="text-[9.5px] text-foreground/55">{subLabel}</p>
    </div>
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
  title, subtitle, children, headerRight,
}: { title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode; headerRight?: React.ReactNode }) => (
  <div className="space-y-5">
    <div className="flex items-start justify-between gap-3 pb-4 border-b border-border">
      <div>
        <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="text-[12px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {headerRight}
    </div>
    {children}
  </div>
);

const FieldRow = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <Label className="text-[12px] font-medium text-foreground">{label}</Label>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
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
