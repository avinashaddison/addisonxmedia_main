import { Check, Minus } from "lucide-react";

const COMPARISON: { cap: string; us: boolean; others: boolean; personal: boolean }[] = [
  { cap: "Official WhatsApp Business API", us: true, others: true, personal: false },
  { cap: "AI agent (replies in Hindi & Hinglish)", us: true, others: false, personal: false },
  { cap: "UPI / Razorpay payment links in chat", us: true, others: false, personal: false },
  { cap: "Pre-built festive templates (Diwali, Holi)", us: true, others: false, personal: false },
  { cap: "Free tier — no credit card, no time limit", us: true, others: false, personal: false },
  { cap: "Data hosted in Mumbai · DPDP-ready", us: true, others: false, personal: false },
  { cap: "GST invoice auto-generated", us: true, others: false, personal: false },
  { cap: "10,000 broadcasts in one click", us: true, others: true, personal: false },
];

export default function Comparison() {
  return (
    <section className="py-16 lg:py-20 bg-white border-y-2 border-[#E8B968]">
      <div className="max-w-5xl mx-auto px-5 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-10">
          <span className="inline-block px-3 py-1 bg-[#D4308E] text-white text-[11px] uppercase tracking-[0.2em] font-extrabold rounded-full mb-4">
            Comparison
          </span>
          <h2 className="text-3xl lg:text-4xl font-black tracking-tight leading-[1.05]">
            Ek tool — chaar tools ka kaam
          </h2>
          <p className="text-muted-foreground mt-3 font-medium">
            WATI, Interakt, AiSensy se migrate karna chahte ho? Free migration available.
          </p>
        </div>

        <div className="rounded-2xl border-2 border-[#E8B968] bg-white overflow-hidden shadow-xl">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] text-xs lg:text-sm">
            <div className="p-4 lg:p-5 bg-[#FFF1D6] font-extrabold text-foreground">Feature</div>
            <div className="p-4 lg:p-5 bg-[#0E8A4B] text-white font-extrabold text-center">AddisonX</div>
            <div className="p-4 lg:p-5 bg-[#FFF1D6] font-bold text-muted-foreground text-center">Other WA SaaS</div>
            <div className="p-4 lg:p-5 bg-[#FFF1D6] font-bold text-muted-foreground text-center">Personal WA</div>

            {COMPARISON.map((row, idx) => (
              <div key={row.cap} className="contents">
                <div className={`p-4 lg:p-5 ${idx % 2 ? "bg-white" : "bg-[#FFF6E8]"} font-semibold`}>{row.cap}</div>
                <div className={`p-4 lg:p-5 ${idx % 2 ? "bg-[#E6F7EE]" : "bg-[#E6F7EE]/70"} text-center`}>
                  {row.us ? <Check className="w-5 h-5 text-[#0E8A4B] inline" strokeWidth={3.5} /> : <Minus className="w-4 h-4 text-muted-foreground inline" />}
                </div>
                <div className={`p-4 lg:p-5 ${idx % 2 ? "bg-white" : "bg-[#FFF6E8]"} text-center text-muted-foreground`}>
                  {row.others ? <Check className="w-4 h-4 inline" /> : <Minus className="w-4 h-4 inline" />}
                </div>
                <div className={`p-4 lg:p-5 ${idx % 2 ? "bg-white" : "bg-[#FFF6E8]"} text-center text-muted-foreground`}>
                  {row.personal ? <Check className="w-4 h-4 inline" /> : <Minus className="w-4 h-4 inline" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
