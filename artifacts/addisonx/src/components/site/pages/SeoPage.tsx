/**
 * SEO editor — title, description, OG image.
 *
 * Phase 2 just exposes the three site-wide fields (already in the `site`
 * table). Per-page SEO + sitemap.xml generation comes with the Pages editor
 * in Phase 3.
 */

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Loader2, Save, ExternalLink, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const SeoPage = () => {
  const qc = useQueryClient();
  const { data: site, isLoading } = useQuery({
    queryKey: ["site-me"],
    queryFn: () => api.getSite(),
    staleTime: 30_000,
  });

  const [draft, setDraft] = useState({ title: "", description: "", og: "" });

  useEffect(() => {
    if (site) {
      setDraft({
        title: site.seo_title || "",
        description: site.seo_description || "",
        og: site.seo_og_image || "",
      });
    }
  }, [site]);

  const dirty = site && (
    (draft.title || null) !== (site.seo_title || null) ||
    (draft.description || null) !== (site.seo_description || null) ||
    (draft.og || null) !== (site.seo_og_image || null)
  );

  const saveMut = useMutation({
    mutationFn: () => api.updateSite({
      seo_title: draft.title.trim() || null,
      seo_description: draft.description.trim() || null,
      seo_og_image: draft.og.trim() || null,
    }),
    onSuccess: (s) => {
      qc.setQueryData(["site-me"], s);
      toast.success("SEO settings saved");
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

  const previewTitle = draft.title.trim() || site.copy?.business_name || "My Shop";
  const previewDesc = draft.description.trim() || site.copy?.tagline || "Local quality, delivered with care.";
  const publicUrl = `${window.location.host}/biz/${site.slug}`;

  return (
    <div className="flex-1 overflow-y-auto bg-[#FFF6E8]">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0 bg-[#FF6A1F]">
            <Search className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-black leading-tight">SEO</h1>
            <p className="text-[14px] text-foreground/70 font-medium mt-1">How your site appears on Google and when shared on WhatsApp / Facebook.</p>
          </div>
          <button
            onClick={() => saveMut.mutate()}
            disabled={!dirty || saveMut.isPending}
            className="hidden sm:inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0E8A4B] text-white font-extrabold text-[13px] shadow-[0_4px_0_0_#073D22] hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_2px_0_0_#073D22] transition flex-shrink-0 disabled:opacity-50"
          >
            {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" strokeWidth={2.5} />}
            {dirty ? "Save SEO" : "Saved"}
          </button>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5 space-y-4">
          <Field label="Page title" hint={`${draft.title.length}/60 · what shows in browser tab + Google result heading`}>
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value.slice(0, 60) })}
              placeholder={site.copy?.business_name || "e.g. Sharma General Store — Patna"}
              className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[14px] font-bold"
            />
          </Field>
          <Field label="Meta description" hint={`${draft.description.length}/160 · 1-2 sentences Google shows under your title`}>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value.slice(0, 160) })}
              placeholder={site.copy?.tagline || "e.g. Fresh groceries delivered to your doorstep in 30 minutes across Patna."}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[13px] font-medium leading-relaxed resize-none"
            />
          </Field>
          <Field label="Social preview image (Open Graph)" hint="1200×630px works best · shown when shared on WhatsApp / Facebook / Twitter">
            <input
              value={draft.og}
              onChange={(e) => setDraft({ ...draft, og: e.target.value })}
              placeholder="https://res.cloudinary.com/…/your-image.jpg"
              className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[12px] font-mono"
            />
            <p className="text-[10.5px] text-foreground/45 mt-1 ml-1">Tip: upload to your Cloudinary or any HTTPS image host and paste the URL.</p>
          </Field>
        </div>

        {/* Google preview */}
        <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.15em] text-foreground/55 mb-3">Google preview</h2>
          <div className="rounded-xl border border-foreground/10 p-4 bg-white">
            <p className="text-[11px] text-[#202124]/70">{publicUrl}</p>
            <h4 className="text-[18px] text-[#1a0dab] font-medium leading-tight mt-1 hover:underline cursor-default truncate">{previewTitle}</h4>
            <p className="text-[12.5px] text-[#4d5156] mt-1 leading-snug line-clamp-2">{previewDesc}</p>
          </div>
        </div>

        {/* OG preview */}
        <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.15em] text-foreground/55 mb-3">WhatsApp / social preview</h2>
          <div className="rounded-xl border-2 border-[#E8B968]/50 overflow-hidden max-w-md">
            {draft.og ? (
              <img src={draft.og} alt="OG preview" className="w-full aspect-[1200/630] object-cover bg-foreground/5"
                   onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <div className="w-full aspect-[1200/630] bg-gradient-to-br from-foreground/5 to-foreground/10 flex items-center justify-center">
                <p className="text-[12px] text-foreground/50 font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4" /> No image set</p>
              </div>
            )}
            <div className="p-3 bg-white">
              <p className="text-[10px] text-foreground/55 uppercase tracking-wider font-bold">{publicUrl.replace(/\/biz.*/, "")}</p>
              <h4 className="text-[14px] font-extrabold mt-0.5 truncate">{previewTitle}</h4>
              <p className="text-[12px] text-foreground/70 mt-0.5 line-clamp-2">{previewDesc}</p>
            </div>
          </div>
        </div>

        {/* Tip */}
        <div className="p-4 rounded-2xl border-2 border-[#3C50E0]/30 bg-gradient-to-br from-[#E4E8FF] to-white">
          <p className="text-[12px] text-[#2533A8] font-bold leading-relaxed">
            <strong>Tip:</strong> the most important SEO move for a local business is a strong meta description containing your city + service.
            "Best <i>kirana store in Patna with home delivery</i>" outperforms "Welcome to our shop" by 10×.
          </p>
        </div>

        <div className="sm:hidden">
          <button
            onClick={() => saveMut.mutate()}
            disabled={!dirty || saveMut.isPending}
            className="w-full h-12 rounded-xl bg-[#0E8A4B] text-white font-extrabold text-[14px] shadow-[0_4px_0_0_#073D22] inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" strokeWidth={2.5} />}
            {dirty ? "Save SEO" : "Saved"}
          </button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div>
    <div className="flex items-baseline justify-between mb-1.5">
      <label className="text-[10.5px] font-extrabold uppercase tracking-wider text-foreground/65">{label}</label>
      {hint && <span className="text-[10px] text-foreground/45 ml-2">{hint}</span>}
    </div>
    {children}
  </div>
);
