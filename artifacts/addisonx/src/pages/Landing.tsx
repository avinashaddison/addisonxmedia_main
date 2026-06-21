import { Link } from "react-router-dom";
import { useEffect, useState, memo, lazy } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  Crown,
  Flame,
  GraduationCap,
  IndianRupee,
  Inbox,
  Megaphone,
  Menu,
  MessageCircle,
  Phone,
  Plane,
  Send,
  ShoppingBag,
  Sparkles,
  Star,
  Stethoscope,
  TrendingUp,
  Workflow,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { BrandLockup } from "@/components/brand/AddisonLogo";
import { useFlag } from "@/hooks/useSystemFlags";
import { DeferredSection } from "@/components/landing/DeferredSection";
import { paisleyBg } from "@/components/landing/shared";

// Below-the-fold sections are split into their own chunks and only mount as the
// user approaches them — keeps the initial Landing bundle (nav + hero) small.
const TrustBar = lazy(() => import("@/components/landing/sections/TrustBar"));
const IndiaPillars = lazy(() => import("@/components/landing/sections/IndiaPillars"));
const HowItWorks = lazy(() => import("@/components/landing/sections/HowItWorks"));
const Features = lazy(() => import("@/components/landing/sections/Features"));
const Solutions = lazy(() => import("@/components/landing/sections/Solutions"));
const ProductShowcase = lazy(() => import("@/components/landing/sections/ProductShowcase"));
const Comparison = lazy(() => import("@/components/landing/sections/Comparison"));
const Testimonials = lazy(() => import("@/components/landing/sections/Testimonials"));
const Pricing = lazy(() => import("@/components/landing/sections/Pricing"));
const Faq = lazy(() => import("@/components/landing/sections/Faq"));
const FinalCta = lazy(() => import("@/components/landing/sections/FinalCta"));
const Newsletter = lazy(() => import("@/components/landing/sections/Newsletter"));
const Footer = lazy(() => import("@/components/landing/sections/Footer"));

const HERO_ROTATING = [
  "Bharat ke",
  "Ranchi ke",
  "Jharkhand ke",
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

// Isolated so the rotating hero word re-renders on its own 2.4s tick instead of
// forcing the entire Landing tree to re-render every interval.
const RotatingWord = memo(function RotatingWord({
  items,
  interval = 2400,
}: {
  items: string[];
  interval?: number;
}) {
  const word = useRotator(items, interval);
  return (
    <span key={word} className="text-[#FF6A1F] inline-block animate-fade-in">
      {word}
    </span>
  );
});

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

export default function Landing() {
  useForceLight();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const showDiwaliBanner = useFlag("feature_diwali_banner");

  return (
    <div className="min-h-screen bg-[#FFF6E8] text-foreground antialiased overflow-x-hidden">
      {showDiwaliBanner && (
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
      )}

      {/* ============== NAV ============== */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#FFF6E8]/95 backdrop-blur-xl border-b-2 border-[#E8B968] shadow-sm"
            : "bg-[#FFF6E8]/60 backdrop-blur-md border-b border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 lg:px-8 h-[80px] flex items-center justify-between overflow-visible">
          <Link to="/" className="flex items-center pt-1" aria-label="Addison X Media home">
            <BrandLockup size={25} />
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
                <a href="tel:+919709707311" className="text-sm font-semibold text-foreground hover:text-[#FF6A1F] transition px-3 py-2 inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> +91 97097 07311
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

          <button className="lg:hidden p-2 -mr-2" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu" aria-expanded={mobileOpen} aria-controls="mobile-nav">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div id="mobile-nav" className="lg:hidden border-t-2 border-[#E8B968] bg-[#FFF6E8] px-5 py-4 space-y-1 text-sm font-semibold animate-fade-in">
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
              <RotatingWord items={HERO_ROTATING} />{" "}
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
              Sab kuch ek hi tool mein. <span className="font-bold text-foreground">Ranchi se Bengaluru tak 12,000+ businesses</span> ne switch kiya hai.
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
                href="https://wa.me/916206153116"
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

      {/* ============== BELOW-THE-FOLD (lazy + deferred) ============== */}
      <DeferredSection minHeight={120}>
        <TrustBar />
      </DeferredSection>

      <DeferredSection minHeight={640}>
        <IndiaPillars />
      </DeferredSection>

      <DeferredSection id="how" minHeight={520}>
        <HowItWorks />
      </DeferredSection>

      <DeferredSection id="features" minHeight={620}>
        <Features />
      </DeferredSection>

      <DeferredSection id="solutions" minHeight={480}>
        <Solutions />
      </DeferredSection>

      <DeferredSection id="product" minHeight={900}>
        <ProductShowcase />
      </DeferredSection>

      <DeferredSection minHeight={620}>
        <Comparison />
      </DeferredSection>

      <DeferredSection minHeight={560}>
        <Testimonials />
      </DeferredSection>

      <DeferredSection id="pricing" minHeight={1100}>
        <Pricing />
      </DeferredSection>

      <DeferredSection id="faq" minHeight={560}>
        <Faq />
      </DeferredSection>

      <DeferredSection minHeight={560}>
        <FinalCta />
      </DeferredSection>

      <DeferredSection minHeight={320}>
        <Newsletter />
      </DeferredSection>

      <DeferredSection minHeight={700}>
        <Footer />
      </DeferredSection>
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
