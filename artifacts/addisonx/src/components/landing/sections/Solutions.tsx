import { ArrowRight, GraduationCap, ShoppingBag, Stethoscope, Building2 } from "lucide-react";

const USE_CASES = [
  { icon: GraduationCap, title: "Coaching & tuition", desc: "Ranchi, Jamshedpur aur Patna ke coaching centres ka favourite. Batches onboard karo, fee reminders bhejo, UPI se ₹ collect karo. IIT/NEET prep, schools, vocational." },
  { icon: ShoppingBag, title: "D2C & e-commerce", desc: "Abandoned carts recover, Hindi/English order updates, festive sales — Diwali, Rakhi, Holi. Pan-India shipping wale brands ke liye." },
  { icon: Stethoscope, title: "Clinics & wellness", desc: "Appointment booking, prescription refills, salon & spa reminders. Consent flows built in." },
  { icon: Building2, title: "Real estate", desc: "Ranchi, Dhanbad, Jamshedpur jaise tier-2 cities ke site-visit leads qualify karo, floor plans share, visits schedule." },
];

export default function Solutions() {
  return (
    <section className="py-16 lg:py-20 bg-white border-y-2 border-[#E8B968]">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="max-w-2xl mb-10">
          <span className="inline-block px-3 py-1 bg-[#FF6A1F] text-white text-[11px] uppercase tracking-[0.2em] font-extrabold rounded-full mb-4">
            Aapke business ke liye
          </span>
          <h2 className="text-3xl lg:text-4xl font-black tracking-tight leading-[1.05]">
            Edtech se kirana tak — AddisonX sab ke liye
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {USE_CASES.map((u, k) => {
            const bgs = ["bg-[#FFF1D6]", "bg-[#E6F7EE]", "bg-[#FCE5F0]", "bg-[#FFEFE0]"];
            return (
              <div
                key={u.title}
                className={`p-6 rounded-2xl ${bgs[k % bgs.length]} border-2 border-transparent hover:border-foreground/20 hover:-translate-y-1 transition-all shadow-sm`}
              >
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-4 shadow-md">
                  <u.icon className="w-6 h-6 text-foreground" strokeWidth={2.5} />
                </div>
                <h3 className="font-extrabold mb-1.5 tracking-tight">{u.title}</h3>
                <p className="text-xs text-foreground/70 leading-relaxed">{u.desc}</p>
                <p className="text-xs text-[#FF6A1F] font-extrabold mt-3 flex items-center gap-1">
                  Playbook dekho <ArrowRight className="w-3 h-3" />
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
