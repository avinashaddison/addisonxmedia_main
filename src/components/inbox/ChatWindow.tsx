import { useRef, useEffect, useState } from "react";
import {
  Send, Paperclip, Smile, Check, CheckCheck, MoreVertical,
  FileText, CreditCard, Clock, Sparkles, Phone, Video, Zap, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConversationWithContact, formatTime, initialsFor } from "@/lib/inbox-types";
import { Database } from "@/integrations/supabase/types";
import { useMessages, useSendMessage } from "@/hooks/useInboxData";
import { toast } from "sonner";

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

const aiSuggestions = [
  { text: "Send special offer", icon: CreditCard },
  { text: "Ask their budget", icon: FileText },
  { text: "Schedule a demo call", icon: Clock },
];

const isHighlighted = (text: string) => {
  const t = text.toLowerCase();
  return /₹|price|pricing|interested|buy|purchase|premium|plan|payment|deal|case study/.test(t);
};

export const ChatWindow = ({ conversation }: Props) => {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useMessages(conversation.id);
  const sendMut = useSendMessage();

  const contact = conversation.contact;
  const initials = initialsFor(contact.name);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const body = input;
    setInput("");
    sendMut.mutate({ conversationId: conversation.id, body });
  };

  return (
    <div className="flex-1 flex flex-col bg-card min-w-0">
      {/* Chat header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <div className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold",
              contact.tag === "hot" ? "bg-hot-soft text-hot" : contact.tag === "warm" ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground"
            )}>
              {initials}
            </div>
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
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className="font-mono">{contact.phone}</span>
              {contact.source && (
                <>
                  <span>·</span>
                  <span>{contact.source}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => toast(`Calling ${contact.name}…`)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" title="Call">
            <Phone className="w-4 h-4" />
          </button>
          <button onClick={() => toast("Video call coming soon")} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" title="Video">
            <Video className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2" style={{ background: "hsl(var(--chat-bg))" }}>
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
            <div key={msg.id} className={cn("flex animate-slide-up", isOutbound ? "justify-end" : "justify-start")}>
              <div className="max-w-[75%] relative">
                {highlight && !isOutbound && (
                  <span className="absolute -top-2 left-2 text-[8px] font-bold text-warning bg-warning-soft px-1.5 py-0.5 rounded uppercase tracking-wider z-10 flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5" /> Buying intent
                  </span>
                )}
                <div className={cn(
                  "rounded-2xl px-3.5 py-2 relative",
                  isOutbound
                    ? "bg-[hsl(var(--chat-outgoing))] rounded-br-md"
                    : "bg-[hsl(var(--chat-incoming))] shadow-sm rounded-bl-md",
                  highlight && !isOutbound && "ring-2 ring-warning/30 bg-warning-soft/40"
                )}>
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
        <div ref={bottomRef} />
      </div>

      {/* AI Suggestions */}
      <div className="px-4 pt-2.5 pb-2 border-t border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">AI Quick Replies</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {aiSuggestions.map((s) => (
            <button
              key={s.text}
              onClick={() => setInput(s.text)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary-soft text-primary text-[11px] font-semibold border border-primary/15 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all hover:-translate-y-0.5"
            >
              <s.icon className="w-3 h-3" />
              {s.text}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-4 py-2.5 border-t border-border bg-card flex items-end gap-2 flex-shrink-0">
        <button className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
          <Paperclip className="w-4 h-4" />
        </button>
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type a message…"
            rows={1}
            className="w-full resize-none rounded-xl bg-muted border-0 px-4 py-2.5 text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <button className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
          <Smile className="w-4 h-4" />
        </button>
        <button
          onClick={handleSend}
          disabled={!input.trim() || sendMut.isPending}
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center transition-all flex-shrink-0",
            input.trim() && !sendMut.isPending
              ? "bg-primary text-primary-foreground hover:bg-primary-glow shadow-sm"
              : "bg-muted text-muted-foreground"
          )}
        >
          {sendMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>

      {/* Sticky CTA bar */}
      <div className="px-4 py-3 border-t border-border bg-gradient-to-r from-primary-soft via-card to-primary-soft flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => toast.success(`Offer sent to ${contact.name}`)}
          className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-primary-glow transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          <Send className="w-4 h-4" />
          Send Offer
        </button>
        <button
          onClick={() => toast.success(`Payment link sent to ${contact.name}`)}
          className="h-11 px-4 rounded-xl bg-success text-success-foreground text-[12px] font-bold flex items-center gap-1.5 hover:bg-success/90 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          <CreditCard className="w-4 h-4" />
          Pay Link
        </button>
        <button
          onClick={() => toast.success(`Calling ${contact.name}…`)}
          className="h-11 px-4 rounded-xl bg-accent text-accent-foreground text-[12px] font-bold flex items-center gap-1.5 hover:bg-accent/90 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          <Phone className="w-4 h-4" />
          Call Now
        </button>
      </div>
    </div>
  );
};
