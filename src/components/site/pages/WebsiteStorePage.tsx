/**
 * Template Store — gallery of website templates the user can preview + apply.
 *
 * Each template card has: thumbnail, name, industry tag, brief description,
 * "Preview" (opens /biz-demo/:template in new tab) and "Apply to my site"
 * (PATCHes site.template and bumps the user to /app/site).
 *
 * Industry filter chips + search narrow the gallery. "Coming soon" templates
 * are visible but disabled — gives the store breathing room and signals
 * what's roadmapped.
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
  emoji: string;
  available: boolean;       // false = "Coming soon"
  pillText: string;         // hero status pill
};

const TEMPLATES: Template[] = [
  // Live templates
  { id: "kirana",     name: "Local Shop",      description: "Perfect for kirana stores, general stores and supermarkets. Browseable product grid + WhatsApp ordering + UPI / COD checkout.",
    industries: ["Retail", "Grocery"], bestFor: "Kirana, general store, supermarket, mart",
    primary: "#0E8A4B", accent: "#FFD23F", emoji: "🏪", available: true, pillText: "Open for orders" },
  { id: "salon",      name: "Salon & Spa",     description: "Showcase services with photos and prices. Customers book on WhatsApp in seconds — perfect for hair salons, spas, nail studios.",
    industries: ["Beauty", "Wellness"], bestFor: "Salon, spa, nail studio, barbershop, makeup artist",
    primary: "#D4308E", accent: "#FFD23F", emoji: "💇", available: true, pillText: "Now booking" },
  { id: "restaurant", name: "Restaurant",      description: "Photo-led menu with cart + delivery checkout. Pincode-based shipping and UPI/COD built-in. Great for restaurants, cafés, cloud kitchens.",
    industries: ["Food"], bestFor: "Restaurant, café, cloud kitchen, bakery, dessert shop",
    primary: "#FF6A1F", accent: "#FFD23F", emoji: "🍽️", available: true, pillText: "Kitchen open" },
  { id: "services",   name: "Services Pro",    description: "List service packages with pricing. Customers enquire on WhatsApp for custom quotes. Built for repair, cleaning, consulting, professional services.",
    industries: ["Services"], bestFor: "Plumber, electrician, cleaner, consultant, photographer, tutor",
    primary: "#3C50E0", accent: "#FFD23F", emoji: "🛠️", available: true, pillText: "Accepting bookings" },

  // Coming soon — gives the store breathing room
  { id: "boutique",   name: "Boutique",        description: "High-fashion product showcase with size variants, lookbooks and Instagram-style gallery. Perfect for clothing & accessory brands.",
    industries: ["Retail", "Fashion"], bestFor: "Clothing boutique, jewelry, accessories, handcrafts",
    primary: "#7A1052", accent: "#FFE8B8", emoji: "👗", available: false, pillText: "Shop now" },
  { id: "clinic",     name: "Clinic & Health", description: "Doctor profile, services, hours, appointment booking via WhatsApp. HIPAA-style trust signals built-in.",
    industries: ["Healthcare"], bestFor: "Clinic, dentist, physiotherapy, diagnostic lab",
    primary: "#0A4D5C", accent: "#16C172", emoji: "🩺", available: false, pillText: "Book a visit" },
  { id: "gym",        name: "Gym & Fitness",   description: "Membership plans, class schedule, trainer profiles. Trial-class booking and recurring memberships built-in.",
    industries: ["Wellness", "Services"], bestFor: "Gym, yoga studio, dance class, personal trainer",
    primary: "#1E3A8A", accent: "#FFD23F", emoji: "💪", available: false, pillText: "Train today" },
  { id: "coaching",   name: "Coaching & Tutor", description: "Course catalog, batches, fees, demo class booking. Built for tutors, coaches, online educators, ed-tech.",
    industries: ["Education", "Services"], bestFor: "Tutor, coaching institute, online course, ed-tech",
    primary: "#FF6A1F", accent: "#3C50E0", emoji: "📚", available: false, pillText: "Enrol now" },
  { id: "realestate", name: "Real Estate",     description: "Property listings with photos, location, pricing. Lead capture form for serious buyers + WhatsApp shortcuts to agents.",
    industries: ["Services", "Retail"], bestFor: "Real estate agent, builder, property dealer",
    primary: "#0A3D24", accent: "#16C172", emoji: "🏘️", available: false, pillText: "View properties" },
  { id: "events",     name: "Event Planner",   description: "Portfolio of past events, packages, gallery, testimonials. Lead capture + WhatsApp enquiry built-in.",
    industries: ["Services"], bestFor: "Wedding planner, event manager, decorator, caterer",
    primary: "#D4308E", accent: "#FFE8B8", emoji: "🎉", available: false, pillText: "Plan an event" },
  { id: "photographer", name: "Photographer",  description: "Portfolio-first layout — hero image, gallery, packages, booking. Perfect for wedding, fashion, product photographers.",
    industries: ["Services"], bestFor: "Photographer, videographer, content creator",
    primary: "#202124", accent: "#FFD23F", emoji: "📸", available: false, pillText: "Book a shoot" },
  { id: "bakery",     name: "Bakery & Sweets", description: "Sweet photo grid, custom-order forms, festival packs. Pincode delivery + COD/UPI built-in.",
    industries: ["Food"], bestFor: "Bakery, sweet shop, cake studio, mithai",
    primary: "#B8651A", accent: "#FFD23F", emoji: "🧁", available: false, pillText: "Order fresh" },
];

const INDUSTRIES = ["All", "Retail", "Food", "Beauty", "Services", "Wellness", "Healthcare", "Education", "Fashion", "Grocery"] as const;

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
    // Available first, then coming-soon
    return [...xs].sort((a, b) => (a.available === b.available ? 0 : a.available ? -1 : 1));
  }, [industry, search]);

  const apply = async (t: Template) => {
    if (!t.available) {
      toast.info(`${t.name} template — coming soon!`);
      return;
    }
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
          More templates coming soon — message us on WhatsApp if you need one for a specific industry.
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
    <article className={cn(
      "bg-white rounded-2xl border-2 overflow-hidden transition group relative",
      template.available ? "border-[#E8B968] hover:border-[#0E8A4B] hover:-translate-y-0.5 hover:shadow-xl shadow-[0_3px_0_0_#E8B968]"
                         : "border-[#E8B968]/40 opacity-80"
    )}>
      {/* Thumbnail — generated visual using template colors + emoji */}
      <button
        onClick={onPreview}
        className="block w-full text-left relative aspect-[4/3] overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${template.primary}, ${shade(template.primary, -20)})` }}
        disabled={!template.available}
      >
        {/* Glow */}
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl opacity-50" style={{ background: template.accent }} />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full blur-2xl opacity-20 bg-white" />
        {/* Fake site preview */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center text-white">
          <div className="text-[40px] mb-1.5">{template.emoji}</div>
          <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider mb-2" style={{ background: `${template.accent}30`, color: template.accent }}>
            {template.pillText}
          </span>
          <p className="text-[15px] font-black leading-tight drop-shadow">{template.name}</p>
        </div>
        {/* Active badge */}
        {isActive && (
          <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white text-[#0E8A4B] text-[10px] font-extrabold uppercase tracking-wider shadow-md">
            <CheckCircle2 className="w-3 h-3" strokeWidth={3} /> Active
          </div>
        )}
        {!template.available && (
          <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-foreground/80 text-white text-[10px] font-extrabold uppercase tracking-wider">
            Coming soon
          </div>
        )}
      </button>

      {/* Body */}
      <div className="p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-black leading-tight">{template.name}</h3>
        </div>
        <div className="flex flex-wrap gap-1">
          {template.industries.map((ind) => (
            <span key={ind} className="text-[9.5px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FFF1D6] text-[#7A4A00]">{ind}</span>
          ))}
        </div>
        <p className="text-[12px] text-foreground/65 leading-snug line-clamp-3">{template.description}</p>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onPreview}
            disabled={!template.available}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-white border-2 border-[#E8B968] text-[11.5px] font-extrabold hover:bg-[#FFE8C7] disabled:opacity-40 transition"
          >
            <ExternalLink className="w-3 h-3" /> Preview
          </button>
          <button
            onClick={onApply}
            disabled={!template.available}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-white text-[11.5px] font-extrabold transition disabled:opacity-40",
              isActive
                ? "bg-foreground/65 cursor-default"
                : "bg-[#0E8A4B] hover:bg-[#0A6E3C] shadow-[0_2px_0_0_#073D22] hover:-translate-y-0.5"
            )}
          >
            {isActive ? "Active" : (template.available ? <>Apply <ArrowRight className="w-3 h-3" /></> : "Soon")}
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
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[20px]">{template.emoji}</span>
            <div className="min-w-0">
              <h2 className="text-[15px] font-black truncate">{template.name}</h2>
              <p className="text-[10.5px] text-foreground/55 truncate">{template.bestFor}</p>
            </div>
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
            ) : template.available ? (
              <button onClick={onApply}
                      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#0E8A4B] text-white text-[12px] font-extrabold shadow-[0_2px_0_0_#073D22] hover:bg-[#0A6E3C] transition">
                <Sparkles className="w-3.5 h-3.5" /> Apply to my site
              </button>
            ) : null}
            <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-foreground/5 flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preview iframe */}
        <div className="flex-1 bg-gray-50 overflow-hidden">
          {template.available ? (
            <iframe
              src={previewUrl}
              className="w-full h-full"
              title={`${template.name} preview`}
              style={{ minHeight: 500 }}
            />
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-center">
              <div>
                <p className="text-[40px] mb-2">{template.emoji}</p>
                <h3 className="text-[18px] font-black mb-1">Coming soon</h3>
                <p className="text-[13px] text-foreground/65 max-w-sm mx-auto">
                  This template is in design. Message us on WhatsApp to vote for it — top-requested templates ship first.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Darken a hex by N%. Used for the gradient on thumbnails.
function shade(hex: string, pct: number): string {
  const m = /^#?([a-f0-9]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  let r = (n >> 16) & 0xff;
  let g = (n >> 8) & 0xff;
  let b = n & 0xff;
  const f = 1 + pct / 100;
  r = Math.max(0, Math.min(255, Math.round(r * f)));
  g = Math.max(0, Math.min(255, Math.round(g * f)));
  b = Math.max(0, Math.min(255, Math.round(b * f)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
