import { useState } from "react";
import {
  Package, Mail, KeyRound, Link as LinkIcon, Copy, Eye, EyeOff, Check,
  Sparkles, ExternalLink, ShieldCheck, FileDown, GraduationCap, Code2, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ProductDeliveryPayload, DeliveryType } from "./SendProductDialog";

export const PRODUCT_DELIVERY_PREFIX = "[[product_delivery]]";

export const encodeProductDelivery = (p: ProductDeliveryPayload) =>
  `${PRODUCT_DELIVERY_PREFIX}${JSON.stringify(p)}`;

export const decodeProductDelivery = (body: string): ProductDeliveryPayload | null => {
  if (!body.startsWith(PRODUCT_DELIVERY_PREFIX)) return null;
  try {
    const json = body.slice(PRODUCT_DELIVERY_PREFIX.length);
    const parsed = JSON.parse(json);
    if (parsed?.kind === "product_delivery") return parsed as ProductDeliveryPayload;
    return null;
  } catch {
    return null;
  }
};

const TYPE_META: Record<DeliveryType, { label: string; icon: typeof Mail }> = {
  credentials: { label: "Login Access", icon: KeyRound },
  download: { label: "Download", icon: FileDown },
  course: { label: "Course Access", icon: GraduationCap },
  license: { label: "License Key", icon: Code2 },
};

const CopyRow = ({ icon: Icon, label, value, mask = false }: { icon: typeof Mail; label: string; value: string; mask?: boolean }) => {
  const [revealed, setRevealed] = useState(!mask);
  const [copied, setCopied] = useState(false);
  const display = mask && !revealed ? "•".repeat(Math.min(value.length, 12)) : value;

  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`${label} copied`);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-white/70 dark:bg-white/5 backdrop-blur-sm ring-1 ring-foreground/5">
      <Icon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-[12px] font-mono font-semibold text-foreground truncate">{display}</div>
      </div>
      {mask && (
        <button onClick={() => setRevealed((v) => !v)} className="w-7 h-7 rounded-md hover:bg-foreground/5 flex items-center justify-center text-muted-foreground" type="button">
          {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </button>
      )}
      <button onClick={copy} className="w-7 h-7 rounded-md hover:bg-foreground/5 flex items-center justify-center text-muted-foreground" type="button">
        {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
};

export const ProductDeliveryCard = ({ payload }: { payload: ProductDeliveryPayload }) => {
  const meta = TYPE_META[payload.deliveryType] ?? TYPE_META.credentials;
  const TypeIcon = meta.icon;

  return (
    <div className="w-[320px] rounded-2xl overflow-hidden shadow-lg shadow-primary/10 ring-1 ring-primary/20 bg-gradient-to-br from-primary-soft via-card to-accent-soft">
      {/* Header */}
      <div className="relative px-4 py-3 bg-gradient-to-br from-primary via-primary-glow to-accent text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }} />
        <div className="relative flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/30">
            <Package className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/80 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> Product Delivered
            </div>
            <div className="text-[14px] font-bold truncate">{payload.productName}</div>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 ring-1 ring-white/30">
            <TypeIcon className="w-2.5 h-2.5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">{meta.label}</span>
          </div>
        </div>
      </div>

      {/* Message */}
      {payload.message && (
        <div className="px-4 pt-3 pb-2">
          <p className="text-[12px] leading-relaxed text-foreground whitespace-pre-wrap">{payload.message}</p>
        </div>
      )}

      {/* Credentials grid */}
      <div className="px-4 pb-3 space-y-1.5">
        {payload.email && <CopyRow icon={Mail} label="Email" value={payload.email} />}
        {payload.password && <CopyRow icon={KeyRound} label="Password" value={payload.password} mask />}
        {payload.licenseKey && <CopyRow icon={Code2} label="License Key" value={payload.licenseKey} mask />}
        {payload.url && (
          <a
            href={payload.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-primary to-primary-glow text-primary-foreground hover:shadow-md hover:shadow-primary/30 transition-all group"
          >
            <LinkIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-bold uppercase tracking-wider opacity-80">
                {payload.deliveryType === "course" ? "Open Course" : payload.deliveryType === "download" ? "Download" : "Login URL"}
              </div>
              <div className="text-[11px] font-mono truncate">{payload.url}</div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </a>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-foreground/5 flex items-center justify-between gap-2 bg-card/60 backdrop-blur-sm">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <ShieldCheck className="w-3 h-3 text-success" />
          <span className="font-semibold">Encrypted</span>
        </div>
        {payload.expiresAt && (
          <div className="flex items-center gap-1 text-[10px] text-warning font-semibold">
            <Clock className="w-3 h-3" />
            Expires {new Date(payload.expiresAt).toLocaleDateString()}
          </div>
        )}
        <div className="text-[10px] text-muted-foreground ml-auto">
          {new Date(payload.deliveredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
};
