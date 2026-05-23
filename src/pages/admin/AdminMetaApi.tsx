/**
 * Admin → Meta API
 *
 * One-stop diagnostics + settings for the Meta API expansion features:
 *   - Permissions probe (what scopes does our access token have)
 *   - Messaging tier display + refresh
 *   - Catalog settings (catalog_id) + product browser
 *   - Conversions API settings (pixel_id, enabled flag, test_event_code)
 *   - Recent CAPI event log with response codes
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Activity, AlertTriangle, ArrowUpRight, BadgeCheck, Box, Check, Loader2,
  RefreshCw, ShieldCheck, Sparkles, Target, X, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString("en-IN") : "—";

const AdminMetaApi = () => {
  const qc = useQueryClient();

  const perms = useQuery({
    queryKey: ["meta-permissions"],
    queryFn: () => api.metaPermissions(),
    retry: false,
  });

  const tier = useQuery({
    queryKey: ["meta-tier-admin"],
    queryFn: () => api.metaGetTier(),
  });

  const capi = useQuery({
    queryKey: ["meta-capi-settings"],
    queryFn: () => api.metaCapiGetSettings(),
  });

  const capiEvents = useQuery({
    queryKey: ["meta-capi-events"],
    queryFn: () => api.metaCapiEvents(),
    refetchInterval: 30_000,
  });

  const refreshTier = useMutation({
    mutationFn: () => api.metaRefreshTier(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meta-tier"] });
      qc.invalidateQueries({ queryKey: ["meta-tier-admin"] });
      toast.success("Tier refreshed from Meta");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  return (
    <div className="px-6 lg:px-10 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1877F2] to-[#0040A8] text-white flex items-center justify-center shadow-md">
          <ShieldCheck className="w-6 h-6" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[26px] font-black tracking-tight">Meta API</h1>
          <p className="text-[12px] text-foreground/70 font-medium">
            Permissions · Messaging tier · Conversions API · Catalog
          </p>
        </div>
      </div>

      {/* ── Permissions panel ────────────────────────────────────────── */}
      <PermissionsPanel data={perms.data} loading={perms.isLoading} error={perms.error} />

      {/* ── Messaging tier panel ─────────────────────────────────────── */}
      <Section
        icon={<Zap className="w-4 h-4" />}
        title="Messaging tier"
        accent="emerald"
        right={
          <Button variant="outline" onClick={() => refreshTier.mutate()} disabled={refreshTier.isPending}>
            {refreshTier.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Refresh from Meta
          </Button>
        }
      >
        {tier.data?.messaging_limit_tier ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <TierStat label="Tier" value={tier.data.messaging_limit_tier.replace("TIER_", "")} />
            <TierStat label="Quality rating" value={tier.data.quality_rating ?? "—"} />
            <TierStat label="Refreshed" value={fmtDate(tier.data.tier_refreshed_at)} />
            <TierStat label="Daily cap" value={dailyCapFor(tier.data.messaging_limit_tier)} />
          </div>
        ) : (
          <p className="text-[12px] text-foreground/60 italic">
            Tier not yet probed. Click "Refresh from Meta" to query the WABA's current tier.
          </p>
        )}
      </Section>

      {/* ── Conversions API panel ────────────────────────────────────── */}
      <CapiPanel settings={capi.data} events={capiEvents.data ?? []} />
    </div>
  );
};

const PermissionsPanel = ({ data, loading, error }: {
  data?: { permissions: Array<{ permission: string; status: string }>; summary: Record<string, boolean> };
  loading: boolean;
  error: unknown;
}) => {
  const FEATURES = [
    { key: "has_waba_management", label: "WhatsApp Business management", perm: "whatsapp_business_management", required: true },
    { key: "has_waba_messaging",  label: "WhatsApp messaging",            perm: "whatsapp_business_messaging",  required: true },
    { key: "has_ads_management",  label: "Ads + Conversions API",         perm: "ads_management",                required: false, unlocks: "CAPI + in-app ads" },
    { key: "has_catalog",         label: "Catalog management",            perm: "catalog_management",            required: false, unlocks: "WhatsApp Catalog" },
    { key: "has_instagram_msg",   label: "Instagram messaging",           perm: "instagram_manage_messages",     required: false, unlocks: "Instagram DM inbox" },
    { key: "has_leads_retrieval", label: "Lead Ads retrieval",            perm: "leads_retrieval",               required: false, unlocks: "Lead form → Contact sync" },
  ];

  return (
    <Section
      icon={<BadgeCheck className="w-4 h-4" />}
      title="Token permissions"
      accent="indigo"
      right={
        <p className="text-[10px] uppercase tracking-wider font-extrabold text-foreground/55">
          {data ? `${data.permissions.filter((p) => p.status === "granted").length} granted` : ""}
        </p>
      }
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin mx-auto" />}
      {error && (
        <p className="text-[12px] text-[#D4308E] font-semibold">
          Couldn't probe permissions — {(error as Error).message}
        </p>
      )}
      {data && (
        <div className="space-y-1.5">
          {FEATURES.map((f) => {
            const granted = data.summary[f.key];
            return (
              <div
                key={f.key}
                className={cn(
                  "grid grid-cols-[24px_1fr_140px_auto] gap-2 items-center px-3 py-2 rounded-lg border",
                  granted ? "bg-[#E6F7EE] border-[#0E8A4B]/30" : "bg-[#FFF1D6]/40 border-[#E8B968]/50",
                )}
              >
                {granted
                  ? <Check className="w-4 h-4 text-[#0E8A4B]" strokeWidth={3} />
                  : <X className="w-4 h-4 text-[#B8651A]" strokeWidth={3} />}
                <div className="min-w-0">
                  <p className="text-[12px] font-extrabold truncate">{f.label}</p>
                  <p className="text-[10px] font-mono text-foreground/55 truncate">{f.perm}</p>
                </div>
                <span className="text-[10px] text-foreground/60 truncate">
                  {f.unlocks && (granted
                    ? <span className="text-[#0E8A4B] font-semibold">✓ {f.unlocks}</span>
                    : <span>Needs review for {f.unlocks}</span>)}
                </span>
                {!granted && !f.required && (
                  <a
                    href="https://developers.facebook.com/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-extrabold uppercase tracking-wider text-[#3C50E0] hover:underline inline-flex items-center gap-1"
                  >
                    Submit review <ArrowUpRight className="w-3 h-3" />
                  </a>
                )}
              </div>
            );
          })}

          <details className="mt-3">
            <summary className="text-[10px] uppercase tracking-wider font-extrabold text-foreground/55 cursor-pointer hover:text-foreground">
              All {data.permissions.length} permissions (raw)
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] font-mono">
              {data.permissions.map((p) => (
                <span
                  key={p.permission}
                  className={cn("px-2 py-0.5 rounded", p.status === "granted" ? "bg-[#E6F7EE] text-[#0A6E3C]" : "bg-[#FCE5F0] text-[#A11A6A]")}
                >
                  {p.permission} · {p.status}
                </span>
              ))}
            </div>
          </details>
        </div>
      )}
    </Section>
  );
};

const CapiPanel = ({ settings, events }: {
  settings: { pixel_id: string | null; capi_enabled: boolean; capi_test_event_code: string | null } | undefined;
  events: Array<{ id: string; event_name: string; source_type: string | null; response_code: number | null; fired_at: string; value_inr: string | null }>;
}) => {
  const qc = useQueryClient();
  const [pixelId, setPixelId] = useState("");
  const [testCode, setTestCode] = useState("");
  const [dirty, setDirty] = useState(false);

  // Hydrate form once when settings load
  useState(() => {
    if (settings) {
      setPixelId(settings.pixel_id ?? "");
      setTestCode(settings.capi_test_event_code ?? "");
    }
    return undefined;
  });
  if (settings && !dirty && !pixelId && settings.pixel_id) {
    // Lazy hydration on first render after data lands
    setPixelId(settings.pixel_id);
    setTestCode(settings.capi_test_event_code ?? "");
  }

  const save = useMutation({
    mutationFn: () => api.metaCapiPatchSettings({
      pixel_id: pixelId.trim() || null,
      capi_test_event_code: testCode.trim() || null,
    }) as Promise<unknown>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meta-capi-settings"] });
      toast.success("CAPI settings saved");
      setDirty(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const toggleEnabled = useMutation({
    mutationFn: (next: boolean) => api.metaCapiPatchSettings({ capi_enabled: next }) as Promise<unknown>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meta-capi-settings"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const testFire = useMutation({
    mutationFn: () => api.metaCapiTestFire(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meta-capi-events"] });
      toast.success("Test event sent — check Meta Events Manager → Test Events tab");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  return (
    <Section
      icon={<Target className="w-4 h-4" />}
      title="Conversions API"
      accent="orange"
      right={
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-foreground/55">
            {settings?.capi_enabled ? "Enabled" : "Disabled"}
          </span>
          <Switch
            checked={!!settings?.capi_enabled}
            onCheckedChange={(v) => toggleEnabled.mutate(v)}
          />
        </div>
      }
    >
      <p className="text-[11px] text-foreground/65 mb-3">
        Server-side conversion events sent to Meta when a deal hits <span className="font-bold">won</span> or a new contact arrives from an ad. Lets Meta optimize Click-to-WhatsApp bids on actual revenue, not just message volume.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider font-extrabold">Pixel / Dataset ID</Label>
          <Input
            value={pixelId}
            placeholder="e.g. 123456789012345"
            onChange={(e) => { setPixelId(e.target.value); setDirty(true); }}
            className="font-mono text-[12px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider font-extrabold">Test Event Code (optional)</Label>
          <Input
            value={testCode}
            placeholder="TEST12345"
            onChange={(e) => { setTestCode(e.target.value); setDirty(true); }}
            className="font-mono text-[12px]"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <Button
          onClick={() => save.mutate()}
          disabled={save.isPending || !dirty}
          className="bg-[#FF6A1F] text-white shadow-[0_3px_0_0_#B8420A] hover:bg-[#E85C12]"
        >
          {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Save settings
        </Button>
        <Button
          variant="outline"
          onClick={() => testFire.mutate()}
          disabled={testFire.isPending || !settings?.pixel_id}
        >
          {testFire.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Fire test event
        </Button>
      </div>

      {/* Event log */}
      <div className="mt-4">
        <p className="text-[10px] uppercase tracking-wider font-extrabold text-foreground/55 mb-2">
          Recent events ({events.length})
        </p>
        {events.length === 0 ? (
          <p className="text-[11px] text-foreground/50 italic">No events fired yet.</p>
        ) : (
          <div className="space-y-1">
            {events.slice(0, 10).map((e) => {
              const ok = (e.response_code ?? 0) >= 200 && (e.response_code ?? 0) < 300;
              return (
                <div key={e.id} className="grid grid-cols-[80px_1fr_120px_60px_120px] gap-2 text-[11px] items-center px-2 py-1 rounded bg-[#FFF6E8]/40">
                  <span className={cn("font-extrabold", ok ? "text-[#0E8A4B]" : "text-[#D4308E]")}>{e.event_name}</span>
                  <span className="text-foreground/60 truncate font-mono">{e.source_type ?? "—"}</span>
                  <span className="font-mono tabular-nums">{e.value_inr ? `₹${e.value_inr}` : "—"}</span>
                  <span className={cn("font-mono", ok ? "text-[#0E8A4B]" : "text-[#D4308E]")}>{e.response_code ?? "—"}</span>
                  <span className="text-foreground/55 text-right">{fmtDate(e.fired_at)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Section>
  );
};

// ── Layout primitives ──────────────────────────────────────────────────────

const Section = ({ icon, title, accent, right, children }: {
  icon: React.ReactNode;
  title: string;
  accent: "indigo" | "emerald" | "orange" | "magenta";
  right?: React.ReactNode;
  children: React.ReactNode;
}) => {
  const accents: Record<typeof accent, { border: string; shadow: string; bg: string; iconBg: string }> = {
    indigo:  { border: "border-[#3C50E0]", shadow: "shadow-[0_4px_0_0_#2533A8]", bg: "bg-[#E4E8FF]", iconBg: "bg-[#3C50E0]" },
    emerald: { border: "border-[#0E8A4B]", shadow: "shadow-[0_4px_0_0_#0A6E3C]", bg: "bg-[#E6F7EE]", iconBg: "bg-[#0E8A4B]" },
    orange:  { border: "border-[#FF6A1F]", shadow: "shadow-[0_4px_0_0_#B8420A]", bg: "bg-[#FFEFE0]", iconBg: "bg-[#FF6A1F]" },
    magenta: { border: "border-[#D4308E]", shadow: "shadow-[0_4px_0_0_#A11A6A]", bg: "bg-[#FCE5F0]", iconBg: "bg-[#D4308E]" },
  };
  const a = accents[accent];
  return (
    <div className={cn("bg-white border-2 rounded-2xl overflow-hidden", a.border, a.shadow)}>
      <div className={cn("flex items-center gap-2.5 px-4 py-3 border-b-2 flex-wrap", a.border, a.bg)}>
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-sm", a.iconBg)}>
          {icon}
        </div>
        <p className="text-[13px] font-black flex-1 min-w-0">{title}</p>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
};

const TierStat = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-[#FFF6E8] border border-[#E8B968]/60 rounded-xl p-3">
    <p className="text-[10px] uppercase tracking-wider text-foreground/60 font-extrabold">{label}</p>
    <p className="text-[14px] font-black mt-0.5 break-all">{value}</p>
  </div>
);

const dailyCapFor = (tier: string | null): string => {
  if (!tier) return "—";
  switch (tier) {
    case "TIER_NOT_SET":   return "—";
    case "TIER_50":         return "50";
    case "TIER_250":        return "250";
    case "TIER_1K":         return "1,000";
    case "TIER_10K":        return "10,000";
    case "TIER_100K":       return "100,000";
    case "TIER_UNLIMITED":
    case "UNLIMITED":       return "Unlimited";
    default:                return tier;
  }
};

export default AdminMetaApi;
