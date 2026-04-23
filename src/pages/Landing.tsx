import { Link } from "react-router-dom";
import {
  MessageCircle, Sparkles, Zap, Shield, BarChart3, Users, Bot, Send,
  ArrowRight, Check, Star, Flame, TrendingUp, Globe, Clock, Award,
  ChevronRight, Play, IndianRupee, MessageSquare, Phone, Inbox,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";


const features = [
  {
    icon: Bot,
    title: "AI Sales Co-Pilot",
    desc: "Suggests winning replies in real-time, scores leads automatically, and never lets a hot lead go cold.",
    accent: "from-primary to-primary-glow",
  },
  {
    icon: Inbox,
    title: "Unified WhatsApp Inbox",
    desc: "Every chat, lead, and deal in one stream. No more juggling 12 phones across the team.",
    accent: "from-accent to-primary",
  },
  {
    icon: Zap,
    title: "Broadcasts that Convert",
    desc: "Send personalized blasts to 10,000 leads in one click. Track opens, replies, revenue per blast.",
    accent: "from-warning to-hot",
  },
  {
    icon: BarChart3,
    title: "Pipeline & Revenue Analytics",
    desc: "Live conversion funnel, win-rate by agent, and revenue forecasts that update by the second.",
    accent: "from-success to-primary",
  },
  {
    icon: Shield,
    title: "Bank-Grade Security",
    desc: "End-to-end encrypted. Row-level security. SOC 2 ready. Your customer data never leaves your tenant.",
    accent: "from-accent to-accent",
  },
  {
    icon: Globe,
    title: "Built for India",
    desc: "Native UPI links, Hindi/English replies, INR pricing — designed for the way you actually sell.",
    accent: "from-hot to-warning",
  },
];

const testimonials = [
  {
    quote: "We closed ₹47L in the first 30 days. The AI suggestions feel like having a senior closer on every chat.",
    name: "Priya Mehta",
    role: "Founder, Mehta Tutorials",
    metric: "₹47L closed",
  },
  {
    quote: "Cut response time from 4 hours to 90 seconds. Our hot-lead conversion jumped 3.2x in week one.",
    name: "Rohan Kapoor",
    role: "Head of Sales, FitLab",
    metric: "3.2x conversion",
  },
  {
    quote: "Finally a CRM that sales people actually open. The team begs me not to switch back to the old tools.",
    name: "Anika Sharma",
    role: "VP Growth, NestRealty",
    metric: "12hr → 90s reply time",
  },
];

const tiers = [
  {
    name: "Starter",
    price: "₹0",
    suffix: "/forever",
    desc: "Get a feel for the engine.",
    features: ["1 WhatsApp number", "Up to 100 contacts", "AI replies (50/mo)", "Basic analytics"],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Growth",
    price: "₹2,499",
    suffix: "/mo",
    desc: "For teams ready to scale revenue.",
    features: [
      "Unlimited contacts",
      "5 team seats",
      "AI replies — unlimited",
      "Broadcasts (10k recipients/mo)",
      "Pipeline & forecasts",
      "Priority support",
    ],
    cta: "Start 14-day trial",
    featured: true,
  },
  {
    name: "Scale",
    price: "Custom",
    suffix: "",
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
  },
];

const Landing = () => {
  const { user } = useAuth();
  const ctaHref = user ? "/app" : "/auth";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-md shadow-primary/30">
              <MessageCircle className="w-4 h-4 text-primary-foreground" fill="currentColor" strokeWidth={0} />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-background" />
            </div>
            <span className="font-bold tracking-tight">AddisonX</span>
            <span className="text-[10px] font-bold uppercase bg-primary-soft text-primary px-1.5 py-0.5 rounded">Beta</span>
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
              className="text-[13px] font-bold bg-foreground text-background px-4 py-2 rounded-lg hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm"
            >
              {user ? "Open app" : "Start free"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-soft/50 via-background to-background pointer-events-none" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-16 lg:pt-28 lg:pb-24 text-center">
          <a
            href="#features"
            className="inline-flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1.5 mb-6 hover:border-primary/30 transition-all shadow-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[11px] font-bold text-foreground">NEW</span>
            <span className="text-[12px] text-muted-foreground">AI sales co-pilot is live</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </a>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.05]">
            Close every WhatsApp lead{" "}
            <span className="bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
              before they ghost you.
            </span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground mt-6 max-w-2xl mx-auto leading-relaxed">
            AddisonX is the AI-powered WhatsApp sales engine that turns chats into closed deals — in seconds, not days.
            Replace 4 tools, 2 spreadsheets, and a whole lot of stress.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-9">
            <Link
              to={ctaHref}
              className="group bg-primary text-primary-foreground px-6 py-3.5 rounded-xl font-bold text-[14px] flex items-center gap-2 hover:bg-primary-glow transition-all shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-0.5"
            >
              {user ? "Open your workspace" : "Start free — no card needed"}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#how"
              className="bg-card border border-border px-6 py-3.5 rounded-xl font-semibold text-[14px] flex items-center gap-2 hover:bg-muted transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              See it in 90 seconds
            </a>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-success" /> 14-day free trial</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-success" /> Setup in 2 minutes</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-success" /> Cancel anytime</span>
          </div>

          {/* Product mockup */}
          <div className="mt-16 relative max-w-5xl mx-auto">
            <div className="absolute inset-x-0 -top-8 h-40 bg-gradient-to-b from-primary/20 to-transparent blur-2xl" />
            <div className="relative rounded-2xl overflow-hidden border border-border shadow-2xl shadow-primary/10 bg-card">
              <FauxAppPreview />
            </div>
            {/* floating stats */}
            <div className="absolute -left-4 md:-left-12 top-1/3 hidden md:flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 shadow-lg animate-slide-up">
              <div className="w-8 h-8 rounded-lg bg-success-soft flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-success" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Conversions</p>
                <p className="text-sm font-bold">+312% this week</p>
              </div>
            </div>
            <div className="absolute -right-4 md:-right-12 bottom-1/4 hidden md:flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 shadow-lg animate-slide-up" style={{ animationDelay: "150ms" }}>
              <div className="w-8 h-8 rounded-lg bg-hot-soft flex items-center justify-center">
                <Flame className="w-4 h-4 text-hot" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Hot leads</p>
                <p className="text-sm font-bold">28 ready to buy</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logo bar */}
      <section className="border-y border-border bg-muted/30 py-8">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-[11px] uppercase font-bold tracking-[0.2em] text-muted-foreground mb-5">
            Trusted by 1,200+ revenue teams across India
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
            {["MehtaTutorials", "FitLab", "NestRealty", "ZenSpa", "BharatBooks", "PixelHQ"].map((n) => (
              <span key={n} className="text-sm font-bold tracking-tight text-muted-foreground">{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { value: "₹240Cr+", label: "Revenue closed", icon: IndianRupee },
            { value: "4.2M", label: "Messages sent", icon: MessageSquare },
            { value: "92s", label: "Median response time", icon: Clock },
            { value: "3.4x", label: "Avg lead conversion lift", icon: TrendingUp },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-all">
              <s.icon className="w-5 h-5 text-primary mb-3" />
              <p className="text-3xl font-bold tracking-tight">{s.value}</p>
              <p className="text-[12px] text-muted-foreground font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Built for closers</span>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-3">
            Everything you need to win every chat.
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-relaxed">
            One workspace, one screen, zero context-switching. Your reps will love you for it.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all animate-slide-up"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.accent} flex items-center justify-center mb-4 shadow-md`}>
                <f.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <h3 className="text-base font-bold tracking-tight">{f.title}</h3>
              <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-muted/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">How it works</span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-3">From chat to closed in 3 steps.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: "01", title: "Connect WhatsApp", desc: "Link your business number in 60 seconds. We sync history, contacts, and conversations automatically.", icon: Phone },
              { n: "02", title: "AI scores every lead", desc: "Our model reads buying signals, tags hot leads, drafts replies, and queues follow-ups for you.", icon: Sparkles },
              { n: "03", title: "Close & repeat", desc: "Send pay links, broadcasts, and offers without leaving the chat. Track revenue in real time.", icon: Award },
            ].map((step) => (
              <div key={step.n} className="bg-card border border-border rounded-2xl p-7 relative overflow-hidden">
                <span className="absolute top-4 right-5 text-5xl font-black text-primary/10 tracking-tight">{step.n}</span>
                <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center mb-4">
                  <step.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base tracking-tight">{step.title}</h3>
                <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="customers" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Loved by revenue teams</span>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-3">Real teams. Real revenue.</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <div key={t.name} className="bg-card border border-border rounded-2xl p-6 flex flex-col">
              <div className="flex gap-0.5 text-warning mb-4">
                {[...Array(5)].map((_, k) => <Star key={k} className="w-3.5 h-3.5 fill-current" />)}
              </div>
              <p className="text-[14px] leading-relaxed flex-1">"{t.quote}"</p>
              <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-bold">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">{t.role}</p>
                </div>
                <span className="text-[11px] font-bold text-primary bg-primary-soft px-2 py-1 rounded-full">{t.metric}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-muted/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Pricing</span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-3">Pay only when you grow.</h2>
            <p className="text-muted-foreground mt-4">No hidden fees. No per-message charges. Cancel anytime.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={`rounded-2xl p-7 flex flex-col ${
                  t.featured
                    ? "bg-gradient-to-b from-primary to-primary-glow text-primary-foreground shadow-2xl shadow-primary/30 scale-[1.02] border border-primary/20"
                    : "bg-card border border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-base tracking-tight">{t.name}</h3>
                  {t.featured && (
                    <span className="text-[10px] font-black bg-background/20 backdrop-blur px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Most popular
                    </span>
                  )}
                </div>
                <p className={`text-[12px] ${t.featured ? "opacity-80" : "text-muted-foreground"}`}>{t.desc}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">{t.price}</span>
                  <span className={`text-[12px] ${t.featured ? "opacity-80" : "text-muted-foreground"}`}>{t.suffix}</span>
                </div>
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
                  className={`mt-7 w-full py-3 rounded-xl font-bold text-[13px] text-center transition-all ${
                    t.featured
                      ? "bg-background text-foreground hover:bg-background/90"
                      : "bg-foreground text-background hover:opacity-90"
                  }`}
                >
                  {t.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <div className="relative bg-gradient-to-br from-foreground via-foreground to-primary text-background rounded-3xl p-12 lg:p-16 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight max-w-2xl mx-auto leading-tight">
              Stop losing leads to slow replies.
            </h2>
            <p className="text-base md:text-lg opacity-80 mt-4 max-w-xl mx-auto">
              Join 1,200+ teams already closing more, faster, with AddisonX.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <Link
                to={ctaHref}
                className="group bg-primary text-primary-foreground px-7 py-3.5 rounded-xl font-bold text-[14px] flex items-center gap-2 hover:bg-primary-glow transition-all shadow-xl shadow-primary/40"
              >
                {user ? "Open your workspace" : "Start free — no card needed"}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a href="#pricing" className="text-[13px] font-semibold opacity-90 hover:opacity-100 px-3 py-2">
                See pricing →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-primary-foreground" fill="currentColor" strokeWidth={0} />
              </div>
              <span className="font-bold tracking-tight">AddisonX</span>
            </Link>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              The AI-powered WhatsApp sales engine for modern teams.
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
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-success" /> All systems normal</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FooterCol = ({ title, links }: { title: string; links: string[] }) => (
  <div>
    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-foreground mb-3">{title}</p>
    <ul className="space-y-2">
      {links.map((l) => (
        <li key={l}>
          <a href="#" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">{l}</a>
        </li>
      ))}
    </ul>
  </div>
);

// A tiny faux app preview that mirrors the real UI vibe
const FauxAppPreview = () => (
  <div className="grid grid-cols-[64px_280px_1fr] h-[420px] bg-background text-left">
    {/* Sidebar */}
    <div className="bg-card border-r border-border flex flex-col items-center py-3 gap-3">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
        <MessageCircle className="w-3.5 h-3.5 text-primary-foreground" fill="currentColor" strokeWidth={0} />
      </div>
      <div className="w-7 h-px bg-border my-1" />
      {[Inbox, Users, BarChart3, Send, Sparkles].map((Icon, i) => (
        <div key={i} className={`w-9 h-9 rounded-lg flex items-center justify-center ${i === 0 ? "bg-primary-soft text-primary" : "text-muted-foreground"}`}>
          <Icon className="w-4 h-4" />
        </div>
      ))}
    </div>
    {/* Conversation list */}
    <div className="bg-card border-r border-border overflow-hidden">
      <div className="px-3 py-2.5 border-b border-border">
        <p className="text-[11px] font-bold">Inbox · 28 hot</p>
      </div>
      {[
        { n: "Priya M.", m: "Yes, send the pricing 🙏", t: "2m", hot: true, unread: 2 },
        { n: "Rohan K.", m: "Can we do ₹1,999?", t: "8m", hot: true, unread: 1 },
        { n: "Anika S.", m: "Loved the demo, thanks!", t: "1h", hot: false },
        { n: "Vikram T.", m: "Forwarding to my team", t: "3h", hot: false },
        { n: "Aditi R.", m: "What's included in Growth?", t: "5h", hot: false, unread: 1 },
      ].map((c, i) => (
        <div key={i} className={`px-3 py-2.5 border-b border-border flex items-center gap-2.5 ${i === 0 ? "bg-primary-soft/50" : ""}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${c.hot ? "bg-hot-soft text-hot" : "bg-muted text-muted-foreground"}`}>
            {c.n.split(" ").map((s) => s[0]).join("")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold truncate">{c.n}</p>
              <span className="text-[9px] text-muted-foreground">{c.t}</span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{c.m}</p>
          </div>
          {c.unread && <span className="w-4 h-4 rounded-full bg-primary text-[9px] text-primary-foreground font-bold flex items-center justify-center">{c.unread}</span>}
        </div>
      ))}
    </div>
    {/* Chat */}
    <div className="flex flex-col" style={{ background: "hsl(var(--chat-bg))" }}>
      <div className="px-4 py-2.5 bg-card border-b border-border flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-hot-soft text-hot flex items-center justify-center text-[10px] font-bold">PM</div>
        <div className="flex-1">
          <p className="text-[12px] font-bold">Priya Mehta <span className="text-[9px] font-bold bg-hot text-hot-foreground px-1 py-0.5 rounded ml-1">92</span></p>
          <p className="text-[10px] text-muted-foreground">+91 98xxx xxx12 · WhatsApp</p>
        </div>
      </div>
      <div className="flex-1 px-4 py-3 space-y-2 overflow-hidden">
        <Bubble side="in">Hey! Saw your ad. What's the price for 100 students?</Bubble>
        <Bubble side="out">Hi Priya! For 100 students, our Growth plan at ₹2,499/mo covers everything you need. Want me to send a quick demo link?</Bubble>
        <Bubble side="in" highlight>Yes, send the pricing 🙏</Bubble>
        <Bubble side="out" pending>On it — sending now ✨</Bubble>
      </div>
      <div className="px-3 py-2 bg-card border-t border-border">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="text-[9px] font-bold text-primary uppercase tracking-wider">AI suggests</span>
        </div>
        <div className="flex gap-1.5 overflow-hidden">
          {["Send pay link 💳", "Schedule demo", "Share case study"].map((s) => (
            <span key={s} className="text-[11px] font-semibold bg-primary-soft text-primary border border-primary/15 rounded-lg px-2 py-1 whitespace-nowrap">{s}</span>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const Bubble = ({ side, children, highlight, pending }: { side: "in" | "out"; children: React.ReactNode; highlight?: boolean; pending?: boolean }) => (
  <div className={`flex ${side === "out" ? "justify-end" : "justify-start"}`}>
    <div className={`max-w-[80%] rounded-xl px-3 py-1.5 text-[12px] leading-snug ${
      side === "out"
        ? "bg-[hsl(var(--chat-outgoing))] rounded-br-sm"
        : "bg-card shadow-sm rounded-bl-sm"
    } ${highlight ? "ring-2 ring-warning/40" : ""}`}>
      {children}
      {pending && <span className="ml-1 inline-flex"><Loader /></span>}
    </div>
  </div>
);

const Loader = () => (
  <span className="inline-flex gap-0.5">
    <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
    <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "120ms" }} />
    <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "240ms" }} />
  </span>
);

export default Landing;
