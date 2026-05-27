import { useEffect, useState } from "react";
import {
  Package, Mail, KeyRound, Link as LinkIcon, FileDown, GraduationCap, Code2,
  Sparkles, Eye, EyeOff, Copy, Rocket, Shield, Trophy, Zap, Check,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type DeliveryType = "credentials" | "download" | "course" | "license";

export type ProductDeliveryPayload = {
  v: 1;
  kind: "product_delivery";
  productName: string;
  deliveryType: DeliveryType;
  email?: string;
  password?: string;
  url?: string;
  licenseKey?: string;
  message: string;
  expiresAt?: string;
  deliveredAt: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contactName: string;
  onDeliver: (payload: ProductDeliveryPayload, autoCloseDeal: boolean) => void;
  prefillProduct?: { name: string; price?: number } | null;
};

const DELIVERY_TYPES: { id: DeliveryType; label: string; icon: typeof Mail; desc: string }[] = [
  { id: "credentials", label: "Email + Password", icon: KeyRound, desc: "Login access" },
  { id: "download", label: "Download Link", icon: FileDown, desc: "File or asset" },
  { id: "course", label: "Course Access", icon: GraduationCap, desc: "Learning portal" },
  { id: "license", label: "API Key / License", icon: Code2, desc: "Activation key" },
];

const PRODUCT_PRESETS = [
  "AddisonX Pro",
  "Mastery Course",
  "AI Sales Toolkit",
  "WhatsApp Growth Kit",
  "Custom Product",
];

const defaultMessage = (productName: string) =>
  `🎉 Welcome to ${productName || "your new product"}!\n\nHere are your access details below. Please change your password after first login.\n\nNeed help? Just reply here 👍`;

export const SendProductDialog = ({ open, onOpenChange, contactName, onDeliver, prefillProduct }: Props) => {
  const [productName, setProductName] = useState("AddisonX Pro");

  useEffect(() => {
    if (open) {
      if (prefillProduct) {
        setProductName(prefillProduct.name);
        setMessage(defaultMessage(prefillProduct.name));
      } else {
        setProductName("AddisonX Pro");
        setMessage(defaultMessage("AddisonX Pro"));
      }
    }
  }, [open, prefillProduct]);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [message, setMessage] = useState(defaultMessage("AddisonX Pro"));
  const [expiresAt, setExpiresAt] = useState("");
  const [autoClose, setAutoClose] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [delivering, setDelivering] = useState(false);

  const updateProduct = (name: string) => {
    setProductName(name);
    setMessage(defaultMessage(name));
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    const pw = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setPassword(pw);
    toast.success("Strong password generated");
  };

  const copyField = (label: string, value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const validate = (): string | null => {
    if (!productName.trim()) return "Product name is required";
    if (deliveryType === "credentials") {
      if (!email.trim() || !password.trim()) return "Email and password are required";
    }
    if (deliveryType === "download" || deliveryType === "course") {
      if (!url.trim()) return "URL is required";
    }
    if (deliveryType === "license") {
      if (!licenseKey.trim()) return "License key is required";
    }
    return null;
  };

  const handleDeliver = () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setDelivering(true);
    const payload: ProductDeliveryPayload = {
      v: 1,
      kind: "product_delivery",
      productName: productName.trim(),
      deliveryType,
      email: email.trim() || undefined,
      password: password || undefined,
      url: url.trim() || undefined,
      licenseKey: licenseKey.trim() || undefined,
      message: message.trim(),
      expiresAt: expiresAt || undefined,
      deliveredAt: new Date().toISOString(),
    };
    setTimeout(() => {
      onDeliver(payload, autoClose);
      setDelivering(false);
      onOpenChange(false);
    }, 600);
  };

  const reset = () => {
    setEmail(""); setPassword(""); setUrl(""); setLicenseKey("");
    setExpiresAt(""); setShowPw(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-br from-primary via-primary-glow to-accent text-primary-foreground overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 30%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }} />
          <DialogHeader className="relative">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/30">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-white text-lg font-bold">Deliver Digital Product</DialogTitle>
                <DialogDescription className="text-white/80 text-xs">
                  Send to <span className="font-semibold">{contactName}</span> · Encrypted in transit
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Product name */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Product</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRODUCT_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => updateProduct(p)}
                  className={cn(
                    "text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all",
                    productName === p
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card text-muted-foreground border-border hover:border-primary hover:text-primary"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <Input value={productName} onChange={(e) => updateProduct(e.target.value)} placeholder="Product name" />
          </div>

          {/* Delivery type */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Delivery type</label>
            <div className="grid grid-cols-2 gap-2">
              {DELIVERY_TYPES.map((t) => {
                const Icon = t.icon;
                const active = deliveryType === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setDeliveryType(t.id)}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-lg border transition-all text-left",
                      active
                        ? "bg-primary-soft border-primary shadow-sm ring-1 ring-primary/20"
                        : "bg-card border-border hover:border-primary/40"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      active ? "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold text-foreground truncate">{t.label}</div>
                      <div className="text-[10px] text-muted-foreground">{t.desc}</div>
                    </div>
                    {active && <Check className="w-4 h-4 text-primary ml-auto flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic fields */}
          <div className="space-y-3">
            {deliveryType === "credentials" && (
              <>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block flex items-center gap-1.5">
                    <Mail className="w-3 h-3" /> Email
                  </label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="user@example.com" />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><KeyRound className="w-3 h-3" /> Password</span>
                    <button onClick={generatePassword} className="text-[10px] font-bold text-primary hover:text-primary-glow normal-case tracking-normal flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Generate
                    </button>
                  </label>
                  <div className="relative">
                    <Input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPw ? "text" : "password"}
                      placeholder="••••••••"
                      className="pr-20 font-mono"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                      <button onClick={() => setShowPw(!showPw)} className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground" type="button">
                        {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => copyField("Password", password)} className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground" type="button">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block flex items-center gap-1.5">
                    <LinkIcon className="w-3 h-3" /> Login URL <span className="text-muted-foreground/60 normal-case tracking-normal text-[10px]">(optional)</span>
                  </label>
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} type="url" placeholder="https://app.addisonx.in/login" />
                </div>
              </>
            )}

            {(deliveryType === "download" || deliveryType === "course") && (
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block flex items-center gap-1.5">
                  <LinkIcon className="w-3 h-3" /> {deliveryType === "download" ? "Download URL" : "Course URL"}
                </label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} type="url" placeholder="https://..." />
              </div>
            )}

            {deliveryType === "license" && (
              <>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block flex items-center gap-1.5">
                    <Code2 className="w-3 h-3" /> License Key / API Key
                  </label>
                  <Input value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX" className="font-mono" />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block flex items-center gap-1.5">
                    <LinkIcon className="w-3 h-3" /> Activation URL <span className="text-muted-foreground/60 normal-case tracking-normal text-[10px]">(optional)</span>
                  </label>
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} type="url" placeholder="https://..." />
                </div>
              </>
            )}
          </div>

          {/* Custom message */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Custom message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Expiry */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Expiry <span className="text-muted-foreground/60 normal-case tracking-normal text-[10px]">(optional)</span></label>
            <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>

          {/* Auto-close */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-success/10 to-success/5 border border-success/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-success to-success/70 flex items-center justify-center text-success-foreground">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[12px] font-bold text-foreground">Auto-close deal as WON</div>
                <div className="text-[10px] text-muted-foreground">Marks the deal won upon delivery</div>
              </div>
            </div>
            <Switch checked={autoClose} onCheckedChange={setAutoClose} />
          </div>

          {/* Security note */}
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 text-[10px] text-muted-foreground">
            <Shield className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
            <span>Credentials are masked in the chat bubble and revealed only on click. Tip: rotate the password after first login.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 h-10 rounded-lg text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDeliver}
            disabled={delivering}
            className={cn(
              "h-11 px-5 rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground text-[13px] font-bold flex items-center gap-2 transition-all",
              "hover:shadow-lg hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95",
              delivering && "opacity-70 cursor-not-allowed"
            )}
          >
            {delivering ? (
              <><Zap className="w-4 h-4 animate-pulse" /> Delivering…</>
            ) : (
              <><Rocket className="w-4 h-4" /> Deliver Now</>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
