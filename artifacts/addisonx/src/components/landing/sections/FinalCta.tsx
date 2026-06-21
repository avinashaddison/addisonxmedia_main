import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";

export default function FinalCta() {
  return (
    <section className="py-20 lg:py-28 bg-gradient-to-br from-[#B8230C] via-[#D63B14] to-[#FF6A1F] text-white relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "20px 20px",
        }}
      />
      {/* Marigold corner accents */}
      <div className="absolute top-8 left-8 w-24 h-24 bg-[#FFD23F]/30 rounded-full blur-2xl" />
      <div className="absolute bottom-8 right-8 w-32 h-32 bg-[#FFD23F]/30 rounded-full blur-2xl" />

      <div className="max-w-4xl mx-auto px-5 lg:px-8 text-center relative">
        <span className="inline-block px-3 py-1 bg-[#FFD23F] text-[#7A1500] text-[11px] uppercase tracking-[0.2em] font-extrabold rounded-full mb-5">
          Shubh aarambh
        </span>
        <h2 className="text-3xl lg:text-6xl font-black tracking-tight mb-5 leading-[1.02]">
          WhatsApp ko aapka <br />
          <span className="text-[#FFD23F]">#1 revenue channel</span> banao
        </h2>
        <p className="text-lg lg:text-xl opacity-95 mb-9 max-w-2xl mx-auto font-medium">
          12,000+ Indian businesses ne switch kiya hai. Aap kab? Free trial, no credit card, GST invoice included.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/auth"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-foreground font-extrabold text-base hover:bg-[#FFF6E8] transition shadow-[0_5px_0_0_rgba(0,0,0,0.3)] hover:shadow-[0_2px_0_0_rgba(0,0,0,0.3)] hover:translate-y-[3px]"
          >
            Free trial start karein
            <ArrowRight className="w-5 h-5" />
          </Link>
          <a
            href="https://wa.me/916206153116"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#0E8A4B] text-white font-extrabold text-base hover:bg-[#0A6E3C] transition shadow-[0_5px_0_0_#073D22] hover:shadow-[0_2px_0_0_#073D22] hover:translate-y-[3px]"
          >
            <MessageCircle className="w-5 h-5" fill="currentColor" strokeWidth={0} />
            WhatsApp pe baat karein
          </a>
        </div>
        <p className="mt-7 text-xs opacity-80 font-medium">No credit card · Setup in 5 min · Cancel anytime · GST invoice</p>
      </div>
    </section>
  );
}
