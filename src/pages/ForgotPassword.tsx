import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Mail, MessageCircle, CheckCircle2 } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Reset link sent. Check your inbox.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
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
        <Link to="/auth" className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to login
        </Link>

        <Link to="/" className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg shadow-primary/30">
            <MessageCircle className="w-4 h-4 text-primary-foreground" fill="currentColor" strokeWidth={0} />
          </div>
          <span className="font-bold tracking-tight">AddisonX</span>
        </Link>

        {!sent ? (
          <>
            <div className="mb-7">
              <h1 className="text-[26px] font-bold tracking-tight leading-tight">Forgot your password?</h1>
              <p className="text-[13px] text-muted-foreground mt-1.5">
                Enter your account email and we'll send you a secure link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[12px] font-semibold">Email</Label>
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

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-xl text-[13px] font-bold bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 shadow-lg shadow-primary/25"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending link...</>
                ) : (
                  <><Mail className="w-4 h-4 mr-2" /> Send reset link</>
                )}
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center space-y-4 py-6">
            <div className="w-14 h-14 rounded-full bg-success/15 border border-success/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-success" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold tracking-tight">Check your email</h1>
              <p className="text-[13px] text-muted-foreground mt-2">
                We sent a password reset link to <span className="font-semibold text-foreground">{email}</span>.
                The link expires in 1 hour.
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Didn't get it? Check spam, or{" "}
              <button onClick={() => setSent(false)} className="text-primary font-medium hover:underline">try again</button>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
