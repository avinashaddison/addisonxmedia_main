import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  MessageCircle,
  Sparkles,
  Zap,
  Star,
  Shield,
  Users,
  BarChart3,
  Bot,
  Send,
  ShoppingBag,
  GraduationCap,
  Stethoscope,
  Building2,
  Globe,
  PlayCircle,
  CheckCheck,
  Menu,
  X,
  Inbox,
  Megaphone,
  Workflow,
  LayoutGrid,
  ChevronDown,
  TrendingUp,
  Clock,
  Briefcase,
  Plane,
  ArrowUpRight,
  Languages,
  IndianRupee,
  FileCheck2,
  Server,
  Phone,
  Quote,
  Minus,
  Flame,
  Heart,
  Crown,
  Twitter,
  Linkedin,
  Youtube,
  Instagram,
  Facebook,
  Mail,
  MapPin,
  Smartphone,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { FAQSection } from "@/components/landing/FAQSection";

const HERO_ROTATING = [
  "Bharat ke",
  "tuition centers ke",
  "D2C brands ke",
  "kirana stores ke",
  "clinics & salons ke",
  "real estate teams ke",
];

const useRotator = (items: string[], interval = 2400) => {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % items.length), interval);
    return () => clearInterval(t);
  }, [items.length, interval]);
  return items[i];
};

const useForceLight = () => {
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => {
      if (wasDark) root.classList.add("dark");
    };
  }, []);
};

/* Subtle Indian-inspired pattern SVG (jali/lattice motif) */
const paisleyBg =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'><g fill='none' stroke='%23B8651A' stroke-width='1' opacity='0.18'><circle cx='30' cy='30' r='12'/><path d='M30 18 Q42 30 30 42 Q18 30 30 18Z'/><circle cx='30' cy='30' r='3'/></g></svg>";

export default function Landing() {
  useForceLight();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const rotating = useRotator(HERO_ROTATING);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#FFF6E8] text-foreground antialiased overflow-x-hidden">
      {/* ============== FESTIVAL OFFER BAR ============== */}
      <div className="bg-gradient-to-r from-[#B8230C] via-[#D63B14] to-[#B8230C] text-white text-[12px] py-2 px-5 text-center font-semibold relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "12px 12px",
        }} />
        <span className="relative inline-flex items-center gap-2 flex-wrap justify-center">
          <span className="px-1.5 py-0.5 rounded bg-[#FFD23F] text-[#7A1500] text-[10px] font-extrabold uppercase tracking-wider">DIWALI OFFER</span>
          <span>3 months free on annual plans · GST invoice included · Limited time</span>
          <Link to="/auth" className="underline underline-offset-2 font-bold inline-flex items-center gap-0.5">
            Claim now <ArrowUpRight className="w-3 h-3" />
          </Link>
        </span>
      </div>

      {/* ============== NAV ============== */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#FFF6E8]/95 backdrop-blur-xl border-b-2 border-[#E8B968] shadow-sm"
            : "bg-[#FFF6E8]/60 backdrop-blur-md border-b border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#0E8A4B] to-[#16C172] flex items-center justify-center shadow-md shadow-[#0E8A4B]/30 group-hover:shadow-[#0E8A4B]/50 transition-shadow">
              <MessageCircle className="w-5 h-5 text-white" fill="currentColor" strokeWidth={0} />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#FF6A1F] rounded-full border-2 border-[#FFF6E8]" />
            </div>
            <div className="leading-tight">
              <span className="font-extrabold text-[18px] tracking-tight block">AddisonX</span>
              <span className="text-[9px] uppercase tracking-[0.18em] text-[#B8651A] font-bold">WhatsApp Suite · भारत</span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 text-sm font-semibold">
            <div
              className="relative"
              onMouseEnter={() => setProductOpen(true)}
              onMouseLeave={() => setProductOpen(false)}
            >
              <button className="px-3 py-2 rounded-lg text-foreground/70 hover:text-foreground hover:bg-[#FFE8C7] transition flex items-center gap-1">
                Product <ChevronDown className={`w-3.5 h-3.5 transition-transform ${productOpen ? "rotate-180" : ""}`} />
              </button>
              {productOpen && (
                <div className="absolute top-full left-0 pt-2 w-[580px] animate-fade-in">
                  <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-2xl p-2 grid grid-cols-2 gap-1">
                    {[
                      { icon: Inbox, title: "Shared Inbox", desc: "Ek number, poori team", color: "text-[#0E8A4B]", bg: "bg-[#E6F7EE]" },
                      { icon: Bot, title: "Addison AI", desc: "Hindi · Hinglish · 11 भाषाएँ", color: "text-[#FF6A1F]", bg: "bg-[#FFEFE0]" },
                      { icon: Megaphone, title: "Broadcasts", desc: "10K customers, 1 click", color: "text-[#D4308E]", bg: "bg-[#FCE5F0]" },
                      { icon: Workflow, title: "Automation", desc: "No-code workflows", color: "text-[#0E8A4B]", bg: "bg-[#E6F7EE]" },
                      { icon: IndianRupee, title: "Pay-in-Chat", desc: "UPI · Razorpay · PhonePe", color: "text-[#B8651A]", bg: "bg-[#FFF1D6]" },
                      { icon: BarChart3, title: "Analytics", desc: "Revenue per agent in ₹", color: "text-[#FF6A1F]", bg: "bg-[#FFEFE0]" },
                    ].map((p, k) => (
                      <a
                        key={k}
                        href="#features"
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#FFF6E8] transition group"
                      >
                        <div className={`w-10 h-10 rounded-lg ${p.bg} flex items-center justify-center flex-shrink-0`}>
                          <p.icon className={`w-4 h-4 ${p.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-foreground flex items-center gap-1 group-hover:gap-1.5 transition-all">
                            {p.title} <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{p.desc}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              className="relative"
              onMouseEnter={() => setSolutionsOpen(true)}
              onMouseLeave={() => setSolutionsOpen(false)}
            >
              <button className="px-3 py-2 rounded-lg text-foreground/70 hover:text-foreground hover:bg-[#FFE8C7] transition flex items-center gap-1">
                Solutions <ChevronDown className={`w-3.5 h-3.5 transition-transform ${solutionsOpen ? "rotate-180" : ""}`} />
              </button>
              {solutionsOpen && (
                <div className="absolute top-full left-0 pt-2 w-[320px] animate-fade-in">
                  <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-2xl p-2">
                    {[
                      { icon: ShoppingBag, label: "E-commerce & D2C", desc: "Recover carts, ship fast" },
                      { icon: GraduationCap, label: "Coaching & Tuition", desc: "Admissions on autopilot" },
                      { icon: Stethoscope, label: "Clinics & Wellness", desc: "Bookings & reminders" },
                      { icon: Briefcase, label: "Agencies", desc: "Manage 100s of clients" },
                      { icon: Plane, label: "Travel & Hospitality", desc: "Itineraries & rebooking" },
                    ].map((s, k) => (
                      <a key={k} href="#solutions" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#FFF6E8] transition">
                        <div className="w-8 h-8 rounded-lg bg-[#FFE8C7] flex items-center justify-center">
                          <s.icon className="w-4 h-4 text-foreground" />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold">{s.label}</p>
                          <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <a href="#how" className="px-3 py-2 rounded-lg text-foreground/70 hover:text-foreground hover:bg-[#FFE8C7] transition">How it works</a>
            <a href="#pricing" className="px-3 py-2 rounded-lg text-foreground/70 hover:text-foreground hover:bg-[#FFE8C7] transition">Pricing</a>
            <a href="#faq" className="px-3 py-2 rounded-lg text-foreground/70 hover:text-foreground hover:bg-[#FFE8C7] transition">Resources</a>
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            {user ? (
              <Link to="/app" className="text-sm font-bold px-4 py-2 rounded-lg bg-[#0E8A4B] text-white hover:bg-[#0A6E3C] transition shadow-sm">
                Open dashboard
              </Link>
            ) : (
              <>
                <a href="tel:+918045678910" className="text-sm font-semibold text-foreground hover:text-[#FF6A1F] transition px-3 py-2 inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> +91 80-4567-8910
                </a>
                <Link to="/auth" className="text-sm font-semibold text-foreground/70 hover:text-foreground transition px-3 py-2">
                  Sign in
                </Link>
                <Link
                  to="/auth"
                  className="group text-sm font-extrabold pl-4 pr-3 py-2.5 rounded-xl bg-[#FF6A1F] text-white hover:bg-[#E85C12] transition shadow-[0_4px_0_0_#B8420A] hover:shadow-[0_2px_0_0_#B8420A] hover:translate-y-[2px] inline-flex items-center gap-1.5"
                >
                  Free trial
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </>
            )}
          </div>

          <button className="lg:hidden p-2 -mr-2" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t-2 border-[#E8B968] bg-[#FFF6E8] px-5 py-4 space-y-1 text-sm font-semibold animate-fade-in">
            <a href="#product" className="block py-2.5 px-2 rounded-lg hover:bg-[#FFE8C7]">Product</a>
            <a href="#solutions" className="block py-2.5 px-2 rounded-lg hover:bg-[#FFE8C7]">Solutions</a>
            <a href="#how" className="block py-2.5 px-2 rounded-lg hover:bg-[#FFE8C7]">How it works</a>
            <a href="#pricing" className="block py-2.5 px-2 rounded-lg hover:bg-[#FFE8C7]">Pricing</a>
            <a href="#faq" className="block py-2.5 px-2 rounded-lg hover:bg-[#FFE8C7]">Resources</a>
            <div className="pt-3 mt-3 border-t border-[#E8B968] space-y-2">
              <Link to="/auth" className="block py-2.5 px-3 rounded-lg border-2 border-[#E8B968] text-center font-bold">
                Sign in
              </Link>
              <Link to="/auth" className="block py-3 px-4 bg-[#FF6A1F] text-white rounded-xl text-center font-extrabold shadow-[0_4px_0_0_#B8420A]">
                Start free trial
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ============== HERO ============== */}
      <section className="relative">
        {/* Warm saffron-cream background with subtle paisley */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div
            className="absolute inset-0 opacity-100"
            style={{
              backgroundImage: `url("${paisleyBg}")`,
              backgroundSize: "60px 60px",
            }}
          />
          <div className="absolute top-[-15%] left-[-5%] w-[600px] h-[600px] bg-[#FFD23F]/30 rounded-full blur-[140px]" />
          <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-[#FF6A1F]/20 rounded-full blur-[140px]" />
          <div className="absolute bottom-[-10%] left-[30%] w-[500px] h-[500px] bg-[#0E8A4B]/15 rounded-full blur-[140px]" />
        </div>

        <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-10 lg:pt-14 pb-12 lg:pb-16 grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-12 items-center">
          {/* Left: copy */}
          <div>
            {/* Top sticker badges */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="inline-flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full bg-white border-2 border-[#0E8A4B] text-xs font-bold shadow-sm">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#0E8A4B] text-white text-[10px] uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" /> Live
                </span>
                <span className="text-foreground">Official WhatsApp Business API</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFD23F] text-[#7A4A00] text-[11px] font-bold border-2 border-[#E8B400] shadow-sm">
                <Crown className="w-3 h-3" /> Meta Business Partner
              </span>
            </div>

            <h1 className="text-[2.7rem] sm:text-5xl lg:text-[4.4rem] font-black tracking-[-0.03em] leading-[0.98] text-foreground">
              <span
                key={rotating}
                className="text-[#FF6A1F] inline-block animate-fade-in"
              >
                {rotating}
              </span>{" "}
              business ko
              <br />
              WhatsApp pe{" "}
              <span className="relative inline-block whitespace-nowrap">
                <span className="bg-gradient-to-r from-[#0E8A4B] via-[#16C172] to-[#0E8A4B] bg-clip-text text-transparent">bikri</span>
                <svg className="absolute -bottom-2 left-0 w-full" height="14" viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M2 9 Q 50 2, 100 8 T 198 6" stroke="#FF6A1F" strokeWidth="4" fill="none" strokeLinecap="round" />
                </svg>
              </span>{" "}
              karwao.
            </h1>

            <p className="mt-7 text-lg lg:text-xl text-foreground/75 leading-relaxed max-w-xl font-medium">
              Ek shared inbox · AI jo Hindi mein reply kare · 10,000 customers ko broadcast · UPI payment chat mein.
              Sab kuch ek hi tool mein. <span className="font-bold text-foreground">12,000+ Indian businesses</span> ne switch kiya hai.
            </p>

            {/* CTA row */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-lg">
              <Link
                to="/auth"
                className="group inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[#FF6A1F] text-white font-extrabold text-base hover:bg-[#E85C12] transition shadow-[0_5px_0_0_#B8420A] hover:shadow-[0_2px_0_0_#B8420A] hover:translate-y-[3px]"
              >
                Free trial start karein
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a
                href="https://wa.me/918045678910"
                className="group inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white border-2 border-[#0E8A4B] text-[#0E8A4B] font-extrabold text-base hover:bg-[#E6F7EE] transition"
              >
                <MessageCircle className="w-4 h-4" fill="currentColor" strokeWidth={0} />
                WhatsApp pe baat karein
              </a>
            </div>

            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-foreground/80 font-semibold">
              <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#0E8A4B]" strokeWidth={3} /> 7-day free trial</li>
              <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#0E8A4B]" strokeWidth={3} /> Credit card nahi chahiye</li>
              <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#0E8A4B]" strokeWidth={3} /> 5 min mein setup</li>
              <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#0E8A4B]" strokeWidth={3} /> GST invoice</li>
            </ul>

            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {["PM", "RK", "AS", "VG", "NK"].map((i, k) => (
                    <div
                      key={k}
                      className={`w-10 h-10 rounded-full border-[3px] border-[#FFF6E8] flex items-center justify-center text-[11px] font-extrabold text-white shadow-md ${
                        ["bg-[#0E8A4B]", "bg-[#FF6A1F]", "bg-[#D4308E]", "bg-[#3C50E0]", "bg-[#B8651A]"][k]
                      }`}
                    >
                      {i}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, k) => (
                      <Star key={k} className="w-4 h-4 fill-[#FFD23F] text-[#FFD23F]" />
                    ))}
                    <span className="ml-1.5 font-extrabold text-sm">4.9/5</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">1,200+ reviews on G2 & Capterra</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Phone mockup + floating stickers */}
          <div className="relative flex justify-center lg:justify-end">
            {/* Yellow burst behind phone */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <SunBurst />
            </div>

            <PhoneMockup />

            {/* Floating sticker: Revenue */}
            <div className="hidden lg:flex absolute -left-2 top-12 bg-white border-2 border-[#0E8A4B] rounded-2xl shadow-xl p-3 w-52 items-start gap-3 z-10 -rotate-[3deg]">
              <div className="w-10 h-10 rounded-lg bg-[#E6F7EE] flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-[#0E8A4B]" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground">Aaj ki kamai</p>
                <p className="text-2xl font-black text-foreground tabular-nums leading-tight">₹47,250</p>
                <p className="text-[10px] text-[#0E8A4B] font-bold flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" /> +312% vs last week
                </p>
              </div>
            </div>

            {/* Floating sticker: UPI paid */}
            <div className="hidden lg:flex absolute -right-2 bottom-24 bg-[#0E8A4B] text-white rounded-2xl shadow-xl p-3 w-44 items-start gap-3 z-10 rotate-[4deg]">
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <IndianRupee className="w-4.5 h-4.5 text-white" strokeWidth={3} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider font-extrabold opacity-90">UPI received</p>
                <p className="text-xl font-black tabular-nums leading-tight">₹8,500</p>
                <p className="text-[10px] opacity-80">12 seconds ago</p>
              </div>
            </div>

            {/* Floating sticker: AI badge */}
            <div className="hidden lg:flex absolute right-4 top-4 bg-[#FFD23F] text-[#7A4A00] rounded-full shadow-lg pl-1.5 pr-3 py-1.5 items-center gap-2 z-10 -rotate-[6deg] border-2 border-[#E8B400]">
              <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-[#FF6A1F]" strokeWidth={2.5} />
              </span>
              <span className="text-[11px] font-extrabold">AI ne 60% sales kiya</span>
            </div>

            {/* Floating sticker: ribbon */}
            <div className="hidden lg:flex absolute -left-4 bottom-32 bg-[#D4308E] text-white rounded-lg shadow-lg px-3 py-1.5 z-10 rotate-[-8deg]">
              <p className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-3 h-3" /> 1.4s avg reply
              </p>
            </div>
          </div>
        </div>

        {/* Stats poster strip */}
        <div className="max-w-7xl mx-auto px-5 lg:px-8 pb-12 lg:pb-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[
              { val: "12,000+", label: "Indian businesses", icon: Building2, bg: "bg-[#FFF1D6]", border: "border-[#E8B968]", color: "text-[#B8651A]" },
              { val: "4.8Cr+", label: "Messages / month", icon: MessageCircle, bg: "bg-[#E6F7EE]", border: "border-[#0E8A4B]", color: "text-[#0E8A4B]" },
              { val: "1.4s", label: "Avg AI reply", icon: Clock, bg: "bg-[#FCE5F0]", border: "border-[#D4308E]", color: "text-[#D4308E]" },
              { val: "₹84Cr+", label: "Closed in chat", icon: CheckCheck, bg: "bg-[#FFEFE0]", border: "border-[#FF6A1F]", color: "text-[#FF6A1F]" },
            ].map((s, k) => (
              <div key={k} className={`p-4 lg:p-5 rounded-2xl bg-white border-2 ${s.border} flex items-center gap-3 shadow-[0_4px_0_0_rgba(0,0,0,0.05)]`}>
                <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-2xl lg:text-[1.7rem] font-black text-foreground tabular-nums tracking-tight leading-tight">{s.val}</p>
                  <p className="text-[11px] lg:text-xs text-muted-foreground font-semibold">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== TRUST BAR: Payment partners + cities ============== */}
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
            Mumbai · Bengaluru · Delhi NCR · Pune · Hyderabad · Chennai · Ahmedabad · Indore · Jaipur · Kochi
          </p>
        </div>
      </section>

      {/* ============== INDIA KE LIYE BANAYA HAI ============== */}
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

      {/* ============== HOW IT WORKS (3 STEPS) ============== */}
      <section id="how" className="py-16 lg:py-24 bg-[#0E8A4B] text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="max-w-7xl mx-auto px-5 lg:px-8 relative">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <span className="inline-block px-3 py-1 bg-[#FFD23F] text-[#7A4A00] text-[11px] uppercase tracking-[0.2em] font-extrabold rounded-full mb-4">
              24 ghante mein live
            </span>
            <h2 className="text-3xl lg:text-5xl font-black tracking-tight leading-[1.05]">
              Signup se pehli sale tak — <span className="text-[#FFD23F]">sirf 3 steps</span>
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="relative p-6 rounded-2xl bg-white text-foreground shadow-xl"
              >
                <div className="absolute -top-5 -left-3 w-12 h-12 rounded-2xl bg-[#FF6A1F] text-white flex items-center justify-center text-2xl font-black shadow-lg rotate-[-6deg]">
                  {i + 1}
                </div>
                <div className="mt-3">
                  <div className="w-12 h-12 rounded-xl bg-[#E6F7EE] flex items-center justify-center mb-4">
                    <s.icon className="w-6 h-6 text-[#0E8A4B]" strokeWidth={2.5} />
                  </div>
                  <h3 className="font-extrabold text-xl mb-2 tracking-tight">{s.title}</h3>
                  <p className="text-sm text-foreground/70 leading-relaxed mb-4">{s.desc}</p>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFD23F] text-[#7A4A00] text-[11px] font-extrabold">
                    <Clock className="w-3 h-3" /> {s.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== FEATURES GRID (colorful blocks) ============== */}
      <section id="features" className="py-16 lg:py-24 bg-[#FFF6E8]">
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

      {/* ============== SOLUTIONS / USE CASES ============== */}
      <section id="solutions" className="py-16 lg:py-20 bg-white border-y-2 border-[#E8B968]">
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

      {/* ============== PRODUCT SHOWCASE ============== */}
      <section id="product" className="py-20 lg:py-24 bg-[#FFF6E8]">
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

      {/* ============== COMPARISON ============== */}
      <section className="py-16 lg:py-20 bg-white border-y-2 border-[#E8B968]">
        <div className="max-w-5xl mx-auto px-5 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-10">
            <span className="inline-block px-3 py-1 bg-[#D4308E] text-white text-[11px] uppercase tracking-[0.2em] font-extrabold rounded-full mb-4">
              Comparison
            </span>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight leading-[1.05]">
              Ek tool — chaar tools ka kaam
            </h2>
            <p className="text-muted-foreground mt-3 font-medium">
              WATI, Interakt, AiSensy se migrate karna chahte ho? Free migration available.
            </p>
          </div>

          <div className="rounded-2xl border-2 border-[#E8B968] bg-white overflow-hidden shadow-xl">
            <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] text-xs lg:text-sm">
              <div className="p-4 lg:p-5 bg-[#FFF1D6] font-extrabold text-foreground">Feature</div>
              <div className="p-4 lg:p-5 bg-[#0E8A4B] text-white font-extrabold text-center">AddisonX</div>
              <div className="p-4 lg:p-5 bg-[#FFF1D6] font-bold text-muted-foreground text-center">Other WA SaaS</div>
              <div className="p-4 lg:p-5 bg-[#FFF1D6] font-bold text-muted-foreground text-center">Personal WA</div>

              {COMPARISON.map((row, idx) => (
                <div key={row.cap} className="contents">
                  <div className={`p-4 lg:p-5 ${idx % 2 ? "bg-white" : "bg-[#FFF6E8]"} font-semibold`}>{row.cap}</div>
                  <div className={`p-4 lg:p-5 ${idx % 2 ? "bg-[#E6F7EE]" : "bg-[#E6F7EE]/70"} text-center`}>
                    {row.us ? <Check className="w-5 h-5 text-[#0E8A4B] inline" strokeWidth={3.5} /> : <Minus className="w-4 h-4 text-muted-foreground inline" />}
                  </div>
                  <div className={`p-4 lg:p-5 ${idx % 2 ? "bg-white" : "bg-[#FFF6E8]"} text-center text-muted-foreground`}>
                    {row.others ? <Check className="w-4 h-4 inline" /> : <Minus className="w-4 h-4 inline" />}
                  </div>
                  <div className={`p-4 lg:p-5 ${idx % 2 ? "bg-white" : "bg-[#FFF6E8]"} text-center text-muted-foreground`}>
                    {row.personal ? <Check className="w-4 h-4 inline" /> : <Minus className="w-4 h-4 inline" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============== TESTIMONIALS POSTER ============== */}
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
              Indore se Bengaluru tak — <span className="text-[#FF6A1F]">asli kahaaniyan</span>
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

      {/* ============== PRICING — POSTER STYLE ============== */}
      <section id="pricing" className="py-20 lg:py-24 bg-white border-y-2 border-[#E8B968]">
        <div className="max-w-6xl mx-auto px-5 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block px-3 py-1 bg-[#FFD23F] text-[#7A4A00] text-[11px] uppercase tracking-[0.2em] font-extrabold rounded-full mb-4">
              ₹ mein pricing · Saaf-saaf
            </span>
            <h2 className="text-3xl lg:text-5xl font-black tracking-tight leading-[1.05] mb-3">
              Simple plans, no surprises
            </h2>
            <p className="text-muted-foreground font-medium">Free start karo · Jab grow ho, upgrade karo · GST invoice har mahine</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mt-8">
            {PLANS.map((p, k) => (
              <div
                key={p.name}
                className={`relative p-7 rounded-2xl bg-white transition-all border-2 ${
                  p.featured
                    ? "border-[#0E8A4B] shadow-[0_8px_0_0_#0A6E3C] lg:scale-105 lg:-rotate-[0.5deg]"
                    : "border-[#E8B968] shadow-[0_4px_0_0_#E8B968] hover:-translate-y-1"
                }`}
              >
                {p.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#FF6A1F] text-white text-[10px] font-extrabold uppercase tracking-wider rounded-full shadow-md flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Most popular
                  </span>
                )}
                <h3 className="font-extrabold text-xl tracking-tight">{p.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{p.tag}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-black tracking-tight text-foreground">{p.price}</span>
                  <span className="text-sm text-muted-foreground font-semibold">/mo</span>
                </div>
                <Link
                  to="/auth"
                  className={`mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-extrabold text-sm transition ${
                    p.featured
                      ? "bg-[#FF6A1F] text-white hover:bg-[#E85C12] shadow-[0_4px_0_0_#B8420A] hover:shadow-[0_2px_0_0_#B8420A] hover:translate-y-[2px]"
                      : "bg-[#FFF1D6] text-foreground hover:bg-[#FFE8C7]"
                  }`}
                >
                  {p.cta}
                </Link>
                <ul className="mt-6 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground/80 font-medium">
                      <div className="w-4 h-4 rounded-full bg-[#0E8A4B] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                      </div>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8 font-medium">
            Sab plans mein unlimited team members (Growth se) · WhatsApp BSP fees at cost · No setup fees
          </p>
        </div>
      </section>

      {/* ============== FAQ ============== */}
      <section id="faq" className="py-20 lg:py-24 bg-[#FFF6E8]">
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

      {/* ============== FINAL CTA — DIWALI POSTER STYLE ============== */}
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
              href="https://wa.me/918045678910"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#0E8A4B] text-white font-extrabold text-base hover:bg-[#0A6E3C] transition shadow-[0_5px_0_0_#073D22] hover:shadow-[0_2px_0_0_#073D22] hover:translate-y-[3px]"
            >
              <MessageCircle className="w-5 h-5" fill="currentColor" strokeWidth={0} />
              WhatsApp pe baat karein
            </a>
          </div>
          <p className="mt-7 text-xs opacity-80 font-medium">No credit card · Setup in 5 min · Cancel anytime · GST invoice</p>
        </div>
      </section>

      {/* ============== NEWSLETTER STRIP ============== */}
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

          <form className="flex flex-col sm:flex-row gap-2.5 p-2 bg-white rounded-2xl shadow-[0_6px_0_0_#7A4A00] border-2 border-[#3D1A00]">
            <div className="flex-1 flex items-center px-3">
              <Mail className="w-4 h-4 text-[#FF6A1F] mr-2" />
              <input
                type="email"
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

      {/* ============== FOOTER ============== */}
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

        {/* Top: brand + link columns */}
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-16 relative grid md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Brand column */}
          <div className="lg:col-span-4">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-5 group">
              <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-[#16C172] to-[#0E8A4B] flex items-center justify-center shadow-lg">
                <MessageCircle className="w-5 h-5 text-white" fill="currentColor" strokeWidth={0} />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#FF6A1F] rounded-full border-2 border-[#0A3D24]" />
              </div>
              <div className="leading-tight">
                <span className="font-extrabold text-xl tracking-tight block">AddisonX</span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-[#FFD23F] font-bold">WhatsApp Suite · भारत</span>
              </div>
            </Link>

            <p className="text-sm text-white/75 leading-relaxed max-w-sm">
              India ka #1 AI-powered WhatsApp Business platform. Kirana se listed companies tak — 12,000+ businesses ne switch kiya hai.
            </p>

            {/* Trust badges as stickers */}
            <div className="flex flex-wrap gap-2 mt-6">
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

            {/* Contact */}
            <div className="mt-7 space-y-2.5 text-sm">
              <a href="tel:+918045678910" className="flex items-center gap-2.5 text-white/85 hover:text-[#FFD23F] transition font-semibold">
                <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-3.5 h-3.5" />
                </span>
                +91 80-4567-8910
              </a>
              <a href="mailto:sales@addisonx.in" className="flex items-center gap-2.5 text-white/85 hover:text-[#FFD23F] transition font-semibold">
                <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-3.5 h-3.5" />
                </span>
                sales@addisonx.in
              </a>
              <a href="https://wa.me/918045678910" className="flex items-center gap-2.5 text-white/85 hover:text-[#FFD23F] transition font-semibold">
                <span className="w-7 h-7 rounded-lg bg-[#16C172] flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-3.5 h-3.5 text-white" fill="currentColor" strokeWidth={0} />
                </span>
                WhatsApp chat shuru karein
              </a>
              <p className="flex items-start gap-2.5 text-white/65 text-xs pt-1">
                <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-3.5 h-3.5" />
                </span>
                <span className="leading-relaxed pt-1">
                  AddisonX Media Pvt. Ltd.<br />
                  Indiranagar, Bengaluru 560038
                </span>
              </p>
            </div>
          </div>

          {/* Link columns */}
          {[
            { title: "Product", links: ["Shared Inbox", "Broadcasts", "Addison AI", "Automation", "Pay-in-Chat", "Analytics", "Integrations", "WhatsApp API"] },
            { title: "Solutions", links: ["E-commerce & D2C", "Coaching & Tuition", "Clinics & Wellness", "Real Estate", "Salons & Spa", "Kirana & Retail", "Agencies", "Travel"] },
            { title: "Resources", links: ["Free Templates", "Hindi Playbooks", "Diwali Sale Kit", "WhatsApp Guide", "Pricing Calculator", "API Docs", "Case Studies", "Webinars"] },
            { title: "Company", links: ["About us", "Customers", "Careers (5)", "Press", "Partners", "Affiliates", "Contact", "Blog"] },
          ].map((col) => (
            <div key={col.title} className="lg:col-span-2">
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

        {/* Payment partners + app store strip */}
        <div className="border-t border-white/10 relative">
          <div className="max-w-7xl mx-auto px-5 lg:px-8 py-8 grid lg:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
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

            <div className="flex flex-wrap gap-2.5">
              <a href="#" className="flex items-center gap-2.5 pl-3 pr-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 transition">
                <Smartphone className="w-5 h-5 text-white" />
                <div className="text-left leading-tight">
                  <p className="text-[9px] uppercase tracking-wider text-white/60 font-bold">Get it on</p>
                  <p className="text-sm font-extrabold">Play Store</p>
                </div>
              </a>
              <a href="#" className="flex items-center gap-2.5 pl-3 pr-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 transition">
                <Smartphone className="w-5 h-5 text-white" />
                <div className="text-left leading-tight">
                  <p className="text-[9px] uppercase tracking-wider text-white/60 font-bold">Download on</p>
                  <p className="text-sm font-extrabold">App Store</p>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Cities strip */}
        <div className="border-t border-white/10 relative">
          <div className="max-w-7xl mx-auto px-5 lg:px-8 py-5 text-center">
            <p className="text-[10px] uppercase tracking-[0.22em] font-extrabold text-white/50 mb-2">Trusted across India</p>
            <p className="text-xs text-white/75 font-semibold leading-relaxed">
              Mumbai · Bengaluru · Delhi NCR · Pune · Hyderabad · Chennai · Ahmedabad · Indore · Jaipur · Kochi · Surat · Lucknow · Kolkata · Coimbatore · Chandigarh
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 bg-[#072917] relative">
          <div className="max-w-7xl mx-auto px-5 lg:px-8 py-5 flex flex-col lg:flex-row items-center justify-between gap-4 text-xs">
            <p className="text-white/60 flex items-center gap-1.5 font-medium">
              © 2025 AddisonX Media Pvt. Ltd. · Made with
              <Heart className="w-3.5 h-3.5 inline text-[#FF6A1F]" fill="currentColor" strokeWidth={0} />
              in Bengaluru, India
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
    </div>
  );
}

/* ====================== Sun burst (festive radial behind phone) ====================== */

const SunBurst = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 400 400"
    className="w-[420px] h-[420px] opacity-50"
  >
    <defs>
      <radialGradient id="sb" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FFD23F" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#FFD23F" stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle cx="200" cy="200" r="200" fill="url(#sb)" />
    {Array.from({ length: 24 }).map((_, i) => {
      const angle = (i * 360) / 24;
      return (
        <line
          key={i}
          x1="200"
          y1="200"
          x2="200"
          y2="40"
          stroke="#FFD23F"
          strokeWidth="2"
          strokeOpacity="0.35"
          transform={`rotate(${angle} 200 200)`}
        />
      );
    })}
  </svg>
);

/* ====================== Phone mockup ====================== */

const PhoneMockup = () => (
  <div className="relative w-[300px] sm:w-[340px] aspect-[9/19] rounded-[2.5rem] bg-foreground p-2.5 shadow-2xl">
    <div className="relative w-full h-full rounded-[2rem] overflow-hidden bg-[hsl(var(--chat-bg))] flex flex-col">
      <div className="absolute top-1 left-1/2 -translate-x-1/2 w-24 h-5 bg-foreground rounded-full z-20" />

      <div className="bg-[#0E8A4B] text-white pt-7 pb-2.5 px-3 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-extrabold">PM</div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold leading-tight">Priya Mehta</p>
          <p className="text-[10px] opacity-80">online · typing…</p>
        </div>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FF6A1F] text-white font-extrabold uppercase">Hot</span>
      </div>

      <div className="flex-1 p-2.5 space-y-1.5 overflow-hidden">
        <ChatBubble incoming text="Hi, class 10 ki fees kya hai?" />
        <ChatBubble text="Namaste Priya 👋 Class 10 batch ₹8,500/month. Seat block karu?" ai />
        <ChatBubble incoming text="Haan, payment link bhejo." />
        <ChatBubble text="Tap to pay ₹8,500 → razorpay.me/mehta" ai />
        <ChatBubble incoming text="Done ✅ UPI ref: 887234" />
        <div className="mt-2 mx-1 p-2 rounded-lg bg-[#FFF1D6] border-2 border-[#FF6A1F]">
          <p className="text-[9px] uppercase tracking-wider text-[#B8420A] font-extrabold">Deal closed by AI</p>
          <p className="text-xs font-black mt-0.5 text-foreground">+ ₹8,500 · 12 seconds</p>
        </div>
      </div>

      <div className="px-2.5 pb-3 pt-1.5 bg-[hsl(var(--chat-bg))]">
        <div className="bg-white rounded-full flex items-center gap-2 px-3 py-1.5">
          <span className="flex-1 text-[10px] text-muted-foreground">Type a message…</span>
          <button className="w-6 h-6 rounded-full bg-[#0E8A4B] flex items-center justify-center">
            <Send className="w-3 h-3 text-white" />
          </button>
        </div>
      </div>
    </div>
  </div>
);

const ChatBubble = ({ text, incoming, ai }: { text: string; incoming?: boolean; ai?: boolean }) => (
  <div className={`flex ${incoming ? "justify-start" : "justify-end"}`}>
    <div
      className={`max-w-[82%] px-2.5 py-1.5 rounded-xl text-[11px] leading-snug ${
        incoming
          ? "bg-white text-foreground rounded-bl-sm border border-border"
          : ai
          ? "bg-[#DCFCE7] text-foreground rounded-br-sm shadow-sm"
          : "bg-[hsl(var(--chat-outgoing))] text-foreground rounded-br-sm"
      }`}
    >
      {text}
      {!incoming && (
        <div className="flex items-center justify-end gap-0.5 mt-0.5 opacity-60">
          <CheckCheck className="w-2.5 h-2.5 text-[#0E8A4B]" />
        </div>
      )}
    </div>
  </div>
);

/* ====================== Data ====================== */

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

const STEPS = [
  { icon: MessageCircle, title: "WhatsApp connect karo", desc: "Apna number use karo ya green-tick verified number lo. Meta approval hum handle karte hain.", time: "10 minutes" },
  { icon: Bot, title: "Addison AI ko train karo", desc: "Product catalogue, FAQs, price list upload karo. Addison aapka tone minutes mein seekh leta hai.", time: "30 minutes" },
  { icon: Send, title: "Go live & bechna shuru karo", desc: "Existing customers ko broadcast bhejo, AI 24/7 reply de, UPI se payments aaye. Aap dashboard dekho.", time: "Same day" },
];

const FEATURES = [
  { icon: MessageCircle, title: "Shared Team Inbox", desc: "Poori team ek number se reply kare. Agents ko assign karo, internal notes likho, hot leads tag karo." },
  { icon: Send, title: "Bulk Broadcasts", desc: "Hindi & English templates segmented audiences ko bhejo. Diwali, Holi, Rakhi ke liye ready flows." },
  { icon: Bot, title: "Addison AI (Hindi-fluent)", desc: "24/7 AI aapke products & pricing par trained. Hinglish mein reply, appointments book, leads qualify." },
  { icon: Zap, title: "Pay-in-Chat", desc: "UPI, Razorpay, PhonePe, Paytm, Cashfree — chat ke andar ₹ collect karo. CRM mein auto-reconcile." },
  { icon: BarChart3, title: "Real-Time Analytics", desc: "Agent performance, campaign ROI in ₹, conversation insights. Daily WhatsApp briefing for owners." },
  { icon: Workflow, title: "No-code Automation", desc: "Cart recovery, lead nurture, payment reminders ke liye drag-drop workflows. Kisi bhi event par trigger." },
];

const USE_CASES = [
  { icon: GraduationCap, title: "Coaching & tuition", desc: "Batches onboard karo, fee reminders bhejo, UPI se ₹ collect karo. IIT/NEET prep, schools, vocational." },
  { icon: ShoppingBag, title: "D2C & e-commerce", desc: "Abandoned carts recover, Hindi/English order updates, festive sales — Diwali, Rakhi, Holi." },
  { icon: Stethoscope, title: "Clinics & wellness", desc: "Appointment booking, prescription refills, salon & spa reminders. Consent flows built in." },
  { icon: Building2, title: "Real estate", desc: "Tier-2 & tier-3 cities ke site-visit leads qualify karo, floor plans share, visits schedule." },
];

const COMPARISON: { cap: string; us: boolean; others: boolean; personal: boolean }[] = [
  { cap: "Official WhatsApp Business API", us: true, others: true, personal: false },
  { cap: "AI agent (replies in Hindi & Hinglish)", us: true, others: false, personal: false },
  { cap: "UPI / Razorpay payment links in chat", us: true, others: false, personal: false },
  { cap: "Pre-built festive templates (Diwali, Holi)", us: true, others: false, personal: false },
  { cap: "Unlimited team members on Growth plan", us: true, others: false, personal: false },
  { cap: "Data hosted in Mumbai · DPDP-ready", us: true, others: false, personal: false },
  { cap: "GST invoice auto-generated", us: true, others: false, personal: false },
  { cap: "10,000 broadcasts in one click", us: true, others: true, personal: false },
];

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
    initials: "VG",
    name: "Vikram Gupta",
    role: "Director, Reddy Realty · Hyderabad",
    quote: "Tier-2 site-visit leads Excel sheet se gayab ho rahe the. AddisonX Telugu mein qualify karta hai, 6 builders ke saath visits book karta hai, hot leads sales team ko push karta hai.",
    result: "3× site-visit conversion",
  },
];

const PLANS = [
  {
    name: "Starter",
    tag: "Solo founders, kirana, single-clinic",
    price: "₹499",
    cta: "Free trial",
    featured: false,
    features: [
      "1,000 conversations/mo",
      "2 team members",
      "Hindi + English templates",
      "UPI / Razorpay payment links",
      "Email support",
    ],
  },
  {
    name: "Growth",
    tag: "Scaling D2C, coaching, multi-branch",
    price: "₹1,999",
    cta: "Free trial",
    featured: true,
    features: [
      "10,000 conversations/mo",
      "Unlimited team members",
      "Addison AI included",
      "Workflows & broadcasts",
      "11 Indian languages",
      "Priority WhatsApp + call support",
    ],
  },
  {
    name: "Enterprise",
    tag: "Listed companies, high-volume teams",
    price: "Custom",
    cta: "Contact sales",
    featured: false,
    features: [
      "Unlimited conversations",
      "Dedicated CSM (IST)",
      "Custom integrations · Tally · ERP",
      "SSO + DPDP DPO assistance",
      "SLA · onboarding · GST invoice",
    ],
  },
];
