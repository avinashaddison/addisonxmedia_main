import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Brain, Sparkles, MessageSquare, Bot, Save, Zap, ShieldCheck, Play,
  User, DollarSign, Wallet, FileText, Loader2, CheckCircle2, Plus, Trash2
} from "lucide-react";
import { api, type AiAgent } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const SiteAgentTab = () => {
  const qc = useQueryClient();

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ["ai-agents"],
    queryFn: () => api.listAgents(),
  });

  const { data: usage } = useQuery({
    queryKey: ["ai-usage"],
    queryFn: () => api.getAiUsage(),
  });

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // Product addition state
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdValidity, setNewProdValidity] = useState("Monthly");
  const [newProdActivationMail, setNewProdActivationMail] = useState("Activation On your Mail");
  const [newProdActivationTime, setNewProdActivationTime] = useState("10 min");
  const [customActivationTime, setCustomActivationTime] = useState("");

  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      const active = agents.find((a) => a.is_active);
      setSelectedAgentId(active ? active.id : agents[0].id);
    }
  }, [agents, selectedAgentId]);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];
  const [form, setForm] = useState<AiAgent | null>(null);

  useEffect(() => {
    if (selectedAgent) {
      setForm(selectedAgent);
    }
  }, [selectedAgent]);

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
      toast.success("Agent activated successfully!");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Activation failed"),
  });

  if (agentsLoading || !form) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const isPrebuilt = form.type === "prebuilt_sales" || !!form.prebuilt_id;
  const isDirty = selectedAgent && JSON.stringify(selectedAgent) !== JSON.stringify(form);

  const set = <K extends keyof AiAgent>(k: K, v: AiAgent[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

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
    set("products", updatedProds);
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
    set("products", updatedProds);
  };

  return (
    <div className="space-y-6">
      {/* Top Identity Header */}
      <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary-soft text-primary flex items-center justify-center shadow-md">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-[16px] font-black">{form.name}</h3>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">
              Type: <span className="font-bold text-foreground capitalize">{form.type || "Custom"}</span> · Tone:{" "}
              <span className="font-bold text-foreground capitalize">{form.tone || "Friendly"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!form.is_active ? (
            <Button
              size="sm"
              className="bg-[#FF6A1F] hover:bg-[#E85C12] text-white shadow-md text-[12px] font-bold"
              onClick={() => activate.mutate(form.id)}
              disabled={activate.isPending}
            >
              Activate Agent
            </Button>
          ) : (
            <span className="bg-[#0E8A4B] text-white text-[11px] font-black px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" /> Live Active Agent
            </span>
          )}

          <Button
            size="sm"
            className="bg-[#0E8A4B] hover:bg-[#0A6E3C] text-white shadow-[0_2px_0_0_#073D22] text-[12px] font-bold"
            onClick={() => save.mutate(form)}
            disabled={!isDirty || save.isPending || isPrebuilt}
          >
            {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            Save training
          </Button>
        </div>
      </div>

      {/* Advanced Persona Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-5 space-y-4">
            <h4 className="text-[14px] font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-purple-600" /> Grounding & Knowledge Base
            </h4>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[11.5px] uppercase font-bold text-muted-foreground">What you sell</Label>
                <Textarea
                  value={form.what_we_sell || ""}
                  onChange={(e) => set("what_we_sell", e.target.value)}
                  placeholder="e.g. Premium Indian sweets, chocolates, and holiday gift packs."
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11.5px] uppercase font-bold text-muted-foreground">Custom Agent Guidelines / Training Data</Label>
                <Textarea
                  value={form.knowledge_base || ""}
                  onChange={(e) => set("knowledge_base", e.target.value)}
                  placeholder="Paste details about delivery times, return policies, or custom client scripts."
                  rows={8}
                />
              </div>
            </div>
          </div>

          {/* Payment configuration */}
          <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-5 space-y-4">
            <h4 className="text-[14px] font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" /> Integrated Payment Methods
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11.5px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-primary" /> UPI VPA
                </Label>
                <Input
                  value={form.upi_vpa || ""}
                  onChange={(e) => set("upi_vpa", e.target.value)}
                  placeholder="e.g. merchant@okaxis"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11.5px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-purple-500" /> Binance Pay ID (USD)
                </Label>
                <Input
                  value={form.binance_id || ""}
                  onChange={(e) => set("binance_id", e.target.value)}
                  placeholder="e.g. 987654321"
                />
              </div>
            </div>
          </div>

          {/* Products & Catalog */}
          <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-5 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#E8B968] pb-3">
              <h4 className="text-[14px] font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#FF6A1F]" /> Products & Catalog
              </h4>
              <span className="text-[10px] font-black text-slate-500 bg-[#FFF6E8] border border-[#E8B968] px-2 py-0.5 rounded-lg">
                {form.products ? form.products.length : 0} items
              </span>
            </div>
            
            <p className="text-[11.5px] text-muted-foreground">
              Define the items/services the AI agent is trained to sell. These will automatically synchronize with your main storefront database table.
            </p>

            <div className="space-y-4">
              {form.products && form.products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-1">
                  {form.products.map((p, idx) => (
                    <div key={idx} className="bg-white border-2 border-[#E8B968] rounded-xl p-3 flex items-center justify-between gap-3 shadow-[0_2px_0_0_#E8B968] hover:bg-[#FFF6E8]/20 transition-all">
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-slate-800 truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold truncate mt-0.5">
                          ₹{p.price.toLocaleString("en-IN")} · {p.validity}
                          {p.activationMail && ` · ${p.activationMail}`}
                          {p.activationTime && ` · ⏱️ ${p.activationTime}`}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-rose-500 hover:bg-rose-50 hover:text-rose-650 rounded-lg flex-shrink-0"
                        onClick={() => handleRemoveProduct(idx)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-1 font-bold">No products. Add some below.</p>
              )}

              <div className="bg-[#FFF6E8]/40 border-2 border-dashed border-[#E8B968] rounded-2xl p-4 space-y-4 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-5 space-y-1">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-650">Product Name</Label>
                    <Input
                      className="h-9 text-xs rounded-xl border-2 border-[#E8B968] bg-white text-slate-800 font-bold focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#0E8A4B]"
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      placeholder="e.g. Basic Plan"
                    />
                  </div>
                  <div className="sm:col-span-3 space-y-1">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-650">Price (INR)</Label>
                    <Input
                      className="h-9 text-xs rounded-xl border-2 border-[#E8B968] bg-white text-slate-800 font-bold focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#0E8A4B]"
                      type="number"
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(e.target.value)}
                      placeholder="999"
                    />
                  </div>
                  <div className="sm:col-span-4 space-y-1">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-650">Validity</Label>
                    <Select value={newProdValidity} onValueChange={setNewProdValidity}>
                      <SelectTrigger className="h-9 text-xs rounded-xl border-2 border-[#E8B968] focus:ring-0 focus:border-[#0E8A4B] bg-white font-bold">
                        <SelectValue placeholder="Validity" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-2 border-[#E8B968] font-bold bg-white">
                        <SelectItem value="Monthly" className="text-xs">Monthly</SelectItem>
                        <SelectItem value="Yearly" className="text-xs">Yearly</SelectItem>
                        <SelectItem value="Lifetime" className="text-xs">Lifetime</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-5 space-y-1">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-650">Activation Mail</Label>
                    <Select value={newProdActivationMail} onValueChange={setNewProdActivationMail}>
                      <SelectTrigger className="h-9 text-xs rounded-xl border-2 border-[#E8B968] focus:ring-0 focus:border-[#0E8A4B] bg-white font-bold">
                        <SelectValue placeholder="Activation Option" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-2 border-[#E8B968] font-bold bg-white">
                        <SelectItem value="Activation On your Mail" className="text-xs">Activation On your Mail</SelectItem>
                        <SelectItem value="Mail and Pass Provide by us" className="text-xs">Mail and Pass Provide by us</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={cn(newProdActivationTime === "custom" ? "sm:col-span-3" : "sm:col-span-6", "space-y-1")}>
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-650">Activation Time</Label>
                    <Select value={newProdActivationTime} onValueChange={setNewProdActivationTime}>
                      <SelectTrigger className="h-9 text-xs rounded-xl border-2 border-[#E8B968] focus:ring-0 focus:border-[#0E8A4B] bg-white font-bold">
                        <SelectValue placeholder="Activation Time" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-2 border-[#E8B968] font-bold bg-white">
                        <SelectItem value="10 min" className="text-xs">10 min</SelectItem>
                        <SelectItem value="30 min" className="text-xs">30 min</SelectItem>
                        <SelectItem value="1 hour" className="text-xs">1 hour</SelectItem>
                        <SelectItem value="custom" className="text-xs">Custom...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newProdActivationTime === "custom" && (
                    <div className="sm:col-span-3 space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-slate-650">Custom Time</Label>
                      <Input
                        className="h-9 text-xs rounded-xl border-2 border-[#E8B968] bg-white text-slate-800 font-bold focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#0E8A4B]"
                        value={customActivationTime}
                        onChange={(e) => setCustomActivationTime(e.target.value)}
                        placeholder="e.g. 2 hours"
                      />
                    </div>
                  )}
                  <div className="sm:col-span-1 flex justify-end">
                    <Button
                      size="sm"
                      className="h-9 w-full bg-[#0E8A4B] border-2 border-[#0A6E3C] shadow-[0_2px_0_0_#073D22] hover:bg-[#0A6E3C] text-white rounded-xl font-bold active:translate-y-0.5 active:shadow-[0_1px_0_0_#073D22]"
                      onClick={handleAddProduct}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tone & AI Analytics */}
        <div className="space-y-6">
          <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-5 space-y-4">
            <h4 className="text-[13px] font-black uppercase tracking-wider text-muted-foreground">Tone & Script Style</h4>
            <div className="space-y-3">
              {[
                { value: "friendly", label: "Friendly 🙂", desc: "Warm, helper tone with emojis" },
                { value: "professional", label: "Professional 💼", desc: "Polished and structured" },
                { value: "casual", label: "Casual 👋", desc: "Chill and conversational" },
                { value: "urgent_sales", label: "Urgent sales 🔥", desc: "Pushes heavily for EOD closing" }
              ].map((toneOpt) => (
                <button
                  key={toneOpt.value}
                  type="button"
                  onClick={() => set("tone", toneOpt.value as any)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border-2 transition-all flex flex-col gap-0.5",
                    form.tone === toneOpt.value
                      ? "border-primary bg-primary-soft/40 shadow-sm"
                      : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  <p className="text-[12.5px] font-bold">{toneOpt.label}</p>
                  <p className="text-[10px] text-muted-foreground">{toneOpt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#FFF6E8] to-[#FFE8B8] border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <h4 className="text-[13px] font-black text-[#3D1A00] uppercase">Smart Agent Qualify</h4>
            </div>
            <p className="text-[11px] text-foreground/85 leading-relaxed">
              Addison AI is qualifiers based. It intercepts incoming WhatsApp questions, matches them to your storefront products, and generates custom UPI QR codes to close deals instantly without human help.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
