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
    <div className="min-h-screen bg-background text-foreground antialiased" style={SANS}>
      {/* ============ NAV ============ */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/60">
        <nav className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-md bg-foreground text-background flex items-center justify-center font-bold text-sm">
              A
            </span>
            <span className="text-[17px] font-semibold tracking-tight">Addison</span>
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
              className="text-[13px] font-medium bg-foreground text-background hover:opacity-90 transition-opacity rounded-lg px-3.5 py-2 inline-flex items-center gap-1.5"
            >
              Start free
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </nav>
      </header>

      {/* ============ HERO ============ */}
      <section className="border-b border-border/60">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-14 sm:pt-24 pb-16 sm:pb-24 grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              An AI-native sales inbox
            </div>

            <h1
              className="text-[44px] sm:text-[64px] lg:text-[78px] leading-[1.02] tracking-[-0.02em] text-foreground"
              style={SERIF}
            >
              Reply faster.
              <br />
              <span className="italic text-muted-foreground">Close more.</span>
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
                className="inline-flex items-center justify-center gap-2 bg-foreground text-background rounded-xl px-5 py-3.5 text-[14px] font-semibold hover:opacity-90 transition-opacity"
              >
                Start free — no card
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#product"
                className="inline-flex items-center justify-center gap-2 text-[14px] font-medium text-foreground hover:text-primary transition-colors px-3 py-3.5"
              >
                See how it works
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>

            <div className="mt-10 flex items-center gap-6 text-[12px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> 14-day trial</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Setup in 4 min</span>
              <span className="hidden sm:flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Cancel anytime</span>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative">
              <div className="absolute -inset-6 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 blur-2xl -z-10 rounded-full" />
              <InteractiveChatDemo />
            </div>
          </div>
        </div>
      </section>

      {/* ============ TRUST STRIP ============ */}
      <section className="border-b border-border/60">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground text-center mb-6">
            Trusted by 2,400+ founders, coaches & agencies
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10 max-w-3xl mx-auto">
            {[
              { k: "₹4.2 Cr", v: "Revenue closed in chat" },
              { k: "3.1×", v: "Faster reply time" },
              { k: "92%", v: "Hot-lead capture" },
              { k: "<2s", v: "AI reply latency" },
            ].map((s) => (
              <div key={s.v} className="text-center sm:text-left">
                <p className="text-[26px] sm:text-[32px] tracking-tight text-foreground" style={SERIF}>
                  {s.k}
                </p>
                <p className="text-[12px] text-muted-foreground mt-1">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRODUCT / FEATURES ============ */}
      <section id="product" className="border-b border-border/60">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="max-w-2xl mb-14">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
              The product
            </p>
            <h2 className="text-[36px] sm:text-[52px] leading-[1.05] tracking-tight" style={SERIF}>
              Four tools, one quiet inbox.
            </h2>
            <p className="mt-5 text-[15px] sm:text-[17px] text-muted-foreground leading-relaxed">
              No bloat. No 47 tabs. Just the four things that actually move money — built to feel
              like one product.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-border rounded-2xl overflow-hidden">
            {[
              {
                icon: Bot,
                tag: "AI replies",
                title: "Drafted in under two seconds.",
                body: "Tone-matched, price-aware suggestions trained on your top-performing scripts. Approve with a tap.",
              },
              {
                icon: Inbox,
                tag: "Unified inbox",
                title: "WhatsApp. Instagram. Forms.",
                body: "Every conversation in one stream, sorted by intent. Hot leads bubble up automatically.",
              },
              {
                icon: Wallet,
                tag: "Pay links",
                title: "Money in, deal won.",
                body: "Razorpay & UPI links inside the chat. Webhooks mark the deal closed the moment payment lands.",
              },
              {
                icon: Zap,
                tag: "Broadcasts",
                title: "10K leads, every rupee tracked.",
                body: "Personalized blasts with merge tags, A/B variants, and revenue attribution per message.",
              },
            ].map((f) => (
              <div key={f.tag} className="bg-background p-8 sm:p-10 group">
                <div className="flex items-center gap-2 mb-6">
                  <f.icon className="w-4 h-4 text-primary" strokeWidth={1.75} />
                  <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {f.tag}
                  </span>
                </div>
                <h3 className="text-[26px] sm:text-[30px] leading-[1.15] tracking-tight" style={SERIF}>
                  {f.title}
                </h3>
                <p className="mt-4 text-[14px] sm:text-[15px] text-muted-foreground leading-relaxed">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how" className="border-b border-border/60 bg-secondary/40">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
                How it works
              </p>
              <h2 className="text-[36px] sm:text-[48px] leading-[1.05] tracking-tight" style={SERIF}>
                Four minutes to your first closed deal.
              </h2>
            </div>

            <ol className="lg:col-span-8 space-y-1">
              {[
                {
                  n: "01",
                  t: "Connect WhatsApp & Instagram",
                  d: "One tap. We handle the OAuth dance and sync your last 30 days of chats.",
                },
                {
                  n: "02",
                  t: "Train Addison on your voice",
                  d: "Paste your three best replies. Addison learns tone, pricing, objections, the lot.",
                },
                {
                  n: "03",
                  t: "Go live, watch deals close",
                  d: "Approve AI drafts with a tap. Send pay links. Get notified when money lands.",
                },
              ].map((s) => (
                <li
                  key={s.n}
                  className="grid grid-cols-[auto_1fr] gap-6 sm:gap-10 py-7 border-t border-border first:border-t-0"
                >
                  <span className="text-[13px] tabular-nums text-muted-foreground pt-1">{s.n}</span>
                  <div>
                    <h3 className="text-[22px] sm:text-[26px] tracking-tight" style={SERIF}>
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
      <section className="border-b border-border/60">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-20 sm:py-28 text-center">
          <Sparkles className="w-5 h-5 text-primary mx-auto mb-6" />
          <blockquote
            className="text-[28px] sm:text-[40px] leading-[1.2] tracking-tight text-foreground"
            style={SERIF}
          >
            <span className="italic text-muted-foreground">“</span>
            We replaced three tools with Addison and our close rate jumped from 14% to 38% in
            six weeks. The AI replies feel like me, but on a really good day.
            <span className="italic text-muted-foreground">”</span>
          </blockquote>
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-hot-soft text-hot flex items-center justify-center text-[12px] font-bold">
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
      <section id="pricing" className="border-b border-border/60">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Pricing
            </p>
            <h2 className="text-[36px] sm:text-[52px] leading-[1.05] tracking-tight" style={SERIF}>
              Simple. Honest. Cancel anytime.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {[
              {
                name: "Starter",
                price: "₹999",
                tag: "For solo founders",
                feat: ["1 inbox", "500 AI replies / mo", "UPI pay links", "Email support"],
                primary: false,
              },
              {
                name: "Growth",
                price: "₹2,499",
                tag: "For small teams",
                feat: [
                  "Everything in Starter",
                  "Unlimited AI replies",
                  "Up to 5 teammates",
                  "Broadcasts + analytics",
                  "Priority support",
                ],
                primary: true,
              },
            ].map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl p-8 sm:p-10 border ${
                  p.primary
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[22px] tracking-tight" style={SERIF}>
                    {p.name}
                  </h3>
                  {p.primary && (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] bg-background/15 text-background px-2 py-1 rounded">
                      Popular
                    </span>
                  )}
                </div>
                <p className={`text-[12px] mb-6 ${p.primary ? "text-background/60" : "text-muted-foreground"}`}>
                  {p.tag}
                </p>
                <p className="flex items-baseline gap-1.5 mb-7">
                  <span className="text-[44px] tracking-tight" style={SERIF}>
                    {p.price}
                  </span>
                  <span className={`text-[13px] ${p.primary ? "text-background/60" : "text-muted-foreground"}`}>
                    /month
                  </span>
                </p>
                <ul className="space-y-3 mb-8">
                  {p.feat.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[14px]">
                      <Check
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          p.primary ? "text-primary-glow" : "text-primary"
                        }`}
                      />
                      <span className={p.primary ? "text-background/90" : "text-foreground"}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={ctaHref}
                  className={`w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold transition-opacity hover:opacity-90 ${
                    p.primary
                      ? "bg-background text-foreground"
                      : "bg-foreground text-background"
                  }`}
                >
                  Start free trial
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="border-b border-border/60">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="text-center mb-12">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Questions
            </p>
            <h2 className="text-[36px] sm:text-[48px] leading-[1.05] tracking-tight" style={SERIF}>
              Things people usually ask.
            </h2>
          </div>
          <FAQSection />
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section>
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-24 sm:py-32 text-center">
          <h2
            className="text-[44px] sm:text-[68px] leading-[1.02] tracking-tight"
            style={SERIF}
          >
            Stop missing replies.
            <br />
            <span className="italic text-muted-foreground">Start closing deals.</span>
          </h2>
          <p className="mt-6 text-[15px] sm:text-[17px] text-muted-foreground max-w-lg mx-auto">
            Try Addison free for 14 days. No card. Cancel in two clicks.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={ctaHref}
              className="inline-flex items-center justify-center gap-2 bg-foreground text-background rounded-xl px-6 py-3.5 text-[14px] font-semibold hover:opacity-90 transition-opacity w-full sm:w-auto"
            >
              Start free
              <ArrowRight className="w-4 h-4" />
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
      <footer className="border-t border-border/60">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md bg-foreground text-background flex items-center justify-center font-bold text-[12px]">
              A
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
