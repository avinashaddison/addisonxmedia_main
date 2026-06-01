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
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3.5 border-b border-slate-200/80 pb-5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex items-center justify-center shadow-sm">
          <ShieldCheck className="w-5.5 h-5.5 text-indigo-400" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[24px] font-black tracking-tight text-slate-900">Meta API</h1>
          <p className="text-[12px] text-slate-500 font-medium">
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
          <Button variant="outline" onClick={() => refreshTier.mutate()} disabled={refreshTier.isPending} className="border-slate-250 active:scale-[0.98] transition">
            {refreshTier.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
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
          <p className="text-[12px] text-slate-400 italic">
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
        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-450">
          {data ? `${data.permissions.filter((p) => p.status === "granted").length} granted` : ""}
        </p>
      }
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin mx-auto text-indigo-650" />}
      {error && (
        <p className="text-[12px] text-rose-600 font-bold">
          Couldn't probe permissions — {(error as Error).message}
        </p>
      )}
      {data && (
        <div className="space-y-2">
          {FEATURES.map((f) => {
            const granted = data.summary[f.key];
            return (
              <div
                key={f.key}
                className={cn(
                  "grid grid-cols-[24px_1fr_140px_auto] gap-2 items-center px-4 py-2 rounded-xl border",
                  granted ? "bg-emerald-50 border-emerald-150 text-emerald-800" : "bg-amber-50 border-amber-150 text-amber-800",
                )}
              >
                {granted
                  ? <Check className="w-4 h-4 text-emerald-600" strokeWidth={3} />
                  : <X className="w-4 h-4 text-amber-600" strokeWidth={3} />}
                <div className="min-w-0">
                  <p className="text-[12px] font-bold truncate">{f.label}</p>
                  <p className="text-[10px] font-mono opacity-60 truncate">{f.perm}</p>
                </div>
                <span className="text-[10px] opacity-70 truncate">
                  {f.unlocks && (granted
                    ? <span className="text-emerald-700 font-bold">✓ {f.unlocks}</span>
                    : <span>Needs review for {f.unlocks}</span>)}
                </span>
                {!granted && !f.required && (
                  <a
                    href="https://developers.facebook.com/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:underline inline-flex items-center gap-1"
                  >
                    Submit review <ArrowUpRight className="w-3 h-3" />
                  </a>
                )}
              </div>
            );
          })}

          <details className="mt-3">
            <summary className="text-[10px] uppercase tracking-wider font-bold text-slate-400 cursor-pointer hover:text-slate-655 transition">
              All {data.permissions.length} permissions (raw)
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] font-mono">
              {data.permissions.map((p) => (
                <span
                  key={p.permission}
                  className={cn("px-2.5 py-1 rounded-lg border", p.status === "granted" ? "bg-emerald-50 text-emerald-700 border-emerald-150" : "bg-rose-50 text-rose-700 border-rose-150")}
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
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mr-1">
            {settings?.capi_enabled ? "Enabled" : "Disabled"}
          </span>
          <Switch
            checked={!!settings?.capi_enabled}
            onCheckedChange={(v) => toggleEnabled.mutate(v)}
          />
        </div>
      }
    >
      <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
        Server-side conversion events sent to Meta when a deal hits <span className="font-bold text-slate-700">won</span> or a new contact arrives from an ad. Lets Meta optimize Click-to-WhatsApp bids on actual revenue, not just message volume.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Pixel / Dataset ID</Label>
          <Input
            value={pixelId}
            placeholder="e.g. 123456789012345"
            onChange={(e) => { setPixelId(e.target.value); setDirty(true); }}
            className="font-mono text-[12px] border-slate-200 focus-visible:ring-indigo-600"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Test Event Code (optional)</Label>
          <Input
            value={testCode}
            placeholder="TEST12345"
            onChange={(e) => { setTestCode(e.target.value); setDirty(true); }}
            className="font-mono text-[12px] border-slate-200 focus-visible:ring-indigo-600"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <Button
          onClick={() => save.mutate()}
          disabled={save.isPending || !dirty}
          className="bg-slate-900 text-white hover:bg-slate-800 transition active:scale-[0.98]"
        >
          {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
          Save settings
        </Button>
        <Button
          variant="outline"
          onClick={() => testFire.mutate()}
          disabled={testFire.isPending || !settings?.pixel_id}
          className="border-slate-250 text-slate-650 hover:bg-slate-50 transition active:scale-[0.98]"
        >
          {testFire.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
          Fire test event
        </Button>
      </div>

      {/* Event log */}
      <div className="mt-5 space-y-2.5">
        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
          Recent events ({events.length})
        </p>
        {events.length === 0 ? (
          <p className="text-[11px] text-slate-400 italic">No events fired yet.</p>
        ) : (
          <div className="space-y-1.5">
            {events.slice(0, 10).map((e) => {
              const ok = (e.response_code ?? 0) >= 200 && (e.response_code ?? 0) < 300;
              return (
                <div key={e.id} className="grid grid-cols-[80px_1fr_120px_60px_120px] gap-2 text-[11px] items-center px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition">
                  <span className={cn("font-bold", ok ? "text-emerald-600" : "text-rose-600")}>{e.event_name}</span>
                  <span className="text-slate-450 truncate font-mono">{e.source_type ?? "—"}</span>
                  <span className="font-mono tabular-nums text-slate-600">{e.value_inr ? `₹${e.value_inr}` : "—"}</span>
                  <span className={cn("font-mono font-semibold", ok ? "text-emerald-600" : "text-rose-600")}>{e.response_code ?? "—"}</span>
                  <span className="text-slate-400 text-right">{fmtDate(e.fired_at)}</span>
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
  const accents: Record<typeof accent, { iconClass: string }> = {
    indigo:  { iconClass: "bg-indigo-50 border-indigo-100 text-indigo-650" },
    emerald: { iconClass: "bg-emerald-50 border-emerald-100 text-emerald-650" },
    orange:  { iconClass: "bg-orange-50 border-orange-100 text-orange-655" },
    magenta: { iconClass: "bg-pink-50 border-pink-100 text-pink-650" },
  };
  const a = accents[accent];
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:border-slate-350 transition-colors">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex-wrap">
        <div className={cn("w-7.5 h-7.5 rounded-lg flex items-center justify-center border shadow-sm", a.iconClass)}>
          {icon}
        </div>
        <p className="text-[13px] font-bold text-slate-800 flex-1 min-w-0">{title}</p>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
};

const TierStat = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-sm hover:border-slate-300 transition-colors">
    <p className="text-[10px] uppercase tracking-wider text-slate-405 font-bold">{label}</p>
    <p className="text-[14px] font-black text-slate-800 mt-0.5 break-all">{value}</p>
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
