/**
 * Template Store — gallery of website templates the user can preview + apply.
 *
 * Each template card has: thumbnail, name, industry tag, brief description,
 * "Preview" (opens /biz-demo/:template in new tab) and "Apply to my site"
 * (PATCHes site.template and bumps the user to /app/site).
 *
 * Industry filter chips + search narrow the gallery. Only templates that
 * are actually wired in the renderer are listed — no "coming soon" fluff.
 */

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Store, Search, ExternalLink, CheckCircle2, Sparkles, Loader2, X, ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

type Template = {
  id: string;
  name: string;
  description: string;
  industries: string[];
  bestFor: string;
  primary: string;
  accent: string;
};

const TEMPLATES: Template[] = [
  { id: "dps",        name: "Addison D-P-S",   description: "Made-for-India digital products template — instant download, UPI checkout, founder-style social proof, GST trust signals. Built for creators selling ebooks, Notion templates, courses, presets, software, art.",
    industries: ["Digital", "Education", "Services"], bestFor: "Ebook author, course creator, Notion templates, presets, software, art, music — anything you can deliver instantly on WhatsApp",
    primary: "#0E8A4B", accent: "#FFD23F" },
  { id: "kirana",     name: "Local Shop",      description: "Perfect for kirana stores, general stores and supermarkets. Browseable product grid + WhatsApp ordering + UPI / COD checkout.",
    industries: ["Retail", "Grocery"], bestFor: "Kirana, general store, supermarket, mart",
    primary: "#0E8A4B", accent: "#FFD23F" },
  { id: "salon",      name: "Salon & Spa",     description: "WhatsApp-first booking: customers pick service → date → time → confirm via WhatsApp with a structured booking message you receive in your inbox. Stylist cards, gallery, reviews, devanagari स्वागत है greeting. Made for Indian salons.",
    industries: ["Beauty", "Wellness"], bestFor: "Hair salon, spa, nail studio, barbershop, makeup artist, beauty parlour",
    primary: "#D4308E", accent: "#FFD23F" },
  { id: "restaurant", name: "Restaurant",      description: "Photo-led menu with cart + delivery checkout. Pincode-based shipping and UPI/COD built-in. Great for restaurants, cafés, cloud kitchens.",
    industries: ["Food"], bestFor: "Restaurant, café, cloud kitchen, bakery, dessert shop",
    primary: "#FF6A1F", accent: "#FFD23F" },
  { id: "services",   name: "Services Pro",    description: "List service packages with pricing. Customers enquire on WhatsApp for custom quotes. Built for repair, cleaning, consulting, professional services.",
    industries: ["Services"], bestFor: "Plumber, electrician, cleaner, consultant, photographer, tutor",
    primary: "#3C50E0", accent: "#FFD23F" },
];

const INDUSTRIES = ["All", "Digital", "Retail", "Food", "Beauty", "Services", "Wellness", "Education", "Grocery"] as const;

export const WebsiteStorePage = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [industry, setIndustry] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [previewing, setPreviewing] = useState<Template | null>(null);

  const { data: site } = useQuery({ queryKey: ["site-me"], queryFn: () => api.getSite(), staleTime: 30_000 });

  const filtered = useMemo(() => {
    let xs = TEMPLATES;
    if (industry !== "All") xs = xs.filter((t) => t.industries.includes(industry));
    const q = search.trim().toLowerCase();
    if (q) xs = xs.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.bestFor.toLowerCase().includes(q) ||
      t.industries.some((i) => i.toLowerCase().includes(q))
    );
    return xs;
  }, [industry, search]);

  const apply = async (t: Template) => {
    if (site?.template === t.id) {
      toast.success(`${t.name} is already your active template`);
      navigate("/app/site");
      return;
    }
    if (!confirm(`Switch your site to the "${t.name}" template? Your content stays — only the vocabulary on the public site changes.`)) return;
    try {
      const updated = await api.updateSite({ template: t.id });
      qc.setQueryData(["site-me"], updated);
      toast.success(`Applied — your site is now using the ${t.name} template`);
      navigate("/app/site");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#FFF6E8]">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0 bg-gradient-to-br from-[#0E8A4B] to-[#0A6E3C]">
            <Store className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[24px] font-black leading-tight">Website Store</h1>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FFD23F] text-[#7A4A00]">Beta</span>
            </div>
            <p className="text-[14px] text-foreground/70 font-medium mt-1">
              Pick a website that fits your business — preview live, apply in one click.
            </p>
          </div>
          {site && (
            <div className="hidden sm:block text-right flex-shrink-0">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/55">Current</p>
              <p className="text-[12.5px] font-extrabold capitalize">{site.template}</p>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by industry, name or use case…"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[13px] font-medium"
          />
        </div>

        {/* Industry filters */}
        <div className="flex flex-wrap items-center gap-2">
          {INDUSTRIES.map((ind) => {
            const count = ind === "All" ? TEMPLATES.length : TEMPLATES.filter((t) => t.industries.includes(ind)).length;
            return (
              <button
                key={ind}
                onClick={() => setIndustry(ind)}
                className={cn(
                  "inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[12px] font-extrabold border-2 transition",
                  industry === ind
                    ? "bg-[#0E8A4B] text-white border-[#0A6E3C] shadow-[0_2px_0_0_#073D22]"
                    : "bg-white border-[#E8B968]/70 text-foreground/65 hover:bg-[#FFE8C7]"
                )}
              >
                {ind}
                <span className={cn("text-[10px] tabular-nums px-1.5 py-0.5 rounded",
                  industry === ind ? "bg-white/20" : "bg-foreground/5 text-foreground/55")}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white rounded-2xl border-2 border-[#E8B968]">
              <p className="text-[13px] font-extrabold">No templates match those filters</p>
              <p className="text-[12px] text-foreground/55 mt-1">Try clearing search or pick a different industry.</p>
            </div>
          ) : filtered.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              isActive={site?.template === t.id}
              onPreview={() => setPreviewing(t)}
              onApply={() => apply(t)}
            />
          ))}
        </div>

        {/* Footer */}
        <p className="text-[11px] text-center text-foreground/45">
          Want a template for your industry? Message us on WhatsApp — most-requested ones ship first.
        </p>
      </div>

      {previewing && <PreviewDialog template={previewing} onClose={() => setPreviewing(null)} onApply={() => apply(previewing)} isActive={site?.template === previewing.id} />}
    </div>
  );
};

// ─── Card ─────────────────────────────────────────────────────────────────

const TemplateCard = ({ template, isActive, onPreview, onApply }: {
  template: Template; isActive: boolean; onPreview: () => void; onApply: () => void;
}) => {
  return (
    <article className="bg-white rounded-2xl border-2 border-[#E8B968] overflow-hidden transition hover:border-[#0E8A4B] hover:-translate-y-0.5 hover:shadow-xl shadow-[0_3px_0_0_#E8B968] group relative flex flex-col">
      {/* Live mini-preview of the actual demo site. iframe is scaled down so
          the full hero + first sections render in the card. pointer-events
          disabled so card clicks/hovers still flow to our buttons; only the
          'Preview' button opens the full-screen interactive version. */}
      <button
        onClick={onPreview}
        className="block w-full text-left relative aspect-[4/3] overflow-hidden bg-white"
        aria-label={`Preview ${template.name}`}
      >
        <div className="absolute inset-0 pointer-events-none origin-top-left"
             style={{ width: "1200px", height: "900px", transform: "scale(0.30)" }}>
          <iframe
            src={`/biz-demo/${template.id}`}
            title={`${template.name} preview`}
            className="w-full h-full border-0 bg-white"
            loading="lazy"
            scrolling="no"
          />
        </div>
        {/* Hover veil → "Click to preview" */}
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#0E8A4B] text-[12px] font-extrabold shadow-lg">
            <ExternalLink className="w-3.5 h-3.5" /> Click to preview
          </span>
        </div>
        {isActive && (
          <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#0E8A4B] text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md z-10">
            <CheckCircle2 className="w-3 h-3" strokeWidth={3} /> Active
          </div>
        )}
        <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </button>

      {/* Body */}
      <div className="p-4 space-y-2.5 flex-1 flex flex-col">
        <h3 className="text-[15px] font-black leading-tight">{template.name}</h3>
        <div className="flex flex-wrap gap-1">
          {template.industries.map((ind) => (
            <span key={ind} className="text-[9.5px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FFF1D6] text-[#7A4A00]">{ind}</span>
          ))}
        </div>
        <p className="text-[12px] text-foreground/65 leading-snug line-clamp-3 flex-1">{template.description}</p>

        <div className="flex items-center gap-2 pt-1">
          <button onClick={onPreview}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-white border-2 border-[#E8B968] text-[11.5px] font-extrabold hover:bg-[#FFE8C7] transition">
            <ExternalLink className="w-3 h-3" /> Preview
          </button>
          <button onClick={onApply}
                  className={cn(
                    "flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-white text-[11.5px] font-extrabold transition",
                    isActive ? "bg-foreground/65 cursor-default" : "bg-[#0E8A4B] hover:bg-[#0A6E3C] shadow-[0_2px_0_0_#073D22] hover:-translate-y-0.5"
                  )}>
            {isActive ? "Active" : (<>Apply <ArrowRight className="w-3 h-3" /></>)}
          </button>
        </div>
      </div>
    </article>
  );
};

// ─── Preview dialog with iframe ───────────────────────────────────────────

const PreviewDialog = ({ template, onClose, onApply, isActive }: {
  template: Template; onClose: () => void; onApply: () => void; isActive: boolean;
}) => {
  const previewUrl = `/biz-demo/${template.id}`;
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-stretch sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-5xl sm:max-h-[90vh] flex flex-col rounded-none sm:rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="border-b-2 border-[#E8B968] px-5 py-3 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-[15px] font-black truncate">{template.name}</h2>
            <p className="text-[10.5px] text-foreground/55 truncate">{template.bestFor}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <a href={previewUrl} target="_blank" rel="noopener noreferrer"
               className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border-2 border-[#E8B968] text-[11.5px] font-extrabold hover:bg-[#FFE8C7] transition">
              <ExternalLink className="w-3 h-3" /> Open in new tab
            </a>
            {isActive ? (
              <span className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-[#E6F7EE] text-[#0E8A4B] text-[12px] font-extrabold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active
              </span>
            ) : (
              <button onClick={onApply}
                      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#0E8A4B] text-white text-[12px] font-extrabold shadow-[0_2px_0_0_#073D22] hover:bg-[#0A6E3C] transition">
                <Sparkles className="w-3.5 h-3.5" /> Apply to my site
              </button>
            )}
            <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-foreground/5 flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preview iframe — full interactive */}
        <div className="flex-1 bg-gray-50 overflow-hidden">
          <iframe
            src={previewUrl}
            className="w-full h-full"
            title={`${template.name} preview`}
            style={{ minHeight: 500 }}
          />
        </div>
      </div>
    </div>
  );
};
