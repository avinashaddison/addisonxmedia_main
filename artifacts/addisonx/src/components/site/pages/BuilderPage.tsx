/**
 * Live Builder — split-screen editor with iframe preview.
 *
 *   Left pane:  page list + section list + per-section property editor
 *   Right pane: iframe to /biz/<slug>?preview=draft, auto-refreshes ~600ms
 *               after any edit. Mobile / Tablet / Desktop preview toggle.
 *
 * Data flow:
 *   - Section edits update local React state
 *   - Debounced save to PATCH /api/site/pages/:id with {draft_sections: [...]}
 *   - On save success, iframe reloads to reflect draft
 *   - "Publish" button calls POST /api/site/pages/:id/publish → live site updated
 *   - "Discard" reverts draft to last-published state
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Loader2, Plus, X, Trash2, ArrowUp, ArrowDown, Save,
  Smartphone, Tablet, Monitor, ExternalLink, Sparkles, RotateCcw,
  Layers, FileText, Palette, LayoutGrid, Package, Image as ImageIcon,
  MessageCircle, HelpCircle, Star, Clock, ClipboardList, Phone,
  ChevronLeft, Rocket, CheckCircle2,
} from "lucide-react";
import { api, type SitePageDto, type SiteSection } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SECTION_LIBRARY: Array<{ type: SiteSection["type"]; label: string; description: string; icon: any; defaults: Record<string, unknown> }> = [
  { type: "hero",         label: "Hero",         description: "Big top banner",         icon: Sparkles,      defaults: { headline: "", subheadline: "", primary_cta: "Order on WhatsApp" } },
  { type: "products",     label: "Products",     description: "Auto-pulled grid",       icon: Package,       defaults: { heading: "", limit: 0 } },
  { type: "about",        label: "About",        description: "About-us text block",    icon: FileText,      defaults: { heading: "", body: "" } },
  { type: "gallery",      label: "Gallery",      description: "Photo grid",             icon: ImageIcon,     defaults: { heading: "Gallery", images: [] } },
  { type: "testimonials", label: "Testimonials", description: "Customer reviews",       icon: Star,          defaults: { heading: "What customers say", items: [] } },
  { type: "faq",          label: "FAQ",          description: "Q&A list",               icon: HelpCircle,    defaults: { heading: "Frequently asked", items: [] } },
  { type: "hours",        label: "Hours",        description: "Business hours",         icon: Clock,         defaults: {} },
  { type: "leadform",     label: "Lead form",    description: "Capture leads → CRM",    icon: ClipboardList, defaults: { heading: "Get in touch", description: "We'll reply on WhatsApp." } },
  { type: "contact",      label: "Contact",      description: "WhatsApp, UPI, social",  icon: Phone,         defaults: {} },
];
const sectionMeta = (type: string) => SECTION_LIBRARY.find((s) => s.type === type) || SECTION_LIBRARY[0];

type Device = "mobile" | "tablet" | "desktop";
const DEVICE_WIDTH: Record<Device, number> = { mobile: 380, tablet: 768, desktop: 1200 };

export const BuilderPage = () => {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedPageId = searchParams.get("page");

  const { data: site } = useQuery({ queryKey: ["site-me"], queryFn: () => api.getSite() });
  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["site-pages"],
    queryFn: () => api.getSitePages(),
  });

  // Auto-select first page if none selected
  useEffect(() => {
    if (!selectedPageId && pages.length > 0) {
      setSearchParams((p) => { p.set("page", pages[0].id); return p; }, { replace: true });
    }
  }, [pages, selectedPageId, setSearchParams]);

  const page = pages.find((p) => p.id === selectedPageId);

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center bg-[#FFF6E8]"><Loader2 className="w-6 h-6 animate-spin text-foreground/40" /></div>;
  }
  if (!site) return null;
  if (pages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#FFF6E8] p-6">
        <div className="text-center max-w-md">
          <Layers className="w-12 h-12 text-[#3C50E0] mx-auto mb-3" />
          <h2 className="text-[18px] font-black mb-1">No pages to build yet</h2>
          <p className="text-[13px] text-foreground/65 mb-4">Create your first page in Pages, then come back here to design it.</p>
          <a href="/app/site/pages" className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0E8A4B] text-white font-extrabold text-[13px] shadow-[0_4px_0_0_#073D22] hover:bg-[#0A6E3C] transition">
            <Plus className="w-4 h-4" /> Create a page
          </a>
        </div>
      </div>
    );
  }

  if (!page) return <div className="flex-1 flex items-center justify-center bg-[#FFF6E8]"><Loader2 className="w-6 h-6 animate-spin text-foreground/40" /></div>;

  return (
    <BuilderEditor
      key={page.id}
      site={site}
      page={page}
      pages={pages}
      onSelectPage={(id) => setSearchParams((p) => { p.set("page", id); return p; })}
      onSaved={() => qc.invalidateQueries({ queryKey: ["site-pages"] })}
    />
  );
};

// ─── Editor ────────────────────────────────────────────────────────────────

const BuilderEditor = ({ site, page, pages, onSelectPage, onSaved }: {
  site: { slug: string };
  page: SitePageDto;
  pages: SitePageDto[];
  onSelectPage: (id: string) => void;
  onSaved: () => void;
}) => {
  const initialSections = (page.draft_sections ?? page.sections ?? []) as SiteSection[];
  const [sections, setSections] = useState<SiteSection[]>(initialSections);
  const [device, setDevice] = useState<Device>("desktop");
  const [showAdd, setShowAdd] = useState(false);
  const [activeSectionIdx, setActiveSectionIdx] = useState<number | null>(initialSections.length > 0 ? 0 : null);
  const [iframeKey, setIframeKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const dirty = useMemo(
    () => JSON.stringify(sections) !== JSON.stringify(page.sections || []),
    [sections, page.sections],
  );

  // Debounced auto-save of drafts
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (JSON.stringify(sections) === JSON.stringify(page.draft_sections || [])) return;
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await api.updateSitePage(page.id, { draft_sections: sections });
        setLastSaved(new Date());
        setIframeKey((k) => k + 1);  // bump iframe to reload preview
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

  const publish = async () => {
    setPublishing(true);
    try {
      // Ensure latest draft is saved first
      if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
      await api.updateSitePage(page.id, { draft_sections: sections });
      await api.publishSitePage(page.id);
      toast.success("Published — your site is updated");
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
    finally { setPublishing(false); }
  };

  const discard = async () => {
    if (!confirm("Discard all unpublished changes? Your last published version will be restored.")) return;
    try {
      const updated = await api.discardSitePageDraft(page.id);
      setSections((updated.draft_sections ?? updated.sections ?? []) as SiteSection[]);
      setIframeKey((k) => k + 1);
      toast.success("Discarded — back to last published");
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
  };

  const previewUrl = `/biz/${site.slug}${page.path === "/" ? "" : page.path}?preview=draft`;
  const publicUrl = `/biz/${site.slug}${page.path === "/" ? "" : page.path}`;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#FFF6E8]">
      {/* Top bar */}
      <div className="flex-shrink-0 bg-white border-b-2 border-[#E8B968] px-3 sm:px-5 py-2.5 flex items-center gap-2 sm:gap-3">
        <a href="/app/site/pages" className="inline-flex items-center gap-1 h-9 px-2 rounded-lg hover:bg-foreground/5 text-foreground/65 hover:text-foreground text-[12px] font-extrabold transition" title="Back to Pages">
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Pages</span>
        </a>

        {/* Page picker */}
        <select
          value={page.id}
          onChange={(e) => onSelectPage(e.target.value)}
          className="h-9 pl-3 pr-8 rounded-lg bg-[#FFF1D6] border border-[#E8B968] text-[12.5px] font-extrabold focus:outline-none focus:border-[#0E8A4B] cursor-pointer"
        >
          {pages.map((p) => (
            <option key={p.id} value={p.id}>{p.title || (p.path === "/" ? "Home" : p.path)} ({p.path})</option>
          ))}
        </select>

        {/* Device picker */}
        <div className="hidden md:flex items-center gap-0.5 p-0.5 rounded-lg bg-[#FFF1D6] border border-[#E8B968] ml-2">
          {([
            { id: "mobile" as const, icon: Smartphone, title: "Mobile" },
            { id: "tablet" as const, icon: Tablet,     title: "Tablet" },
            { id: "desktop" as const, icon: Monitor,   title: "Desktop" },
          ]).map((d) => (
            <button key={d.id} onClick={() => setDevice(d.id)} title={d.title}
                    className={cn("w-8 h-8 rounded-md flex items-center justify-center transition",
                      device === d.id ? "bg-[#0E8A4B] text-white" : "text-foreground/55 hover:text-foreground")}>
              <d.icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Save status */}
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[10.5px] font-extrabold text-foreground/55">
          {saving ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</> :
            dirty ? <span className="text-[#FF6A1F]">● Unpublished changes</span> :
            lastSaved ? <><CheckCircle2 className="w-3 h-3 text-[#0E8A4B]" /> Saved</> :
            page.last_published_at ? <><CheckCircle2 className="w-3 h-3 text-[#0E8A4B]" /> Published</> : ""}
        </span>

        {dirty && (
          <button onClick={discard} className="hidden sm:inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-white border-2 border-[#E8B968] text-foreground/65 hover:bg-[#FFE8C7] text-[11.5px] font-extrabold transition">
            <RotateCcw className="w-3 h-3" /> Discard
          </button>
        )}

        <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 h-9 px-2 rounded-lg hover:bg-foreground/5 text-foreground/65 hover:text-foreground" title="Open live site">
          <ExternalLink className="w-4 h-4" />
        </a>

        <button onClick={publish} disabled={publishing || (!dirty && !!page.last_published_at)}
                className="inline-flex items-center gap-1.5 h-9 px-3 sm:px-4 rounded-lg bg-[#0E8A4B] text-white text-[12px] font-extrabold shadow-[0_3px_0_0_#073D22] hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_1px_0_0_#073D22] disabled:opacity-50 transition">
          {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" strokeWidth={2.5} />}
          {dirty ? "Publish changes" : "Published"}
        </button>
      </div>

      {/* Split content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: editor sidebar */}
        <aside className="w-full sm:w-[360px] lg:w-[400px] flex-shrink-0 bg-white border-r-2 border-[#E8B968] overflow-y-auto">
          <div className="p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-foreground/55">Sections ({sections.length})</h2>
              <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-[#0E8A4B] text-white text-[10.5px] font-extrabold hover:bg-[#0A6E3C] transition">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>

            {sections.length === 0 ? (
              <p className="text-[12px] text-foreground/55 italic p-4 bg-[#FFF6E8] rounded-lg text-center">No sections — add one to start.</p>
            ) : (
              <ul className="space-y-1.5">
                {sections.map((s, i) => {
                  const meta = sectionMeta(s.type);
                  const Icon = meta.icon;
                  const isActive = activeSectionIdx === i;
                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => setActiveSectionIdx(isActive ? null : i)}
                        className={cn(
                          "w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg border-2 transition",
                          isActive ? "border-[#0E8A4B] bg-[#E6F7EE]" : "border-[#E8B968]/60 bg-white hover:border-[#E8B968]"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 text-[#3C50E0] flex-shrink-0" strokeWidth={2.5} />
                        <span className="flex-1 text-[12px] font-extrabold truncate">{meta.label}</span>
                        <span className="flex items-center gap-0.5 flex-shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); move(i, -1); }} disabled={i === 0} className="w-6 h-6 rounded hover:bg-foreground/5 disabled:opacity-30 flex items-center justify-center"><ArrowUp className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); move(i, 1); }} disabled={i === sections.length - 1} className="w-6 h-6 rounded hover:bg-foreground/5 disabled:opacity-30 flex items-center justify-center"><ArrowDown className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); remove(i); }} className="w-6 h-6 rounded hover:bg-[#FCE5F0] text-[#D4308E] flex items-center justify-center"><Trash2 className="w-3 h-3" /></button>
                        </span>
                      </button>
                      {isActive && (
                        <div className="mt-1 ml-2 p-3 rounded-lg bg-[#FFF6E8]/60 border border-[#E8B968]/40">
                          <SectionPropsEditor section={s} onChange={(props) => updateProps(i, props)} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Right: live iframe preview */}
        <div className="hidden sm:flex flex-1 items-start justify-center overflow-auto p-4 sm:p-6 bg-[#3D1A00]/5">
          <div
            className="bg-white rounded-2xl shadow-xl overflow-hidden border border-foreground/10 transition-all"
            style={{
              width: device === "desktop" ? "100%" : DEVICE_WIDTH[device],
              maxWidth: device === "desktop" ? DEVICE_WIDTH.desktop : DEVICE_WIDTH[device],
              height: device === "mobile" ? 740 : device === "tablet" ? 900 : "calc(100vh - 180px)",
            }}
          >
            <iframe
              key={iframeKey}
              src={previewUrl}
              title="Live preview"
              className="w-full h-full border-0"
            />
          </div>
        </div>
      </div>

      {/* Section picker modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-black">Add a section</h3>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-lg hover:bg-foreground/5 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SECTION_LIBRARY.map((s) => (
                <button key={s.type} onClick={() => addSection(s.type)}
                        className="p-3 rounded-xl border-2 border-[#E8B968]/60 hover:border-[#0E8A4B] hover:bg-[#E6F7EE] text-left transition">
                  <s.icon className="w-4 h-4 text-[#3C50E0] mb-1.5" strokeWidth={2.5} />
                  <p className="text-[12.5px] font-extrabold">{s.label}</p>
                  <p className="text-[10.5px] text-foreground/55 leading-snug mt-0.5">{s.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Per-section props editor (mirrors the one in PagesPage but inlined) ──

const SectionPropsEditor = ({ section, onChange }: { section: SiteSection; onChange: (props: Record<string, unknown>) => void }) => {
  const p = section.props as Record<string, string>;
  if (section.type === "hero") return (
    <div className="space-y-2">
      <input value={String(p.headline || "")} onChange={(e) => onChange({ headline: e.target.value })} placeholder="Headline (override business name)"
             className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px] font-bold" />
      <input value={String(p.subheadline || "")} onChange={(e) => onChange({ subheadline: e.target.value })} placeholder="Subheadline"
             className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px]" />
      <input value={String(p.primary_cta || "")} onChange={(e) => onChange({ primary_cta: e.target.value })} placeholder='Primary CTA (default: "Order on WhatsApp")'
             className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px]" />
    </div>
  );
  if (section.type === "about") return (
    <div className="space-y-2">
      <input value={String(p.heading || "")} onChange={(e) => onChange({ heading: e.target.value })} placeholder="Heading"
             className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px] font-bold" />
      <textarea value={String(p.body || "")} onChange={(e) => onChange({ body: e.target.value })} placeholder="About text"
                rows={4} className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px] resize-none" />
    </div>
  );
  if (section.type === "products") return (
    <div className="space-y-2">
      <input value={String(p.heading || "")} onChange={(e) => onChange({ heading: e.target.value })} placeholder="Heading (default: 'Browse products')"
             className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px] font-bold" />
      <input type="number" value={String(p.limit || "")} onChange={(e) => onChange({ limit: Number(e.target.value) || 0 })} placeholder="Show how many (0 = all)"
             className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px]" />
      <p className="text-[10.5px] text-foreground/55 italic">Auto-pulls all active products. Manage them in the Products tab.</p>
    </div>
  );
  if (section.type === "gallery") {
    const images = Array.isArray((section.props as { images?: string[] }).images) ? (section.props as { images: string[] }).images : [];
    return (
      <div className="space-y-2">
        <input value={String(p.heading || "")} onChange={(e) => onChange({ heading: e.target.value })} placeholder="Heading"
               className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px] font-bold" />
        <textarea value={images.join("\n")} onChange={(e) => onChange({ images: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                  placeholder="One image URL per line" rows={4}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[11.5px] font-mono resize-none" />
      </div>
    );
  }
  if (section.type === "faq" || section.type === "testimonials") {
    const items = Array.isArray((section.props as { items?: Array<{ q?: string; a?: string; name?: string; text?: string }> }).items)
      ? (section.props as { items: Array<{ q?: string; a?: string; name?: string; text?: string }> }).items : [];
    const isFaq = section.type === "faq";
    return (
      <div className="space-y-2">
        <input value={String(p.heading || "")} onChange={(e) => onChange({ heading: e.target.value })} placeholder="Heading"
               className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px] font-bold" />
        {items.map((it, idx) => (
          <div key={idx} className="flex gap-1">
            <input value={String(isFaq ? it.q || "" : it.name || "")} onChange={(e) => {
              const next = [...items]; next[idx] = isFaq ? { ...next[idx], q: e.target.value } : { ...next[idx], name: e.target.value };
              onChange({ items: next });
            }} placeholder={isFaq ? "Question" : "Customer name"}
              className="flex-1 px-2 py-1.5 rounded-lg border border-[#E8B968] text-[11.5px] font-bold" />
            <input value={String(isFaq ? it.a || "" : it.text || "")} onChange={(e) => {
              const next = [...items]; next[idx] = isFaq ? { ...next[idx], a: e.target.value } : { ...next[idx], text: e.target.value };
              onChange({ items: next });
            }} placeholder={isFaq ? "Answer" : "Review"}
              className="flex-[2] px-2 py-1.5 rounded-lg border border-[#E8B968] text-[11.5px]" />
            <button onClick={() => onChange({ items: items.filter((_, i) => i !== idx) })} className="w-7 h-7 rounded hover:bg-[#FCE5F0] text-[#D4308E] flex items-center justify-center flex-shrink-0"><X className="w-3 h-3" /></button>
          </div>
        ))}
        <button onClick={() => onChange({ items: [...items, isFaq ? { q: "", a: "" } : { name: "", text: "" }] })}
                className="text-[11px] font-extrabold text-[#3C50E0] hover:text-[#2533A8]">+ Add {isFaq ? "FAQ" : "testimonial"}</button>
      </div>
    );
  }
  if (section.type === "leadform") return (
    <div className="space-y-2">
      <input value={String(p.heading || "")} onChange={(e) => onChange({ heading: e.target.value })} placeholder="Heading"
             className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px] font-bold" />
      <input value={String(p.description || "")} onChange={(e) => onChange({ description: e.target.value })} placeholder="Description"
             className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px]" />
    </div>
  );
  if (section.type === "contact") return (
    <div className="space-y-2">
      <input value={String(p.heading || "")} onChange={(e) => onChange({ heading: e.target.value })} placeholder="Heading"
             className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px] font-bold" />
      <p className="text-[10.5px] text-foreground/55 italic">Auto-pulls WhatsApp / UPI / Instagram / Email from your profile + site contact.</p>
    </div>
  );
  return <p className="text-[10.5px] text-foreground/55 italic">No options for this section — content comes from your site settings.</p>;
};
