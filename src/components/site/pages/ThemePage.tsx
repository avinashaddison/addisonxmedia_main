import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Palette, Loader2, Save, Check, ExternalLink } from "lucide-react";
import { api, type SiteDto } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";



const PALETTES: Array<{ id: string; name: string; primary: string; accent: string; tag?: string }> = [
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

  // Queries
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

  const styleDirty = site && (
    theme.primary !== (site.theme?.primary || "#0E8A4B") ||
    theme.accent !== (site.theme?.accent || "#FFD23F") ||
    theme.font !== (site.theme?.font || "Inter")
  );

  // Mutations
  const saveStyleMut = useMutation({
    mutationFn: () => api.updateSite({ theme }),
    onSuccess: (s) => {
      qc.setQueryData(["site-me"], s);
      toast.success("Theme styling updated successfully!");
    },
    onError: (e: Error) => toast.error(e.message),
  });



  if (isLoading || !site) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#FFF6E8]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0E8A4B]" />
      </div>
    );
  }

  const publicUrl = `${window.location.origin}/biz/${site.slug}`;

  return (
    <div className="flex-1 overflow-y-auto bg-[#FFF6E8] pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Header strip */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white bg-[#D4308E] shadow-lg flex-shrink-0">
              <Palette className="w-7 h-7" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-[24px] font-black leading-tight">Theme Studio</h1>
              <p className="text-[14px] text-foreground/70 font-medium mt-1">
                Choose prebuilt template layouts, brand colors, and typography instantly.
              </p>
            </div>
          </div>
          {styleDirty && (
            <button
              onClick={() => saveStyleMut.mutate()}
              disabled={saveStyleMut.isPending}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0E8A4B] text-white font-extrabold text-[13px] shadow-[0_4px_0_0_#073D22] hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_2px_0_0_#073D22] transition flex-shrink-0 disabled:opacity-50"
            >
              {saveStyleMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Palette
            </button>
          )}
        </div>



        {/* Double Column: Stylist Palettes and Live Swatch */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
          
          {/* Palettes & Typography */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Color Palette Grid */}
            <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5 space-y-4">
              <h3 className="text-[13.5px] font-black uppercase tracking-wider text-foreground/75">1. Brand Color Palette</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PALETTES.map((p) => {
                  const selected = theme.primary === p.primary && theme.accent === p.accent;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setTheme({ ...theme, primary: p.primary, accent: p.accent })}
                      className={cn(
                        "p-3 rounded-xl border-2 transition text-left relative",
                        selected ? "border-[#0E8A4B] bg-[#E6F7EE]/30 shadow-[0_2px_0_0_#0A6E3C]" : "border-[#E8B968]/60 hover:border-[#E8B968]"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-md shadow-sm border border-foreground/5 block" style={{ background: p.primary }} />
                        <span className="w-6 h-6 rounded-md shadow-sm border border-foreground/5 block" style={{ background: p.accent }} />
                        {selected && <Check className="w-3.5 h-3.5 text-[#0E8A4B] ml-auto" strokeWidth={3} />}
                      </div>
                      <span className="text-[11.5px] font-extrabold truncate block">{p.name}</span>
                      {p.tag && <span className="text-[8px] font-extrabold uppercase text-foreground/40 mt-0.5 block">{p.tag}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Typography selection */}
            <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5 space-y-4">
              <h3 className="text-[13.5px] font-black uppercase tracking-wider text-foreground/75">2. Typography / Fonts</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FONTS.map((f) => {
                  const selected = theme.font === f;
                  return (
                    <button
                      key={f}
                      onClick={() => setTheme({ ...theme, font: f })}
                      className={cn(
                        "px-3 py-2.5 rounded-xl border-2 transition text-left",
                        selected ? "border-[#0E8A4B] bg-[#E6F7EE] shadow-[0_2px_0_0_#0A6E3C]" : "border-[#E8B968]/60 hover:border-[#E8B968]"
                      )}
                      style={{ fontFamily: `'${f}', system-ui, sans-serif` }}
                    >
                      <span className="text-[14px] font-bold block">{f}</span>
                      <span className="text-[9px] text-foreground/50 block mt-0.5">Aa Bb Cc 123</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Visual Swatch Preview Box */}
          <div className="lg:col-span-4 bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5 flex flex-col justify-between h-fit">
            <div className="space-y-4">
              <h3 className="text-[13.5px] font-black uppercase tracking-wider text-foreground/75">Theme Preview</h3>
              <div className="rounded-xl overflow-hidden border border-foreground/5 shadow-inner">
                <div 
                  className="p-5 text-center space-y-3" 
                  style={{ 
                    background: `linear-gradient(135deg, ${theme.primary}, ${adjust(theme.primary, -15)})`, 
                    fontFamily: `'${theme.font}', system-ui, sans-serif` 
                  }}
                >
                  <span className="text-white font-extrabold text-[9px] uppercase tracking-widest opacity-80 block">Preview Box</span>
                  <h3 className="text-white font-black text-[20px] leading-tight">{site.copy?.business_name || "My Shop"}</h3>
                  <p className="text-white/80 text-[12px]">{site.copy?.tagline || "Local quality, delivered with care."}</p>
                  
                  <div className="flex justify-center gap-1.5 pt-1">
                    <button className="px-3.5 py-1.5 rounded-lg font-extrabold text-[11px] shadow-sm" style={{ background: theme.accent, color: "#3D1A00" }}>
                      WhatsApp Order
                    </button>
                    <button className="px-3.5 py-1.5 rounded-lg font-extrabold text-[11px] bg-white shadow-sm" style={{ color: theme.primary }}>
                      UPI Checkout
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-2.5">
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11.5px] text-[#0E8A4B] font-extrabold hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" /> View Live Storefront
              </a>
              {styleDirty && (
                <button
                  onClick={() => saveStyleMut.mutate()}
                  disabled={saveStyleMut.isPending}
                  className="w-full h-10 rounded-xl bg-[#0E8A4B] text-white font-extrabold text-[12.5px] shadow-[0_3px_0_0_#073D22] hover:bg-[#0A6E3C] transition"
                >
                  {saveStyleMut.isPending ? "Saving..." : "Save Brand Styling"}
                </button>
              )}
            </div>
          </div>

        </div>

      </div>



    </div>
  );
};

// Darken hex helper
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
