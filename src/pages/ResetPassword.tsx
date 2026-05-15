import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, MessageCircle, Eye, EyeOff } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Better Auth puts the reset token in the ?token= query param.
  const token = searchParams.get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords don't match");
    if (!token) return toast.error("Reset token missing from URL");
    setSubmitting(true);
    try {
      const { error } = await authClient.resetPassword({ newPassword: password, token });
      if (error) throw new Error(error.message ?? "Failed to update password");
      toast.success("Password updated");
      setTimeout(() => navigate("/app", { replace: true }), 600);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
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
          {!token ? (
            <div>
              <h1 className="text-[22px] font-semibold tracking-tight">Link expired or invalid</h1>
              <p className="text-[13px] text-muted-foreground mt-2">
                This password reset link has expired or already been used.
              </p>
              <Button asChild className="w-full h-10 mt-5">
                <Link to="/forgot-password">Request a new link</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-[24px] font-semibold tracking-tight">Set a new password</h1>
                <p className="text-[13px] text-muted-foreground mt-1.5">
                  Choose a strong password you haven't used before.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-[12px] font-medium">New password</Label>
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
                      className="h-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => !s)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                      aria-label={show ? "Hide password" : "Show password"}
                    >
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm" className="text-[12px] font-medium">Confirm password</Label>
                  <Input
                    id="confirm"
                    type={show ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    className="h-10"
                    aria-invalid={confirm.length > 0 && confirm !== password}
                  />
                  {confirm.length > 0 && confirm !== password && (
                    <p className="text-[11px] text-destructive font-medium">Passwords don't match</p>
                  )}
                </div>

                <Button type="submit" disabled={submitting} className="w-full h-10 mt-2">
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating…</>
                  ) : (
                    "Update password"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
