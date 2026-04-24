import { useEffect, useState } from "react";
import { Sparkles, X, Send, Flame, Bell, Zap, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  hotCount: number;
  pendingCount: number;
  onNavigate?: (page: string) => void;
};

const baseSuggestions = (hot: number, pending: number) => [
  {
    icon: Flame,
    title: hot > 0 ? `Reply to ${hot} hot lead${hot > 1 ? "s" : ""} now?` : "All hot leads are handled 🎉",
    sub: hot > 0 ? "Highest-intent buyers waiting" : "Check back in 30 minutes",
    action: "inbox",
    cta: "Open inbox",
    tone: "hot" as const,
  },
  {
    icon: Bell,
    title: pending > 0 ? `${pending} follow-up${pending > 1 ? "s" : ""} pending` : "No follow-ups overdue",
    sub: pending > 0 ? "Top priority: due in 2 hours" : "Your queue is clear",
    action: "followups",
    cta: "Review queue",
    tone: "warning" as const,
  },
  {
    icon: Zap,
    title: "Close deal with 1-click AI reply",
    sub: "Smart-suggest a closing message",
    action: "inbox",
    cta: "Try AI reply",
    tone: "primary" as const,
  },
];

export const AIAssistant = ({ hotCount, pendingCount, onNavigate }: Props) => {
  const [open, setOpen] = useState(false);
  const [hasUnseen, setHasUnseen] = useState(true);
  const suggestions = baseSuggestions(hotCount, pendingCount);

  useEffect(() => {
    if (open) setHasUnseen(false);
  }, [open]);

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground flex items-center justify-center shadow-2xl shadow-primary/40 hover:scale-105 transition-transform",
          !open && hasUnseen && "animate-glow-pulse"
        )}
        aria-label="Open AI Assistant"
      >
        {open ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
        {!open && hasUnseen && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-hot text-hot-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-background shadow">
            {Math.max(1, hotCount + (pendingCount > 0 ? 1 : 0))}
          </span>
        )}
      </button>

      {/* Panel */}
      <div
        className={cn(
          "fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl glass-strong shadow-2xl shadow-foreground/15 origin-bottom-right transition-all",
          open ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" : "opacity-0 scale-95 translate-y-2 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-foreground to-primary text-background p-4">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-glow/40 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-background/15 backdrop-blur flex items-center justify-center ring-1 ring-background/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold leading-tight">Addison AI</p>
              <p className="text-[11px] opacity-80 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Online · {suggestions.length} smart suggestions
              </p>
            </div>
          </div>
        </div>

        {/* Suggestions */}
        <div className="p-3 space-y-2 max-h-[360px] overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                if (onNavigate) onNavigate(s.action);
                toast.success(`${s.cta} →`, { description: s.title });
                setOpen(false);
              }}
              className="w-full text-left p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary-soft/40 hover:-translate-y-0.5 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm",
                    s.tone === "hot" && "bg-hot text-hot-foreground",
                    s.tone === "warning" && "bg-warning text-warning-foreground",
                    s.tone === "primary" && "bg-primary text-primary-foreground"
                  )}
                >
                  <s.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-bold leading-tight">{s.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.sub}</p>
                  <p className="text-[11px] font-bold text-primary mt-1.5 flex items-center gap-1 group-hover:gap-1.5 transition-all">
                    {s.cta} <ArrowRight className="w-3 h-3" />
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Composer */}
        <div className="p-3 border-t border-border">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const q = String(fd.get("q") || "").trim();
              if (!q) return;
              toast.success("Asked Addison AI", { description: q });
              (e.currentTarget as HTMLFormElement).reset();
            }}
            className="flex items-center gap-2 bg-muted/60 rounded-xl px-3 py-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <input
              name="q"
              placeholder="Ask Addison anything…"
              className="flex-1 bg-transparent outline-none text-[12.5px] placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary-glow text-primary-foreground flex items-center justify-center shadow-md shadow-primary/30 hover:scale-105 transition-transform"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
};
