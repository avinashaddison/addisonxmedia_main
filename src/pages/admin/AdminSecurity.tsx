import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { twoFactor } from "@/lib/auth-client";
import {
  ShieldCheck, KeyRound, Smartphone, Copy, AlertTriangle, CheckCircle2, Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { cn } from "@/lib/utils";

const AdminSecurity = () => {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["admin-me"], queryFn: () => adminApi.me() });

  const [password, setPassword] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [step, setStep] = useState<"idle" | "qr" | "verify" | "done">("idle");
  const [totpUri, setTotpUri] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");

  const startEnroll = async () => {
    if (!password) { toast.error("Enter your current password"); return; }
    setEnrolling(true);
    try {
      const r = await twoFactor.enable({ password });
      const data = r.data;
      if (data && "totpURI" in data && "backupCodes" in data) {
        setTotpUri(data.totpURI as string);
        setBackupCodes(data.backupCodes as string[]);
        setStep("qr");
      } else if (r.error) {
        throw new Error(r.error.message ?? "Failed to start enrollment");
      }
    } catch (e) { toast.error(String(e)); }
    finally { setEnrolling(false); }
  };

  const verifyAndFinish = async () => {
    if (verifyCode.length !== 6) { toast.error("Enter the 6-digit code from your authenticator"); return; }
    setVerifying(true);
    try {
      const r = await twoFactor.verifyTotp({ code: verifyCode });
      if (r.error) throw new Error(r.error.message ?? "Wrong code");
      toast.success("2FA enabled! Save your backup codes.");
      setStep("done");
      qc.invalidateQueries({ queryKey: ["admin-me"] });
    } catch (e) { toast.error(String(e)); }
    finally { setVerifying(false); }
  };

  const disable2fa = async () => {
    if (!disablePassword) { toast.error("Enter your password"); return; }
    setDisabling(true);
    try {
      const r = await twoFactor.disable({ password: disablePassword });
      if (r.error) throw new Error(r.error.message ?? "Failed to disable 2FA");
      toast.success("2FA disabled");
      qc.invalidateQueries({ queryKey: ["admin-me"] });
      setStep("idle");
      setDisablePassword("");
    } catch (e) { toast.error(String(e)); }
    finally { setDisabling(false); }
  };

  const enabled = me?.twoFactorEnabled === true;

  return (
    <PageShell
      title="Security & 2FA"
      subtitle="Two-factor authentication · required for all staff members"
      icon={<ShieldCheck className="w-5 h-5 text-white" strokeWidth={2.5} />}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {enabled ? (
          <>
            <div className="bg-white border-2 border-[#E8B968] p-5 rounded-2xl shadow-[0_4px_0_0_#E8B968] flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-[#E6F7EE] border-2 border-[#0E8A4B] text-[#0A6E3C] flex items-center justify-center shadow-[0_2px_0_0_#000] flex-shrink-0">
                <CheckCircle2 className="w-5.5 h-5.5" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-black text-slate-850">Two-factor authentication is active</p>
                <p className="text-[12px] text-slate-500 font-semibold mt-1 leading-relaxed">
                  Your account is protected by a TOTP code from your authenticator app. You will be prompted for the 6-digit verification code on every login.
                </p>
              </div>
            </div>

            <div className="bg-white border-2 border-rose-350 p-5 rounded-2xl shadow-[0_4px_0_0_#FDA4AF]">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" strokeWidth={2.5} />
                <p className="text-[13px] font-black text-rose-600 uppercase tracking-wider">Disable 2FA</p>
              </div>
              <p className="text-[12.5px] text-slate-500 font-semibold mb-4 leading-relaxed">
                Only disable if you're moving to a new device or have lost your authenticator. Disabling 2FA is strongly discouraged.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 max-w-md">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="disable-pw" className="text-[11px] font-extrabold uppercase tracking-wider text-[#B8651A]">
                    Confirm Password
                  </Label>
                  <Input
                    id="disable-pw"
                    type="password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    placeholder="Enter password to disable"
                    className="h-10 border-2 border-rose-350 focus:border-rose-600 rounded-xl bg-white text-slate-800 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
                  />
                </div>
                <button
                  onClick={disable2fa}
                  disabled={disabling}
                  className="px-4 h-10 rounded-xl text-[12px] font-extrabold bg-rose-600 border-2 border-rose-700 shadow-[0_2px_0_0_#5E0B3B] text-white hover:bg-rose-700 active:translate-y-0.5 active:shadow-[0_1px_0_0_#5E0B3B] disabled:opacity-50 transition-all flex items-center justify-center"
                >
                  {disabling ? "Disabling…" : "Disable 2FA"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {step === "idle" && (
              <div className="bg-white border-2 border-[#E8B968] p-6 rounded-2xl shadow-[0_4px_0_0_#E8B968]">
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-[#FFF6E8] border-2 border-[#E8B968] text-[#B8651A] flex items-center justify-center shadow-[0_2.5px_0_0_#000] flex-shrink-0">
                    <Smartphone className="w-5.5 h-5.5" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[15px] font-black text-slate-850">Set up two-factor authentication</p>
                    <p className="text-[12px] text-slate-450 font-semibold mt-0.5">
                      Use an app like Google Authenticator, Authy, or 1Password.
                    </p>
                  </div>
                </div>

                <div className="bg-[#FFF6E8]/30 border-2 border-dashed border-[#E8B968] rounded-2xl p-4 mb-5">
                  <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#B8651A] mb-2">Onboarding Steps</p>
                  <ol className="text-[12px] text-slate-650 list-decimal pl-5 space-y-1.5 font-semibold">
                    <li>Enter your password to begin</li>
                    <li>Scan the QR code with your authenticator app</li>
                    <li>Save the backup codes somewhere safe</li>
                    <li>Enter the 6-digit code to confirm</li>
                  </ol>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 max-w-md">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="enroll-pw" className="text-[11px] font-extrabold uppercase tracking-wider text-[#B8651A]">
                      Current Password
                    </Label>
                    <Input
                      id="enroll-pw"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-10 border-2 border-[#E8B968] focus:border-[#0E8A4B] rounded-xl bg-white text-slate-800 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={startEnroll}
                    disabled={enrolling}
                    className="px-4 h-10 rounded-xl text-[12px] font-extrabold bg-[#0E8A4B] border-2 border-[#0A6E3C] shadow-[0_2px_0_0_#073D22] text-white hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_1px_0_0_#073D22] disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                  >
                    {enrolling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                    Start enrollment
                  </button>
                </div>
              </div>
            )}

            {(step === "qr" || step === "verify") && (
              <div className="bg-white border-2 border-[#E8B968] p-6 rounded-2xl shadow-[0_4px_0_0_#E8B968] space-y-5">
                <div>
                  <p className="text-[15px] font-black text-slate-850">Scan this QR code</p>
                  <p className="text-[12px] text-slate-450 font-semibold mt-0.5">Open your authenticator app and scan, or paste the URI manually.</p>
                </div>

                <div className="flex flex-col items-center justify-center bg-[#FFF6E8]/20 border-2 border-dashed border-[#E8B968] rounded-2xl p-6">
                  <img
                    alt="2FA QR"
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(totpUri)}`}
                    className="rounded-xl border-2 border-slate-900 shadow-[0_3px_0_0_#000]"
                  />
                  <p className="text-[10px] text-slate-500 font-mono break-all mt-4 max-w-md text-center bg-white p-2 border border-slate-200 rounded-lg">{totpUri}</p>
                </div>

                {backupCodes.length > 0 && (
                  <div className="bg-slate-950 text-indigo-200 border-2 border-slate-900 shadow-[0_4px_0_0_#000] rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-400">Backup codes — save NOW</p>
                      <button
                        onClick={() => { navigator.clipboard.writeText(backupCodes.join("\n")); toast.success("Copied"); }}
                        className="px-3 py-1 rounded-xl text-[11px] font-extrabold bg-slate-900 border border-slate-850 text-indigo-305 hover:bg-slate-850 active:translate-y-0.5 transition-all flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Copy Codes
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[12px] text-indigo-100/90 font-bold">
                      {backupCodes.map((c, i) => <div key={i}>{c}</div>)}
                    </div>
                    <p className="text-[10px] text-indigo-400/70 mt-3 font-semibold">Each code can be used once if you lose your authenticator.</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 max-w-md">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="verify" className="text-[11px] font-extrabold uppercase tracking-wider text-[#B8651A]">
                      Authenticator Code
                    </Label>
                    <Input
                      id="verify"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      inputMode="numeric"
                      maxLength={6}
                      className="font-mono tracking-widest text-center text-lg h-10 border-2 border-[#E8B968] focus:border-[#0E8A4B] rounded-xl bg-white text-slate-800 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
                    />
                  </div>
                  <button
                    onClick={verifyAndFinish}
                    disabled={verifying || verifyCode.length !== 6}
                    className="px-4 h-10 rounded-xl text-[12px] font-extrabold bg-[#0E8A4B] border-2 border-[#0A6E3C] shadow-[0_2px_0_0_#073D22] text-white hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_1px_0_0_#073D22] disabled:opacity-50 transition-all flex items-center justify-center"
                  >
                    {verifying ? "Verifying…" : "Verify & Enable"}
                  </button>
                </div>
              </div>
            )}

            {step === "done" && (
              <div className="bg-white border-2 border-[#E8B968] p-6 rounded-2xl shadow-[0_5px_0_0_#E8B968] text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#E6F7EE] text-[#0A6E3C] border-2 border-[#0E8A4B] flex items-center justify-center shadow-[0_3px_0_0_#000] mx-auto animate-bounce">
                  <CheckCircle2 className="w-7 h-7" strokeWidth={2.5} />
                </div>
                <p className="text-2xl font-black text-slate-850">2FA is now enabled!</p>
                <p className="text-[13px] text-slate-450 font-semibold">Your account security has been updated. You will be prompted on every login.</p>
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
};

export default AdminSecurity;

export default AdminSecurity;
