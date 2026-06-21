import { Quote, TrendingUp } from "lucide-react";
import { paisleyBg } from "../shared";

const TESTIMONIALS = [
  {
    initials: "RM",
    name: "Rohit Mehta",
    role: "Founder, Mehta Tutorials · Indore",
    quote: "AddisonX ne 3 tools replace kar diye. WhatsApp revenue ₹40K se ₹3.2L per month ho gaya — 90 dino mein. AI alone 60% admissions close karta hai — Hindi mein, UPI pe, jab hum sote hain.",
    result: "8× revenue in 90 days",
  },
  {
    initials: "AS",
    name: "Anika Shah",
    role: "Co-founder, FabBox D2C · Mumbai",
    quote: "Diwali sale automatic chala. 18K broadcasts, 2,200 buyers wapas, ₹14L revenue — aur Addison ne har Hindi reply handle ki. Team logistics pe focus kar paayi.",
    result: "₹14L Diwali in one weekend",
  },
  {
    initials: "SS",
    name: "Sunita Sahu",
    role: "Founder, Jharkhand Tutorials · Ranchi",
    quote: "Ranchi mein 8 coaching centres chalate hain. Class 10 aur JEE batches ke admissions WhatsApp se aate the par track nahi ho rahe the. AddisonX ne Hindi mein parents se baat ki, fees UPI pe collect ki, aur poora Jharkhand ek inbox mein. Admissions 2.5x ho gaye.",
    result: "2.5× admissions in Jharkhand",
  },
];

export default function Testimonials() {
  return (
    <section className="py-20 lg:py-24 bg-[#FFF6E8] relative">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url("${paisleyBg}")`,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="max-w-7xl mx-auto px-5 lg:px-8 relative">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <span className="inline-block px-3 py-1 bg-[#0E8A4B] text-white text-[11px] uppercase tracking-[0.2em] font-extrabold rounded-full mb-4">
            Real founders, real ₹
          </span>
          <h2 className="text-3xl lg:text-5xl font-black tracking-tight leading-[1.05]">
            Ranchi se Bengaluru tak — <span className="text-[#FF6A1F]">asli kahaaniyan</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, k) => {
            const styles = [
              { bg: "bg-white", border: "border-[#0E8A4B]", shadow: "shadow-[0_6px_0_0_#0A6E3C]", rotate: "-rotate-[1deg]", accent: "text-[#0E8A4B]", chipBg: "bg-[#E6F7EE]", chipText: "text-[#0E8A4B]" },
              { bg: "bg-[#FF6A1F]", border: "border-[#FF6A1F]", shadow: "shadow-[0_6px_0_0_#B8420A]", rotate: "rotate-0", accent: "text-[#FFD23F]", chipBg: "bg-[#FFD23F]", chipText: "text-[#7A4A00]", inverted: true },
              { bg: "bg-white", border: "border-[#D4308E]", shadow: "shadow-[0_6px_0_0_#A11A6A]", rotate: "rotate-[1deg]", accent: "text-[#D4308E]", chipBg: "bg-[#FCE5F0]", chipText: "text-[#D4308E]" },
            ];
            const s = styles[k];
            return (
              <div
                key={k}
                className={`relative p-7 rounded-2xl border-2 ${s.border} ${s.bg} ${s.shadow} ${s.rotate} hover:translate-y-1 hover:shadow-[0_2px_0_0_currentColor] transition-all`}
              >
                <Quote className={`w-8 h-8 mb-4 ${s.inverted ? "text-white/40" : "text-foreground/15"}`} fill="currentColor" />
                <p className={`text-[15px] leading-relaxed mb-6 font-medium ${s.inverted ? "text-white" : "text-foreground"}`}>
                  {t.quote}
                </p>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-[#0E8A4B] to-[#16C172] flex items-center justify-center font-black text-white shadow-md text-sm`}>
                    {t.initials}
                  </div>
                  <div>
                    <p className={`font-extrabold text-sm ${s.inverted ? "text-white" : "text-foreground"}`}>{t.name}</p>
                    <p className={`text-xs ${s.inverted ? "text-white/80" : "text-muted-foreground"} font-medium`}>{t.role}</p>
                  </div>
                </div>
                <div className={`mt-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${s.chipBg} ${s.chipText} text-xs font-extrabold`}>
                  <TrendingUp className="w-3.5 h-3.5" /> {t.result}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
