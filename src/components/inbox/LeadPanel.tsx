import { useEffect, useState } from "react";
import {
  Phone, Mail, Tag, StickyNote, X, Flame, Snowflake, CircleDot,
  Save, Trophy, Plus, Loader2, Globe, Bell, IndianRupee,
  MessageCircle, Instagram, Link2, Facebook, Send, Settings as SettingsIcon, ExternalLink,
  Package, Sparkles,
} from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import { SendPaymentDialog } from "./SendPaymentDialog";
import { SendProductDialog, type ProductDeliveryPayload } from "./SendProductDialog";
import { encodeProductDelivery } from "./ProductDeliveryCard";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Contact, initialsFor, formatRelative } from "@/lib/inbox-types";
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
  conversationId?: string;
  onClose?: () => void;
};

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const productDetailsTemplate = (
  productName: string,
  price: number,
  validity: string,
  mail: string,
  time: string,
  contactName: string,
  description?: string
) => {
  let text = `*${productName}*\n\n`;
  if (description) {
    text += `${description}\n\n`;
  }
  text += `Activation time : ${time}\n` +
          `Validity : ${validity}\n` +
          `Activation mail : ${mail}\n` +
          `Price : ₹${price.toLocaleString("en-IN")}\n\n` +
          `Please Check and Confirm to buy`;
  return text;
};

const allProductsListTemplate = (products: any[]) => {
  let listText = "";
  products.forEach((p) => {
    const valText = p.validity.toLowerCase() === "monthly" ? "month" : p.validity.toLowerCase() === "yearly" ? "year" : p.validity.toLowerCase();
    listText += `• ${p.name} — ₹${p.price}/${valText}\n`;
  });
  
  return `available tools 👇\n\n` +
         `${listText}\n` +
         `jo chahiye uska naam bhej do 🙂`;
};

export const LeadPanel = ({ contact, conversationId, onClose }: Props) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const initials = initialsFor(contact.name);

  // Editable fields — start from server state, persist on save
  const [tag, setTag] = useState<Contact["tag"]>(contact.tag);
  const [score, setScore] = useState(contact.score);
  const [notes, setNotes] = useState(contact.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
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
  const [activeTab, setActiveTab] = useState<"leads" | "product">("leads");

  const handleSendProductDetails = async (p: any, idx: number) => {
    if (!conversationId) return;
    setSendingProductIdx(idx);
    try {
      const first = contact.name.split(/\s+/)[0] || contact.name;
      const body = productDetailsTemplate(
        p.name,
        p.price,
        p.validity,
        p.activationMail || "Activation On your Mail",
        p.activationTime || "10 min",
        first,
        p.description
      );
      
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
      const body = allProductsListTemplate(activeAgent.products);
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
  }, [contact.id, contact.tag, contact.score, contact.notes]);

  const dirty = tag !== contact.tag || score !== contact.score || (notes ?? "") !== (contact.notes ?? "");

  // Real deals + tasks for this specific contact
  const { data: allDeals = [] } = useQuery({
    queryKey: ["deals", user?.id],
    enabled: !!user,
    queryFn: () => api.listDeals() as Promise<Deal[]>,
  });
  const { data: allTasks = [] } = useQuery({
    queryKey: ["tasks", user?.id],
    enabled: !!user,
    queryFn: () => api.listTasks() as Promise<(Task & { contact?: Contact | null })[]>,
  });
  const contactDeals = allDeals.filter((d) => d.contact_id === contact.id);
  const contactTasks = allTasks.filter((t) => t.contact_id === contact.id);

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.listConversations(),
    enabled: !!conversationId,
  });
  const conversation = conversations.find((c: any) => c.id === conversationId);

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
    <div className="w-full lg:w-[340px] h-full bg-white border-l-2 border-[#E8B968] flex flex-col flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b-2 border-[#E8B968] bg-[#FFF6E8] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-[14px] font-black tracking-tight truncate">
            {activeTab === "leads" ? "Lead ki details" : "Digital product"}
          </h3>
          {/* Cool UI Toggle for Agent Mode */}
          {conversationId && activeTab === "leads" && (
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
            className="w-8 h-8 rounded-lg hover:bg-[#FFE8C7] flex items-center justify-center text-foreground/60 hover:text-foreground transition lg:hidden"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tab segmented control */}
      <div className="flex-shrink-0 px-3 pt-3 pb-2 border-b border-[#E8B968]/40 bg-[#FFF6E8]/40">
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968]">
          {([
            { id: "leads" as const,   label: "Leads",          Icon: Tag },
            { id: "product" as const, label: "Digital product", Icon: Package },
          ]).map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  "h-8 px-2 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider transition-all",
                  active
                    ? "bg-[#FF6A1F] text-white shadow-[0_2px_0_0_#B8420A]"
                    : "text-foreground/55 hover:bg-[#FFF1D6] hover:text-foreground"
                )}
              >
                <t.Icon className="w-3 h-3" strokeWidth={2.5} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" hidden={activeTab !== "leads"}>
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



          {/* Save button — only enabled when something changed */}
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className={cn(
              "w-full h-9 rounded-lg flex items-center justify-center gap-1.5 text-[12px] font-bold transition-all",
              dirty
                ? "bg-primary text-primary-foreground hover:bg-primary-glow shadow-sm shadow-primary/20"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? "Saving…" : dirty ? "Save changes" : "No changes"}
          </button>
        </div>

        {/* Send pay link — only when we have an active conversation */}
        {conversationId && (
          <div className="px-4 py-3 border-t border-border">
            <button
              onClick={() => setPaymentOpen(true)}
              className="w-full h-11 rounded-xl flex items-center justify-center gap-2 bg-gradient-to-br from-[#0E8A4B] to-[#0A6E3C] text-white text-[13px] font-extrabold shadow-[0_3px_0_0_#075A30] hover:shadow-[0_1px_0_0_#075A30] hover:translate-y-[2px] transition-all"
            >
              <IndianRupee className="w-4 h-4" strokeWidth={2.5} />
              Send UPI pay link
            </button>
            <p className="text-[10px] text-muted-foreground font-medium text-center mt-1.5">
              QR + tap-to-pay link · directly to WhatsApp
            </p>
          </div>
        )}

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

      {/* UPI Send-payment dialog */}
      {conversationId && (
        <SendPaymentDialog
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          conversationId={conversationId}
          contactName={contact.name}
        />
      )}

      {/* ── Tab 2: Digital Product Delivery ─────────────────────────── */}
      <div className="flex-1 overflow-y-auto" hidden={activeTab !== "product"}>
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
