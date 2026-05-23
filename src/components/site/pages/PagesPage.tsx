/**
 * Pages — multi-page editor. Each page has a path + ordered list of sections.
 * Sections come from a fixed library (hero/about/products/gallery/testimonials/
 * faq/hours/leadform/contact). Reorder with up/down buttons (no drag-drop yet).
 *
 * If no pages are defined, the public renderer falls back to its built-in
 * single-page Kirana template.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Loader2, Plus, X, Trash2, Edit2, ArrowUp, ArrowDown,
  Image as ImageIcon, MessageCircle, HelpCircle, Star, Map, Clock,
  ClipboardList, Phone, Sparkles, Package, ExternalLink, EyeOff,
} from "lucide-react";
import { api, type SitePageDto, type SiteSection } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SECTION_LIBRARY: Array<{
  type: SiteSection["type"]; label: string; description: string; icon: any; defaults: Record<string, unknown>;
}> = [
  { type: "hero",         label: "Hero",         description: "Big top banner with tagline + CTAs", icon: Sparkles,
    defaults: { headline: "", subheadline: "", primary_cta: "Order on WhatsApp" } },
  { type: "products",     label: "Products",     description: "Auto-pulled product grid", icon: Package,
    defaults: { heading: "Browse products", limit: 0 } },
  { type: "about",        label: "About",        description: "About us text block", icon: FileText,
    defaults: { heading: "About us", body: "" } },
  { type: "gallery",      label: "Gallery",      description: "Photo grid (paste image URLs)", icon: ImageIcon,
    defaults: { heading: "Gallery", images: [] } },
  { type: "testimonials", label: "Testimonials", description: "Customer reviews", icon: Star,
    defaults: { heading: "What customers say", items: [] } },
  { type: "faq",          label: "FAQ",          description: "Q&A list", icon: HelpCircle,
    defaults: { heading: "Frequently asked", items: [] } },
  { type: "hours",        label: "Hours",        description: "Business hours block", icon: Clock,
    defaults: { heading: "Hours" } },
  { type: "leadform",     label: "Lead form",    description: "Capture lead → CRM", icon: ClipboardList,
    defaults: { heading: "Get in touch", description: "We'll reply on WhatsApp." } },
  { type: "contact",      label: "Contact",      description: "WhatsApp + UPI + social cards", icon: Phone,
    defaults: { heading: "Reach us" } },
];

const sectionMeta = (type: string) => SECTION_LIBRARY.find((s) => s.type === type) || SECTION_LIBRARY[0];

export const PagesPage = () => {
  const qc = useQueryClient();
  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["site-pages"],
    queryFn: () => api.getSitePages(),
    staleTime: 30_000,
  });
  const { data: site } = useQuery({ queryKey: ["site-me"], queryFn: () => api.getSite() });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const editing = editingId ? pages.find((p) => p.id === editingId) : null;

  const publicBase = site ? `${window.location.origin}/biz/${site.slug}` : "";

  return (
    <div className="flex-1 overflow-y-auto bg-[#FFF6E8]">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0 bg-[#3C50E0]">
            <FileText className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-black leading-tight">Pages</h1>
            <p className="text-[14px] text-foreground/70 font-medium mt-1">
              Add and arrange the pages of your site — each page is a stack of sections.
            </p>
          </div>
          <button onClick={() => setShowNew(true)}
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0E8A4B] text-white font-extrabold text-[13px] shadow-[0_4px_0_0_#073D22] hover:bg-[#0A6E3C] transition flex-shrink-0">
            <Plus className="w-4 h-4" strokeWidth={2.5} /> New page
          </button>
        </div>

        {pages.length === 0 && (
          <div className="p-4 rounded-2xl border-2 border-[#FFD23F]/70 bg-gradient-to-br from-[#FFF6E8] to-[#FFE8B8]">
            <p className="text-[12.5px] text-[#3D1A00] font-bold leading-relaxed">
              <strong>No pages defined yet.</strong> Your site is rendering with the built-in single-page template (works great too).
              Add pages here only when you need custom layouts — About, Menu, Services, etc.
            </p>
          </div>
        )}

        {/* List */}
        <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] overflow-hidden">
          {isLoading ? (
            <div className="py-16 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-foreground/40" /></div>
          ) : pages.length === 0 ? (
            <div className="py-12 text-center px-6">
              <p className="text-[12.5px] text-foreground/55">No custom pages — single-page template active.</p>
            </div>
          ) : (
            <ul className="divide-y divide-foreground/10">
              {pages.map((p) => (
                <li key={p.id}>
                  <button onClick={() => setEditingId(p.id)} className="w-full text-left px-4 sm:px-5 py-4 hover:bg-[#FFF6E8]/50 transition flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#E4E8FF] text-[#3C50E0] flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-extrabold">{p.title || (p.path === "/" ? "Home" : p.path)}</span>
                        <code className="text-[10.5px] font-mono text-foreground/55 bg-foreground/5 px-1.5 py-0.5 rounded">{p.path}</code>
                        {!p.active && <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-foreground/10 text-foreground/55">Hidden</span>}
                      </div>
                      <p className="text-[11.5px] text-foreground/55 mt-0.5">
                        {p.sections.length} section{p.sections.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <a href={`${publicBase}${p.path === "/" ? "" : p.path}`} target="_blank" rel="noopener noreferrer"
                       onClick={(e) => e.stopPropagation()}
                       className="text-foreground/40 hover:text-[#0E8A4B] p-1.5" title="View">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <Edit2 className="w-3.5 h-3.5 text-foreground/30 flex-shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-[11px] text-center text-foreground/45">
          A path like <code className="font-mono">/menu</code> shows at <code className="font-mono">{publicBase}/menu</code>. The home page lives at <code className="font-mono">/</code>.
        </p>
      </div>

      {showNew && (
        <NewPageDialog
          onClose={() => setShowNew(false)}
          onCreated={(p) => { qc.invalidateQueries({ queryKey: ["site-pages"] }); setShowNew(false); setEditingId(p.id); }}
        />
      )}

      {editing && (
        <PageEditorDialog
          page={editing}
          onClose={() => setEditingId(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["site-pages"] })}
          onDeleted={() => { qc.invalidateQueries({ queryKey: ["site-pages"] }); setEditingId(null); }}
        />
      )}
    </div>
  );
};

// ─── Create new page ──────────────────────────────────────────────────────

const NewPageDialog = ({ onClose, onCreated }: { onClose: () => void; onCreated: (p: SitePageDto) => void }) => {
  const [path, setPath] = useState("/");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const p = await api.createSitePage({ path, title: title.trim() || undefined, sections: [] });
      toast.success("Page created");
      onCreated(p);
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="border-b-2 border-[#E8B968] px-5 py-3 flex items-center justify-between">
          <h2 className="text-[15px] font-black">New page</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-foreground/5 flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10.5px] font-extrabold uppercase tracking-wider text-foreground/65 mb-1.5 block">Path</label>
            <input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/about"
                   className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[13px] font-mono font-bold"
                   autoFocus />
            <p className="text-[10.5px] text-foreground/55 mt-1">Lowercase, hyphens, e.g. /menu /services. Use / for the home page.</p>
          </div>
          <div>
            <label className="text-[10.5px] font-extrabold uppercase tracking-wider text-foreground/65 mb-1.5 block">Title (optional)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Our menu"
                   className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[13px] font-bold" />
          </div>
        </div>
        <div className="border-t-2 border-[#E8B968] px-5 py-3 flex items-center justify-end gap-2">
          <button onClick={onClose} className="h-10 px-3 rounded-lg text-foreground/65 text-[12px] font-extrabold hover:bg-foreground/5">Cancel</button>
          <button onClick={submit} disabled={saving}
                  className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-[#0E8A4B] text-white text-[13px] font-extrabold shadow-[0_3px_0_0_#073D22] hover:bg-[#0A6E3C] disabled:opacity-50 transition">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Create page
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Editor: sections list + add section + per-section props ──────────────

const PageEditorDialog = ({ page, onClose, onSaved, onDeleted }: {
  page: SitePageDto; onClose: () => void; onSaved: () => void; onDeleted: () => void;
}) => {
  const [sections, setSections] = useState<SiteSection[]>(page.sections || []);
  const [title, setTitle] = useState(page.title || "");
  const [active, setActive] = useState(page.active);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.updateSitePage(page.id, { title: title.trim() || null, sections, active });
      toast.success("Page saved");
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirm(`Delete page ${page.path}?`)) return;
    try { await api.deleteSitePage(page.id); toast.success("Page deleted"); onDeleted(); }
    catch (e) { toast.error((e as Error).message); }
  };

  const addSection = (type: SiteSection["type"]) => {
    const meta = SECTION_LIBRARY.find((s) => s.type === type)!;
    setSections([...sections, { id: `s_${Math.random().toString(36).slice(2, 10)}`, type, props: { ...meta.defaults } }]);
    setShowAdd(false);
  };
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...sections];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setSections(next);
  };
  const remove = (idx: number) => { setSections(sections.filter((_, i) => i !== idx)); };
  const updateProps = (idx: number, props: Record<string, unknown>) => {
    setSections(sections.map((s, i) => i === idx ? { ...s, props: { ...s.props, ...props } } : s));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="sticky top-0 z-10 bg-white border-b-2 border-[#E8B968] px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-[15px] font-black truncate">{title || page.path}</h2>
            <code className="text-[10.5px] font-mono text-foreground/55 bg-foreground/5 px-1.5 py-0.5 rounded">{page.path}</code>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-foreground/5 flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10.5px] font-extrabold uppercase tracking-wider text-foreground/65 mb-1.5 block">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
                   className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[13px] font-bold" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/65">Sections ({sections.length})</p>
              <button onClick={() => setShowAdd(true)}
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-[#0E8A4B] text-white text-[11px] font-extrabold hover:bg-[#0A6E3C] transition">
                <Plus className="w-3 h-3" /> Add section
              </button>
            </div>
            {sections.length === 0 ? (
              <p className="text-[12px] text-foreground/55 italic p-4 bg-foreground/5 rounded-lg text-center">No sections yet — add one to start building the page.</p>
            ) : (
              <ul className="space-y-2">
                {sections.map((s, i) => {
                  const meta = sectionMeta(s.type);
                  const Icon = meta.icon;
                  return (
                    <li key={s.id} className="p-3 rounded-xl border-2 border-[#E8B968]/60 bg-[#FFF6E8]/40">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4 text-[#3C50E0] flex-shrink-0" strokeWidth={2.5} />
                        <span className="text-[13px] font-extrabold flex-1">{meta.label}</span>
                        <button onClick={() => move(i, -1)} disabled={i === 0} className="w-7 h-7 rounded hover:bg-foreground/5 disabled:opacity-30 flex items-center justify-center"><ArrowUp className="w-3.5 h-3.5" /></button>
                        <button onClick={() => move(i, 1)} disabled={i === sections.length - 1} className="w-7 h-7 rounded hover:bg-foreground/5 disabled:opacity-30 flex items-center justify-center"><ArrowDown className="w-3.5 h-3.5" /></button>
                        <button onClick={() => remove(i)} className="w-7 h-7 rounded hover:bg-[#FCE5F0] text-[#D4308E] flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                      <SectionPropsEditor section={s} onChange={(props) => updateProps(i, props)} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-4 h-4 accent-[#0E8A4B]" />
            <span className="text-[12.5px] font-bold">Visible on site</span>
          </label>
        </div>

        <div className="sticky bottom-0 bg-white border-t-2 border-[#E8B968] px-5 py-3 flex items-center justify-between gap-2">
          <button onClick={del} className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-white border-2 border-[#D4308E]/40 text-[#D4308E] text-[12px] font-extrabold hover:bg-[#FCE5F0] transition">
            <Trash2 className="w-3.5 h-3.5" /> Delete page
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="h-10 px-3 rounded-lg text-foreground/65 text-[12px] font-extrabold hover:bg-foreground/5">Close</button>
            <button onClick={save} disabled={saving}
                    className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-[#0E8A4B] text-white text-[13px] font-extrabold shadow-[0_3px_0_0_#073D22] hover:bg-[#0A6E3C] disabled:opacity-50 transition">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Save page
            </button>
          </div>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[14px] font-black mb-3">Add a section</h3>
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

// ─── Per-section props editor ─────────────────────────────────────────────

const SectionPropsEditor = ({ section, onChange }: { section: SiteSection; onChange: (props: Record<string, unknown>) => void }) => {
  const p = section.props as Record<string, string>;
  // Fields by type
  if (section.type === "hero") return (
    <div className="space-y-2">
      <input value={String(p.headline || "")} onChange={(e) => onChange({ headline: e.target.value })} placeholder="Headline (overrides business name)"
             className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px] font-bold" />
      <input value={String(p.subheadline || "")} onChange={(e) => onChange({ subheadline: e.target.value })} placeholder="Subheadline"
             className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px]" />
    </div>
  );
  if (section.type === "about") return (
    <textarea value={String(p.body || "")} onChange={(e) => onChange({ body: e.target.value })} placeholder="About text" rows={3}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px] resize-none" />
  );
  if (section.type === "products") return (
    <p className="text-[11px] text-foreground/55 italic">Auto-pulls all active products. Manage them in the Products tab.</p>
  );
  if (section.type === "gallery") {
    const images = Array.isArray((section.props as any).images) ? (section.props as any).images as string[] : [];
    return (
      <div className="space-y-2">
        <textarea
          value={images.join("\n")}
          onChange={(e) => onChange({ images: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
          placeholder="One image URL per line"
          rows={3}
          className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[11.5px] font-mono resize-none" />
      </div>
    );
  }
  if (section.type === "faq" || section.type === "testimonials") {
    const items = Array.isArray((section.props as any).items) ? (section.props as any).items as Array<{ q?: string; a?: string; name?: string; text?: string }> : [];
    const isFaq = section.type === "faq";
    return (
      <div className="space-y-2">
        {items.map((it, idx) => (
          <div key={idx} className="flex gap-2">
            <input value={String(isFaq ? it.q || "" : it.name || "")} onChange={(e) => {
              const next = [...items]; if (isFaq) next[idx] = { ...next[idx], q: e.target.value }; else next[idx] = { ...next[idx], name: e.target.value };
              onChange({ items: next });
            }} placeholder={isFaq ? "Question" : "Customer name"}
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px] font-bold" />
            <input value={String(isFaq ? it.a || "" : it.text || "")} onChange={(e) => {
              const next = [...items]; if (isFaq) next[idx] = { ...next[idx], a: e.target.value }; else next[idx] = { ...next[idx], text: e.target.value };
              onChange({ items: next });
            }} placeholder={isFaq ? "Answer" : "Review"}
              className="flex-[2] px-2.5 py-1.5 rounded-lg border border-[#E8B968] text-[12px]" />
            <button onClick={() => onChange({ items: items.filter((_, i) => i !== idx) })} className="w-7 h-7 rounded hover:bg-[#FCE5F0] text-[#D4308E] flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        <button onClick={() => onChange({ items: [...items, isFaq ? { q: "", a: "" } : { name: "", text: "" }] })}
                className="text-[11px] font-extrabold text-[#3C50E0] hover:text-[#2533A8]">+ Add {isFaq ? "FAQ" : "testimonial"}</button>
      </div>
    );
  }
  // For hours / leadform / contact — no extra config, they pull from profile/settings
  return <p className="text-[11px] text-foreground/55 italic">Pulls from your site settings — no extra config needed.</p>;
};
