import { Link } from "react-router-dom";
import {
  Crown,
  Shield,
  FileCheck2,
  Server,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  CheckCheck,
  Heart,
  Twitter,
  Linkedin,
  Youtube,
  Instagram,
  Facebook,
  Globe,
} from "lucide-react";
import { BrandLockup } from "@/components/brand/AddisonLogo";

export default function Footer() {
  return (
    <footer className="bg-[#0A3D24] text-white relative overflow-hidden">
      {/* Subtle pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#16C172]/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#FF6A1F]/10 rounded-full blur-[120px]" />

      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-14 relative">
        {/* ── ROW 1 — Brand on the left, contact strip filling the right space ── */}
        <div className="grid lg:grid-cols-12 gap-8 mb-12">
          {/* Brand info */}
          <div className="lg:col-span-4">
            <Link to="/" className="inline-flex items-center mb-6 pt-1" aria-label="Addison X Media home">
              <BrandLockup size={42} dark />
            </Link>

            <p className="text-sm text-white/75 leading-relaxed">
              India ka #1 AI-powered WhatsApp Business platform. Kirana se listed companies tak — 12,000+ businesses ne switch kiya hai.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-2 mt-5">
              {[
                { label: "Meta Partner", icon: Crown, bg: "bg-[#FFD23F]", text: "text-[#3D1A00]" },
                { label: "DPDP 2023", icon: Shield, bg: "bg-white", text: "text-[#0A3D24]" },
                { label: "GST Registered", icon: FileCheck2, bg: "bg-[#FF6A1F]", text: "text-white" },
                { label: "ISO 27001", icon: Server, bg: "bg-white", text: "text-[#0A3D24]" },
              ].map((b) => (
                <span
                  key={b.label}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${b.bg} ${b.text} text-[10px] font-extrabold uppercase tracking-wider`}
                >
                  <b.icon className="w-3 h-3" strokeWidth={2.5} />
                  {b.label}
                </span>
              ))}
            </div>
          </div>

          {/* Contact strip — fills the right-side empty space */}
          <div className="lg:col-span-8">
            {/* 4 contact cards in a horizontal grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              <a
                href="tel:+919709707311"
                className="group flex items-center gap-2.5 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#3C50E0]/50 transition"
              >
                <span className="w-10 h-10 rounded-lg bg-[#3C50E0] flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition">
                  <Phone className="w-4 h-4 text-white" strokeWidth={2.5} />
                </span>
                <span className="flex flex-col leading-tight min-w-0">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#FFD23F]/80">Call support</span>
                  <span className="text-[13px] font-extrabold text-white truncate">+91 97097 07311</span>
                </span>
              </a>

              <a
                href="https://wa.me/916206153116"
                className="group flex items-center gap-2.5 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#16C172]/50 transition"
              >
                <span className="w-10 h-10 rounded-lg bg-[#16C172] flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition">
                  <MessageCircle className="w-4 h-4 text-white" fill="currentColor" strokeWidth={0} />
                </span>
                <span className="flex flex-col leading-tight min-w-0">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#16C172]">WhatsApp</span>
                  <span className="text-[13px] font-extrabold text-white truncate">+91 62061 53116</span>
                </span>
              </a>

              <a
                href="mailto:Contact@addisonxmedia.com"
                className="group flex items-center gap-2.5 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#FF6A1F]/50 transition"
              >
                <span className="w-10 h-10 rounded-lg bg-[#FF6A1F] flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition">
                  <Mail className="w-4 h-4 text-white" strokeWidth={2.5} />
                </span>
                <span className="flex flex-col leading-tight min-w-0 flex-1">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#FF6A1F]">Support</span>
                  <span className="text-[12px] font-extrabold text-white truncate">Contact@addisonxmedia.com</span>
                </span>
              </a>

              <a
                href="mailto:Sales@addisonxmedia.com"
                className="group flex items-center gap-2.5 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#D4308E]/50 transition"
              >
                <span className="w-10 h-10 rounded-lg bg-[#D4308E] flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition">
                  <Mail className="w-4 h-4 text-white" strokeWidth={2.5} />
                </span>
                <span className="flex flex-col leading-tight min-w-0 flex-1">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#D4308E]">Sales</span>
                  <span className="text-[12px] font-extrabold text-white truncate">Sales@addisonxmedia.com</span>
                </span>
              </a>
            </div>

            {/* Address + GST in a horizontal row */}
            <div className="grid lg:grid-cols-[1fr_auto] gap-2.5 mt-2.5">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="w-10 h-10 rounded-lg bg-[#FFD23F] text-[#3D1A00] flex items-center justify-center flex-shrink-0 shadow-md">
                  <MapPin className="w-4 h-4" strokeWidth={2.5} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#FFD23F]/90 mb-0.5">Office address</p>
                  <p className="text-[12.5px] text-white font-semibold leading-relaxed">
                    Addison X Media Pvt. Ltd. · Itki Road, Piska More, 1st Floor,
                    Vaishwakarma Complex, Hehal, Ranchi 834005, Jharkhand
                  </p>
                </div>
              </div>

              <div className="flex items-stretch rounded-xl overflow-hidden border-2 border-[#FFD23F] shadow-[0_3px_0_0_#B8860B]">
                <span className="flex items-center gap-1.5 px-3 bg-gradient-to-br from-[#FFD23F] to-[#E8B400] text-[#3D1A00] text-[10px] font-black uppercase tracking-[0.18em]">
                  <CheckCheck className="w-3.5 h-3.5" strokeWidth={3} />
                  GST verified
                </span>
                <span className="px-3 flex items-center bg-white/5">
                  <span className="font-mono text-[12px] font-extrabold tracking-[0.1em] text-[#FFD23F]">20IARPK8159R1ZN</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── ROW 2 — Link columns, full width, 4 even columns ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 pt-10 border-t border-white/10">
          {[
            { title: "Product", links: ["Shared Inbox", "Broadcasts", "Addison AI", "Automation", "Pay-in-Chat", "Analytics", "Integrations", "WhatsApp API"] },
            { title: "Solutions", links: ["E-commerce & D2C", "Coaching & Tuition", "Clinics & Wellness", "Real Estate", "Salons & Spa", "Kirana & Retail", "Agencies", "Travel"] },
            { title: "Resources", links: ["Free Templates", "Hindi Playbooks", "Diwali Sale Kit", "WhatsApp Guide", "Pricing Calculator", "API Docs", "Case Studies", "Webinars"] },
            { title: "Company", links: ["About us", "Customers", "Careers (5)", "Press", "Partners", "Affiliates", "Contact", "Blog"] },
          ].map((col) => (
            <div key={col.title}>
              <p className="text-xs uppercase tracking-[0.2em] font-extrabold text-[#FFD23F] mb-5">{col.title}</p>
              <ul className="space-y-2.5 text-sm text-white/75 font-medium">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="hover:text-[#FF6A1F] hover:translate-x-0.5 transition inline-block">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Payment partners strip */}
      <div className="border-t border-white/10 relative">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-8">
          <p className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-white/60 mb-3">Payment partners · UPI ready</p>
          <div className="flex flex-wrap items-center gap-2.5">
            {[
              { name: "Razorpay", color: "text-[#0F3CC9]" },
              { name: "UPI", color: "text-[#0E8A4B]" },
              { name: "PhonePe", color: "text-[#5F259F]" },
              { name: "Paytm", color: "text-[#00B9F1]" },
              { name: "Cashfree", color: "text-[#0EAD69]" },
              { name: "Stripe India", color: "text-[#635BFF]" },
            ].map((p) => (
              <span key={p.name} className={`px-3 py-1.5 rounded-lg bg-white text-sm font-extrabold ${p.color}`}>
                {p.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Cities strip */}
      <div className="border-t border-white/10 relative">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-5 text-center">
          <p className="text-[10px] uppercase tracking-[0.22em] font-extrabold text-white/50 mb-2">Trusted across India</p>
          <p className="text-xs text-white/75 font-semibold leading-relaxed">
            Ranchi · Jamshedpur · Dhanbad · Bokaro · Mumbai · Bengaluru · Delhi NCR · Pune · Hyderabad · Chennai · Ahmedabad · Indore · Jaipur · Kochi · Surat · Lucknow · Kolkata · Coimbatore · Chandigarh · Patna
          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 bg-[#072917] relative">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-5 flex flex-col lg:flex-row items-center justify-between gap-4 text-xs">
          <p className="text-white/60 flex items-center gap-1.5 font-medium">
            © 2025 AddisonX Media Pvt. Ltd. · Made with
            <Heart className="w-3.5 h-3.5 inline text-[#FF6A1F]" fill="currentColor" strokeWidth={0} />
            in Ranchi & Bengaluru, India
          </p>

          {/* Social */}
          <div className="flex items-center gap-2">
            {[
              { icon: Twitter, label: "Twitter" },
              { icon: Linkedin, label: "LinkedIn" },
              { icon: Youtube, label: "YouTube" },
              { icon: Instagram, label: "Instagram" },
              { icon: Facebook, label: "Facebook" },
            ].map((s) => (
              <a
                key={s.label}
                href="#"
                aria-label={s.label}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-[#FF6A1F] flex items-center justify-center transition"
              >
                <s.icon className="w-4 h-4 text-white" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4 text-white/60 font-medium">
            <Link to="/privacy" className="hover:text-white transition">Privacy</Link>
            <Link to="/terms" className="hover:text-white transition">Terms</Link>
            <a href="#" className="hover:text-white transition">DPA</a>
            <a href="#" className="hover:text-white transition">Security</a>
            <a href="#" className="hover:text-white transition flex items-center gap-1">
              <Globe className="w-3 h-3" /> EN
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
