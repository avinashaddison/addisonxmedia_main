import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { RevenueHero } from "@/components/auth/RevenueHero";
import {
  MessageCircle,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Shield,
  Zap,
  IndianRupee,
  TrendingUp,
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
      <RevenueHero />

      {/* RIGHT — form */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative">
        {/* background */}
        <div className="absolute inset-0 grid-pattern opacity-40 pointer-events-none mask-fade-b" />
        <div className="absolute -top-24 right-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[360px] h-[360px] bg-success/10 rounded-full blur-3xl pointer-events-none" />

        {/* Mobile revenue strip */}
        <div className="lg:hidden w-full max-w-[400px] mb-5 relative z-10">
          <div className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground rounded-2xl p-4 shadow-xl shadow-primary/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider font-bold opacity-80">Last 30 days</span>
              <span className="flex items-center gap-1 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> LIVE
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] opacity-70 font-bold">💰 Generated</p>
                <p className="text-2xl font-extrabold">₹47,000</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] opacity-70 font-bold">📈 Lift</p>
                <p className="text-xl font-bold">+312%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile logo */}
        <Link to="/" className="lg:hidden flex items-center gap-2 mb-6 relative z-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg shadow-primary/30">
            <MessageCircle className="w-4 h-4 text-primary-foreground" fill="currentColor" strokeWidth={0} />
          </div>
          <span className="font-bold tracking-tight">AddisonX Media</span>
        </Link>

        <div className="w-full max-w-[400px] relative z-10">
          {/* Welcome strap */}
          <div className="mb-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/30 text-[11px] font-bold text-success">
            <TrendingUp className="w-3 h-3" />
            Your revenue dashboard is waiting
          </div>

          {/* Header */}
          <div className="mb-7">
            <h1 className="text-[26px] font-bold tracking-tight leading-tight">
              {mode === "login" ? "Welcome back" : "Start earning today"}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1.5">
              {mode === "login"
                ? "Pick up where money was being made."
                : "14-day free trial. No card. Setup in 2 min."}
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
              className="relative w-full h-12 rounded-xl text-[13px] font-bold mt-2 bg-gradient-to-r from-primary via-primary-glow to-success hover:opacity-95 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-success/40 transition-all group overflow-hidden bg-[length:200%_100%] hover:bg-[position:100%_0]"
            >
              <span className="absolute inset-0 bg-[linear-gradient(120deg,transparent_30%,hsl(var(--primary-foreground)/0.25)_50%,transparent_70%)] bg-[length:200%_100%] -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              {submitting ? (
                <span className="relative flex items-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Please wait...
                </span>
              ) : (
                <span className="relative flex items-center">
                  <IndianRupee className="w-4 h-4 mr-1.5" />
                  {mode === "login" ? "Enter your earning system" : "Start earning today"}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>

            {/* Micro trust line */}
            <p className="text-center text-[11px] text-muted-foreground pt-1 flex items-center justify-center gap-2 flex-wrap">
              <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-primary" /> 2-min setup</span>
              <span className="opacity-40">·</span>
              <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-success" /> Bank-grade secure</span>
              <span className="opacity-40">·</span>
              <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3 text-warning" /> Earn today</span>
            </p>
          </form>

          {/* Trust row */}
          <div className="mt-6 pt-5 border-t border-border flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              No card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              Cancel anytime
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              1,200+ businesses
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
