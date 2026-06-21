import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Target, Phone, Mail, TrendingUp, Flame, IndianRupee, MessageCircle, ExternalLink, Download } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatINR, downloadCsv } from "@/lib/format";
import { toast } from "sonner";
import type { Lead, LeadStatus } from "@/lib/api-types";

const STAGES: { id: LeadStatus; label: string; dot: string; soft: string; text: string }[] = [
  { id: "new", label: "New", dot: "bg-[#3C50E0]", soft: "bg-[#E4E8FF]", text: "text-[#3C50E0]" },
  { id: "contacted", label: "Contacted", dot: "bg-[#B8651A]", soft: "bg-[#FFF1D6]", text: "text-[#B8651A]" },
  { id: "qualified", label: "Qualified", dot: "bg-[#FF6A1F]", soft: "bg-[#FFE2CC]", text: "text-[#C24E12]" },
  { id: "proposal", label: "Proposal", dot: "bg-[#7C3AED]", soft: "bg-[#EDE4FF]", text: "text-[#6D28D9]" },
  { id: "won", label: "Won", dot: "bg-[#0E8A4B]", soft: "bg-[#E6F7EE]", text: "text-[#0A6E3C]" },
  { id: "lost", label: "Lost", dot: "bg-[#9CA3AF]", soft: "bg-[#F1F1F1]", text: "text-[#6B7280]" },
];

const tagPill: Record<Lead["tag"], string> = {
  hot: "bg-[#FCE5F0] text-[#D4308E]",
  warm: "bg-[#FFF1D6] text-[#B8651A]",
  cold: "bg-[#E4E8FF] text-[#3C50E0]",
};

const useLeads = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["leads", user?.id],
    enabled: !!user,
    queryFn: () => api.listLeads() as Promise<Lead[]>,
  });
};

const useUpdateLeadStatus = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ id, lead_status }: { id: string; lead_status: LeadStatus }) =>
      api.updateLead(id, { lead_status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads", user?.id] });
      qc.invalidateQueries({ queryKey: ["contacts-page"] });
      qc.invalidateQueries({ queryKey: ["contacts-lookup"] });
      toast.success("Lead stage updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update"),
  });
};

export const LeadsPage = () => {
  const navigate = useNavigate();
  const { data: leads = [], isLoading } = useLeads();
  const [detail, setDetail] = useState<Lead | null>(null);
  const update = useUpdateLeadStatus();

  const byStage = useMemo(() => {
    const map: Record<LeadStatus, Lead[]> = { new: [], contacted: [], qualified: [], proposal: [], won: [], lost: [] };
    for (const l of leads) map[(l.lead_status ?? "new") as LeadStatus]?.push(l);
    return map;
  }, [leads]);

  const stats = useMemo(() => {
    const total = leads.length;
    const won = byStage.won.length;
    const openValue = leads
      .filter((l) => l.lead_status !== "won" && l.lead_status !== "lost")
      .reduce((s, l) => s + Number(l.open_value || 0), 0);
    const wonValue = leads.reduce((s, l) => s + Number(l.won_value || 0), 0);
    const conversion = total ? Math.round((won / total) * 1000) / 10 : 0;
    return { total, won, openValue, wonValue, conversion };
  }, [leads, byStage]);

  const exportCsv = () => {
    if (leads.length === 0) { toast.error("No leads to export"); return; }
    downloadCsv(
      `leads-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Name", "Phone", "Email", "Stage", "Tag", "Score", "Open Value", "Won Value", "Deals", "Source"],
      leads.map((l) => [
        l.name, l.phone, l.email ?? "", l.lead_status ?? "new", l.tag, l.score,
        Number(l.open_value || 0), Number(l.won_value || 0), l.deal_count, l.source ?? "",
      ]),
    );
    toast.success(`Exported ${leads.length} leads`);
  };

  return (
    <PageShell
      title="Leads"
      subtitle="Aapki poori sales pipeline — stage-wise"
      icon={<Target className="w-5 h-5" />}
      actions={
        <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv}>
          <Download className="w-3.5 h-3.5" /> Export CSV
        </Button>
      }
    >
      {/* STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Leads" value={String(stats.total)} icon={<Target className="w-4 h-4" />} accent="#3C50E0" />
        <StatCard label="Open Pipeline" value={formatINR(stats.openValue)} icon={<TrendingUp className="w-4 h-4" />} accent="#FF6A1F" />
        <StatCard label="Won Value" value={formatINR(stats.wonValue)} icon={<IndianRupee className="w-4 h-4" />} accent="#0E8A4B" />
        <StatCard label="Conversion" value={`${stats.conversion}%`} icon={<Flame className="w-4 h-4" />} accent="#D4308E" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : leads.length === 0 ? (
        <EmptyState onAdd={() => navigate("/app/contacts")} />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1">
          {STAGES.map((stage) => {
            const items = byStage[stage.id];
            const colValue = items.reduce((s, l) => s + Number(l.open_value || 0) + Number(l.won_value || 0), 0);
            return (
              <div key={stage.id} className="flex-shrink-0 w-[280px]">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2.5 h-2.5 rounded-full", stage.dot)} />
                    <span className="text-[13px] font-extrabold">{stage.label}</span>
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", stage.soft, stage.text)}>{items.length}</span>
                  </div>
                  {colValue > 0 && <span className="text-[11px] font-bold text-foreground/50">{formatINR(colValue)}</span>}
                </div>
                <div className="space-y-2 min-h-[80px]">
                  {items.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-[#E8B968]/50 py-6 text-center text-[11px] font-semibold text-foreground/40">
                      No leads
                    </div>
                  ) : (
                    items.map((l) => (
                      <LeadCard
                        key={l.id}
                        lead={l}
                        onOpen={() => setDetail(l)}
                        onMove={(lead_status) => update.mutate({ id: l.id, lead_status })}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {detail && (
        <LeadDetailDialog
          lead={detail}
          onClose={() => setDetail(null)}
          onMove={(lead_status) => { update.mutate({ id: detail.id, lead_status }); setDetail({ ...detail, lead_status }); }}
          onOpenChat={() => navigate(`/app/inbox?contactId=${detail.id}`)}
        />
      )}
    </PageShell>
  );
};

const StatCard = ({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent: string }) => (
  <div className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-3.5">
    <div className="flex items-center gap-2 mb-1.5">
      <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: accent }}>{icon}</span>
      <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/55">{label}</span>
    </div>
    <div className="text-[22px] font-black tabular-nums leading-none">{value}</div>
  </div>
);

const LeadCard = ({ lead, onOpen, onMove }: { lead: Lead; onOpen: () => void; onMove: (s: LeadStatus) => void }) => (
  <div className="bg-white border-2 border-[#E8B968] rounded-xl shadow-[0_2px_0_0_#E8B968] p-3 hover:-translate-y-0.5 transition-transform">
    <button onClick={onOpen} className="w-full text-left">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[13px] font-bold truncate">{lead.name}</span>
        <span className={cn("text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded", tagPill[lead.tag])}>{lead.tag}</span>
      </div>
      <div className="flex items-center gap-1 text-[11px] text-foreground/55 mb-1.5">
        <Phone className="w-3 h-3" /> {lead.phone}
      </div>
      <div className="flex items-center gap-3 text-[11px] font-bold">
        {Number(lead.open_value) > 0 && <span className="text-[#FF6A1F]">{formatINR(lead.open_value)} open</span>}
        {Number(lead.won_value) > 0 && <span className="text-[#0E8A4B]">{formatINR(lead.won_value)} won</span>}
        {Number(lead.open_value) === 0 && Number(lead.won_value) === 0 && <span className="text-foreground/40">Score {lead.score}</span>}
      </div>
    </button>
    <select
      value={lead.lead_status ?? "new"}
      onChange={(e) => onMove(e.target.value as LeadStatus)}
      onClick={(e) => e.stopPropagation()}
      className="mt-2.5 w-full h-8 px-2 rounded-lg bg-[#FFF6E8] border-2 border-[#E8B968] text-[11px] font-bold focus:outline-none focus:border-[#FF6A1F] cursor-pointer"
    >
      {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
    </select>
  </div>
);

const LeadDetailDialog = ({ lead, onClose, onMove, onOpenChat }: {
  lead: Lead; onClose: () => void; onMove: (s: LeadStatus) => void; onOpenChat: () => void;
}) => (
  <Dialog open onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {lead.name}
          <span className={cn("text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded", tagPill[lead.tag])}>{lead.tag}</span>
        </DialogTitle>
        <DialogDescription>Lead details & pipeline stage</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-[13px]">
          <Info icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={lead.phone} />
          <Info icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={lead.email ?? "—"} />
          <Info icon={<TrendingUp className="w-3.5 h-3.5" />} label="Score" value={String(lead.score)} />
          <Info icon={<Target className="w-3.5 h-3.5" />} label="Source" value={lead.source ?? "Direct"} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Open" value={formatINR(lead.open_value)} color="#FF6A1F" />
          <Metric label="Won" value={formatINR(lead.won_value)} color="#0E8A4B" />
          <Metric label="Deals" value={String(lead.deal_count)} color="#3C50E0" />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-foreground/55">Pipeline stage</label>
          <select
            value={lead.lead_status ?? "new"}
            onChange={(e) => onMove(e.target.value as LeadStatus)}
            className="mt-1 w-full h-10 px-2 rounded-lg bg-[#FFF6E8] border-2 border-[#E8B968] text-[13px] font-bold focus:outline-none focus:border-[#FF6A1F]"
          >
            {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </div>
      <DialogFooter className="gap-2 sm:gap-2">
        <Button variant="outline" className="gap-2" onClick={onOpenChat}>
          <MessageCircle className="w-4 h-4" /> Open chat
        </Button>
        <Button className="gap-2" onClick={onClose}>
          <ExternalLink className="w-4 h-4" /> Done
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const Info = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-lg bg-[#FFF6E8] border border-[#E8B968] p-2">
    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-foreground/45 mb-0.5">{icon} {label}</div>
    <div className="text-[13px] font-semibold truncate">{value}</div>
  </div>
);

const Metric = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div className="rounded-lg p-2 text-center" style={{ backgroundColor: `${color}15` }}>
    <div className="text-[15px] font-black tabular-nums" style={{ color }}>{value}</div>
    <div className="text-[10px] font-bold uppercase tracking-wider text-foreground/45">{label}</div>
  </div>
);

const EmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-[#FFF1D6] border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] flex items-center justify-center mb-5">
      <Target className="w-7 h-7 text-[#FF6A1F]" />
    </div>
    <h3 className="text-lg font-black mb-1">No leads yet</h3>
    <p className="text-sm font-semibold text-foreground/55 max-w-sm mb-4">
      Add contacts to start building your pipeline. Every contact is a lead you can move through stages.
    </p>
    <Button onClick={onAdd}>Go to Contacts</Button>
  </div>
);

export default LeadsPage;
