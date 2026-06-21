import { FAQSection } from "../FAQSection";

export default function Faq() {
  return (
    <section className="py-20 lg:py-24 bg-[#FFF6E8]">
      <div className="max-w-3xl mx-auto px-5 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 bg-[#0E8A4B] text-white text-[11px] uppercase tracking-[0.2em] font-extrabold rounded-full mb-4">
            FAQ
          </span>
          <h2 className="text-3xl lg:text-4xl font-black tracking-tight">Aapke savaal, hamare jawab</h2>
        </div>
        <FAQSection />
      </div>
    </section>
  );
}
