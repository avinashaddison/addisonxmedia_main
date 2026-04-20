import { Phone, MessageCircle, Mail, MoreVertical, Star, Filter, ArrowUpDown, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";

const leads = [
  { name: "Priya Sharma", phone: "+91 98XXX 21847", email: "priya@acme.co", score: 96, source: "Facebook", stage: "Qualified", value: "₹120K", initials: "PS", color: "bg-accent", lastActive: "2 min ago" },
  { name: "Rohit Verma", phone: "+91 99XXX 38271", email: "rohit@zenith.in", score: 91, source: "Instagram", stage: "Proposal", value: "₹85K", initials: "RV", color: "bg-primary", lastActive: "5 min ago" },
  { name: "Anjali Mehta", phone: "+91 90XXX 19283", email: "anjali@pixel.io", score: 88, source: "Google Ads", stage: "Contacted", value: "₹62K", initials: "AM", color: "bg-warning", lastActive: "12 min ago" },
  { name: "Karan Singh", phone: "+91 88XXX 73625", email: "karan@bluecart.com", score: 84, source: "Referral", stage: "Qualified", value: "₹45K", initials: "KS", color: "bg-[hsl(280_70%_60%)]", lastActive: "1 hr ago" },
  { name: "Sneha Reddy", phone: "+91 97XXX 55012", email: "sneha@nova.tech", score: 79, source: "Website", stage: "New", value: "₹28K", initials: "SR", color: "bg-[hsl(243_75%_65%)]", lastActive: "3 hr ago" },
];

const stageColors: Record<string, string> = {
  New: "bg-accent-soft text-accent",
  Contacted: "bg-warning-soft text-warning",
  Qualified: "bg-primary-soft text-primary",
  Proposal: "bg-[hsl(280_70%_96%)] text-[hsl(280_70%_45%)]",
};

export const PriorityQueue = () => {
  const [selected, setSelected] = useState<string[]>([]);
  const toggleSelect = (name: string) =>
    setSelected((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]);
  const toggleAll = () =>
    setSelected((prev) => prev.length === leads.length ? [] : leads.map((l) => l.name));

  return (
    <div className="surface overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-[14px] font-bold tracking-tight">Priority Leads</h3>
          <span className="chip bg-hot-soft text-hot text-[10px]">
            <Star className="w-3 h-3" fill="currentColor" />
            {leads.length} hot
          </span>
        </div>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <div className="flex items-center gap-2 mr-2 animate-fade-in">
              <span className="text-[11px] font-medium text-muted-foreground">{selected.length} selected</span>
              <button
                onClick={() => { toast.success(`Bulk WhatsApp sent to ${selected.length} leads`); setSelected([]); }}
                className="h-7 px-2.5 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold flex items-center gap-1"
              >
                <MessageCircle className="w-3 h-3" /> Send WhatsApp
              </button>
            </div>
          )}
          <button className="h-7 px-2.5 rounded-md border border-border text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center gap-1 transition-colors">
            <Filter className="w-3 h-3" /> Filter
          </button>
          <button className="h-7 px-2.5 rounded-md border border-border text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center gap-1 transition-colors">
            <ArrowUpDown className="w-3 h-3" /> Sort
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="w-10 px-4 py-2.5">
                <button onClick={toggleAll} className="w-4 h-4 rounded border border-border bg-card flex items-center justify-center hover:border-primary transition-colors">
                  {selected.length === leads.length && <CheckSquare className="w-3 h-3 text-primary" />}
                </button>
              </th>
              <th className="text-left font-semibold px-3 py-2.5">Lead</th>
              <th className="text-left font-semibold px-3 py-2.5 hidden md:table-cell">Contact</th>
              <th className="text-left font-semibold px-3 py-2.5 hidden lg:table-cell">Source</th>
              <th className="text-left font-semibold px-3 py-2.5">Stage</th>
              <th className="text-left font-semibold px-3 py-2.5">Score</th>
              <th className="text-left font-semibold px-3 py-2.5 hidden md:table-cell">Value</th>
              <th className="text-left font-semibold px-3 py-2.5 hidden xl:table-cell">Active</th>
              <th className="text-right font-semibold px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leads.map((lead, i) => {
              const isSelected = selected.includes(lead.name);
              return (
                <tr
                  key={lead.name}
                  className={cn(
                    "hover:bg-muted/20 transition-colors animate-fade-in group",
                    isSelected && "bg-primary-soft/30"
                  )}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => toggleSelect(lead.name)}
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                        isSelected ? "bg-primary border-primary" : "border-border bg-card hover:border-primary/50"
                      )}
                    >
                      {isSelected && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0", lead.color)}>
                        {lead.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold truncate">{lead.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate md:hidden">{lead.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 hidden md:table-cell">
                    <p className="text-[12px] text-foreground font-mono">{lead.phone}</p>
                    <p className="text-[11px] text-muted-foreground">{lead.email}</p>
                  </td>
                  <td className="px-3 py-2.5 hidden lg:table-cell">
                    <span className="text-[12px] text-muted-foreground">{lead.source}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={cn("chip text-[10px]", stageColors[lead.stage])}>{lead.stage}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", lead.score >= 90 ? "bg-hot" : lead.score >= 80 ? "bg-warning" : "bg-accent")} style={{ width: `${lead.score}%` }} />
                      </div>
                      <span className={cn("text-[12px] font-bold tabular-nums", lead.score >= 90 ? "text-hot" : "text-foreground")}>{lead.score}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 hidden md:table-cell">
                    <span className="text-[13px] font-semibold">{lead.value}</span>
                  </td>
                  <td className="px-3 py-2.5 hidden xl:table-cell">
                    <span className="text-[11px] text-muted-foreground">{lead.lastActive}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => toast.success(`Calling ${lead.name}…`)} className="w-7 h-7 rounded-md text-muted-foreground hover:bg-accent-soft hover:text-accent transition-all" title="Call">
                        <Phone className="w-3.5 h-3.5 mx-auto" />
                      </button>
                      <button onClick={() => toast.success(`WhatsApp opened for ${lead.name}`)} className="w-7 h-7 rounded-md text-muted-foreground hover:bg-primary-soft hover:text-primary transition-all" title="WhatsApp">
                        <MessageCircle className="w-3.5 h-3.5 mx-auto" />
                      </button>
                      <button onClick={() => toast.success(`Email sent`)} className="w-7 h-7 rounded-md text-muted-foreground hover:bg-warning-soft hover:text-warning transition-all" title="Email">
                        <Mail className="w-3.5 h-3.5 mx-auto" />
                      </button>
                      <button className="w-7 h-7 rounded-md text-muted-foreground hover:bg-muted transition-all">
                        <MoreVertical className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-border flex items-center justify-between bg-muted/20">
        <span className="text-[11px] text-muted-foreground">Showing 5 of 184 leads</span>
        <div className="flex items-center gap-1">
          <button className="h-7 w-7 rounded-md border border-border text-[11px] text-muted-foreground hover:bg-muted flex items-center justify-center transition-colors">←</button>
          <button className="h-7 w-7 rounded-md bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center">1</button>
          <button className="h-7 w-7 rounded-md border border-border text-[11px] text-muted-foreground hover:bg-muted flex items-center justify-center transition-colors">2</button>
          <button className="h-7 w-7 rounded-md border border-border text-[11px] text-muted-foreground hover:bg-muted flex items-center justify-center transition-colors">3</button>
          <button className="h-7 w-7 rounded-md border border-border text-[11px] text-muted-foreground hover:bg-muted flex items-center justify-center transition-colors">→</button>
        </div>
      </div>
    </div>
  );
};
