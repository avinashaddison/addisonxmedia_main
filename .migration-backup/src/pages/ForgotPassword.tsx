import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ArrowLeft, KeyRound, Mail, Sparkles } from "lucide-react";
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

const ForgotPassword = () => {
  useForceLight();
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
      toast.error(err instanceof Error ? err.message : "Kuch galat ho gaya");
    } finally {
      setSubmitting(false);
    }
  };

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
          {!sent ? (
            <>
              <div className="flex items-center gap-2 mb-5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF6A1F] text-white text-[10px] uppercase tracking-[0.18em] font-extrabold shadow-sm">
                  <KeyRound className="w-3 h-3" /> Password reset
                </span>
              </div>

              <h1 className="text-[30px] lg:text-[36px] font-black tracking-tight leading-[1.02]">
                Password <br />
                <span className="text-[#FF6A1F]">bhool gaye</span>? Koi baat nahi.
              </h1>
              <p className="text-[13px] text-foreground/70 mt-3 font-medium">
                Apna registered email do, hum aapko reset link bhej denge.
              </p>

              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B8651A]" />
                    <Input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="aap@company.com"
                      className="pl-9 h-12 text-[14px]"
                      autoFocus
                    />
                  </div>
                </div>

                <Button type="submit" disabled={submitting} className="w-full h-12 text-[14px]">
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Bhej rahe hain…</>
                  ) : (
                    <>Reset link bhejo <ArrowLeft className="w-4 h-4 rotate-180" /></>
                  )}
                </Button>
              </form>

              <div className="mt-6 p-4 rounded-xl bg-white border-2 border-[#E8B968] text-center text-[13px] font-semibold">
                Account yaad aa gaya?{" "}
                <Link to="/auth" className="text-[#FF6A1F] font-extrabold hover:underline">
                  Sign in karein →
                </Link>
              </div>
            </>
          ) : (
            <div className="bg-white border-2 border-[#0E8A4B] rounded-2xl p-7 shadow-[0_6px_0_0_#0A6E3C] text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0E8A4B] to-[#16C172] text-white flex items-center justify-center mx-auto mb-4 shadow-md">
                <CheckCircle2 className="w-8 h-8" strokeWidth={2.5} />
              </div>
              <h1 className="text-2xl font-black tracking-tight">Reset link bhej diya!</h1>
              <p className="text-[13px] text-foreground/70 mt-2 font-medium">
                Agar <span className="text-foreground font-extrabold">{email}</span> account exist karta hai,
                to reset link aapke inbox mein aa gaya hai.
              </p>

              <div className="mt-5 p-3.5 rounded-xl bg-[#FFF1D6] border-2 border-[#E8B968] text-left">
                <p className="text-[11px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> Dev note
                </p>
                <p className="text-[12px] text-foreground/80 mt-1 font-medium leading-relaxed">
                  Email delivery abhi wired nahi hai. Reset URL API server console mein print hota hai.
                </p>
              </div>

              <button
                onClick={() => setSent(false)}
                className="mt-5 text-[13px] font-extrabold text-[#FF6A1F] hover:underline"
              >
                Doosra email try karein
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ForgotPassword;
