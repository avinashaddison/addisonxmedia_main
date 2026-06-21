import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { Reveal } from "./Reveal";

const faqs = [
  {
    q: "What is AddisonX and how does it help Ranchi businesses?",
    a: "AddisonX is India's #1 AI-powered WhatsApp Business platform, built for Indian SMBs. Ranchi-based coaching centres, D2C brands, real-estate teams and clinics use AddisonX to handle WhatsApp leads through a shared inbox, reply in Hindi 24/7 with an AI agent, send broadcasts to thousands of customers, and collect UPI payments inside chat — all from one workspace.",
  },
  {
    q: "Does AddisonX support Hindi and other Indian languages?",
    a: "Haan. Addison AI Hindi mein natively fluent hai (Hinglish included), aur Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia, Urdu aur Assamese bhi support karta hai — total 12 Indian languages including English.",
  },
  {
    q: "Is AddisonX DPDP Act 2023 compliant and where is data hosted?",
    a: "Yes. AddisonX is fully DPDP Act 2023 compliant. Aapka customer data Mumbai ke Indian servers par hosted hai with sub-100ms latency from Ranchi, Bengaluru and Delhi. Consent flows and audit logs built-in hain.",
  },
  {
    q: "Can I collect UPI payments inside WhatsApp chat?",
    a: "Haan. AddisonX Razorpay, UPI, PhonePe, Paytm aur Cashfree ke saath integrate hota hai. Customer chat ke andar payment link tap kare aur UPI pe pay kar de — deal auto-reconcile ho jaata hai aur GST invoice automatic generate hota hai.",
  },
  {
    q: "How much does AddisonX cost in India?",
    a: "AddisonX ₹499/month se start hota hai solo founders aur kirana stores ke liye. Growth plan ₹1,999/month mein Addison AI, unlimited team members, broadcasts aur 11 Indian language support included hain. Enterprise plans dedicated CSM ke saath custom pricing par. Har plan ke saath GST invoice har mahine.",
  },
  {
    q: "Is there a free trial and do I need a credit card?",
    a: "Yes — 7-day free trial, koi credit card nahi chahiye. Setup 5 minutes mein ho jaata hai. Aapka WhatsApp Business account official Meta API ke through connect hota hai aur onboarding 24 ghante mein complete.",
  },
  {
    q: "Can I migrate from WATI, Interakt or AiSensy?",
    a: "Yes. AddisonX free migration deta hai WATI, Interakt, AiSensy aur doosre WhatsApp Business platforms se. Hum aapke templates, contacts aur broadcast history bilkul free move karte hain. Migration call website se book karein.",
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
