import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
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
  Headphones,
  Briefcase,
  Plane,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { FAQSection } from "@/components/landing/FAQSection";

const HERO_ROTATING = ["growing businesses.", "modern e-commerce.", "smart educators.", "busy clinics.", "ambitious agencies."];

const useRotator = (items: string[], interval = 2400) => {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % items.length), interval);
    return () => clearInterval(t);
  }, [items.length, interval]);
  return items[i];
};

// Force light mode for landing
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
  const rotating = useRotator(HERO_ROTATING);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* ============== ANNOUNCEMENT BAR ============== */}
      <div className="bg-foreground text-background text-[12px] py-2 px-5 text-center font-medium">
        <span className="hidden sm:inline opacity-70">🎉 New: </span>
        <span>Addison AI 2.0 is live — close 3× more deals on autopilot.</span>{" "}
        <Link to="/auth" className="underline underline-offset-2 font-semibold inline-flex items-center gap-0.5">
          See what's new <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      {/* ============== NAV ============== */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/85 backdrop-blur-xl border-b border-border shadow-[0_1px_0_0_hsl(var(--border))]"
            : "bg-background/60 backdrop-blur-md border-b border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-md shadow-primary/30 group-hover:shadow-primary/50 transition-shadow">
              <MessageCircle className="w-4.5 h-4.5 text-primary-foreground" fill="currentColor" strokeWidth={0} />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-background" />
            </div>
            <div className="leading-tight">
              <span className="font-bold text-[17px] tracking-tight block">AddisonX</span>
              <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">WhatsApp Suite</span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
            {/* Product mega menu */}
            <div
              className="relative"
              onMouseEnter={() => setProductOpen(true)}
              onMouseLeave={() => setProductOpen(false)}
            >
              <button className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition flex items-center gap-1">
                Product <ChevronDown className={`w-3.5 h-3.5 transition-transform ${productOpen ? "rotate-180" : ""}`} />
              </button>
              {productOpen && (
                <div className="absolute top-full left-0 pt-2 w-[560px] animate-fade-in">
                  <div className="bg-card border border-border rounded-2xl shadow-2xl p-2 grid grid-cols-2 gap-1">
                    {[
                      { icon: Inbox, title: "Shared Inbox", desc: "One chat for the whole team", color: "text-primary", bg: "bg-primary-soft" },
                      { icon: Bot, title: "Addison AI", desc: "Replies in 1.4s, 24/7", color: "text-accent", bg: "bg-accent-soft" },
                      { icon: Megaphone, title: "Broadcasts", desc: "Send to 10K in one click", color: "text-warning", bg: "bg-warning-soft" },
                      { icon: Workflow, title: "Automation", desc: "No-code workflows", color: "text-success", bg: "bg-success-soft" },
                      { icon: BarChart3, title: "Analytics", desc: "Track revenue per agent", color: "text-primary", bg: "bg-primary-soft" },
                      { icon: LayoutGrid, title: "Integrations", desc: "Shopify, Razorpay, +30 more", color: "text-accent", bg: "bg-accent-soft" },
                    ].map((p, k) => (
                      <a
                        key={k}
                        href="#features"
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/60 transition group"
                      >
                        <div className={`w-9 h-9 rounded-lg ${p.bg} flex items-center justify-center flex-shrink-0`}>
                          <p.icon className={`w-4 h-4 ${p.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-foreground flex items-center gap-1 group-hover:gap-1.5 transition-all">
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

            {/* Solutions mega menu */}
            <div
              className="relative"
              onMouseEnter={() => setSolutionsOpen(true)}
              onMouseLeave={() => setSolutionsOpen(false)}
            >
              <button className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition flex items-center gap-1">
                Solutions <ChevronDown className={`w-3.5 h-3.5 transition-transform ${solutionsOpen ? "rotate-180" : ""}`} />
              </button>
              {solutionsOpen && (
                <div className="absolute top-full left-0 pt-2 w-[320px] animate-fade-in">
                  <div className="bg-card border border-border rounded-2xl shadow-2xl p-2">
                    {[
                      { icon: ShoppingBag, label: "E-commerce", desc: "Recover carts, ship fast" },
                      { icon: GraduationCap, label: "Education", desc: "Enroll & support students" },
                      { icon: Stethoscope, label: "Healthcare", desc: "Bookings & reminders" },
                      { icon: Briefcase, label: "Agencies", desc: "Manage 100s of clients" },
                      { icon: Plane, label: "Travel", desc: "Itineraries & rebooking" },
                    ].map((s, k) => (
                      <a key={k} href="#solutions" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                          <s.icon className="w-4 h-4 text-foreground" />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold">{s.label}</p>
                          <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <a href="#pricing" className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition">Pricing</a>
            <a href="#faq" className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition">Resources</a>
            <a href="#" className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition">Customers</a>
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            {user ? (
              <Link to="/app" className="text-sm font-semibold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition shadow-sm">
                Open dashboard
              </Link>
            ) : (
              <>
                <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition px-3 py-2">
                  Book demo
                </a>
                <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground transition px-3 py-2">
                  Sign in
                </Link>
                <Link
                  to="/auth"
                  className="group text-sm font-semibold pl-4 pr-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition shadow-md shadow-primary/20 inline-flex items-center gap-1.5"
                >
                  Start free trial
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
          <div className="lg:hidden border-t border-border bg-background px-5 py-4 space-y-1 text-sm font-medium animate-fade-in">
            <a href="#product" className="block py-2.5 px-2 rounded-lg hover:bg-muted">Product</a>
            <a href="#solutions" className="block py-2.5 px-2 rounded-lg hover:bg-muted">Solutions</a>
            <a href="#features" className="block py-2.5 px-2 rounded-lg hover:bg-muted">Features</a>
            <a href="#pricing" className="block py-2.5 px-2 rounded-lg hover:bg-muted">Pricing</a>
            <a href="#faq" className="block py-2.5 px-2 rounded-lg hover:bg-muted">Resources</a>
            <div className="pt-3 mt-3 border-t border-border space-y-2">
              <Link to="/auth" className="block py-2.5 px-3 rounded-lg border border-border text-center font-semibold">
                Sign in
              </Link>
              <Link to="/auth" className="block py-3 px-4 bg-primary text-primary-foreground rounded-lg text-center font-semibold shadow-md">
                Start free trial →
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ============== HERO ============== */}
      <section className="relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: "6s" }} />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: "8s" }} />
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-12 lg:pt-20 pb-16 lg:pb-24 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-10 items-center">
          <div>
            {/* Live badge */}
            <div className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-card border border-border shadow-sm text-xs font-semibold mb-6 animate-fade-in">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] uppercase tracking-wider">
                <Sparkles className="w-3 h-3" /> New
              </span>
              <span className="text-foreground">Official WhatsApp Business API · Powered by AI</span>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
              </span>
            </div>

            <h1 className="text-[2.5rem] sm:text-5xl lg:text-[4rem] font-bold tracking-tight leading-[1.02] text-foreground">
              The WhatsApp platform for{" "}
              <span className="relative inline-block">
                <span
                  key={rotating}
                  className="bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent inline-block animate-fade-in"
                >
                  {rotating}
                </span>
              </span>
            </h1>

            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl">
              AddisonX helps <span className="font-semibold text-foreground">12,000+ businesses</span> convert leads, automate
              support, and broadcast campaigns — all from one shared WhatsApp inbox with AI built in.
            </p>

            <form className="mt-8 flex flex-col sm:flex-row gap-2.5 max-w-lg p-1.5 sm:bg-card sm:border sm:border-border sm:rounded-2xl sm:shadow-lg">
              <div className="flex-1 flex items-center sm:px-3">
                <span className="hidden sm:flex w-8 h-8 rounded-lg bg-primary-soft items-center justify-center mr-2">
                  <MessageCircle className="w-4 h-4 text-primary" />
                </span>
                <input
                  type="email"
                  placeholder="Enter your work email"
                  className="flex-1 px-4 py-3.5 sm:px-0 sm:py-2.5 rounded-lg sm:rounded-none border border-input sm:border-0 bg-card sm:bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring sm:focus:ring-0"
                />
              </div>
              <Link
                to="/auth"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition shadow-md hover:shadow-xl hover:shadow-primary/30 whitespace-nowrap"
              >
                Start free trial
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </form>

            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> 7-day free trial</li>
              <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> No credit card</li>
              <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Setup in 5 min</li>
              <li className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-primary" /> SOC 2 secure</li>
            </ul>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {["PM", "RK", "AS", "VG", "NK"].map((i, k) => (
                    <div key={k} className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 border-2 border-background flex items-center justify-center text-[10px] font-bold text-foreground">
                      {i}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, k) => (
                      <Star key={k} className="w-4 h-4 fill-warning text-warning" />
                    ))}
                    <span className="ml-1.5 font-bold text-sm">4.9/5</span>
                  </div>
                  <p className="text-xs text-muted-foreground">From 1,200+ verified reviews</p>
                </div>
              </div>

              <div className="h-10 w-px bg-border hidden sm:block" />

              <a href="#" className="group inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition">
                <span className="w-9 h-9 rounded-full bg-card border border-border shadow-sm flex items-center justify-center group-hover:scale-110 transition">
                  <PlayCircle className="w-4 h-4 text-primary" />
                </span>
                Watch 90s demo
              </a>
            </div>
          </div>

          {/* Hero visual: dashboard + chat preview */}
          <div className="relative">
            <div className="relative rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
              {/* Browser bar */}
              <div className="flex items-center gap-1.5 px-4 py-2.5 bg-muted border-b border-border">
                <span className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-warning/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-primary/60" />
                <span className="ml-3 text-[11px] text-muted-foreground font-medium">app.addisonx.com/inbox</span>
                <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-success rounded-full" /> Live
                </span>
              </div>

              <div className="grid grid-cols-[140px_1fr] h-[460px]">
                {/* Mini sidebar */}
                <div className="bg-muted/40 border-r border-border p-3 space-y-1">
                  {[
                    { icon: MessageCircle, label: "Inbox", active: true, badge: "12" },
                    { icon: Users, label: "Contacts" },
                    { icon: Send, label: "Broadcasts" },
                    { icon: Bot, label: "Automation" },
                    { icon: BarChart3, label: "Analytics" },
                  ].map((it, k) => (
                    <div
                      key={k}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-[11px] font-medium ${
                        it.active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      <it.icon className="w-3.5 h-3.5" />
                      <span className="flex-1">{it.label}</span>
                      {it.badge && (
                        <span className={`text-[9px] px-1.5 rounded-full ${it.active ? "bg-primary-foreground/20" : "bg-primary text-primary-foreground"}`}>
                          {it.badge}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Chat preview */}
                <div className="flex flex-col bg-[hsl(var(--chat-bg))]">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-card border-b border-border">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-[10px] font-bold text-primary-foreground">PM</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold leading-tight">Priya Mehta</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full" /> online
                      </p>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-hot-soft text-hot font-bold uppercase">Hot</span>
                  </div>

                  <div className="flex-1 p-3 space-y-2 overflow-hidden">
                    <ChatBubble incoming text="Hi, what are your fees for class 10?" />
                    <ChatBubble text="Hi Priya 👋 Class 10 batch is ₹8,500/mo. Should I block your seat?" ai />
                    <ChatBubble incoming text="Yes please, share the link." />
                    <ChatBubble text="Tap to pay ₹8,500 → razorpay.me/mehta · Seat confirmed instantly ✨" ai />
                    <ChatBubble incoming text="Done ✅" />
                    <div className="mt-2 mx-1 p-2 rounded-lg bg-primary-soft border border-primary/20">
                      <p className="text-[9px] uppercase tracking-wider text-primary font-bold">✨ Deal closed by AI</p>
                      <p className="text-xs font-bold mt-0.5 text-foreground">+ ₹8,500 · 12 seconds</p>
                    </div>
                  </div>

                  <div className="px-3 py-2 bg-card border-t border-border flex items-center gap-2">
                    <div className="flex-1 px-3 py-1.5 rounded-full bg-muted text-[10px] text-muted-foreground">Type a message…</div>
                    <button className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Send className="w-3 h-3 text-primary-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating cards */}
            <div className="hidden lg:flex absolute -left-6 top-12 bg-card border border-border rounded-xl shadow-xl p-3 w-52 items-start gap-3 animate-fade-in">
              <div className="w-9 h-9 rounded-lg bg-primary-soft flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Revenue today</p>
                <p className="text-xl font-bold text-foreground tabular-nums">₹47,250</p>
                <p className="text-[10px] text-success font-semibold flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" /> 312% vs last week
                </p>
              </div>
            </div>

            <div className="hidden lg:flex absolute -right-4 bottom-12 bg-card border border-border rounded-xl shadow-xl p-3 w-48 items-start gap-3 animate-fade-in" style={{ animationDelay: "0.15s" }}>
              <div className="w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">AI replies</p>
                <p className="text-xl font-bold text-foreground tabular-nums">1.4s</p>
                <p className="text-[10px] text-muted-foreground">avg response time</p>
              </div>
            </div>

            <div className="hidden lg:flex absolute -right-2 top-4 bg-card border border-border rounded-full shadow-lg pl-1 pr-3 py-1 items-center gap-2 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <span className="w-6 h-6 rounded-full bg-success-soft flex items-center justify-center">
                <CheckCheck className="w-3 h-3 text-success" />
              </span>
              <span className="text-[10px] font-semibold text-foreground">98.4% delivered</span>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="max-w-7xl mx-auto px-5 lg:px-8 pb-12 lg:pb-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden border border-border">
            {[
              { val: "12,000+", label: "Active businesses", icon: Building2 },
              { val: "48M+", label: "Messages / month", icon: MessageCircle },
              { val: "1.4s", label: "Avg AI reply", icon: Clock },
              { val: "98.4%", label: "Delivery rate", icon: CheckCheck },
            ].map((s, k) => (
              <div key={k} className="bg-card p-5 lg:p-6 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary-soft flex items-center justify-center flex-shrink-0">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl lg:text-3xl font-bold text-foreground tabular-nums tracking-tight">{s.val}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== TRUST BAR ============== */}
      <section className="border-y border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-10">
          <p className="text-center text-xs uppercase tracking-[0.2em] font-semibold text-muted-foreground mb-6">
            Trusted by 12,000+ businesses worldwide
          </p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-6 items-center justify-items-center opacity-60">
            {["Mehta Tutorials", "Urban Closet", "Clinic+", "GrowthLab", "Finova", "RetailHub"].map((b) => (
              <span key={b} className="text-sm md:text-base font-bold text-foreground tracking-tight">{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ============== FEATURE PILLARS ============== */}
      <section id="features" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-primary mb-3">Everything you need</p>
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">
              One platform to <span className="text-primary">sell, support, and scale</span> on WhatsApp
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="group relative p-6 rounded-2xl border border-border bg-card hover:shadow-lg hover:border-primary/40 transition-all">
                <div className="w-11 h-11 rounded-xl bg-primary-soft flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== SOLUTIONS / USE CASES ============== */}
      <section id="solutions" className="py-20 lg:py-24 bg-muted/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="max-w-2xl mb-12">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-primary mb-3">Built for your industry</p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              From edtech to e-commerce — AddisonX adapts to you
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {USE_CASES.map((u) => (
              <div key={u.title} className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 hover:-translate-y-1 transition-all">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mb-4 shadow-md">
                  <u.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-bold mb-1.5">{u.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{u.desc}</p>
                <p className="text-xs text-primary font-semibold mt-3 flex items-center gap-1">
                  Learn more <ArrowRight className="w-3 h-3" />
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== PRODUCT SHOWCASE: Split sections ============== */}
      <section id="product" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 space-y-24">
          {/* Row 1: Shared Inbox */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] font-bold text-primary mb-3">Shared inbox</p>
              <h3 className="text-3xl lg:text-4xl font-bold tracking-tight mb-5">
                One inbox for your whole team
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Assign chats, leave internal notes, set quick replies, and never lose a lead in the cracks again.
                Built for teams of 2 to 200.
              </p>
              <ul className="space-y-3">
                {["Auto-assign based on rules", "Internal notes & @mentions", "Tags, filters, and saved views", "Mobile + web + desktop apps"].map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm">
                    <div className="w-5 h-5 rounded-full bg-primary-soft flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
              <div className="space-y-2">
                {[
                  { name: "Priya Mehta", msg: "Yes please, share the link.", time: "2m", unread: 2, hot: true },
                  { name: "Rohan Kumar", msg: "Done ✅", time: "5m", unread: 0 },
                  { name: "Anjali S.", msg: "Can we talk tomorrow?", time: "12m", unread: 1 },
                  { name: "Vikram G.", msg: "Sounds good!", time: "1h", unread: 0 },
                ].map((c, k) => (
                  <div key={k} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-xs font-bold">
                      {c.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{c.name}</p>
                        {c.hot && <span className="text-[9px] px-1.5 py-0.5 bg-hot-soft text-hot rounded font-bold uppercase">Hot</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{c.msg}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">{c.time}</p>
                      {c.unread > 0 && <span className="inline-flex w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold items-center justify-center">{c.unread}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Broadcasts (reversed) */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="lg:order-2">
              <p className="text-xs uppercase tracking-[0.2em] font-bold text-accent mb-3">Broadcasts & campaigns</p>
              <h3 className="text-3xl lg:text-4xl font-bold tracking-tight mb-5">
                Reach 10,000 contacts in one click
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Send approved templates to segmented audiences. Track opens, clicks, and replies in real time.
                Build drip campaigns that nurture leads while you sleep.
              </p>
              <ul className="space-y-3">
                {["Template manager with WhatsApp approval", "Smart audience segments", "Click & reply analytics", "A/B testing built in"].map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm">
                    <div className="w-5 h-5 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-accent" />
                    </div>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:order-1 rounded-2xl border border-border bg-card p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Diwali Sale 2025</p>
                  <p className="text-lg font-bold">12,548 sent</p>
                </div>
                <span className="text-[10px] px-2 py-1 bg-primary-soft text-primary rounded font-bold uppercase">Live</span>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Delivered", value: 12421, pct: 99 },
                  { label: "Read", value: 9810, pct: 79 },
                  { label: "Replied", value: 1842, pct: 15 },
                  { label: "Converted", value: 412, pct: 3.3 },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{m.label}</span>
                      <span className="font-bold">{m.value.toLocaleString()} <span className="text-muted-foreground font-normal">({m.pct}%)</span></span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-primary-glow rounded-full" style={{ width: `${m.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 p-3 rounded-lg bg-primary-soft border border-primary/20">
                <p className="text-xs font-bold text-primary">+ ₹3,42,500 revenue generated</p>
              </div>
            </div>
          </div>

          {/* Row 3: AI */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] font-bold text-primary mb-3">Addison AI</p>
              <h3 className="text-3xl lg:text-4xl font-bold tracking-tight mb-5">
                An AI agent that closes deals while you sleep
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Train Addison on your products, FAQs, and pricing. It answers in your tone, qualifies leads,
                books appointments, and even sends payment links — 24/7.
              </p>
              <ul className="space-y-3">
                {["Trained on your data in minutes", "Multi-language (EN, HI, AR + 50 more)", "Hands off to humans seamlessly", "Always within your guardrails"].map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm">
                    <div className="w-5 h-5 rounded-full bg-primary-soft flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-gradient-to-br from-primary-soft to-card p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-bold text-sm">Addison AI</p>
                  <p className="text-[10px] text-muted-foreground">Always learning · always on</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="bg-card rounded-lg p-3 border border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Today's brief</p>
                  <p className="text-xs text-foreground">3 hot leads ready to close · 2 deals waiting on payment</p>
                </div>
                <div className="bg-card rounded-lg p-3 border border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Suggested action</p>
                  <p className="text-xs text-foreground">Follow up with Priya M. — she viewed your pricing 3x today.</p>
                </div>
                <div className="bg-card rounded-lg p-3 border border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Auto-replied</p>
                  <p className="text-xs text-foreground">28 conversations handled · 12 escalated to humans</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== INTEGRATIONS ============== */}
      <section className="py-16 border-y border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 text-center">
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-primary mb-3">Integrations</p>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-8">
            Plays nicely with your favorite tools
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {["Shopify", "HubSpot", "Zapier", "Stripe", "Razorpay", "Google Sheets", "Salesforce", "Calendly", "Notion", "Slack"].map((tool) => (
              <span key={tool} className="px-4 py-2 rounded-full bg-card border border-border text-sm font-medium hover:border-primary/40 transition cursor-default">
                {tool}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============== TESTIMONIAL ============== */}
      <section className="py-20 lg:py-24">
        <div className="max-w-4xl mx-auto px-5 lg:px-8 text-center">
          <div className="flex justify-center mb-6">
            {[...Array(5)].map((_, k) => <Star key={k} className="w-5 h-5 fill-warning text-warning" />)}
          </div>
          <p className="text-2xl lg:text-3xl font-semibold leading-snug tracking-tight mb-8">
            "AddisonX replaced 3 different tools for us. Our WhatsApp revenue went from{" "}
            <span className="text-primary">₹40K to ₹3.2L per month</span> in just 90 days. The AI alone closes 60% of new leads."
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground font-bold">
              RM
            </div>
            <div className="text-left">
              <p className="font-bold text-sm">Rohit Mehta</p>
              <p className="text-xs text-muted-foreground">Founder, Mehta Tutorials</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============== PRICING TEASER ============== */}
      <section id="pricing" className="py-20 lg:py-24 bg-muted/30 border-y border-border">
        <div className="max-w-6xl mx-auto px-5 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-primary mb-3">Pricing</p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-3">Simple plans that grow with you</h2>
            <p className="text-muted-foreground">Start free. Upgrade when you're ready. Cancel anytime.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`relative p-7 rounded-2xl border bg-card transition-all ${
                  p.featured ? "border-primary shadow-xl scale-105" : "border-border hover:border-primary/40"
                }`}
              >
                {p.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider rounded-full">
                    Most popular
                  </span>
                )}
                <h3 className="font-bold text-lg">{p.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{p.tag}</p>
                <div className="mt-5">
                  <span className="text-4xl font-bold tracking-tight">{p.price}</span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>
                <Link
                  to="/auth"
                  className={`mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition ${
                    p.featured
                      ? "bg-primary text-primary-foreground hover:opacity-90 shadow-md"
                      : "bg-secondary text-secondary-foreground hover:bg-muted"
                  }`}
                >
                  {p.cta}
                </Link>
                <ul className="mt-6 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== FAQ ============== */}
      <section id="faq" className="py-20 lg:py-24">
        <div className="max-w-3xl mx-auto px-5 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-primary mb-3">FAQ</p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">Frequently asked questions</h2>
          </div>
          <FAQSection />
        </div>
      </section>

      {/* ============== FINAL CTA ============== */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
        <div className="max-w-4xl mx-auto px-5 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-5">
            Ready to turn WhatsApp into your #1 revenue channel?
          </h2>
          <p className="text-lg opacity-90 mb-8">
            Join 12,000+ businesses growing faster with AddisonX. Free trial, no credit card.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/auth"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-background text-foreground font-bold text-sm hover:bg-card transition shadow-lg"
            >
              Start free trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-primary-foreground/10 backdrop-blur border border-primary-foreground/20 text-primary-foreground font-bold text-sm hover:bg-primary-foreground/15 transition"
            >
              <PlayCircle className="w-4 h-4" />
              Book a demo
            </a>
          </div>
          <p className="mt-6 text-xs opacity-70">No credit card required · Setup in 5 minutes · Cancel anytime</p>
        </div>
      </section>

      {/* ============== FOOTER ============== */}
      <footer className="bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-14 grid md:grid-cols-2 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-primary-foreground" fill="currentColor" strokeWidth={0} />
              </div>
              <span className="font-bold text-lg">AddisonX</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              The WhatsApp Business platform powered by AI. Trusted by 12,000+ businesses worldwide.
            </p>
            <div className="flex items-center gap-2 mt-5 text-xs text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>SOC 2 Type II · GDPR · Meta Business Partner</span>
            </div>
          </div>

          {[
            { title: "Product", links: ["Inbox", "Broadcasts", "Automation", "AI Agent", "Analytics"] },
            { title: "Solutions", links: ["E-commerce", "Education", "Healthcare", "Real Estate", "Agencies"] },
            { title: "Company", links: ["About", "Customers", "Careers", "Contact", "Blog"] },
          ].map((col) => (
            <div key={col.title}>
              <p className="text-xs uppercase tracking-wider font-bold text-foreground mb-4">{col.title}</p>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {col.links.map((l) => (
                  <li key={l}><a href="#" className="hover:text-primary transition">{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border">
          <div className="max-w-7xl mx-auto px-5 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>© 2025 AddisonX Media. All rights reserved.</p>
            <div className="flex items-center gap-5">
              <a href="#" className="hover:text-foreground transition">Privacy</a>
              <a href="#" className="hover:text-foreground transition">Terms</a>
              <a href="#" className="hover:text-foreground transition flex items-center gap-1">
                <Globe className="w-3 h-3" /> English
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ====================== Helpers ====================== */

const ChatBubble = ({ text, incoming, ai }: { text: string; incoming?: boolean; ai?: boolean }) => (
  <div className={`flex ${incoming ? "justify-start" : "justify-end"}`}>
    <div
      className={`max-w-[85%] px-2.5 py-1.5 rounded-xl text-[11px] leading-snug ${
        incoming
          ? "bg-[hsl(var(--chat-incoming))] text-foreground rounded-bl-sm border border-border"
          : ai
          ? "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground rounded-br-sm shadow-sm"
          : "bg-[hsl(var(--chat-outgoing))] text-foreground rounded-br-sm"
      }`}
    >
      {text}
      {!incoming && (
        <div className="flex items-center justify-end gap-0.5 mt-0.5 opacity-70">
          <CheckCheck className="w-2.5 h-2.5" />
        </div>
      )}
    </div>
  </div>
);

const FEATURES = [
  { icon: MessageCircle, title: "Shared Team Inbox", desc: "Collaborate on every chat with assignments, notes, tags, and quick replies." },
  { icon: Send, title: "Bulk Broadcasts", desc: "Send approved WhatsApp templates to segmented audiences in one click." },
  { icon: Bot, title: "AI Chatbot", desc: "24/7 AI agent trained on your data — answers FAQs, qualifies leads, books meetings." },
  { icon: Zap, title: "No-Code Automation", desc: "Build drip campaigns and workflow triggers without writing a line of code." },
  { icon: BarChart3, title: "Real-Time Analytics", desc: "Track agent performance, campaign ROI, and conversation insights live." },
  { icon: Shield, title: "Official WhatsApp API", desc: "Verified green tick, secure & compliant. Built on Meta's Business Platform." },
];

const USE_CASES = [
  { icon: ShoppingBag, title: "E-commerce", desc: "Recover abandoned carts, send order updates, run flash sales on WhatsApp." },
  { icon: GraduationCap, title: "Education", desc: "Enroll students faster, send class reminders, collect fees seamlessly." },
  { icon: Stethoscope, title: "Healthcare", desc: "Book appointments, share reports, send prescription refill nudges." },
  { icon: Building2, title: "Real Estate", desc: "Qualify property leads, schedule visits, follow up automatically." },
];

const PLANS = [
  {
    name: "Starter",
    tag: "For solo founders & small teams",
    price: "₹999",
    cta: "Start free trial",
    featured: false,
    features: ["1,000 conversations/mo", "2 team members", "Basic broadcasts", "Email support"],
  },
  {
    name: "Growth",
    tag: "For scaling businesses",
    price: "₹2,999",
    cta: "Start free trial",
    featured: true,
    features: ["10,000 conversations/mo", "Unlimited team members", "AI chatbot included", "Automations & workflows", "Priority support"],
  },
  {
    name: "Enterprise",
    tag: "For high-volume teams",
    price: "Custom",
    cta: "Contact sales",
    featured: false,
    features: ["Unlimited conversations", "Dedicated account manager", "Custom integrations", "SSO & advanced security", "SLA & onboarding"],
  },
];
