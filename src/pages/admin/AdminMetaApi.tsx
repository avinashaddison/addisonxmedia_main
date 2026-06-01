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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";

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
    <PageShell
      title="Meta API Status"
      subtitle="Permissions · Messaging tier · Conversions API · Catalog sync diagnostics"
      icon={<ShieldCheck className="w-5 h-5 text-white" strokeWidth={2.5} />}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Permissions Panel */}
        <PermissionsPanel data={perms.data} loading={perms.isLoading} error={perms.error} />

        {/* Messaging tier panel */}
        <Section
          icon={<Zap className="w-4.5 h-4.5" />}
          title="Messaging Tier"
          accent="emerald"
          right={
            <button
              onClick={() => refreshTier.mutate()}
              disabled={refreshTier.isPending}
              className="px-3.5 py-1.5 rounded-xl text-[11px] font-extrabold bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] text-slate-705 hover:bg-[#FFF1D6] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] transition-all flex items-center gap-1"
            >
              {refreshTier.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Refresh from Meta
            </button>
          }
        >
          {tier.data?.messaging_limit_tier ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <TierStat label="Tier" value={tier.data.messaging_limit_tier.replace("TIER_", "")} />
              <TierStat label="Quality Rating" value={tier.data.quality_rating ?? "—"} />
              <TierStat label="Refreshed At" value={fmtDate(tier.data.tier_refreshed_at)} />
              <TierStat label="Daily Cap" value={dailyCapFor(tier.data.messaging_limit_tier)} />
            </div>
          ) : (
            <p className="text-[12px] text-slate-400 italic">
              Tier not yet probed. Click "Refresh from Meta" to query the WABA's current messaging tier.
            </p>
          )}
        </Section>

        {/* Conversions API panel */}
        <CapiPanel settings={capi.data} events={capiEvents.data ?? []} />
      </div>
    </PageShell>
  );
};

const PermissionsPanel = ({ data, loading, error }: {
  data?: { permissions: Array<{ permission: string; status: string }>; summary: Record<string, boolean> };
  loading: boolean;
  error: unknown;
}) => {
  const FEATURES = [
    { key: "has_waba_management", label: "WhatsApp Business Management", perm: "whatsapp_business_management", required: true },
    { key: "has_waba_messaging",  label: "WhatsApp Messaging Scopes",       perm: "whatsapp_business_messaging",  required: true },
    { key: "has_ads_management",  label: "Ads & Conversions API Sync",       perm: "ads_management",                required: false, unlocks: "CAPI + in-app ads" },
    { key: "has_catalog",         label: "WhatsApp Catalog Sync",           perm: "catalog_management",            required: false, unlocks: "WhatsApp Catalog" },
    { key: "has_instagram_msg",   label: "Instagram DM Messaging",           perm: "instagram_manage_messages",     required: false, unlocks: "Instagram DM inbox" },
    { key: "has_leads_retrieval", label: "Lead Ads Data Retrieval",         perm: "leads_retrieval",               required: false, unlocks: "Lead form → Contact sync" },
  ];

  return (
    <Section
      icon={<BadgeCheck className="w-4.5 h-4.5" />}
      title="Token Permissions Probe"
      accent="indigo"
      right={
        <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#B8651A] bg-[#FFF6E8] border-2 border-[#E8B968] rounded-xl px-2.5 py-0.5 shadow-[0_1.5px_0_0_#E8B968]">
          {data ? `${data.permissions.filter((p) => p.status === "granted").length} Granted` : ""}
        </span>
      }
    >
      {loading && <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0E8A4B]" />}
      {error && (
        <p className="text-[12px] text-rose-600 font-bold">
          Couldn't probe permissions — {(error as Error).message}
        </p>
      )}
      {data && (
        <div className="space-y-3">
          {FEATURES.map((f) => {
            const granted = data.summary[f.key];
            return (
              <div
                key={f.key}
                className={cn(
                  "grid grid-cols-[24px_1fr_140px_auto] gap-2 items-center px-4 py-3 rounded-xl border-2 shadow-[0_2px_0_0_#cbd5e1] transition-all",
                  granted
                    ? "bg-[#E6F7EE] border-[#0E8A4B]/60 text-[#0A6E3C]"
                    : "bg-[#FFF1D6] border-[#E8B968]/60 text-[#B8651A]"
                )}
              >
                {granted
                  ? <Check className="w-4 h-4 text-[#0E8A4B]" strokeWidth={3} />
                  : <X className="w-4 h-4 text-[#B8651A]" strokeWidth={3} />}
                <div className="min-w-0">
                  <p className="text-[12.5px] font-black truncate">{f.label}</p>
                  <p className="text-[10px] font-mono opacity-70 truncate font-semibold">{f.perm}</p>
                </div>
                <span className="text-[10px] opacity-90 truncate font-bold">
                  {f.unlocks && (granted
                    ? <span className="text-[#0E8A4B]">✓ {f.unlocks}</span>
                    : <span>Needs review for {f.unlocks}</span>)}
                </span>
                {!granted && !f.required && (
                  <a
                    href="https://developers.facebook.com/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-extrabold uppercase tracking-wider text-[#3C50E0] hover:underline inline-flex items-center gap-1 ml-auto"
                  >
                    Submit review <ArrowUpRight className="w-3 h-3" />
                  </a>
                )}
              </div>
            );
          })}

          <details className="mt-4 group">
            <summary className="text-[10px] uppercase tracking-wider font-black text-slate-450 cursor-pointer hover:text-slate-655 transition select-none flex items-center gap-1">
              <span>All {data.permissions.length} permissions (raw logs)</span>
            </summary>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
              {data.permissions.map((p) => (
                <span
                  key={p.permission}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border-2 shadow-[0_1.5px_0_0_#cbd5e1] font-bold flex items-center justify-between",
                    p.status === "granted"
                      ? "bg-[#E6F7EE] text-[#0A6E3C] border-[#0E8A4B]/40"
                      : "bg-rose-50 text-rose-700 border-rose-350"
                  )}
                >
                  <span className="truncate">{p.permission}</span>
                  <span className="uppercase text-[9px] font-extrabold tracking-wider">{p.status}</span>
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
      icon={<Target className="w-4.5 h-4.5" />}
      title="Conversions API (CAPI)"
      accent="orange"
      right={
        <div className="flex items-center gap-3">
          <span className={cn("text-[10px] uppercase tracking-wider font-extrabold", settings?.capi_enabled ? "text-[#0E8A4B]" : "text-slate-400")}>
            {settings?.capi_enabled ? "Enabled" : "Disabled"}
          </span>
          <Switch
            checked={!!settings?.capi_enabled}
            onCheckedChange={(v) => toggleEnabled.mutate(v)}
          />
        </div>
      }
    >
      <p className="text-[12px] text-slate-500 mb-5 leading-relaxed font-semibold">
        Server-side conversion events sent to Meta when a deal hits <span className="font-extrabold text-[#B8651A]">won</span> or a new contact arrives from an ad. Lets Meta optimize Click-to-WhatsApp bids on actual revenue, not just message volume.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-extrabold uppercase tracking-wider text-[#B8651A] mb-1 block">Pixel / Dataset ID</Label>
          <Input
            value={pixelId}
            placeholder="e.g. 123456789012345"
            onChange={(e) => { setPixelId(e.target.value); setDirty(true); }}
            className="font-mono text-[13px] h-10 border-2 border-[#E8B968] focus:border-[#0E8A4B] rounded-xl bg-white text-slate-800 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-extrabold uppercase tracking-wider text-[#B8651A] mb-1 block">Test Event Code (optional)</Label>
          <Input
            value={testCode}
            placeholder="TEST12345"
            onChange={(e) => { setTestCode(e.target.value); setDirty(true); }}
            className="font-mono text-[13px] h-10 border-2 border-[#E8B968] focus:border-[#0E8A4B] rounded-xl bg-white text-slate-800 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending || !dirty}
          className="px-4 py-2 rounded-xl text-[12px] font-extrabold bg-[#0E8A4B] border-2 border-[#0A6E3C] shadow-[0_2px_0_0_#073D22] text-white hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_1px_0_0_#073D22] disabled:opacity-50 transition-all flex items-center gap-1.5"
        >
          {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Save Settings
        </button>
        <button
          onClick={() => testFire.mutate()}
          disabled={testFire.isPending || !settings?.pixel_id}
          className="px-4 py-2 rounded-xl text-[12px] font-extrabold bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] text-slate-700 hover:bg-[#FFF1D6] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] disabled:opacity-50 transition-all flex items-center gap-1.5"
        >
          {testFire.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Fire Test Event
        </button>
      </div>

      {/* Event log */}
      <div className="mt-6 space-y-3">
        <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#B8651A]">
          Recent Conversions Log ({events.length})
        </p>
        {events.length === 0 ? (
          <p className="text-[11px] text-slate-400 italic">No events fired yet.</p>
        ) : (
          <div className="space-y-2">
            {events.slice(0, 10).map((e) => {
              const ok = (e.response_code ?? 0) >= 200 && (e.response_code ?? 0) < 300;
              return (
                <div key={e.id} className="grid grid-cols-[80px_1fr_120px_60px_120px] gap-2 text-[11px] items-center px-4 py-2 rounded-xl bg-white border border-dashed border-[#E8B968] hover:bg-[#FFF6E8]/30 transition">
                  <span className={cn("font-black uppercase tracking-wider text-[10px]", ok ? "text-[#0E8A4B]" : "text-rose-600")}>{e.event_name}</span>
                  <span className="text-slate-450 truncate font-mono font-semibold">{e.source_type ?? "—"}</span>
                  <span className="font-mono tabular-nums text-slate-600 font-bold">{e.value_inr ? `₹${e.value_inr}` : "—"}</span>
                  <span className={cn("font-mono font-extrabold text-[12px]", ok ? "text-[#0E8A4B]" : "text-rose-600")}>{e.response_code ?? "—"}</span>
                  <span className="text-slate-400 text-right font-semibold">{fmtDate(e.fired_at)}</span>
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
    indigo:  { iconClass: "bg-[#E6F0FA] border-[#3C50E0] text-[#2533A8]" },
    emerald: { iconClass: "bg-[#E6F7EE] border-[#0E8A4B] text-[#0A6E3C]" },
    orange:  { iconClass: "bg-[#FFF1D6] border-[#FF6A1F] text-[#B8420A]" },
    magenta: { iconClass: "bg-[#FDF0F5] border-[#D4308E] text-[#A11A6A]" },
  };
  const a = accents[accent];
  return (
    <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_4px_0_0_#E8B968]">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b-2 border-[#E8B968] bg-[#FFF6E8] flex-wrap">
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center border-2 border-slate-900 shadow-[0_1.5px_0_0_#000]", a.iconClass)}>
          {icon}
        </div>
        <p className="text-[13px] font-black text-slate-800 flex-1 min-w-0 uppercase tracking-wider">{title}</p>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
};

const TierStat = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-white border-2 border-[#E8B968] rounded-xl p-3 shadow-[0_2px_0_0_#E8B968] hover:-translate-y-0.5 transition-all">
    <p className="text-[10px] uppercase tracking-wider text-[#B8651A] font-extrabold">{label}</p>
    <p className="text-[14px] font-black text-slate-850 mt-0.5 break-all leading-tight">{value}</p>
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

export default AdminMetaApi;T_SET":   return "—";
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
