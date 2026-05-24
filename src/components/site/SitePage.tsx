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

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Globe, FileText, Palette, LayoutGrid, Package, ShoppingCart, Users,
  CreditCard, Truck, Ticket, ClipboardList, Search, BarChart3, Settings,
  Rocket, ExternalLink, ArrowRight, CheckCircle2, Sparkles, Wand2,
  Loader2, Copy, Eye, EyeOff, AlertCircle, Check, Edit2, Save, X,
  ChevronDown, Code, Shield, Image as ImageIcon, BarChart, Activity, Upload,
} from "lucide-react";
import { useCloudinaryConfig, useCloudinaryUpload } from "@/hooks/useCloudinaryUpload";
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

        {/* Active website — read-only summary that links to Website Store
            for the picker UX. (Used to host the 4-card picker; removed
            because Website Store now does the same job with previews,
            filters and 12 templates.) */}
        <a
          href="/app/site/store"
          className="flex items-center gap-3 bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-4 hover:bg-[#FFE8C7]/40 hover:-translate-y-0.5 transition group"
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[20px] flex-shrink-0 bg-gradient-to-br from-[#0E8A4B] to-[#0A6E3C]">
            {site.template === "salon" ? "💇" : site.template === "restaurant" ? "🍽️" : site.template === "services" ? "🛠️" : "🏪"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-foreground/55">Active website</p>
            <p className="text-[14px] font-extrabold capitalize">
              {site.template === "kirana" ? "Local Shop"
                : site.template === "salon" ? "Salon & Spa"
                : site.template === "restaurant" ? "Restaurant"
                : site.template === "services" ? "Services Pro"
                : site.template}
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11.5px] font-extrabold text-[#0E8A4B] group-hover:text-[#0A6E3C]">
            Change in Website Store <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
          </span>
          <ArrowRight className="sm:hidden w-4 h-4 text-[#0E8A4B] flex-shrink-0" />
        </a>

        {/* Branding (logo + cover) */}
        <BrandingSection site={site} />

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

        {/* Contact overrides (phone + email specific to this site) */}
        <ContactOverridesSection site={site} />

        {/* Section visibility toggles */}
        <SectionVisibility site={site} />

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

        {/* Advanced options accordion */}
        <AdvancedOptions site={site} />

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

// ─── Branding: logo + cover photo upload ───────────────────────────────────

const BrandingSection = ({ site }: { site: SiteDto }) => {
  const qc = useQueryClient();
  const { data: cloudConfig } = useCloudinaryConfig();
  const { upload: uploadLogo, progress: logoProgress, uploading: logoUploading } = useCloudinaryUpload();
  const { upload: uploadCover, progress: coverProgress, uploading: coverUploading } = useCloudinaryUpload();
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const currentLogo = (site.copy as Record<string, string>)?.logo_url || "";
  const currentCover = (site.copy as Record<string, string>)?.cover_url || "";

  const saveImg = async (key: "logo_url" | "cover_url", url: string | null) => {
    try {
      const updated = await api.updateSite({ copy: { ...(site.copy || {}), [key]: url ?? "" } });
      qc.setQueryData(["site-me"], updated);
      toast.success(url ? "Saved" : "Removed");
    } catch (e) { toast.error((e as Error).message); }
  };

  const handleUpload = async (file: File, kind: "logo" | "cover") => {
    if (!cloudConfig?.enabled || !cloudConfig.cloudName || !cloudConfig.uploadPreset) {
      toast.error("Image upload not configured on the server");
      return;
    }
    if (file.size > (cloudConfig.maxImageMb || 25) * 1024 * 1024) {
      toast.error(`Image too large (max ${cloudConfig.maxImageMb}MB)`);
      return;
    }
    try {
      const fn = kind === "logo" ? uploadLogo : uploadCover;
      const res = await fn(file, { cloudName: cloudConfig.cloudName, uploadPreset: cloudConfig.uploadPreset }, "image");
      await saveImg(kind === "logo" ? "logo_url" : "cover_url", res.secure_url);
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5">
      <h2 className="text-[13px] font-extrabold uppercase tracking-[0.15em] text-foreground/55 mb-3">Branding</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Logo */}
        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/65 mb-2 block">Logo (square)</label>
          <div className="flex items-start gap-3">
            <div className="relative w-20 h-20 rounded-2xl border-2 border-[#E8B968] overflow-hidden flex-shrink-0 bg-gradient-to-br from-foreground/5 to-foreground/10">
              {currentLogo ? (
                <img src={currentLogo} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-foreground/30">
                  <ImageIcon className="w-7 h-7" />
                </div>
              )}
              {logoUploading && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                  <Loader2 className="w-4 h-4 animate-spin mb-1" />
                  <span className="text-[9px] font-extrabold">{logoProgress}%</span>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              <input ref={logoRef} type="file" accept="image/*" className="hidden"
                     onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f, "logo"); if (logoRef.current) logoRef.current.value = ""; }} />
              <button onClick={() => logoRef.current?.click()} disabled={logoUploading}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#FFF1D6] hover:bg-[#FFE8C7] border border-[#E8B968] text-[12px] font-extrabold text-[#B8651A] disabled:opacity-50 transition">
                <Upload className="w-3.5 h-3.5" /> {currentLogo ? "Replace" : "Upload logo"}
              </button>
              {currentLogo && (
                <button onClick={() => saveImg("logo_url", null)}
                        className="ml-2 text-[11px] font-extrabold text-[#D4308E] hover:text-[#A11A6A]">Remove</button>
              )}
              <p className="text-[10px] text-foreground/55">Square image, 200×200+ recommended. Replaces the auto letter circle.</p>
            </div>
          </div>
        </div>

        {/* Cover photo */}
        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/65 mb-2 block">Hero cover photo</label>
          <div className="space-y-2">
            <div className="relative w-full aspect-[5/2] rounded-xl border-2 border-[#E8B968] overflow-hidden bg-gradient-to-br from-foreground/5 to-foreground/10">
              {currentCover ? (
                <img src={currentCover} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-foreground/30">
                  <ImageIcon className="w-8 h-8" />
                </div>
              )}
              {coverUploading && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                  <Loader2 className="w-5 h-5 animate-spin mb-1" />
                  <span className="text-[10px] font-extrabold">{coverProgress}%</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input ref={coverRef} type="file" accept="image/*" className="hidden"
                     onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f, "cover"); if (coverRef.current) coverRef.current.value = ""; }} />
              <button onClick={() => coverRef.current?.click()} disabled={coverUploading}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#FFF1D6] hover:bg-[#FFE8C7] border border-[#E8B968] text-[12px] font-extrabold text-[#B8651A] disabled:opacity-50 transition">
                <Upload className="w-3.5 h-3.5" /> {currentCover ? "Replace" : "Upload cover"}
              </button>
              {currentCover && (
                <button onClick={() => saveImg("cover_url", null)}
                        className="text-[11px] font-extrabold text-[#D4308E] hover:text-[#A11A6A]">Remove</button>
              )}
            </div>
            <p className="text-[10px] text-foreground/55">Wide image (1600×640+). Shown behind the hero. Leave empty for default dot pattern.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Contact overrides (site-specific phone + email) ──────────────────────

const ContactOverridesSection = ({ site }: { site: SiteDto }) => {
  const qc = useQueryClient();
  const copy = (site.copy as Record<string, string>) || {};
  const [draft, setDraft] = useState({ phone: copy.phone || "", email: copy.email || "" });

  useEffect(() => { setDraft({ phone: copy.phone || "", email: copy.email || "" }); }, [site.id, copy.phone, copy.email]);

  const dirty = (draft.phone || "") !== (copy.phone || "") || (draft.email || "") !== (copy.email || "");

  const save = async () => {
    try {
      const updated = await api.updateSite({ copy: { ...copy, phone: draft.phone.trim(), email: draft.email.trim() } });
      qc.setQueryData(["site-me"], updated);
      toast.success("Saved");
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5">
      <h2 className="text-[13px] font-extrabold uppercase tracking-[0.15em] text-foreground/55 mb-1">Site contact</h2>
      <p className="text-[11px] text-foreground/55 mb-3">Overrides for THIS site only — leave blank to use your AddisonX profile values.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FieldRow label="Phone / WhatsApp" hint="Override your profile phone for this site">
          <input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                 placeholder="+91 9XXXXXXXXX"
                 className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[13px] font-mono font-bold" />
        </FieldRow>
        <FieldRow label="Email" hint="Shown in the Contact section">
          <input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                 placeholder="hello@yourshop.com"
                 className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[13px] font-bold" />
        </FieldRow>
      </div>
      <div className="flex items-center justify-end gap-2 mt-3">
        <button onClick={save} disabled={!dirty}
                className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-[#0E8A4B] text-white text-[13px] font-extrabold shadow-[0_3px_0_0_#073D22] hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_1px_0_0_#073D22] disabled:opacity-50 transition">
          <Save className="w-3.5 h-3.5" /> {dirty ? "Save contact" : "Saved"}
        </button>
      </div>
    </div>
  );
};

// ─── Section visibility toggles ───────────────────────────────────────────

const SectionVisibility = ({ site }: { site: SiteDto }) => {
  const qc = useQueryClient();
  const copy = (site.copy as Record<string, unknown>) || {};
  const isTruthy = (v: unknown) => v === true || v === "true" || v === 1 || v === "1";

  type Key = "products" | "hours" | "address" | "contact" | "leadform";
  const ROWS: Array<{ key: Key; label: string; description: string; icon: React.ReactNode }> = [
    { key: "products", label: "Products grid",  description: "Add to cart + checkout",       icon: <Package className="w-4 h-4" /> },
    { key: "hours",    label: "Business hours", description: "From Site Settings",            icon: <Eye className="w-4 h-4" /> },
    { key: "address",  label: "Address",        description: "From Site Settings",            icon: <Eye className="w-4 h-4" /> },
    { key: "contact",  label: "Contact cards",  description: "WhatsApp, UPI, social",         icon: <Eye className="w-4 h-4" /> },
    { key: "leadform", label: "Lead form",      description: "Capture leads → CRM",           icon: <ClipboardList className="w-4 h-4" /> },
  ];

  const toggle = async (key: Key, hide: boolean) => {
    try {
      const updated = await api.updateSite({ copy: { ...copy, [`hide_${key}`]: hide } });
      qc.setQueryData(["site-me"], updated);
      toast.success(hide ? "Section hidden" : "Section shown");
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5">
      <h2 className="text-[13px] font-extrabold uppercase tracking-[0.15em] text-foreground/55 mb-1">Sections on your site</h2>
      <p className="text-[11px] text-foreground/55 mb-3">Toggle off the sections you don't want shown on the public site.</p>
      <ul className="divide-y divide-foreground/10 -mx-2">
        {ROWS.map((r) => {
          const hidden = isTruthy(copy[`hide_${r.key}`]);
          return (
            <li key={r.key} className="flex items-center gap-3 px-2 py-2.5">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                hidden ? "bg-foreground/5 text-foreground/30" : "bg-[#E6F7EE] text-[#0E8A4B]")}>
                {r.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-[13px] font-extrabold", hidden && "text-foreground/45 line-through")}>{r.label}</p>
                <p className="text-[10.5px] text-foreground/55">{r.description}</p>
              </div>
              <button
                onClick={() => toggle(r.key, !hidden)}
                className={cn(
                  "relative w-11 h-6 rounded-full transition flex-shrink-0",
                  !hidden ? "bg-[#0E8A4B]" : "bg-foreground/20"
                )}
                aria-label={hidden ? `Show ${r.label}` : `Hide ${r.label}`}
              >
                <span className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                  !hidden ? "translate-x-[22px]" : "translate-x-0.5"
                )} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

// ─── Advanced options (collapsed by default) ───────────────────────────────

const AdvancedOptions = ({ site }: { site: SiteDto }) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    favicon_url: site.favicon_url || "",
    ga4_id: site.ga4_id || "",
    meta_pixel_id: site.meta_pixel_id || "",
    custom_head_html: site.custom_head_html || "",
    allow_indexing: site.allow_indexing,
  });

  useEffect(() => {
    setDraft({
      favicon_url: site.favicon_url || "",
      ga4_id: site.ga4_id || "",
      meta_pixel_id: site.meta_pixel_id || "",
      custom_head_html: site.custom_head_html || "",
      allow_indexing: site.allow_indexing,
    });
  }, [site.id, site.favicon_url, site.ga4_id, site.meta_pixel_id, site.custom_head_html, site.allow_indexing]);

  const dirty =
    (draft.favicon_url || null) !== (site.favicon_url || null) ||
    (draft.ga4_id || null) !== (site.ga4_id || null) ||
    (draft.meta_pixel_id || null) !== (site.meta_pixel_id || null) ||
    (draft.custom_head_html || null) !== (site.custom_head_html || null) ||
    draft.allow_indexing !== site.allow_indexing;

  const saveMut = useMutation({
    mutationFn: () => api.updateSite({
      favicon_url: draft.favicon_url.trim() || null,
      ga4_id: draft.ga4_id.trim() || null,
      meta_pixel_id: draft.meta_pixel_id.trim() || null,
      custom_head_html: draft.custom_head_html.trim() || null,
      allow_indexing: draft.allow_indexing,
    }),
    onSuccess: (s) => {
      qc.setQueryData(["site-me"], s);
      toast.success("Advanced options saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Count of configured options for the header pill
  const configuredCount =
    (site.favicon_url ? 1 : 0) +
    (site.ga4_id ? 1 : 0) +
    (site.meta_pixel_id ? 1 : 0) +
    (site.custom_head_html ? 1 : 0) +
    (!site.allow_indexing ? 1 : 0);

  return (
    <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center gap-3 hover:bg-[#FFF6E8]/40 transition text-left"
      >
        <div className="w-9 h-9 rounded-xl bg-[#0A3D24] text-white flex items-center justify-center flex-shrink-0">
          <Code className="w-4 h-4" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.15em] text-foreground/85 flex items-center gap-2">
            Advanced
            {configuredCount > 0 && (
              <span className="text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded bg-[#0E8A4B] text-white normal-case">
                {configuredCount} configured
              </span>
            )}
          </h2>
          <p className="text-[11px] text-foreground/55 mt-0.5">Tracking pixels, favicon, custom scripts, search-engine indexing.</p>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-foreground/40 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="p-5 pt-1 space-y-4 border-t border-[#E8B968]/50">
          <FieldRow label="Favicon URL" hint="32×32 px ICO or PNG · shown in browser tab">
            <div className="flex items-center gap-2">
              <input value={draft.favicon_url} onChange={(e) => setDraft({ ...draft, favicon_url: e.target.value })}
                     placeholder="https://res.cloudinary.com/…/favicon.png"
                     className="flex-1 px-3 py-2 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[12px] font-mono" />
              {draft.favicon_url && (
                <img src={draft.favicon_url} alt="" className="w-8 h-8 rounded border border-[#E8B968]" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
            </div>
          </FieldRow>

          <FieldRow label="Google Analytics 4 ID" hint="Find in GA admin · format G-XXXXXXX">
            <div className="relative">
              <BarChart className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/45" strokeWidth={2.5} />
              <input value={draft.ga4_id} onChange={(e) => setDraft({ ...draft, ga4_id: e.target.value.toUpperCase() })}
                     placeholder="G-XXXXXXX"
                     className="w-full pl-8 pr-3 py-2 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[12.5px] font-mono font-bold uppercase" />
            </div>
          </FieldRow>

          <FieldRow label="Meta (Facebook) Pixel ID" hint="Numeric · for Insta/FB ad attribution & retargeting">
            <div className="relative">
              <Activity className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/45" strokeWidth={2.5} />
              <input value={draft.meta_pixel_id} onChange={(e) => setDraft({ ...draft, meta_pixel_id: e.target.value.replace(/\D+/g, "") })}
                     placeholder="123456789012345"
                     className="w-full pl-8 pr-3 py-2 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[12.5px] font-mono font-bold" />
            </div>
          </FieldRow>

          <FieldRow label="Custom <head> HTML" hint="Power-user · chat widgets, additional pixels, schema, fonts">
            <textarea value={draft.custom_head_html} onChange={(e) => setDraft({ ...draft, custom_head_html: e.target.value })}
                      placeholder={`<!-- e.g. Tawk.to chat widget -->\n<script src="https://embed.tawk.to/…/default" async></script>`}
                      rows={4}
                      className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[11.5px] font-mono leading-relaxed resize-none" />
            <p className="text-[10px] text-foreground/45 mt-1 ml-1">Anything you paste here is injected into <code className="font-mono">&lt;head&gt;</code> on every page of your site.</p>
          </FieldRow>

          <div className="p-3 rounded-xl bg-[#FFF6E8]/60 border border-[#E8B968]/50">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={draft.allow_indexing}
                     onChange={(e) => setDraft({ ...draft, allow_indexing: e.target.checked })}
                     className="w-4 h-4 accent-[#0E8A4B]" />
              <Shield className="w-4 h-4 text-[#0A3D24]" strokeWidth={2.5} />
              <div className="flex-1">
                <span className="text-[12.5px] font-extrabold">Allow search engines to index this site</span>
                <p className="text-[10.5px] text-foreground/55 mt-0.5">Uncheck to add <code className="font-mono">noindex</code> meta tag — hides from Google. Useful for staging or password-protected sites.</p>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={() => setOpen(false)} className="h-10 px-3 rounded-lg text-foreground/65 text-[12px] font-extrabold hover:bg-foreground/5">Close</button>
            <button onClick={() => saveMut.mutate()} disabled={!dirty || saveMut.isPending}
                    className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-[#0E8A4B] text-white text-[13px] font-extrabold shadow-[0_3px_0_0_#073D22] hover:bg-[#0A6E3C] disabled:opacity-50 transition">
              {saveMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {dirty ? "Save advanced" : "Saved"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

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
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { CouponsPage } from "./pages/CouponsPage";
import { ShippingPage } from "./pages/ShippingPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { PagesPage } from "./pages/PagesPage";
import { WebsiteStorePage } from "./pages/WebsiteStorePage";

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
    case "analytics": return <AnalyticsPage />;
    case "coupons": return <CouponsPage />;
    case "shipping": return <ShippingPage />;
    case "payments": return <PaymentsPage />;
    case "pages":    return <PagesPage />;
    case "sections": return <PagesPage />;
    case "store":    return <WebsiteStorePage />;
    default:         return <SiteSubPagePlaceholder pageKey={key} />;
  }
};
