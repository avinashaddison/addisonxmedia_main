import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { MessageCircle, Loader2 } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Redirect already-logged-in users straight to the app
  useEffect(() => {
    if (!sessionLoading && user) navigate("/", { replace: true });
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
            emailRedirectTo: `${window.location.origin}/`,
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
      navigate("/", { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      // Friendly message for the common case
      if (msg.toLowerCase().includes("invalid login")) {
        toast.error("Wrong email or password");
      } else if (msg.toLowerCase().includes("already registered")) {
        toast.error("Email already registered. Try logging in.");
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mb-3">
            <MessageCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold">AddisonX Media</h1>
          <p className="text-[13px] text-muted-foreground">WhatsApp Sales Engine</p>
        </div>

        <div className="flex gap-1 p-1 bg-muted rounded-lg mb-6">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 py-2 text-[13px] font-semibold rounded-md transition-colors ${
              mode === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 py-2 text-[13px] font-semibold rounded-md transition-colors ${
              mode === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === "login" ? "Log in" : "Create account"}
          </Button>
        </form>

        <p className="text-[11px] text-muted-foreground text-center mt-6">
          By continuing you agree to the terms of service.
        </p>
      </Card>
    </div>
  );
};

export default Auth;
