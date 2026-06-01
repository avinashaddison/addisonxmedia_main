import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Brain, Sparkles, ShieldAlert, MessageSquareText, Languages, Loader2,
  CheckCircle2, Zap, Save, Plus, Trash2, Play, Trash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { adminApi, type PrebuiltAgent } from "@/lib/admin-api";
import { toast } from "sonner";

const TONE_OPTIONS = [
  { value: "friendly",     label: "Friendly",      description: "Warm, helpful, light emojis.", emoji: "🙂" },
  { value: "professional", label: "Professional",  description: "Polished and formal. No emojis.", emoji: "💼" },
  { value: "casual",       label: "Casual",        description: "Chill, conversational, no jargon.", emoji: "👋" },
  { value: "urgent_sales", label: "Urgent sales",  description: "Pushes toward a close.", emoji: "🔥" },
];

const LANG_OPTIONS = [
  { value: "auto",     label: "Auto (Detect)",         sub: "Match the customer's script/language dynamically" },
  { value: "hinglish", label: "Hinglish",            sub: "Roman script, code-switches like a real Indian convo" },
  { value: "hindi",    label: "Hindi (Devanagari)",  sub: "Pure हिंदी" },
  { value: "english",  label: "English",             sub: "Pure English" },
];

export const AdminAgentPlayground = () => {
  const qc = useQueryClient();

  // 1. Fetch prebuilt templates
  const { data: templates = [], isLoading: loading } = useQuery({
    queryKey: ["admin-prebuilt-agents"],
    queryFn: () => adminApi.listPrebuiltAgents(),
  });

  // Selected template state
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (templates.length > 0 && !selectedId) {
      setSelectedId(templates[0].id);
    }
  }, [templates, selectedId]);

  const selectedTemplate = templates.find((t) => t.id === selectedId) || templates[0];

  // Local form state
  const [form, setForm] = useState<PrebuiltAgent | null>(null);
  useEffect(() => {
    if (selectedTemplate) {
      setForm(selectedTemplate);
    }
  }, [selectedTemplate]);

  // Product addition state
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdValidity, setNewProdValidity] = useState("Monthly");
  const [newProdActivationMail, setNewProdActivationMail] = useState("Activation On your Mail");
  const [newProdActivationTime, setNewProdActivationTime] = useState("10 min");
  const [customActivationTime, setCustomActivationTime] = useState("");

  // New template creation state
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");

  // Mutations
  const save = useMutation({
    mutationFn: (data: PrebuiltAgent) => adminApi.updatePrebuiltAgent(data.id, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["admin-prebuilt-agents"] });
      toast.success(`Template "${updated.name}" updated successfully!`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save"),
  });

  const create = useMutation({
    mutationFn: (name: string) => adminApi.createPrebuiltAgent({ name }),
    onSuccess: (newTemplate) => {
      qc.invalidateQueries({ queryKey: ["admin-prebuilt-agents"] });
      setSelectedId(newTemplate.id);
      setIsCreating(false);
      setNewName("");
      toast.success(`Template "${newTemplate.name}" created! Configure details below.`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Creation failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deletePrebuiltAgent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-prebuilt-agents"] });
      setSelectedId(null);
      toast.success("Template deleted successfully.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Delete failed"),
  });

  if (loading || (templates.length > 0 && !form)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const setVal = <K extends keyof PrebuiltAgent>(k: K, v: PrebuiltAgent[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const dirty = selectedTemplate && JSON.stringify(selectedTemplate) !== JSON.stringify(form);

  const handleAddProduct = () => {
    if (!newProdName.trim()) {
      toast.error("Product name is required");
      return;
    }
    const priceNum = Number(newProdPrice) || 0;
    const currentProds = form?.products || [];
    const finalActivationTime = newProdActivationTime === "custom" ? customActivationTime.trim() : newProdActivationTime;
    const updatedProds = [
      ...currentProds,
      {
        name: newProdName,
        price: priceNum,
        validity: newProdValidity,
        activationMail: newProdActivationMail,
        activationTime: finalActivationTime || "10 min",
      }
    ];
    setVal("products", updatedProds);
    setNewProdName("");
    setNewProdPrice("");
    setNewProdValidity("Monthly");
    setNewProdActivationMail("Activation On your Mail");
    setNewProdActivationTime("10 min");
    setCustomActivationTime("");
  };

  const handleRemoveProduct = (idx: number) => {
    const currentProds = form?.products || [];
    const updatedProds = currentProds.filter((_, i) => i !== idx);
    setVal("products", updatedProds);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
            <Brain className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Agent Playground</h1>
            <p className="text-xs text-slate-500 font-medium">
              Create, configure and manage prebuilt templates. Enabled templates sync automatically to customer workspaces.
            </p>
          </div>
        </div>
        {form && (
          <div className="flex items-center gap-2">
            <Button
              className={cn(
                "rounded-xl gap-1.5 transition-all",
                dirty 
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" 
                  : "bg-slate-100 hover:bg-slate-100 text-slate-400 cursor-not-allowed"
              )}
              onClick={() => save.mutate(form)}
              disabled={!dirty || save.isPending}
            >
              {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Template
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column: Template switcher */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Templates</h3>
              <span className="text-[10px] font-bold text-slate-400">{templates.length} total</span>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {templates.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">No templates found.</p>
              ) : (
                templates.map((template) => {
                  const active = template.id === selectedId;
                  const enabled = template.is_enabled;
                  return (
                    <button
                      key={template.id}
                      onClick={() => {
                        if (!isCreating) {
                          setSelectedId(template.id);
                        }
                      }}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1 relative overflow-hidden",
                        active
                          ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold truncate pr-2">{template.name}</span>
                        <span className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                          enabled ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 border border-slate-200/50"
                        )}>
                          {enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-500 capitalize font-medium">{template.tone}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Creation field */}
            {isCreating ? (
              <div className="p-3 border border-dashed border-indigo-200 rounded-xl bg-slate-50/50 space-y-2 animate-in fade-in duration-200">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Template Name</Label>
                <Input
                  size={30}
                  className="h-8 text-xs rounded-lg border-slate-200 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Real Estate Agent"
                  autoFocus
                />
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                    onClick={() => {
                      if (newName.trim()) {
                        create.mutate(newName.trim());
                      }
                    }}
                    disabled={create.isPending}
                  >
                    {create.isPending ? "Creating..." : "Create"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-slate-500 hover:bg-slate-100 rounded-lg"
                    onClick={() => {
                      setIsCreating(false);
                      setNewName("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-9 border-dashed border-slate-200 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50/20 text-xs font-semibold gap-1.5 rounded-xl transition-all"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                New Template
              </Button>
            )}
          </div>
        </div>

        {/* Center & Right columns: Edit Panel */}
        <div className="lg:col-span-3 grid grid-cols-1 xl:grid-cols-3 gap-6">
          {form ? (
            <>
              <div className="xl:col-span-2 space-y-5">
                {/* Availability Toggle */}
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Template availability</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Enable this template to make it instantly visible and applicable for all customer workspaces.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn("text-xs font-bold tracking-wider", form.is_enabled ? "text-emerald-600" : "text-slate-400")}>
                      {form.is_enabled ? "ENABLED" : "DISABLED"}
                    </span>
                    <Switch
                      checked={form.is_enabled}
                      onCheckedChange={(checked) => setVal("is_enabled", checked)}
                    />
                  </div>
                </div>

                {/* Identity Basics */}
                <Section icon={<Sparkles className="w-4 h-4 text-indigo-600" />} title="Template Basics" desc="Provide details for this agent template">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Template Name" hint="Internal title for identifying the template">
                      <Input
                        value={form.name}
                        onChange={(e) => setVal("name", e.target.value)}
                        placeholder="e.g. AI Tools Salesman"
                        className="rounded-xl border-slate-200 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 text-slate-800"
                      />
                    </Field>
                    <Field label="Default Business name" hint="Placeholder name shown in chat headers">
                      <Input
                        value={form.business_name}
                        onChange={(e) => setVal("business_name", e.target.value)}
                        placeholder="e.g. AI Tool Shop"
                        className="rounded-xl border-slate-200 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 text-slate-800"
                      />
                    </Field>
                  </div>
                  <Field label="What it sells" hint="Details about services/products sold by the prebuilt agent">
                    <Textarea
                      rows={3}
                      value={form.what_we_sell}
                      onChange={(e) => setVal("what_we_sell", e.target.value)}
                      placeholder="Describe what this template specializes in selling..."
                      className="rounded-xl border-slate-200 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 text-slate-800"
                    />
                  </Field>
                </Section>

                {/* Products */}
                <Section icon={<Zap className="w-4 h-4 text-indigo-600" />} title="Products & Catalog" desc="Define specialized items pre-loaded for this agent template">
                  <div className="space-y-4">
                    {form.products && form.products.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[200px] overflow-y-auto pr-1">
                        {form.products.map((p, idx) => (
                          <div key={idx} className="bg-slate-50 border border-slate-200/50 rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm hover:border-slate-300 transition-all">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-850 truncate">{p.name}</p>
                              <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                                ₹{p.price.toLocaleString("en-IN")} · {p.validity}
                                {p.activationMail && ` · ${p.activationMail}`}
                                {p.activationTime && ` · ⏱️ ${p.activationTime}`}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg flex-shrink-0"
                              onClick={() => handleRemoveProduct(idx)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-1">No template products. Add some below.</p>
                    )}

                    <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl p-4 space-y-4 shadow-inner">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        <div className="sm:col-span-5 space-y-1">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Product Name</Label>
                          <Input
                            className="h-9 text-xs rounded-xl border-slate-200 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500"
                            value={newProdName}
                            onChange={(e) => setNewProdName(e.target.value)}
                            placeholder="e.g. Basic Plan"
                          />
                        </div>
                        <div className="sm:col-span-3 space-y-1">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Price (INR)</Label>
                          <Input
                            className="h-9 text-xs rounded-xl border-slate-200 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500"
                            type="number"
                            value={newProdPrice}
                            onChange={(e) => setNewProdPrice(e.target.value)}
                            placeholder="999"
                          />
                        </div>
                        <div className="sm:col-span-4 space-y-1">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Validity</Label>
                          <Select value={newProdValidity} onValueChange={setNewProdValidity}>
                            <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white">
                              <SelectValue placeholder="Validity" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="Monthly" className="text-xs">Monthly</SelectItem>
                              <SelectItem value="Yearly" className="text-xs">Yearly</SelectItem>
                              <SelectItem value="Lifetime" className="text-xs">Lifetime</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        <div className="sm:col-span-5 space-y-1">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Activation Mail</Label>
                          <Select value={newProdActivationMail} onValueChange={setNewProdActivationMail}>
                            <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white">
                              <SelectValue placeholder="Activation Option" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="Activation On your Mail" className="text-xs">Activation On your Mail</SelectItem>
                              <SelectItem value="Mail and Pass Provide by us" className="text-xs">Mail and Pass Provide by us</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className={cn(newProdActivationTime === "custom" ? "sm:col-span-3" : "sm:col-span-6", "space-y-1")}>
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Activation Time</Label>
                          <Select value={newProdActivationTime} onValueChange={setNewProdActivationTime}>
                            <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white">
                              <SelectValue placeholder="Activation Time" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="10 min" className="text-xs">10 min</SelectItem>
                              <SelectItem value="30 min" className="text-xs">30 min</SelectItem>
                              <SelectItem value="1 hour" className="text-xs">1 hour</SelectItem>
                              <SelectItem value="custom" className="text-xs">Custom...</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {newProdActivationTime === "custom" && (
                          <div className="sm:col-span-3 space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Custom Time</Label>
                            <Input
                              className="h-9 text-xs rounded-xl border-slate-200 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500"
                              value={customActivationTime}
                              onChange={(e) => setCustomActivationTime(e.target.value)}
                              placeholder="e.g. 2 hours"
                            />
                          </div>
                        )}
                        <div className="sm:col-span-1 flex justify-end">
                          <Button
                            size="sm"
                            className="h-9 w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm"
                            onClick={handleAddProduct}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Section>

                {/* Knowledge Base */}
                <Section icon={<Brain className="w-4 h-4 text-violet-600" />} title="Knowledge Base" desc="Ground documentation that the agent pulls during chats">
                  <Field label="Agent Documentation & FAQs" hint="Add shipping policies, refunds, warranty details etc.">
                    <Textarea
                      rows={4}
                      value={form.knowledge_base || ""}
                      onChange={(e) => setVal("knowledge_base", e.target.value)}
                      placeholder="Specify support rules, warranties, activation methods..."
                      className="rounded-xl border-slate-200 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 text-slate-800"
                    />
                  </Field>
                </Section>

                {/* AI Brain */}
                <Section icon={<Sparkles className="w-4 h-4 text-indigo-600" />} title="AI Brain (System Prompt)" desc="Instruct the system prompt behavior or configure Hinglish conversational rules">
                  <Field label="System Prompt Instructions" hint="Overrides default prompt instructions completely.">
                    <Textarea
                      rows={6}
                      value={form.system_prompt || ""}
                      onChange={(e) => setVal("system_prompt", e.target.value)}
                      placeholder="Write custom instructions or few-shot examples for Hinglish style..."
                      className="rounded-xl border-slate-200 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 text-slate-800 font-mono text-xs"
                    />
                  </Field>
                </Section>

                {/* Tone */}
                <Section icon={<MessageSquareText className="w-4 h-4 text-slate-500" />} title="Tone" desc="Specify template default fallback tone">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {TONE_OPTIONS.map((opt) => {
                      const active = form.tone === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setVal("tone", opt.value)}
                          className={cn(
                            "relative rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5",
                            active
                              ? "border-emerald-600 bg-emerald-50/40 text-emerald-950 shadow-sm"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-350"
                          )}
                        >
                          {active && <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-emerald-600" />}
                          <div className="text-2xl mb-1">{opt.emoji}</div>
                          <p className="text-xs font-bold leading-tight text-slate-800">{opt.label}</p>
                          <p className="text-[10px] text-slate-500 mt-1 leading-normal">{opt.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </Section>

                {/* Language */}
                <Section icon={<Languages className="w-4 h-4 text-slate-500" />} title="Response Language" desc="Standard fallback script for replies">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {LANG_OPTIONS.map((opt) => {
                      const active = form.response_language === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setVal("response_language", opt.value)}
                          className={cn(
                            "rounded-xl border p-4 text-left transition-all relative overflow-hidden flex flex-col justify-between",
                            active
                              ? "border-emerald-600 bg-emerald-50/40 text-emerald-950 shadow-sm"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-350"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs font-bold text-slate-850">{opt.label}</p>
                            {active && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                          </div>
                          <p className="text-[10px] text-slate-500 leading-normal">{opt.sub}</p>
                        </button>
                      );
                    })}
                  </div>
                </Section>

                {/* Guardrails */}
                <Section icon={<ShieldAlert className="w-4 h-4 text-rose-600" />} title="Escalation Guardrails" desc="Configure keywords that immediately route the customer to a human agent">
                  <Field label="Escalate keywords" hint="Comma-separated trigger words to bypass AI draft">
                    <Input
                      value={form.escalate_keywords}
                      onChange={(e) => setVal("escalate_keywords", e.target.value)}
                      placeholder="refund, legal, police, fraud"
                      className="rounded-xl border-slate-200 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 text-slate-850"
                    />
                  </Field>
                </Section>

                {/* Delete button */}
                <div className="pt-2 flex justify-end">
                  <Button
                    variant="ghost"
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-bold gap-1.5 rounded-xl"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete template "${form.name}"? This deletes it for all customers!`)) {
                        remove.mutate(form.id);
                      }
                    }}
                    disabled={remove.isPending}
                  >
                    <Trash className="w-4 h-4" />
                    Delete Template
                  </Button>
                </div>
              </div>

              {/* Sidebar live preview */}
              <div className="xl:col-span-1">
                <div className="sticky top-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Template Live Preview</p>
                    <span className="text-[9px] bg-slate-100 text-slate-650 border border-slate-200/60 font-bold rounded px-1.5 py-0.5">ADMIN MODE</span>
                  </div>

                  <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 space-y-3 flex flex-col">
                    <div className="self-start max-w-[90%] bg-white rounded-2xl rounded-bl-none px-3.5 py-2 shadow-sm border border-slate-200/40 text-xs text-slate-700">
                      <p className="font-medium">Customer: "Hello, price kya hai?"</p>
                    </div>
                    <div className="self-end ml-4 max-w-[90%] bg-emerald-600 text-white rounded-2xl rounded-br-none px-3.5 py-2 shadow-sm text-xs leading-relaxed">
                      <p>
                        {form.business_name
                          ? `Hi! 👋 ${form.business_name} se contact karne ke liye thanks. `
                          : "Hi! 👋 Thanks for reaching out. "}
                        Kya aapko {form.name || "Agent"} ke plans check karne hain?
                      </p>
                      <p className="text-[8px] text-emerald-200 mt-1 text-right">12:34 PM</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-450 font-bold uppercase tracking-wider text-[9px]">Template Name</span>
                      <span className="font-bold text-slate-700 truncate max-w-[130px]">{form.name || "—"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-450 font-bold uppercase tracking-wider text-[9px]">Tone Fallback</span>
                      <span className="font-bold text-slate-700 capitalize">{form.tone || "—"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-450 font-bold uppercase tracking-wider text-[9px]">Catalog Size</span>
                      <span className="font-bold text-slate-700">{form.products ? form.products.length : 0} items</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-450 font-bold uppercase tracking-wider text-[9px]">Enabled</span>
                      <span className={cn("font-bold", form.is_enabled ? "text-emerald-650" : "text-slate-450")}>
                        {form.is_enabled ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="col-span-3 text-center py-20 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
              <Brain className="w-12 h-12 text-slate-350 mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-semibold">Select or create a template to begin configuring</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Sub-components
const Section = ({
  icon, title, desc, children,
}: { icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }) => (
  <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
    <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-3">
      <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-900 leading-none">{title}</h3>
        <p className="text-xs text-slate-500 mt-1.5 leading-none">{desc}</p>
      </div>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5 w-full">
    <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{label}</Label>
    {children}
    {hint && <p className="text-[11px] text-slate-400 leading-normal mt-0.5 font-medium">{hint}</p>}
  </div>
);

export default AdminAgentPlayground;
