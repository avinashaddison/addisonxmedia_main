import type { FormEvent } from "react";
import { Mail, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { paisleyBg } from "../shared";

export default function Newsletter() {
  const handleTemplateSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("email") as HTMLInputElement | null;
    const email = input?.value?.trim() ?? "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Sahi email daalein");
      return;
    }
    toast.success("Templates ke liye WhatsApp khul raha hai…");
    window.open(
      `https://wa.me/916206153116?text=${encodeURIComponent(
        `Hi AddisonX! Mujhe 50+ Hindi WhatsApp templates chahiye. Mera email: ${email}`,
      )}`,
      "_blank",
      "noopener,noreferrer",
    );
    e.currentTarget.reset();
  };

  return (
    <section className="relative py-12 lg:py-16 bg-[#FFD23F] overflow-hidden border-y-2 border-[#E8B400]">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("${paisleyBg}")`,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="absolute -top-10 -right-10 w-48 h-48 bg-[#FF6A1F]/30 rounded-full blur-3xl" />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-[#0E8A4B]/20 rounded-full blur-3xl" />

      <div className="max-w-6xl mx-auto px-5 lg:px-8 relative grid lg:grid-cols-[1.3fr_1fr] gap-10 items-center">
        <div>
          <span className="inline-block px-3 py-1 bg-[#7A1500] text-white text-[10px] uppercase tracking-[0.2em] font-extrabold rounded-full mb-4">
            Muft mein · Free
          </span>
          <h3 className="text-2xl lg:text-4xl font-black tracking-tight leading-[1.05] text-[#3D1A00]">
            <span className="text-[#B8230C]">50+ Hindi WhatsApp templates</span> pack — Diwali, Holi, Rakhi sab ke liye
          </h3>
          <p className="mt-3 text-sm lg:text-base text-[#3D1A00]/80 font-medium max-w-xl">
            Founders ko ₹0 mein bhej rahe hain. Bas apna email do — turant inbox mein milega. 12,000+ businesses already grab kar chuke hain.
          </p>
        </div>

        <form onSubmit={handleTemplateSubmit} className="flex flex-col sm:flex-row gap-2.5 p-2 bg-white rounded-2xl shadow-[0_6px_0_0_#7A4A00] border-2 border-[#3D1A00]">
          <div className="flex-1 flex items-center px-3">
            <Mail className="w-4 h-4 text-[#FF6A1F] mr-2" />
            <input
              type="email"
              name="email"
              required
              placeholder="aapka@email.com"
              className="flex-1 py-2.5 bg-transparent text-sm font-semibold focus:outline-none placeholder:text-foreground/40"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-3 rounded-xl bg-[#FF6A1F] text-white font-extrabold text-sm hover:bg-[#E85C12] transition whitespace-nowrap inline-flex items-center gap-2"
          >
            Bhejo
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </section>
  );
}
