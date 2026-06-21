import { MessageCircle, Bot, Send, Clock } from "lucide-react";

const STEPS = [
  { icon: MessageCircle, title: "WhatsApp connect karo", desc: "Apna number use karo ya green-tick verified number lo. Meta approval hum handle karte hain.", time: "10 minutes" },
  { icon: Bot, title: "Addison AI ko train karo", desc: "Product catalogue, FAQs, price list upload karo. Addison aapka tone minutes mein seekh leta hai.", time: "30 minutes" },
  { icon: Send, title: "Go live & bechna shuru karo", desc: "Existing customers ko broadcast bhejo, AI 24/7 reply de, UPI se payments aaye. Aap dashboard dekho.", time: "Same day" },
];

export default function HowItWorks() {
  return (
    <section className="py-16 lg:py-24 bg-[#0E8A4B] text-white relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="max-w-7xl mx-auto px-5 lg:px-8 relative">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <span className="inline-block px-3 py-1 bg-[#FFD23F] text-[#7A4A00] text-[11px] uppercase tracking-[0.2em] font-extrabold rounded-full mb-4">
            24 ghante mein live
          </span>
          <h2 className="text-3xl lg:text-5xl font-black tracking-tight leading-[1.05]">
            Signup se pehli sale tak — <span className="text-[#FFD23F]">sirf 3 steps</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="relative p-6 rounded-2xl bg-white text-foreground shadow-xl"
            >
              <div className="absolute -top-5 -left-3 w-12 h-12 rounded-2xl bg-[#FF6A1F] text-white flex items-center justify-center text-2xl font-black shadow-lg rotate-[-6deg]">
                {i + 1}
              </div>
              <div className="mt-3">
                <div className="w-12 h-12 rounded-xl bg-[#E6F7EE] flex items-center justify-center mb-4">
                  <s.icon className="w-6 h-6 text-[#0E8A4B]" strokeWidth={2.5} />
                </div>
                <h3 className="font-extrabold text-xl mb-2 tracking-tight">{s.title}</h3>
                <p className="text-sm text-foreground/70 leading-relaxed mb-4">{s.desc}</p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFD23F] text-[#7A4A00] text-[11px] font-extrabold">
                  <Clock className="w-3 h-3" /> {s.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
