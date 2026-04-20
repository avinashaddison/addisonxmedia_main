import { MoreHorizontal } from "lucide-react";

const stages = [
  { label: "New", count: 847, color: "hsl(217 91% 60%)", bg: "bg-accent-soft", percent: 100 },
  { label: "Contacted", count: 624, color: "hsl(243 75% 65%)", bg: "bg-[hsl(243_75%_96%)]", percent: 73 },
  { label: "Qualified", count: 412, color: "hsl(38 92% 50%)", bg: "bg-warning-soft", percent: 49 },
  { label: "Proposal", count: 218, color: "hsl(280 70% 60%)", bg: "bg-[hsl(280_70%_96%)]", percent: 26 },
  { label: "Won", count: 147, color: "hsl(142 70% 38%)", bg: "bg-primary-soft", percent: 17 },
];

const sampleLeads: Record<string, { name: string; company: string; value: string }[]> = {
  New: [
    { name: "Priya Sharma", company: "Acme Co.", value: "₹45K" },
    { name: "Rohit Verma", company: "Zenith Ltd.", value: "₹28K" },
    { name: "+ 845 more", company: "", value: "" },
  ],
  Contacted: [
    { name: "Anjali Mehta", company: "Pixel Labs", value: "₹62K" },
    { name: "Karan Singh", company: "BlueCart", value: "₹35K" },
    { name: "+ 622 more", company: "", value: "" },
  ],
  Qualified: [
    { name: "Sneha Reddy", company: "Nova Tech", value: "₹120K" },
    { name: "Arjun Kapoor", company: "Lift IO", value: "₹85K" },
    { name: "+ 410 more", company: "", value: "" },
  ],
  Proposal: [
    { name: "Neha Joshi", company: "Vega Group", value: "₹240K" },
    { name: "Rahul Iyer", company: "Trail.in", value: "₹180K" },
    { name: "+ 216 more", company: "", value: "" },
  ],
  Won: [
    { name: "Aditya Rao", company: "Forge AI", value: "₹350K" },
    { name: "Meera Nair", company: "Hexa", value: "₹220K" },
    { name: "+ 145 more", company: "", value: "" },
  ],
};

export const Pipeline = () => {
  const totalValue = "₹18.4L";

  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-bold tracking-tight">Sales Pipeline</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="font-semibold text-foreground">{totalValue}</span> total pipeline value · 2,248 active leads
          </p>
        </div>
        <button className="text-xs font-semibold text-primary hover:underline">View all →</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stages.map((stage, i) => (
          <div
            key={stage.label}
            className="bg-muted/30 border border-border rounded-xl p-3 hover:border-primary/30 transition-all animate-slide-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                <span className="text-xs font-semibold text-foreground">{stage.label}</span>
              </div>
              <button className="text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xl font-bold tracking-tight">{stage.count}</p>
            <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${stage.percent}%`, background: stage.color }} />
            </div>

            <div className="mt-3 space-y-1.5">
              {sampleLeads[stage.label].map((lead, idx) => (
                <div
                  key={idx}
                  className={`bg-card border border-border rounded-lg p-2 ${idx === 2 ? 'text-center' : ''}`}
                >
                  {idx === 2 ? (
                    <p className="text-[10px] text-muted-foreground font-medium">{lead.name}</p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[11px] font-semibold truncate">{lead.name}</p>
                        <span className="text-[10px] font-bold text-primary flex-shrink-0">{lead.value}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{lead.company}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
