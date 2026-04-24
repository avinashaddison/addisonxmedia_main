import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock, MessageCircle, Eye, EyeOff, ShieldCheck } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Supabase places the recovery token in the URL hash and auto-creates a session
    // via detectSessionInUrl. We just verify a session exists.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        setValidSession(true);
        setChecking(false);
      }
    });

    // Also check existing session in case the event already fired
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setValidSession(true);
      setChecking(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. Logging you in...");
      setTimeout(() => navigate("/app", { replace: true }), 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update password";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-40 pointer-events-none mask-fade-b" />
      <div className="absolute -top-24 right-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg shadow-primary/30">
            <MessageCircle className="w-4 h-4 text-primary-foreground" fill="currentColor" strokeWidth={0} />
          </div>
          <span className="font-bold tracking-tight">AddisonX</span>
        </Link>

        {checking ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Validating reset link...
          </div>
        ) : !validSession ? (
          <div className="space-y-4">
            <h1 className="text-[22px] font-bold tracking-tight">Link expired or invalid</h1>
            <p className="text-[13px] text-muted-foreground">
              This password reset link has expired or already been used.
            </p>
            <Link to="/forgot-password">
              <Button className="w-full h-11 rounded-xl text-[13px] font-bold bg-gradient-to-r from-primary to-primary-glow">
                Request a new link
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-7">
              <h1 className="text-[26px] font-bold tracking-tight leading-tight">Set a new password</h1>
              <p className="text-[13px] text-muted-foreground mt-1.5">
                Choose a strong password you haven't used before.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[12px] font-semibold">New password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={show ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="h-11 rounded-xl bg-card pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-[12px] font-semibold">Confirm password</Label>
                <Input
                  id="confirm"
                  type={show ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  className="h-11 rounded-xl bg-card"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-xl text-[13px] font-bold bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 shadow-lg shadow-primary/25"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...</>
                ) : (
                  <><Lock className="w-4 h-4 mr-2" /> Update password</>
                )}
              </Button>

              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground justify-center pt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-success" /> Encrypted & stored securely
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
