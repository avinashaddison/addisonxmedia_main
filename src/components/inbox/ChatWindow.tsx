import { useRef, useEffect, useState } from "react";
import {
  Send, Paperclip, Smile, Check, CheckCheck, MoreVertical,
  CreditCard, Sparkles, Phone, Loader2, Bot,
  ChevronDown, Image as ImageIcon, Wand2, AlertTriangle,
  Package, RotateCcw, ShieldOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ConversationWithContact, formatTime, initialsFor } from "@/lib/inbox-types";
import type { MessageStatus as MsgStatus } from "@/lib/api-types";
import { useMessages, useSendMessage } from "@/hooks/useInboxData";
import { toast } from "sonner";
import { SendProductDialog, type ProductDeliveryPayload } from "./SendProductDialog";
import { ProductDeliveryCard, decodeProductDelivery, encodeProductDelivery } from "./ProductDeliveryCard";
import { api } from "@/lib/api";

type Props = {
  conversation: ConversationWithContact;
};

type MessageStatus = MsgStatus;

const StatusIcon = ({ status }: { status: MessageStatus }) => {
  if (status === "queued" || status === "sent") return <Check className="w-3 h-3 text-muted-foreground" aria-label="sent" />;
  if (status === "delivered") return <CheckCheck className="w-3 h-3 text-muted-foreground" aria-label="delivered" />;
  if (status === "read") return <CheckCheck className="w-3 h-3 text-accent" aria-label="read" />;
  if (status === "failed") return <span className="text-[9px] text-destructive font-bold">FAILED</span>;
  return null;
};

// Reusable saved-reply templates. Editing happens on the Templates page.
const QUICK_TEMPLATES = [
  { name: "Greeting", body: "Hi! Thanks for reaching out. How can I help you today?" },
  { name: "Pricing", body: "Our plans start at ₹499/mo. Want me to share a quick comparison?" },
  { name: "Demo", body: "I'd love to show you around in a 15-min call. Are you free today at 4pm or tomorrow morning?" },
  { name: "Follow-up", body: "Hey! Just checking in — happy to answer any questions." },
  { name: "Pay link", body: "Here's your pay link — UPI/Razorpay/Cards all work: " },
];

const CUSTOMER_SERVICE_WINDOW_HOURS = 24;

export const ChatWindow = ({ conversation }: Props) => {
  const [input, setInput] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const qc = useQueryClient();

  const { data: messages = [], isLoading } = useMessages(conversation.id);
  const sendMut = useSendMessage();

  // Real send-mode indicator: is Meta WhatsApp configured + enabled?
  const { data: metaCfg } = useQuery({
    queryKey: ["meta-config"],
    queryFn: () => api.getMetaConfig(),
  });
  const sendMode: "meta" | "dryrun" = metaCfg?.enabled ? "meta" : "dryrun";

  const contact = conversation.contact;
  const initials = initialsFor(contact.name);

  // Auto-scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Focus textarea + clear input when conversation switches
  useEffect(() => {
    textareaRef.current?.focus();
    setInput("");
    setShowTemplates(false);
  }, [conversation.id]);

  // Mark as read on view (clears unread_count once user has the chat open).
  useEffect(() => {
    if (conversation.unread_count > 0) {
      api.updateConversation(conversation.id, { unread_count: 0 })
        .then(() => qc.invalidateQueries({ queryKey: ["conversations"] }))
        .catch(() => { /* non-fatal — UI just doesn't update */ });
    }
  }, [conversation.id, conversation.unread_count, qc]);

  // Meta's 24-hour customer-service window: free-form text only allowed within
  // 24 hours of the last inbound message. Outside that, you must send a template.
  // Find the most recent inbound message timestamp.
  const lastInboundAt = messages
    .filter((m) => m.direction === "inbound")
    .map((m) => new Date(m.created_at).getTime())
    .reduce((max, t) => Math.max(max, t), 0);
  const inWindow =
    lastInboundAt > 0 &&
    Date.now() - lastInboundAt < CUSTOMER_SERVICE_WINDOW_HOURS * 3600 * 1000;
  const windowExpired = lastInboundAt > 0 && !inWindow;
  const noInboundYet = lastInboundAt === 0;

  const handleSend = () => {
    if (!input.trim()) return;
    const body = input;
    setInput("");
    sendMut.mutate({ conversationId: conversation.id, body });
  };

  const handleRetry = (failedBody: string) => {
    sendMut.mutate({ conversationId: conversation.id, body: failedBody });
  };

  const useTemplate = (body: string) => {
    setInput(body);
    setShowTemplates(false);
    textareaRef.current?.focus();
  };

  const handleDeliverProduct = async (payload: ProductDeliveryPayload, autoCloseDeal: boolean) => {
    sendMut.mutate({ conversationId: conversation.id, body: encodeProductDelivery(payload) });
    toast.success(`${payload.productName} delivered to ${contact.name}`);

    if (autoCloseDeal) {
      try {
        const all = await api.listDeals();
        const open = all.filter(
          (d: any) => d.conversation_id === conversation.id && d.stage !== "won" && d.stage !== "lost"
        );
        await Promise.all(
          open.map((d: any) =>
            api.updateDeal(d.id, {
              stage: "won",
              probability: 100,
              closed_at: new Date().toISOString(),
            })
          )
        );
        if (open.length > 0) {
          toast.success(`${open.length} deal${open.length > 1 ? "s" : ""} marked as won`);
          qc.invalidateQueries({ queryKey: ["deals"] });
        }
      } catch (e) {
        console.error("Auto-close failed", e);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0 relative">
      {/* Chat header */}
      <div className="h-16 flex items-center justify-between px-5 border-b-2 border-[#E8B968] flex-shrink-0 z-10 relative bg-[#0E8A4B] text-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-extrabold text-white shadow-md ring-2 ring-white/20",
              contact.tag === "hot" ? "bg-[#D4308E]" :
              contact.tag === "warm" ? "bg-[#FF6A1F]" :
              "bg-[#3C50E0]"
            )}>
              {initials}
            </div>
            <span className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-[#0E8A4B]",
              contact.tag === "hot" ? "bg-[#FFD23F] animate-pulse" : "bg-[#16C172]"
            )} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-extrabold truncate">{contact.name}</h3>
            <p className="text-[11px] text-white/85 flex items-center gap-1.5 font-medium">
              <span className="font-mono">{contact.phone}</span>
              <span>·</span>
              <span className="capitalize font-extrabold">{contact.tag} lead</span>
              <span>·</span>
              <span>Score <span className="font-extrabold text-[#FFD23F]">{contact.score}</span></span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {sendMode === "meta" ? (
            <span
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFD23F] text-[#7A4A00] text-[10px] font-extrabold"
              title={`Connected via Meta · ${metaCfg?.display_phone_number ?? ""}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#0A6E3C] animate-pulse" />
              Live · WhatsApp
            </span>
          ) : (
            <a
              href="/app/settings"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FF6A1F] text-white text-[10px] font-extrabold hover:bg-[#E85C12] transition"
              title="Configure WhatsApp in Settings → Integrations"
            >
              <ShieldOff className="w-3 h-3" />
              Dry-run · not connected
            </a>
          )}
          <button className="w-9 h-9 rounded-lg hover:bg-white/15 flex items-center justify-center text-white transition" aria-label="More options">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 24-hour customer-service window warning (Meta restriction).
          Only show when send mode is Meta — in dry-run it's irrelevant. */}
      {sendMode === "meta" && windowExpired && (
        <div className="px-5 py-2 border-b border-warning/30 bg-warning-soft/60 flex items-center gap-2 flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
          <p className="text-[11px] text-foreground leading-snug">
            <span className="font-bold">Outside 24-hour window.</span> WhatsApp only allows
            approved <strong>template messages</strong> until {contact.name} replies. Free-form text will be rejected by Meta.
          </p>
        </div>
      )}

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-5 py-5 space-y-2 relative dot-pattern"
        style={{ background: "hsl(var(--chat-bg))" }}
      >
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center mb-3 shadow-sm">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <p className="text-[13px] font-semibold text-foreground">No messages yet</p>
            <p className="text-[11px] text-muted-foreground mt-1">Send the first message below</p>
          </div>
        )}

        {messages.map((msg) => {
          const isOutbound = msg.direction === "outbound";
          const productPayload = decodeProductDelivery(msg.body);
          const isFailed = msg.status === "failed";

          if (productPayload) {
            return (
              <div key={msg.id} className={cn("flex animate-bubble-pop", isOutbound ? "justify-end" : "justify-start")}>
                <div className="relative">
                  <ProductDeliveryCard payload={productPayload} />
                  <div className={cn("flex items-center gap-1 mt-1", isOutbound ? "justify-end" : "justify-start")}>
                    <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                    {isOutbound && <StatusIcon status={msg.status} />}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className={cn("flex animate-bubble-pop group", isOutbound ? "justify-end" : "justify-start")}>
              <div className="max-w-[75%] relative">
                <div className={cn(
                  "rounded-2xl px-3.5 py-2 relative shadow-sm",
                  isOutbound
                    ? "bg-[hsl(var(--chat-outgoing))] rounded-br-md"
                    : "bg-[hsl(var(--chat-incoming))] shadow-foreground/5 rounded-bl-md",
                  isFailed && "ring-2 ring-destructive/30"
                )}>
                  {msg.is_ai_generated && isOutbound && (
                    <span className="absolute -top-2 -left-1 text-[8px] font-bold text-primary bg-primary-soft px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" /> AI
                    </span>
                  )}
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-foreground">{msg.body}</p>
                  <div className={cn("flex items-center gap-1 mt-1", isOutbound ? "justify-end" : "justify-start")}>
                    <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                    {isOutbound && <StatusIcon status={msg.status} />}
                  </div>
                </div>
                {/* Retry button for failed outbound messages */}
                {isFailed && isOutbound && (
                  <div className="flex items-center gap-1 mt-1 justify-end">
                    <button
                      onClick={() => handleRetry(msg.body)}
                      className="text-[10px] text-destructive hover:text-foreground font-bold flex items-center gap-1 px-2 py-0.5 rounded hover:bg-destructive/10 transition-colors"
                      title="Retry sending"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retry
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Templates dropdown (real saved replies — no fake AI suggestions) */}
      {showTemplates && (
        <div className="absolute bottom-20 left-5 z-20 w-72 bg-card border border-border rounded-xl shadow-2xl shadow-foreground/10 overflow-hidden animate-fade-in">
          <div className="px-3 py-2 border-b border-border bg-muted/40 flex items-center gap-2">
            <Wand2 className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Quick replies</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {QUICK_TEMPLATES.map((t) => (
              <button
                key={t.name}
                onClick={() => useTemplate(t.body)}
                className="w-full text-left px-3 py-2 hover:bg-primary-soft/40 border-b border-border/40 last:border-0 transition-colors group"
              >
                <div className="text-[11px] font-bold text-primary uppercase tracking-wider">{t.name}</div>
                <p className="text-[12px] text-muted-foreground truncate group-hover:text-foreground">{t.body}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-5 py-3 border-t border-border bg-card flex items-end gap-2 flex-shrink-0">
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className={cn(
            "h-10 px-2.5 rounded-xl flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-colors flex-shrink-0",
            showTemplates ? "bg-primary-soft text-primary" : "hover:bg-muted text-muted-foreground hover:text-foreground"
          )}
          aria-label="Quick reply templates"
        >
          <Wand2 className="w-3.5 h-3.5" />
          Templates
          <ChevronDown className={cn("w-3 h-3 transition-transform", showTemplates && "rotate-180")} />
        </button>
        <button
          onClick={() => setProductOpen(true)}
          className="h-10 px-2.5 rounded-xl flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          aria-label="Send digital product"
          title="Deliver a digital product"
        >
          <Package className="w-3.5 h-3.5" />
          Send product
        </button>
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={
              sendMode === "meta" && windowExpired
                ? "Outside 24-hour window — send a template instead"
                : sendMode === "dryrun"
                  ? "Type a message…  (dry-run mode — not actually sent)"
                  : "Type a message…  Enter to send · Shift + Enter for new line"
            }
            rows={1}
            className="w-full resize-none rounded-2xl bg-muted border border-transparent px-4 py-2.5 text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 focus:bg-card transition-all"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!input.trim() || sendMut.isPending}
          aria-label="Send message"
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
            input.trim() && !sendMut.isPending
              ? "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground hover:shadow-lg hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95"
              : "bg-muted text-muted-foreground"
          )}
        >
          {sendMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>

      {/* Send Product Dialog */}
      <SendProductDialog
        open={productOpen}
        onOpenChange={setProductOpen}
        contactName={contact.name}
        onDeliver={handleDeliverProduct}
      />
    </div>
  );
};
