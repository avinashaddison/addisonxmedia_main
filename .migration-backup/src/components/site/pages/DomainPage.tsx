/**
 * Domain page — set + verify a custom domain.
 *
 * Phase 2: stores the domain + shows CNAME setup instructions. Verification
 * is currently a manual "mark as verified" — actual DNS check + Caddy auto-SSL
 * lands in Phase 3 when we wire on-demand TLS.
 */

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe, Loader2, Save, Copy, CheckCircle2, AlertCircle, ExternalLink, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export const DomainPage = () => {
  const qc = useQueryClient();
  const { data: site, isLoading } = useQuery({
    queryKey: ["site-me"],
    queryFn: () => api.getSite(),
    staleTime: 30_000,
  });

  const [domain, setDomain] = useState("");

  useEffect(() => {
    if (site?.custom_domain) setDomain(site.custom_domain);
    else setDomain("");
  }, [site?.custom_domain]);

  const saveMut = useMutation({
    mutationFn: () => api.updateSiteDomain(domain.trim() || null),
    onSuccess: (s) => {
      qc.setQueryData(["site-me"], s);
      toast.success(s.custom_domain ? `Saved — set up your CNAME to point to ${HOST}` : "Domain removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const verifyMut = useMutation({
    mutationFn: () => api.verifySiteDomain(),
    onSuccess: (s) => {
      qc.setQueryData(["site-me"], s);
      toast.success("Marked verified — DNS auto-check + SSL ship in Phase 3");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clearDomain = () => {
    if (!confirm("Disconnect your custom domain? Your free subdomain URL stays live.")) return;
    setDomain("");
    api.updateSiteDomain(null).then((s) => {
      qc.setQueryData(["site-me"], s);
      toast.success("Custom domain removed");
    }).catch((e: Error) => toast.error(e.message));
  };

  if (isLoading || !site) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#FFF6E8]">
        <Loader2 className="w-6 h-6 animate-spin text-foreground/40" />
      </div>
    );
  }

  const freeUrl = `${window.location.origin}/biz/${site.slug}`;
  const customUrl = site.custom_domain ? `https://${site.custom_domain}` : null;

  const copyVal = async (val: string, label: string) => {
    try {
      await navigator.clipboard.writeText(val);
      toast.success(`${label} copied`);
    } catch { toast.error("Couldn't copy"); }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#FFF6E8]">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0 bg-[#B8651A]">
            <Globe className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-black leading-tight">Domain</h1>
            <p className="text-[14px] text-foreground/70 font-medium mt-1">Your free AddisonX URL is always live. Connect your own domain for a more professional look.</p>
          </div>
        </div>

        {/* Free URL */}
        <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-[#0E8A4B]" strokeWidth={2.5} />
            <h2 className="text-[13px] font-extrabold uppercase tracking-[0.15em] text-foreground/55">Your free URL — always live</h2>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#E6F7EE] border border-[#0E8A4B]/30">
            <Globe className="w-4 h-4 text-[#0E8A4B] flex-shrink-0" />
            <span className="flex-1 text-[13px] font-mono font-extrabold truncate">{freeUrl}</span>
            <button onClick={() => copyVal(freeUrl, "URL")}
                    className="w-8 h-8 rounded-lg bg-white hover:bg-[#0E8A4B]/5 border border-[#0E8A4B]/30 flex items-center justify-center transition">
              <Copy className="w-3.5 h-3.5 text-foreground/70" />
            </button>
            <a href={freeUrl} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-[#0E8A4B] text-white text-[11px] font-extrabold hover:bg-[#0A6E3C] transition">
              <ExternalLink className="w-3.5 h-3.5" /> View
            </a>
          </div>
        </div>

        {/* Custom domain */}
        <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.15em] text-foreground/55 mb-1">Custom domain</h2>
          <p className="text-[11.5px] text-foreground/55 mb-4">Already own a domain? Point it at us with one DNS record.</p>

          <div className="space-y-3">
            <div>
              <label className="text-[10.5px] font-extrabold uppercase tracking-wider text-foreground/65">Your domain</label>
              <div className="flex gap-2 mt-1">
                <input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g. shop.example.com or example.com"
                  className="flex-1 px-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[13px] font-mono font-bold"
                />
                <button
                  onClick={() => saveMut.mutate()}
                  disabled={saveMut.isPending || domain.trim() === (site.custom_domain ?? "")}
                  className="inline-flex items-center gap-1.5 h-11 px-4 rounded-lg bg-[#0E8A4B] text-white text-[12px] font-extrabold shadow-[0_3px_0_0_#073D22] hover:bg-[#0A6E3C] disabled:opacity-50 transition"
                >
                  {saveMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </button>
              </div>
            </div>

            {site.custom_domain && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FFF1D6] border border-[#E8B968]">
                <div className="flex items-center gap-2 min-w-0">
                  {site.custom_domain_verified ? (
                    <CheckCircle2 className="w-4 h-4 text-[#0E8A4B] flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-[#FF6A1F] flex-shrink-0" />
                  )}
                  <span className="text-[12px] font-extrabold truncate">{site.custom_domain}</span>
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${site.custom_domain_verified ? "bg-[#0E8A4B] text-white" : "bg-[#FF6A1F] text-white"}`}>
                    {site.custom_domain_verified ? "Verified" : "Pending DNS"}
                  </span>
                </div>
                <button onClick={clearDomain} className="text-[#D4308E] hover:text-[#A11A6A] p-1" title="Remove">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* DNS instructions — shown after domain is saved */}
        {site.custom_domain && (
          <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5">
            <h2 className="text-[13px] font-extrabold uppercase tracking-[0.15em] text-foreground/55 mb-1">DNS setup</h2>
            <p className="text-[11.5px] text-foreground/55 mb-4">Add this record in your domain registrar (GoDaddy, Namecheap, Cloudflare, etc).</p>
            <div className="rounded-xl overflow-hidden border border-foreground/10">
              <table className="w-full text-[12px] font-mono">
                <thead className="bg-foreground/5 text-foreground/65">
                  <tr>
                    <th className="text-left px-3 py-2 font-extrabold uppercase tracking-wider text-[10px]">Type</th>
                    <th className="text-left px-3 py-2 font-extrabold uppercase tracking-wider text-[10px]">Host / Name</th>
                    <th className="text-left px-3 py-2 font-extrabold uppercase tracking-wider text-[10px]">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-foreground/10">
                    <td className="px-3 py-3 font-extrabold">CNAME</td>
                    <td className="px-3 py-3">{cnameHost(site.custom_domain)}</td>
                    <td className="px-3 py-3 flex items-center gap-1.5">
                      <span className="font-bold">{HOST}</span>
                      <button onClick={() => copyVal(HOST, "Host")} className="text-foreground/40 hover:text-foreground/85">
                        <Copy className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-[#FFF1D6] border border-[#E8B968] text-[11.5px] font-medium leading-relaxed text-[#3D1A00]">
              <p className="font-extrabold mb-1">After adding the DNS record:</p>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>Wait ~5 minutes for DNS to propagate.</li>
                <li>Click "Mark as verified" below.</li>
                <li>Visit https://{site.custom_domain} to confirm it works.</li>
              </ol>
              <p className="mt-2 text-[10.5px] text-foreground/55">SSL certificate is auto-issued — no action needed.</p>
            </div>

            <button
              onClick={() => verifyMut.mutate()}
              disabled={verifyMut.isPending || site.custom_domain_verified}
              className="mt-4 w-full sm:w-auto h-11 px-4 rounded-lg bg-[#0E8A4B] text-white text-[12.5px] font-extrabold shadow-[0_3px_0_0_#073D22] hover:bg-[#0A6E3C] disabled:opacity-50 inline-flex items-center gap-2 justify-center transition"
            >
              {verifyMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {site.custom_domain_verified ? "✓ Verified" : "Mark as verified"}
            </button>

            {customUrl && site.custom_domain_verified && (
              <a href={customUrl} target="_blank" rel="noopener noreferrer"
                 className="mt-3 ml-3 inline-flex items-center gap-1.5 text-[12px] text-[#0E8A4B] font-extrabold hover:text-[#0A6E3C]">
                <ExternalLink className="w-3 h-3" /> Open {site.custom_domain}
              </a>
            )}
          </div>
        )}

        {/* Phase 3 note */}
        <div className="p-4 rounded-2xl border-2 border-[#3C50E0]/30 bg-gradient-to-br from-[#E4E8FF] to-white">
          <p className="text-[12px] text-[#2533A8] font-bold leading-relaxed">
            <strong>Phase 3:</strong> automatic DNS verification + on-demand SSL provisioning via Caddy. For now, the manual
            "mark verified" works as long as your CNAME is configured — we use the SAME backend, so traffic routes correctly.
          </p>
        </div>
      </div>
    </div>
  );
};

// The host customers point their CNAME to. We use the current origin's
// hostname — works for both production (addisonxmedia.com) and local dev.
const HOST = typeof window !== "undefined" ? window.location.hostname : "addisonxmedia.com";

const cnameHost = (domain: string): string => {
  // Subdomain like shop.example.com → "shop"; apex like example.com → "@"
  const parts = domain.split(".");
  if (parts.length <= 2) return "@";
  return parts[0];
};
