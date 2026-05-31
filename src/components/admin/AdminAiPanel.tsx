import { useState, useRef, useEffect } from "react";
import {
  Brain, Send, X, Sparkles, ChevronRight, Loader2,
  AlertTriangle, CheckCircle, Activity, ArrowRight, Server,
  ShieldCheck, RefreshCw
} from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export const AdminAiPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I am your AI SaaS Platform Manager. I can audit client workspaces, inspect unrouted WhatsApp webhooks, recommend merges, or edit workspace plans. What should we look at first?"
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text) return;

    if (!textToSend) {
      setInput("");
    }

    const newMsgs = [...messages, { role: "user" as const, content: text }];
    setMessages(newMsgs);
    setLoading(true);

    try {
      const res = await adminApi.sendAdminAiMessage(text);
      setMessages([...newMsgs, { role: "assistant" as const, content: res.response }]);
    } catch (err: any) {
      toast.error("AI operations failed: " + err.message);
      setMessages([...newMsgs, { role: "assistant" as const, content: "⚠️ Error executing operation: " + err.message }]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  const SHORTCUTS = [
    { label: "📊 Audit Workspace Activity", cmd: "list workspaces and their message activity" },
    { label: "🔍 Inspect Webhook Orphans", cmd: "find and inspect unrouted webhook orphans and suggest target owners" },
    { label: "💎 List Paying Subscriptions", cmd: "show all paying subscription workspaces" },
  ];

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-14 px-5 rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white font-extrabold text-[13.5px] shadow-[0_5px_15px_rgba(124,58,237,0.4)] border border-violet-500/30 hover:scale-105 hover:shadow-[0_8px_20px_rgba(124,58,237,0.5)] transition duration-200 flex items-center gap-2"
        aria-label="Open AI Operations"
      >
        <div className="relative">
          <Brain className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-violet-600 rounded-full animate-pulse" />
        </div>
        AI Platform Manager
      </button>

      {/* Sidebar Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-[420px] max-w-full bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col transition-all duration-300 ease-out transform",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Drawer Header */}
        <div className="h-16 border-b border-slate-800 bg-slate-900 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600/10 border border-violet-500/30 flex items-center justify-center">
              <Brain className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-[14.5px] font-black text-slate-100 flex items-center gap-1.5">
                AI Platform Manager
                <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                  Connected
                </span>
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Addison SaaS Virtual Assistant</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-200 transition"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/40 custom-scrollbar">
          {messages.map((m, idx) => {
            const isAi = m.role === "assistant";
            return (
              <div
                key={idx}
                className={cn(
                  "flex flex-col max-w-[85%] rounded-2xl p-3.5 text-[12.5px] leading-relaxed shadow-sm font-sans",
                  isAi
                    ? "bg-slate-900 border border-slate-800 text-slate-200 self-start rounded-tl-sm"
                    : "bg-gradient-to-br from-violet-600 to-indigo-600 text-white self-end rounded-tr-sm"
                )}
                style={{ alignSelf: isAi ? "flex-start" : "flex-end" }}
              >
                {/* Parse simple markdown/bullet points from text */}
                <div className="whitespace-pre-wrap break-words">
                  {m.content}
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex items-center gap-2 text-violet-400 text-[11px] font-bold bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 w-fit">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              AI operations running...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Shortcuts Section */}
        <div className="p-3 border-t border-slate-900 bg-slate-950">
          <p className="text-[9.5px] uppercase tracking-wider font-extrabold text-slate-500 mb-2">
            Operations Shortcuts
          </p>
          <div className="flex flex-col gap-1.5">
            {SHORTCUTS.map((item, idx) => (
              <button
                key={idx}
                disabled={loading}
                onClick={() => handleSend(item.cmd)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800/80 hover:border-violet-500/20 text-[11px] text-slate-300 font-extrabold flex items-center justify-between group transition disabled:opacity-50"
              >
                <span>{item.label}</span>
                <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-violet-400 group-hover:translate-x-0.5 transition" />
              </button>
            ))}
          </div>
        </div>

        {/* Chat Input Composer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/60 backdrop-blur">
          <div className="flex items-end gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2 focus-within:border-violet-500/55 transition duration-200">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask AI Manager to merge,claim or suspend..."
              rows={1}
              disabled={loading}
              className="flex-1 resize-none bg-transparent border-0 px-2 py-1 text-[13px] text-slate-100 placeholder:text-slate-600 focus:outline-none disabled:opacity-50 leading-relaxed font-sans max-h-24 overflow-y-auto"
            />
            <Button
              size="icon"
              disabled={!input.trim() || loading}
              onClick={() => handleSend()}
              className="w-8 h-8 rounded-lg bg-violet-600 hover:bg-violet-500 text-white flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Backdrop overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-45 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
        />
      )}
    </>
  );
};
