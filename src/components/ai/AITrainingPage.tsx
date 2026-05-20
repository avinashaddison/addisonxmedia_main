import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Brain, Sparkles, ShieldAlert, MessageSquareText, Languages, Loader2, CheckCircle2, ArrowUpRight, Zap, Save } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { api, type AiPersona } from "@/lib/api";
import { toast } from "sonner";

const TONE_OPTIONS: { value: AiPersona["tone"]; label: string; description: string; emoji: string }[] = [
  { value: "friendly",     label: "Friendly",      description: "Warm, helpful, light emojis. Default for most SMBs.", emoji: "🙂" },
  { value: "professional", label: "Professional",  description: "Polished and formal. Good for B2B, legal, healthcare.", emoji: "💼" },
  { value: "casual",       label: "Casual",        description: "Chill, conversational, no jargon. D2C, lifestyle, food.", emoji: "👋" },
  { value: "urgent_sales", label: "Urgent sales",  description: "Pushes toward a close. Use only for offers/discounts.", emoji: "🔥" },
];

const LANG_OPTIONS: { value: AiPersona["response_language"]; label: string; sub: string }[] = [
  { value: "hinglish", label: "Hinglish",            sub: "Roman script, code-switches like a real Indian convo (recommended)" },
  { value: "hindi",    label: "Hindi (Devanagari)",  sub: "Pure हिंदी. Use only if your customers prefer it" },
  { value: "english",  label: "English",             sub: "Pure English. Best for SaaS / B2B" },
];

export const AITrainingPage = () => {
  const qc = useQueryClient();
  const { data: persona, isLoading } = useQuery({
    queryKey: ["ai-persona"],
    queryFn: () => api.getAiPersona(),
  });
  const { data: usage } = useQuery({
    queryKey: ["ai-usage"],
    queryFn: () => api.getAiUsage(),
    refetchInterval: 30_000,
  });

  // Local form state — initialized from server, then user edits freely.
  const [form, setForm] = useState<AiPersona | null>(null);
  useEffect(() => {
    if (persona && !form) setForm(persona);
  }, [persona, form]);

  const save = useMutation({
    mutationFn: (data: AiPersona) => api.updateAiPersona(data),
    onSuccess: (updated) => {
      qc.setQueryData(["ai-persona"], updated);
      setForm(updated);
      toast.success("Addison AI updated — naya tone aaj se live");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save"),
  });

  const ping = useMutation({
    mutationFn: () => api.pingAi(),
    onSuccess: (r) => toast.success(`Addison says: "${r.reply}"`, { duration: 6000 }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Ping failed"),
  });

  if (isLoading || !form) {
    return (
      <PageShell title="AI Training" subtitle="Addison AI ko apne business ke baare mein sikhayein" icon={<Brain className="w-5 h-5" />}>
        <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      </PageShell>
    );
  }

  const set = <K extends keyof AiPersona>(k: K, v: AiPersona[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const dirty = persona && JSON.stringify(persona) !== JSON.stringify(form);

  return (
    <PageShell
      title="AI Training"
      subtitle="Addison AI ko apne business ke baare mein sikhayein — jitna better training, utne better replies"
      icon={<Brain className="w-5 h-5" />}
      actions={
        <>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => ping.mutate()}
            disabled={ping.isPending || !usage?.ai_configured}
          >
            {ping.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-[#FF6A1F]" />}
            Test AI
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-[#0E8A4B] hover:bg-[#0A6E3B] text-white shadow-[0_2px_0_0_#073D22]"
            onClick={() => form && save.mutate(form)}
            disabled={!dirty || save.isPending}
          >
            {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save training
          </Button>
        </>
      }
    >
      {/* Usage meter — live monthly cap from /api/ai/usage */}
      {usage && <UsageMeter usage={usage} />}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-5">
        {/* Form — 2 cols */}
        <div className="xl:col-span-2 space-y-4">
          {/* Business basics */}
          <Section icon={<Sparkles className="w-4 h-4" />} title="Business basics" desc="Yeh sab har AI reply mein context ke roop mein use hota hai">
            <Field label="Business name" hint="Jaise customer ke saamne dikhega">
              <Input
                value={form.business_name}
                onChange={(e) => set("business_name", e.target.value)}
                placeholder="e.g. Sharma Sweets, Ranchi Real Estate"
              />
            </Field>
            <Field label="What you sell" hint="2-3 lines. Products, services, jo bhi aap offer karte hain. AI yahi pe ground karega.">
              <Textarea
                rows={4}
                value={form.what_we_sell}
                onChange={(e) => set("what_we_sell", e.target.value)}
                placeholder="e.g. Hum Ranchi mein 1BHK / 2BHK / 3BHK apartments bechte hain — Lalpur, Doranda, Kanke road. Site visits free hain. Home loans available through HDFC / SBI partners."
              />
            </Field>
          </Section>

          {/* Tone */}
          <Section icon={<MessageSquareText className="w-4 h-4" />} title="Tone" desc="AI kis tarike se reply karega">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {TONE_OPTIONS.map((opt) => {
                const active = form.tone === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("tone", opt.value)}
                    className={cn(
                      "relative rounded-xl border-2 p-3 text-left transition-all hover:-translate-y-0.5",
                      active
                        ? "border-[#0E8A4B] bg-[#E6F7EE] shadow-[0_3px_0_0_#0E8A4B]"
                        : "border-[#E8B968] bg-white hover:border-[#FF6A1F]/40"
                    )}
                  >
                    {active && <CheckCircle2 className="absolute top-2 right-2 w-3.5 h-3.5 text-[#0E8A4B]" />}
                    <div className="text-xl mb-1">{opt.emoji}</div>
                    <p className="text-[12px] font-extrabold leading-tight">{opt.label}</p>
                    <p className="text-[10px] text-foreground/60 mt-0.5 leading-snug">{opt.description}</p>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Language */}
          <Section icon={<Languages className="w-4 h-4" />} title="Response language" desc="Default Hinglish — Indian WhatsApp chats ke liye sabse natural">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {LANG_OPTIONS.map((opt) => {
                const active = form.response_language === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("response_language", opt.value)}
                    className={cn(
                      "rounded-xl border-2 p-3 text-left transition-all",
                      active
                        ? "border-[#0E8A4B] bg-[#E6F7EE] shadow-[0_3px_0_0_#0E8A4B]"
                        : "border-[#E8B968] bg-white hover:border-[#FF6A1F]/40"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[13px] font-extrabold">{opt.label}</p>
                      {active && <CheckCircle2 className="w-4 h-4 text-[#0E8A4B]" />}
                    </div>
                    <p className="text-[10.5px] text-foreground/60 leading-snug">{opt.sub}</p>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Guardrails */}
          <Section icon={<ShieldAlert className="w-4 h-4" />} title="Guardrails" desc="AI ko bound rakhne ke liye — sales mein important hai">
            <Field label="Always say" hint="Cheezein jo AI ko har baar mention karni chahiye">
              <Textarea
                rows={3}
                value={form.always_say}
                onChange={(e) => set("always_say", e.target.value)}
                placeholder="e.g. Site visit free hai. Home loan partners available. EMI options 12-60 months."
              />
            </Field>
            <Field label="Never say" hint="Cheezein jo AI ko bilkul nahi karni chahiye — promises, claims, discounts">
              <Textarea
                rows={3}
                value={form.never_say}
                onChange={(e) => set("never_say", e.target.value)}
                placeholder="e.g. Don't quote exact prices without site visit. Don't promise possession dates. Don't guarantee loan approval."
              />
            </Field>
            <Field label="Escalate to human when customer mentions" hint="Comma-separated keywords. AI in cases mein draft nahi karega, bolega 'human ko bhejo'">
              <Input
                value={form.escalate_keywords}
                onChange={(e) => set("escalate_keywords", e.target.value)}
                placeholder="refund, complaint, legal, lawyer, scam, police"
              />
            </Field>
          </Section>

          {/* Sticky save bar (mobile) */}
          <div className="xl:hidden sticky bottom-3 z-10">
            <Button
              size="lg"
              className="w-full gap-2 bg-[#0E8A4B] hover:bg-[#0A6E3B] text-white shadow-lg"
              onClick={() => form && save.mutate(form)}
              disabled={!dirty || save.isPending}
            >
              {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save training
            </Button>
          </div>
        </div>

        {/* Live preview — 1 col */}
        <div className="xl:col-span-1">
          <LivePreview persona={form} />
        </div>
      </div>
    </PageShell>
  );
};

// ─── Bits ────────────────────────────────────────────────────────────────────

const Section = ({
  icon, title, desc, children,
}: { icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }) => (
  <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-5">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-8 h-8 rounded-lg bg-[#FFD23F] text-[#7A4A00] flex items-center justify-center shadow-sm">
        {icon}
      </div>
      <div>
        <h3 className="text-[14px] font-extrabold leading-tight">{title}</h3>
        <p className="text-[10.5px] text-foreground/60">{desc}</p>
      </div>
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-[11px] uppercase tracking-wider font-extrabold text-foreground/70">{label}</Label>
    {children}
    {hint && <p className="text-[10.5px] text-foreground/55 leading-snug">{hint}</p>}
  </div>
);

const UsageMeter = ({ usage }: { usage: NonNullable<ReturnType<typeof api.getAiUsage> extends Promise<infer T> ? T : never> }) => {
  if (!usage.ai_configured) {
    return (
      <div className="bg-[#FFEFE0] border-2 border-[#FF6A1F] rounded-2xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#FF6A1F] text-white flex items-center justify-center flex-shrink-0">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-extrabold">AI not configured yet</p>
          <p className="text-[11.5px] text-foreground/70 mt-0.5">
            Server admin ko <code className="px-1 py-0.5 bg-white rounded text-[10.5px]">OPENAI_API_KEY</code> set karna hoga. Training data save hoga, but AI features 503 throw karenge tab tak.
          </p>
        </div>
      </div>
    );
  }

  const pct = usage.cap === -1 ? 0 : Math.min(100, Math.round((usage.used / usage.cap) * 100));
  const tone = pct >= 90 ? "danger" : pct >= 70 ? "warn" : "ok";
  const barColor = tone === "danger" ? "bg-[#D4308E]" : tone === "warn" ? "bg-[#FF6A1F]" : "bg-[#0E8A4B]";

  return (
    <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-4">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0E8A4B] text-white flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-wider text-foreground/70">This month's AI usage</p>
            <p className="text-[15px] font-black leading-tight tabular-nums">
              {usage.used.toLocaleString("en-IN")}
              <span className="text-foreground/40 font-extrabold"> / </span>
              {usage.cap === -1 ? "∞" : usage.cap.toLocaleString("en-IN")}
              <span className="text-[11px] text-foreground/60 font-bold ml-2">on {usage.plan} plan</span>
            </p>
          </div>
        </div>
        {usage.cap !== -1 && pct >= 70 && (
          <a
            href="/app/settings"
            className="text-[11px] font-extrabold text-[#FF6A1F] hover:text-[#E85C12] flex items-center gap-1"
          >
            Upgrade plan <ArrowUpRight className="w-3 h-3" />
          </a>
        )}
      </div>
      {usage.cap !== -1 && (
        <div className="h-2 rounded-full bg-[#FFEFE0] overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-500", barColor)} style={{ width: `${pct}%` }} />
        </div>
      )}
      {usage.breakdown.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {usage.breakdown.map((b) => (
            <span key={b.feature} className="text-[10.5px] bg-[#FFF6E8] border border-[#E8B968] rounded-full px-2 py-0.5 font-bold">
              {b.feature.replace(/_/g, " ")}: {b.weight}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const LivePreview = ({ persona }: { persona: AiPersona }) => {
  const greetings: Record<AiPersona["response_language"], string> = {
    hinglish: "Hi! Aap ka query receive ho gaya 🙏 — bata dijiye kya help chahiye?",
    hindi: "नमस्ते! आपकी जानकारी प्राप्त हो गई 🙏 — बताइए हम कैसे मदद कर सकते हैं?",
    english: "Hi there! Got your message 🙏 — happy to help. What do you need?",
  };
  const toneTags: Record<AiPersona["tone"], string> = {
    friendly: "🙂 Friendly",
    professional: "💼 Professional",
    casual: "👋 Casual",
    urgent_sales: "🔥 Sales push",
  };

  return (
    <div className="sticky top-4 bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/60">How Addison sounds</p>
        <span className="text-[10px] bg-[#FFD23F] text-[#7A4A00] font-extrabold rounded px-1.5 py-0.5">PREVIEW</span>
      </div>

      {/* WhatsApp-style sample */}
      <div className="bg-[#FFF6E8] rounded-xl p-3 border border-[#E8B968]/60 mb-3">
        <div className="self-start max-w-[88%] bg-white rounded-2xl rounded-bl-md px-3 py-2 shadow-sm border border-[#E8B968]/40 mb-2">
          <p className="text-[11.5px] text-foreground/70 italic">Customer: "Hello, price kya hai?"</p>
        </div>
        <div className="ml-4 max-w-[88%] bg-[#E6F7EE] rounded-2xl rounded-br-md px-3 py-2 shadow-sm border border-[#0E8A4B]/20">
          <p className="text-[12px] leading-relaxed">
            {persona.business_name
              ? `Hi! 👋 ${persona.business_name} se contact karne ke liye thanks. `
              : "Hi! 👋 Thanks for reaching out. "}
            {greetings[persona.response_language].replace(greetings[persona.response_language].split("!")[0] + "! ", "")}
          </p>
          <p className="text-[8px] text-foreground/40 mt-1 text-right">12:34 PM · AI draft</p>
        </div>
      </div>

      <div className="space-y-1.5 text-[11px]">
        <Row label="Tone" value={toneTags[persona.tone]} />
        <Row label="Language" value={persona.response_language} />
        <Row label="Knows about" value={persona.what_we_sell ? `${persona.what_we_sell.length} chars` : "nothing yet — add details"} />
        <Row label="Guardrails" value={`${persona.always_say.length + persona.never_say.length} chars`} />
        <Row label="Escalate on" value={persona.escalate_keywords.split(",").length + " keywords"} />
      </div>

      <p className="text-[10px] text-foreground/55 mt-3 leading-snug">
        Yeh sirf preview hai. Real replies tab generate honge jab aap inbox mein customer ke message pe AI suggestions use karoge.
      </p>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-foreground/55 uppercase tracking-wider font-bold text-[9.5px]">{label}</span>
    <span className="font-extrabold text-foreground/85 truncate">{value}</span>
  </div>
);
