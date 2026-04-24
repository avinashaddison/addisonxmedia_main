import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  MessageCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  Flame,
  TrendingUp,
  CheckCircle2,
  Shield,
  Zap,
  Star,
} from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionLoading && user) navigate("/app", { replace: true });
  }, [user, sessionLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created. You're in!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
      }
      navigate("/app", { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      if (msg.toLowerCase().includes("invalid login")) toast.error("Wrong email or password");
      else if (msg.toLowerCase().includes("already registered"))
        toast.error("Email already registered. Try logging in.");
      else toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex">
      {/* LEFT — brand showcase */}
      <aside className="hidden lg:flex relative flex-1 overflow-hidden bg-gradient-to-br from-primary via-primary-glow to-accent text-primary-foreground">
        {/* decorative blobs */}
        <div
          className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-primary-foreground/10 blur-3xl"
          style={{ animation: "blob 14s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-0 -right-24 w-[480px] h-[480px] rounded-full bg-accent/40 blur-3xl"
          style={{ animation: "blob 18s ease-in-out infinite reverse" }}
        />
        <div className="absolute inset-0 dot-pattern opacity-20 mix-blend-overlay" />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 w-fit group">
            <div className="relative w-10 h-10 rounded-xl bg-primary-foreground/15 backdrop-blur-md border border-primary-foreground/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <MessageCircle className="w-5 h-5" fill="currentColor" strokeWidth={0} />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-primary animate-pulse" />
            </div>
            <div>
              <p className="font-bold tracking-tight text-[15px] leading-none">AddisonX</p>
              <p className="text-[10px] uppercase tracking-[0.18em] opacity-70 mt-1">Sales Engine</p>
            </div>
          </Link>

          {/* Center pitch */}
          <div className="max-w-md space-y-7">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              AI Co-Pilot included
            </span>

            <h2 className="text-4xl xl:text-5xl font-bold tracking-tight leading-[1.05]">
              Close every WhatsApp lead before they ghost you.
            </h2>

            <p className="text-[15px] opacity-85 leading-relaxed">
              Join 1,200+ revenue teams using AddisonX to turn chats into closed deals — in seconds, not days.
            </p>

            {/* Floating stat cards */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/15 rounded-2xl p-4 animate-float">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Conversions</span>
                </div>
                <p className="text-2xl font-bold tracking-tight">+312%</p>
                <p className="text-[11px] opacity-70">this week</p>
              </div>
              <div
                className="bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/15 rounded-2xl p-4 animate-float"
                style={{ animationDelay: "1.5s" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                    <Flame className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Hot leads</span>
                </div>
                <p className="text-2xl font-bold tracking-tight">28</p>
                <p className="text-[11px] opacity-70">ready to buy</p>
              </div>
            </div>
          </div>

          {/* Testimonial footer */}
          <div className="space-y-3">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, k) => (
                <Star key={k} className="w-3.5 h-3.5 fill-current" />
              ))}
            </div>
            <p className="text-[13px] leading-relaxed opacity-90 max-w-md">
              "We closed ₹47L in the first 30 days. Feels like having a senior closer on every chat."
            </p>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary-foreground/20 backdrop-blur border border-primary-foreground/20 flex items-center justify-center text-[11px] font-bold">
                PM
              </div>
              <div>
                <p className="text-[12px] font-bold leading-tight">Priya Mehta</p>
                <p className="text-[10px] opacity-70">Founder, Mehta Tutorials</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT — form */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative">
        {/* subtle background grid */}
        <div className="absolute inset-0 grid-pattern opacity-40 pointer-events-none mask-fade-b" />
        <div className="absolute -top-24 right-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        {/* Mobile logo */}
        <Link to="/" className="lg:hidden flex items-center gap-2 mb-8 relative z-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg shadow-primary/30">
            <MessageCircle className="w-4 h-4 text-primary-foreground" fill="currentColor" strokeWidth={0} />
          </div>
          <span className="font-bold tracking-tight">AddisonX</span>
        </Link>

        <div className="w-full max-w-[400px] relative z-10">
          {/* Header */}
          <div className="mb-7">
            <h1 className="text-[26px] font-bold tracking-tight leading-tight">
              {mode === "login" ? "Welcome back" : "Create your workspace"}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1.5">
              {mode === "login"
                ? "Log in to your AddisonX workspace."
                : "Start your 14-day free trial. No card needed."}
            </p>
          </div>

          {/* Tab toggle */}
          <div className="relative flex p-1 bg-muted/60 rounded-xl mb-6 border border-border">
            <span
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-card shadow-sm border border-border transition-all duration-300 ease-out"
              style={{ left: mode === "login" ? "4px" : "calc(50%)" }}
            />
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`relative z-10 flex-1 py-2 text-[13px] font-bold rounded-md transition-colors ${
                mode === "login" ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`relative z-10 flex-1 py-2 text-[13px] font-bold rounded-md transition-colors ${
                mode === "signup" ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === "signup" && (
              <div className="space-y-1.5 animate-fade-in">
                <Label htmlFor="name" className="text-[12px] font-semibold">
                  Your name
                </Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Jane Doe"
                  className="h-11 rounded-xl bg-card"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[12px] font-semibold">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="h-11 rounded-xl bg-card"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[12px] font-semibold">
                  Password
                </Label>
                {mode === "login" && (
                  <Link
                    to="/forgot-password"
                    className="text-[11px] text-muted-foreground hover:text-primary transition-colors font-medium"
                  >
                    Forgot?
                  </Link>
                )}
              </div>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 rounded-xl bg-card"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-xl text-[13px] font-bold mt-2 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all group"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Please wait...
                </>
              ) : (
                <>
                  {mode === "login" ? "Log in to workspace" : "Create my workspace"}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </Button>
          </form>

          {/* Trust row */}
          <div className="mt-7 pt-6 border-t border-border flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-success" />
              Bank-grade security
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" />
              Setup in 2 min
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              Cancel anytime
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground text-center mt-5">
            By continuing you agree to our{" "}
            <Link to="/" className="text-foreground hover:text-primary transition-colors font-medium">
              Terms
            </Link>{" "}
            &{" "}
            <Link to="/" className="text-foreground hover:text-primary transition-colors font-medium">
              Privacy
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
};

export default Auth;
