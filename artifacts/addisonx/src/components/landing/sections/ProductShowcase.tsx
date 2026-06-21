import { Check } from "lucide-react";

export default function ProductShowcase() {
  return (
    <section className="py-20 lg:py-24 bg-[#FFF6E8]">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 space-y-20">
        {/* Row 1: Shared Inbox */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          <div>
            <span className="inline-block px-3 py-1 bg-[#0E8A4B] text-white text-[11px] uppercase tracking-[0.2em] font-extrabold rounded-full mb-4">
              Shared inbox
            </span>
            <h3 className="text-3xl lg:text-4xl font-black tracking-tight mb-5 leading-[1.05]">
              Ek number, <span className="text-[#0E8A4B]">poori team</span>
            </h3>
            <p className="text-foreground/70 leading-relaxed mb-6 font-medium">
              Chats assign karo, internal notes likho, quick replies set karo. Koi bhi lead miss nahi hoga.
              2 logon se 200 tak ki team ke liye.
            </p>
            <ul className="space-y-3">
              {["Auto-assign rules ke through", "Internal notes & @mentions", "Tags, filters & saved views", "Mobile + web + desktop apps"].map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm font-medium">
                  <div className="w-5 h-5 rounded-full bg-[#0E8A4B] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
                  </div>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border-2 border-[#0E8A4B] bg-white p-5 shadow-[0_8px_0_0_#0A6E3C] -rotate-[1deg]">
            <div className="space-y-1.5">
              {[
                { name: "Priya Mehta", msg: "Yes please, share the link.", time: "2m", unread: 2, hot: true },
                { name: "Rohan Kumar", msg: "Done ✅", time: "5m", unread: 0 },
                { name: "Anjali Sharma", msg: "Kya kal baat ho sakti hai?", time: "12m", unread: 1 },
                { name: "Vikram Gupta", msg: "Sounds good!", time: "1h", unread: 0 },
                { name: "Neha Kapoor", msg: "₹1,200 payment received", time: "2h", unread: 0 },
              ].map((c, k) => (
                <div key={k} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#FFF6E8] transition cursor-pointer">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold text-white ${
                    ["bg-[#0E8A4B]", "bg-[#FF6A1F]", "bg-[#D4308E]", "bg-[#3C50E0]", "bg-[#B8651A]"][k]
                  }`}>
                    {c.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold truncate">{c.name}</p>
                      {c.hot && <span className="text-[9px] px-1.5 py-0.5 bg-[#FF6A1F] text-white rounded font-extrabold uppercase">Hot</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.msg}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">{c.time}</p>
                    {c.unread > 0 && <span className="inline-flex w-4 h-4 rounded-full bg-[#0E8A4B] text-white text-[9px] font-bold items-center justify-center">{c.unread}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Broadcasts */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          <div className="lg:order-2">
            <span className="inline-block px-3 py-1 bg-[#FF6A1F] text-white text-[11px] uppercase tracking-[0.2em] font-extrabold rounded-full mb-4">
              Broadcasts
            </span>
            <h3 className="text-3xl lg:text-4xl font-black tracking-tight mb-5 leading-[1.05]">
              <span className="text-[#FF6A1F]">10,000 customers</span> ko ek click mein
            </h3>
            <p className="text-foreground/70 leading-relaxed mb-6 font-medium">
              Approved Hindi & English templates segmented audiences ko bhejo. Opens, clicks, replies live track karo.
              Diwali, Holi, Rakhi ke liye ready-made flows.
            </p>
            <ul className="space-y-3">
              {["Template manager with WhatsApp approval", "Smart audience segments", "Click & reply analytics", "A/B testing built in"].map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm font-medium">
                  <div className="w-5 h-5 rounded-full bg-[#FF6A1F] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
                  </div>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:order-1 rounded-2xl border-2 border-[#FF6A1F] bg-white p-6 shadow-[0_8px_0_0_#B8420A] rotate-[1deg]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Diwali Sale 2025</p>
                <p className="text-2xl font-black">12,548 sent</p>
              </div>
              <span className="text-[10px] px-2 py-1 bg-[#0E8A4B] text-white rounded-full font-extrabold uppercase">Live</span>
            </div>
            <div className="space-y-3">
              {[
                { label: "Delivered", value: 12421, pct: 99 },
                { label: "Read", value: 9810, pct: 79 },
                { label: "Replied", value: 1842, pct: 15 },
                { label: "Converted (paid)", value: 412, pct: 3.3 },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground font-semibold">{m.label}</span>
                    <span className="font-extrabold">{m.value.toLocaleString("en-IN")} <span className="text-muted-foreground font-medium">({m.pct}%)</span></span>
                  </div>
                  <div className="h-2 rounded-full bg-[#FFF1D6] overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#FF6A1F] to-[#FFD23F] rounded-full" style={{ width: `${m.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 p-3 rounded-lg bg-[#E6F7EE] border-2 border-[#0E8A4B]">
              <p className="text-sm font-extrabold text-[#0E8A4B]">+ ₹3,42,500 revenue is sale se</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
