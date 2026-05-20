/**
 * Send-UPI-payment-request dialog.
 *
 * First-run UX: if the operator hasn't set their UPI VPA yet, the dialog
 * opens straight into a "Set up UPI" form. Once saved, it switches to the
 * "Send pay link" form: amount + note + live QR preview + send button.
 *
 * When the user hits "Send", we POST to /api/payments/upi/send which:
 *   1. Builds upi://pay?pa=...&am=...&tn=... deep link
 *   2. Builds a QR image URL via api.qrserver.com
 *   3. Sends the link as a WhatsApp message via Meta API (or dry-runs)
 *   4. Records the message in our DB so it shows in the chat
 */

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IndianRupee, Loader2, QrCode, CheckCircle2, Smartphone, Send, Info, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conversationId: string;
  contactName: string;
};

const PRESET_AMOUNTS = ["100", "500", "1000", "2500", "5000"] as const;

export const SendPaymentDialog = ({ open, onOpenChange, conversationId, contactName }: Props) => {
  const qc = useQueryClient();
  const cfgQ = useQuery({ queryKey: ["upi-config"], queryFn: () => api.getUpiConfig() });

  const [mode, setMode] = useState<"setup" | "request">("request");
  const [amount, setAmount] = useState("500");
  const [note, setNote] = useState("");
  // Setup form
  const [vpaInput, setVpaInput] = useState("");
  const [displayNameInput, setDisplayNameInput] = useState("");

  // Whenever the dialog opens, decide which view to show based on config state.
  useEffect(() => {
    if (!open) return;
    if (cfgQ.data && !cfgQ.data.configured) {
      setMode("setup");
      setVpaInput(cfgQ.data.vpa);
      setDisplayNameInput(cfgQ.data.display_name);
    } else {
      setMode("request");
    }
  }, [open, cfgQ.data]);

  const saveConfig = useMutation({
    mutationFn: () => api.saveUpiConfig({ vpa: vpaInput.trim(), display_name: displayNameInput.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["upi-config"] });
      toast.success("UPI ID saved");
      setMode("request");
    },
    onError: (e) => toast.error(String(e)),
  });

  const sendRequest = useMutation({
    mutationFn: () =>
      api.sendUpiPaymentRequest({
        conversation_id: conversationId,
        amount_inr: Number(amount),
        note: note.trim() || undefined,
      }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      toast.success(
        r.sent_live
          ? `Pay link bheja gaya · ${contactName} ko WhatsApp pe`
          : `Pay link saved (dry-run · Meta connect karein to send live)`,
      );
      onOpenChange(false);
      setNote("");
    },
    onError: (e) => toast.error(String(e)),
  });

  // Live preview — built locally so QR updates instantly without server roundtrip
  const previewUpiLink = useMemo(() => {
    if (!cfgQ.data?.vpa || !Number(amount)) return "";
    const params = new URLSearchParams({
      pa: cfgQ.data.vpa,
      pn: cfgQ.data.display_name || "Business",
      am: Number(amount).toFixed(2),
      tn: (note.trim() || `Payment to ${cfgQ.data.display_name || "Business"}`).slice(0, 40),
      cu: "INR",
    });
    return `upi://pay?${params.toString()}`;
  }, [cfgQ.data?.vpa, cfgQ.data?.display_name, amount, note]);

  const previewQrUrl = useMemo(() => {
    if (!previewUpiLink) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=4&data=${encodeURIComponent(previewUpiLink)}`;
  }, [previewUpiLink]);

  /* ─── Setup view ─── */
  if (mode === "setup") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0E8A4B] to-[#0A6E3C] text-white flex items-center justify-center shadow-md">
                <IndianRupee className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <div>
                <DialogTitle>UPI ID set karein</DialogTitle>
                <DialogDescription className="text-foreground/70 font-medium">
                  Ek baar set karna hai · har pay link automatic banegi
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="vpa">UPI ID (VPA)</Label>
              <Input
                id="vpa"
                value={vpaInput}
                onChange={(e) => setVpaInput(e.target.value.toLowerCase())}
                placeholder="9709707311@upi  · ya  yourname@okhdfcbank"
                className="font-mono"
                autoFocus
              />
              <p className="text-[11px] text-foreground/60 font-medium">
                Format: <span className="font-mono">number@upi</span> / <span className="font-mono">name@okaxis</span> / <span className="font-mono">@paytm</span> etc.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dname">Display name <span className="text-foreground/40 ml-1 font-normal text-[11px]">(optional)</span></Label>
              <Input
                id="dname"
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value.slice(0, 40))}
                placeholder="Addison X Media"
                maxLength={40}
              />
              <p className="text-[11px] text-foreground/60 font-medium">
                Customer ke UPI app me apka business name dikhega.
              </p>
            </div>

            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[#FFF1D6] border border-[#E8B968]">
              <Info className="w-4 h-4 text-[#B8651A] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-foreground/80">
                Paisa direct apke UPI account me aayega. Hum sirf link banate hain — paisa hamare paas se nahi gujarta.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 mt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              disabled={saveConfig.isPending || !vpaInput.trim()}
              onClick={() => saveConfig.mutate()}
            >
              {saveConfig.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Save UPI ID
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  /* ─── Send-request view ─── */
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0E8A4B] to-[#0A6E3C] text-white flex items-center justify-center shadow-md">
              <IndianRupee className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>Pay link bhejo · {contactName}</DialogTitle>
              <DialogDescription className="text-foreground/70 font-medium">
                UPI link + QR generate karke WhatsApp pe seedha bhejega
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid sm:grid-cols-[1fr_240px] gap-4 mt-2">
          {/* Left: form */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="amt">Amount (₹)</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0E8A4B]" />
                <Input
                  id="amt"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={1}
                  max={100000}
                  step={1}
                  className="pl-9 text-xl font-black tabular-nums"
                  autoFocus
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {PRESET_AMOUNTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setAmount(p)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-extrabold border-2 transition tabular-nums",
                      amount === p
                        ? "bg-[#0E8A4B] text-white border-[#0A6E3C]"
                        : "bg-white text-foreground/70 border-[#E8B968] hover:bg-[#FFF1D6]",
                    )}
                  >
                    ₹{Number(p).toLocaleString("en-IN")}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-foreground/60 font-medium">
                Max ₹1,00,000 per request (UPI limit). Bigger → split into multiple.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="note">Note <span className="text-foreground/40 ml-1 font-normal text-[11px]">(optional · max 40 chars)</span></Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 40))}
                placeholder="Diwali order · Invoice #2026-091"
                rows={2}
                maxLength={40}
              />
            </div>

            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[#E6F7EE] border border-[#0E8A4B]/40">
              <Smartphone className="w-4 h-4 text-[#0E8A4B] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-foreground/80">
                Customer tapega link → unka UPI app (PhonePe / GPay / Paytm / BHIM) khulega → amount aur apka business name pehle se filled hoga → bas pin daalein. Ya QR scan karein.
              </p>
            </div>

            <button
              onClick={() => setMode("setup")}
              className="text-[11px] font-extrabold text-[#3C50E0] hover:underline inline-flex items-center gap-1 mt-1"
            >
              <Edit3 className="w-3 h-3" />
              UPI ID change karein ({cfgQ.data?.vpa})
            </button>
          </div>

          {/* Right: live QR preview */}
          <div className="bg-[#FFF6E8] border-2 border-[#E8B968] rounded-2xl p-3 flex flex-col items-center text-center shadow-[0_3px_0_0_#E8B968]">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#B8651A] font-extrabold mb-1.5">Live preview</p>
            {previewQrUrl ? (
              <img
                src={previewQrUrl}
                alt="UPI QR code"
                className="w-full max-w-[200px] aspect-square rounded-lg bg-white p-2 shadow-sm"
              />
            ) : (
              <div className="w-full aspect-square rounded-lg bg-white border border-dashed border-[#E8B968] flex items-center justify-center text-[#B8651A]">
                <QrCode className="w-10 h-10 opacity-40" />
              </div>
            )}
            <p className="text-[14px] font-black tabular-nums mt-2 text-[#0A6E3C]">
              ₹{Number(amount || 0).toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-foreground/60 font-medium truncate w-full">
              to {cfgQ.data?.display_name || cfgQ.data?.vpa || "—"}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 mt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={sendRequest.isPending || !amount || Number(amount) < 1 || !cfgQ.data?.configured}
            onClick={() => sendRequest.mutate()}
          >
            {sendRequest.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Send ₹{Number(amount || 0).toLocaleString("en-IN")} request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
