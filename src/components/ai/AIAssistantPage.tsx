import { Bot, Sparkles, Send, Wand2, Zap, ArrowRight } from "lucide-react";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { toast } from "sonner";

const STARTERS = [
  "Draft a closing reply for Priya (Growth plan)",
  "Summarize today's hot leads",
  "Best time to send tomorrow's broadcast?",
  "Write a re-engagement message for cold leads",
];

export const AIAssistantPage = () => {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "Hi 👋 I'm Addison. Ask me anything about your inbox, leads, deals, or campaigns — I'll do the heavy lifting." },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          text: `Got it. Here's what I'd do for "${text}": prioritize the 3 highest-intent leads, draft a closing message in your voice, and queue the broadcast for 6:00 PM IST when open-rates peak.`,
        },
      ]);
      setThinking(false);
      toast.success("Addison drafted a plan ✨");
    }, 900);
  };

  return (
    <PageShell
      title="AI Assistant"
      subtitle="Your always-on co-pilot"
      icon={<Bot className="w-4 h-4" />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Chat panel */}
        <div className="lg:col-span-8 bg-card border border-border rounded-2xl flex flex-col overflow-hidden min-h-[560px]">
          <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-primary-soft/40 via-card to-accent-soft/30 flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-md shadow-primary/30">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
              <span className="absolute -inset-1 rounded-xl bg-primary/20 blur-md -z-10" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-bold leading-tight">Addison AI</p>
              <p className="text-[11px] text-success font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Online · Trained on your workspace
              </p>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] bg-gradient-to-r from-primary to-accent text-primary-foreground px-2 py-0.5 rounded">
              Smart
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}>
                  {m.role === "ai" && (
                    <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-primary mb-1 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> Addison
                    </p>
                  )}
                  {m.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
          </div>

          <div className="px-5 pt-3 pb-4 border-t border-border">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-[11px] font-semibold bg-primary-soft text-primary border border-primary/15 hover:bg-primary hover:text-primary-foreground rounded-full px-2.5 py-1 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex items-center gap-2 bg-muted/60 rounded-xl px-3 py-2 border border-border focus-within:border-primary/40 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Addison anything…"
                className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow text-primary-foreground flex items-center justify-center shadow-md shadow-primary/30 hover:scale-105 transition-transform"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Capabilities */}
        <div className="lg:col-span-4 space-y-3">
          {[
            { icon: Wand2, title: "Draft replies in your voice", body: "Tone-matched, price-aware, ready in 1.2s." },
            { icon: Zap, title: "Auto-prioritize hot leads", body: "Scores intent in real time and bubbles them up." },
            { icon: ArrowRight, title: "Suggest next best action", body: "Knows what to do next, every time." },
          ].map((c) => (
            <div key={c.title} className="bg-card border border-border rounded-2xl p-4 hover:border-primary/30 hover:shadow-md transition-all">
              <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center mb-2">
                <c.icon className="w-4 h-4" />
              </div>
              <p className="text-[13px] font-bold">{c.title}</p>
              <p className="text-[11.5px] text-muted-foreground mt-1 leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
};
