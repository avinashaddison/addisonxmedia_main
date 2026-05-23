/**
 * Lead Forms — captured submissions from the public site form.
 *
 * Phase 2 ships the form (in the site renderer) + this list view. Every lead
 * also auto-creates a contact in the CRM table so it shows up in the Chats /
 * Contacts flows. Future: per-form builder, multiple forms, segmentation.
 */

import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList, Loader2, ExternalLink, MessageSquare, Mail, Phone, ChevronRight, Inbox,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/inbox-types";
import { Link } from "react-router-dom";

export const LeadsPage = () => {
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["site-leads"],
    queryFn: () => api.getSiteLeads(),
    refetchInterval: 15_000,
  });
  const { data: site } = useQuery({
    queryKey: ["site-me"],
    queryFn: () => api.getSite(),
    staleTime: 30_000,
  });

  const publicUrl = site ? `${window.location.origin}/biz/${site.slug}` : "";

  return (
    <div className="flex-1 overflow-y-auto bg-[#FFF6E8]">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0 bg-[#3C50E0]">
            <ClipboardList className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-black leading-tight">Lead Forms</h1>
            <p className="text-[14px] text-foreground/70 font-medium mt-1">
              Submissions from the contact form on your public site — also pushed into Contacts automatically.
            </p>
          </div>
          {site && (
            <a href={publicUrl} target="_blank" rel="noopener noreferrer"
               className="hidden sm:inline-flex items-center gap-1.5 h-11 px-4 rounded-xl bg-white border-2 border-[#E8B968] text-[12.5px] font-extrabold text-foreground shadow-[0_3px_0_0_#E8B968] hover:bg-[#FFE8C7] transition">
              <ExternalLink className="w-3.5 h-3.5" /> View form on site
            </a>
          )}
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Total leads" value={String(leads.length)} accent="#3C50E0" />
          <Stat label="With phone" value={String(leads.filter((l) => l.phone).length)} accent="#0E8A4B" />
          <Stat label="With email" value={String(leads.filter((l) => l.email).length)} accent="#FF6A1F" />
          <Stat label="Linked to CRM" value={String(leads.filter((l) => l.contact_id).length)} accent="#D4308E" />
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] overflow-hidden">
          {isLoading ? (
            <div className="py-16 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-foreground/40" />
            </div>
          ) : leads.length === 0 ? (
            <div className="py-16 text-center px-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FFF1D6] flex items-center justify-center mb-3">
                <Inbox className="w-7 h-7 text-[#B8651A]" />
              </div>
              <h3 className="text-[15px] font-extrabold mb-1">No leads yet</h3>
              <p className="text-[12.5px] text-foreground/60 max-w-sm mx-auto leading-relaxed">
                Customers who fill out the contact form on your site will appear here. Make sure your site is{" "}
                <Link to="/app/site" className="text-[#0E8A4B] font-extrabold hover:underline">published</Link>{" "}and share the URL.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-foreground/10">
              {leads.map((l) => (
                <li key={l.id} className="px-4 sm:px-5 py-4 hover:bg-[#FFF6E8]/50 transition">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[13px] font-extrabold flex-shrink-0 bg-gradient-to-br from-[#3C50E0] to-[#2533A8]">
                      {(l.name || "?").trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <h4 className="text-[14px] font-extrabold truncate">{l.name}</h4>
                        <span className="text-[10.5px] text-foreground/50 flex-shrink-0">{formatRelative(l.created_at)}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-1.5">
                        {l.phone && (
                          <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1 text-[12px] font-mono font-bold text-foreground/85 hover:text-[#0E8A4B]">
                            <Phone className="w-3 h-3" /> {l.phone}
                          </a>
                        )}
                        {l.email && (
                          <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1 text-[12px] font-bold text-foreground/85 hover:text-[#0E8A4B] truncate">
                            <Mail className="w-3 h-3" /> {l.email}
                          </a>
                        )}
                      </div>
                      {l.message && (
                        <p className="text-[12.5px] text-foreground/70 italic leading-relaxed mt-1 bg-[#FFF6E8]/60 p-2 rounded-lg border border-[#E8B968]/40">
                          "{l.message}"
                        </p>
                      )}
                      {l.contact_id && (
                        <Link to="/app/inbox" className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-extrabold text-[#0E8A4B] hover:text-[#0A6E3C]">
                          <MessageSquare className="w-3 h-3" /> Open in chats <ChevronRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-[11px] text-center text-foreground/45">
          Auto-WhatsApp welcome for new leads ships in Phase 3 — for now, message them yourself from{" "}
          <Link to="/app/inbox" className="text-[#0E8A4B] font-extrabold hover:underline">Chats</Link>.
        </p>
      </div>
    </div>
  );
};

const Stat = ({ label, value, accent }: { label: string; value: string; accent: string }) => (
  <div className="p-4 rounded-xl bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968]">
    <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: accent }}>{label}</p>
    <p className="text-[24px] font-black mt-1 leading-none tabular-nums">{value}</p>
  </div>
);
