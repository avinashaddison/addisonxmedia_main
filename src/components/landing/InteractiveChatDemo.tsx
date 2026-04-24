import { useEffect, useState } from "react";
import { Bot, CheckCheck, IndianRupee, Sparkles } from "lucide-react";

type Step =
  | { kind: "in"; text: string }
  | { kind: "typing" }
  | { kind: "out"; text: string; ai?: boolean }
  | { kind: "payment"; amount: string; from: string };

const SCRIPT: Step[] = [
  { kind: "in", text: "Hey! Saw your ad. What's the price for 100 students?" },
  { kind: "typing" },
  { kind: "out", text: "Hi Priya! Growth plan covers 100+ students at ₹2,499/mo. Want me to send the pay link? 💳", ai: true },
  { kind: "in", text: "Yes please send 🙏" },
  { kind: "typing" },
  { kind: "out", text: "Done! Sent UPI link → addisonx@upi · ₹2,499", ai: true },
  { kind: "payment", amount: "₹2,499", from: "Priya M." },
];

const STEP_DELAYS = [600, 900, 1200, 1100, 800, 1100, 900];

export const InteractiveChatDemo = () => {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (visible >= SCRIPT.length) {
      const reset = setTimeout(() => setVisible(0), 4500);
      return () => clearTimeout(reset);
    }
    const t = setTimeout(() => {
      // skip past typing immediately to next message
      setVisible((v) => v + 1);
    }, STEP_DELAYS[visible]);
    return () => clearTimeout(t);
  }, [visible]);

  const items = SCRIPT.slice(0, visible);

  return (
    <div className="bg-card border border-border rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden flex flex-col w-full max-w-[320px]">
      {/* header */}
      <div className="px-4 py-3 bg-card border-b border-border flex items-center gap-2.5">
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-hot-soft text-hot flex items-center justify-center text-[11px] font-bold">
            PM
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-card" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold flex items-center gap-1.5">
            Priya Mehta
            <span className="text-[9px] font-bold bg-hot text-hot-foreground px-1 py-0.5 rounded">HOT 92</span>
          </p>
          <p className="text-[10px] text-muted-foreground">+91 98xxx xxx12 · WhatsApp</p>
        </div>
      </div>

      {/* messages */}
      <div
        className="flex-1 px-3 py-3 space-y-2 min-h-[260px] max-h-[320px] overflow-hidden"
        style={{ background: "hsl(var(--chat-bg))" }}
      >
        {items.map((s, i) => {
          if (s.kind === "in") return <Bubble key={i} side="in">{s.text}</Bubble>;
          if (s.kind === "out")
            return (
              <Bubble key={i} side="out" ai={s.ai}>
                {s.text}
              </Bubble>
            );
          if (s.kind === "typing")
            return (
              <div key={i} className="flex justify-end animate-bubble-pop">
                <div className="bg-[hsl(var(--chat-outgoing))] rounded-xl rounded-br-sm px-3 py-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary mr-0.5" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            );
          // payment
          return (
            <div key={i} className="animate-bubble-pop">
              <div className="mt-2 rounded-xl border border-success/30 bg-success-soft p-3 flex items-center gap-2.5 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-success text-success-foreground flex items-center justify-center shadow-md shadow-success/40">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-success uppercase tracking-wider flex items-center gap-1">
                    <CheckCheck className="w-3 h-3" /> Payment received
                  </p>
                  <p className="text-[13px] font-bold text-foreground">
                    {s.amount} <span className="text-[11px] font-normal text-muted-foreground">from {s.from}</span>
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* footer */}
      <div className="px-3 py-2 bg-card border-t border-border">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Bot className="w-3 h-3 text-primary" />
          <span className="text-[9px] font-bold text-primary uppercase tracking-wider">AI is closing this deal</span>
        </div>
        <div className="flex gap-1.5">
          {["Send pay link 💳", "Schedule call"].map((s) => (
            <span
              key={s}
              className="text-[10px] font-semibold bg-primary-soft text-primary border border-primary/15 rounded-lg px-2 py-1"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const Bubble = ({ side, children, ai }: { side: "in" | "out"; children: React.ReactNode; ai?: boolean }) => (
  <div className={`flex ${side === "out" ? "justify-end" : "justify-start"} animate-bubble-pop`}>
    <div
      className={`max-w-[85%] rounded-xl px-3 py-1.5 text-[12px] leading-snug ${
        side === "out"
          ? "bg-[hsl(var(--chat-outgoing))] rounded-br-sm"
          : "bg-card shadow-sm rounded-bl-sm"
      }`}
    >
      {ai && (
        <p className="text-[9px] font-bold text-primary uppercase tracking-wider flex items-center gap-1 mb-0.5">
          <Sparkles className="w-2.5 h-2.5" />
          Addison AI
        </p>
      )}
      {children}
    </div>
  </div>
);
