import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { Reveal } from "./Reveal";

const faqs = [
  {
    q: "How fast can I go live?",
    a: "Most teams are sending their first AI-powered reply within 2 minutes. Connect WhatsApp, import contacts (or skip), and you're live. No engineering required.",
  },
  {
    q: "Will the AI sound like a robot?",
    a: "No. Addison learns from your top-performing replies, your tone, your offers, and even your emojis. It can reply in Hindi, English, or Hinglish — and you approve every send (until you trust it).",
  },
  {
    q: "What does it integrate with?",
    a: "WhatsApp (Twilio + Meta Cloud API), Razorpay, Stripe, Shopify, Calendly, Google Sheets, Zapier, and 30+ more. Custom webhooks too.",
  },
  {
    q: "Is my data safe?",
    a: "End-to-end encrypted. Row-level isolated tenants. SOC 2 ready. Hosted on AWS Mumbai. We never train shared models on your data.",
  },
  {
    q: "What if I cancel?",
    a: "Cancel anytime, no questions asked. Export everything (chats, contacts, deals) as CSV/JSON. We don't lock you in.",
  },
  {
    q: "Do you offer a free trial?",
    a: "Yes — 14 days, full Growth plan, no credit card required. After that, pay only if you grew.",
  },
];

export const FAQSection = () => {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="max-w-4xl mx-auto px-6 py-20">
      <Reveal className="text-center mb-12">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">FAQ</span>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-3">Questions? We have answers.</h2>
      </Reveal>

      <div className="space-y-3">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <Reveal key={f.q} delay={i * 50}>
              <div
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isOpen
                    ? "border-primary/40 bg-card shadow-lg shadow-primary/10"
                    : "border-border bg-card hover:border-foreground/20"
                }`}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-bold text-[15px] tracking-tight">{f.q}</span>
                  <span
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isOpen ? "bg-primary text-primary-foreground rotate-180" : "bg-muted text-foreground"
                    }`}
                  >
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </span>
                </button>
                <div
                  className={`grid transition-all duration-300 ease-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-5 text-[14px] text-muted-foreground leading-relaxed">{f.a}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
};

export default FAQSection;
