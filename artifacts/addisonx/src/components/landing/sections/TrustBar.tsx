export default function TrustBar() {
  return (
    <section className="bg-white border-y-2 border-[#E8B968]">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-10">
        <p className="text-center text-[11px] uppercase tracking-[0.22em] font-extrabold text-[#B8651A] mb-6">
          Payments partners · Trusted by 12,000+ businesses
        </p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-y-5 gap-x-6 items-center justify-items-center">
          {[
            { name: "Razorpay", color: "text-[#0F3CC9]" },
            { name: "UPI", color: "text-[#0E8A4B]" },
            { name: "PhonePe", color: "text-[#5F259F]" },
            { name: "Paytm", color: "text-[#00B9F1]" },
            { name: "Cashfree", color: "text-[#0EAD69]" },
            { name: "Shopify", color: "text-[#0E8A4B]" },
          ].map((b) => (
            <span key={b.name} className={`text-base md:text-lg font-extrabold tracking-tight ${b.color}`}>
              {b.name}
            </span>
          ))}
        </div>
        <p className="text-center text-[11px] uppercase tracking-[0.18em] font-bold text-muted-foreground mt-7 px-3">
          Ranchi · Jamshedpur · Dhanbad · Mumbai · Bengaluru · Delhi NCR · Pune · Hyderabad · Chennai · Ahmedabad · Indore · Jaipur · Kochi
        </p>
      </div>
    </section>
  );
}
