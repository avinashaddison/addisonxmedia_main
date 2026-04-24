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
  Shield,
  Zap,
  Sparkles,
  Mail,
  Lock,
  User as UserIcon,
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
      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/30">
        {/* Ambient background */}
        <div className="absolute inset-0 grid-pattern opacity-30 pointer-events-none mask-fade-b" />
        <div className="absolute -top-40 -right-20 w-[500px] h-[500px] bg-primary/8 rounded-full blur-3xl pointer-events-none animate-aurora" />
        <div className="absolute -bottom-40 -left-20 w-[440px] h-[440px] bg-accent/8 rounded-full blur-3xl pointer-events-none animate-aurora" style={{ animationDelay: "4s" }} />

        {/* Mobile revenue strip */}
        <div className="lg:hidden w-full max-w-[420px] mb-5 relative z-10">
          <div className="relative overflow-hidden bg-[hsl(220_28%_8%)] text-white rounded-2xl p-4 border border-white/10 shadow-xl">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/30 blur-3xl rounded-full" />
            <div className="relative flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider font-bold opacity-70">Live · Last 30 days</span>
              <span className="flex items-center gap-1 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-glow animate-pulse" /> LIVE
              </span>
            </div>
            <div className="relative flex items-end justify-between">
              <div>
                <p className="text-[10px] opacity-60 font-bold">💰 Generated</p>
                <p className="text-2xl font-extrabold text-primary-glow">₹47,000</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] opacity-60 font-bold">📈 Lift</p>
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

        {/* Floating glass card */}
        <div className="w-full max-w-[420px] relative z-10">
          {/* Subtle outer glow */}
          <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-primary/30 via-primary-glow/10 to-accent/20 opacity-60 blur-md pointer-events-none" />

          <div className="relative bg-card/95 backdrop-blur-2xl border border-border/80 rounded-3xl p-7 sm:p-8 shadow-2xl shadow-foreground/5">
            {/* Status pill */}
            <div className="flex items-center justify-between mb-5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10.5px] font-bold text-primary uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                Revenue OS · v3.2
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                System online
              </div>
            </div>

            {/* Header */}
            <div className="mb-6">
              <h1 className="text-[28px] font-bold tracking-tight leading-[1.1]">
                {mode === "login" ? (
                  <>
                    Welcome back
                    <span className="text-primary">.</span>
                  </>
                ) : (
                  <>
                    Let's start{" "}
                    <span className="text-gradient">earning</span>
                    <span className="text-primary">.</span>
                  </>
                )}
              </h1>
              <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">
                {mode === "login"
                  ? "Your revenue dashboard is up. Pick up where the money was being made."
                  : "Free for 14 days. No card required. Setup takes 2 minutes."}
              </p>
            </div>

            {/* Tab toggle */}
            <div className="relative flex p-1 bg-muted/50 rounded-2xl mb-5 border border-border/60">
              <span
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-card shadow-sm border border-border/80 transition-all duration-300 ease-out"
                style={{ left: mode === "login" ? "4px" : "calc(50%)" }}
              />
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`relative z-10 flex-1 py-2 text-[13px] font-bold rounded-xl transition-colors ${
                  mode === "login" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`relative z-10 flex-1 py-2 text-[13px] font-bold rounded-xl transition-colors ${
                  mode === "signup" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === "signup" && (
                <FieldWithIcon
                  icon={UserIcon}
                  label="Your name"
                  htmlFor="name"
                  animate
                >
                  <Input
                    id="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Jane Doe"
                    className="h-12 rounded-xl bg-background/60 border-border/80 pl-10 focus-visible:ring-primary/40 focus-visible:border-primary/40 transition-all"
                  />
                </FieldWithIcon>
              )}

              <FieldWithIcon icon={Mail} label="Email" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="h-12 rounded-xl bg-background/60 border-border/80 pl-10 focus-visible:ring-primary/40 focus-visible:border-primary/40 transition-all"
                />
              </FieldWithIcon>

              <FieldWithIcon
                icon={Lock}
                label="Password"
                htmlFor="password"
                trailing={
                  mode === "login" && (
                    <Link
                      to="/forgot-password"
                      className="text-[11px] text-muted-foreground hover:text-primary transition-colors font-semibold"
                    >
                      Forgot?
                    </Link>
                  )
                }
              >
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 rounded-xl bg-background/60 border-border/80 pl-10 focus-visible:ring-primary/40 focus-visible:border-primary/40 transition-all"
                />
              </FieldWithIcon>

              <Button
                type="submit"
                disabled={submitting}
                className="relative w-full h-12 rounded-2xl text-[13.5px] font-bold mt-3 bg-gradient-to-r from-primary via-primary-glow to-primary text-primary-foreground hover:opacity-95 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/45 transition-all group overflow-hidden bg-[length:200%_100%] hover:bg-[position:100%_0]"
              >
                <span className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-[400%] transition-transform duration-1000" />
                {submitting ? (
                  <span className="relative flex items-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Booting your system...
                  </span>
                ) : (
                  <span className="relative flex items-center">
                    {mode === "login" ? "Enter your earning system" : "Activate my revenue OS"}
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </Button>

              {/* Micro trust line */}
              <div className="flex items-center justify-center gap-1.5 pt-2">
                <span className="flex items-center gap-1 text-[10.5px] text-muted-foreground font-medium">
                  <Zap className="w-3 h-3 text-primary" /> 2-min setup
                </span>
                <span className="text-muted-foreground/30">•</span>
                <span className="flex items-center gap-1 text-[10.5px] text-muted-foreground font-medium">
                  <Shield className="w-3 h-3 text-primary" /> Bank-grade encryption
                </span>
                <span className="text-muted-foreground/30">•</span>
                <span className="flex items-center gap-1 text-[10.5px] text-muted-foreground font-medium">
                  <Sparkles className="w-3 h-3 text-warning" /> Earn today
                </span>
              </div>
            </form>
          </div>

          {/* Footer terms - outside card */}
          <p className="text-[11px] text-muted-foreground text-center mt-5">
            By continuing you agree to our{" "}
            <Link to="/" className="text-foreground hover:text-primary transition-colors font-semibold">
              Terms
            </Link>{" "}
            &{" "}
            <Link to="/" className="text-foreground hover:text-primary transition-colors font-semibold">
              Privacy
            </Link>
            . Cancel anytime.
          </p>
        </div>
      </main>
    </div>
  );
};

const FieldWithIcon = ({
  icon: Icon,
  label,
  htmlFor,
  children,
  trailing,
  animate,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  trailing?: React.ReactNode;
  animate?: boolean;
}) => (
  <div className={`space-y-1.5 ${animate ? "animate-fade-in" : ""}`}>
    <div className="flex items-center justify-between">
      <Label htmlFor={htmlFor} className="text-[11.5px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {trailing}
    </div>
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none z-10" />
      {children}
    </div>
  </div>
);

export default Auth;
