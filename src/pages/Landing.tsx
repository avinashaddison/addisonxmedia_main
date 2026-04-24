import { Link } from "react-router-dom";
import { useState } from "react";
import {
  MessageCircle, Sparkles, Zap, Shield, BarChart3, Users, Bot, Send,
  ArrowRight, Check, Star, Flame, TrendingUp, Globe, Clock, Award,
  ChevronRight, Play, IndianRupee, MessageSquare, Phone, Inbox,
  Plug, Timer, Rocket, Target, Wallet,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { CountUp } from "@/components/landing/CountUp";
import { RotatingWord } from "@/components/landing/RotatingWord";
import { LiveActivityBadge } from "@/components/landing/LiveActivityBadge";
import { InteractiveChatDemo } from "@/components/landing/InteractiveChatDemo";
import { StickyTrialBar } from "@/components/landing/StickyTrialBar";
import { Reveal } from "@/components/landing/Reveal";
import { MetricsTicker } from "@/components/landing/MetricsTicker";
import { ComparisonGrid } from "@/components/landing/ComparisonGrid";
import { FAQSection } from "@/components/landing/FAQSection";
import { AddisonXLogo } from "@/components/brand/AddisonXLogo";

const benefits = [
  {
    icon: Bot,
    badge: "AI",
    title: "Close deals 3× faster with AI replies",
    desc: "Addison AI drafts the perfect reply in <2 seconds — tone-matched, price-aware, and trained on your top-performing scripts.",
    snippet: "ai-reply",
    accent: "from-primary to-primary-glow",
  },
  {
    icon: Inbox,
    badge: "Inbox",
    title: "One inbox. Every chat. Zero leaks.",
    desc: "WhatsApp, Insta DMs, and forms — all in one stream. Hot leads bubble to the top automatically.",
    snippet: "inbox",
    accent: "from-accent to-primary",
  },
  {
    icon: Wallet,
    badge: "Pay",
    title: "Send pay links in one tap, get paid in 30s",
    desc: "Native Razorpay + UPI links inside the chat. Webhook auto-marks the deal as won the moment money hits.",
    snippet: "payment",
    accent: "from-success to-primary",
  },
  {
    icon: Zap,
    badge: "Blasts",
    title: "Broadcast 10K leads, track every rupee",
    desc: "Personalized blasts with merge tags, A/B variants, and revenue attribution down to the message.",
    snippet: "broadcast",
    accent: "from-warning to-hot",
  },
  {
    icon: BarChart3,
    badge: "Analytics",
    title: "See revenue, not vanity metrics",
    desc: "Live conversion funnel, win-rate by agent, and forecasts that update by the second.",
    snippet: "analytics",
    accent: "from-accent to-accent",
  },
  {
    icon: Shield,
    badge: "Trust",
    title: "Bank-grade security, India-ready",
    desc: "End-to-end encrypted, RLS-isolated tenants, SOC 2 ready. UPI, INR, Hindi/English replies — out of the box.",
    snippet: "security",
    accent: "from-hot to-warning",
  },
];

const testimonials = [
  {
    quote: "We closed ₹47L in the first 30 days. The AI suggestions feel like having a senior closer on every chat.",
    name: "Priya Mehta",
    role: "Founder",
    company: "Mehta Tutorials",
    metric: "+₹47L",
    metricLabel: "in 30 days",
    avatar: "PM",
    color: "from-hot to-warning",
  },
  {
    quote: "Cut response time from 4 hours to 90 seconds. Our hot-lead conversion jumped 3.2× in week one.",
    name: "Rohan Kapoor",
    role: "Head of Sales",
    company: "FitLab",
    metric: "+3.2×",
    metricLabel: "conversion",
    avatar: "RK",
    color: "from-primary to-accent",
  },
  {
    quote: "Finally a CRM that sales people actually open. The team begs me not to switch back to the old tools.",
    name: "Anika Sharma",
    role: "VP Growth",
    company: "NestRealty",
    metric: "+32%",
    metricLabel: "close rate · 2 wks",
    avatar: "AS",
    color: "from-accent to-success",
  },
];

const Landing = () => {
  const { user } = useAuth();
  const ctaHref = user ? "/app" : "/auth";
  const [yearly, setYearly] = useState(false);

  const tiers = [
    {
      name: "Starter",
      monthly: 0,
      yearly: 0,
      desc: "Test the engine. Free forever.",
      features: ["1 WhatsApp number", "Up to 100 contacts", "AI replies (50/mo)", "Basic analytics"],
      cta: "Start free",
      featured: false,
      roi: null,
    },
    {
      name: "Growth",
      monthly: 2499,
      yearly: 1999,
      desc: "For teams ready to print revenue.",
      features: [
        "Unlimited contacts",
        "5 team seats",
        "AI replies — unlimited",
        "Broadcasts (10K recipients/mo)",
        "Pipeline & forecasts",
        "Pay links + UPI",
        "Priority support",
      ],
      cta: "Start 14-day trial",
      featured: true,
      roi: "Close just 1 deal → recover 12 months of cost.",
    },
    {
      name: "Scale",
      monthly: -1,
      yearly: -1,
      desc: "For 50+ agents and high-volume.",
      features: [
        "Unlimited seats",
        "Dedicated success manager",
        "Custom integrations",
        "SLA + audit logs",
        "On-premise option",
      ],
      cta: "Talk to sales",
      featured: false,
      roi: null,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <AddisonXLogo size={36} withWordmark withTagline={false} />
            <span className="text-[10px] font-bold uppercase bg-primary-soft text-primary px-1.5 py-0.5 rounded ml-1">Beta</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-[13px] font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#customers" className="hover:text-foreground transition-colors">Customers</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-2">
              Log in
            </Link>
            <Link
              to={ctaHref}
              className="text-[13px] font-bold bg-foreground text-background px-4 py-2 rounded-lg hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm hover:scale-[1.03]"
            >
              {user ? "Open app" : "Start free"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 aurora-bg opacity-50 pointer-events-none animate-aurora" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 pt-16 pb-12 lg:pt-24 lg:pb-20">
          <div className="grid lg:grid-cols-[1fr_auto] gap-10 lg:gap-12 items-center">
            <div className="text-center lg:text-left">
              <LiveActivityBadge />

              <h1 className="text-4xl md:text-6xl lg:text-[68px] font-bold tracking-tight leading-[1.04]">
                Turn every WhatsApp chat into{" "}
                <RotatingWord words={["closed deals.", "₹ in your bank.", "hot leads.", "loyal customers."]} />
              </h1>

              <p className="text-base md:text-lg text-muted-foreground mt-6 max-w-2xl lg:max-w-xl mx-auto lg:mx-0 leading-relaxed">
                AddisonX is the AI sales engine that replies in 2 seconds, scores hot leads automatically, and closes deals while you sleep. Replace 4 tools and 2 spreadsheets.
              </p>

              {/* urgency line */}
              <div className="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-hot bg-hot-soft border border-hot/20 rounded-full px-3 py-1.5">
                <Timer className="w-3.5 h-3.5 animate-urgency-shake" />
                Most leads go cold in 5 minutes. Reply instantly.
              </div>

              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 mt-8">
                <Link
                  to={ctaHref}
                  className="group bg-primary text-primary-foreground px-6 py-3.5 rounded-xl font-bold text-[14px] flex items-center gap-2 hover:bg-primary-glow transition-all shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/50 hover:-translate-y-0.5 hover:scale-[1.02]"
                >
                  {user ? "Open your workspace" : "Start closing leads now"}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#how"
                  className="bg-card border border-border px-5 py-3.5 rounded-xl font-semibold text-[14px] flex items-center gap-2 hover:bg-muted hover:border-foreground/20 transition-all group"
                >
                  <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                  </span>
                  Watch 60-sec demo
                </a>
              </div>

              <div className="mt-7 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-[12px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-success" /> 14-day free trial</span>
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-success" /> No credit card</span>
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-success" /> Setup in 2 min</span>
              </div>
            </div>

            {/* Interactive demo column */}
            <div className="relative mx-auto lg:mx-0 hidden md:block">
              <div className="absolute -inset-6 bg-gradient-to-tr from-primary/20 via-accent/10 to-transparent blur-3xl pointer-events-none" />
              <div className="relative animate-float">
                <InteractiveChatDemo />
              </div>
              {/* floating stat */}
              <div className="absolute -left-10 top-12 hidden lg:flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 shadow-lg animate-slide-up">
                <div className="w-8 h-8 rounded-lg bg-success-soft flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Conversions</p>
                  <p className="text-sm font-bold">+312% this week</p>
                </div>
              </div>
              <div className="absolute -right-8 -bottom-4 hidden lg:flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 shadow-lg animate-slide-up" style={{ animationDelay: "180ms" }}>
                <div className="w-8 h-8 rounded-lg bg-hot-soft flex items-center justify-center animate-hot-pulse">
                  <Flame className="w-4 h-4 text-hot" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Hot leads</p>
                  <p className="text-sm font-bold">28 ready to buy</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live metrics ticker */}
      <MetricsTicker />

      {/* Logo bar */}
      <section className="border-y border-border bg-muted/30 py-8">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-[11px] uppercase font-bold tracking-[0.2em] text-muted-foreground mb-5">
            Trusted by <span className="text-foreground">1,200+</span> businesses across India
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
            {["MehtaTutorials", "FitLab", "NestRealty", "ZenSpa", "BharatBooks", "PixelHQ", "Bansal Group"].map((n) => (
              <span key={n} className="text-sm font-bold tracking-tight text-muted-foreground hover:text-foreground transition-colors hover:scale-105">
                {n}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <Reveal className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Speed = Revenue</span>
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight mt-3">
            Numbers our customers actually print.
          </h2>
        </Reveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { value: 240, prefix: "₹", suffix: "Cr+", label: "Revenue closed", icon: IndianRupee },
            { value: 4.2, suffix: "M", label: "Messages sent", icon: MessageSquare, decimals: 1 },
            { value: 92, suffix: "s", label: "Median response time", icon: Clock },
            { value: 3.4, suffix: "×", label: "Avg conversion lift", icon: TrendingUp, decimals: 1 },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 80}>
              <div className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all group">
                <s.icon className="w-5 h-5 text-primary mb-3 group-hover:scale-110 transition-transform" />
                <p className="text-3xl md:text-4xl font-bold tracking-tight">
                  <CountUp end={s.value} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals ?? 0} />
                </p>
                <p className="text-[12px] text-muted-foreground font-medium mt-1">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features — benefit-first */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <Reveal className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Outcomes, not features</span>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-3">
            Everything you need to print revenue.
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-relaxed">
            Every feature is built around one question — does this make you money?
          </p>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {benefits.map((f, i) => (
            <Reveal key={f.title} delay={i * 70}>
              <div className="group h-full bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all overflow-hidden relative">
                <span className={`absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br ${f.accent} opacity-0 group-hover:opacity-15 blur-2xl transition-opacity`} />
                <div className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${f.accent} flex items-center justify-center mb-4 shadow-md group-hover:scale-110 group-hover:rotate-3 transition-transform`}>
                  <f.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-1.5">{f.badge}</p>
                <h3 className="text-base font-bold tracking-tight leading-snug">{f.title}</h3>
                <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">{f.desc}</p>
                <FeatureSnippet kind={f.snippet} />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-muted/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <Reveal className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">How it works</span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-3">From chat to closed in 3 steps.</h2>
            <p className="text-muted-foreground mt-3">Setup in 2 minutes. First deal often within 24 hours.</p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* connecting flow line */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            {[
              { n: "01", title: "Connect WhatsApp", desc: "Link your business number in 60 seconds. We sync history, contacts, and conversations automatically.", icon: Plug, time: "60s" },
              { n: "02", title: "AI handles every lead", desc: "Addison reads buying signals, tags hot leads, drafts replies, and sends pay links — automatically.", icon: Sparkles, time: "Instant" },
              { n: "03", title: "You close & repeat", desc: "Review deals, send broadcasts, track revenue — all from one screen. Watch the money roll in.", icon: Rocket, time: "24 hrs" },
            ].map((step, i) => (
              <Reveal key={step.n} delay={i * 120}>
                <div className="bg-card border border-border rounded-2xl p-7 relative overflow-hidden h-full hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all group">
                  <span className="absolute top-4 right-5 text-5xl font-black text-primary/10 tracking-tight group-hover:text-primary/15 transition-colors">{step.n}</span>
                  <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <step.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-base tracking-tight">{step.title}</h3>
                  <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">{step.desc}</p>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-success bg-success-soft px-2 py-1 rounded-full">
                    <Clock className="w-3 h-3" />
                    {step.time}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Inline psychology line */}
          <Reveal className="mt-12 text-center">
            <p className="text-[14px] font-semibold text-muted-foreground">
              <span className="text-foreground">Speed = revenue.</span> AddisonX replies before your competition even sees the lead.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Testimonials */}
      <section id="customers" className="max-w-7xl mx-auto px-6 py-20">
        <Reveal className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Loved by revenue teams</span>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-3">Real teams. Real revenue.</h2>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i * 90}>
              <div className="bg-card border border-border rounded-2xl p-6 flex flex-col h-full hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all group relative overflow-hidden">
                {/* metric badge */}
                <div className="absolute top-5 right-5 text-right">
                  <p className="text-2xl font-black bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent leading-none">
                    {t.metric}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{t.metricLabel}</p>
                </div>

                <div className="flex gap-0.5 text-warning mb-4">
                  {[...Array(5)].map((_, k) => <Star key={k} className="w-3.5 h-3.5 fill-current" />)}
                </div>
                <p className="text-[14px] leading-relaxed flex-1">"{t.quote}"</p>
                <div className="mt-5 pt-4 border-t border-border flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} text-white text-[12px] font-bold flex items-center justify-center shadow-md`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground">{t.role} · {t.company}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Comparison — Why teams switch */}
      <ComparisonGrid />

      {/* Pricing */}
      <section id="pricing" className="bg-muted/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <Reveal className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Pricing</span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-3">Pay only when you grow.</h2>
            <p className="text-muted-foreground mt-4">No hidden fees. No per-message charges. Cancel anytime.</p>
          </Reveal>

          {/* monthly / yearly toggle */}
          <div className="flex items-center justify-center mb-10">
            <div className="inline-flex items-center bg-card border border-border rounded-full p-1 shadow-sm">
              <button
                onClick={() => setYearly(false)}
                className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all ${
                  !yearly ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setYearly(true)}
                className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all flex items-center gap-1.5 ${
                  yearly ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Yearly
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                  yearly ? "bg-primary text-primary-foreground" : "bg-success-soft text-success"
                }`}>
                  SAVE 20%
                </span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {tiers.map((t) => {
              const isCustom = t.monthly === -1;
              const price = isCustom ? "Custom" : t.monthly === 0 ? "₹0" : `₹${(yearly ? t.yearly : t.monthly).toLocaleString("en-IN")}`;
              const suffix = isCustom ? "" : t.monthly === 0 ? "/forever" : yearly ? "/mo · billed yearly" : "/mo";
              return (
                <div
                  key={t.name}
                  className={`rounded-2xl p-7 flex flex-col relative transition-all ${
                    t.featured
                      ? "bg-gradient-to-b from-primary to-primary-glow text-primary-foreground shadow-2xl shadow-primary/40 scale-[1.04] border border-primary/20 animate-glow-pulse"
                      : "bg-card border border-border hover:border-primary/30 hover:shadow-xl hover:-translate-y-1"
                  }`}
                >
                  {t.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-warning text-warning-foreground text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      Most popular
                    </div>
                  )}
                  <h3 className="font-bold text-base tracking-tight">{t.name}</h3>
                  <p className={`text-[12px] mt-1 ${t.featured ? "opacity-80" : "text-muted-foreground"}`}>{t.desc}</p>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight">{price}</span>
                    <span className={`text-[12px] ${t.featured ? "opacity-80" : "text-muted-foreground"}`}>{suffix}</span>
                  </div>
                  {t.roi && (
                    <p className={`mt-2 text-[12px] font-semibold flex items-center gap-1.5 ${
                      t.featured ? "text-primary-foreground/90" : "text-success"
                    }`}>
                      <Target className="w-3.5 h-3.5" /> {t.roi}
                    </p>
                  )}
                  <ul className="mt-6 space-y-2.5 flex-1">
                    {t.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-[13px]">
                        <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${t.featured ? "text-primary-foreground" : "text-success"}`} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={ctaHref}
                    className={`mt-7 w-full py-3 rounded-xl font-bold text-[13px] text-center transition-all hover:scale-[1.03] flex items-center justify-center gap-1.5 ${
                      t.featured
                        ? "bg-background text-foreground hover:bg-background/90 shadow-lg"
                        : "bg-foreground text-background hover:opacity-90"
                    }`}
                  >
                    {t.cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection />

      {/* Final CTA — aggressive */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <Reveal>
          <div className="relative bg-gradient-to-br from-foreground via-foreground to-primary text-background rounded-3xl p-12 lg:p-16 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/30 rounded-full blur-3xl animate-float" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
            <div className="relative text-center">
              <span className="inline-flex items-center gap-2 bg-hot/20 text-hot border border-hot/30 rounded-full px-3 py-1.5 mb-6 text-[11px] font-bold uppercase tracking-wider">
                <Flame className="w-3 h-3 fill-current animate-urgency-shake" />
                Stop the bleed
              </span>
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight max-w-3xl mx-auto leading-[1.05]">
                Every missed reply ={" "}
                <span className="bg-gradient-to-r from-hot via-warning to-hot bg-clip-text text-transparent">
                  lost revenue.
                </span>
                <br />
                Fix it now.
              </h2>
              <p className="text-base md:text-lg opacity-80 mt-5 max-w-xl mx-auto">
                Join 1,200+ teams already closing more, faster, with AddisonX. Setup in 2 minutes. First deal in 24 hours.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
                <Link
                  to={ctaHref}
                  className="group bg-primary text-primary-foreground px-7 py-4 rounded-xl font-bold text-[14px] flex items-center gap-2 hover:bg-primary-glow transition-all shadow-2xl shadow-primary/50 hover:scale-[1.04] hover:-translate-y-0.5"
                >
                  {user ? "Open your workspace" : "Start free → close your first deal today"}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              <p className="mt-5 text-[12px] opacity-70">
                No credit card · 14-day trial · Cancel anytime
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="inline-flex mb-4">
              <AddisonXLogo size={38} withWordmark withTagline />
            </Link>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              The AI-powered WhatsApp sales engine for modern Indian teams. Reply in 2 seconds, close in 24 hours.
            </p>
          </div>
          <FooterCol title="Product" links={["Features", "Pricing", "Integrations", "Changelog"]} />
          <FooterCol title="Company" links={["About", "Blog", "Careers", "Contact"]} />
          <FooterCol title="Legal" links={["Privacy", "Terms", "Security", "DPA"]} />
        </div>
        <div className="border-t border-border">
          <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>© {new Date().getFullYear()} AddisonX Media · Made in India 🇮🇳</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> All systems normal</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Sticky bottom CTA bar */}
      <StickyTrialBar ctaHref={ctaHref} />
    </div>
  );
};

const FooterCol = ({ title, links }: { title: string; links: string[] }) => (
  <div>
    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-foreground mb-3">{title}</p>
    <ul className="space-y-2">
      {links.map((l) => (
        <li key={l}>
          <a href="#" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors story-link">{l}</a>
        </li>
      ))}
    </ul>
  </div>
);

/* ---------- inline feature mini-visuals ---------- */
const FeatureSnippet = ({ kind }: { kind: string }) => {
  if (kind === "ai-reply") {
    return (
      <div className="mt-4 rounded-xl bg-muted/50 border border-border p-3 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Addison suggests</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {["Send pay link 💳", "Schedule demo", "Offer 10% off"].map((s) => (
            <span key={s} className="text-[10px] font-semibold bg-primary-soft text-primary border border-primary/15 rounded-md px-1.5 py-0.5">{s}</span>
          ))}
        </div>
      </div>
    );
  }
  if (kind === "inbox") {
    return (
      <div className="mt-4 rounded-xl bg-muted/50 border border-border p-2 space-y-1">
        {[
          { n: "Priya M.", t: "2m", hot: true },
          { n: "Rohan K.", t: "8m", hot: true },
          { n: "Anika S.", t: "1h", hot: false },
        ].map((c) => (
          <div key={c.n} className="flex items-center gap-2 text-[10px] px-1.5 py-1 rounded-md hover:bg-card transition-colors">
            <span className={`w-1.5 h-1.5 rounded-full ${c.hot ? "bg-hot animate-pulse" : "bg-muted-foreground/30"}`} />
            <span className="font-semibold flex-1 truncate">{c.n}</span>
            <span className="text-muted-foreground">{c.t}</span>
          </div>
        ))}
      </div>
    );
  }
  if (kind === "payment") {
    return (
      <div className="mt-4 rounded-xl border border-success/30 bg-success-soft p-2.5 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-success text-success-foreground flex items-center justify-center">
          <IndianRupee className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold text-success uppercase tracking-wider">Payment received</p>
          <p className="text-[12px] font-bold">₹49,000 from Karan</p>
        </div>
        <Check className="w-4 h-4 text-success" />
      </div>
    );
  }
  if (kind === "broadcast") {
    return (
      <div className="mt-4 rounded-xl bg-muted/50 border border-border p-3">
        <div className="flex items-center justify-between text-[10px] mb-2">
          <span className="font-bold uppercase tracking-wider text-warning">Festive blast</span>
          <span className="text-muted-foreground">412 sent</span>
        </div>
        <div className="grid grid-cols-3 gap-1 text-center">
          <div><p className="text-[14px] font-bold">87%</p><p className="text-[9px] text-muted-foreground">Open</p></div>
          <div><p className="text-[14px] font-bold text-primary">31%</p><p className="text-[9px] text-muted-foreground">Reply</p></div>
          <div><p className="text-[14px] font-bold text-success">₹4.2L</p><p className="text-[9px] text-muted-foreground">Revenue</p></div>
        </div>
      </div>
    );
  }
  if (kind === "analytics") {
    return (
      <div className="mt-4 rounded-xl bg-muted/50 border border-border p-3">
        <div className="flex items-end gap-1.5 h-12">
          {[40, 65, 50, 80, 70, 95, 88].map((h, i) => (
            <div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-primary to-primary-glow opacity-80" style={{ height: `${h}%` }} />
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-success" />
          <span className="font-bold text-success">+34%</span> revenue this week
        </p>
      </div>
    );
  }
  if (kind === "security") {
    return (
      <div className="mt-4 rounded-xl bg-muted/50 border border-border p-3 space-y-1.5">
        {["End-to-end encrypted", "SOC 2 ready", "RLS-isolated tenants"].map((c) => (
          <p key={c} className="text-[11px] flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-success" />
            <span className="font-medium">{c}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default Landing;
