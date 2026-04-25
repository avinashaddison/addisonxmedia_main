import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Check,
  Inbox,
  MessageCircle,
  Sparkles,
  Wallet,
  Zap,
  Star,
  Clock,
  Shield,
  TrendingUp,
  Quote,
  Play,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { InteractiveChatDemo } from "@/components/landing/InteractiveChatDemo";
import { FAQSection } from "@/components/landing/FAQSection";

const SERIF = { fontFamily: "'Instrument Serif', serif" };
const SANS = { fontFamily: "'Work Sans', system-ui, sans-serif" };

// Force light mode for landing — bright, editorial, premium
const useForceLight = () => {
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => { if (wasDark) root.classList.add("dark"); };
  }, []);
};

// Cursor-following spotlight
const useSpotlight = (ref: React.RefObject<HTMLElement>) => {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, [ref]);
};

// Animated counter
const useCountUp = (target: number, duration = 1800, start = false) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.floor(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return v;
};

// In-view hook
const useInView = <T extends Element>(opts: IntersectionObserverInit = { threshold: 0.25 }) => {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current || seen) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setSeen(true); io.disconnect(); }
    }, opts);
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen] as const;
};

const Landing = () => {
  const { user } = useAuth();
  const ctaHref = user ? "/app" : "/auth";
  useForceDark();

  const heroRef = useRef<HTMLDivElement>(null);
  useSpotlight(heroRef);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased overflow-x-hidden selection:bg-primary/30 selection:text-foreground" style={SANS}>
      {/* ============ NAV ============ */}
      <header className="sticky top-0 z-40 bg-background/60 backdrop-blur-xl border-b border-border/30">
        <nav className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="relative w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm overflow-hidden ring-1 ring-border/60">
              <span className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary-glow" />
              <span className="absolute inset-0 bg-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10 text-background">A</span>
            </span>
            <span className="text-[16px] font-semibold tracking-tight">Addison</span>
            <span className="hidden sm:inline-flex items-center gap-1 ml-1 text-[9px] font-bold uppercase tracking-[0.18em] text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
              <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
              Live
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1 text-[13px] text-muted-foreground bg-card/40 backdrop-blur border border-border/40 rounded-full px-2 py-1">
            {[
              ["Product", "#product"],
              ["How", "#how"],
              ["Pricing", "#pricing"],
              ["FAQ", "#faq"],
            ].map(([l, h]) => (
              <a key={l} href={h} className="px-3 py-1.5 rounded-full hover:bg-foreground/5 hover:text-foreground transition-colors">
                {l}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link to="/auth" className="hidden sm:inline-flex text-[13px] font-medium text-muted-foreground hover:text-foreground px-3 py-2 transition-colors">
              Sign in
            </Link>
            <Link
              to={ctaHref}
              className="group relative text-[13px] font-semibold bg-foreground text-background rounded-full px-4 py-2 inline-flex items-center gap-1.5 overflow-hidden hover:shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.6)] transition-shadow"
            >
              <span className="relative z-10 flex items-center gap-1.5">
                Start free
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>
        </nav>
      </header>

      {/* ============ HERO ============ */}
      <section
        ref={heroRef}
        className="relative border-b border-border/30 overflow-hidden group/hero"
        style={{
          background: `radial-gradient(600px circle at var(--mx, 50%) var(--my, 30%), hsl(var(--primary) / 0.08), transparent 60%)`,
        }}
      >
        {/* Aurora */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div
            className="absolute inset-0 opacity-90"
            style={{
              background:
                "radial-gradient(55% 60% at 18% 18%, hsl(var(--primary) / 0.28), transparent 60%), radial-gradient(50% 55% at 82% 25%, hsl(var(--accent) / 0.22), transparent 60%), radial-gradient(70% 60% at 50% 110%, hsl(var(--primary-glow) / 0.18), transparent 60%)",
              animation: "aurora 14s ease-in-out infinite",
              backgroundSize: "200% 200%",
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
              backgroundSize: "52px 52px",
              maskImage: "radial-gradient(ellipse 75% 65% at 50% 35%, black 30%, transparent 80%)",
            }}
          />
          {/* Noise */}
          <div
            className="absolute inset-0 opacity-[0.025] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-20 sm:pb-28 grid lg:grid-cols-12 gap-12 lg:gap-14 items-center relative">
          <div className="lg:col-span-7 relative z-10">
            <div className="inline-flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/85 mb-8 bg-card/40 backdrop-blur border border-border/50 rounded-full pl-2 pr-3.5 py-1.5 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.05)]">
              <span className="flex items-center gap-1.5 bg-primary/15 border border-primary/25 rounded-full px-2 py-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                </span>
                <span className="text-primary text-[10px]">New</span>
              </span>
              Addison v2 · Now with AI follow-ups
            </div>

            <h1
              className="text-[48px] sm:text-[72px] lg:text-[92px] leading-[0.95] tracking-[-0.03em] text-foreground"
              style={SERIF}
            >
              The inbox
              <br />
              that <span className="italic bg-gradient-to-br from-primary via-accent to-primary-glow bg-clip-text text-transparent">closes</span>
              <br />
              deals for you.
            </h1>

            <p className="mt-8 text-[16px] sm:text-[19px] leading-[1.55] text-muted-foreground max-w-[560px]">
              Addison turns WhatsApp, Instagram, and forms into one calm inbox — with an AI that
              drafts replies, sends pay links, and closes deals while you focus on the work that
              matters.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3 sm:items-center">
              <Link
                to={ctaHref}
                className="group/cta relative inline-flex items-center justify-center gap-2 bg-foreground text-background rounded-full px-6 py-4 text-[14px] font-semibold transition-all hover:scale-[1.02] overflow-hidden shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.5)] hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.8)]"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary-glow opacity-0 group-hover/cta:opacity-100 transition-opacity" />
                <span className="absolute inset-0 -translate-x-full group-hover/cta:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-background/30 to-transparent" />
                <span className="relative z-10 flex items-center gap-2">
                  Start free — no card
                  <ArrowRight className="w-4 h-4 transition-transform group-hover/cta:translate-x-0.5" />
                </span>
              </Link>
              <a
                href="#product"
                className="group/play inline-flex items-center justify-center gap-2.5 text-[14px] font-medium text-foreground hover:text-primary transition-colors px-3 py-3.5"
              >
                <span className="relative w-9 h-9 rounded-full border border-border bg-card/40 backdrop-blur flex items-center justify-center group-hover/play:border-primary/60 group-hover/play:bg-primary/10 transition-all">
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </span>
                Watch 90s demo
              </a>
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-3 text-[12px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> 14-day trial</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Setup in 4 min</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Cancel anytime</span>
              <span className="flex items-center gap-1.5">
                <span className="flex -space-x-1.5">
                  {["A", "R", "K", "S"].map((c, i) => (
                    <span
                      key={i}
                      className="w-6 h-6 rounded-full border-2 border-background bg-gradient-to-br from-primary to-accent text-[10px] font-bold text-background flex items-center justify-center"
                    >
                      {c}
                    </span>
                  ))}
                </span>
                <span className="flex items-center gap-1 text-foreground/85 font-medium">
                  <Star className="w-3 h-3 fill-warning text-warning" />
                  4.9 · joined by 2,400+ founders
                </span>
              </span>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center lg:justify-end relative z-10">
            <div className="relative">
              {/* Glow */}
              <div className="absolute -inset-12 bg-gradient-to-br from-primary/30 via-accent/15 to-primary-glow/25 blur-3xl -z-10 rounded-full animate-pulse" style={{ animationDuration: "5s" }} />
              {/* Floating chips */}
              <div className="absolute -top-5 -left-8 hidden sm:flex items-center gap-1.5 bg-card/80 backdrop-blur-xl border border-border/60 rounded-full px-3 py-1.5 shadow-2xl shadow-primary/20 z-20" style={{ animation: "float 4s ease-in-out infinite" }}>
                <Bot className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-semibold">AI replied in 1.2s</span>
              </div>
              <div className="absolute top-10 -right-6 hidden md:flex items-center gap-1.5 bg-card/80 backdrop-blur-xl border border-border/60 rounded-full px-3 py-1.5 shadow-2xl shadow-accent/20 z-20" style={{ animation: "float 5s ease-in-out infinite", animationDelay: "0.5s" }}>
                <TrendingUp className="w-3 h-3 text-accent" />
                <span className="text-[10px] font-semibold">+38% close rate</span>
              </div>
              <div className="absolute -bottom-4 -right-5 hidden sm:flex items-center gap-1.5 bg-card/80 backdrop-blur-xl border border-border/60 rounded-full px-3 py-1.5 shadow-2xl shadow-success/20 z-20" style={{ animation: "float 4.5s ease-in-out infinite", animationDelay: "1s" }}>
                <Wallet className="w-3 h-3 text-success" />
                <span className="text-[10px] font-semibold">+₹2,499 received</span>
              </div>
              <InteractiveChatDemo />
            </div>
          </div>
        </div>

        {/* Big editorial wordmark — bottom of hero */}
        <div className="relative pb-6 pointer-events-none select-none overflow-hidden">
          <p
            className="text-center text-[18vw] sm:text-[15vw] leading-[0.85] tracking-[-0.06em] bg-gradient-to-b from-foreground/[0.06] to-transparent bg-clip-text text-transparent"
            style={SERIF}
          >
            Addison
          </p>
        </div>
      </section>

      {/* ============ MARQUEE ============ */}
      <section className="border-b border-border/30 bg-card/30 overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
          <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground text-center mb-5">
            Powering revenue at
          </p>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            <div className="flex gap-14 whitespace-nowrap" style={{ animation: "ticker-scroll 32s linear infinite" }}>
              {[
                "Lumen Coaching", "Brewd Studio", "PitchCraft", "Northbound", "Crescent Tutors",
                "Maker House", "Halcyon", "Saffron Labs", "Arclight", "Pulse Academy",
                "Lumen Coaching", "Brewd Studio", "PitchCraft", "Northbound", "Crescent Tutors",
                "Maker House", "Halcyon", "Saffron Labs", "Arclight", "Pulse Academy",
              ].map((name, i) => (
                <span
                  key={i}
                  className="text-[22px] sm:text-[26px] tracking-tight text-muted-foreground/60 hover:text-foreground transition-colors italic"
                  style={SERIF}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ STATS — animated counters ============ */}
      <StatsSection />

      {/* ============ PRODUCT — interactive tabs ============ */}
      <ProductShowcase />

      {/* ============ HOW IT WORKS ============ */}
      <section id="how" className="border-b border-border/30 bg-card/20 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-24 sm:py-32 relative">
          <div className="grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4 lg:sticky lg:top-24 self-start">
              <p className="text-[11px] uppercase tracking-[0.22em] text-primary mb-4 font-semibold flex items-center gap-2">
                <span className="w-6 h-px bg-primary" />
                How it works
              </p>
              <h2 className="text-[40px] sm:text-[60px] leading-[1.0] tracking-[-0.02em]" style={SERIF}>
                Four minutes to your <span className="italic text-muted-foreground">first closed deal.</span>
              </h2>
              <p className="mt-6 text-[15px] text-muted-foreground leading-relaxed max-w-sm">
                No agency. No setup call. Connect your channels and let Addison do what it does best.
              </p>
            </div>

            <ol className="lg:col-span-8 space-y-1">
              {[
                { n: "01", t: "Connect WhatsApp & Instagram", d: "One tap. We handle the OAuth dance and sync your last 30 days of chats automatically." },
                { n: "02", t: "Train Addison on your voice", d: "Paste your three best replies. Addison learns tone, pricing, objections, the lot — in under sixty seconds." },
                { n: "03", t: "Go live, watch deals close", d: "Approve AI drafts with a tap. Send pay links. Get notified the moment money lands in your account." },
              ].map((s, i) => (
                <RevealStep key={s.n} index={i} {...s} />
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIAL ============ */}
      <section className="border-b border-border/30 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-50" style={{
          background: "radial-gradient(60% 60% at 50% 50%, hsl(var(--primary) / 0.14), transparent 70%)",
        }} />
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-24 sm:py-32 text-center relative">
          <Quote className="w-10 h-10 text-primary/30 mx-auto mb-6" strokeWidth={1.5} />
          <div className="inline-flex items-center gap-1 mb-6">
            {[1,2,3,4,5].map(i => (
              <Star key={i} className="w-4 h-4 fill-warning text-warning" />
            ))}
          </div>
          <blockquote
            className="text-[30px] sm:text-[52px] leading-[1.16] tracking-[-0.015em] text-foreground"
            style={SERIF}
          >
            We replaced three tools with Addison and our close rate jumped from{" "}
            <span className="italic text-muted-foreground">14%</span> to{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-primary-glow bg-clip-text text-transparent">38%</span>{" "}
            in six weeks. The AI replies feel like me, but on a really good day.
          </blockquote>
          <div className="mt-10 flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-hot to-accent text-background flex items-center justify-center text-[13px] font-bold ring-2 ring-background shadow-xl shadow-primary/20">
              RA
            </div>
            <div className="text-left">
              <p className="text-[14px] font-semibold">Riya Agarwal</p>
              <p className="text-[12px] text-muted-foreground">Founder, Lumen Coaching</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" className="border-b border-border/30 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-40" style={{
          background: "radial-gradient(50% 60% at 50% 0%, hsl(var(--accent) / 0.12), transparent 70%)",
        }} />
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-24 sm:py-32">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-[11px] uppercase tracking-[0.22em] text-primary mb-4 font-semibold flex items-center justify-center gap-2">
              <span className="w-6 h-px bg-primary" /> Pricing <span className="w-6 h-px bg-primary" />
            </p>
            <h2 className="text-[40px] sm:text-[64px] leading-[1.0] tracking-[-0.02em]" style={SERIF}>
              Simple. Honest. <span className="italic text-muted-foreground">Cancel anytime.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {[
              { name: "Starter", price: "₹999", tag: "For solo founders",
                feat: ["1 inbox", "500 AI replies / mo", "UPI pay links", "Email support"], primary: false },
              { name: "Growth", price: "₹2,499", tag: "For small teams",
                feat: ["Everything in Starter", "Unlimited AI replies", "Up to 5 teammates", "Broadcasts + analytics", "Priority support"], primary: true },
            ].map((p) => (
              <div
                key={p.name}
                className={`group/card relative rounded-3xl p-8 sm:p-10 border transition-all hover:-translate-y-1 overflow-hidden ${
                  p.primary
                    ? "bg-card border-primary/30 shadow-2xl shadow-primary/20"
                    : "bg-card/40 border-border hover:border-primary/30"
                }`}
              >
                {p.primary && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-accent/10 pointer-events-none" />
                    <div className="absolute -top-px left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-[0.18em] bg-gradient-to-r from-primary to-accent text-background px-4 py-1 rounded-b-lg shadow-lg">
                      Most popular
                    </div>
                    <div className="absolute -top-32 -right-32 w-72 h-72 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                  </>
                )}
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[28px] tracking-tight" style={SERIF}>
                      {p.name}
                    </h3>
                    {p.primary && <Sparkles className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="text-[12px] mb-7 text-muted-foreground">
                    {p.tag}
                  </p>
                  <p className="flex items-baseline gap-1.5 mb-8">
                    <span className="text-[60px] tracking-[-0.02em] leading-none" style={SERIF}>
                      {p.price}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      /month
                    </span>
                  </p>
                  <ul className="space-y-3.5 mb-9">
                    {p.feat.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[14px]">
                        <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${p.primary ? "bg-primary/20" : "bg-muted"}`}>
                          <Check className={`w-2.5 h-2.5 ${p.primary ? "text-primary" : "text-foreground"}`} strokeWidth={3} />
                        </span>
                        <span className="text-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={ctaHref}
                    className={`group/btn w-full inline-flex items-center justify-center gap-2 rounded-full py-3.5 text-[14px] font-semibold transition-all ${
                      p.primary
                        ? "bg-foreground text-background hover:shadow-[0_10px_30px_-8px_hsl(var(--primary)/0.6)]"
                        : "bg-card border border-border hover:border-foreground/40 text-foreground"
                    }`}
                  >
                    Start free trial
                    <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center mt-12 text-[12px] text-muted-foreground inline-flex items-center gap-2 w-full justify-center">
            <Shield className="w-3.5 h-3.5 text-primary" />
            Bank-grade encryption · GDPR + DPDP compliant · Hosted in Mumbai
          </p>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="border-b border-border/30">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-24 sm:py-32">
          <div className="text-center mb-14">
            <p className="text-[11px] uppercase tracking-[0.22em] text-primary mb-4 font-semibold flex items-center justify-center gap-2">
              <span className="w-6 h-px bg-primary" /> Questions <span className="w-6 h-px bg-primary" />
            </p>
            <h2 className="text-[40px] sm:text-[56px] leading-[1.02] tracking-[-0.02em]" style={SERIF}>
              Things people <span className="italic">usually ask.</span>
            </h2>
          </div>
          <FAQSection />
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 80% at 50% 0%, hsl(var(--primary) / 0.30), transparent 65%), radial-gradient(50% 60% at 50% 100%, hsl(var(--accent) / 0.20), transparent 60%)",
          }}
        />
        <div className="absolute inset-0 -z-10 opacity-[0.06]" style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
          maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 30%, transparent 80%)",
        }} />
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-32 sm:py-40 text-center relative">
          <div className="inline-flex items-center gap-2 mb-8 bg-card/40 backdrop-blur border border-border/50 rounded-full px-3 py-1.5">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">Ready when you are</span>
          </div>
          <h2 className="text-[52px] sm:text-[88px] leading-[0.95] tracking-[-0.03em]" style={SERIF}>
            Stop missing replies.
            <br />
            <span className="italic bg-gradient-to-br from-primary via-accent to-primary-glow bg-clip-text text-transparent">
              Start closing deals.
            </span>
          </h2>
          <p className="mt-8 text-[16px] sm:text-[18px] text-muted-foreground max-w-lg mx-auto">
            Try Addison free for 14 days. No card. Cancel in two clicks.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={ctaHref}
              className="group/cta relative inline-flex items-center justify-center gap-2 bg-foreground text-background rounded-full px-7 py-4 text-[14px] font-semibold transition-all hover:scale-[1.02] w-full sm:w-auto overflow-hidden shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)] hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.9)]"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary-glow opacity-0 group-hover/cta:opacity-100 transition-opacity" />
              <span className="relative z-10 flex items-center gap-2">
                Start free trial
                <ArrowRight className="w-4 h-4 transition-transform group-hover/cta:translate-x-0.5" />
              </span>
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center justify-center gap-2 text-[14px] font-medium text-foreground hover:text-primary transition-colors px-3 py-3.5"
            >
              Sign in instead
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-border/30 bg-card/20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="relative w-7 h-7 rounded-md flex items-center justify-center font-bold text-[12px] overflow-hidden">
              <span className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary-glow" />
              <span className="relative z-10 text-background">A</span>
            </span>
            <span className="text-[13px] font-semibold">Addison</span>
            <span className="text-[12px] text-muted-foreground ml-2">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6 text-[12px] text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="mailto:hi@addison.app" className="hover:text-foreground transition-colors flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" />
              hi@addison.app
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

/* ============ STATS ============ */
const StatsSection = () => {
  const [ref, seen] = useInView<HTMLDivElement>();
  const revenue = useCountUp(420, 1800, seen);
  const speed = useCountUp(31, 1600, seen);
  const capture = useCountUp(92, 1500, seen);
  const latency = useCountUp(2, 1200, seen);

  const items = [
    { k: `₹${(revenue / 100).toFixed(1)} Cr`, v: "Revenue closed in chat", icon: TrendingUp },
    { k: `${(speed / 10).toFixed(1)}×`, v: "Faster reply time", icon: Zap },
    { k: `${capture}%`, v: "Hot-lead capture", icon: Star },
    { k: `<${latency}s`, v: "AI reply latency", icon: Clock },
  ];

  return (
    <section ref={ref} className="border-b border-border/30 relative">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border/40 rounded-3xl overflow-hidden border border-border/40">
          {items.map((s) => (
            <div key={s.v} className="bg-background p-7 sm:p-9 group hover:bg-card/40 transition-colors relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <s.icon className="w-4 h-4 text-primary mb-4" strokeWidth={1.75} />
              <p className="text-[40px] sm:text-[52px] tracking-[-0.025em] text-foreground leading-none" style={SERIF}>
                {s.k}
              </p>
              <p className="text-[12px] text-muted-foreground mt-3 uppercase tracking-[0.12em]">{s.v}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ============ INTERACTIVE PRODUCT SHOWCASE ============ */
const ProductShowcase = () => {
  const [active, setActive] = useState(0);
  const features = [
    {
      icon: Bot, tag: "AI replies",
      title: "Drafted in under two seconds.",
      body: "Tone-matched, price-aware suggestions trained on your top scripts. Approve with a tap, edit before sending, or let Addison send on your behalf.",
      stat: "1.2s", statLabel: "Avg draft time",
    },
    {
      icon: Inbox, tag: "Unified inbox",
      title: "WhatsApp. Instagram. Forms.",
      body: "Every conversation in one calm stream, sorted by intent. Hot leads bubble to the top automatically — no more swiping between five apps.",
      stat: "5→1", statLabel: "Tools replaced",
    },
    {
      icon: Wallet, tag: "Pay links",
      title: "Money in, deal won.",
      body: "Razorpay & UPI inside the chat. Webhooks close the deal the moment payment lands. Auto-receipts, auto-tags, auto-everything.",
      stat: "₹4.2 Cr", statLabel: "Closed in chat",
    },
    {
      icon: Zap, tag: "Broadcasts",
      title: "10K leads, every rupee tracked.",
      body: "Personalized blasts with merge tags, A/B variants, and revenue attribution. Know exactly which message made you money.",
      stat: "38%", statLabel: "Open rate",
    },
  ];

  const F = features[active];

  return (
    <section id="product" className="border-b border-border/30 relative overflow-hidden">
      <div className="absolute top-1/3 -left-32 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-1/4 -right-32 w-[500px] h-[500px] bg-accent/8 rounded-full blur-[120px] -z-10" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-24 sm:py-32">
        <div className="max-w-3xl mb-16">
          <p className="text-[11px] uppercase tracking-[0.22em] text-primary mb-4 font-semibold flex items-center gap-2">
            <span className="w-6 h-px bg-primary" />
            The product
          </p>
          <h2 className="text-[40px] sm:text-[64px] leading-[1.0] tracking-[-0.02em]" style={SERIF}>
            Four tools, <span className="italic text-muted-foreground">one quiet inbox.</span>
          </h2>
          <p className="mt-6 text-[16px] sm:text-[18px] text-muted-foreground leading-relaxed max-w-xl">
            No bloat. No 47 tabs. Just the four things that actually move money — built to feel like one product.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Tabs */}
          <div className="lg:col-span-5 space-y-2">
            {features.map((f, i) => (
              <button
                key={f.tag}
                onClick={() => setActive(i)}
                className={`w-full text-left group/tab relative rounded-2xl border p-5 sm:p-6 transition-all overflow-hidden ${
                  active === i
                    ? "bg-card border-primary/30 shadow-xl shadow-primary/10"
                    : "bg-card/30 border-border/50 hover:border-border hover:bg-card/50"
                }`}
              >
                {active === i && (
                  <span className="absolute left-0 top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary to-accent rounded-r-full" />
                )}
                <div className="flex items-center gap-3">
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                    active === i ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    <f.icon className="w-4 h-4" strokeWidth={2} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1">{f.tag}</p>
                    <p className="text-[15px] sm:text-[16px] font-semibold tracking-tight">{f.title}</p>
                  </div>
                  <ArrowRight className={`w-4 h-4 transition-all ${active === i ? "text-primary translate-x-0" : "text-muted-foreground -translate-x-1 opacity-0"}`} />
                </div>
              </button>
            ))}
          </div>

          {/* Showcase panel */}
          <div className="lg:col-span-7 lg:sticky lg:top-24">
            <div key={active} className="relative rounded-3xl border border-border/60 bg-card overflow-hidden animate-fade-in">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/8 pointer-events-none" />
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

              <div className="relative p-8 sm:p-12">
                <div className="flex items-center gap-2 mb-6">
                  <span className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
                    <F.icon className="w-4 h-4 text-primary" strokeWidth={2} />
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">{F.tag}</span>
                </div>

                <h3 className="text-[32px] sm:text-[42px] leading-[1.05] tracking-[-0.02em]" style={SERIF}>
                  {F.title}
                </h3>
                <p className="mt-5 text-[15px] sm:text-[16px] text-muted-foreground leading-relaxed max-w-md">
                  {F.body}
                </p>

                <div className="mt-10 flex items-end gap-8 pt-8 border-t border-border/50">
                  <div>
                    <p className="text-[48px] sm:text-[64px] leading-none tracking-[-0.025em] bg-gradient-to-br from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent" style={SERIF}>
                      {F.stat}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mt-2">{F.statLabel}</p>
                  </div>
                  <div className="flex-1 flex justify-end">
                    <div className="flex gap-1.5">
                      {features.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActive(i)}
                          aria-label={`Show feature ${i + 1}`}
                          className={`h-1.5 rounded-full transition-all ${active === i ? "w-8 bg-primary" : "w-1.5 bg-muted hover:bg-muted-foreground/40"}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ============ REVEAL STEP ============ */
const RevealStep = ({ n, t, d, index }: { n: string; t: string; d: string; index: number }) => {
  const [ref, seen] = useInView<HTMLLIElement>({ threshold: 0.3 });
  return (
    <li
      ref={ref}
      className="grid grid-cols-[auto_1fr] gap-6 sm:gap-12 py-8 border-t border-border/40 first:border-t-0 group transition-all"
      style={{
        opacity: seen ? 1 : 0,
        transform: seen ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`,
      }}
    >
      <span
        className="text-[40px] sm:text-[56px] tabular-nums tracking-[-0.02em] bg-gradient-to-br from-primary via-accent to-primary-glow bg-clip-text text-transparent leading-none pt-1"
        style={SERIF}
      >
        {n}
      </span>
      <div>
        <h3 className="text-[24px] sm:text-[32px] tracking-[-0.015em] group-hover:text-primary transition-colors" style={SERIF}>
          {t}
        </h3>
        <p className="mt-3 text-[15px] sm:text-[16px] text-muted-foreground leading-relaxed max-w-xl">
          {d}
        </p>
      </div>
    </li>
  );
};

export default Landing;
