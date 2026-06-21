import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ArrowLeft, KeyRound, ShieldCheck, AlertTriangle } from "lucide-react";
import { BrandLockup } from "@/components/brand/AddisonLogo";

const paisleyBg =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'><g fill='none' stroke='%23B8651A' stroke-width='1' opacity='0.18'><circle cx='30' cy='30' r='12'/><path d='M30 18 Q42 30 30 42 Q18 30 30 18Z'/><circle cx='30' cy='30' r='3'/></g></svg>";

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

const ResetPassword = () => {
  useForceLight();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const token = searchParams.get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password kam se kam 8 characters ka ho"); return; }
    if (password !== confirm) { toast.error("Passwords match nahi ho rahe"); return; }
    if (!token) { toast.error("Reset token URL mein nahi hai"); return; }
    setSubmitting(true);
    try {
      const { error } = await authClient.resetPassword({ newPassword: password, token });
      if (error) throw new Error(error.message ?? "Password update fail ho gaya");
      toast.success("Password update ho gaya!");
      setTimeout(() => navigate("/app", { replace: true }), 600);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Password update fail ho gaya");
    } finally {
      setSubmitting(false);
    }
  };

  // Simple password strength signal
  const strength = (() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score; // 0–5
  })();
  const strengthLabel = ["Bahut kamzor", "Kamzor", "Theek hai", "Achha", "Strong", "Bahut strong"][strength];
  const strengthColor = strength < 2 ? "#D4308E" : strength < 3 ? "#FF6A1F" : strength < 4 ? "#FFD23F" : "#0E8A4B";

  return (
    <div className="min-h-screen w-full bg-[#FFF6E8] text-foreground flex flex-col">
      <header className="h-[80px] flex items-center justify-between px-5 sm:px-8 border-b-2 border-[#E8B968] bg-white flex-shrink-0 overflow-visible">
        <Link to="/" className="flex items-center pt-1" aria-label="Addison X Media home">
          <BrandLockup size={25} />
        </Link>
        <Link
          to="/auth"
          className="text-[12px] font-semibold text-foreground/70 hover:text-[#FF6A1F] transition inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Sign in par wapas
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-10 relative">
        <div
          className="absolute inset-0 opacity-60 pointer-events-none"
          style={{ backgroundImage: `url("${paisleyBg}")`, backgroundSize: "60px 60px" }}
        />
        <div className="absolute top-10 right-10 w-72 h-72 bg-[#FFD23F]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-[#FF6A1F]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-[460px]">
          {!token ? (
            <div className="bg-white border-2 border-[#D4308E] rounded-2xl p-7 shadow-[0_6px_0_0_#A11A6A] text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4308E] to-[#A11A6A] text-white flex items-center justify-center mx-auto mb-4 shadow-md">
                <AlertTriangle className="w-8 h-8" strokeWidth={2.5} />
              </div>
              <h1 className="text-2xl font-black tracking-tight">Link expired ya invalid</h1>
              <p className="text-[13px] text-foreground/70 mt-2 font-medium">
                Ye password reset link expire ho gaya hai ya already use ho chuka hai.
              </p>
              <Button asChild className="w-full h-12 mt-5 text-[14px]">
                <Link to="/forgot-password">Naya link request karein</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0E8A4B] text-white text-[10px] uppercase tracking-[0.18em] font-extrabold shadow-sm">
                  <KeyRound className="w-3 h-3" /> Naya password set karein
                </span>
              </div>

              <h1 className="text-[30px] lg:text-[36px] font-black tracking-tight leading-[1.02]">
                Choose karein <span className="text-[#0E8A4B]">strong password</span>
              </h1>
              <p className="text-[13px] text-foreground/70 mt-3 font-medium">
                Aisa password jo aapne pehle use nahi kiya. Kam se kam 8 characters.
              </p>

              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">Naya password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={show ? "text" : "password"}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Kam se kam 8 characters"
                      className="h-12 pr-11 text-[14px]"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-[#FFE8C7] transition"
                      aria-label={show ? "Hide password" : "Show password"}
                    >
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Strength meter */}
                  {password.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="h-1.5 flex-1 rounded-full transition-all"
                            style={{ background: i < strength ? strengthColor : "#FFE8C7" }}
                          />
                        ))}
                      </div>
                      <p
                        className="text-[11px] font-extrabold mt-1 uppercase tracking-wider"
                        style={{ color: strengthColor }}
                      >
                        {strengthLabel}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type={show ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Wapas same password likhein"
                    className="h-12 text-[14px]"
                    aria-invalid={confirm.length > 0 && confirm !== password}
                  />
                  {confirm.length > 0 && confirm !== password && (
                    <p className="text-[11px] text-[#D4308E] font-extrabold flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3" /> Passwords match nahi ho rahe
                    </p>
                  )}
                </div>

                <Button type="submit" disabled={submitting} className="w-full h-12 text-[14px]">
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Update ho raha hai…</>
                  ) : (
                    <><ShieldCheck className="w-4 h-4" /> Password update karein</>
                  )}
                </Button>
              </form>

              <div className="mt-6 p-4 rounded-xl bg-[#FFF1D6] border-2 border-[#E8B968] text-center text-[12px] font-semibold text-foreground/80">
                Tip: 12+ characters · uppercase + number + symbol = strongest
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
