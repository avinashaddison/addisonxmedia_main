import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Sparkles,
  MessageCircle,
  Users,
  Bot,
  ArrowRight,
  Check,
  PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Props = {
  onNavigate: (page: string) => void;
};

const STORAGE_KEY = "addisonx-onboarded-v1";

const STEPS = [
  {
    icon: MessageCircle,
    badge: "Step 1",
    title: "Connect WhatsApp",
    body: "Link your WhatsApp Business number in seconds. Addison instantly starts tracking conversations, leads and replies — no setup gymnastics.",
    cta: "Connect WhatsApp",
    target: "integrations",
    accent: "from-emerald-500 to-emerald-400",
  },
  {
    icon: Users,
    badge: "Step 2",
    title: "Bring in your contacts",
    body: "Import your existing leads via CSV or sync from your CRM. Addison auto-tags hot leads and surfaces who needs a follow-up.",
    cta: "Import contacts",
    target: "contacts",
    accent: "from-orange-500 to-amber-400",
  },
  {
    icon: Bot,
    badge: "Step 3",
    title: "Meet Addison",
    body: "Your always-on AI co-pilot. Ask anything — draft replies, prioritize leads, suggest next-best-actions. She speaks in your voice.",
    cta: "Say hi to Addison",
    target: "ai-assistant",
    accent: "from-violet-500 to-fuchsia-400",
  },
];

export const OnboardingFlow = ({ onNavigate }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user) return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      // Slight delay so the dashboard appears first
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [user]);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      close();
      toast.success("Welcome aboard 🎉 Addison is ready when you are.");
    }
  };

  const skip = () => {
    close();
    toast("Tour skipped — you can revisit it anytime in Settings");
  };

  const goToStepTarget = () => {
    const target = STEPS[step].target;
    close();
    setTimeout(() => {
      onNavigate(target);
      toast.success(`Opening ${STEPS[step].title.toLowerCase()}…`);
    }, 200);
  };

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent
        className="max-w-xl p-0 overflow-hidden border-border bg-card"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Decorative top gradient */}
        <div className={cn("h-1.5 w-full bg-gradient-to-r", current.accent)} />

        <div className="px-7 pt-6 pb-7">
          {/* Brand row */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-md shadow-primary/30">
                <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="text-[12px] font-bold tracking-tight">AddisonX Media</span>
            </div>
            <button
              onClick={skip}
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip tour
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mb-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  i === step ? "w-10 bg-primary" : i < step ? "w-6 bg-primary/40" : "w-6 bg-muted"
                )}
              />
            ))}
            <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {current.badge} of {STEPS.length}
            </span>
          </div>

          {/* Hero icon */}
          <div className={cn(
            "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg mb-5 animate-scale-in",
            current.accent,
          )}>
            <Icon className="w-7 h-7 text-white" />
          </div>

          {/* Copy */}
          <h2 className="text-[24px] font-bold tracking-tight leading-tight mb-2 animate-fade-in">
            {current.title}
          </h2>
          <p className="text-[14px] text-muted-foreground leading-relaxed mb-6 animate-fade-in">
            {current.body}
          </p>

          {/* Quick benefits checklist */}
          <ul className="space-y-2 mb-7">
            {step === 0 && [
              "End-to-end encrypted, official WhatsApp Business API",
              "Live in under 2 minutes",
              "Two-way sync with your team inbox",
            ].map((t) => <Bullet key={t}>{t}</Bullet>)}
            {step === 1 && [
              "CSV, vCard or one-click CRM sync",
              "Smart de-duplication & tagging",
              "Auto-segments hot, warm and cold leads",
            ].map((t) => <Bullet key={t}>{t}</Bullet>)}
            {step === 2 && [
              "Drafts replies that sound like you",
              "Surfaces the highest-intent conversations first",
              "Available on every page — just hit ⌘K",
            ].map((t) => <Bullet key={t}>{t}</Bullet>)}
          </ul>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToStepTarget}
              className={cn(
                "flex-1 h-11 rounded-xl text-[13px] font-bold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-px bg-gradient-to-r flex items-center justify-center gap-2",
                current.accent
              )}
            >
              {current.cta}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              className="h-11 px-5 rounded-xl text-[13px] font-bold bg-muted hover:bg-muted/70 text-foreground transition-colors flex items-center gap-1.5"
            >
              {isLast ? (
                <>
                  Finish
                  <PartyPopper className="w-4 h-4" />
                </>
              ) : (
                <>Next</>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-2 text-[12.5px] text-foreground/85">
    <span className="mt-0.5 w-4 h-4 rounded-full bg-success-soft text-success flex items-center justify-center flex-shrink-0">
      <Check className="w-2.5 h-2.5" strokeWidth={3} />
    </span>
    <span>{children}</span>
  </li>
);
