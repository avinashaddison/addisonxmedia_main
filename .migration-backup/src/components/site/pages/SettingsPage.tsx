/**
 * Site Settings — business hours + address. Social links live on the user
 * profile (whatsapp/instagram/facebook urls), so this page links there
 * instead of duplicating the form.
 */

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Loader2, Save, MapPin, Clock, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export const SettingsPage = () => {
  const qc = useQueryClient();
  const { data: site, isLoading } = useQuery({
    queryKey: ["site-me"],
    queryFn: () => api.getSite(),
    staleTime: 30_000,
  });

  const [draft, setDraft] = useState({ hours: "", address: "" });

  useEffect(() => {
    if (site) {
      setDraft({
        hours: site.copy?.hours || "",
        address: site.copy?.address || "",
      });
    }
  }, [site]);

  const dirty = site && (
    (draft.hours || "") !== (site.copy?.hours || "") ||
    (draft.address || "") !== (site.copy?.address || "")
  );

  const saveMut = useMutation({
    mutationFn: () => api.updateSite({
      copy: {
        ...(site?.copy || {}),
        hours: draft.hours.trim(),
        address: draft.address.trim(),
      },
    }),
    onSuccess: (s) => {
      qc.setQueryData(["site-me"], s);
      toast.success("Settings saved");
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

  return (
    <div className="flex-1 overflow-y-auto bg-[#FFF6E8]">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0 bg-[#0A3D24]">
            <Settings className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-black leading-tight">Site Settings</h1>
            <p className="text-[14px] text-foreground/70 font-medium mt-1">Business hours + physical address shown on your public site.</p>
          </div>
          <button
            onClick={() => saveMut.mutate()}
            disabled={!dirty || saveMut.isPending}
            className="hidden sm:inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0E8A4B] text-white font-extrabold text-[13px] shadow-[0_4px_0_0_#073D22] hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_2px_0_0_#073D22] transition flex-shrink-0 disabled:opacity-50"
          >
            {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" strokeWidth={2.5} />}
            {dirty ? "Save" : "Saved"}
          </button>
        </div>

        {/* Hours + address */}
        <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5 space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-foreground/65 mb-1.5">
              <Clock className="w-3.5 h-3.5" /> Business hours
            </label>
            <textarea
              value={draft.hours}
              onChange={(e) => setDraft({ ...draft, hours: e.target.value })}
              placeholder={"Mon–Sat: 9 am – 9 pm\nSunday: 10 am – 6 pm"}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[13px] font-medium leading-relaxed resize-none"
            />
            <p className="text-[10.5px] text-foreground/45 mt-1 ml-1">Each line shows separately on the public site. Leave blank to hide.</p>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-foreground/65 mb-1.5">
              <MapPin className="w-3.5 h-3.5" /> Address
            </label>
            <textarea
              value={draft.address}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
              placeholder={"Shop 12, Boring Road\nPatna, Bihar 800001"}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[13px] font-medium leading-relaxed resize-none"
            />
            <p className="text-[10.5px] text-foreground/45 mt-1 ml-1">Helps with local SEO — Google shows shops with address higher in "near me" searches.</p>
          </div>
        </div>

        {/* Where social URLs live */}
        <div className="bg-gradient-to-br from-[#E4E8FF] to-white rounded-2xl border-2 border-[#3C50E0]/30 p-5">
          <h2 className="text-[13px] font-extrabold text-[#2533A8] mb-2">Social links auto-fill from your profile</h2>
          <p className="text-[12px] text-foreground/65 mb-3">WhatsApp number, Instagram URL, Facebook URL etc come from your settings — they're shown on every page of your site.</p>
          <div className="flex flex-wrap gap-2">
            <a href="/app/settings" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-[#3C50E0]/30 text-[12px] font-extrabold text-[#2533A8] hover:bg-[#E4E8FF] transition">
              <ExternalLink className="w-3 h-3" /> Open profile settings
            </a>
            <a href="/app/integrations" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-[#3C50E0]/30 text-[12px] font-extrabold text-[#2533A8] hover:bg-[#E4E8FF] transition">
              <ExternalLink className="w-3 h-3" /> WhatsApp integration
            </a>
          </div>
        </div>

        <div className="sm:hidden">
          <button
            onClick={() => saveMut.mutate()}
            disabled={!dirty || saveMut.isPending}
            className="w-full h-12 rounded-xl bg-[#0E8A4B] text-white font-extrabold text-[14px] shadow-[0_4px_0_0_#073D22] inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" strokeWidth={2.5} />}
            {dirty ? "Save" : "Saved"}
          </button>
        </div>
      </div>
    </div>
  );
};
