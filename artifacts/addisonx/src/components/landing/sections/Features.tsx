import { MessageCircle, Send, Bot, Zap, BarChart3, Workflow } from "lucide-react";

const FEATURES = [
  { icon: MessageCircle, title: "Shared Team Inbox", desc: "Poori team ek number se reply kare. Agents ko assign karo, internal notes likho, hot leads tag karo." },
  { icon: Send, title: "Bulk Broadcasts", desc: "Hindi & English templates segmented audiences ko bhejo. Diwali, Holi, Rakhi ke liye ready flows." },
  { icon: Bot, title: "Addison AI (Hindi-fluent)", desc: "24/7 AI aapke products & pricing par trained. Hinglish mein reply, appointments book, leads qualify." },
  { icon: Zap, title: "Pay-in-Chat", desc: "UPI, Razorpay, PhonePe, Paytm, Cashfree — chat ke andar ₹ collect karo. CRM mein auto-reconcile." },
  { icon: BarChart3, title: "Real-Time Analytics", desc: "Agent performance, campaign ROI in ₹, conversation insights. Daily WhatsApp briefing for owners." },
  { icon: Workflow, title: "No-code Automation", desc: "Cart recovery, lead nurture, payment reminders ke liye drag-drop workflows. Kisi bhi event par trigger." },
];

export default function Features() {
  return (
    <section className="py-16 lg:py-24 bg-[#FFF6E8]">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-block px-3 py-1 bg-[#D4308E] text-white text-[11px] uppercase tracking-[0.2em] font-extrabold rounded-full mb-4">
            Sab kuch ek jagah
          </span>
          <h2 className="text-3xl lg:text-5xl font-black tracking-tight leading-[1.05]">
            <span className="text-[#FF6A1F]">Bechna · Support · Scale</span><br />
            WhatsApp pe sab kuch
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, k) => {
            const tones = [
              { bg: "bg-white", border: "border-[#0E8A4B]", iconBg: "bg-[#E6F7EE]", iconColor: "text-[#0E8A4B]" },
              { bg: "bg-white", border: "border-[#FF6A1F]", iconBg: "bg-[#FFEFE0]", iconColor: "text-[#FF6A1F]" },
              { bg: "bg-white", border: "border-[#D4308E]", iconBg: "bg-[#FCE5F0]", iconColor: "text-[#D4308E]" },
              { bg: "bg-white", border: "border-[#3C50E0]", iconBg: "bg-[#E4E8FF]", iconColor: "text-[#3C50E0]" },
              { bg: "bg-white", border: "border-[#E8B400]", iconBg: "bg-[#FFF1D6]", iconColor: "text-[#B8651A]" },
              { bg: "bg-white", border: "border-[#0E8A4B]", iconBg: "bg-[#E6F7EE]", iconColor: "text-[#0E8A4B]" },
            ];
            const t = tones[k % tones.length];
            return (
              <div
                key={f.title}
                className={`group relative p-6 rounded-2xl border-2 ${t.border} ${t.bg} hover:-translate-y-1 transition-all shadow-[0_4px_0_0_rgba(0,0,0,0.06)]`}
              >
                <div className={`w-12 h-12 rounded-xl ${t.iconBg} flex items-center justify-center mb-4`}>
                  <f.icon className={`w-5 h-5 ${t.iconColor}`} strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-extrabold mb-2 tracking-tight">{f.title}</h3>
                <p className="text-sm text-foreground/70 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
