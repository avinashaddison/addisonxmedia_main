import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { twoFactor } from "@/lib/auth-client";
import {
  ShieldCheck, KeyRound, Smartphone, Copy, AlertTriangle, CheckCircle2, Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
    <div className="max-w-3xl mx-auto px-6 lg:px-10 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3.5 border-b border-slate-200/80 pb-5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex items-center justify-center shadow-sm">
          <ShieldCheck className="w-5.5 h-5.5 text-indigo-400" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-[24px] font-black tracking-tight text-slate-900">Security</h1>
          <p className="text-[12px] text-slate-500 font-medium">Two-factor authentication · required for all staff</p>
        </div>
      </div>

      {enabled ? (
        <>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" strokeWidth={2.2} />
            <div className="flex-1">
              <p className="text-[15px] font-bold text-slate-800">Two-factor authentication is ON</p>
              <p className="text-[12px] text-slate-400 font-medium mt-1">
                Your account is protected by a TOTP code from your authenticator app. You will be prompted for the 6-digit code on every login.
              </p>
            </div>
          </div>

          <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" strokeWidth={2.2} />
              <p className="text-[13px] font-bold text-rose-600">Disable 2FA</p>
            </div>
            <p className="text-[12px] text-slate-400 font-medium mb-3">
              Only disable if you're moving to a new device or have lost your authenticator. Strongly discouraged.
            </p>
            <div className="flex items-end gap-2 max-w-md">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="disable-pw">Current password</Label>
                <Input
                  id="disable-pw"
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Confirm password to disable"
                  className="border-slate-200 focus-visible:ring-indigo-600"
                />
              </div>
              <Button variant="destructive" onClick={disable2fa} disabled={disabling} className="bg-rose-600 hover:bg-rose-700 transition active:scale-[0.98]">
                {disabling ? "Disabling…" : "Disable 2FA"}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <>
          {step === "idle" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-slate-50 text-slate-700 border flex items-center justify-center shadow-sm">
                  <Smartphone className="w-5 h-5 text-slate-500" strokeWidth={2.2} />
                </div>
                <div>
                  <p className="text-[15px] font-bold text-slate-800">Set up two-factor authentication</p>
                  <p className="text-[12px] text-slate-400 font-medium">
                    Use an app like Google Authenticator, Authy, or 1Password.
                  </p>
                </div>
              </div>

              <ol className="text-[12px] text-slate-650 list-decimal pl-5 space-y-1 mb-4 font-medium">
                <li>Enter your password to begin</li>
                <li>Scan the QR code with your authenticator app</li>
                <li>Save the backup codes somewhere safe</li>
                <li>Enter the 6-digit code to confirm</li>
              </ol>

              <div className="flex items-end gap-2 max-w-md">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="enroll-pw">Current password</Label>
                  <Input id="enroll-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus className="border-slate-200 focus-visible:ring-indigo-600" />
                </div>
                <Button onClick={startEnroll} disabled={enrolling} className="bg-slate-900 hover:bg-slate-800 text-white transition active:scale-[0.98]">
                  {enrolling ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <KeyRound className="w-3.5 h-3.5 mr-1.5" />}
                  Start enrollment
                </Button>
              </div>
            </div>
          )}

          {(step === "qr" || step === "verify") && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <p className="text-[15px] font-bold text-slate-800 mb-1">Scan this QR code</p>
              <p className="text-[12px] text-slate-400 font-medium mb-4">Open your authenticator app and scan, or paste the URI manually.</p>

              <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-250 rounded-2xl p-6 mb-4">
                <img
                  alt="2FA QR"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(totpUri)}`}
                  className="rounded border border-slate-200 shadow-sm"
                />
                <p className="text-[10px] text-slate-400 font-mono break-all mt-3 max-w-md text-center">{totpUri}</p>
              </div>

              {backupCodes.length > 0 && (
                <div className="bg-slate-900 text-indigo-200 border border-slate-850 rounded-2xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Backup codes — save NOW</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { navigator.clipboard.writeText(backupCodes.join("\n")); toast.success("Copied"); }}
                      className="border-slate-800 bg-slate-800 hover:bg-slate-700 hover:text-white text-indigo-205"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[12px]">
                    {backupCodes.map((c, i) => <div key={i}>{c}</div>)}
                  </div>
                  <p className="text-[10px] text-indigo-400/80 mt-2 font-medium">Each code can be used once if you lose your authenticator.</p>
                </div>
              )}

              <div className="flex items-end gap-2 max-w-md">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="verify">6-digit code from authenticator</Label>
                  <Input
                    id="verify"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    inputMode="numeric"
                    maxLength={6}
                    className="font-mono tracking-widest text-lg border-slate-200 focus-visible:ring-indigo-600"
                  />
                </div>
                <Button onClick={verifyAndFinish} disabled={verifying || verifyCode.length !== 6} className="bg-slate-900 hover:bg-slate-800 text-white transition active:scale-[0.98]">
                  {verifying ? "Verifying…" : "Verify & enable"}
                </Button>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shadow-sm mx-auto mb-3 animate-bounce">
                <CheckCircle2 className="w-7 h-7" strokeWidth={2.2} />
              </div>
              <p className="text-2xl font-black text-slate-800">2FA is now enabled!</p>
              <p className="text-[13px] text-slate-400 font-medium mt-1">You'll be prompted on every login.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminSecurity;
