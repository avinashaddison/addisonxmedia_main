import { useState, useRef, useEffect } from "react";
import {
  Send, Paperclip, Smile, Check, CheckCheck, MoreVertical,
  FileText, CreditCard, Clock, Sparkles, Phone, Video, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Conversation, Message, MessageStatus } from "@/data/conversations";
import { toast } from "sonner";

type Props = {
  conversation: Conversation;
};

const StatusIcon = ({ status }: { status?: MessageStatus }) => {
  if (!status) return null;
  if (status === "sent") return <Check className="w-3 h-3 text-muted-foreground" />;
  if (status === "delivered") return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
  return <CheckCheck className="w-3 h-3 text-accent" />;
};

const aiSuggestions = [
  { text: "Send special offer", icon: CreditCard },
  { text: "Ask their budget", icon: FileText },
  { text: "Schedule a demo call", icon: Clock },
];

// Detect important content like pricing or buying intent
const isHighlighted = (text: string) => {
  const t = text.toLowerCase();
  return /\₹|price|pricing|interested|buy|purchase|premium|plan|payment|deal|case study/.test(t);
};

export const ChatWindow = ({ conversation }: Props) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(conversation.messages);
  const [isTyping, setIsTyping] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(conversation.messages);
  }, [conversation.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Simulate AI generating a suggestion periodically
  useEffect(() => {
    const t = setTimeout(() => {
      setAiGenerating(true);
      setTimeout(() => setAiGenerating(false), 2000);
    }, 4000);
    return () => clearTimeout(t);
  }, [conversation.id]);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg: Message = {
      id: `m${Date.now()}`,
      sender: "user",
      text: input,
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase(),
      status: "sent",
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");

    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 2500);
  };

  const lead = conversation.lead;

  return (
    <div className="flex-1 flex flex-col bg-card min-w-0">
      {/* Chat header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <div className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold",
              lead.tag === "hot" ? "bg-hot-soft text-hot" : lead.tag === "warm" ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground"
            )}>
              {lead.avatar}
            </div>
            {lead.online && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-success border-2 border-card" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold truncate">{lead.name}</h3>
              <span className={cn(
                "text-[9px] font-bold px-1.5 py-0.5 rounded",
                lead.tag === "hot" ? "bg-hot text-hot-foreground" : lead.tag === "warm" ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground"
              )}>
                {lead.score}
              </span>
              <span className="text-[10px] font-bold text-primary">{lead.value}</span>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              {lead.online ? (
                <>
                  <span className="relative flex w-1.5 h-1.5">
                    <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-75" />
                    <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-success" />
                  </span>
                  <span className="text-success font-medium">Online</span>
                </>
              ) : (
                "Last seen 2h ago"
              )}
              <span>·</span>
              <span className="font-mono">{lead.phone}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" title="Call">
            <Phone className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" title="Video">
            <Video className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2" style={{ background: "hsl(var(--chat-bg))" }}>
        <div className="flex justify-center mb-3">
          <span className="bg-card/90 text-[10px] text-muted-foreground px-3 py-1 rounded-full shadow-sm font-medium">Today</span>
        </div>

        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          const highlight = isHighlighted(msg.text);
          return (
            <div key={msg.id} className={cn("flex animate-slide-up", isUser ? "justify-end" : "justify-start")}>
              <div className="max-w-[75%] relative">
                {highlight && !isUser && (
                  <span className="absolute -top-2 left-2 text-[8px] font-bold text-warning bg-warning-soft px-1.5 py-0.5 rounded uppercase tracking-wider z-10 flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5" /> Buying intent
                  </span>
                )}
                <div className={cn(
                  "rounded-2xl px-3.5 py-2 relative",
                  isUser
                    ? "bg-[hsl(var(--chat-outgoing))] rounded-br-md"
                    : "bg-[hsl(var(--chat-incoming))] shadow-sm rounded-bl-md",
                  highlight && !isUser && "ring-2 ring-warning/30 bg-warning-soft/40"
                )}>
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-foreground">{msg.text}</p>
                  <div className={cn("flex items-center gap-1 mt-1", isUser ? "justify-end" : "justify-start")}>
                    <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                    {isUser && <StatusIcon status={msg.status} />}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-card shadow-sm rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full bg-muted-foreground/40"
                  style={{ animation: `typing-dot 1.4s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* AI generating indicator */}
      {aiGenerating && (
        <div className="px-4 py-1.5 bg-primary-soft border-t border-primary/20 flex items-center gap-2 animate-fade-in flex-shrink-0">
          <Sparkles className="w-3 h-3 text-primary animate-pulse" />
          <span className="text-[11px] font-medium text-primary">AI is generating suggestion…</span>
          <div className="flex gap-1 ml-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-1 h-1 rounded-full bg-primary" style={{ animation: `typing-dot 1.4s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
        </div>
      )}

      {/* AI Suggestions — Floating quick replies */}
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
          disabled={!input.trim()}
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center transition-all flex-shrink-0",
            input.trim()
              ? "bg-primary text-primary-foreground hover:bg-primary-glow shadow-sm"
              : "bg-muted text-muted-foreground"
          )}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* STICKY CTA BAR — Conversion focused */}
      <div className="px-4 py-3 border-t border-border bg-gradient-to-r from-primary-soft via-card to-primary-soft flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => toast.success(`Offer sent to ${lead.name}`)}
          className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-primary-glow transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          <Send className="w-4 h-4" />
          Send Offer
        </button>
        <button
          onClick={() => toast.success(`Payment link sent to ${lead.name}`)}
          className="h-11 px-4 rounded-xl bg-success text-success-foreground text-[12px] font-bold flex items-center gap-1.5 hover:bg-success/90 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          <CreditCard className="w-4 h-4" />
          Pay Link
        </button>
        <button
          onClick={() => toast.success(`Calling ${lead.name}…`)}
          className="h-11 px-4 rounded-xl bg-accent text-accent-foreground text-[12px] font-bold flex items-center gap-1.5 hover:bg-accent/90 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          <Phone className="w-4 h-4" />
          Call Now
        </button>
      </div>
    </div>
  );
};
