import { useRef, useEffect, useState, useMemo } from "react";
import {
  Send, Paperclip, Smile, Check, CheckCheck, MoreVertical,
  FileText, CreditCard, Clock, Sparkles, Phone, Video, Zap, Loader2,
  Mic, Bot, ChevronDown, Image as ImageIcon, Wand2, Timer, ArrowRight, ArrowLeft, User,
  Package, Trophy, TrendingUp, MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConversationWithContact, formatTime, initialsFor } from "@/lib/inbox-types";
import { Database } from "@/integrations/supabase/types";
import { useMessages, useSendMessage } from "@/hooks/useInboxData";
import { toast } from "sonner";
import { SendProductDialog, type ProductDeliveryPayload } from "./SendProductDialog";
import { ProductDeliveryCard, decodeProductDelivery, encodeProductDelivery } from "./ProductDeliveryCard";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  conversation: ConversationWithContact;
};

type MessageStatus = Database["public"]["Enums"]["message_status"];

const StatusIcon = ({ status }: { status: MessageStatus }) => {
  if (status === "queued" || status === "sent") return <Check className="w-3 h-3 text-muted-foreground" />;
  if (status === "delivered") return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
  if (status === "read") return <CheckCheck className="w-3 h-3 text-accent" />;
  if (status === "failed") return <span className="text-[9px] text-destructive font-bold">FAILED</span>;
  return null;
};

// Smart chips by lead temperature
const smartChipsByTag = {
  hot: [
    { text: "Send payment link", icon: CreditCard, glow: true, label: "Send Payment Link" },
    { text: "Confirm closing call at 5pm?", icon: Phone, glow: false, label: "Close Now" },
    { text: "Here's our best offer →", icon: Zap, glow: false, label: "Send Offer" },
  ],
  warm: [
    { text: "Would you like a quick demo?", icon: Video, glow: true, label: "Offer Demo" },
    { text: "What's your budget range?", icon: FileText, glow: false, label: "Ask Budget" },
    { text: "Here's a case study you'll love", icon: Sparkles, glow: false, label: "Share Proof" },
  ],
  cold: [
    { text: "Hey! Still thinking about it?", icon: Sparkles, glow: true, label: "Re-engage" },
    { text: "Quick question — what would change your mind?", icon: FileText, glow: false, label: "Open Loop" },
    { text: "Saved you a special offer for today", icon: Zap, glow: false, label: "Hook" },
  ],
} as const;

// Quick templates
const templates = [
  { name: "Intro", body: "Hi! Thanks for reaching out to AddisonX Media. How can I help you grow today?" },
  { name: "Pricing", body: "Our plans start at ₹4,999/mo. Would you like me to share a custom quote based on your needs?" },
  { name: "Follow-up", body: "Hey! Just checking in — did you get a chance to review what I sent? Happy to answer anything." },
  { name: "Demo", body: "I'd love to show you around in a 15-min call. Are you free today at 4pm or tomorrow morning?" },
  { name: "Closing", body: "Ready to get started? I can share the payment link right now and you'll be live in 24h." },
];

const isHighlighted = (text: string) => {
  const t = text.toLowerCase();
  return /₹|price|pricing|interested|buy|purchase|premium|plan|payment|deal|case study/.test(t);
};

// Pick "next best action" deterministically
const nextBestAction = (tag: string, score: number) => {
  if (tag === "hot" || score >= 80) return { label: "Ask the closing question", icon: Zap, color: "from-hot to-warning" };
  if (tag === "warm" || score >= 50) return { label: "Send proof / case study", icon: Sparkles, color: "from-warning to-primary" };
  return { label: "Open a curiosity loop", icon: ArrowRight, color: "from-accent to-primary" };
};

export const ChatWindow = ({ conversation }: Props) => {
  const [input, setInput] = useState("");
  const [aiAuto, setAiAuto] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: messages = [], isLoading } = useMessages(conversation.id);
  const sendMut = useSendMessage();

  const contact = conversation.contact;
  const initials = initialsFor(contact.name);
  const chips = smartChipsByTag[contact.tag] ?? smartChipsByTag.cold;
  const nba = nextBestAction(contact.tag, contact.score);
  const NbaIcon = nba.icon;

  // Auto-scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiTyping]);

  // Focus textarea when conversation switches
  useEffect(() => {
    textareaRef.current?.focus();
    setInput("");
    setShowTemplates(false);
  }, [conversation.id]);

  // Follow-up timer (live)
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const lastMsg = messages[messages.length - 1];
  const lastReplyAgo = useMemo(() => {
    if (!lastMsg) return null;
    const s = Math.max(0, Math.floor((now - new Date(lastMsg.created_at).getTime()) / 1000));
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
  }, [lastMsg, now]);

  const handleSend = () => {
    if (!input.trim()) return;
    const body = input;
    setInput("");
    sendMut.mutate({ conversationId: conversation.id, body });

    // Simulate AI auto-reply animation
    if (aiAuto && contact.tag === "hot") {
      setAiTyping(true);
      setTimeout(() => setAiTyping(false), 2200);
    }
  };

  const useTemplate = (body: string) => {
    setInput(body);
    setShowTemplates(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex-1 flex flex-col bg-card min-w-0 relative">
      {/* Chat header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-border flex-shrink-0 glass-strong z-10 relative">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold ring-2 ring-card",
              contact.tag === "hot" ? "bg-gradient-to-br from-hot-soft to-hot/20 text-hot" :
              contact.tag === "warm" ? "bg-gradient-to-br from-warning-soft to-warning/20 text-warning" :
              "bg-gradient-to-br from-muted to-muted/60 text-muted-foreground"
            )}>
              {initials}
            </div>
            <span className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-card",
              contact.tag === "hot" ? "bg-hot animate-pulse" : "bg-success"
            )} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold truncate">{contact.name}</h3>
              <span className={cn(
                "text-[9px] font-bold px-1.5 py-0.5 rounded",
                contact.tag === "hot" ? "bg-hot text-hot-foreground" : contact.tag === "warm" ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground"
              )}>
                {contact.score}
              </span>
              {contact.tag === "hot" && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-hot/10 text-hot uppercase tracking-wider flex items-center gap-1 animate-pulse">
                  <span className="w-1 h-1 rounded-full bg-hot" />
                  Live · Hot
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className="font-mono">{contact.phone}</span>
              {lastReplyAgo && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-success">
                    <Timer className="w-2.5 h-2.5" /> Last reply {lastReplyAgo}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Auto Mode Toggle */}
          <button
            onClick={() => {
              setAiAuto(!aiAuto);
              toast.success(aiAuto ? "AI Auto Mode disabled" : "AI Auto Mode ON · Addison will reply for you");
            }}
            className={cn(
              "h-8 pl-2 pr-3 rounded-lg flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all",
              aiAuto
                ? "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-md shadow-primary/30 animate-glow-pulse"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <Bot className="w-3.5 h-3.5" />
            AI Auto
            <span className={cn(
              "w-6 h-3 rounded-full p-0.5 transition-colors",
              aiAuto ? "bg-primary-foreground/30" : "bg-muted-foreground/30"
            )}>
              <span className={cn(
                "block w-2 h-2 rounded-full bg-primary-foreground transition-transform",
                aiAuto ? "translate-x-3" : "translate-x-0"
              )} />
            </span>
          </button>
          <button onClick={() => toast(`Calling ${contact.name}…`)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" title="Call">
            <Phone className="w-4 h-4" />
          </button>
          <button onClick={() => toast.success(`Starting video call with ${contact.name}…`)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" title="Video">
            <Video className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Next Best Action strip */}
      <div className="px-5 py-2 border-b border-border bg-gradient-to-r from-card via-primary-soft/30 to-card flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("w-6 h-6 rounded-md bg-gradient-to-br flex items-center justify-center text-white shadow-sm flex-shrink-0", nba.color)}>
            <NbaIcon className="w-3 h-3" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Next Best Action</span>
            <p className="text-[12px] font-semibold text-foreground truncate">{nba.label}</p>
          </div>
        </div>
        <button
          onClick={() => useTemplate(chips[0].text)}
          className="text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary-glow flex items-center gap-1 flex-shrink-0"
        >
          Apply <ArrowRight className="w-3 h-3" />
        </button>
      </div>

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
          const highlight = isHighlighted(msg.body);
          return (
            <div key={msg.id} className={cn("flex animate-bubble-pop", isOutbound ? "justify-end" : "justify-start")}>
              <div className="max-w-[75%] relative">
                {highlight && !isOutbound && (
                  <span className="absolute -top-2 left-2 text-[8px] font-bold text-warning bg-warning-soft px-1.5 py-0.5 rounded uppercase tracking-wider z-10 flex items-center gap-0.5 shadow-sm">
                    <Zap className="w-2.5 h-2.5" /> Buying intent
                  </span>
                )}
                <div className={cn(
                  "rounded-2xl px-3.5 py-2 relative shadow-sm",
                  isOutbound
                    ? "bg-[hsl(var(--chat-outgoing))] rounded-br-md shadow-primary/10"
                    : "bg-[hsl(var(--chat-incoming))] shadow-foreground/5 rounded-bl-md",
                  highlight && !isOutbound && "ring-2 ring-warning/30 bg-warning-soft/40"
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
              </div>
            </div>
          );
        })}

        {/* AI typing indicator */}
        {aiTyping && (
          <div className="flex justify-end animate-fade-in">
            <div className="bg-gradient-to-br from-primary-soft to-primary-soft/60 rounded-2xl rounded-br-md px-4 py-3 shadow-sm flex items-center gap-2 ring-1 ring-primary/20">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Addison is typing</span>
              <div className="flex items-center gap-1">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* AI Suggestions — smart chips */}
      <div className="px-5 pt-3 pb-2 border-t border-border bg-gradient-to-r from-primary-soft/40 via-card to-accent-soft/30 flex-shrink-0">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-4 h-4 rounded bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-sm shadow-primary/30">
            <Sparkles className="w-2.5 h-2.5 text-primary-foreground" />
          </div>
          <span className="text-[10px] font-bold text-primary uppercase tracking-[0.15em]">Addison AI · Smart Replies</span>
          <span className="ml-1 w-1 h-1 rounded-full bg-success animate-pulse" />
          {contact.tag === "hot" && (
            <span className="ml-auto text-[9px] font-bold text-hot uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" /> Lead is ready
            </span>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {chips.map((s) => (
            <button
              key={s.label}
              onClick={() => setInput(s.text)}
              className={cn(
                "group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all hover:-translate-y-0.5",
                s.glow
                  ? "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground border-transparent shadow-md shadow-primary/40 hover:shadow-lg hover:shadow-primary/50 animate-glow-pulse"
                  : "bg-card text-foreground border-border hover:border-primary hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:shadow-primary/20"
              )}
            >
              <s.icon className={cn("w-3 h-3", s.glow ? "text-primary-foreground" : "text-primary group-hover:text-primary-foreground")} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Templates dropdown */}
      {showTemplates && (
        <div className="absolute bottom-32 left-5 z-20 w-72 bg-card border border-border rounded-xl shadow-2xl shadow-foreground/10 overflow-hidden animate-scale-in">
          <div className="px-3 py-2 border-b border-border bg-muted/40 flex items-center gap-2">
            <Wand2 className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Quick Templates</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {templates.map((t) => (
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
          title="Quick templates"
        >
          <Wand2 className="w-3.5 h-3.5" />
          Templates
          <ChevronDown className={cn("w-3 h-3 transition-transform", showTemplates && "rotate-180")} />
        </button>
        <button onClick={() => toast("Attach file")} className="w-10 h-10 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0" title="Attach file">
          <Paperclip className="w-4 h-4" />
        </button>
        <button onClick={() => toast("Image upload")} className="w-10 h-10 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0" title="Image">
          <ImageIcon className="w-4 h-4" />
        </button>
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type a message…  Enter to send · Shift + Enter for new line"
            rows={1}
            className="w-full resize-none rounded-2xl bg-muted border border-transparent px-4 py-2.5 text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 focus:bg-card transition-all"
          />
        </div>
        <button onClick={() => toast.success("Recording voice note…")} className="w-10 h-10 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0" title="Voice note">
          <Mic className="w-4 h-4" />
        </button>
        <button onClick={() => toast("Emoji picker")} className="w-10 h-10 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
          <Smile className="w-4 h-4" />
        </button>
        <button
          onClick={handleSend}
          disabled={!input.trim() || sendMut.isPending}
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

      {/* Sticky CTA bar */}
      <div className="px-5 py-3 border-t border-border bg-gradient-to-r from-primary-soft via-card to-accent-soft flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => toast.success(`Offer sent to ${contact.name}`)}
          className="flex-1 h-11 rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground text-[13px] font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/40 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <Send className="w-4 h-4" />
          Send Offer
        </button>
        <button
          onClick={() => toast.success(`Payment link sent to ${contact.name}`)}
          className="h-11 px-4 rounded-xl bg-success text-success-foreground text-[12px] font-bold flex items-center gap-1.5 hover:bg-success/90 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
        >
          <CreditCard className="w-4 h-4" />
          Pay Link
        </button>
        <button
          onClick={() => toast.success(`Calling ${contact.name}…`)}
          className="h-11 px-4 rounded-xl bg-accent text-accent-foreground text-[12px] font-bold flex items-center gap-1.5 hover:bg-accent/90 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
        >
          <Phone className="w-4 h-4" />
          Call Now
        </button>
      </div>
    </div>
  );
};
