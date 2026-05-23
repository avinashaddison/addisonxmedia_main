/**
 * Website builder shell.
 *
 * Routes:
 *   /app/site                    → overview ("My Website") — FUNCTIONAL
 *   /app/site/pages              → placeholder (Phase 2)
 *   /app/site/theme              → placeholder (Phase 2)
 *   /app/site/sections           → placeholder (Phase 2)
 *   /app/site/products           → placeholder (Phase 3)
 *   /app/site/orders             → placeholder (Phase 3)
 *   /app/site/customers          → placeholder (Phase 3)
 *   /app/site/payments           → placeholder (Phase 3)
 *   /app/site/shipping           → placeholder (Phase 3)
 *   /app/site/coupons            → placeholder (Phase 3)
 *   /app/site/leads              → placeholder (Phase 3)
 *   /app/site/seo                → placeholder (Phase 4)
 *   /app/site/analytics          → placeholder (Phase 4)
 *   /app/site/domain             → placeholder (Phase 2)
 *   /app/site/settings           → placeholder
 *
 * Phase 1 overview is wired end-to-end: GET creates a site if none exists,
 * edit slug + copy, publish → public URL goes live at /biz/<slug>.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Globe, FileText, Palette, LayoutGrid, Package, ShoppingCart, Users,
  CreditCard, Truck, Ticket, ClipboardList, Search, BarChart3, Settings,
  Rocket, ExternalLink, ArrowRight, CheckCircle2, Sparkles, Wand2,
  Loader2, Copy, Eye, EyeOff, AlertCircle, Check, Edit2, Save, X,
} from "lucide-react";
import { api, type SiteDto } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = { subPath: string };

// ─── Overview (Phase 1 — fully functional) ─────────────────────────────────

const SiteOverview = () => {
  const qc = useQueryClient();
  const { data: site, isLoading, error } = useQuery({
    queryKey: ["site-me"],
    queryFn: () => api.getSite(),
    staleTime: 30_000,
  });

  const publicUrl = useMemo(() => {
    if (!site?.slug) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/biz/${site.slug}`;
  }, [site?.slug]);

  const publishMut = useMutation({
    mutationFn: () => api.publishSite(),
    onSuccess: (s) => {
      qc.setQueryData(["site-me"], s);
      toast.success("Site published — live now!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unpublishMut = useMutation({
    mutationFn: () => api.unpublishSite(),
    onSuccess: (s) => {
      qc.setQueryData(["site-me"], s);
      toast.success("Site moved back to draft");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Editable copy fields
  const [editingCopy, setEditingCopy] = useState(false);
  const [copyDraft, setCopyDraft] = useState<{
    business_name: string;
    tagline: string;
    about: string;
  }>({ business_name: "", tagline: "", about: "" });

  useEffect(() => {
    if (site && !editingCopy) {
      const c = site.copy ?? {};
      setCopyDraft({
        business_name: c.business_name || "",
        tagline: c.tagline || "",
        about: c.about || "",
      });
    }
  }, [site, editingCopy]);

  const saveCopyMut = useMutation({
    mutationFn: () => api.updateSite({
      copy: {
        ...(site?.copy || {}),
        business_name: copyDraft.business_name.trim(),
        tagline: copyDraft.tagline.trim(),
        about: copyDraft.about.trim(),
      },
    }),
    onSuccess: (s) => {
      qc.setQueryData(["site-me"], s);
      setEditingCopy(false);
      toast.success("Saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Slug editing
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugDraft, setSlugDraft] = useState("");
  const [slugCheck, setSlugCheck] = useState<{ slug: string; available: boolean; mine?: boolean } | null>(null);

  useEffect(() => {
    if (!editingSlug || !slugDraft) { setSlugCheck(null); return; }
    const handle = setTimeout(async () => {
      try {
        const res = await api.checkSiteSlug(slugDraft);
        setSlugCheck(res);
      } catch { /* silent */ }
    }, 300);
    return () => clearTimeout(handle);
  }, [slugDraft, editingSlug]);

  const saveSlugMut = useMutation({
    mutationFn: () => api.updateSite({ slug: slugDraft.trim() }),
    onSuccess: (s) => {
      qc.setQueryData(["site-me"], s);
      setEditingSlug(false);
      setSlugCheck(null);
      toast.success("URL updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyPublicUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("URL copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#FFF6E8]">
        <Loader2 className="w-6 h-6 animate-spin text-foreground/40" />
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#FFF6E8] px-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-[#D4308E] mx-auto mb-3" />
          <h2 className="text-[16px] font-extrabold mb-1">Couldn't load your site</h2>
          <p className="text-[13px] text-foreground/65">{(error as Error)?.message || "Try refreshing the page."}</p>
        </div>
      </div>
    );
  }

  const isPublished = site.status === "published";
  const hasUnsavedCopy = editingCopy && (
    (copyDraft.business_name !== (site.copy?.business_name || "")) ||
    (copyDraft.tagline !== (site.copy?.tagline || "")) ||
    (copyDraft.about !== (site.copy?.about || ""))
  );

  return (
    <div className="flex-1 overflow-y-auto bg-[#FFF6E8]">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Header strip */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0 bg-[#0E8A4B]">
            <Globe className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-black leading-tight">My Website</h1>
            <p className="text-[14px] text-foreground/70 font-medium mt-1">
              Your business page on the internet — live at <span className="font-mono font-extrabold text-foreground">{publicUrl.replace(/^https?:\/\//, "")}</span>
            </p>
          </div>
          {isPublished ? (
            <button
              onClick={() => unpublishMut.mutate()}
              disabled={unpublishMut.isPending}
              className="hidden sm:inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-white text-foreground border-2 border-[#E8B968] font-extrabold text-[13px] shadow-[0_3px_0_0_#E8B968] hover:bg-[#FFE8C7] active:translate-y-0.5 active:shadow-[0_1px_0_0_#E8B968] transition flex-shrink-0 disabled:opacity-50"
            >
              {unpublishMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <EyeOff className="w-4 h-4" />}
              Unpublish
            </button>
          ) : (
            <button
              onClick={() => publishMut.mutate()}
              disabled={publishMut.isPending}
              className="hidden sm:inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0E8A4B] text-white font-extrabold text-[13px] shadow-[0_4px_0_0_#073D22] hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_2px_0_0_#073D22] transition flex-shrink-0 disabled:opacity-50"
            >
              {publishMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" strokeWidth={2.5} />}
              Publish website
            </button>
          )}
        </div>

        {/* Status banner */}
        <div className={cn(
          "p-4 rounded-2xl border-2 flex items-start gap-3 shadow-[0_3px_0_0_rgba(0,0,0,0.05)]",
          isPublished
            ? "bg-gradient-to-br from-[#E6F7EE] to-[#C6F0D6] border-[#0E8A4B]/40"
            : "bg-gradient-to-br from-[#FFF6E8] to-[#FFE8B8] border-[#FFD23F]/70"
        )}>
          {isPublished ? (
            <CheckCircle2 className="w-5 h-5 text-[#0E8A4B] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
          ) : (
            <Sparkles className="w-5 h-5 text-[#B8651A] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-extrabold text-[#3D1A00]">
              {isPublished ? "Your site is LIVE" : "Draft — not visible to the public yet"}
            </p>
            <p className="text-[11.5px] text-foreground/75 mt-0.5 leading-relaxed">
              {isPublished
                ? `Share ${publicUrl.replace(/^https?:\/\//, "")} with customers — it's been viewed ${site.view_count} time${site.view_count === 1 ? "" : "s"}.`
                : "Hit 'Publish website' to push it live. Anyone with the URL can then visit it."}
            </p>
          </div>
        </div>

        {/* Public URL + slug */}
        <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-extrabold uppercase tracking-[0.15em] text-foreground/55">Public URL</h2>
            {!editingSlug && (
              <button
                onClick={() => { setSlugDraft(site.slug); setEditingSlug(true); }}
                className="text-[11px] font-extrabold text-[#0E8A4B] hover:text-[#0A6E3C] flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" /> Edit slug
              </button>
            )}
          </div>

          {!editingSlug ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#FFF1D6] border border-[#E8B968]">
              <Globe className="w-4 h-4 text-[#B8651A] flex-shrink-0" />
              <span className="flex-1 text-[14px] font-mono font-extrabold truncate">{publicUrl}</span>
              <button
                onClick={copyPublicUrl}
                className="w-8 h-8 rounded-lg bg-white hover:bg-[#FFE8C7] border border-[#E8B968] flex items-center justify-center transition"
                title="Copy URL"
              >
                <Copy className="w-3.5 h-3.5 text-foreground/70" />
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-[#0E8A4B] text-white text-[11px] font-extrabold hover:bg-[#0A6E3C] transition"
              >
                <Eye className="w-3.5 h-3.5" /> View
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-1 p-2 rounded-xl bg-white border-2 border-[#E8B968] focus-within:border-[#0E8A4B]">
                <span className="text-[13px] text-foreground/50 font-mono pl-1 select-none">/biz/</span>
                <input
                  value={slugDraft}
                  onChange={(e) => setSlugDraft(e.target.value)}
                  placeholder="your-shop-name"
                  className="flex-1 px-1 py-1.5 bg-transparent border-0 focus:outline-none text-[14px] font-mono font-extrabold"
                  autoFocus
                />
                {slugCheck && slugCheck.slug && (
                  slugCheck.available || slugCheck.mine ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#0E8A4B] px-1.5"><Check className="w-3 h-3" /> Available</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#D4308E] px-1.5"><X className="w-3 h-3" /> Taken</span>
                  )
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => saveSlugMut.mutate()}
                  disabled={saveSlugMut.isPending || !slugDraft.trim() || (slugCheck != null && !slugCheck.available && !slugCheck.mine)}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#0E8A4B] text-white text-[12px] font-extrabold shadow-[0_3px_0_0_#073D22] hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_1px_0_0_#073D22] transition disabled:opacity-50"
                >
                  {saveSlugMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save URL
                </button>
                <button
                  onClick={() => { setEditingSlug(false); setSlugCheck(null); }}
                  className="h-9 px-3 rounded-lg bg-white border border-[#E8B968] text-foreground/70 text-[12px] font-extrabold hover:bg-[#FFE8C7] transition"
                >
                  Cancel
                </button>
                <p className="text-[10.5px] text-foreground/55 ml-1">Lowercase, hyphens. URL changes immediately.</p>
              </div>
            </div>
          )}
        </div>

        {/* Editable copy */}
        <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[13px] font-extrabold uppercase tracking-[0.15em] text-foreground/55">Site content</h2>
              <p className="text-[11px] text-foreground/55 mt-0.5">Empty fields auto-fill from your WhatsApp Business Profile.</p>
            </div>
            {!editingCopy ? (
              <button
                onClick={() => setEditingCopy(true)}
                className="text-[11px] font-extrabold text-[#0E8A4B] hover:text-[#0A6E3C] flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" /> Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => saveCopyMut.mutate()}
                  disabled={saveCopyMut.isPending || !hasUnsavedCopy}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#0E8A4B] text-white text-[11px] font-extrabold shadow-[0_2px_0_0_#073D22] hover:bg-[#0A6E3C] transition disabled:opacity-50"
                >
                  {saveCopyMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Save
                </button>
                <button
                  onClick={() => setEditingCopy(false)}
                  className="text-[11px] font-extrabold text-foreground/55 hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <FieldRow label="Business name" hint="Shown at the top of your site (auto: your WhatsApp Business name).">
              {editingCopy ? (
                <input
                  value={copyDraft.business_name}
                  onChange={(e) => setCopyDraft({ ...copyDraft, business_name: e.target.value })}
                  placeholder="e.g. Sharma General Store"
                  className="w-full px-3 py-2 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[13px] font-bold"
                />
              ) : (
                <p className="text-[13px] font-bold">{site.copy?.business_name || <span className="text-foreground/40 italic">Auto from WhatsApp profile</span>}</p>
              )}
            </FieldRow>

            <FieldRow label="Tagline" hint="One-line pitch under the business name.">
              {editingCopy ? (
                <input
                  value={copyDraft.tagline}
                  onChange={(e) => setCopyDraft({ ...copyDraft, tagline: e.target.value })}
                  placeholder="e.g. Fresh groceries delivered in 30 minutes"
                  className="w-full px-3 py-2 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[13px] font-bold"
                />
              ) : (
                <p className="text-[13px] font-bold">{site.copy?.tagline || <span className="text-foreground/40 italic">Local quality, delivered with care.</span>}</p>
              )}
            </FieldRow>

            <FieldRow label="About" hint="2-3 sentences customers see in the About section.">
              {editingCopy ? (
                <textarea
                  value={copyDraft.about}
                  onChange={(e) => setCopyDraft({ ...copyDraft, about: e.target.value })}
                  placeholder="Tell customers what makes your shop different."
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[13px] font-medium leading-relaxed resize-none"
                />
              ) : (
                <p className="text-[13px] font-medium leading-relaxed text-foreground/85">
                  {site.copy?.about || <span className="text-foreground/40 italic">We're here on WhatsApp every day — message us anytime.</span>}
                </p>
              )}
            </FieldRow>
          </div>
        </div>

        {/* What auto-fills banner */}
        <div className="bg-gradient-to-br from-[#E4E8FF] to-white rounded-2xl border-2 border-[#3C50E0]/30 p-5">
          <div className="flex items-start gap-3 mb-3">
            <Wand2 className="w-5 h-5 text-[#3C50E0] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
            <div>
              <h3 className="text-[13px] font-extrabold text-[#2533A8]">Auto-filled from your AddisonX data</h3>
              <p className="text-[11.5px] text-foreground/65 mt-0.5">Update these in their settings — your site reflects them instantly.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { label: "WhatsApp number", link: "/app/integrations", icon: "💬" },
              { label: "UPI ID & display name", link: "/app/settings", icon: "💳" },
              { label: "Business profile (name, about)", link: "/app/settings", icon: "🏪" },
              { label: "Instagram URL", link: "/app/settings", icon: "📷" },
            ].map((q) => (
              <a key={q.label} href={q.link} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/70 hover:bg-white border border-[#3C50E0]/15 text-[12px] font-bold transition">
                <span>{q.icon}</span>
                <span className="flex-1 truncate">{q.label}</span>
                <ArrowRight className="w-3 h-3 text-[#3C50E0]" />
              </a>
            ))}
          </div>
        </div>

        {/* Mobile-only publish button */}
        <div className="sm:hidden">
          {isPublished ? (
            <button
              onClick={() => unpublishMut.mutate()}
              disabled={unpublishMut.isPending}
              className="w-full h-12 rounded-xl bg-white text-foreground border-2 border-[#E8B968] font-extrabold text-[14px] shadow-[0_3px_0_0_#E8B968] inline-flex items-center justify-center gap-2"
            >
              <EyeOff className="w-4 h-4" /> Unpublish
            </button>
          ) : (
            <button
              onClick={() => publishMut.mutate()}
              disabled={publishMut.isPending}
              className="w-full h-12 rounded-xl bg-[#0E8A4B] text-white font-extrabold text-[14px] shadow-[0_4px_0_0_#073D22] inline-flex items-center justify-center gap-2"
            >
              <Rocket className="w-4 h-4" strokeWidth={2.5} /> Publish website
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const FieldRow = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="p-3 rounded-xl bg-[#FFF6E8]/60 border border-[#E8B968]/50">
    <div className="flex items-baseline justify-between mb-1.5">
      <label className="text-[10.5px] font-extrabold uppercase tracking-wider text-foreground/65">{label}</label>
      {hint && <span className="text-[10px] text-foreground/45 italic ml-2 hidden sm:inline">{hint}</span>}
    </div>
    {children}
  </div>
);

// ─── Placeholder pages (Phases 2–4) ────────────────────────────────────────

const PLACEHOLDER_CONFIG: Record<string, { icon: any; title: string; subtitle: string; accent: string; bullets: string[] }> = {
  pages: {
    icon: FileText, title: "Pages", accent: "#3C50E0",
    subtitle: "Add, reorder and edit the pages of your site.",
    bullets: ["Home, About, Products, Contact ship by default", "Add custom pages with the section library", "Each page has its own SEO settings"],
  },
  theme: {
    icon: Palette, title: "Theme", accent: "#D4308E",
    subtitle: "Brand colors, fonts and logo — applied everywhere instantly.",
    bullets: ["Auto-picked from your AddisonX brand colors", "Override per-page if needed", "Light + dark mode handled for you"],
  },
  sections: {
    icon: LayoutGrid, title: "Sections", accent: "#FF6A1F",
    subtitle: "The building blocks of your site. Add, reorder, customize.",
    bullets: ["Hero, Gallery, Testimonials, FAQ, Hours, Map, Contact", "Each section is mobile-first by default", "Drop into any page in one click"],
  },
  products: {
    icon: Package, title: "Products & Inventory", accent: "#0E8A4B",
    subtitle: "Same catalog that powers your WhatsApp Send Product feature.",
    bullets: ["Display on storefront with photos + prices", "Track stock (low-stock alerts via WhatsApp)", "Variants: size, color, weight"],
  },
  orders: {
    icon: ShoppingCart, title: "Orders", accent: "#FF6A1F",
    subtitle: "New / processing / shipped / delivered / returns — all here.",
    bullets: ["Auto WhatsApp confirmation on new order", "Shipping label printing", "Order status updates trigger automated follow-ups"],
  },
  customers: {
    icon: Users, title: "Customers", accent: "#3C50E0",
    subtitle: "Buyers (different from leads) with repeat-order analytics.",
    bullets: ["Lifetime value, repeat rate, last order", "Auto-segment: VIP / Repeat / At-risk", "WhatsApp re-engage campaigns built-in"],
  },
  payments: {
    icon: CreditCard, title: "Payments", accent: "#0E8A4B",
    subtitle: "UPI + Cashfree + manual COD — all in one ledger.",
    bullets: ["Auto-reconcile UPI payments", "Cashfree for card / wallet / netbanking", "Payouts to your bank in T+1"],
  },
  shipping: {
    icon: Truck, title: "Shipping", accent: "#B8651A",
    subtitle: "Connect Delhivery / Shiprocket or do self-pickup zones.",
    bullets: ["Pincode-based rate calculator", "Auto-generate AWB + label on order", "Track-link auto-sent on WhatsApp"],
  },
  coupons: {
    icon: Ticket, title: "Coupons", accent: "#D4308E",
    subtitle: "Discount codes, free-shipping promos, first-time-buyer offers.",
    bullets: ["Code-based + auto-applied", "Min cart value + max usage caps", "Auto-share via WhatsApp campaigns"],
  },
  leads: {
    icon: ClipboardList, title: "Lead Forms", accent: "#3C50E0",
    subtitle: "Capture leads from your site — straight into the CRM.",
    bullets: ["Drag-drop form builder", "Auto-WhatsApp welcome on submission", "Push into Contacts + auto-assign to agents"],
  },
  seo: {
    icon: Search, title: "SEO", accent: "#FF6A1F",
    subtitle: "Get found on Google — meta tags, sitemap, schema, all auto.",
    bullets: ["AI-generated meta titles + descriptions per page", "schema.org markup for local business / products", "Google Search Console verification in one click"],
  },
  analytics: {
    icon: BarChart3, title: "Site Analytics", accent: "#0E8A4B",
    subtitle: "Pageviews, conversions, top sources — all real-time.",
    bullets: ["Top pages + top sources (Google, Meta ads, WhatsApp)", "Conversion funnel: view → lead → sale", "Plugs into existing Meta CAPI for ad attribution"],
  },
  domain: {
    icon: Globe, title: "Domain", accent: "#B8651A",
    subtitle: "Free subdomain instantly. Connect your own domain when ready.",
    bullets: ["<slug>.addisonxmedia.site — live in seconds", "Custom domain via CNAME + auto-SSL", "Multiple domains supported on Pro+"],
  },
  settings: {
    icon: Settings, title: "Site Settings", accent: "#0A3D24",
    subtitle: "Business info, tax, returns policy, legal pages.",
    bullets: ["GST + tax configuration", "Return + refund policy templates", "Privacy + Terms auto-generated for India + EU"],
  },
};

const SiteSubPagePlaceholder = ({ pageKey }: { pageKey: string }) => {
  const cfg = PLACEHOLDER_CONFIG[pageKey];
  if (!cfg) return <SiteOverview />;
  const Icon = cfg.icon;

  return (
    <div className="flex-1 overflow-y-auto bg-[#FFF6E8]">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-start gap-4 mb-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0"
            style={{ backgroundColor: cfg.accent }}
          >
            <Icon className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-black leading-tight">{cfg.title}</h1>
            <p className="text-[14px] text-foreground/70 font-medium mt-1">{cfg.subtitle}</p>
          </div>
        </div>

        <div className="mb-6 p-4 rounded-2xl border-2 border-[#FFD23F]/70 bg-gradient-to-br from-[#FFF6E8] to-[#FFE8B8] flex items-start gap-3 shadow-[0_3px_0_0_rgba(232,185,104,0.4)]">
          <Sparkles className="w-5 h-5 text-[#B8651A] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-extrabold text-[#3D1A00]">Shipping in a future phase</p>
            <p className="text-[11.5px] text-foreground/75 mt-0.5 leading-relaxed">
              Phase 1 (My Website + public renderer) is live. This screen ships next — message us on WhatsApp if you
              want it prioritized.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-6">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.15em] text-foreground/55 mb-4">What this will do</h2>
          <ul className="space-y-3">
            {cfg.bullets.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: cfg.accent }} strokeWidth={2.5} />
                <span className="text-[14px] font-medium leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 text-center">
          <a href="/app/site" className="inline-flex items-center gap-1.5 text-[12px] text-foreground/55 hover:text-foreground/85 font-semibold transition">
            <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Back to My Website
          </a>
        </div>
      </div>
    </div>
  );
};

// ─── Router ────────────────────────────────────────────────────────────────

import { ThemePage } from "./pages/ThemePage";
import { SeoPage } from "./pages/SeoPage";
import { DomainPage } from "./pages/DomainPage";
import { SettingsPage as SiteSettingsPage } from "./pages/SettingsPage";
import { LeadsPage } from "./pages/LeadsPage";
import { ProductsPage } from "./pages/ProductsPage";
import { OrdersPage } from "./pages/OrdersPage";
import { CustomersPage } from "./pages/CustomersPage";

export const SitePage = ({ subPath }: Props) => {
  const key = (subPath || "").toLowerCase();
  switch (key) {
    case "": return <SiteOverview />;
    case "theme":    return <ThemePage />;
    case "seo":      return <SeoPage />;
    case "domain":   return <DomainPage />;
    case "settings": return <SiteSettingsPage />;
    case "leads":    return <LeadsPage />;
    case "products": return <ProductsPage />;
    case "orders":   return <OrdersPage />;
    case "customers": return <CustomersPage />;
    default:         return <SiteSubPagePlaceholder pageKey={key} />;
  }
};
