import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Palette, Loader2, Save, Check, ExternalLink, Sparkles, 
  ArrowRight, Eye, LayoutGrid, CheckCircle2, ChevronRight, X 
} from "lucide-react";
import { api, type SiteDto } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PresetTheme = {
  id: string;
  name: string;
  description: string;
  industries: string[];
  bestFor: string;
  primary: string;
  accent: string;
};

const TEMPLATES: PresetTheme[] = [
  { id: "dps",        name: "Addison D-P-S",   description: "Made-for-India digital products template — instant download, UPI checkout, founder-style social proof. Built for creators selling ebooks, templates, courses, software, art.",
    industries: ["Digital", "Education", "Services"], bestFor: "Ebooks, course creators, software, presets — anything delivered on WhatsApp",
    primary: "#0E8A4B", accent: "#FFD23F" },
  { id: "kirana",     name: "Local Shop",      description: "Perfect for local retail & grocery stores. Browseable product grid + WhatsApp ordering + UPI/COD checkout integrations.",
    industries: ["Retail", "Grocery"], bestFor: "Kirana, general stores, supermarkets, marts",
    primary: "#0E8A4B", accent: "#FFD23F" },
  { id: "salon",      name: "Salon & Spa",     description: "WhatsApp bookings: customer chooses stylist, service, time → schedules via WhatsApp. Stylist cards, gallery, reviews.",
    industries: ["Beauty", "Wellness"], bestFor: "Hair salon, spa, nail studio, beauty parlour",
    primary: "#D4308E", accent: "#FFD23F" },
  { id: "restaurant", name: "Restaurant Menu",  description: "Photo-led digital menu with cart. UPI / COD checkout and pincode delivery calculations. Great for cloud kitchens & cafes.",
    industries: ["Food"], bestFor: "Restaurant, café, cloud kitchen, bakery, dessert shop",
    primary: "#FF6A1F", accent: "#FFD23F" },
  { id: "services",   name: "Services Pro",    description: "List service packages with clear pricing. WhatsApp quote queries. Built for repair, consulting, photographers.",
    industries: ["Services"], bestFor: "Plumbers, electricians, cleaners, consultants, photographers",
    primary: "#3C50E0", accent: "#FFD23F" },
];

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
  const [previewingTemplate, setPreviewingTemplate] = useState<PresetTheme | null>(null);

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

  const applyTemplate = async (t: PresetTheme) => {
    if (site?.template === t.id) {
      toast.success(`${t.name} is already active`);
      return;
    }
    if (!confirm(`Switch layout template to "${t.name}"? Your content remains — only vocabulary & structure styling will change.`)) return;
    try {
      const updated = await api.updateSite({ template: t.id });
      qc.setQueryData(["site-me"], updated);
      toast.success(`Theme layout switched to ${t.name}`);
      setPreviewingTemplate(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

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

        {/* 1. Prebuilt Templates Grid */}
        <div className="space-y-4">
          <h2 className="text-[14px] font-black uppercase tracking-wider text-foreground/60">1. Prebuilt Theme Layouts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEMPLATES.map((t) => {
              const isActive = site.template === t.id;
              return (
                <div 
                  key={t.id}
                  className={cn(
                    "bg-white rounded-2xl border-2 overflow-hidden transition duration-200 shadow-sm flex flex-col group relative",
                    isActive ? "border-[#0E8A4B] shadow-[0_4px_0_0_#0E8A4B]/20" : "border-[#E8B968] hover:border-[#0E8A4B] hover:-translate-y-0.5"
                  )}
                >
                  {/* Miniature simulator frame */}
                  <div 
                    onClick={() => setPreviewingTemplate(t)}
                    className="block w-full text-left relative aspect-[4/3] overflow-hidden bg-white border-b border-[#E8B968]/50 cursor-pointer"
                  >
                    <div 
                      className="absolute inset-0 pointer-events-none origin-top-left"
                      style={{ width: "1200px", height: "900px", transform: "scale(0.32)" }}
                    >
                      <iframe
                        src={`/biz-demo/${t.id}`}
                        title={`${t.name} preview`}
                        className="w-full h-full border-0 bg-white"
                        loading="lazy"
                        scrolling="no"
                      />
                    </div>
                    {/* Hover screen */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition flex items-center justify-center opacity-0 group-hover:opacity-100 duration-150">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#0E8A4B] text-[12px] font-extrabold shadow-lg">
                        <Eye className="w-3.5 h-3.5" /> Full Preview
                      </span>
                    </div>
                    {isActive && (
                      <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0E8A4B] text-white text-[10px] font-extrabold uppercase tracking-wider shadow z-10">
                        <Check className="w-3 h-3" strokeWidth={3} /> Active Layout
                      </div>
                    )}
                  </div>

                  {/* Template Info Card */}
                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <h3 className="text-[14.5px] font-black text-foreground/80 leading-tight">{t.name}</h3>
                      <div className="flex flex-wrap gap-1">
                        {t.industries.map((ind) => (
                          <span key={ind} className="text-[8.5px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#FFF1D6] text-[#7A4A00]">{ind}</span>
                        ))}
                      </div>
                      <p className="text-[11.5px] text-foreground/60 leading-snug line-clamp-3">{t.description}</p>
                    </div>

                    <div className="flex items-center gap-2 pt-4">
                      <button 
                        onClick={() => setPreviewingTemplate(t)}
                        className="flex-1 inline-flex items-center justify-center gap-1 h-9 px-3 rounded-xl bg-white border border-[#E8B968] text-[11.5px] font-extrabold text-foreground hover:bg-[#FFE8C7]/30 transition"
                      >
                        Preview Theme
                      </button>
                      <button 
                        onClick={() => applyTemplate(t)}
                        disabled={isActive}
                        className={cn(
                          "flex-1 inline-flex items-center justify-center gap-1 h-9 px-3 rounded-xl text-white text-[11.5px] font-extrabold transition",
                          isActive ? "bg-foreground/45 cursor-default" : "bg-[#0E8A4B] hover:bg-[#0A6E3C] shadow-[0_2px_0_0_#073D22]"
                        )}
                      >
                        {isActive ? "Active Theme" : <>Apply Theme <ArrowRight className="w-3 h-3" /></>}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Double Column: Stylist Palettes and Live Swatch */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
          
          {/* Palettes & Typography */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Color Palette Grid */}
            <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5 space-y-4">
              <h3 className="text-[13.5px] font-black uppercase tracking-wider text-foreground/75">2. Brand Color Palette</h3>
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
              <h3 className="text-[13.5px] font-black uppercase tracking-wider text-foreground/75">3. Typography / Fonts</h3>
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

      {/* Full-screen Theme Interactive Simulator Modal */}
      {previewingTemplate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-5xl h-full sm:max-h-[90vh] flex flex-col rounded-none sm:rounded-3xl overflow-hidden shadow-2xl">
            
            <div className="border-b border-[#E8B968] p-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[14.5px] font-black text-foreground/80">{previewingTemplate.name}</h2>
                <p className="text-[10px] text-foreground/45 mt-0.5">{previewingTemplate.bestFor}</p>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <a 
                  href={`/biz-demo/${previewingTemplate.id}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 h-8.5 px-3 rounded-lg bg-white border border-[#E8B968] text-[11px] font-extrabold text-foreground hover:bg-[#FFE8C7]/30 transition"
                >
                  <ExternalLink className="w-3 h-3" /> Open Demo Tab
                </a>
                <button 
                  onClick={() => applyTemplate(previewingTemplate)}
                  className="inline-flex items-center gap-1.5 h-8.5 px-3.5 rounded-lg bg-[#0E8A4B] text-white text-[11px] font-extrabold shadow-[0_2px_0_0_#073D22] hover:bg-[#0A6E3C] transition"
                >
                  Apply Theme Layout
                </button>
                <button onClick={() => setPreviewingTemplate(null)} className="w-8.5 h-8.5 rounded-lg hover:bg-foreground/5 flex items-center justify-center text-foreground/60">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-gray-100 overflow-hidden">
              <iframe
                src={`/biz-demo/${previewingTemplate.id}`}
                className="w-full h-full border-none"
                title={`${previewingTemplate.name} Full Simulator`}
              />
            </div>

          </div>
        </div>
      )}

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
