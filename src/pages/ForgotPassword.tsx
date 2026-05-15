import { useState } from "react";
import { Link } from "react-router-dom";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, MessageCircle, CheckCircle2 } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      const { error } = await authClient.forgetPassword({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw new Error(error.message ?? "Reset request failed");
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col">
      <header className="h-14 flex items-center justify-between px-5 sm:px-8 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <MessageCircle className="w-3.5 h-3.5 text-primary-foreground" fill="currentColor" strokeWidth={0} />
          </div>
          <span className="font-semibold text-[14px] tracking-tight">AddisonX</span>
        </Link>
        <Link to="/auth" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
          Back to sign in
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[400px]">
          {!sent ? (
            <>
              <div className="mb-8">
                <h1 className="text-[24px] font-semibold tracking-tight">Reset your password</h1>
                <p className="text-[13px] text-muted-foreground mt-1.5">
                  Enter the email associated with your account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-[12px] font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="h-10"
                  />
                </div>

                <Button type="submit" disabled={submitting} className="w-full h-10">
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
                  ) : (
                    "Send reset link"
                  )}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-success-soft text-success flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h1 className="text-[20px] font-semibold tracking-tight">Reset link generated</h1>
              <p className="text-[13px] text-muted-foreground mt-2">
                If an account exists for <span className="text-foreground font-medium">{email}</span>, a reset link has been generated.
              </p>
              <div className="mt-4 p-3 rounded-lg bg-warning-soft border border-warning/20 text-left text-[12px] leading-relaxed">
                <span className="font-semibold">Dev note:</span> email delivery isn't wired yet. Check the API server console for the reset URL.
              </div>
              <button
                onClick={() => setSent(false)}
                className="mt-5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Try a different email
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ForgotPassword;
