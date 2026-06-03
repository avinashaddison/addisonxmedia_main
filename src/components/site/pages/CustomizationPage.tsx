import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Loader2, Plus, X, Trash2, ArrowUp, ArrowDown, Save,
  Smartphone, Tablet, Monitor, ExternalLink, Sparkles, RotateCcw,
  Layers, FileText, Palette, LayoutGrid, Package, Image as ImageIcon,
  MessageCircle, HelpCircle, Star, Clock, ClipboardList, Phone,
  ChevronLeft, Rocket, CheckCircle2, Eye, EyeOff, Upload, Code, Shield,
  Activity, BarChart, Settings, Mail, Info, Wrench, Menu, Check,
  IndianRupee
} from "lucide-react";
import { api, type SitePageDto, type SiteSection, type SiteDto } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCloudinaryConfig, useCloudinaryUpload } from "@/hooks/useCloudinaryUpload";

// Section library
const SECTION_LIBRARY: Array<{
  type: SiteSection["type"]; label: string; description: string; icon: any; defaults: Record<string, unknown>;
}> = [
  { type: "hero",         label: "Hero Banner",   description: "Big top banner with tagline + CTAs", icon: Sparkles,
    defaults: { headline: "", subheadline: "", primary_cta: "Order on WhatsApp" } },
  { type: "products",     label: "Products",      description: "Auto-pulled active products grid", icon: Package,
    defaults: { heading: "Browse products", limit: 0 } },
  { type: "about",        label: "About Us",      description: "About business description block", icon: FileText,
    defaults: { heading: "About us", body: "" } },
  { type: "gallery",      label: "Gallery",       description: "Photo grid (paste image URLs)", icon: ImageIcon,
    defaults: { heading: "Gallery", images: [] } },
  { type: "testimonials", label: "Testimonials",  description: "Customer reviews list", icon: Star,
    defaults: { heading: "What customers say", items: [] } },
  { type: "faq",          label: "FAQ",           description: "Frequently asked questions list", icon: HelpCircle,
    defaults: { heading: "Frequently asked", items: [] } },
  { type: "hours",        label: "Hours",         description: "Business hours block", icon: Clock,
    defaults: { heading: "Hours" } },
  { type: "leadform",     label: "Lead Form",     description: "CRM query capture form", icon: ClipboardList,
    defaults: { heading: "Get in touch", description: "We'll reply on WhatsApp." } },
  { type: "contact",      label: "Contact Cards",  description: "WhatsApp + UPI + social cards", icon: Phone,
    defaults: { heading: "Reach us" } },
  { type: "feature_grid", label: "Feature Grid",  description: "Benefits list with icons", icon: LayoutGrid,
    defaults: { heading: "Why choose us", items: [
      { icon: "⚡", title: "Fast", description: "Lightning fast delivery" },
      { icon: "🛡️", title: "Secure", description: "100% safe payments" },
      { icon: "💬", title: "Support", description: "WhatsApp support included" },
    ] } },
  { type: "stats",        label: "Stats Strip",   description: "Performance metrics dashboard", icon: BarChart,
    defaults: { heading: "", items: [
      { value: "10K+", label: "Happy customers" },
      { value: "4.9★", label: "Average rating" },
      { value: "⚡30s", label: "Delivery time" },
    ] } },
  { type: "cta_banner",   label: "CTA Banner",    description: "Full-width call-to-action bar", icon: Info,
    defaults: { heading: "Ready to get started?", description: "", cta_text: "Get Started", cta_link: "#products" } },
  { type: "pricing_table", label: "Pricing Table", description: "Tiered subscription / price cards", icon: IndianRupee,
    defaults: { heading: "Choose your plan", items: [
      { name: "Starter", price: "₹199", period: "one-time", features: ["Basic access", "Email support"], highlighted: false },
      { name: "Pro", price: "₹499", period: "one-time", features: ["Full access", "WhatsApp support", "Free updates"], highlighted: true },
    ] } },
  { type: "countdown_timer", label: "Countdown Timer", description: "Urgency counter for promo offers", icon: Clock,
    defaults: { heading: "Limited time offer", description: "Don't miss out!", end_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0] } },
  { type: "video_embed",  label: "Video Embed",    description: "YouTube or Vimeo media player", icon: Info,
    defaults: { heading: "Watch how it works", video_url: "" } },
];

const sectionMeta = (type: string) => SECTION_LIBRARY.find((s) => s.type === type) || SECTION_LIBRARY[0];

type Device = "mobile" | "tablet" | "desktop";
const DEVICE_WIDTH: Record<Device, number> = { mobile: 380, tablet: 768, desktop: 1200 };

export const CustomizationPage = () => {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"branding" | "pages" | "layout" | "advanced">("branding");
  const [device, setDevice] = useState<Device>("desktop");
  const [iframeKey, setIframeKey] = useState(0);

  // Queries
  const { data: site, isLoading: siteLoading } = useQuery({
    queryKey: ["site-me"],
    queryFn: () => api.getSite(),
    staleTime: 30_000,
  });

  const { data: pages = [], isLoading: pagesLoading } = useQuery({
    queryKey: ["site-pages"],
    queryFn: () => api.getSitePages(),
    staleTime: 30_000,
  });

  // Active page selector
  const selectedPageId = searchParams.get("page");
  const activePage = useMemo(() => {
    if (!pages.length) return null;
    return pages.find((p) => p.id === selectedPageId) || pages[0];
  }, [pages, selectedPageId]);

  // Set initial page in search params if none
  useEffect(() => {
    if (!selectedPageId && pages.length > 0) {
      setSearchParams((p) => { p.set("page", pages[0].id); return p; }, { replace: true });
    }
  }, [pages, selectedPageId, setSearchParams]);

  const previewPath = activePage?.path === "/" ? "" : activePage?.path || "";
  const previewUrl = site ? `/biz/${site.slug}${previewPath}?preview=draft` : "";

  if (siteLoading || pagesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#FFF6E8]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0E8A4B]" />
      </div>
    );
  }

  if (!site) return null;

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#FFF6E8]">
      
      {/* LEFT PANEL: Workspace Settings & Control Panel */}
      <aside className="w-full md:w-[480px] lg:w-[520px] flex-shrink-0 bg-white border-r-2 border-[#E8B968] flex flex-col overflow-hidden">
        
        {/* Navigation Tabs */}
        <div className="flex-shrink-0 border-b border-[#E8B968]/60 bg-[#FFF6E8]/20 p-2 flex gap-1">
          {[
            { id: "branding", label: "Branding", icon: Wrench },
            { id: "pages", label: "Pages", icon: Layers },
            { id: "layout", label: "Layout & Sections", icon: LayoutGrid },
            { id: "advanced", label: "Advanced", icon: Settings },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id as any);
                  if (t.id === "layout" && !selectedPageId && pages.length > 0) {
                    setSearchParams((p) => { p.set("page", pages[0].id); return p; });
                  }
                }}
                className={cn(
                  "flex-1 flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-[11px] font-extrabold transition",
                  active 
                    ? "bg-[#0E8A4B] text-white shadow-sm" 
                    : "text-foreground/60 hover:bg-[#FFE8C7]/40 hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {activeTab === "branding" && <BrandingTab site={site} />}
          
          {activeTab === "pages" && (
            <PagesTab 
              pages={pages} 
              activePageId={activePage?.id || ""} 
              onSelectPage={(id) => {
                setSearchParams((p) => { p.set("page", id); return p; });
                setActiveTab("layout");
              }} 
            />
          )}
          
          {activeTab === "layout" && activePage && (
            <LayoutTab 
              site={site} 
              page={activePage} 
              pages={pages} 
              onSelectPage={(id) => setSearchParams((p) => { p.set("page", id); return p; })}
              onRefreshPreview={() => setIframeKey((k) => k + 1)}
            />
          )}

          {activeTab === "advanced" && <AdvancedTab site={site} />}
        </div>
      </aside>

      {/* RIGHT PANEL: Live Iframe Preview (Interactive Site Simulator) */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#3D1A00]/5 p-4 sm:p-6 items-center justify-center">
        <div className="w-full max-w-5xl flex items-center justify-between mb-3 bg-white border border-[#E8B968] p-2 rounded-xl shadow-sm">
          
          {/* Active Preview Page Indicator */}
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-[11.5px] font-extrabold text-foreground/75">
              Simulating: <span className="font-mono bg-[#FFF6E8] px-1.5 py-0.5 rounded border border-[#E8B968]/60 text-foreground font-bold">{activePage?.path || "/"}</span>
            </span>
          </div>

          {/* Viewport size simulator toggles */}
          <div className="flex items-center gap-0.5 bg-[#FFF1D6] border border-[#E8B968] p-0.5 rounded-lg">
            {[
              { id: "mobile" as const, icon: Smartphone, label: "Mobile" },
              { id: "tablet" as const, icon: Tablet, label: "Tablet" },
              { id: "desktop" as const, icon: Monitor, label: "Desktop" }
            ].map((v) => {
              const Icon = v.icon;
              return (
                <button
                  key={v.id}
                  onClick={() => setDevice(v.id)}
                  title={v.label}
                  className={cn(
                    "w-7.5 h-7.5 rounded-md flex items-center justify-center transition-all",
                    device === v.id ? "bg-[#0E8A4B] text-white shadow-sm" : "text-foreground/50 hover:text-foreground"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Simulator Viewport */}
        <div 
          className="bg-white rounded-2xl shadow-xl border border-foreground/10 overflow-hidden flex-1 transition-all duration-300 w-full"
          style={{
            maxWidth: device === "desktop" ? "100%" : DEVICE_WIDTH[device],
          }}
        >
          {previewUrl ? (
            <iframe 
              key={iframeKey}
              src={previewUrl} 
              className="w-full h-full border-none bg-white" 
              title="Simulator Frame"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-foreground/45 text-[12px] italic">
              Loading simulator...
            </div>
          )}
        </div>
      </main>

    </div>
  );
};

// ─── SUB-COMPONENTS: TAB PANELS ───────────────────────────────────────────

// TAB 1: BRANDING & BUSINESS INFO
const BrandingTab = ({ site }: { site: SiteDto }) => {
  const qc = useQueryClient();
  const { data: cloudConfig } = useCloudinaryConfig();
  const { upload: uploadLogo, progress: logoProgress, uploading: logoUploading } = useCloudinaryUpload();
  const { upload: uploadCover, progress: coverProgress, uploading: coverUploading } = useCloudinaryUpload();
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [copy, setCopy] = useState({
    business_name: site.copy?.business_name || "",
    tagline: site.copy?.tagline || "",
    about: site.copy?.about || "",
  });

  const [contacts, setContacts] = useState({
    phone: site.copy?.phone || "",
    email: site.copy?.email || "",
  });

  useEffect(() => {
    setCopy({
      business_name: site.copy?.business_name || "",
      tagline: site.copy?.tagline || "",
      about: site.copy?.about || "",
    });
    setContacts({
      phone: site.copy?.phone || "",
      email: site.copy?.email || "",
    });
  }, [site]);

  const copyDirty = copy.business_name !== (site.copy?.business_name || "") ||
                    copy.tagline !== (site.copy?.tagline || "") ||
                    copy.about !== (site.copy?.about || "");

  const contactsDirty = contacts.phone !== (site.copy?.phone || "") ||
                        contacts.email !== (site.copy?.email || "");

  const saveCopy = async () => {
    try {
      const updated = await api.updateSite({
        copy: {
          ...(site.copy || {}),
          ...copy,
        }
      });
      qc.setQueryData(["site-me"], updated);
      toast.success("Branding details updated");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const saveContacts = async () => {
    try {
      const updated = await api.updateSite({
        copy: {
          ...(site.copy || {}),
          ...contacts,
        }
      });
      qc.setQueryData(["site-me"], updated);
      toast.success("Contact settings updated");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // Image uploads (logo/cover)
  const saveImage = async (key: "logo_url" | "cover_url", url: string | null) => {
    try {
      const updated = await api.updateSite({
        copy: {
          ...(site.copy || {}),
          [key]: url ?? "",
        }
      });
      qc.setQueryData(["site-me"], updated);
      toast.success(url ? "Image uploaded successfully" : "Image removed");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleUpload = async (file: File, kind: "logo" | "cover") => {
    if (!cloudConfig?.enabled || !cloudConfig.cloudName || !cloudConfig.uploadPreset) {
      toast.error("Cloud image upload not configured");
      return;
    }
    try {
      const fn = kind === "logo" ? uploadLogo : uploadCover;
      const res = await fn(file, { cloudName: cloudConfig.cloudName, uploadPreset: cloudConfig.uploadPreset }, "image");
      await saveImage(kind === "logo" ? "logo_url" : "cover_url", res.secure_url);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // Visibility section helper
  const isTruthy = (v: unknown) => v === true || v === "true" || v === 1 || v === "1";
  const hideToggles: Array<{ key: "products" | "hours" | "address" | "contact" | "leadform"; label: string; desc: string }> = [
    { key: "products", label: "Catalog Grid", desc: "Display digital & physical items catalog storefront" },
    { key: "leadform", label: "Lead Capture Form", desc: "Form to send inquiries to CRM inbox" },
    { key: "contact", label: "Social Cards", desc: "WhatsApp, UPI pay, email links" },
    { key: "hours", label: "Operational Hours", desc: "Display schedule times" },
    { key: "address", label: "Physical Address", desc: "Store address locations" },
  ];

  const toggleSection = async (key: string, currentVal: boolean) => {
    try {
      const updated = await api.updateSite({
        copy: {
          ...(site.copy || {}),
          [`hide_${key}`]: !currentVal,
        }
      });
      qc.setQueryData(["site-me"], updated);
      toast.success(!currentVal ? "Section hidden" : "Section visible");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Block 1: Copy Text */}
      <div className="bg-[#FFF6E8]/30 border border-[#E8B968]/60 p-4 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[12px] font-black uppercase tracking-wider text-foreground/75">Store Info & Copy</h4>
          {copyDirty && (
            <button 
              onClick={saveCopy}
              className="inline-flex items-center gap-1 h-7 px-3 rounded-lg bg-[#0E8A4B] text-white text-[11px] font-extrabold shadow-[0_2px_0_0_#073D22] transition"
            >
              <Save className="w-3 h-3" /> Save Info
            </button>
          )}
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 mb-1 block">Business Name</label>
            <input 
              value={copy.business_name} 
              onChange={(e) => setCopy({ ...copy, business_name: e.target.value })}
              placeholder="Store Name"
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[12.5px] font-bold"
            />
          </div>
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 mb-1 block">Tagline / Pitch</label>
            <input 
              value={copy.tagline} 
              onChange={(e) => setCopy({ ...copy, tagline: e.target.value })}
              placeholder="Tagline pitch line"
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[12.5px]"
            />
          </div>
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 mb-1 block">About Description</label>
            <textarea 
              value={copy.about} 
              onChange={(e) => setCopy({ ...copy, about: e.target.value })}
              placeholder="About our services"
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[12px] leading-relaxed resize-none"
            />
          </div>
        </div>
      </div>

      {/* Block 2: Branding assets (Logo & Cover) */}
      <div className="bg-[#FFF6E8]/30 border border-[#E8B968]/60 p-4 rounded-2xl space-y-4">
        <h4 className="text-[12px] font-black uppercase tracking-wider text-foreground/75">Visual Assets</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Logo square */}
          <div className="space-y-2">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 block">Store Logo</label>
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 rounded-xl border border-[#E8B968] overflow-hidden bg-foreground/5 flex-shrink-0 flex items-center justify-center">
                {(site.copy as any)?.logo_url ? (
                  <img src={(site.copy as any).logo_url} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-foreground/30" />
                )}
                {logoUploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[9px] font-extrabold">
                    {logoProgress}%
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <input ref={logoRef} type="file" accept="image/*" className="hidden" 
                       onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "logo"); }} />
                <button 
                  onClick={() => logoRef.current?.click()}
                  className="h-8 px-2.5 rounded-lg bg-[#FFF1D6] hover:bg-[#FFE8C7] border border-[#E8B968] text-[11px] font-extrabold text-[#B8651A] transition"
                >
                  Change Logo
                </button>
                {(site.copy as any)?.logo_url && (
                  <button 
                    onClick={() => saveImage("logo_url", null)}
                    className="block text-[10px] font-bold text-[#D4308E] hover:underline"
                  >
                    Remove Logo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Hero Cover */}
          <div className="space-y-2">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 block">Hero Cover Photo</label>
            <div className="flex items-center gap-3">
              <div className="relative w-24 h-16 rounded-xl border border-[#E8B968] overflow-hidden bg-foreground/5 flex-shrink-0 flex items-center justify-center">
                {(site.copy as any)?.cover_url ? (
                  <img src={(site.copy as any).cover_url} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-foreground/30" />
                )}
                {coverUploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[9px] font-extrabold">
                    {coverProgress}%
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <input ref={coverRef} type="file" accept="image/*" className="hidden" 
                       onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "cover"); }} />
                <button 
                  onClick={() => coverRef.current?.click()}
                  className="h-8 px-2.5 rounded-lg bg-[#FFF1D6] hover:bg-[#FFE8C7] border border-[#E8B968] text-[11px] font-extrabold text-[#B8651A] transition"
                >
                  Change Cover
                </button>
                {(site.copy as any)?.cover_url && (
                  <button 
                    onClick={() => saveImage("cover_url", null)}
                    className="block text-[10px] font-bold text-[#D4308E] hover:underline"
                  >
                    Remove Cover
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Block 3: Contact overrides */}
      <div className="bg-[#FFF6E8]/30 border border-[#E8B968]/60 p-4 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[12px] font-black uppercase tracking-wider text-foreground/75">Contact Settings</h4>
          {contactsDirty && (
            <button 
              onClick={saveContacts}
              className="inline-flex items-center gap-1 h-7 px-3 rounded-lg bg-[#0E8A4B] text-white text-[11px] font-extrabold shadow-[0_2px_0_0_#073D22] transition"
            >
              <Save className="w-3 h-3" /> Save Contacts
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 mb-1 block">Phone / WhatsApp</label>
            <input 
              value={contacts.phone} 
              onChange={(e) => setContacts({ ...contacts, phone: e.target.value })}
              placeholder="e.g. +91 98..."
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[12.5px]"
            />
          </div>
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 mb-1 block">Support Email</label>
            <input 
              value={contacts.email} 
              onChange={(e) => setContacts({ ...contacts, email: e.target.value })}
              placeholder="e.g. support@..."
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[12.5px]"
            />
          </div>
        </div>
      </div>

      {/* Block 4: Visibility triggers */}
      <div className="bg-[#FFF6E8]/30 border border-[#E8B968]/60 p-4 rounded-2xl space-y-3">
        <h4 className="text-[12px] font-black uppercase tracking-wider text-foreground/75">Visible Sections</h4>
        <ul className="divide-y divide-[#E8B968]/30">
          {hideToggles.map((tog) => {
            const hidden = isTruthy((site.copy as any)?.[`hide_${tog.key}`]);
            return (
              <li key={tog.key} className="flex items-center justify-between py-2.5">
                <div>
                  <span className="text-[12.5px] font-extrabold text-foreground/80">{tog.label}</span>
                  <p className="text-[10.5px] text-foreground/45">{tog.desc}</p>
                </div>
                <button
                  onClick={() => toggleSection(tog.key, hidden)}
                  className={cn(
                    "relative w-10 h-5 rounded-full transition flex-shrink-0",
                    !hidden ? "bg-[#0E8A4B]" : "bg-foreground/20"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                    !hidden ? "translate-x-[22px]" : "translate-x-0.5"
                  )} />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

    </div>
  );
};

// TAB 2: PAGES MULTI-PAGE MANAGER
const PagesTab = ({ pages, activePageId, onSelectPage }: {
  pages: SitePageDto[]; activePageId: string; onSelectPage: (id: string) => void;
}) => {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [path, setPath] = useState("/");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const p = await api.createSitePage({ path, title: title.trim() || undefined, sections: [] });
      toast.success("Page created");
      qc.invalidateQueries({ queryKey: ["site-pages"] });
      onSelectPage(p.id);
      setShowNew(false);
      setPath("/");
      setTitle("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete page "${name}"?`)) return;
    try {
      await api.deleteSitePage(id);
      toast.success("Page deleted");
      qc.invalidateQueries({ queryKey: ["site-pages"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[12px] font-black uppercase tracking-wider text-foreground/75">Pages List ({pages.length})</h4>
        <button 
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-1 h-7 px-3 rounded-lg bg-[#0E8A4B] text-white text-[11px] font-extrabold hover:bg-[#0A6E3C] transition"
        >
          <Plus className="w-3.5 h-3.5" /> Add Page
        </button>
      </div>

      {showNew && (
        <div className="bg-[#FFF6E8]/40 border border-[#E8B968] p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase text-foreground/70">Create New Route</span>
            <button onClick={() => setShowNew(false)} className="text-foreground/50 hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-2">
            <input 
              value={path} 
              onChange={(e) => setPath(e.target.value)} 
              placeholder="/route-path"
              className="w-full px-3 py-1.5 rounded-lg border border-[#E8B968] text-[12px] font-mono font-bold focus:outline-none"
            />
            <input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Display Title"
              className="w-full px-3 py-1.5 rounded-lg border border-[#E8B968] text-[12px] focus:outline-none"
            />
            <button 
              onClick={handleCreate}
              disabled={saving}
              className="w-full h-8 bg-[#0E8A4B] text-white text-[11px] font-extrabold rounded-lg disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Page"}
            </button>
          </div>
        </div>
      )}

      <ul className="divide-y divide-[#E8B968]/30 border border-[#E8B968]/60 rounded-2xl overflow-hidden bg-white">
        {pages.map((p) => {
          const isActive = p.id === activePageId;
          const displayTitle = p.title || (p.path === "/" ? "Home" : p.path);
          return (
            <li 
              key={p.id}
              className={cn(
                "flex items-center justify-between p-3.5 transition cursor-pointer hover:bg-[#FFF6E8]/20",
                isActive && "bg-[#E6F7EE]/60 border-l-4 border-[#0E8A4B]"
              )}
              onClick={() => onSelectPage(p.id)}
            >
              <div className="flex items-center gap-2">
                <FileText className={cn("w-4 h-4", isActive ? "text-[#0E8A4B]" : "text-foreground/45")} />
                <div>
                  <span className="text-[12.5px] font-extrabold block">{displayTitle}</span>
                  <code className="text-[9.5px] font-mono text-foreground/50">{p.path}</code>
                </div>
              </div>
              
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {p.path !== "/" && (
                  <button 
                    onClick={() => handleDelete(p.id, displayTitle)}
                    className="w-7 h-7 rounded hover:bg-[#FCE5F0] text-[#D4308E] flex items-center justify-center transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button 
                  onClick={() => onSelectPage(p.id)}
                  className="h-7 px-2.5 rounded-lg bg-[#FFF1D6] hover:bg-[#FFE8C7] border border-[#E8B968]/80 text-[10.5px] font-extrabold text-[#B8651A]"
                >
                  Layout
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

// TAB 3: SECTIONS LAYOUT BUILDER & PROPERTIES
const LayoutTab = ({ site, page, pages, onSelectPage, onRefreshPreview }: {
  site: { slug: string };
  page: SitePageDto;
  pages: SitePageDto[];
  onSelectPage: (id: string) => void;
  onRefreshPreview: () => void;
}) => {
  const qc = useQueryClient();
  const initialSections = (page.draft_sections ?? page.sections ?? []) as SiteSection[];
  const [sections, setSections] = useState<SiteSection[]>(initialSections);
  const [showAdd, setShowAdd] = useState(false);
  const [activeSectionIdx, setActiveSectionIdx] = useState<number | null>(initialSections.length > 0 ? 0 : null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Sync state if active page changes
  useEffect(() => {
    setSections(initialSections);
    setActiveSectionIdx(initialSections.length > 0 ? 0 : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id]);

  const dirty = useMemo(
    () => JSON.stringify(sections) !== JSON.stringify(page.sections || []),
    [sections, page.sections]
  );

  // Debounced auto-save of draft sections
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (JSON.stringify(sections) === JSON.stringify(page.draft_sections || [])) return;
    
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await api.updateSitePage(page.id, { draft_sections: sections });
        setLastSaved(new Date());
        onRefreshPreview();
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setSaving(false);
      }
    }, 600);
    
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, page.id]);

  const addSection = (type: SiteSection["type"]) => {
    const meta = SECTION_LIBRARY.find((s) => s.type === type)!;
    const next = [...sections, { id: `s_${Math.random().toString(36).slice(2, 10)}`, type, props: { ...meta.defaults } }];
    setSections(next);
    setActiveSectionIdx(next.length - 1);
    setShowAdd(false);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...sections];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setSections(next);
    setActiveSectionIdx(swap);
  };

  const remove = (idx: number) => {
    setSections(sections.filter((_, i) => i !== idx));
    setActiveSectionIdx(null);
  };

  const updateProps = (idx: number, props: Record<string, unknown>) => {
    setSections(sections.map((s, i) => i === idx ? { ...s, props: { ...s.props, ...props } } : s));
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
      await api.updateSitePage(page.id, { draft_sections: sections });
      await api.publishSitePage(page.id);
      toast.success("Page layout published live!");
      qc.invalidateQueries({ queryKey: ["site-pages"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPublishing(false);
    }
  };

  const handleDiscard = async () => {
    if (!confirm("Revert page layout to last published version?")) return;
    try {
      const updated = await api.discardSitePageDraft(page.id);
      setSections((updated.draft_sections ?? updated.sections ?? []) as SiteSection[]);
      toast.success("Draft changes discarded");
      qc.invalidateQueries({ queryKey: ["site-pages"] });
      onRefreshPreview();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Target Page Selector dropdown */}
      <div className="flex items-center justify-between gap-3 p-3 bg-[#FFF6E8]/40 border border-[#E8B968]/70 rounded-xl">
        <label className="text-[11px] font-extrabold uppercase text-foreground/55">Active Page:</label>
        <select
          value={page.id}
          onChange={(e) => onSelectPage(e.target.value)}
          className="flex-1 max-w-[200px] h-8 pl-2 pr-6 rounded-lg bg-white border border-[#E8B968] text-[12px] font-bold focus:outline-none"
        >
          {pages.map((p) => (
            <option key={p.id} value={p.id}>{p.title || (p.path === "/" ? "Home" : p.path)}</option>
          ))}
        </select>
      </div>

      {/* Auto save/Draft status banner */}
      <div className="flex items-center justify-between gap-2 p-2 bg-[#FFF6E8]/30 rounded-lg text-[10.5px]">
        <span className="font-extrabold text-foreground/50">
          {saving ? "Saving draft..." : dirty ? "Unpublished draft edits" : "Draft matches live"}
        </span>
        <div className="flex items-center gap-1.5">
          {dirty && (
            <button onClick={handleDiscard} className="text-[#D4308E] font-bold hover:underline">
              Discard
            </button>
          )}
          <button 
            onClick={handlePublish} 
            disabled={publishing || (!dirty && !!page.last_published_at)}
            className="inline-flex items-center gap-1 px-2.5 h-6 rounded bg-[#0E8A4B] text-white font-extrabold text-[10px] shadow-[0_2px_0_0_#073D22] transition disabled:opacity-40"
          >
            {publishing ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Rocket className="w-2.5 h-2.5" />}
            Publish Page
          </button>
        </div>
      </div>

      {/* Section controller */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/55">Sections layout ({sections.length})</span>
          <button 
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-[#0E8A4B] text-white text-[11px] font-extrabold transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add Section
          </button>
        </div>

        {sections.length === 0 ? (
          <div className="text-center py-8 bg-[#FFF6E8]/10 border border-dashed border-[#E8B968] rounded-xl text-foreground/45 text-[11.5px] italic">
            No sections on this page. Add one to begin.
          </div>
        ) : (
          <ul className="space-y-2">
            {sections.map((s, idx) => {
              const isActive = activeSectionIdx === idx;
              const meta = sectionMeta(s.type);
              const Icon = meta.icon;
              return (
                <li key={s.id} className="border border-[#E8B968]/70 rounded-xl overflow-hidden bg-white shadow-sm">
                  
                  {/* Event summary / Title strip */}
                  <div 
                    onClick={() => setActiveSectionIdx(isActive ? null : idx)}
                    className={cn(
                      "flex items-center justify-between p-3.5 cursor-pointer hover:bg-[#FFF6E8]/20 transition",
                      isActive && "bg-[#E6F7EE]/40 border-b border-[#E8B968]/40"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-[#3C50E0]" />
                      <span className="text-[12.5px] font-extrabold text-foreground/80">{meta.label}</span>
                    </div>
                    
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => move(idx, -1)} disabled={idx === 0} className="w-6 h-6 rounded hover:bg-foreground/5 disabled:opacity-30 flex items-center justify-center transition"><ArrowUp className="w-3 h-3 text-foreground/60" /></button>
                      <button onClick={() => move(idx, 1)} disabled={idx === sections.length - 1} className="w-6 h-6 rounded hover:bg-foreground/5 disabled:opacity-30 flex items-center justify-center transition"><ArrowDown className="w-3 h-3 text-foreground/60" /></button>
                      <button onClick={() => remove(idx)} className="w-6 h-6 rounded hover:bg-[#FCE5F0] text-[#D4308E] flex items-center justify-center transition"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>

                  {/* Property editor inside expansion */}
                  {isActive && (
                    <div className="p-3.5 bg-[#FFF6E8]/10 border-t border-[#E8B968]/30">
                      <SectionPropsEditor section={s} onChange={(props) => updateProps(idx, props)} />
                    </div>
                  )}

                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Add section dialog modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-[#E8B968] p-4 flex items-center justify-between">
              <h3 className="text-[14px] font-black text-foreground/80">Add layout block section</h3>
              <button onClick={() => setShowAdd(false)} className="text-foreground/50 hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="p-4 grid grid-cols-2 gap-2.5 max-h-[450px] overflow-y-auto">
              {SECTION_LIBRARY.map((s) => (
                <button
                  key={s.type}
                  onClick={() => addSection(s.type)}
                  className="p-3 rounded-xl border border-[#E8B968]/70 hover:border-[#0E8A4B] hover:bg-[#E6F7EE]/60 text-left transition flex items-start gap-2.5"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#E4E8FF] text-[#3C50E0] flex items-center justify-center flex-shrink-0">
                    <s.icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[12px] font-extrabold block text-foreground/85">{s.label}</span>
                    <span className="text-[10px] text-foreground/50 leading-tight block mt-0.5">{s.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// TAB 4: ADVANCED SETTINGS
const AdvancedTab = ({ site }: { site: SiteDto }) => {
  const qc = useQueryClient();
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
  }, [site]);

  const dirty = draft.favicon_url !== (site.favicon_url || "") ||
                draft.ga4_id !== (site.ga4_id || "") ||
                draft.meta_pixel_id !== (site.meta_pixel_id || "") ||
                draft.custom_head_html !== (site.custom_head_html || "") ||
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
      toast.success("Advanced options updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4 bg-[#FFF6E8]/30 border border-[#E8B968]/60 p-4 rounded-2xl">
      <div className="flex items-center justify-between">
        <h4 className="text-[12px] font-black uppercase tracking-wider text-foreground/75">Tracking & HTML</h4>
        {dirty && (
          <button 
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="inline-flex items-center gap-1 h-7 px-3 rounded-lg bg-[#0E8A4B] text-white text-[11px] font-extrabold shadow-[0_2px_0_0_#073D22] transition disabled:opacity-50"
          >
            {saveMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save Settings
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 mb-1 block">Favicon URL</label>
          <input 
            value={draft.favicon_url} 
            onChange={(e) => setDraft({ ...draft, favicon_url: e.target.value })}
            placeholder="https://..."
            className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[11.5px] font-mono"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 mb-1 block">GA4 ID</label>
            <input 
              value={draft.ga4_id} 
              onChange={(e) => setDraft({ ...draft, ga4_id: e.target.value.toUpperCase() })}
              placeholder="G-XXXXXX"
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[12px] font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 mb-1 block">Meta Pixel ID</label>
            <input 
              value={draft.meta_pixel_id} 
              onChange={(e) => setDraft({ ...draft, meta_pixel_id: e.target.value })}
              placeholder="e.g. 102..."
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[12px] font-mono"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 mb-1 block">Custom &lt;head&gt; HTML</label>
          <textarea 
            value={draft.custom_head_html} 
            onChange={(e) => setDraft({ ...draft, custom_head_html: e.target.value })}
            placeholder="e.g. chat widgets, external scripts..."
            rows={3}
            className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[11px] font-mono resize-none"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer pt-2">
          <input 
            type="checkbox" 
            checked={draft.allow_indexing}
            onChange={(e) => setDraft({ ...draft, allow_indexing: e.target.checked })}
            className="w-4 h-4 accent-[#0E8A4B]"
          />
          <div className="flex-1">
            <span className="text-[12px] font-extrabold text-foreground/80">Allow Google index</span>
            <p className="text-[10px] text-foreground/45 mt-0.5">Allow search engines to index storefront pages</p>
          </div>
        </label>
      </div>
    </div>
  );
};

// ─── PROP EDITORS BY TYPE ──────────────────────────────────────────────────

const SectionPropsEditor = ({ section, onChange }: { section: SiteSection; onChange: (props: Record<string, unknown>) => void }) => {
  const p = section.props as Record<string, any>;
  
  if (section.type === "hero") return (
    <div className="space-y-2">
      <input value={p.headline || ""} onChange={(e) => onChange({ headline: e.target.value })} placeholder="Headline override"
             className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px] font-bold" />
      <input value={p.subheadline || ""} onChange={(e) => onChange({ subheadline: e.target.value })} placeholder="Subheadline text"
             className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px]" />
      <input value={p.primary_cta || ""} onChange={(e) => onChange({ primary_cta: e.target.value })} placeholder="Primary button text"
             className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px]" />
    </div>
  );
  
  if (section.type === "about") return (
    <div className="space-y-2">
      <input value={p.heading || ""} onChange={(e) => onChange({ heading: e.target.value })} placeholder="Heading"
             className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px] font-bold" />
      <textarea value={p.body || ""} onChange={(e) => onChange({ body: e.target.value })} placeholder="About body copy text"
                rows={3} className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px] resize-none" />
    </div>
  );
  
  if (section.type === "products") return (
    <div className="space-y-2">
      <input value={p.heading || ""} onChange={(e) => onChange({ heading: e.target.value })} placeholder="Browse products"
             className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px] font-bold" />
      <input type="number" value={p.limit || ""} onChange={(e) => onChange({ limit: Number(e.target.value) || 0 })} placeholder="Limit count (0 = show all)"
             className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px]" />
      <p className="text-[10px] text-foreground/45 italic">Automatically synchronizes with active products catalog</p>
    </div>
  );
  
  if (section.type === "gallery") {
    const images = Array.isArray(p.images) ? p.images : [];
    return (
      <div className="space-y-2">
        <input value={p.heading || ""} onChange={(e) => onChange({ heading: e.target.value })} placeholder="Gallery Heading"
               className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px] font-bold" />
        <textarea value={images.join("\n")} onChange={(e) => onChange({ images: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                  placeholder="One image URL per line" rows={3}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[11px] font-mono resize-none" />
      </div>
    );
  }
  
  if (section.type === "faq" || section.type === "testimonials") {
    const items = Array.isArray(p.items) ? p.items : [];
    const isFaq = section.type === "faq";
    return (
      <div className="space-y-2">
        <input value={p.heading || ""} onChange={(e) => onChange({ heading: e.target.value })} placeholder="Heading title"
               className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px] font-bold" />
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="flex gap-1.5 items-center">
              <input value={isFaq ? it.q || "" : it.name || ""} onChange={(e) => {
                const next = [...items]; next[idx] = isFaq ? { ...next[idx], q: e.target.value } : { ...next[idx], name: e.target.value };
                onChange({ items: next });
              }} placeholder={isFaq ? "Question text" : "Customer name"}
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[11.5px] font-bold focus:outline-none" />
              <input value={isFaq ? it.a || "" : it.text || ""} onChange={(e) => {
                const next = [...items]; next[idx] = isFaq ? { ...next[idx], a: e.target.value } : { ...next[idx], text: e.target.value };
                onChange({ items: next });
              }} placeholder={isFaq ? "Answer text" : "Review quote"}
                className="flex-[2] px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[11.5px] focus:outline-none" />
              <button onClick={() => onChange({ items: items.filter((_, i) => i !== idx) })} className="w-6 h-6 rounded hover:bg-[#FCE5F0] text-[#D4308E] flex items-center justify-center flex-shrink-0 transition"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
        <button onClick={() => onChange({ items: [...items, isFaq ? { q: "", a: "" } : { name: "", text: "" }] })}
                className="text-[10.5px] font-extrabold text-[#3C50E0] hover:underline">+ Add Card</button>
      </div>
    );
  }

  if (section.type === "feature_grid") {
    const items = Array.isArray(p.items) ? p.items : [];
    return (
      <div className="space-y-2">
        <input value={p.heading || ""} onChange={(e) => onChange({ heading: e.target.value })} placeholder="Section heading"
               className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px] font-bold" />
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="flex gap-1.5 items-center">
              <input value={it.icon || ""} onChange={(e) => { const next = [...items]; next[idx] = { ...next[idx], icon: e.target.value }; onChange({ items: next }); }} placeholder="🔥"
                     className="w-10 px-1 py-1.5 rounded-lg border border-[#E8B968] text-[12px] text-center" />
              <input value={it.title || ""} onChange={(e) => { const next = [...items]; next[idx] = { ...next[idx], title: e.target.value }; onChange({ items: next }); }} placeholder="Feature Title"
                     className="flex-1 px-2 py-1.5 rounded-lg border border-[#E8B968] text-[11.5px] font-bold" />
              <input value={it.description || ""} onChange={(e) => { const next = [...items]; next[idx] = { ...next[idx], description: e.target.value }; onChange({ items: next }); }} placeholder="Description"
                     className="flex-[2] px-2 py-1.5 rounded-lg border border-[#E8B968] text-[11px]" />
              <button onClick={() => onChange({ items: items.filter((_, i) => i !== idx) })} className="w-6 h-6 rounded hover:bg-[#FCE5F0] text-[#D4308E] flex items-center justify-center flex-shrink-0"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
        <button onClick={() => onChange({ items: [...items, { icon: "✨", title: "", description: "" }] })}
                className="text-[10.5px] font-extrabold text-[#3C50E0] hover:underline">+ Add Feature</button>
      </div>
    );
  }

  if (section.type === "stats") {
    const items = Array.isArray(p.items) ? p.items : [];
    return (
      <div className="space-y-2">
        <input value={p.heading || ""} onChange={(e) => onChange({ heading: e.target.value })} placeholder="Section heading (optional)"
               className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px] font-bold" />
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="flex gap-1.5 items-center">
              <input value={it.value || ""} onChange={(e) => { const next = [...items]; next[idx] = { ...next[idx], value: e.target.value }; onChange({ items: next }); }} placeholder="10K+"
                     className="w-20 px-2 py-1.5 rounded-lg border border-[#E8B968] text-[11.5px] font-bold" />
              <input value={it.label || ""} onChange={(e) => { const next = [...items]; next[idx] = { ...next[idx], label: e.target.value }; onChange({ items: next }); }} placeholder="Happy customers"
                     className="flex-1 px-2 py-1.5 rounded-lg border border-[#E8B968] text-[11.5px]" />
              <button onClick={() => onChange({ items: items.filter((_, i) => i !== idx) })} className="w-6 h-6 rounded hover:bg-[#FCE5F0] text-[#D4308E] flex items-center justify-center flex-shrink-0"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
        <button onClick={() => onChange({ items: [...items, { value: "", label: "" }] })}
                className="text-[10.5px] font-extrabold text-[#3C50E0] hover:underline">+ Add Metric</button>
      </div>
    );
  }

  if (section.type === "cta_banner") return (
    <div className="space-y-2">
      <input value={p.heading || ""} onChange={(e) => onChange({ heading: e.target.value })} placeholder="Banner Title"
             className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px] font-bold" />
      <input value={p.description || ""} onChange={(e) => onChange({ description: e.target.value })} placeholder="Description subtext"
             className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px]" />
      <div className="flex gap-2">
        <input value={p.cta_text || ""} onChange={(e) => onChange({ cta_text: e.target.value })} placeholder="Button label"
               className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px] font-bold" />
        <input value={p.cta_link || ""} onChange={(e) => onChange({ cta_link: e.target.value })} placeholder="Link route (e.g. #products)"
               className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px] font-mono" />
      </div>
    </div>
  );

  if (section.type === "pricing_table") {
    const items = Array.isArray(p.items) ? p.items : [];
    return (
      <div className="space-y-2">
        <input value={p.heading || ""} onChange={(e) => onChange({ heading: e.target.value })} placeholder="Pricing section heading"
               className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px] font-bold" />
        <div className="space-y-2">
          {items.map((tier, idx) => (
            <div key={idx} className="p-2.5 rounded-lg border border-[#E8B968] bg-[#FFF6E8]/20 space-y-2">
              <div className="flex gap-1.5 items-center">
                <input value={tier.name || ""} onChange={(e) => { const next = [...items]; next[idx] = { ...next[idx], name: e.target.value }; onChange({ items: next }); }} placeholder="Plan name"
                       className="flex-1 px-2 py-1 rounded border border-[#E8B968] text-[11px] font-bold focus:outline-none" />
                <input value={tier.price || ""} onChange={(e) => { const next = [...items]; next[idx] = { ...next[idx], price: e.target.value }; onChange({ items: next }); }} placeholder="₹499"
                       className="w-16 px-2 py-1 rounded border border-[#E8B968] text-[11px] font-bold focus:outline-none" />
                <label className="flex items-center gap-0.5 text-[9.5px] font-bold cursor-pointer">
                  <input type="checkbox" checked={tier.highlighted || false} onChange={(e) => { const next = [...items]; next[idx] = { ...next[idx], highlighted: e.target.checked }; onChange({ items: next }); }} className="w-3 h-3 accent-[#0E8A4B]" />
                  Pop
                </label>
                <button onClick={() => onChange({ items: items.filter((_, i) => i !== idx) })} className="w-6 h-6 rounded hover:bg-[#FCE5F0] text-[#D4308E] flex items-center justify-center flex-shrink-0"><X className="w-3 h-3" /></button>
              </div>
              <input value={(tier.features || []).join(", ")} onChange={(e) => { const next = [...items]; next[idx] = { ...next[idx], features: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }; onChange({ items: next }); }} placeholder="Features lists (comma separated)"
                     className="w-full px-2 py-1 rounded border border-[#E8B968] text-[10px] focus:outline-none" />
            </div>
          ))}
        </div>
        <button onClick={() => onChange({ items: [...items, { name: "", price: "", features: [], highlighted: false }] })}
                className="text-[10.5px] font-extrabold text-[#3C50E0] hover:underline">+ Add Plan tier</button>
      </div>
    );
  }

  if (section.type === "countdown_timer") return (
    <div className="space-y-2">
      <input value={p.heading || ""} onChange={(e) => onChange({ heading: e.target.value })} placeholder="Urgency Title"
             className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px] font-bold" />
      <input value={p.description || ""} onChange={(e) => onChange({ description: e.target.value })} placeholder="Urgency description copy"
             className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px]" />
      <div>
        <label className="text-[9.5px] font-extrabold uppercase text-foreground/50 block mb-0.5">End Date Target</label>
        <input type="date" value={p.end_date || ""} onChange={(e) => onChange({ end_date: e.target.value })}
               className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px] font-mono" />
      </div>
    </div>
  );

  if (section.type === "video_embed") return (
    <div className="space-y-2">
      <input value={p.heading || ""} onChange={(e) => onChange({ heading: e.target.value })} placeholder="Heading"
             className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px] font-bold" />
      <input value={p.video_url || ""} onChange={(e) => onChange({ video_url: e.target.value })} placeholder="YouTube or Vimeo url link"
             className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[11.5px] font-mono focus:outline-none" />
    </div>
  );

  return <p className="text-[10.5px] text-foreground/45 italic font-medium">Automatic fields — no additional configuration properties</p>;
};
