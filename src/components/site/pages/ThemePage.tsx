/**
 * Theme editor — pick primary/accent colors + font.
 *
 * Choices are saved into site.theme JSONB and applied by the public renderer
 * on next render. Color palettes are pre-curated for India-friendly looks
 * (saffron, emerald, jewel-tones) rather than a full color picker — picking
 * raw hex usually gives non-designers ugly results.
 */

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Palette, Loader2, Save, Check, ExternalLink } from "lucide-react";
import { api, type SiteDto } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Palette = { id: string; name: string; primary: string; accent: string; tag?: string };

const PALETTES: Palette[] = [
  { id: "emerald-saffron", name: "Emerald + Saffron", primary: "#0E8A4B", accent: "#FFD23F", tag: "Default" },
  { id: "rose-gold",       name: "Rose + Gold",       primary: "#D4308E", accent: "#FFD23F" },
  { id: "indigo-amber",    name: "Indigo + Amber",    primary: "#3C50E0", accent: "#FF6A1F" },
  { id: "deep-teal",       name: "Deep Teal",         primary: "#0A4D5C", accent: "#FFB627" },
  { id: "maroon-cream",    name: "Maroon + Cream",    primary: "#7A1052", accent: "#FFE8B8" },
  { id: "midnight",        name: "Midnight",          primary: "#0A3D24", accent: "#16C172" },
  { id: "sunset",          name: "Sunset Orange",     primary: "#FF6A1F", accent: "#3C50E0" },
  { id: "royal-blue",      name: "Royal Blue",        primary: "#1E3A8A", accent: "#FFD23F" },
];

const FONTS = ["Inter", "Manrope", "Plus Jakarta Sans", "Poppins", "Lora", "DM Sans", "Outfit"];

export const ThemePage = () => {
  const qc = useQueryClient();
  const { data: site, isLoading } = useQuery({
    queryKey: ["site-me"],
    queryFn: () => api.getSite(),
    staleTime: 30_000,
  });

  const [theme, setTheme] = useState<{ primary: string; accent: string; font: string }>({
    primary: "#0E8A4B", accent: "#FFD23F", font: "Inter",
  });

  useEffect(() => {
    if (site) {
      const t = (site.theme || {}) as Record<string, string>;
      setTheme({
        primary: t.primary || "#0E8A4B",
        accent: t.accent || "#FFD23F",
        font: t.font || "Inter",
      });
    }
  }, [site]);

  const dirty = site && (
    theme.primary !== (site.theme?.primary || "#0E8A4B") ||
    theme.accent !== (site.theme?.accent || "#FFD23F") ||
    theme.font !== (site.theme?.font || "Inter")
  );

  const saveMut = useMutation({
    mutationFn: () => api.updateSite({ theme }),
    onSuccess: (s) => {
      qc.setQueryData(["site-me"], s);
      toast.success("Theme saved — refresh your public site to see it");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !site) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#FFF6E8]">
        <Loader2 className="w-6 h-6 animate-spin text-foreground/40" />
      </div>
    );
  }

  const publicUrl = `${window.location.origin}/biz/${site.slug}`;

  return (
    <div className="flex-1 overflow-y-auto bg-[#FFF6E8]">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0 bg-[#D4308E]">
            <Palette className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-black leading-tight">Theme</h1>
            <p className="text-[14px] text-foreground/70 font-medium mt-1">Brand colors and font — applied to your whole site.</p>
          </div>
          <button
            onClick={() => saveMut.mutate()}
            disabled={!dirty || saveMut.isPending}
            className="hidden sm:inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0E8A4B] text-white font-extrabold text-[13px] shadow-[0_4px_0_0_#073D22] hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_2px_0_0_#073D22] transition flex-shrink-0 disabled:opacity-50 disabled:hover:bg-[#0E8A4B]"
          >
            {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" strokeWidth={2.5} />}
            {dirty ? "Save changes" : "Saved"}
          </button>
        </div>

        {/* Palettes */}
        <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.15em] text-foreground/55 mb-4">Color palette</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {PALETTES.map((p) => {
              const selected = theme.primary === p.primary && theme.accent === p.accent;
              return (
                <button
                  key={p.id}
                  onClick={() => setTheme({ ...theme, primary: p.primary, accent: p.accent })}
                  className={cn(
                    "p-3 rounded-xl border-2 transition text-left",
                    selected ? "border-[#0E8A4B] shadow-[0_3px_0_0_#0A6E3C]" : "border-[#E8B968]/60 hover:border-[#E8B968]"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-md shadow-sm" style={{ background: p.primary }} />
                    <span className="w-7 h-7 rounded-md shadow-sm" style={{ background: p.accent }} />
                    {selected && <Check className="w-4 h-4 text-[#0E8A4B] ml-auto" strokeWidth={3} />}
                  </div>
                  <p className="text-[12px] font-extrabold truncate">{p.name}</p>
                  {p.tag && <p className="text-[9px] font-extrabold uppercase tracking-wider text-foreground/50 mt-0.5">{p.tag}</p>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Font */}
        <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.15em] text-foreground/55 mb-4">Font</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {FONTS.map((f) => (
              <button
                key={f}
                onClick={() => setTheme({ ...theme, font: f })}
                className={cn(
                  "px-3 py-3 rounded-xl border-2 transition text-left",
                  theme.font === f ? "border-[#0E8A4B] shadow-[0_3px_0_0_#0A6E3C] bg-[#E6F7EE]" : "border-[#E8B968]/60 hover:border-[#E8B968]"
                )}
                style={{ fontFamily: `'${f}', system-ui, sans-serif` }}
              >
                <p className="text-[15px] font-bold">{f}</p>
                <p className="text-[10px] text-foreground/55 mt-0.5">Aa Bb Cc 0123</p>
              </button>
            ))}
          </div>
        </div>

        {/* Live preview swatch */}
        <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.15em] text-foreground/55 mb-4">Preview</h2>
          <div className="rounded-xl overflow-hidden border-2" style={{ borderColor: `${theme.primary}33` }}>
            <div className="p-6 text-center" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${adjust(theme.primary, -15)})`, fontFamily: `'${theme.font}', system-ui, sans-serif` }}>
              <p className="text-white font-extrabold text-[10px] uppercase tracking-wider mb-2 opacity-80">Your business</p>
              <h3 className="text-white font-black text-[24px] leading-tight">{site.copy?.business_name || "My Shop"}</h3>
              <p className="text-white/85 text-[13px] mt-2 font-medium">{site.copy?.tagline || "Local quality, delivered with care."}</p>
              <div className="mt-4 flex justify-center gap-2">
                <button className="px-4 py-2 rounded-lg font-extrabold text-[12px]" style={{ background: theme.accent, color: "#3D1A00" }}>Order on WhatsApp</button>
                <button className="px-4 py-2 rounded-lg font-extrabold text-[12px] bg-white" style={{ color: theme.primary }}>Pay via UPI</button>
              </div>
            </div>
          </div>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-[#0E8A4B] font-extrabold hover:text-[#0A6E3C]"
          >
            <ExternalLink className="w-3 h-3" /> Open live site (refresh after save)
          </a>
        </div>

        {/* Mobile save bar */}
        <div className="sm:hidden">
          <button
            onClick={() => saveMut.mutate()}
            disabled={!dirty || saveMut.isPending}
            className="w-full h-12 rounded-xl bg-[#0E8A4B] text-white font-extrabold text-[14px] shadow-[0_4px_0_0_#073D22] inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" strokeWidth={2.5} />}
            {dirty ? "Save theme" : "Saved"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Darken a hex color by N% — used for the preview gradient. -15 = ~15% darker.
function adjust(hex: string, pct: number): string {
  const m = /^#?([a-f0-9]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  let r = (n >> 16) & 0xff;
  let g = (n >> 8) & 0xff;
  let b = n & 0xff;
  const f = (1 + pct / 100);
  r = Math.max(0, Math.min(255, Math.round(r * f)));
  g = Math.max(0, Math.min(255, Math.round(g * f)));
  b = Math.max(0, Math.min(255, Math.round(b * f)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
