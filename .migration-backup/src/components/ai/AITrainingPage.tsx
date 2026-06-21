import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Brain, Sparkles, ShieldAlert, MessageSquareText, Languages, Loader2,
  CheckCircle2, ArrowUpRight, Zap, Save, Plus, Trash2, ShieldCheck, Play, UserCircle,
  Pencil, Check, X, Upload, ImageIcon
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { api, type AiAgent, type AiAgentProduct } from "@/lib/api";
import { toast } from "sonner";
import { useCloudinaryConfig, useCloudinaryUpload } from "@/hooks/useCloudinaryUpload";

const TONE_OPTIONS: { value: string; label: string; description: string; emoji: string }[] = [
  { value: "friendly",     label: "Friendly",      description: "Warm, helpful, light emojis. Default for most SMBs.", emoji: "🙂" },
  { value: "professional", label: "Professional",  description: "Polished and formal. No emojis. Use proper salutations.", emoji: "💼" },
  { value: "casual",       label: "Casual",        description: "Chill, conversational, no jargon. D2C, lifestyle, food.", emoji: "👋" },
  { value: "urgent_sales", label: "Urgent sales",  description: "Pushes toward a close. Use only for offers/discounts.", emoji: "🔥" },
];

const LANG_OPTIONS: { value: string; label: string; sub: string }[] = [
  { value: "auto",     label: "Auto (Detect)",         sub: "Match the customer's script/language dynamically (Hinglish/Hindi/English)" },
  { value: "hinglish", label: "Hinglish",            sub: "Roman script, code-switches like a real Indian convo (recommended)" },
  { value: "hindi",    label: "Hindi (Devanagari)",  sub: "Pure हिंदी. Use only if your customers prefer it" },
  { value: "english",  label: "English",             sub: "Pure English. Best for SaaS / B2B" },
];

export const AITrainingPage = () => {
  const qc = useQueryClient();
  
  // 1. Fetch all agents
  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ["ai-agents"],
    queryFn: () => api.listAgents(),
    refetchInterval: 5000,
  });

  const { data: usage } = useQuery({
    queryKey: ["ai-usage"],
    queryFn: () => api.getAiUsage(),
    refetchInterval: 30_000,
  });

  // Selected agent state
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isFloatingChatOpen, setIsFloatingChatOpen] = useState(false);
  
  // Set initial selected agent to the active one
  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      const active = agents.find((a) => a.is_active);
      if (active) {
        setSelectedAgentId(active.id);
      } else {
        setSelectedAgentId(agents[0].id);
      }
    }
  }, [agents, selectedAgentId]);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  // Local form state for selected agent
  const [form, setForm] = useState<AiAgent | null>(null);
  useEffect(() => {
    if (selectedAgent) {
      setForm((prev) => {
        if (!prev || prev.id !== selectedAgent.id) {
          return selectedAgent;
        }
        const isPrebuilt = selectedAgent.type === "prebuilt_sales" || !!selectedAgent.prebuilt_id;
        const isDirty = JSON.stringify(selectedAgent) !== JSON.stringify(prev);
        if (!isDirty || isPrebuilt) {
          return selectedAgent;
        }
        return prev;
      });
    }
  }, [selectedAgent]);

  // New agent creation inline state
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");

  // Mutations
  const save = useMutation({
    mutationFn: (data: AiAgent) => api.updateAgent(data.id, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["ai-agents"] });
      toast.success(`${updated.name} training updated successfully!`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save"),
  });

  const activate = useMutation({
    mutationFn: (id: string) => api.activateAgent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-agents"] });
      toast.success("Agent activated! running live now.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Activation failed"),
  });

  const createAgent = useMutation({
    mutationFn: (name: string) => api.createAgent({ name }),
    onSuccess: (newAgent) => {
      qc.invalidateQueries({ queryKey: ["ai-agents"] });
      setSelectedAgentId(newAgent.id);
      setIsCreatingAgent(false);
      setNewAgentName("");
      toast.success(`Agent "${newAgent.name}" created! Configure details below.`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Creation failed"),
  });

  const deleteAgent = useMutation({
    mutationFn: (id: string) => api.deleteAgent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-agents"] });
      setSelectedAgentId(null);
      toast.success("Agent deleted successfully.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Delete failed"),
  });

  const ping = useMutation({
    mutationFn: () => api.pingAi(),
    onSuccess: (r) => toast.success(`Addison says: "${r.reply}"`, { duration: 6000 }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Ping failed"),
  });

  const handleLoadTemplate = (type: string) => {
    if (!form || isPrebuilt) return;
    if (
      form.what_we_sell ||
      form.knowledge_base ||
      form.system_prompt
    ) {
      if (
        !confirm("Loading a template will overwrite your current description, knowledge base, and system prompt. Do you want to continue?")
      ) {
        return;
      }
    }

    if (type === "sweets") {
      setForm({
        ...form,
        what_we_sell: "Sharma Sweets sells fresh premium Indian sweets (Kaju Katli, Ladoo, Peda), custom festival gift boxes, and authentic snacks made with pure desi ghee.",
        knowledge_base: `### BUSINESS INFO\n- Name: Sharma Sweets\n- Hours: Mon-Sat, 9 AM - 9 PM IST.\n- Contact: support@sharmasweets.com\n\n### SHIPPING & DELIVERY\n- Local Delivery (Within city): Same-day delivery for orders before 3 PM. Flat fee ₹60.\n- Domestic Shipping (India): Takes 2-3 business days. Free shipping on orders above ₹999.\n- Packaging: Sweets are vacuum-packed to ensure 100% freshness during transit.\n\n### REFUNDS & REPLACEMENTS\n- Perishable Items: No returns accepted on food items.\n- Issues: Send a photo of damaged packaging within 4 hours of delivery for a replacement.\n\n### FAQS\n- Q: Do you use pure ghee?\n  A: Yes, all our premium sweets are made using 100% pure Desi Ghee.\n- Q: Can I place bulk orders for corporate gifts?\n  A: Yes, we specialize in corporate bulk gifting. Please ask to talk to a human agent.`,
        system_prompt: "You are a friendly sweet shop assistant. Respond in warm, polite Hinglish (mix of Hindi & English written in Roman script). Use 1-2 friendly emojis (sweets/food emojis). Keep replies short (1-2 lines). Promote product catalog checkout.",
        tone: "friendly",
        response_language: "hinglish"
      });
      toast.success("Loaded Sweet Shop Hinglish template!");
    } else if (type === "agency") {
      setForm({
        ...form,
        what_we_sell: "We provide premium digital marketing, SEO optimization, WhatsApp automation setup, and high-converting site builder development services.",
        knowledge_base: `### BUSINESS INFO\n- Name: AddisonX Media\n- Hours: Mon-Fri, 10 AM - 6 PM IST.\n- Contact: hello@addisonxmedia.com\n\n### SERVICES & DELIVERY\n- WhatsApp Setup: Takes 3-5 business days.\n- Site Builder Setup: Completed within 7 business days.\n\n### REFUND POLICY\n- Service-based: No refunds once project milestone setup has begun.\n\n### FAQS\n- Q: Do you set up Meta Business API?\n  A: Yes, we handle full Meta WhatsApp Business API integration and verification.`,
        system_prompt: "You are a professional, helpful assistant. Respond in clear English. Be polite, direct, and keep replies to 2 sentences max. Do not use informal slang.",
        tone: "professional",
        response_language: "english"
      });
      toast.success("Loaded Agency/Services template!");
    } else if (type === "saas") {
      setForm({
        ...form,
        what_we_sell: "We build e-commerce tools, CRM tracking systems, and automation software for local businesses.",
        knowledge_base: `### SUPPORT INFO\n- Documentation: Available at docs.software.com\n- Hours: 24/7 automated support, human agents online Mon-Fri 9 AM - 6 PM IST.\n\n### REFUND POLICY\n- Subscription: 7-day money-back guarantee. Canceling a subscription halts future billing.\n\n### FAQS\n- Q: Is there a free trial?\n  A: Yes, we offer a 14-day free trial. No credit card required.`,
        system_prompt: "You are a helpful software support assistant. Speak in friendly English. Keep replies short, give direct links to docs when available, and prioritize resolving user questions.",
        tone: "casual",
        response_language: "english"
      });
      toast.success("Loaded SaaS/Software template!");
    }
  };

  if (agentsLoading || !form) {
    return (
      <PageShell title="AI Agent" subtitle="Addison AI ko apne business ke baare mein sikhayein" icon={<Brain className="w-5 h-5" />}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  const set = <K extends keyof AiAgent>(k: K, v: AiAgent[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const isPrebuilt = form.type === "prebuilt_sales" || !!form.prebuilt_id;

  const dirty = selectedAgent && JSON.stringify(selectedAgent) !== JSON.stringify(form);

  return (
    <PageShell
      title="AI Agent"
      subtitle="Jitna better training aur rules, utne accurate customer replies"
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
            Test Active AI
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-[#0E8A4B] hover:bg-[#0A6E3B] text-white shadow-[0_2px_0_0_#073D22]"
            onClick={() => form && save.mutate(form)}
            disabled={!dirty || save.isPending || isPrebuilt}
          >
            {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save training
          </Button>
        </>
      }
    >
      {/* Usage meter */}
      {usage && <UsageMeter usage={usage} />}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-5">
        {/* Left column: Agent switcher */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-[13px] font-black uppercase tracking-wider text-foreground/75">AI Agents</h3>
              <span className="text-[10px] font-bold text-muted-foreground">{agents.length} total</span>
            </div>

            {/* List of agents */}
            <div className="space-y-2">
              {agents.map((agent) => {
                const active = agent.id === selectedAgentId;
                const live = agent.is_active;
                const isPrebuilt = agent.type === "prebuilt_sales" || !!agent.prebuilt_id;
                
                return (
                  <button
                    key={agent.id}
                    onClick={() => {
                      if (!isCreatingAgent) {
                        setSelectedAgentId(agent.id);
                      }
                    }}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border-2 transition-all flex flex-col gap-1 relative overflow-hidden",
                      active
                        ? "border-[#0E8A4B] bg-[#E6F7EE] shadow-[0_3px_0_0_#0E8A4B]"
                        : "border-[#E8B968] bg-white hover:border-[#FF6A1F]/30 hover:bg-muted/10"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-extrabold truncate pr-2">{agent.name}</span>
                      {live && (
                        <span className="bg-[#0E8A4B] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <Play className="w-2 h-2 fill-current" /> Live
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] uppercase tracking-wider text-foreground/50 font-bold">
                        {isPrebuilt ? "🔥 Prebuilt Sales" : "🤖 Custom"}
                      </span>
                      <span className="text-[9px] text-foreground/40 font-semibold">·</span>
                      <span className="text-[9px] text-foreground/50 capitalize font-bold">{agent.tone}</span>
                    </div>

                    {isPrebuilt && (
                      <div className="absolute -bottom-1 -right-3 rotate-12 opacity-10">
                        <Sparkles className="w-12 h-12 text-[#FF6A1F]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* inline create agent switcher */}
            {isCreatingAgent ? (
              <div className="p-3 border-2 border-dashed border-[#FF6A1F] rounded-xl bg-[#FFF6E8]/20 space-y-2">
                <Label className="text-[10px] font-black uppercase text-foreground/70">New Agent Name</Label>
                <Input
                  size={30}
                  className="h-8 text-[12px]"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="e.g. Support Assistant"
                  autoFocus
                />
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    className="h-7 text-[10px] bg-[#0E8A4B] text-white hover:bg-[#0A6E3B]"
                    onClick={() => {
                      if (newAgentName.trim()) {
                        createAgent.mutate(newAgentName);
                      }
                    }}
                    disabled={createAgent.isPending}
                  >
                    {createAgent.isPending ? "Creating..." : "Create"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px]"
                    onClick={() => {
                      setIsCreatingAgent(false);
                      setNewAgentName("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-9 border-dashed border-[#E8B968] hover:border-[#FF6A1F] hover:bg-[#FFF6E8]/10 text-[11px] font-extrabold gap-1.5"
                onClick={() => setIsCreatingAgent(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                New Agent
              </Button>
            )}
          </div>
        </div>

        {/* Center & Right columns: Selected Agent Settings */}
        <div className="lg:col-span-3 grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Agent Form - 2 cols */}
          <div className="xl:col-span-2 space-y-5">
            {/* Activation Alert */}
            {!form.is_active && (
              <div className="bg-[#FFEFE0] border-2 border-[#FF6A1F] rounded-2xl p-4 flex items-center justify-between gap-3 shadow-[0_3px_0_0_#FF6A1F]">
                <div>
                  <h4 className="text-[13px] font-extrabold text-[#7A4A00]">Agent is not active</h4>
                  <p className="text-[11px] text-foreground/75 mt-0.5">Activating this agent will link it to live chat replies, replacing the currently active agent.</p>
                </div>
                <Button
                  size="sm"
                  className="bg-[#FF6A1F] text-white hover:bg-[#E85C12] font-black text-[11px] gap-1.5 flex-shrink-0"
                  onClick={() => activate.mutate(form.id)}
                  disabled={activate.isPending}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Activate Agent
                </Button>
              </div>
            )}

            {/* Template Selector Row */}
            {!isPrebuilt && (
              <div className="bg-[#FFF6E8] border-2 border-[#E8B968] rounded-2xl p-4 shadow-[0_2px_0_0_#E8B968] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-[#FFD23F] text-[#7A4A00] flex items-center justify-center shadow-md">
                    <Sparkles className="w-4 h-4 text-purple-650" />
                  </span>
                  <div className="text-left">
                    <h4 className="text-[12.5px] font-black text-slate-800">Quickstart Training Template</h4>
                    <p className="text-[10px] text-foreground/60 mt-0.5">Pre-populate structured guidelines for your business type</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  {[
                    { id: "sweets", label: "Sweets Shop (Hinglish)", emoji: "🍬" },
                    { id: "agency", label: "Agency/Services", emoji: "💼" },
                    { id: "saas", label: "SaaS/Software", emoji: "💻" }
                  ].map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleLoadTemplate(tpl.id)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white border border-[#E8B968] text-[11px] font-extrabold hover:bg-[#FFE8C7]/50 active:scale-95 transition shadow-sm"
                    >
                      <span>{tpl.emoji}</span> {tpl.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Agent Info & Basics */}
            <Section icon={<Sparkles className="w-4 h-4" />} title="Agent Identity & Basics" desc="Configure name, tone, and what products this agent sells">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Agent Name" hint="Used only internally to distinguish agents">
                  <Input
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    disabled={isPrebuilt}
                    placeholder="e.g. AI Tools Salesman"
                  />
                </Field>
                <Field label="Business name" hint="How it appears to your customers">
                  <Input
                    value={form.business_name}
                    onChange={(e) => set("business_name", e.target.value)}
                    disabled={isPrebuilt}
                    placeholder="e.g. Sharma Sweets"
                  />
                </Field>
              </div>

              <Field label="What you sell" hint="2-3 lines describing your services/products. Ground the AI's knowledge base.">
                <Textarea
                  rows={3}
                  value={form.what_we_sell}
                  onChange={(e) => set("what_we_sell", e.target.value)}
                  disabled={isPrebuilt}
                  placeholder="e.g. Sharma Sweets sells fresh premium Indian sweets, namkeen, and gift packs online."
                />
              </Field>
            </Section>


            {/* Knowledge Base */}
            <Section icon={<Brain className="w-4 h-4 text-purple-600" />} title="Knowledge Base" desc="Add details, FAQs, or policies that the agent can retrieve during conversations">
              <Field label="Agent Documentation & Guides" hint="Specify policies, guidelines, or details about your products/tools. Ground your agent replies.">
                <Textarea
                  rows={4}
                  value={form.knowledge_base || ""}
                  onChange={(e) => set("knowledge_base", e.target.value)}
                  disabled={isPrebuilt}
                  placeholder="e.g. Payments are secure. Support is available via email support@company.com. Standard set up takes less than 24 hours. Refunds can be claimed within 7 days."
                />
              </Field>
            </Section>

            {/* AI Brain */}
            <Section icon={<Sparkles className="w-4 h-4 text-[#FF6A1F]" />} title="AI Brain (System Prompt)" desc="Write custom system instructions, rules, or few-shot examples to program your AI's behavior directly">
              <Field label="System Prompt Instructions" hint="This will override the default prompt rules and act as the AI's core programming. (catalog availability & community links are still automatically appended).">
                <Textarea
                  rows={6}
                  value={form.system_prompt || ""}
                  onChange={(e) => set("system_prompt", e.target.value)}
                  disabled={isPrebuilt}
                  placeholder="e.g. You are a real Indian WhatsApp reseller. Speak casual Hinglish, keep replies to 1-2 lines, and mirror the customer's style naturally."
                />
              </Field>
            </Section>

            {/* Tone */}
            <Section icon={<MessageSquareText className="w-4 h-4" />} title="Tone" desc="Choose this agent's fallback tone when customer matching isn't active">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {TONE_OPTIONS.map((opt) => {
                  const active = form.tone === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => !isPrebuilt && set("tone", opt.value)}
                      disabled={isPrebuilt}
                      className={cn(
                        "relative rounded-xl border-2 p-3 text-left transition-all",
                        !isPrebuilt && "hover:-translate-y-0.5",
                        active
                          ? "border-[#0E8A4B] bg-[#E6F7EE] shadow-[0_3px_0_0_#0E8A4B]"
                          : "border-[#E8B968] bg-white",
                        !active && !isPrebuilt && "hover:border-[#FF6A1F]/40",
                        isPrebuilt && "cursor-not-allowed"
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
            <Section icon={<Languages className="w-4 h-4" />} title="Response language" desc="Default Hinglish — Natural, friendly local conversational style">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {LANG_OPTIONS.map((opt) => {
                  const active = form.response_language === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => !isPrebuilt && set("response_language", opt.value)}
                      disabled={isPrebuilt}
                      className={cn(
                        "rounded-xl border-2 p-3 text-left transition-all",
                        active
                          ? "border-[#0E8A4B] bg-[#E6F7EE] shadow-[0_3px_0_0_#0E8A4B]"
                          : "border-[#E8B968] bg-white",
                        !active && !isPrebuilt && "hover:border-[#FF6A1F]/40",
                        isPrebuilt && "cursor-not-allowed"
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
            <Section icon={<ShieldAlert className="w-4 h-4 text-rose-600" />} title="Escalation Guardrails" desc="Configure keywords that immediately route the customer to a human agent">
              <Field label="Escalate keywords" hint="Comma-separated keywords to bypass AI draft">
                <Input
                  value={form.escalate_keywords}
                  onChange={(e) => set("escalate_keywords", e.target.value)}
                  disabled={isPrebuilt}
                  placeholder="refund, complaint, legal, lawyer"
                />
              </Field>
            </Section>

            {/* Actions: delete custom agents */}
            {form.type === "custom" && !form.is_active && (
              <div className="pt-2 flex justify-end">
                <Button
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 text-[11px] font-extrabold gap-1.5"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete "${form.name}"?`)) {
                      deleteAgent.mutate(form.id);
                    }
                  }}
                  disabled={deleteAgent.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Custom Agent
                </Button>
              </div>
            )}
          </div>

          {/* Live preview - 1 col */}
          <div className="xl:col-span-1">
            <LivePreview agent={form} setForm={setForm} />
          </div>
        </div>
      </div>

      {/* Floating Chat Builder for Mobile/Tablet */}
      <div className="xl:hidden">
        {/* FAB Button */}
        <button
          type="button"
          onClick={() => setIsFloatingChatOpen((prev) => !prev)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-tr from-[#FF6A1F] to-[#FF8C37] text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all animate-bounce-subtle"
        >
          {isFloatingChatOpen ? <X className="w-6 h-6" /> : <MessageSquareText className="w-6 h-6" />}
        </button>

        {/* Floating Chat Window */}
        {isFloatingChatOpen && (
          <div className="fixed bottom-24 right-6 z-50 w-[340px] sm:w-[380px] h-[500px] bg-white border-2 border-[#E8B968] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
            <div className="bg-[#FFF6E8] border-b border-[#E8B968] p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">AI Agent Builder</span>
              </div>
              <button
                type="button"
                onClick={() => setIsFloatingChatOpen(false)}
                className="text-foreground/50 hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-hidden flex flex-col">
              <ChatBuilderContent agent={form} setForm={setForm} />
            </div>
          </div>
        )}
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

const UsageMeter = ({ usage }: { usage: any }) => {
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
            href="/app/upgrade"
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
          {usage.breakdown.map((b: any) => (
            <span key={b.feature} className="text-[10.5px] bg-[#FFF6E8] border border-[#E8B968] rounded-full px-2 py-0.5 font-bold">
              {b.feature.replace(/_/g, " ")}: {b.weight}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const ChatBuilderContent = ({ agent, setForm }: { agent: AiAgent; setForm: React.Dispatch<React.SetStateAction<AiAgent | null>> }) => {
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content: "Hi! I am your AI Agent Builder Specialist. 🤖\n\nTell me about your business (e.g., your name, what you sell, your tone, or language), and I will configure the settings automatically!"
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput("");

    const newMessages = [...messages, { role: "user" as const, content: userMsg }];
    setMessages(newMessages);
    setChatLoading(true);

    try {
      const res = await api.builderChat({
        agent_id: agent.id,
        messages: newMessages
      });

      setMessages([...newMessages, { role: "assistant", content: res.reply }]);

      if (res.agent_updates && Object.keys(res.agent_updates).length > 0) {
        setForm((prev) => {
          if (!prev) return prev;
          const next = { ...prev };
          let updatedCount = 0;
          const updates = res.agent_updates!;

          if (updates.name !== undefined && updates.name !== prev.name) { next.name = updates.name; updatedCount++; }
          if (updates.business_name !== undefined && updates.business_name !== prev.business_name) { next.business_name = updates.business_name; updatedCount++; }
          if (updates.what_we_sell !== undefined && updates.what_we_sell !== prev.what_we_sell) { next.what_we_sell = updates.what_we_sell; updatedCount++; }
          if (updates.knowledge_base !== undefined && updates.knowledge_base !== prev.knowledge_base) { next.knowledge_base = updates.knowledge_base; updatedCount++; }
          if (updates.system_prompt !== undefined && updates.system_prompt !== prev.system_prompt) { next.system_prompt = updates.system_prompt; updatedCount++; }
          if (updates.tone !== undefined && updates.tone !== prev.tone) { next.tone = updates.tone; updatedCount++; }
          if (updates.response_language !== undefined && updates.response_language !== prev.response_language) { next.response_language = updates.response_language; updatedCount++; }

          if (updatedCount > 0) {
            toast.success(`Updated ${updatedCount} settings from chat! Click "Save training" to save.`, {
              duration: 4000
            });
          }
          return next;
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Chat building failed");
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0 mb-3 border border-slate-100 rounded-xl p-2.5 bg-slate-50/50 flex flex-col">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              "max-w-[85%] rounded-2xl px-3.5 py-2 text-[12.5px] leading-relaxed shadow-sm",
              msg.role === "assistant"
                ? "self-start bg-white border border-[#E8B968]/30 rounded-bl-none text-foreground mr-auto"
                : "self-end bg-[#E6F7EE] border border-[#0E8A4B]/20 rounded-br-none text-slate-800 ml-auto"
            )}
            style={{ whiteSpace: "pre-line" }}
          >
            {msg.content}
          </div>
        ))}
        {chatLoading && (
          <div className="self-start max-w-[85%] bg-white border border-[#E8B968]/30 rounded-2xl rounded-bl-none px-3.5 py-2 text-[11px] text-muted-foreground flex items-center gap-1.5 shadow-sm mr-auto">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF6A1F]" />
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="flex gap-1.5 mt-auto">
        <Input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          disabled={chatLoading}
          placeholder="Describe your business..."
          className="h-9 text-[12.5px] flex-1 bg-white border-[#E8B968] focus-visible:ring-[#FF6A1F]"
        />
        <Button
          type="submit"
          disabled={chatLoading || !chatInput.trim()}
          className="h-9 px-4 bg-[#FF6A1F] hover:bg-[#E85C12] text-white shadow-sm flex items-center justify-center font-bold text-[12px]"
        >
          Send
        </Button>
      </form>
    </div>
  );
};

const LivePreview = ({ agent, setForm }: { agent: AiAgent; setForm: React.Dispatch<React.SetStateAction<AiAgent | null>> }) => {
  const [activeTab, setActiveTab] = useState<"preview" | "chat">("preview");

  const greetings: Record<string, string> = {
    hinglish: "Hi! Aap ka query receive ho gaya 🙏 — bata dijiye kya help chahiye?",
    hindi: "नमस्ते! आपकी जानकारी प्राप्त हो गई 🙏 — बताइए हम कैसे मदद कर सकते हैं?",
    english: "Hi there! Got your message 🙏 — happy to help. What do you need?",
    auto: "Hi! Aap ka query receive ho gaya 🙏 — bata dijiye kya help chahiye?",
  };
  const toneTags: Record<string, string> = {
    friendly: "Friendly",
    professional: "Professional",
    casual: "Casual",
    danger: "Sales push",
    urgent_sales: "Sales push",
  };

  const isPrebuilt = agent.type === "prebuilt_sales" || !!agent.prebuilt_id;

  return (
    <div className="sticky top-4 bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] overflow-hidden flex flex-col">
      {/* Tab Switcher */}
      <div className="flex border-b border-[#E8B968] bg-[#FFF6E8]/40">
        <button
          type="button"
          onClick={() => setActiveTab("preview")}
          className={cn(
            "flex-1 py-3 text-[11px] font-black uppercase tracking-wider transition-all text-center border-b-2",
            activeTab === "preview"
              ? "border-[#FF6A1F] text-[#FF6A1F] bg-white font-extrabold"
              : "border-transparent text-foreground/50 hover:text-foreground/75 font-bold"
          )}
        >
          Live Preview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("chat")}
          className={cn(
            "flex-1 py-3 text-[11px] font-black uppercase tracking-wider transition-all text-center border-b-2 flex items-center justify-center gap-1",
            activeTab === "chat"
              ? "border-[#FF6A1F] text-[#FF6A1F] bg-white font-extrabold"
              : "border-transparent text-foreground/50 hover:text-foreground/75 font-bold"
          )}
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-purple-600" />
          Chat Builder
        </button>
      </div>

      <div className="p-4 flex flex-col flex-1">
        {activeTab === "preview" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/60">Live Preview</p>
              <span className="text-[10px] bg-[#FFD23F] text-[#7A4A00] font-extrabold rounded px-1.5 py-0.5">PREVIEW</span>
            </div>

            {/* WhatsApp-style sample */}
            <div className="bg-[#FFF6E8] rounded-xl p-3 border border-[#E8B968]/60">
              <div className="self-start max-w-[88%] bg-white rounded-2xl rounded-bl-md px-3 py-2 shadow-sm border border-[#E8B968]/40 mb-2">
                <p className="text-[11.5px] text-foreground/70 italic">Customer: "Hello, tools kya hain?"</p>
              </div>
              <div className="ml-4 max-w-[88%] bg-[#E6F7EE] rounded-2xl rounded-br-md px-3 py-2 shadow-sm border border-[#0E8A4B]/20">
                <p className="text-[12px] leading-relaxed">
                  {agent.business_name
                    ? `Hi! 👋 ${agent.business_name} se contact karne ke liye thanks. `
                    : "Hi! 👋 Thanks for reaching out. "}
                  {greetings[agent.response_language].replace(greetings[agent.response_language].split("!")[0] + "! ", "")}
                </p>
                <p className="text-[8px] text-foreground/40 mt-1 text-right">12:34 PM · AI draft</p>
              </div>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <Row label="Active Agent" value={agent.name} />
              <Row label="Tone" value={toneTags[agent.tone] || agent.tone} />
              <Row label="Language" value={agent.response_language} />
              <Row label="Tools/Products" value={agent.products ? `${agent.products.length} products` : "0 products"} />
              <Row label="KB Size" value={agent.knowledge_base ? `${agent.knowledge_base.length} chars` : "0 chars"} />
              <Row label="AI Brain" value={agent.system_prompt ? `${agent.system_prompt.length} chars` : "0 chars"} />
            </div>

            <p className="text-[10px] text-foreground/55 mt-2 leading-snug">
              Tone dynamically matches the customer's chat style in live chats. If the customer messages in Hinglish, Addison will reply in Hinglish.
            </p>
          </div>
        ) : (
          <div className="h-[400px] flex flex-col">
            {isPrebuilt ? (
              <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                <ShieldAlert className="w-8 h-8 text-[#FF6A1F] mb-2" />
                <p className="text-[12px] font-extrabold text-[#7A4A00]">Prebuilt Agent cannot be modified</p>
                <p className="text-[10.5px] text-foreground/60 mt-1">Please select or create a custom agent to use the conversational builder.</p>
              </div>
            ) : (
              <ChatBuilderContent agent={agent} setForm={setForm} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-foreground/55 uppercase tracking-wider font-bold text-[9.5px]">{label}</span>
    <span className="font-extrabold text-foreground/85 truncate">{value}</span>
  </div>
);

