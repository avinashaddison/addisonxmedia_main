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
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/75 border-b border-border/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <AddisonXLogo size={36} withWordmark withTagline={false} />
            <span className="text-[9px] font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-accent text-primary-foreground px-1.5 py-0.5 rounded ml-1 shadow-sm shadow-primary/30">Beta</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-[13px] font-medium">
            {[
              { label: "Features", href: "#features" },
              { label: "How it works", href: "#how" },
              { label: "Pricing", href: "#pricing" },
              { label: "Customers", href: "#customers" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-2 hidden sm:block">
              Log in
            </Link>
            <Link
              to={ctaHref}
              className="relative text-[13px] font-bold bg-foreground text-background px-4 py-2 rounded-lg hover:opacity-90 transition-all flex items-center gap-1.5 shadow-md hover:scale-[1.03] overflow-hidden group"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span className="relative">{user ? "Open app" : "Start free"}</span>
              <ArrowRight className="w-3.5 h-3.5 relative group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Layered backgrounds — mesh + grid + aurora */}
        <div className="absolute inset-0 aurora-bg opacity-40 pointer-events-none animate-aurora" />
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black 30%, transparent 75%)",
          }}
        />
        {/* color blobs */}
        <div className="absolute -top-32 -left-20 w-[520px] h-[520px] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
        <div className="absolute -top-24 right-0 w-[460px] h-[460px] rounded-full bg-accent/15 blur-[120px] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 pt-14 pb-16 lg:pt-20 lg:pb-24">
          <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center">
            <div className="text-center lg:text-left">
              <LiveActivityBadge />

              {/* New product pill */}
              <div className="hidden lg:inline-flex items-center gap-2 mb-5 ml-3 text-[11px] font-semibold bg-card/80 backdrop-blur border border-border rounded-full pl-1 pr-3 py-1 shadow-sm hover:border-primary/40 transition-colors group cursor-default">
                <span className="bg-gradient-to-r from-primary to-accent text-primary-foreground text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">New</span>
                <span className="text-foreground/80">AI Voice replies for WhatsApp calls</span>
                <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </div>

              <h1 className="text-[32px] sm:text-[40px] md:text-6xl lg:text-[72px] font-bold tracking-[-0.025em] leading-[1.05] md:leading-[1.02] break-words">
                Turn every <span className="relative inline-block">
                  <span className="relative z-10">WhatsApp</span>
                  <span className="absolute inset-x-0 bottom-1 h-3 bg-success/25 rounded -z-0" />
                </span> chat into{" "}
                <RotatingWord words={["closed deals.", "₹ in your bank.", "hot leads.", "loyal customers."]} />
              </h1>

              <p className="text-base md:text-[17px] text-muted-foreground mt-6 max-w-2xl lg:max-w-xl mx-auto lg:mx-0 leading-relaxed">
                AddisonX is the AI sales engine that replies in <span className="text-foreground font-semibold">2 seconds</span>, scores hot leads automatically, and closes deals while you sleep. Replace <span className="text-foreground font-semibold">4 tools</span> and 2 spreadsheets.
              </p>

              {/* urgency line */}
              <div className="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-hot bg-hot-soft border border-hot/20 rounded-full px-3 py-1.5">
                <Timer className="w-3.5 h-3.5 animate-urgency-shake" />
                Most leads go cold in 5 minutes. Reply instantly.
              </div>

              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 mt-8">
                <Link
                  to={ctaHref}
                  className="group relative bg-primary text-primary-foreground px-6 py-3.5 rounded-xl font-bold text-[14px] flex items-center gap-2 transition-all shadow-lg shadow-primary/30 hover:shadow-2xl hover:shadow-primary/50 hover:-translate-y-0.5 hover:scale-[1.02] overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-primary via-primary-glow to-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <span className="relative">{user ? "Open your workspace" : "Start closing leads now"}</span>
                  <ArrowRight className="w-4 h-4 relative group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#how"
                  className="bg-card/80 backdrop-blur border border-border px-5 py-3.5 rounded-xl font-semibold text-[14px] flex items-center gap-2 hover:bg-muted hover:border-foreground/20 transition-all group"
                >
                  <span className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center group-hover:scale-110 transition-transform">
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

              {/* Mini avatar social proof */}
              <div className="mt-7 flex items-center justify-center lg:justify-start gap-3">
                <div className="flex -space-x-2">
                  {[
                    { i: "PM", c: "from-hot to-warning" },
                    { i: "RK", c: "from-primary to-accent" },
                    { i: "AS", c: "from-accent to-success" },
                    { i: "VK", c: "from-success to-primary" },
                  ].map((a) => (
                    <div
                      key={a.i}
                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${a.c} ring-2 ring-background flex items-center justify-center text-[10px] font-bold text-primary-foreground`}
                    >
                      {a.i}
                    </div>
                  ))}
                  <div className="w-8 h-8 rounded-full bg-card border-2 border-background flex items-center justify-center text-[9px] font-bold text-foreground">
                    +1.2k
                  </div>
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-warning text-warning" />
                    ))}
                    <span className="text-[11px] font-bold text-foreground ml-1">4.9</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-medium">Loved by 1,200+ India sales teams</p>
                </div>
              </div>
            </div>

            {/* Interactive demo column */}
            <div className="relative mx-auto lg:mx-0 hidden md:block w-full max-w-md lg:max-w-none">
              {/* Aurora glow ring behind */}
              <div className="absolute -inset-8 bg-[conic-gradient(from_140deg_at_50%_50%,hsl(var(--primary)/0.25),hsl(var(--accent)/0.2),hsl(var(--primary-glow)/0.25),hsl(var(--primary)/0.25))] blur-3xl pointer-events-none animate-aurora" />
              {/* Frame */}
              <div className="relative">
                <div className="absolute -inset-px rounded-[28px] bg-gradient-to-br from-primary/40 via-accent/30 to-primary-glow/40 pointer-events-none" />
                <div className="relative bg-card/60 backdrop-blur-xl border border-border rounded-[27px] p-3 shadow-2xl shadow-primary/10">
                  {/* Browser-style header */}
                  <div className="flex items-center justify-between px-2 pb-2.5 mb-2.5 border-b border-border/60">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-hot/70" />
                      <span className="w-2.5 h-2.5 rounded-full bg-warning/70" />
                      <span className="w-2.5 h-2.5 rounded-full bg-success/70" />
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono bg-muted/60 rounded px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                      app.addisonx.ai/inbox
                    </div>
                    <span className="text-[10px] font-semibold text-success bg-success-soft px-1.5 py-0.5 rounded">LIVE</span>
                  </div>
                  <div className="animate-float">
                    <InteractiveChatDemo />
                  </div>
                </div>
              </div>

              {/* floating stat — top */}
              <div className="absolute -left-6 lg:-left-12 top-16 hidden lg:flex items-center gap-2.5 bg-card/95 backdrop-blur border border-border rounded-2xl px-3.5 py-2.5 shadow-xl shadow-primary/10 animate-slide-up hover:scale-105 transition-transform">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-success to-primary flex items-center justify-center shadow-md">
                  <TrendingUp className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Conversions</p>
                  <p className="text-sm font-bold flex items-center gap-1">
                    <span className="bg-gradient-to-r from-success to-primary bg-clip-text text-transparent">+312%</span>
                    <span className="text-[10px] text-muted-foreground font-medium">this wk</span>
                  </p>
                </div>
              </div>

              {/* floating stat — middle right */}
              <div
                className="absolute -right-4 lg:-right-10 top-1/3 hidden lg:flex items-center gap-2.5 bg-card/95 backdrop-blur border border-border rounded-2xl px-3.5 py-2.5 shadow-xl shadow-primary/10 animate-slide-up hover:scale-105 transition-transform"
                style={{ animationDelay: "120ms" }}
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
                  <Zap className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Avg reply</p>
                  <p className="text-sm font-bold">1.8<span className="text-muted-foreground">s</span></p>
                </div>
              </div>

              {/* floating stat — bottom */}
              <div
                className="absolute -right-4 lg:-right-8 -bottom-2 hidden lg:flex items-center gap-2.5 bg-card/95 backdrop-blur border border-border rounded-2xl px-3.5 py-2.5 shadow-xl shadow-hot/10 animate-slide-up hover:scale-105 transition-transform"
                style={{ animationDelay: "220ms" }}
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-hot to-warning flex items-center justify-center shadow-md animate-hot-pulse">
                  <Flame className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Hot leads</p>
                  <p className="text-sm font-bold">28 <span className="text-[10px] text-muted-foreground font-medium">ready to buy</span></p>
                </div>
              </div>

              {/* floating stat — bottom left */}
              <div
                className="absolute -left-4 lg:-left-10 bottom-10 hidden lg:flex items-center gap-2.5 bg-card/95 backdrop-blur border border-border rounded-2xl px-3.5 py-2.5 shadow-xl shadow-success/10 animate-slide-up hover:scale-105 transition-transform"
                style={{ animationDelay: "320ms" }}
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-success to-success flex items-center justify-center shadow-md">
                  <IndianRupee className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Just paid</p>
                  <p className="text-sm font-bold text-success">₹49,000</p>
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
              <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 flex flex-col h-full hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all group relative overflow-hidden">
                {/* metric badge */}
                <div className="absolute top-4 right-4 sm:top-5 sm:right-5 text-right">
                  <p className="text-xl sm:text-2xl font-black bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent leading-none">
                    {t.metric}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{t.metricLabel}</p>
                </div>

                <div className="flex gap-0.5 text-warning mb-4">
                  {[...Array(5)].map((_, k) => <Star key={k} className="w-3.5 h-3.5 fill-current" />)}
                </div>
                <p className="text-[14px] leading-relaxed flex-1 pr-16 sm:pr-20">"{t.quote}"</p>
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
                  className={`rounded-2xl p-6 sm:p-7 flex flex-col relative transition-all ${
                    t.featured
                      ? "bg-gradient-to-b from-primary to-primary-glow text-primary-foreground shadow-2xl shadow-primary/40 md:scale-[1.04] border border-primary/20 md:animate-glow-pulse mt-4 md:mt-0"
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <Reveal>
          <div className="relative bg-gradient-to-br from-foreground via-foreground to-primary text-background rounded-3xl p-6 sm:p-10 lg:p-16 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/30 rounded-full blur-3xl animate-float" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
            <div className="relative text-center">
              <span className="inline-flex items-center gap-2 bg-hot/20 text-hot border border-hot/30 rounded-full px-3 py-1.5 mb-5 sm:mb-6 text-[11px] font-bold uppercase tracking-wider">
                <Flame className="w-3 h-3 fill-current animate-urgency-shake" />
                Stop the bleed
              </span>
              <h2 className="text-[26px] sm:text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight max-w-3xl mx-auto leading-[1.08] sm:leading-[1.05]">
                Every missed reply ={" "}
                <span className="bg-gradient-to-r from-hot via-warning to-hot bg-clip-text text-transparent">
                  lost revenue.
                </span>
                <br />
                Fix it now.
              </h2>
              <p className="text-sm sm:text-base md:text-lg opacity-80 mt-4 sm:mt-5 max-w-xl mx-auto leading-relaxed">
                Join 1,200+ teams already closing more, faster, with AddisonX. Setup in 2 minutes. First deal in 24 hours.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-7 sm:mt-8">
                <Link
                  to={ctaHref}
                  className="group bg-primary text-primary-foreground px-5 sm:px-7 py-3.5 sm:py-4 rounded-xl font-bold text-[13px] sm:text-[14px] flex items-center gap-2 hover:bg-primary-glow transition-all shadow-2xl shadow-primary/50 hover:scale-[1.04] hover:-translate-y-0.5 text-center"
                >
                  <span className="truncate">{user ? "Open your workspace" : "Start free → close your first deal today"}</span>
                  <ArrowRight className="w-4 h-4 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
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
      <footer className="border-t border-border bg-muted/20 pb-24 md:pb-0">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-flex mb-4">
              <AddisonXLogo size={38} withWordmark withTagline />
            </Link>
            <p className="text-[12px] text-muted-foreground leading-relaxed max-w-xs">
              The AI-powered WhatsApp sales engine for modern Indian teams. Reply in 2 seconds, close in 24 hours.
            </p>
          </div>
          <FooterCol title="Product" links={["Features", "Pricing", "Integrations", "Changelog"]} />
          <FooterCol title="Company" links={["About", "Blog", "Careers", "Contact"]} />
          <FooterCol title="Legal" links={["Privacy", "Terms", "Security", "DPA"]} />
        </div>
        <div className="border-t border-border">
          <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center sm:justify-between gap-2 text-[11px] text-muted-foreground text-center sm:text-left">
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
