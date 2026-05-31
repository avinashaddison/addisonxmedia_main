import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Brain, Sparkles, ShieldAlert, MessageSquareText, Languages, Loader2,
  CheckCircle2, ArrowUpRight, Zap, Save, Plus, Trash2, ShieldCheck, Play, UserCircle
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

  // Product addition state
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdValidity, setNewProdValidity] = useState("Monthly");
  const [newProdActivationMail, setNewProdActivationMail] = useState("Activation On your Mail");
  const [newProdActivationTime, setNewProdActivationTime] = useState("10 min");
  const [customActivationTime, setCustomActivationTime] = useState("");
  const [newProdDesc, setNewProdDesc] = useState("");
  const [newProdImage, setNewProdImage] = useState("");

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

  if (agentsLoading || !form) {
    return (
      <PageShell title="Agent Playground" subtitle="Addison AI ko apne business ke baare mein sikhayein" icon={<Brain className="w-5 h-5" />}>
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

  const handleAddProduct = () => {
    if (!newProdName.trim()) {
      toast.error("Product name is required");
      return;
    }
    const priceNum = Number(newProdPrice) || 0;
    const currentProds = form.products || [];
    const finalActivationTime = newProdActivationTime === "custom" ? customActivationTime.trim() : newProdActivationTime;
    const updatedProds = [
      ...currentProds,
      {
        name: newProdName,
        price: priceNum,
        validity: newProdValidity,
        activationMail: newProdActivationMail,
        activationTime: finalActivationTime || "10 min",
        description: newProdDesc.trim() || undefined,
        imageUrl: newProdImage.trim() || undefined,
      }
    ];
    set("products", updatedProds);
    setNewProdName("");
    setNewProdPrice("");
    setNewProdValidity("Monthly");
    setNewProdActivationMail("Activation On your Mail");
    setNewProdActivationTime("10 min");
    setCustomActivationTime("");
    setNewProdDesc("");
    setNewProdImage("");
  };

  const handleRemoveProduct = (idx: number) => {
    const currentProds = form.products || [];
    const updatedProds = currentProds.filter((_, i) => i !== idx);
    set("products", updatedProds);
  };

  return (
    <PageShell
      title="Agent Playground"
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

            {/* Products/AI Tools Section */}
            <Section icon={<Zap className="w-4 h-4 text-[#FF6A1F]" />} title="AI Tools & Products" desc="Add products with price & validity that this agent specializes in selling">
              {/* Product catalog display */}
              <div className="space-y-2">
                {form.products && form.products.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {form.products.map((p, idx) => (
                      <div key={idx} className="bg-muted/30 border border-[#E8B968]/45 rounded-xl p-2.5 flex items-center gap-3">
                        {p.imageUrl && (
                          <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-[#E8B968]/30" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[11.5px] font-black truncate">{p.name}</p>
                          {p.description && (
                            <p className="text-[10px] text-foreground/50 truncate leading-tight mb-0.5">{p.description}</p>
                          )}
                          <p className="text-[9.5px] text-foreground/60 font-bold truncate">
                            ₹{p.price.toLocaleString("en-IN")} · {p.validity}
                          </p>
                        </div>
                        {!isPrebuilt && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10 flex-shrink-0"
                            onClick={() => handleRemoveProduct(idx)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10.5px] text-foreground/45 italic py-2">No tools or products added. Add some below to let the agent pitch them.</p>
                )}

                {/* Add product fields */}
                {!isPrebuilt && (
                  <div className="bg-muted/15 border-2 border-dashed border-[#E8B968]/70 rounded-xl p-3 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      <div className="sm:col-span-5 space-y-1">
                        <Label className="text-[9.5px] font-black uppercase text-foreground/65">Tool / Product Name</Label>
                        <Input
                          className="h-8 text-[11px]"
                          value={newProdName}
                          onChange={(e) => setNewProdName(e.target.value)}
                          placeholder="e.g. Image Studio Pro"
                        />
                      </div>
                      <div className="sm:col-span-3 space-y-1">
                        <Label className="text-[9.5px] font-black uppercase text-foreground/65">Price (INR)</Label>
                        <Input
                          className="h-8 text-[11px]"
                          type="number"
                          value={newProdPrice}
                          onChange={(e) => setNewProdPrice(e.target.value)}
                          placeholder="e.g. 999"
                        />
                      </div>
                      <div className="sm:col-span-4 space-y-1">
                        <Label className="text-[9.5px] font-black uppercase text-foreground/65">Validity</Label>
                        <Select value={newProdValidity} onValueChange={setNewProdValidity}>
                          <SelectTrigger className="h-8 text-[11px]">
                            <SelectValue placeholder="Validity" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Monthly" className="text-[11px]">Monthly</SelectItem>
                            <SelectItem value="Yearly" className="text-[11px]">Yearly</SelectItem>
                            <SelectItem value="Lifetime" className="text-[11px]">Lifetime</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      <div className="sm:col-span-7 space-y-1">
                        <Label className="text-[9.5px] font-black uppercase text-foreground/65">Description</Label>
                        <Input
                          className="h-8 text-[11px]"
                          value={newProdDesc}
                          onChange={(e) => setNewProdDesc(e.target.value)}
                          placeholder="e.g. Premium AI image generation tool with weekly updates"
                        />
                      </div>
                      <div className="sm:col-span-5 space-y-1">
                        <Label className="text-[9.5px] font-black uppercase text-foreground/65">Image URL (Optional)</Label>
                        <Input
                          className="h-8 text-[11px]"
                          value={newProdImage}
                          onChange={(e) => setNewProdImage(e.target.value)}
                          placeholder="e.g. https://example.com/image.png"
                        />
                      </div>
                    </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                    <div className="sm:col-span-5 space-y-1">
                      <Label className="text-[9.5px] font-black uppercase text-foreground/65">Activation Mail</Label>
                      <Select value={newProdActivationMail} onValueChange={setNewProdActivationMail}>
                        <SelectTrigger className="h-8 text-[11px]">
                          <SelectValue placeholder="Activation Option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Activation On your Mail" className="text-[11px]">Activation On your Mail</SelectItem>
                          <SelectItem value="Mail and Pass Provide by us" className="text-[11px]">Mail and Pass Provide by us</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className={cn(newProdActivationTime === "custom" ? "sm:col-span-3" : "sm:col-span-6", "space-y-1")}>
                      <Label className="text-[9.5px] font-black uppercase text-foreground/65">Activation Time</Label>
                      <Select value={newProdActivationTime} onValueChange={setNewProdActivationTime}>
                        <SelectTrigger className="h-8 text-[11px]">
                          <SelectValue placeholder="Activation Time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10 min" className="text-[11px]">10 min</SelectItem>
                          <SelectItem value="30 min" className="text-[11px]">30 min</SelectItem>
                          <SelectItem value="1 hour" className="text-[11px]">1 hour</SelectItem>
                          <SelectItem value="custom" className="text-[11px]">Custom...</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {newProdActivationTime === "custom" && (
                      <div className="sm:col-span-3 space-y-1">
                        <Label className="text-[9.5px] font-black uppercase text-foreground/65">Custom Time</Label>
                        <Input
                          className="h-8 text-[11px]"
                          value={customActivationTime}
                          onChange={(e) => setCustomActivationTime(e.target.value)}
                          placeholder="e.g. 2 hours"
                        />
                      </div>
                    )}
                    <div className="sm:col-span-1 flex justify-end">
                      <Button
                        size="sm"
                        className="h-8 w-full bg-[#0E8A4B] hover:bg-[#0A6E3B] text-white"
                        onClick={handleAddProduct}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              </div>
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
            <LivePreview agent={form} />
          </div>
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

const LivePreview = ({ agent }: { agent: AiAgent }) => {
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
    urgent_sales: "Sales push",
  };

  return (
    <div className="sticky top-4 bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/60">Live Preview</p>
        <span className="text-[10px] bg-[#FFD23F] text-[#7A4A00] font-extrabold rounded px-1.5 py-0.5">PREVIEW</span>
      </div>

      {/* WhatsApp-style sample */}
      <div className="bg-[#FFF6E8] rounded-xl p-3 border border-[#E8B968]/60 mb-3">
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

      <p className="text-[10px] text-foreground/55 mt-3 leading-snug">
        Tone dynamically matches the customer's chat style in live chats. If the customer messages in Hinglish, Addison will reply in Hinglish.
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
