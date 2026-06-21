import { IndianRupee, Languages, FileCheck2, Shield, Server, Phone } from "lucide-react";
import { paisleyBg } from "../shared";

const INDIA_PILLARS = [
  {
    icon: IndianRupee,
    iconColor: "text-[#0E8A4B]",
    bgClass: "bg-[#E6F7EE]",
    borderClass: "border-[#0E8A4B]",
    title: "UPI in chat",
    desc: "Customers ek tap mein UPI, Razorpay ya PhonePe se pay karte hain — bina chat chode.",
  },
  {
    icon: Languages,
    iconColor: "text-[#FF6A1F]",
    bgClass: "bg-[#FFEFE0]",
    borderClass: "border-[#FF6A1F]",
    title: "Hindi + 11 भाषाएँ",
    desc: "Addison AI natively Hindi, Marathi, Tamil, Telugu, Bengali, Gujarati & more mein reply karta hai.",
  },
  {
    icon: FileCheck2,
    iconColor: "text-[#B8651A]",
    bgClass: "bg-[#FFF1D6]",
    borderClass: "border-[#E8B400]",
    title: "GST invoice har mahine",
    desc: "Auto-generated GST-compliant invoices. SaaS vendor se invoice maangne ki tension nahi.",
  },
  {
    icon: Shield,
    iconColor: "text-[#0E8A4B]",
    bgClass: "bg-[#E6F7EE]",
    borderClass: "border-[#0E8A4B]",
    title: "DPDP Act 2023 ready",
    desc: "Built-in consent flows, audit logs, Mumbai data residency — DPO assistance bhi included.",
  },
  {
    icon: Server,
    iconColor: "text-[#D4308E]",
    bgClass: "bg-[#FCE5F0]",
    borderClass: "border-[#D4308E]",
    title: "Servers Mumbai mein",
    desc: "Indian users ke liye lightning fast. Sub-100ms response — Mumbai, Bengaluru, Delhi se.",
  },
  {
    icon: Phone,
    iconColor: "text-[#3C50E0]",
    bgClass: "bg-[#E4E8FF]",
    borderClass: "border-[#3C50E0]",
    title: "Support aapke time zone mein",
    desc: "WhatsApp, phone & email support 9am–9pm IST. Signup ke 24 ghante mein onboarding call.",
  },
];

export default function IndiaPillars() {
  return (
    <section className="py-16 lg:py-24 bg-[#FFF6E8] relative">
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: `url("${paisleyBg}")`,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="max-w-7xl mx-auto px-5 lg:px-8 relative">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-block px-3 py-1 bg-[#FF6A1F] text-white text-[11px] uppercase tracking-[0.2em] font-extrabold rounded-full mb-4">
            India ke liye banaya hai
          </span>
          <h2 className="text-3xl lg:text-5xl font-black tracking-tight leading-[1.05]">
            Western tools ko translate nahi kiya — <span className="text-[#0E8A4B]">India se shuru kiya</span>
          </h2>
          <p className="text-muted-foreground mt-4 leading-relaxed font-medium">
            Har feature Indian SMBs ke liye design hua hai. Phone se kharidne wale customers, Hindi mein baat karne wale agents, GST chahne wale accountants — sabke liye.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {INDIA_PILLARS.map((p, idx) => (
            <div
              key={p.title}
              className={`group relative p-6 rounded-2xl border-2 ${p.borderClass} ${p.bgClass} hover:-translate-y-1 transition-all shadow-[0_4px_0_0_rgba(0,0,0,0.06)]`}
            >
              {idx === 0 && (
                <span className="absolute -top-2.5 right-4 px-2 py-0.5 bg-[#D4308E] text-white text-[9px] font-extrabold uppercase tracking-wider rounded-full rotate-[6deg] shadow">
                  Most loved
                </span>
              )}
              <div className={`w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-4 shadow-md`}>
                <p.icon className={`w-5 h-5 ${p.iconColor}`} strokeWidth={2.5} />
              </div>
              <h3 className="font-extrabold text-lg mb-2 tracking-tight">{p.title}</h3>
              <p className="text-sm text-foreground/70 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
