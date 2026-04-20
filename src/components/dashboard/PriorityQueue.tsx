import { Phone, MessageCircle, Mail, MoreVertical, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const leads = [
  { name: "Priya Sharma", phone: "+91 98XXX 21847", email: "priya@acme.co", score: 96, source: "Facebook", stage: "Qualified", value: "₹120K", initials: "PS", color: "bg-accent" },
  { name: "Rohit Verma", phone: "+91 99XXX 38271", email: "rohit@zenith.in", score: 91, source: "Instagram", stage: "Proposal", value: "₹85K", initials: "RV", color: "bg-primary" },
  { name: "Anjali Mehta", phone: "+91 90XXX 19283", email: "anjali@pixel.io", score: 88, source: "Google Ads", stage: "Contacted", value: "₹62K", initials: "AM", color: "bg-warning" },
  { name: "Karan Singh", phone: "+91 88XXX 73625", email: "karan@bluecart.com", score: 84, source: "Referral", stage: "Qualified", value: "₹45K", initials: "KS", color: "bg-[hsl(280_70%_60%)]" },
  { name: "Sneha Reddy", phone: "+91 97XXX 55012", email: "sneha@nova.tech", score: 79, source: "Website", stage: "New", value: "₹28K", initials: "SR", color: "bg-[hsl(243_75%_65%)]" },
];

const stageColors: Record<string, string> = {
  New: "bg-accent-soft text-accent",
  Contacted: "bg-warning-soft text-warning",
  Qualified: "bg-primary-soft text-primary",
  Proposal: "bg-[hsl(280_70%_96%)] text-[hsl(280_70%_45%)]",
};

export const PriorityQueue = () => {
  return (
    <div className="surface overflow-hidden">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-bold tracking-tight">Priority Leads</h3>
          <p className="text-xs text-muted-foreground mt-0.5">High-score leads needing attention today</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip bg-hot-soft text-hot">
            <Star className="w-3 h-3" fill="currentColor" />
            {leads.length} hot
          </span>
          <button className="text-xs font-semibold text-primary hover:underline">See all</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left font-semibold px-5 py-3">Lead</th>
              <th className="text-left font-semibold px-3 py-3 hidden md:table-cell">Contact</th>
              <th className="text-left font-semibold px-3 py-3 hidden lg:table-cell">Source</th>
              <th className="text-left font-semibold px-3 py-3">Stage</th>
              <th className="text-left font-semibold px-3 py-3">Score</th>
              <th className="text-left font-semibold px-3 py-3 hidden md:table-cell">Value</th>
              <th className="text-right font-semibold px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leads.map((lead, i) => (
              <tr key={lead.name} className="hover:bg-muted/30 transition-colors animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white", lead.color)}>
                      {lead.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold truncate">{lead.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate md:hidden">{lead.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 hidden md:table-cell">
                  <p className="text-[12px] font-mono text-foreground">{lead.phone}</p>
                  <p className="text-[11px] text-muted-foreground">{lead.email}</p>
                </td>
                <td className="px-3 py-3 hidden lg:table-cell">
                  <span className="text-[12px] text-muted-foreground">{lead.source}</span>
                </td>
                <td className="px-3 py-3">
                  <span className={cn("chip", stageColors[lead.stage])}>{lead.stage}</span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", lead.score >= 90 ? "bg-hot" : lead.score >= 80 ? "bg-warning" : "bg-accent")}
                        style={{ width: `${lead.score}%` }}
                      />
                    </div>
                    <span className="text-[12px] font-bold tabular-nums">{lead.score}</span>
                  </div>
                </td>
                <td className="px-3 py-3 hidden md:table-cell">
                  <span className="text-[13px] font-bold text-foreground">{lead.value}</span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => toast.success(`Calling ${lead.name}…`)}
                      className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-accent-soft hover:text-accent transition-all"
                      title="Call"
                    >
                      <Phone className="w-3.5 h-3.5 mx-auto" />
                    </button>
                    <button
                      onClick={() => toast.success(`Opened WhatsApp for ${lead.name}`)}
                      className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-primary-soft hover:text-primary transition-all"
                      title="WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5 mx-auto" />
                    </button>
                    <button
                      onClick={() => toast.success(`Email composer opened`)}
                      className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-warning-soft hover:text-warning transition-all hidden sm:flex items-center justify-center"
                      title="Email"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                    <button className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-muted transition-all">
                      <MoreVertical className="w-3.5 h-3.5 mx-auto" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
