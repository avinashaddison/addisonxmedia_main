import { Link } from "react-router-dom";
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
  TrendingUp,
  Clock,
  Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { InteractiveChatDemo } from "@/components/landing/InteractiveChatDemo";
import { FAQSection } from "@/components/landing/FAQSection";

const SERIF = { fontFamily: "'Instrument Serif', serif" };
const SANS = { fontFamily: "'Work Sans', system-ui, sans-serif" };

const Landing = () => {
  const { user } = useAuth();
  const ctaHref = user ? "/app" : "/auth";

  return (
    <div className="min-h-screen bg-background text-foreground antialiased overflow-x-hidden" style={SANS}>
      {/* ============ NAV ============ */}
      <header className="sticky top-0 z-40 bg-background/70 backdrop-blur-xl border-b border-border/40">
        <nav className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="relative w-8 h-8 rounded-lg bg-foreground text-background flex items-center justify-center font-bold text-sm overflow-hidden">
              <span className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary-glow opacity-90" />
              <span className="relative z-10 text-background">A</span>
            </span>
            <span className="text-[17px] font-semibold tracking-tight">Addison</span>
            <span className="hidden sm:inline-flex ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary bg-primary-soft px-1.5 py-0.5 rounded">
              v2
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-9 text-[13px] text-muted-foreground">
            <a href="#product" className="hover:text-foreground transition-colors">Product</a>
            <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="hidden sm:inline-flex text-[13px] font-medium text-muted-foreground hover:text-foreground px-3 py-2"
            >
              Sign in
            </Link>
            <Link
              to={ctaHref}
              className="group relative text-[13px] font-semibold bg-foreground text-background hover:opacity-90 transition rounded-lg px-3.5 py-2 inline-flex items-center gap-1.5 overflow-hidden"
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
      <section className="relative border-b border-border/40 overflow-hidden">
        {/* Aurora background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(60% 70% at 15% 10%, hsl(var(--primary) / 0.22), transparent 60%), radial-gradient(50% 60% at 85% 20%, hsl(var(--accent) / 0.20), transparent 60%), radial-gradient(70% 60% at 50% 100%, hsl(var(--primary-glow) / 0.18), transparent 60%)",
              animation: "aurora 14s ease-in-out infinite",
              backgroundSize: "200% 200%",
            }}
          />
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
              maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black 30%, transparent 80%)",
            }}
          />
        </div>

        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-14 sm:pt-24 pb-16 sm:pb-24 grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80 mb-7 bg-card/60 backdrop-blur border border-border/60 rounded-full px-3 py-1.5 shadow-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
              </span>
              Live · 124 deals closing right now
            </div>

            <h1
              className="text-[44px] sm:text-[64px] lg:text-[82px] leading-[0.98] tracking-[-0.025em] text-foreground"
              style={SERIF}
            >
              Reply faster.
              <br />
              <span className="italic bg-gradient-to-r from-primary via-accent to-primary-glow bg-clip-text text-transparent">
                Close more.
              </span>
              <br />
              Sleep better.
            </h1>

            <p className="mt-7 text-[16px] sm:text-[18px] leading-[1.6] text-muted-foreground max-w-[540px]">
              Addison turns WhatsApp, Instagram, and forms into one calm inbox — with an AI that
              drafts replies, sends pay links, and closes deals while you focus on the work that
              matters.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-3 sm:items-center">
              <Link
                to={ctaHref}
                className="group relative inline-flex items-center justify-center gap-2 bg-foreground text-background rounded-xl px-5 py-3.5 text-[14px] font-semibold transition-all hover:scale-[1.02] hover:shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)] overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary-glow opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 flex items-center gap-2">
                  Start free — no card
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
              <a
                href="#product"
                className="group inline-flex items-center justify-center gap-2 text-[14px] font-medium text-foreground hover:text-primary transition-colors px-3 py-3.5"
              >
                See how it works
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> 14-day trial</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Setup in 4 min</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Cancel anytime</span>
              <span className="flex items-center gap-1.5">
                <span className="flex -space-x-1">
                  {["A", "R", "K"].map((c, i) => (
                    <span
                      key={i}
                      className="w-5 h-5 rounded-full border-2 border-background bg-gradient-to-br from-primary to-accent text-[9px] font-bold text-background flex items-center justify-center"
                    >
                      {c}
                    </span>
                  ))}
                </span>
                <span className="flex items-center gap-0.5 text-foreground/80 font-medium">
                  <Star className="w-3 h-3 fill-warning text-warning" /> 4.9 · 2.4k founders
                </span>
              </span>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative">
              {/* Glow */}
              <div className="absolute -inset-10 bg-gradient-to-br from-primary/25 via-accent/15 to-primary-glow/20 blur-3xl -z-10 rounded-full animate-pulse" style={{ animationDuration: "4s" }} />
              {/* Floating chips */}
              <div className="absolute -top-4 -left-6 hidden sm:flex items-center gap-1.5 bg-card/90 backdrop-blur border border-border rounded-full px-2.5 py-1.5 shadow-lg shadow-primary/10 z-10" style={{ animation: "float 4s ease-in-out infinite" }}>
                <Bot className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-semibold">AI replied in 1.2s</span>
              </div>
              <div className="absolute -bottom-4 -right-4 hidden sm:flex items-center gap-1.5 bg-card/90 backdrop-blur border border-border rounded-full px-2.5 py-1.5 shadow-lg shadow-success/10 z-10" style={{ animation: "float 5s ease-in-out infinite", animationDelay: "1s" }}>
                <Wallet className="w-3 h-3 text-success" />
                <span className="text-[10px] font-semibold">+₹2,499 received</span>
              </div>
              <InteractiveChatDemo />
            </div>
          </div>
        </div>
      </section>

      {/* ============ MARQUEE LOGOS ============ */}
      <section className="border-b border-border/40 bg-secondary/30 overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-7">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground text-center mb-5">
            Powering revenue at
          </p>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-secondary/80 to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-secondary/80 to-transparent z-10 pointer-events-none" />
            <div className="flex gap-12 whitespace-nowrap" style={{ animation: "ticker-scroll 28s linear infinite" }}>
              {[
                "Lumen Coaching", "Brewd Studio", "PitchCraft", "Northbound", "Crescent Tutors",
                "Maker House", "Halcyon", "Saffron Labs", "Arclight", "Pulse Academy",
                "Lumen Coaching", "Brewd Studio", "PitchCraft", "Northbound", "Crescent Tutors",
                "Maker House", "Halcyon", "Saffron Labs", "Arclight", "Pulse Academy",
              ].map((name, i) => (
                <span
                  key={i}
                  className="text-[18px] sm:text-[22px] tracking-tight text-muted-foreground/70 hover:text-foreground transition-colors"
                  style={SERIF}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ TRUST STRIP ============ */}
      <section className="border-b border-border/40">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden">
            {[
              { k: "₹4.2 Cr", v: "Revenue closed in chat", icon: TrendingUp },
              { k: "3.1×", v: "Faster reply time", icon: Zap },
              { k: "92%", v: "Hot-lead capture", icon: Star },
              { k: "<2s", v: "AI reply latency", icon: Clock },
            ].map((s) => (
              <div key={s.v} className="bg-background p-6 sm:p-8 group hover:bg-secondary/40 transition-colors">
                <s.icon className="w-4 h-4 text-primary mb-3" strokeWidth={1.75} />
                <p className="text-[28px] sm:text-[36px] tracking-tight text-foreground leading-none" style={SERIF}>
                  {s.k}
                </p>
                <p className="text-[12px] text-muted-foreground mt-2">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRODUCT / FEATURES ============ */}
      <section id="product" className="border-b border-border/40 relative overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl -z-10" />

        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="max-w-2xl mb-14">
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary mb-4 font-semibold">
              ◆ The product
            </p>
            <h2 className="text-[36px] sm:text-[56px] leading-[1.02] tracking-tight" style={SERIF}>
              Four tools, <span className="italic text-muted-foreground">one quiet inbox.</span>
            </h2>
            <p className="mt-5 text-[15px] sm:text-[17px] text-muted-foreground leading-relaxed">
              No bloat. No 47 tabs. Just the four things that actually move money — built to feel
              like one product.
            </p>
          </div>

          {/* Bento grid */}
          <div className="grid md:grid-cols-6 gap-4">
            {[
              {
                icon: Bot, tag: "AI replies", title: "Drafted in under two seconds.",
                body: "Tone-matched, price-aware suggestions trained on your top scripts. Approve with a tap.",
                span: "md:col-span-4", featured: true,
              },
              {
                icon: Inbox, tag: "Unified inbox", title: "WhatsApp. Instagram. Forms.",
                body: "Every conversation in one stream, sorted by intent.",
                span: "md:col-span-2",
              },
              {
                icon: Wallet, tag: "Pay links", title: "Money in, deal won.",
                body: "Razorpay & UPI inside the chat. Webhooks close the deal the moment payment lands.",
                span: "md:col-span-3",
              },
              {
                icon: Zap, tag: "Broadcasts", title: "10K leads, every rupee tracked.",
                body: "Personalized blasts with merge tags, A/B variants, and revenue attribution.",
                span: "md:col-span-3",
              },
            ].map((f) => (
              <div
                key={f.tag}
                className={`${f.span} group relative rounded-2xl border border-border bg-card p-7 sm:p-9 overflow-hidden hover:border-primary/40 transition-all hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5`}
              >
                {f.featured && (
                  <div
                    className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent rounded-full blur-2xl pointer-events-none"
                  />
                )}
                <div className="flex items-center gap-2 mb-6 relative z-10">
                  <span className="w-7 h-7 rounded-md bg-primary-soft border border-primary/20 flex items-center justify-center">
                    <f.icon className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                    {f.tag}
                  </span>
                </div>
                <h3 className="text-[24px] sm:text-[30px] leading-[1.12] tracking-tight relative z-10" style={SERIF}>
                  {f.title}
                </h3>
                <p className="mt-4 text-[14px] text-muted-foreground leading-relaxed relative z-10">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how" className="border-b border-border/40 bg-secondary/40 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-primary mb-4 font-semibold">
                ◆ How it works
              </p>
              <h2 className="text-[36px] sm:text-[52px] leading-[1.02] tracking-tight" style={SERIF}>
                Four minutes to your <span className="italic">first closed deal.</span>
              </h2>
            </div>

            <ol className="lg:col-span-8 space-y-1">
              {[
                { n: "01", t: "Connect WhatsApp & Instagram", d: "One tap. We handle the OAuth dance and sync your last 30 days of chats." },
                { n: "02", t: "Train Addison on your voice", d: "Paste your three best replies. Addison learns tone, pricing, objections, the lot." },
                { n: "03", t: "Go live, watch deals close", d: "Approve AI drafts with a tap. Send pay links. Get notified when money lands." },
              ].map((s) => (
                <li
                  key={s.n}
                  className="grid grid-cols-[auto_1fr] gap-6 sm:gap-10 py-7 border-t border-border first:border-t-0 group"
                >
                  <span
                    className="text-[36px] sm:text-[44px] tabular-nums tracking-tight bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent leading-none pt-1"
                    style={SERIF}
                  >
                    {s.n}
                  </span>
                  <div>
                    <h3 className="text-[22px] sm:text-[28px] tracking-tight" style={SERIF}>
                      {s.t}
                    </h3>
                    <p className="mt-2 text-[14px] sm:text-[15px] text-muted-foreground leading-relaxed max-w-xl">
                      {s.d}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIAL ============ */}
      <section className="border-b border-border/40 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-40" style={{
          background: "radial-gradient(60% 60% at 50% 50%, hsl(var(--primary) / 0.12), transparent 70%)",
        }} />
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-1 mb-6">
            {[1,2,3,4,5].map(i => (
              <Star key={i} className="w-4 h-4 fill-warning text-warning" />
            ))}
          </div>
          <blockquote
            className="text-[28px] sm:text-[44px] leading-[1.18] tracking-tight text-foreground"
            style={SERIF}
          >
            <span className="italic text-primary">“</span>
            We replaced three tools with Addison and our close rate jumped from{" "}
            <span className="italic text-muted-foreground">14%</span> to{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-medium">38%</span>{" "}
            in six weeks. The AI replies feel like me, but on a really good day.
            <span className="italic text-primary">”</span>
          </blockquote>
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-hot to-accent text-background flex items-center justify-center text-[12px] font-bold ring-2 ring-background shadow-lg">
              RA
            </div>
            <div className="text-left">
              <p className="text-[13px] font-semibold">Riya Agarwal</p>
              <p className="text-[12px] text-muted-foreground">Founder, Lumen Coaching</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" className="border-b border-border/40">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary mb-4 font-semibold">
              ◆ Pricing
            </p>
            <h2 className="text-[36px] sm:text-[56px] leading-[1.02] tracking-tight" style={SERIF}>
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
                className={`relative rounded-2xl p-8 sm:p-10 border transition-all hover:-translate-y-1 ${
                  p.primary
                    ? "bg-foreground text-background border-foreground shadow-2xl shadow-primary/20"
                    : "bg-background border-border hover:border-primary/30"
                }`}
              >
                {p.primary && (
                  <>
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 via-transparent to-accent/20 pointer-events-none" />
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-[0.16em] bg-gradient-to-r from-primary to-accent text-background px-3 py-1 rounded-full shadow-lg">
                      Most popular
                    </div>
                  </>
                )}
                <div className="relative">
                  <h3 className="text-[26px] tracking-tight mb-2" style={SERIF}>
                    {p.name}
                  </h3>
                  <p className={`text-[12px] mb-6 ${p.primary ? "text-background/60" : "text-muted-foreground"}`}>
                    {p.tag}
                  </p>
                  <p className="flex items-baseline gap-1.5 mb-7">
                    <span className="text-[52px] tracking-tight leading-none" style={SERIF}>
                      {p.price}
                    </span>
                    <span className={`text-[13px] ${p.primary ? "text-background/60" : "text-muted-foreground"}`}>
                      /month
                    </span>
                  </p>
                  <ul className="space-y-3 mb-8">
                    {p.feat.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[14px]">
                        <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${p.primary ? "text-primary-glow" : "text-primary"}`} />
                        <span className={p.primary ? "text-background/90" : "text-foreground"}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={ctaHref}
                    className={`group w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold transition hover:opacity-90 ${
                      p.primary ? "bg-background text-foreground" : "bg-foreground text-background"
                    }`}
                  >
                    Start free trial
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center mt-10 text-[12px] text-muted-foreground inline-flex items-center gap-2 w-full justify-center">
            <Shield className="w-3.5 h-3.5 text-primary" />
            Bank-grade encryption · GDPR + DPDP compliant · Hosted in Mumbai
          </p>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="border-b border-border/40">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="text-center mb-12">
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary mb-4 font-semibold">
              ◆ Questions
            </p>
            <h2 className="text-[36px] sm:text-[52px] leading-[1.02] tracking-tight" style={SERIF}>
              Things people <span className="italic">usually ask.</span>
            </h2>
          </div>
          <FAQSection />
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-80"
          style={{
            background:
              "radial-gradient(50% 60% at 50% 0%, hsl(var(--primary) / 0.20), transparent 60%), radial-gradient(50% 60% at 50% 100%, hsl(var(--accent) / 0.15), transparent 60%)",
          }}
        />
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-24 sm:py-32 text-center">
          <Sparkles className="w-6 h-6 text-primary mx-auto mb-6" style={{ animation: "float 3s ease-in-out infinite" }} />
          <h2 className="text-[44px] sm:text-[72px] leading-[1.0] tracking-tight" style={SERIF}>
            Stop missing replies.
            <br />
            <span className="italic bg-gradient-to-r from-primary via-accent to-primary-glow bg-clip-text text-transparent">
              Start closing deals.
            </span>
          </h2>
          <p className="mt-6 text-[15px] sm:text-[17px] text-muted-foreground max-w-lg mx-auto">
            Try Addison free for 14 days. No card. Cancel in two clicks.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={ctaHref}
              className="group relative inline-flex items-center justify-center gap-2 bg-foreground text-background rounded-xl px-6 py-3.5 text-[14px] font-semibold transition hover:scale-[1.02] hover:shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)] w-full sm:w-auto overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary-glow opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10 flex items-center gap-2">
                Start free
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center justify-center gap-2 text-[14px] font-medium text-foreground hover:text-primary transition-colors px-3 py-3.5"
            >
              Sign in instead
            </Link>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-border/40">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="relative w-7 h-7 rounded-md bg-foreground text-background flex items-center justify-center font-bold text-[12px] overflow-hidden">
              <span className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary-glow" />
              <span className="relative z-10">A</span>
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

export default Landing;
