import { MoreHorizontal } from "lucide-react";

const stages = [
  { label: "New", count: 847, value: "₹3.2L", color: "hsl(217 91% 60%)", percent: 100 },
  { label: "Contacted", count: 624, value: "₹4.8L", color: "hsl(243 75% 65%)", percent: 73 },
  { label: "Qualified", count: 412, value: "₹6.1L", color: "hsl(38 92% 50%)", percent: 49 },
  { label: "Proposal", count: 218, value: "₹2.4L", color: "hsl(280 70% 60%)", percent: 26 },
  { label: "Won", count: 147, value: "₹1.9L", color: "hsl(142 70% 38%)", percent: 17 },
];

const miniLeads: Record<string, string[]> = {
  New: ["Priya S.", "Rohit V.", "Neha J."],
  Contacted: ["Anjali M.", "Karan S.", "Aarav P."],
  Qualified: ["Sneha R.", "Meera N.", "Rahul I."],
  Proposal: ["Arjun K.", "Diya G.", "Vivek T."],
  Won: ["Aditya R.", "Pooja B.", "Sanjay M."],
};

export const Pipeline = () => {
  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-bold tracking-tight">Sales Pipeline</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="font-semibold text-foreground">₹18.4L</span> total · 2,248 leads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-3 mr-2">
            {stages.map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm" style={{ background: s.color }} />
                <span className="text-[10px] text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
          <button className="text-[11px] font-semibold text-primary hover:underline">View board →</button>
        </div>
      </div>

      {/* Funnel bar */}
      <div className="flex h-8 rounded-lg overflow-hidden mb-4">
        {stages.map((s, i) => (
          <div
            key={s.label}
            className="flex items-center justify-center text-[10px] font-bold text-white transition-all hover:opacity-90 cursor-pointer group relative"
            style={{ width: `${s.percent}%`, background: s.color, minWidth: 48 }}
          >
            <span className="truncate px-1">{s.count}</span>
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-semibold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
              {s.label}: {s.count} leads · {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Stage cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {stages.map((stage, i) => (
          <div
            key={stage.label}
            className="border border-border rounded-xl p-3 hover:border-primary/30 transition-all animate-slide-up cursor-pointer group"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-semibold text-foreground">{stage.label}</span>
              <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-lg font-bold">{stage.count}</span>
              <span className="text-[11px] text-muted-foreground">{stage.value}</span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden mb-2.5">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${stage.percent}%`, background: stage.color }} />
            </div>
            <div className="space-y-1">
              {miniLeads[stage.label].map((name) => (
                <div key={name} className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                    {name.split(" ").map(w => w[0]).join("")}
                  </div>
                  <span className="text-[11px] text-muted-foreground truncate">{name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
