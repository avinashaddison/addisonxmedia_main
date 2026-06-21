import { useEffect, useState, useMemo } from "react";
import {
  Phone, Mail, Tag, StickyNote, X, Flame, Snowflake, CircleDot,
  Save, Trophy, Plus, Loader2, Globe, Bell, IndianRupee,
  MessageCircle, Instagram, Link2, Facebook, Send, Settings as SettingsIcon, ExternalLink,
  Package, Sparkles, Brain, Cpu, Database, Shield, Activity,
  QrCode, CheckCircle2, Smartphone, Info, Edit3,
} from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import { SendProductDialog, type ProductDeliveryPayload } from "./SendProductDialog";
import { encodeProductDelivery } from "./ProductDeliveryCard";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Contact, ConversationWithContact, initialsFor, formatRelative } from "@/lib/inbox-types";
import type { Deal, Task } from "@/lib/api-types";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  contact: Contact;
  conversation?: ConversationWithContact | null;
  conversationId?: string;
  onClose?: () => void;
};

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const productDetailsTemplate = (
  p: any,
  isReseller: boolean,
  contactName: string
) => {
  let priceInr = p.price;
  let priceUsd = p.priceUsd || p.price_usd;

  if (isReseller) {
    priceInr = p.resellerPrice || p.reseller_price || p.price;
    priceUsd = p.resellerPriceUsd || p.reseller_price_usd || p.priceUsd || p.price_usd;
  }

  let priceStr = `₹${priceInr.toLocaleString("en-IN")}`;
  if (priceUsd && Number(priceUsd) > 0) {
    priceStr += ` ($${priceUsd})`;
  }

  let text = `🔥 *${p.name.toUpperCase()}*\n\n`;
  if (p.description) {
    text += `${p.description}\n\n`;
  }
  text += `⚡ *Activation time:* ${p.activationTime || p.activation_time || "10 min"}\n` +
          `⏳ *Validity:* ${p.validity || "1 Month"}\n` +
          `📧 *Activation mail:* ${p.activationMail || p.activation_mail || "On your Mail"}\n` +
          `💰 *Price:* *${priceStr}*\n\n` +
          `👉 *Please Check and Confirm to buy*`;
  return text;
};

const allProductsListTemplate = (products: any[], isReseller: boolean) => {
  let listText = "";
  products.forEach((p) => {
    let priceInr = p.price;
    let priceUsd = p.priceUsd || p.price_usd;

    if (isReseller) {
      priceInr = p.resellerPrice || p.reseller_price || p.price;
      priceUsd = p.resellerPriceUsd || p.reseller_price_usd || p.priceUsd || p.price_usd;
    }

    let priceStr = `₹${priceInr.toLocaleString("en-IN")}`;
    if (priceUsd && Number(priceUsd) > 0) {
      priceStr += ` ($${priceUsd})`;
    }

    const valText = p.validity.toLowerCase() === "monthly" ? "month" : p.validity.toLowerCase() === "yearly" ? "year" : p.validity.toLowerCase();
    listText += `• ${p.name} — ${priceStr}/${valText}\n`;
  });
  
  return `available tools 👇\n\n` +
         `${listText}\n` +
         `jo chahiye uska naam bhej do 🙂`;
};

export const LeadPanel = ({ contact, conversation: propConversation, conversationId, onClose }: Props) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const initials = initialsFor(contact.name);
  const isMarketingAgent = contact.phone === "system_marketing";

  const { data: adsConnection } = useQuery({
    queryKey: ["ads-connection", user?.id],
    enabled: !!user && isMarketingAgent,
    queryFn: () => api.getAdsConnection(),
  });

  // Editable fields — start from server state, persist on save
  const [tag, setTag] = useState<Contact["tag"]>(contact.tag);
  const [score, setScore] = useState(contact.score);
  const [notes, setNotes] = useState(contact.notes ?? "");
  const [isReseller, setIsReseller] = useState(contact.is_reseller ?? false);
  const [saving, setSaving] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [sendingProductIdx, setSendingProductIdx] = useState<number | null>(null);
  const [sendingAll, setSendingAll] = useState(false);
  const [prefillProduct, setPrefillProduct] = useState<{ name: string; price?: number } | null>(null);

  // Fetch agents to display products
  const { data: agents = [] } = useQuery({
    queryKey: ["ai-agents"],
    queryFn: () => api.listAgents(),
  });
  const activeAgent = agents.find((a) => a.is_active) || agents[0];

  // ── Top-level tab state — "Leads" view (default) or "Digital Product"
  //    delivery view. Both tabs sit above the contact details. The Digital
  //    Product tab replaces the old composer-bar 'Send Product' button — same
  //    SendProductDialog, just sourced from here so the chat composer stays
  //    focused on messaging actions only.
  const [activeTab, setActiveTab] = useState<"leads" | "product" | "payment">("leads");

  const handleSendProductDetails = async (p: any, idx: number) => {
    if (!conversationId) return;
    setSendingProductIdx(idx);
    try {
      const first = contact.name.split(/\s+/)[0] || contact.name;
      const body = productDetailsTemplate(p, !!contact.is_reseller, first);
      
      const payload: Record<string, any> = {
        body,
        direction: "outbound",
        status: "sent",
      };

      if (p.imageUrl) {
        payload.media_url = p.imageUrl;
        payload.media_type = "image";
      }

      await api.sendMessage(conversationId, payload);
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      toast.success(`${p.name} details sent ✨`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSendingProductIdx(null);
    }
  };

  const handleSendAllProducts = async () => {
    if (!conversationId || !activeAgent?.products?.length) return;
    setSendingAll(true);
    try {
      const body = allProductsListTemplate(activeAgent.products, !!contact.is_reseller);
      await api.sendMessage(conversationId, { body, direction: "outbound", status: "sent" });
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Products list sent ✨");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send list");
    } finally {
      setSendingAll(false);
    }
  };

  const handleDeliverProduct = async (payload: ProductDeliveryPayload, autoCloseDeal: boolean) => {
    if (!conversationId) {
      toast.error("Open a conversation first to deliver a product");
      return;
    }
    try {
      await api.sendMessage(conversationId, {
        body: encodeProductDelivery(payload),
        direction: "outbound",
        status: "sent",
      });
      toast.success(`${payload.productName} delivered to ${contact.name}`);
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });

      if (autoCloseDeal) {
        try {
          const all = await api.listDeals();
          const open = all.filter(
            (d: Deal) => d.conversation_id === conversationId && d.stage !== "won" && d.stage !== "lost"
          );
          await Promise.all(
            open.map((d: Deal) =>
              api.updateDeal(d.id, {
                stage: "won",
                probability: 100,
                closed_at: new Date().toISOString(),
              })
            )
          );
          if (open.length > 0) {
            toast.success(`${open.length} deal${open.length > 1 ? "s" : ""} marked as won 🎉`);
            qc.invalidateQueries({ queryKey: ["deals"] });
          }
        } catch (e) {
          console.error("Auto-close failed", e);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to deliver product");
    }
  };

  // Reset editor state when switching contacts
  useEffect(() => {
    setTag(contact.tag);
    setScore(contact.score);
    setNotes(contact.notes ?? "");
    setIsReseller(contact.is_reseller ?? false);
  }, [contact.id, contact.tag, contact.score, contact.notes, contact.is_reseller]);

  const dirty = tag !== contact.tag || score !== contact.score || (notes ?? "") !== (contact.notes ?? "") || isReseller !== (contact.is_reseller ?? false);

  // Real deals + tasks for this specific contact
  const { data: contactDeals = [] } = useQuery({
    queryKey: ["deals", "contact", contact.id],
    enabled: !!user && !!contact.id,
    queryFn: () => api.listDeals({ contact_id: contact.id }) as Promise<Deal[]>,
  });
  const { data: contactTasks = [] } = useQuery({
    queryKey: ["tasks", "contact", contact.id],
    enabled: !!user && !!contact.id,
    queryFn: () => api.listTasks({ contact_id: contact.id }) as Promise<(Task & { contact?: Contact | null })[]>,
  });

  // Fallback query if propConversation is not provided (though it is passed from InboxPage)
  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: () => api.listConversations(),
    enabled: !propConversation && !!conversationId && !!user,
  });
  const conversation = propConversation ?? conversations.find((c: any) => c.id === conversationId);

  const [agentToggling, setAgentToggling] = useState(false);

  const handleToggleAgentMode = async () => {
    if (!conversationId || agentToggling) return;
    const current = conversation?.agent_mode ?? false;
    const next = !current;
    setAgentToggling(true);
    try {
      await api.toggleAgentMode(conversationId, next);
      qc.invalidateQueries({ queryKey: ["conversations"] });
      toast.success(next ? "🤖 Agent ON — AI will auto-reply" : "Agent OFF");
    } catch (e) {
      toast.error("Failed to toggle agent mode");
    } finally {
      setAgentToggling(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateContact(contact.id, {
        tag,
        score,
        notes: notes.trim() || null,
        is_reseller: isReseller,
      });
      toast.success("Lead updated");
      // Invalidate both contacts (for the inbox list) and conversations (for the joined contact)
      qc.invalidateQueries({ queryKey: ["contacts-page"] });
      qc.invalidateQueries({ queryKey: ["contacts-lookup"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskSaving, setTaskSaving] = useState(false);

  const handleAddTask = () => {
    setTaskTitle("");
    setTaskOpen(true);
  };

  const submitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = taskTitle.trim();
    if (!title) { toast.error("Task likhna zaroori hai"); return; }
    setTaskSaving(true);
    try {
      await api.createTask({
        contact_id: contact.id,
        title,
        priority: tag === "hot" ? "high" : "medium",
        status: "pending",
        due_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      });
      toast.success("Follow-up added");
      qc.invalidateQueries({ queryKey: ["tasks", user?.id] });
      setTaskOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setTaskSaving(false);
    }
  };

  return (
    <div className={cn(
      "w-full lg:w-[340px] h-full flex flex-col flex-shrink-0 overflow-hidden transition-all duration-300",
      isMarketingAgent 
        ? "bg-slate-950 border-l-2 border-violet-900/50" 
        : "bg-white border-l-2 border-[#E8B968]"
    )}>
      {/* Header */}
      <div className={cn(
        "h-16 flex items-center justify-between px-4 border-b-2 flex-shrink-0 transition-all duration-300",
        isMarketingAgent
          ? "border-violet-900/50 bg-slate-900 text-slate-50"
          : "border-[#E8B968] bg-[#FFF6E8] text-foreground"
      )}>
        <div className="flex items-center gap-2 min-w-0">
          {isMarketingAgent ? (
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-violet-400" />
              <h3 className="text-[14px] font-black tracking-tight truncate text-slate-100">
                Marketing AI Agent
              </h3>
            </div>
          ) : (
            <h3 className="text-[14px] font-black tracking-tight truncate">
              {activeTab === "leads" ? "Lead ki details" : "Digital product"}
            </h3>
          )}
          {/* Cool UI Toggle for Agent Mode */}
          {conversationId && activeTab === "leads" && !isMarketingAgent && (
            <div className="flex items-center gap-1.5 bg-white border border-[#E8B968] rounded-full px-2 py-0.5 shadow-sm scale-90 flex-shrink-0">
              <span className="text-[9px] font-black uppercase text-foreground/75 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5 text-[#0E8A4B]" />
                AI
              </span>
              <button
                onClick={handleToggleAgentMode}
                disabled={agentToggling}
                className={cn(
                  "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  conversation?.agent_mode ? "bg-[#0E8A4B]" : "bg-gray-200"
                )}
                title={conversation?.agent_mode ? "Agent Mode is ON (AI auto-replies)" : "Agent Mode is OFF"}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                    conversation?.agent_mode ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition",
              isMarketingAgent
                ? "hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                : "hover:bg-[#FFE8C7] text-foreground/60 hover:text-foreground"
            )}
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tab segmented control */}
      {!isMarketingAgent && (
        <div className="flex-shrink-0 px-3 pt-3 pb-2 border-b border-[#E8B968]/40 bg-[#FFF6E8]/40">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968]">
            {([
              { id: "leads" as const,   label: "Leads",    Icon: Tag },
              { id: "product" as const, label: "Products", Icon: Package },
              { id: "payment" as const, label: "Payment",  Icon: IndianRupee },
            ]).map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    "h-8 px-1 rounded-lg flex items-center justify-center gap-1 text-[11px] font-extrabold uppercase tracking-wider transition-all truncate",
                    active
                      ? "bg-[#FF6A1F] text-white shadow-[0_2px_0_0_#B8420A]"
                      : "text-foreground/55 hover:bg-[#FFF1D6] hover:text-foreground"
                  )}
                >
                  <t.Icon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2.5} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isMarketingAgent ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-300 bg-slate-950 font-sans">
          {/* Agent Hero card */}
          <div className="rounded-2xl bg-gradient-to-br from-violet-900/80 via-indigo-950 to-purple-950/80 text-white p-4 shadow-lg border border-violet-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-start gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center shadow-lg flex-shrink-0">
                <Brain className="w-6 h-6 text-violet-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-violet-400">
                  Senior Marketing Manager
                </p>
                <h4 className="text-[15px] font-black leading-tight text-white flex items-center gap-1.5">
                  Addison AI
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ACTIVE
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">system_marketing</p>
              </div>
            </div>
            <p className="text-[11.5px] text-slate-300 leading-snug">
              Audits and controls campaigns using Meta Ads & CRM sentiment tools to maximize ROAS.
            </p>
          </div>

          {/* Connected Integrations Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 space-y-3 shadow-inner">
            <h5 className="text-[10px] uppercase tracking-wider font-extrabold text-violet-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-violet-400" /> Connected Channels
            </h5>

            <div className="space-y-2">
              {/* Meta Ads Integration */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-2.5 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-200">Meta Ads Manager</span>
                  {adsConnection?.connected ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                      Connected
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded">
                      Sandbox Mode
                    </span>
                  )}
                </div>
                {adsConnection?.connected ? (
                  <div className="text-[10px] text-slate-400 space-y-0.5 font-mono">
                    <p className="truncate"><span className="text-slate-500">Account:</span> {adsConnection.ad_account_name}</p>
                    <p><span className="text-slate-500">ID:</span> {adsConnection.ad_account_id}</p>
                    <p><span className="text-slate-500">Currency:</span> {adsConnection.ad_account_currency ?? "INR"}</p>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic font-medium leading-normal">
                    Using mock campaign data. Go to Settings to connect live Meta Ads.
                  </p>
                )}
              </div>

              {/* CRM Database Integration */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] font-extrabold text-slate-200">CRM Database</span>
                  <span className="text-[9.5px] text-slate-500">WhatsApp chat histories</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded flex-shrink-0">
                  Authorized
                </span>
              </div>
            </div>
          </div>

          {/* Quick-Prompt Shortcut Actions */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 space-y-3 shadow-inner">
            <h5 className="text-[10px] uppercase tracking-wider font-extrabold text-violet-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-violet-400" /> Quick Ask & Action
            </h5>
            <p className="text-[10px] text-slate-400 leading-normal">
              Click a shortcut below to automatically prepare the query command in your chat input.
            </p>

            <div className="flex flex-col gap-2">
              {[
                { label: "📊 List My Campaigns", cmd: "list my campaigns" },
                { label: "🔍 Run Ads Audit", cmd: "run ads audit" },
                { label: "💬 Analyze CRM Customer Chats", cmd: "analyze customer chats and concerns" },
                { label: "💰 Suggest Budget Adjustments", cmd: "suggest budget adjustments for meta campaigns" }
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const event = new CustomEvent("insert-chat-input", { detail: { text: item.cmd } });
                    window.dispatchEvent(event);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-violet-500/30 text-[11.5px] font-extrabold text-slate-200 transition duration-200 flex items-center justify-between group shadow-sm hover:translate-y-[-1px]"
                >
                  <span>{item.label}</span>
                  <span className="text-[10px] text-slate-500 group-hover:text-violet-400 font-mono transition-colors">&gt;&gt;</span>
                </button>
              ))}
            </div>
          </div>

          {/* Safety Settings Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3 space-y-2">
            <h5 className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-400" /> Safety & Governance
            </h5>
            <div className="text-[10px] text-slate-400 leading-relaxed space-y-1 bg-slate-950/40 p-2 rounded-lg border border-slate-900">
              <div className="flex justify-between"><span className="text-slate-500">Max Budget Delta:</span> <span className="font-mono text-slate-300">₹10,000</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Execution Mode:</span> <span className="text-emerald-400 font-semibold">Immediate</span></div>
              <p className="text-[9.5px] text-slate-500 mt-1 leading-normal">
                Commands modifying daily campaign budgets above ₹10,000 will request secondary confirmation text before executing.
              </p>
            </div>
          </div>

          {/* Footer configuration redirect */}
          <div className="text-center pt-2">
            <RouterLink
              to="/app/settings"
              className="inline-flex items-center gap-1 text-[11px] font-extrabold text-violet-400 hover:text-violet-300 hover:underline"
            >
              <SettingsIcon className="w-3 h-3" /> Meta credentials settings page
            </RouterLink>
          </div>
        </div>
      ) : (
        <>
          {activeTab === "leads" && (
            <div className="flex-1 overflow-y-auto">
              {/* Profile + contact info */}
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center text-sm font-extrabold flex-shrink-0 text-white shadow-md",
              contact.tag === "hot" ? "bg-[#D4308E]" :
              contact.tag === "warm" ? "bg-[#FF6A1F]" :
              "bg-[#3C50E0]"
            )}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-[15px] font-black truncate">{contact.name}</h4>
              <p className="text-[11px] text-foreground/60 font-mono truncate font-medium">{contact.phone}</p>
              <p className="text-[10px] text-foreground/50 mt-0.5 font-medium">
                Added {formatRelative(contact.created_at)}
              </p>
            </div>
          </div>

          {/* Editable: temperature tag */}
          <div className="mb-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#B8651A] mb-1.5">Temperature</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(["hot", "warm", "cold"] as const).map((t) => {
                const active = tag === t;
                const Icon = t === "hot" ? Flame : t === "warm" ? CircleDot : Snowflake;
                const colors = {
                  hot: { active: "bg-[#D4308E] text-white shadow-[0_2px_0_0_#A11A6A]", inactive: "bg-[#FCE5F0] text-[#D4308E] border-[#D4308E]/30" },
                  warm: { active: "bg-[#FF6A1F] text-white shadow-[0_2px_0_0_#B8420A]", inactive: "bg-[#FFEFE0] text-[#FF6A1F] border-[#FF6A1F]/30" },
                  cold: { active: "bg-[#3C50E0] text-white shadow-[0_2px_0_0_#2533A8]", inactive: "bg-[#E4E8FF] text-[#3C50E0] border-[#3C50E0]/30" },
                }[t];
                return (
                  <button
                    key={t}
                    onClick={() => setTag(t)}
                    className={cn(
                      "h-9 rounded-xl flex items-center justify-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider transition-all border-2",
                      active ? `${colors.active} border-transparent` : `${colors.inactive} hover:scale-105`
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Editable: reseller tag */}
          <div className="mb-3 flex items-center justify-between bg-[#FFF6E8]/30 p-2.5 rounded-xl border-2 border-dashed border-[#E8B968]/70">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A]">Reseller Account</p>
              <p className="text-[9.5px] text-foreground/60 mt-0.5 leading-snug">Set this contact as a reseller to apply reseller pricing</p>
            </div>
            <button
              onClick={() => setIsReseller(!isReseller)}
              className={cn(
                "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                isReseller ? "bg-[#0E8A4B]" : "bg-gray-200"
              )}
              title={isReseller ? "Reseller pricing enabled" : "Standard pricing active"}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                  isReseller ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {/* Editable: score */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lead score</p>
              <span className={cn(
                "text-[12px] font-bold tabular-nums",
                score >= 80 ? "text-hot" : score >= 50 ? "text-warning" : "text-muted-foreground"
              )}>
                {score}/100
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="w-full accent-primary"
              aria-label="Lead score"
            />
            <div className="flex justify-between text-[9px] font-bold text-muted-foreground/70 uppercase tracking-wider mt-0.5">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>



          {/* Save button — only shown when something changed */}
          {(dirty || saving) && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-9 rounded-lg flex items-center justify-center gap-1.5 text-[12px] font-bold transition-all bg-primary text-primary-foreground hover:bg-primary-glow shadow-sm shadow-primary/20"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? "Saving…" : "Save changes"}
            </button>
          )}
        </div>


        {/* Quick share — workspace public links sent via WhatsApp with one click */}
        {conversationId && (
          <QuickShareSection contactName={contact.name} conversationId={conversationId} />
        )}

        {/* Lead info */}
        <div className="px-4 py-3 border-t border-border space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Contact info</h4>
          <div className="flex items-center gap-2.5">
            <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <a href={`tel:${contact.phone}`} className="text-[12px] font-mono hover:text-primary truncate">
              {contact.phone}
            </a>
          </div>
          {contact.email && (
            <div className="flex items-center gap-2.5">
              <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <a href={`mailto:${contact.email}`} className="text-[12px] hover:text-primary truncate">
                {contact.email}
              </a>
            </div>
          )}
          {contact.source && (
            <div className="flex items-center gap-2.5">
              <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-[12px]">Source: <span className="font-medium">{contact.source}</span></span>
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <Tag className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-[12px] capitalize">{contact.tag} lead</span>
          </div>
        </div>

        {/* Meta Ad Referral */}
        {conversation?.source_headline && (
          <div className="px-4 py-3 border-t border-border space-y-2 bg-[#FFF1D6]/30">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#B8651A] flex items-center gap-1 mb-1.5">
              🎯 Meta Ad Referral
            </h4>
            <div className="rounded-lg border border-[#E8B968]/50 bg-white p-2.5 space-y-1.5">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground/55 font-medium">Ad Headline</p>
                <p className="text-[12px] font-extrabold text-[#B8420A] leading-snug">"{conversation.source_headline}"</p>
              </div>
              {conversation.source_type && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-foreground/55 font-medium">Ad Type</p>
                  <p className="text-[11px] font-bold capitalize">{conversation.source_type.replace(/_/g, " ").toLowerCase()}</p>
                </div>
              )}
              {conversation.source_ad_id && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-foreground/55 font-medium">Meta Ad ID</p>
                  <p className="text-[10.5px] font-mono text-foreground/60 select-all">{conversation.source_ad_id}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Real deals for this contact */}
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Trophy className="w-3 h-3" /> Deals ({contactDeals.length})
            </h4>
          </div>
          {contactDeals.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic">No deals yet for this contact.</p>
          ) : (
            <ul className="space-y-1.5">
              {contactDeals.slice(0, 5).map((d) => (
                <li key={d.id} className="rounded-lg border border-border bg-card p-2.5">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-[12px] font-semibold truncate">{d.title}</p>
                    <span className="text-[11px] font-bold tabular-nums text-foreground flex-shrink-0">
                      {formatINR(Number(d.value))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="capitalize font-semibold">{d.stage}</span>
                    <span>{formatRelative(d.updated_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Real tasks for this contact + quick add */}
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Follow-ups ({contactTasks.length})
            </h4>
            <button
              onClick={handleAddTask}
              className="text-[10px] font-bold text-primary hover:text-primary-glow flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          {contactTasks.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic">No follow-ups for this contact yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {contactTasks.slice(0, 5).map((t) => {
                const overdue = t.due_at && new Date(t.due_at).getTime() < Date.now() && t.status === "pending";
                return (
                  <li
                    key={t.id}
                    className={cn(
                      "rounded-lg border p-2.5",
                      overdue ? "border-destructive/30 bg-destructive/5" : "border-border bg-card",
                      t.status === "completed" && "opacity-60"
                    )}
                  >
                    <p className={cn(
                      "text-[12px] font-semibold leading-tight",
                      t.status === "completed" && "line-through"
                    )}>
                      {t.title}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                      <span className="capitalize">{t.status}</span>
                      <span className={cn(overdue && "text-destructive font-semibold")}>
                        {t.due_at ? (overdue ? "Overdue · " : "Due ") + formatRelative(t.due_at) : "no due date"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      )}

      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#D4308E] to-[#A11A6A] text-white flex items-center justify-center shadow-md">
                <Bell className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <div>
                <DialogTitle>Naya follow-up</DialogTitle>
                <DialogDescription className="text-foreground/70 font-medium">
                  {contact.name} ke liye · default due: kal
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={submitTask} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="task-title">Task kya hai?</Label>
              <Input
                id="task-title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Pricing share karein"
                autoFocus
                autoComplete="off"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={() => setTaskOpen(false)} disabled={taskSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={taskSaving}>
                {taskSaving ? "Add ho raha hai…" : "Add karein"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>


      {/* ── Tab 3: Payments & Requests ─────────────────────────── */}
      {activeTab === "payment" && (
        <div className="flex-1 overflow-y-auto">
          <PaymentTabPanel
            contact={contact}
            conversationId={conversationId}
            activeAgent={activeAgent}
          />
        </div>
      )}

      {/* ── Tab 2: Digital Product Delivery ─────────────────────────── */}
      {activeTab === "product" && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
          {/* Hero card */}
          <div className="rounded-2xl bg-gradient-to-br from-[#7E22CE] via-[#9333EA] to-[#A855F7] text-white p-4 shadow-[0_4px_0_0_#5B189E]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shadow-md">
                <Package className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-white/80">
                  Digital product delivery
                </p>
                <p className="text-[13px] font-black leading-tight">
                  Send to {contact.name}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-white/85 font-medium leading-snug">
              Deliver a course link, e-book, software license, or download. Auto-marks the deal won when delivered.
            </p>
          </div>

          {/* Primary action */}
          <button
            onClick={() => {
              setPrefillProduct(null);
              setProductOpen(true);
            }}
            disabled={!conversationId}
            className="w-full h-12 rounded-xl bg-gradient-to-br from-[#FF6A1F] to-[#E85C12] text-white font-extrabold text-[13px] flex items-center justify-center gap-2 shadow-[0_4px_0_0_#B8420A] hover:shadow-[0_2px_0_0_#B8420A] hover:translate-y-[2px] active:translate-y-[3px] disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Sparkles className="w-4 h-4" strokeWidth={2.5} />
            Send digital product
          </button>
          {!conversationId && (
            <p className="text-[10px] text-foreground/55 font-medium text-center italic">
              Open a conversation first to enable delivery
            </p>
          )}

          {/* Products List from Active Agent */}
          {activeAgent && activeAgent.products && activeAgent.products.length > 0 && (
            <div className="rounded-xl border-2 border-[#E8B968] bg-[#FFF6E8]/20 p-3 space-y-3 shadow-[0_2px_0_0_#E8B968]">
              <div className="flex items-center justify-between border-b border-[#E8B968]/35 pb-2">
                <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#B8651A] flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-[#FF6A1F]" /> Product Management
                </p>
                <button
                  onClick={handleSendAllProducts}
                  disabled={sendingAll || !conversationId}
                  className="text-[10px] font-extrabold text-[#FF6A1F] hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  {sendingAll ? "Sending..." : "Send All List 📋"}
                </button>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {activeAgent.products.map((p: any, idx: number) => {
                  const isSendingThis = sendingProductIdx === idx;
                  return (
                    <div key={idx} className="bg-white border border-[#E8B968]/45 rounded-xl p-2.5 flex flex-col gap-1.5 hover:border-[#FF6A1F]/30 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {p.imageUrl && (
                          <img src={p.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-[#E8B968]/20" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[11.5px] font-black truncate text-foreground">{p.name}</p>
                          {p.description && (
                            <p className="text-[10px] text-muted-foreground truncate leading-none mb-0.5">{p.description}</p>
                          )}
                          <p className="text-[9.5px] text-foreground/60 font-bold">
                            ₹{p.price.toLocaleString("en-IN")} · {p.validity}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendProductDetails(p, idx)}
                          disabled={isSendingThis || !conversationId}
                          className="flex-1 h-7 text-[10px] font-extrabold border-[#E8B968] hover:bg-[#FFE8C7] transition"
                        >
                          {isSendingThis ? "Sending..." : "Send Details"}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setPrefillProduct({ name: p.name, price: p.price });
                            setProductOpen(true);
                          }}
                          disabled={!conversationId}
                          className="flex-1 h-7 text-[10px] font-extrabold bg-[#FF6A1F] hover:bg-[#E85C12] text-white transition border-0 shadow-sm"
                        >
                          Deliver Product
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Supported types */}
          <div className="rounded-xl bg-[#FFF1D6] border-2 border-[#E8B968] p-3">
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#B8651A] mb-2">
              Supported delivery types
            </p>
            <ul className="space-y-1.5 text-[11px] text-foreground/80 font-medium">
              <li className="flex items-start gap-1.5">
                <span className="text-[#0E8A4B] font-extrabold">✓</span>
                <span><strong>Course / video link</strong> — Vimeo, YouTube, your hosted course</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#0E8A4B] font-extrabold">✓</span>
                <span><strong>E-book / PDF</strong> — direct download link or Drive share</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#0E8A4B] font-extrabold">✓</span>
                <span><strong>Software license key</strong> — copy-paste a serial or activation</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#0E8A4B] font-extrabold">✓</span>
                <span><strong>Membership / portal access</strong> — login URL + temporary password</span>
              </li>
            </ul>
          </div>

          {/* How it works */}
          <div className="rounded-xl bg-[#E4E8FF] border-2 border-[#3C50E0]/30 p-3">
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#3C50E0] mb-1.5">
              How delivery works
            </p>
            <ol className="space-y-1 text-[11px] text-foreground/80 font-medium list-decimal pl-4">
              <li>Click <strong>Send digital product</strong> above</li>
              <li>Fill product name, link/key, and price</li>
              <li>Optional: toggle <strong>auto-mark deal won</strong></li>
              <li>Customer receives a polished card in WhatsApp with the link</li>
              <li>Deal auto-closes · CAPI fires Purchase event to Meta</li>
            </ol>
          </div>
        </div>
      </div>
      )}
      </>
    )}

      {/* Send Product dialog (same as the chat composer used to host) */}
      <SendProductDialog
        open={productOpen}
        onOpenChange={setProductOpen}
        contactName={contact.name}
        onDeliver={handleDeliverProduct}
        prefillProduct={prefillProduct}
      />
    </div>
  );
};

// ─── Quick share workspace links ─────────────────────────────────────────────
//
// Reads the workspace's public links from /api/profile (community, instagram,
// website, facebook) and renders a button per configured link. Click → sends
// a Hinglish-templated WhatsApp message with the link.
// If the link isn't set up yet, shows a "Setup in Settings" CTA instead of
// hiding the section, so users discover the feature.

type LinkKey = "community" | "instagram" | "website" | "facebook";

// Per-link visual styling. Tones match each platform's brand.
const LINK_META: Record<LinkKey, {
  label: string;
  icon: typeof MessageCircle;
  bg: string;
  hoverBg: string;
  shadow: string;
  template: (name: string, link: string) => string;
}> = {
  community: {
    label: "WhatsApp Community",
    icon: MessageCircle,
    bg: "from-[#0E8A4B] to-[#0A6E3C]",
    hoverBg: "hover:from-[#0A6E3C] hover:to-[#075A30]",
    shadow: "shadow-[0_3px_0_0_#075A30]",
    template: (name, link) =>
      `🎉 *Hamari WhatsApp Community mein join karein*\n\nHi ${name}! Exclusive offers, daily tips aur direct support ke liye yahan click karein:\n\n👉 ${link}`,
  },
  instagram: {
    label: "Instagram",
    icon: Instagram,
    bg: "from-[#D4308E] to-[#A11A6A]",
    hoverBg: "hover:from-[#A11A6A] hover:to-[#7A1052]",
    shadow: "shadow-[0_3px_0_0_#7A1052]",
    template: (name, link) =>
      `📸 *Instagram pe follow karein*\n\nHi ${name}! Latest updates, behind-the-scenes aur customer stories yahan dekhein:\n\n👉 ${link}`,
  },
  website: {
    label: "Website",
    icon: Link2,
    bg: "from-[#3C50E0] to-[#2533A8]",
    hoverBg: "hover:from-[#2533A8] hover:to-[#1A2380]",
    shadow: "shadow-[0_3px_0_0_#1A2380]",
    template: (name, link) =>
      `🌐 *Hamari website*\n\nHi ${name}! Saare products aur services yahan dekh sakte hain:\n\n👉 ${link}`,
  },
  facebook: {
    label: "Facebook",
    icon: Facebook,
    bg: "from-[#1877F2] to-[#0E5BC0]",
    hoverBg: "hover:from-[#0E5BC0] hover:to-[#0A4490]",
    shadow: "shadow-[0_3px_0_0_#0A4490]",
    template: (name, link) =>
      `👍 *Facebook page*\n\nHi ${name}! Updates aur community ke liye Facebook pe join karein:\n\n👉 ${link}`,
  },
};

const QuickShareSection = ({ contactName, conversationId }: { contactName: string; conversationId: string }) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: () => api.getProfile(),
    staleTime: 60_000,
  });
  const [sending, setSending] = useState<LinkKey | null>(null);

  const links: { key: LinkKey; url: string | null }[] = [
    { key: "community", url: profile?.whatsapp_community_url ?? null },
    { key: "instagram", url: profile?.instagram_url ?? null },
    { key: "website",   url: profile?.website_url ?? null },
    { key: "facebook",  url: profile?.facebook_url ?? null },
  ];
  const configured = links.filter((l) => !!l.url);
  const allEmpty = configured.length === 0;

  const handleSend = async (key: LinkKey, url: string) => {
    setSending(key);
    try {
      const body = LINK_META[key].template(contactName.split(/\s+/)[0] || contactName, url);
      await api.sendMessage(conversationId, { body, direction: "outbound", status: "sent" });
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      toast.success(`${LINK_META[key].label} link sent ✨`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(null);
    }
  };

  const renderButton = (key: LinkKey) => {
    const linkObj = links.find((l) => l.key === key);
    if (!linkObj) return null;
    const { url } = linkObj;
    const meta = LINK_META[key];
    const Icon = meta.icon;
    const isSending = sending === key;

    if (!url) {
      return (
        <div
          key={key}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-dashed border-border bg-muted/20 opacity-60 h-10"
          title={`${meta.label} not configured`}
        >
          <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="flex-1 text-[11px] font-semibold truncate">{meta.label}</span>
          <RouterLink
            to="/app/settings"
            className="text-[10px] font-bold text-primary hover:underline flex-shrink-0"
          >
            Setup
          </RouterLink>
        </div>
      );
    }

    return (
      <button
        key={key}
        onClick={() => handleSend(key, url)}
        disabled={isSending || !!sending}
        className={cn(
          "w-full h-10 rounded-lg flex items-center gap-2 px-2.5 text-white text-[12px] font-extrabold bg-gradient-to-br transition-all hover:translate-y-[1px] disabled:opacity-70 disabled:cursor-not-allowed",
          meta.bg, meta.hoverBg, meta.shadow
        )}
        title={`Send ${meta.label} link to ${contactName}`}
      >
        {isSending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
        ) : (
          <Icon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2.5} />
        )}
        <span className="flex-1 text-left truncate">
          {isSending ? "Sending…" : `Send ${meta.label}`}
        </span>
        <Send className="w-3 h-3 flex-shrink-0 opacity-80" />
      </button>
    );
  };

  return (
    <div className="px-4 py-3 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <Send className="w-3 h-3" /> Quick share
        </h4>
        <RouterLink
          to="/app/settings"
          className="text-[10px] font-bold text-primary hover:text-primary-glow flex items-center gap-0.5"
        >
          <SettingsIcon className="w-3 h-3" /> Setup
        </RouterLink>
      </div>

      {isLoading ? (
        <div className="h-20 rounded-lg bg-muted/30 animate-pulse" />
      ) : allEmpty ? (
        <div className="rounded-xl border-2 border-dashed border-[#E8B968] bg-[#FFF6E8] px-3 py-3 text-center">
          <p className="text-[11.5px] font-semibold leading-snug">
            Apne links setup karein — fir ek click mein customer ko bhejein
          </p>
          <RouterLink
            to="/app/settings"
            className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-extrabold text-[#FF6A1F] hover:text-[#E85C12]"
          >
            <ExternalLink className="w-3 h-3" /> Settings mein add karein
          </RouterLink>
        </div>
      ) : (
        <div className="space-y-1.5">
          {renderButton("community")}
          <div className="grid grid-cols-2 gap-1.5">
            {renderButton("instagram")}
            {renderButton("website")}
          </div>
          {renderButton("facebook")}
        </div>
      )}
    </div>
  );
};

const PRESET_AMOUNTS = ["100", "500", "1000", "2500", "5000"] as const;

const PaymentTabPanel = ({
  contact,
  conversationId,
  activeAgent,
}: {
  contact: Contact;
  conversationId?: string;
  activeAgent?: any;
}) => {
  const qc = useQueryClient();
  const [payMethod, setPayMethod] = useState<"upi" | "binance">("upi");
  
  // UPI configuration query & states
  const cfgQ = useQuery({
    queryKey: ["upi-config"],
    queryFn: () => api.getUpiConfig(),
  });

  const [mode, setMode] = useState<"setup" | "request">("request");
  const [amount, setAmount] = useState("500");
  const [note, setNote] = useState("");
  
  // Setup form states
  const [vpaInput, setVpaInput] = useState("");
  const [displayNameInput, setDisplayNameInput] = useState("");

  const binanceId = activeAgent?.binance_id || "";
  const productsList = activeAgent?.products || [];
  const [selectedProductIdx, setSelectedProductIdx] = useState<string>("custom");
  const [sendingBinance, setSendingBinance] = useState(false);

  // Initialize/adjust mode based on UPI config state
  useEffect(() => {
    if (cfgQ.data && !cfgQ.data.configured) {
      setMode("setup");
      setVpaInput(cfgQ.data.vpa || "");
      setDisplayNameInput(cfgQ.data.display_name || "");
    } else {
      setMode("request");
    }
  }, [cfgQ.data]);

  const saveConfig = useMutation({
    mutationFn: () =>
      api.saveUpiConfig({
        vpa: vpaInput.trim(),
        display_name: displayNameInput.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["upi-config"] });
      toast.success("UPI ID saved");
      setMode("request");
    },
    onError: (e) => toast.error(String(e)),
  });

  const sendRequest = useMutation({
    mutationFn: () =>
      api.sendUpiPaymentRequest({
        conversation_id: conversationId || "",
        amount_inr: Number(amount),
        note: note.trim() || undefined,
      }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      toast.success(
        r.sent_live
          ? `Pay link bheja gaya · ${contact.name} ko WhatsApp pe`
          : `Pay link saved (dry-run · Meta connect karein to send live)`,
      );
      setNote("");
    },
    onError: (e) => toast.error(String(e)),
  });

  // Prefill amount when product selected
  useEffect(() => {
    if (selectedProductIdx === "custom") return;
    const pIdx = Number(selectedProductIdx);
    const p = productsList[pIdx];
    if (!p) return;

    if (payMethod === "upi") {
      let price = p.price;
      if (contact.is_reseller) {
        price = p.resellerPrice || p.reseller_price || p.price;
      }
      setAmount(String(price));
    } else {
      let priceUsd = p.priceUsd || p.price_usd;
      if (contact.is_reseller) {
        priceUsd = p.resellerPriceUsd || p.reseller_price_usd || p.priceUsd || p.price_usd;
      }
      setAmount(priceUsd ? String(priceUsd) : "");
    }
  }, [selectedProductIdx, payMethod, contact.is_reseller, productsList]);

  // Live preview logic for UPI link & QR code
  const previewUpiLink = useMemo(() => {
    if (!cfgQ.data?.vpa || !Number(amount)) return "";
    const params = new URLSearchParams({
      pa: cfgQ.data.vpa,
      pn: cfgQ.data.display_name || "Business",
      am: Number(amount).toFixed(2),
      tn: (note.trim() || `Payment to ${cfgQ.data.display_name || "Business"}`).slice(0, 40),
      cu: "INR",
    });
    return `upi://pay?${params.toString()}`;
  }, [cfgQ.data?.vpa, cfgQ.data?.display_name, amount, note]);

  const previewQrUrl = useMemo(() => {
    if (!previewUpiLink) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=4&data=${encodeURIComponent(previewUpiLink)}`;
  }, [previewUpiLink]);

  // Binance payment request text body
  const contactFirstName = contact.name.split(/\s+/)[0] || contact.name;
  const binanceMessageBody = `💳 *PAYMENT REQUEST (BINANCE)*\n\nHi ${contactFirstName}! Please make the payment of *$${amount || "0"}* (USDT) to our Binance Pay ID:\n\n👉 *Binance ID:* \`${binanceId || "Not Configured"}\`\n\nAfter making the payment, please share the screenshot here for instant activation. Thank you! 🙏`;

  const handleSendBinance = async () => {
    if (!conversationId) return;
    setSendingBinance(true);
    try {
      await api.sendMessage(conversationId, {
        body: binanceMessageBody,
        direction: "outbound",
        status: "sent",
      });
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Binance payment details shared directly in chat! ✨");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send Binance info");
    } finally {
      setSendingBinance(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Segmented Control */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968]">
        <button
          onClick={() => {
            setPayMethod("upi");
            setSelectedProductIdx("custom");
            setAmount("500");
          }}
          className={cn(
            "h-8 px-2 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider transition-all",
            payMethod === "upi"
              ? "bg-[#0E8A4B] text-white shadow-[0_2px_0_0_#075A30]"
              : "text-foreground/55 hover:bg-[#FFF1D6]"
          )}
        >
          🇮🇳 UPI (INR)
        </button>
        <button
          onClick={() => {
            setPayMethod("binance");
            setSelectedProductIdx("custom");
            setAmount("10");
          }}
          className={cn(
            "h-8 px-2 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider transition-all",
            payMethod === "binance"
              ? "bg-[#3C50E0] text-white shadow-[0_2px_0_0_#2533A8]"
              : "text-foreground/55 hover:bg-[#FFF1D6]"
          )}
        >
          🔶 Binance (USD)
        </button>
      </div>

      {payMethod === "upi" ? (
        cfgQ.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : mode === "setup" ? (
          /* Inline UPI Setup View */
          <div className="space-y-4 rounded-2xl border-2 border-dashed border-[#E8B968] bg-[#FFF6E8]/30 p-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-[#E8B968]/30">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0E8A4B] to-[#0A6E3C] text-white flex items-center justify-center shadow-md">
                <IndianRupee className="w-4 h-4" strokeWidth={2.5} />
              </div>
              <div>
                <h5 className="text-[12px] font-black text-foreground">UPI ID set karein</h5>
                <p className="text-[10px] text-foreground/60 font-medium">Automatic pay links banane ke liye</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="vpa" className="text-[10.5px] font-bold text-foreground">UPI ID (VPA)</Label>
                <Input
                  id="vpa"
                  value={vpaInput}
                  onChange={(e) => setVpaInput(e.target.value.toLowerCase())}
                  placeholder="9709707311@upi  · ya  name@okhdfcbank"
                  className="font-mono text-[12px] h-9"
                  autoFocus
                />
                <p className="text-[9.5px] text-foreground/50 font-medium">
                  Format: <span className="font-mono">number@upi</span> or <span className="font-mono">name@okaxis</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dname" className="text-[10.5px] font-bold text-foreground">
                  Display name <span className="text-foreground/40 ml-0.5 font-normal text-[9.5px]">(optional)</span>
                </Label>
                <Input
                  id="dname"
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value.slice(0, 40))}
                  placeholder="Addison X Media"
                  className="text-[12px] h-9"
                  maxLength={40}
                />
                <p className="text-[9.5px] text-foreground/50 font-medium">
                  UPI app me customer ko dikhne wala naam.
                </p>
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#FFF1D6] border border-[#E8B968]/70">
                <Info className="w-3.5 h-3.5 text-[#B8651A] flex-shrink-0 mt-0.5" />
                <p className="text-[9.5px] font-medium text-foreground/80 leading-normal">
                  Paisa direct apke UPI account me aayega. Hum koi transaction fee nahi lete.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              {cfgQ.data?.configured && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-9 text-[11px] font-extrabold"
                  onClick={() => setMode("request")}
                >
                  Cancel
                </Button>
              )}
              <Button
                size="sm"
                className="flex-1 h-9 text-[11px] font-extrabold"
                disabled={saveConfig.isPending || !vpaInput.trim()}
                onClick={() => saveConfig.mutate()}
              >
                {saveConfig.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                Save UPI ID
              </Button>
            </div>
          </div>
        ) : (
          /* Inline UPI Request View */
          <div className="space-y-4">
            {/* Product Selector Dropdown */}
            {productsList.length > 0 && (
              <div className="space-y-1">
                <Label className="text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A]">Prefill from Product</Label>
                <select
                  value={selectedProductIdx}
                  onChange={(e) => setSelectedProductIdx(e.target.value)}
                  className="w-full h-9 rounded-lg bg-white border-2 border-[#E8B968] px-2 text-[12px] font-bold focus:outline-none"
                >
                  <option value="custom">-- Custom Amount --</option>
                  {productsList.map((p: any, idx: number) => {
                    let price = p.price;
                    if (contact.is_reseller) {
                      price = p.resellerPrice || p.reseller_price || p.price;
                    }
                    return (
                      <option key={idx} value={String(idx)}>
                        {p.name} (₹{price})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Amount and Note */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A]">
                  Amount (₹)
                </Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0E8A4B]" />
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setSelectedProductIdx("custom");
                    }}
                    min={1}
                    max={100000}
                    placeholder="e.g. 500"
                    className="pl-9 text-lg font-black tabular-nums h-10"
                  />
                </div>
                <div className="flex gap-1.5 flex-wrap pt-0.5">
                  {PRESET_AMOUNTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setAmount(p);
                        setSelectedProductIdx("custom");
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-extrabold border-2 transition tabular-nums",
                        amount === p
                          ? "bg-[#0E8A4B] text-white border-[#0A6E3C]"
                          : "bg-white text-foreground/75 border-[#E8B968]/70 hover:bg-[#FFF1D6]",
                      )}
                    >
                      ₹{Number(p).toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A]">
                  Note <span className="text-foreground/40 ml-1 font-normal text-[10px]">(optional)</span>
                </Label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 40))}
                  placeholder="e.g. Diwali Order"
                  className="h-9 text-[12px]"
                  maxLength={40}
                />
              </div>
            </div>

            {/* Live QR Code Preview Card */}
            <div className="bg-[#FFF6E8] border-2 border-[#E8B968] rounded-2xl p-3 flex flex-col items-center text-center shadow-[0_3px_0_0_#E8B968]">
              <p className="text-[9px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold mb-1.5">Live Preview</p>
              {previewQrUrl ? (
                <img
                  src={previewQrUrl}
                  alt="UPI QR code"
                  className="w-full max-w-[150px] aspect-square rounded-lg bg-white p-1.5 shadow-sm border border-[#E8B968]/30"
                />
              ) : (
                <div className="w-full max-w-[150px] aspect-square rounded-lg bg-white border border-dashed border-[#E8B968] flex items-center justify-center text-[#B8651A]">
                  <QrCode className="w-8 h-8 opacity-40" />
                </div>
              )}
              <p className="text-[13px] font-black tabular-nums mt-1.5 text-[#0A6E3C]">
                ₹{Number(amount || 0).toLocaleString("en-IN")}
              </p>
              <p className="text-[9.5px] text-foreground/60 font-semibold truncate w-full">
                to {cfgQ.data?.display_name || cfgQ.data?.vpa || "—"}
              </p>
            </div>

            {/* Send Action */}
            <div className="space-y-2">
              <Button
                onClick={() => sendRequest.mutate()}
                disabled={sendRequest.isPending || !amount || Number(amount) < 1 || !conversationId}
                className="w-full h-11 rounded-xl text-[12.5px] font-extrabold gap-2 text-white border-0 bg-gradient-to-br from-[#0E8A4B] to-[#0A6E3C] shadow-[0_3px_0_0_#075A30] hover:shadow-[0_1px_0_0_#075A30] hover:translate-y-[1px] disabled:opacity-50 transition-all"
              >
                {sendRequest.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send ₹{Number(amount || 0).toLocaleString("en-IN")} request
              </Button>

              <div className="text-center">
                <button
                  onClick={() => {
                    setVpaInput(cfgQ.data?.vpa || "");
                    setDisplayNameInput(cfgQ.data?.display_name || "");
                    setMode("setup");
                  }}
                  className="text-[10px] font-extrabold text-[#3C50E0] hover:underline inline-flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  UPI ID change karein ({cfgQ.data?.vpa})
                </button>
              </div>
            </div>

            {!conversationId && (
              <p className="text-[10px] text-foreground/55 font-medium text-center italic">
                Open a conversation first to enable sending
              </p>
            )}
          </div>
        )
      ) : (
        /* Binance Request View */
        <div className="space-y-4">
          {/* Info Warning if not configured */}
          {!binanceId && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
              <span className="text-amber-500">⚠</span>
              <p className="text-[10px] font-semibold text-amber-800 leading-snug">
                Binance ID is not set for this agent. Please configure it in Products & Agent settings.
              </p>
            </div>
          )}

          {/* Product Selector Dropdown */}
          {productsList.length > 0 && (
            <div className="space-y-1">
              <Label className="text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A]">Prefill from Product</Label>
              <select
                value={selectedProductIdx}
                onChange={(e) => setSelectedProductIdx(e.target.value)}
                className="w-full h-9 rounded-lg bg-white border-2 border-[#E8B968] px-2 text-[12px] font-bold focus:outline-none"
              >
                <option value="custom">-- Custom Amount --</option>
                {productsList.map((p: any, idx: number) => {
                  let priceUsd = p.priceUsd || p.price_usd;
                  if (contact.is_reseller) {
                    priceUsd = p.resellerPriceUsd || p.reseller_price_usd || p.priceUsd || p.price_usd;
                  }
                  return (
                    <option key={idx} value={String(idx)}>
                      {p.name} (${priceUsd || 0})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Amount Input */}
          <div className="space-y-1">
            <Label className="text-[10px] font-extrabold uppercase tracking-wider text-[#B8651A]">
              Amount (USD $)
            </Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setSelectedProductIdx("custom");
              }}
              placeholder="e.g. 10"
              className="h-9 text-[12px]"
            />
          </div>

          {/* Template Preview */}
          <div className="space-y-1 bg-gray-50 border border-gray-200 rounded-xl p-2.5">
            <p className="text-[9px] uppercase tracking-wider font-extrabold text-foreground/45 border-b pb-1 mb-1.5">
              Message Preview
            </p>
            <p className="text-[11px] whitespace-pre-wrap font-medium font-sans leading-relaxed text-foreground/80">
              {binanceMessageBody}
            </p>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleSendBinance}
            disabled={sendingBinance || !conversationId || !binanceId}
            className="w-full h-11 rounded-xl text-[12.5px] font-extrabold gap-2 text-white border-0 bg-gradient-to-br from-[#3C50E0] to-[#2533A8] shadow-[0_3px_0_0_#1A2380] hover:shadow-[0_1px_0_0_#1A2380] hover:translate-y-[1px] disabled:opacity-50 transition-all"
          >
            {sendingBinance ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send Payment Info
          </Button>

          {!conversationId && (
            <p className="text-[10px] text-foreground/55 font-medium text-center italic">
              Open a conversation first to enable sending
            </p>
          )}
        </div>
      )}
    </div>
  );
};
