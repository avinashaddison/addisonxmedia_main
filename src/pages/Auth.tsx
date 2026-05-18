import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authClient, twoFactor as twoFactorClient } from "@/lib/auth-client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  MessageCircle, Loader2, ArrowRight, Check, Sparkles, Star, Shield,
  IndianRupee, Languages, FileCheck2, Crown, TrendingUp, Bot,
} from "lucide-react";
import { BrandLockup } from "@/components/brand/AddisonLogo";
import { useFlag } from "@/hooks/useSystemFlags";

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

const Auth = () => {
  useForceLight();
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useAuth();
  const signupEnabled = useFlag("signup_enabled");
  const [mode, setMode] = useState<"login" | "signup">("login");

  // If signups are disabled and user lands on signup mode, force back to login
  useEffect(() => {
    if (!signupEnabled && mode === "signup") setMode("login");
  }, [signupEnabled, mode]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  /** When the password step succeeds but the account has 2FA enabled, BetterAuth
   *  pauses the session and returns { twoFactorRedirect: true }. We switch the
   *  form into "code" mode for the second-factor challenge. */
  const [needs2fa, setNeeds2fa] = useState(false);
  const [code, setCode] = useState("");

  /** After a successful login, ask the server whether this user is staff and
   *  send them to the right home page. */
  const completeLogin = async () => {
    try {
      const r = await fetch("/api/admin/me", { credentials: "include" });
      if (r.ok) {
        navigate("/admin/dashboard", { replace: true });
        return;
      }
    } catch { /* ignore */ }
    navigate("/app", { replace: true });
  };

  useEffect(() => {
    if (!sessionLoading && user && !needs2fa) completeLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await authClient.signUp.email({
          email,
          password,
          name: displayName || email.split("@")[0],
        });
        if (error) throw new Error(error.message ?? "Sign-up failed");
        await completeLogin();
      } else {
        const r = await authClient.signIn.email({ email, password });
        if (r.error) throw new Error(r.error.message ?? "Sign-in failed");
        // BetterAuth twoFactor plugin returns { twoFactorRedirect: true } when
        // the account has 2FA enabled. Switch to the OTP entry step.
        const data = (r as { data?: { twoFactorRedirect?: boolean } }).data;
        if (data?.twoFactorRedirect) {
          setNeeds2fa(true);
          toast.message("Enter the 6-digit code from your authenticator");
          return;
        }
        await completeLogin();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      const lower = msg.toLowerCase();
      if (lower.includes("invalid") || lower.includes("password")) toast.error("Galat email ya password");
      else if (lower.includes("exists") || lower.includes("already")) toast.error("Email pehle se registered hai. Sign in karein.");
      else toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) { toast.error("6-digit code required"); return; }
    setSubmitting(true);
    try {
      const r = await twoFactorClient.verifyTotp({ code });
      if (r.error) throw new Error(r.error.message ?? "Wrong code");
      toast.success("Verified");
      setNeeds2fa(false);
      await completeLogin();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FFF6E8] text-foreground flex flex-col">
      {/* Top bar */}
      <header className="h-[80px] flex items-center justify-between px-5 sm:px-8 border-b-2 border-[#E8B968] bg-white flex-shrink-0 overflow-visible">
        <Link to="/" className="flex items-center pt-1" aria-label="Addison X Media home">
          <BrandLockup size={25} />
        </Link>
        <Link to="/" className="text-[12px] font-semibold text-foreground/70 hover:text-[#FF6A1F] transition">
          ← Home par wapas
        </Link>
      </header>

      <main className="flex-1 grid lg:grid-cols-[1.05fr_1fr]">
        {/* ============== LEFT: poster panel ============== */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0A3D24] via-[#0D4E2E] to-[#0A3D24] text-white p-8 lg:p-12 hidden lg:flex flex-col justify-between">
          {/* Pattern */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "20px 20px",
            }}
          />
          {/* Color blobs */}
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#FFD23F]/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#FF6A1F]/20 rounded-full blur-3xl" />

          {/* Top: badges */}
          <div className="relative flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFD23F] text-[#7A4A00] text-[11px] font-extrabold">
              <Crown className="w-3 h-3" /> Meta Business Partner
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur text-white text-[11px] font-extrabold border border-white/20">
              <Shield className="w-3 h-3" /> DPDP 2023
            </span>
          </div>

          {/* Middle: headline */}
          <div className="relative max-w-md">
            <h2 className="text-[2.4rem] xl:text-[3rem] font-black tracking-tight leading-[1.02]">
              WhatsApp se{" "}
              <span className="relative inline-block whitespace-nowrap">
                <span className="text-[#FFD23F]">bikri</span>
                <svg className="absolute -bottom-1 left-0 w-full" height="10" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M2 7 Q 25 2, 50 6 T 98 5" stroke="#FF6A1F" strokeWidth="3" fill="none" strokeLinecap="round" />
                </svg>
              </span>{" "}
              karwane wala AI platform.
            </h2>
            <p className="mt-5 text-base text-white/85 leading-relaxed font-medium">
              12,000+ Indian businesses ne switch kiya hai. Aap kab?
            </p>

            {/* Features */}
            <ul className="mt-7 space-y-3">
              {[
                { icon: IndianRupee, text: "UPI · Razorpay · PhonePe chat ke andar" },
                { icon: Languages, text: "Hindi + 11 regional languages mein AI" },
                { icon: FileCheck2, text: "GST invoice har mahine, automatic" },
              ].map((f, k) => (
                <li key={k} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FFD23F] text-[#7A4A00] flex items-center justify-center flex-shrink-0 shadow-md">
                    <f.icon className="w-4 h-4" strokeWidth={2.5} />
                  </div>
                  <p className="text-[14px] font-semibold mt-1.5">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom: social proof */}
          <div className="relative">
            <div className="bg-white/10 backdrop-blur-xl border-2 border-white/15 rounded-2xl p-4 max-w-md">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex -space-x-2">
                  {["RM", "PM", "AS"].map((i, k) => (
                    <div
                      key={k}
                      className={`w-10 h-10 rounded-full border-2 border-[#0A3D24] flex items-center justify-center text-[11px] font-extrabold text-white shadow-md ${
                        ["bg-[#FF6A1F]", "bg-[#D4308E]", "bg-[#3C50E0]"][k]
                      }`}
                    >
                      {i}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, k) => (
                      <Star key={k} className="w-3.5 h-3.5 fill-[#FFD23F] text-[#FFD23F]" />
                    ))}
                    <span className="ml-1 text-[12px] font-extrabold">4.9/5</span>
                  </div>
                  <p className="text-[10px] opacity-80 font-medium">1,200+ verified G2 reviews</p>
                </div>
              </div>
              <p className="text-[13px] leading-relaxed font-medium">
                "AddisonX ne 3 tools replace kar diye. ₹40K se ₹3.2L per month — 90 dino mein."
              </p>
              <p className="text-[11px] text-[#FFD23F] font-extrabold mt-2 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Rohit Mehta · Mehta Tutorials, Indore
              </p>
            </div>
          </div>
        </div>

        {/* ============== RIGHT: form ============== */}
        <div className="relative flex items-center justify-center p-6 lg:p-10">
          {/* Subtle paisley pattern */}
          <div
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage: `url("${paisleyBg}")`,
              backgroundSize: "60px 60px",
            }}
          />
          <div className="absolute top-10 right-10 w-64 h-64 bg-[#FFD23F]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative w-full max-w-[440px]">
            {/* Sticker badge */}
            <div className="flex items-center gap-2 mb-5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF6A1F] text-white text-[10px] uppercase tracking-[0.18em] font-extrabold shadow-sm">
                <Sparkles className="w-3 h-3" /> {mode === "login" ? "Wapas swagat hai" : "Free trial"}
              </span>
              {mode === "signup" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFD23F] text-[#7A4A00] text-[10px] font-extrabold uppercase tracking-wider">
                  7 din free
                </span>
              )}
            </div>

            <h1 className="text-[30px] lg:text-[36px] font-black tracking-tight leading-[1.02]">
              {needs2fa ? (
                <>Two-factor <br /><span className="text-[#0E8A4B]">check</span></>
              ) : mode === "login" ? (
                <>
                  Namaste! <br />
                  <span className="text-[#0E8A4B]">Sign in</span> karein
                </>
              ) : (
                <>
                  Apna account <br />
                  <span className="text-[#FF6A1F]">banaiye</span>
                </>
              )}
            </h1>
            <p className="text-[13px] text-foreground/70 mt-3 font-medium">
              {needs2fa
                ? "Open your authenticator app and enter the 6-digit code."
                : mode === "login"
                ? "Email aur password daalein · workspace khul jaayega."
                : "Free start karein · credit card nahi chahiye · GST invoice included."}
            </p>

            {needs2fa ? (
              <form onSubmit={handleVerify2fa} className="mt-7 space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="code" className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#B8651A]">6-digit code</label>
                  <input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    className="w-full h-14 px-4 rounded-xl bg-white border-2 border-[#E8B968] text-2xl font-mono font-extrabold tracking-[0.5em] text-center focus:outline-none focus:border-[#FF6A1F] focus:shadow-[0_3px_0_0_#B8420A] transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || code.length !== 6}
                  className="group w-full h-13 mt-3 rounded-xl bg-[#0E8A4B] text-white font-extrabold text-[14px] hover:bg-[#0A6E3C] transition shadow-[0_5px_0_0_#073D22] hover:shadow-[0_2px_0_0_#073D22] hover:translate-y-[3px] disabled:opacity-60 disabled:translate-y-[3px] flex items-center justify-center gap-2 py-3.5"
                >
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : <>Verify & sign in <ArrowRight className="w-4 h-4" /></>}
                </button>

                <button
                  type="button"
                  onClick={() => { setNeeds2fa(false); setCode(""); setPassword(""); }}
                  className="w-full text-[12px] font-extrabold text-foreground/60 hover:text-[#FF6A1F] transition"
                >
                  ← Use a different account
                </button>

                <p className="text-[11px] text-foreground/60 font-medium text-center pt-2">
                  Lost your authenticator? Use a backup code (paste it in the field above).
                </p>
              </form>
            ) : (
            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#B8651A]">Aapka naam</label>
                  <input
                    id="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Rohit Mehta"
                    autoComplete="name"
                    className="w-full h-12 px-4 rounded-xl bg-white border-2 border-[#E8B968] text-[14px] font-medium focus:outline-none focus:border-[#FF6A1F] focus:shadow-[0_3px_0_0_#B8420A] transition-all placeholder:text-foreground/40"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#B8651A]">Work email</label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aap@company.com"
                  className="w-full h-12 px-4 rounded-xl bg-white border-2 border-[#E8B968] text-[14px] font-medium focus:outline-none focus:border-[#FF6A1F] focus:shadow-[0_3px_0_0_#B8420A] transition-all placeholder:text-foreground/40"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#B8651A]">Password</label>
                  {mode === "login" && (
                    <Link to="/forgot-password" className="text-[11px] font-extrabold text-[#0E8A4B] hover:text-[#FF6A1F] transition">
                      Bhool gaye?
                    </Link>
                  )}
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={mode === "signup" ? 8 : 6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "Kam se kam 8 characters" : "••••••••"}
                  className="w-full h-12 px-4 rounded-xl bg-white border-2 border-[#E8B968] text-[14px] font-medium focus:outline-none focus:border-[#FF6A1F] focus:shadow-[0_3px_0_0_#B8420A] transition-all placeholder:text-foreground/40"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="group w-full h-13 mt-3 rounded-xl bg-[#FF6A1F] text-white font-extrabold text-[14px] hover:bg-[#E85C12] transition shadow-[0_5px_0_0_#B8420A] hover:shadow-[0_2px_0_0_#B8420A] hover:translate-y-[3px] disabled:opacity-60 disabled:shadow-[0_2px_0_0_#B8420A] disabled:translate-y-[3px] flex items-center justify-center gap-2 py-3.5"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {mode === "login" ? "Sign in ho raha hai…" : "Account ban raha hai…"}</>
                ) : (
                  <>
                    {mode === "login" ? "Sign in karein" : "Free trial start karein"}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
            )}

            {!needs2fa && mode === "signup" && (
              <ul className="mt-5 grid grid-cols-2 gap-2 text-[12px] font-semibold text-foreground/80">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#0E8A4B]" strokeWidth={3.5} /> 7-day free trial</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#0E8A4B]" strokeWidth={3.5} /> Credit card nahi</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#0E8A4B]" strokeWidth={3.5} /> 5 min setup</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#0E8A4B]" strokeWidth={3.5} /> GST invoice</li>
              </ul>
            )}

            {!needs2fa && (
            <div className="mt-6 p-4 rounded-xl bg-white border-2 border-[#E8B968] text-center text-[13px] font-semibold">
              {mode === "login" ? (
                signupEnabled ? (
                <>
                  Account nahi hai?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-[#FF6A1F] font-extrabold hover:underline"
                  >
                    Sign up karein →
                  </button>
                </>
                ) : (
                  <span className="text-foreground/60">Signups are temporarily disabled.</span>
                )
              ) : (
                <>
                  Already account hai?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-[#0E8A4B] font-extrabold hover:underline"
                  >
                    Sign in karein →
                  </button>
                </>
              )}
            </div>
            )}

            <p className="text-[11px] text-foreground/60 text-center mt-6 leading-relaxed font-medium">
              Continue karne se aap hamare{" "}
              <Link to="/" className="text-foreground font-bold hover:underline">Terms</Link>{" "}
              aur{" "}
              <Link to="/" className="text-foreground font-bold hover:underline">Privacy Policy</Link> se agree karte hain.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Auth;
