import { Phone, MessageCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const leads = [
  { name: "Priya Sharma", phone: "+91 98XXX 21847", score: 96, source: "Facebook Ads", initials: "PS", color: "from-primary to-primary-glow" },
  { name: "Rohit Verma", phone: "+91 99XXX 38271", score: 91, source: "Instagram", initials: "RV", color: "from-accent to-primary" },
  { name: "Anjali Mehta", phone: "+91 90XXX 19283", score: 88, source: "Google Ads", initials: "AM", color: "from-warning to-hot" },
  { name: "Karan Singh", phone: "+91 88XXX 73625", score: 84, source: "Referral", initials: "KS", color: "from-success to-accent" },
  { name: "Sneha Reddy", phone: "+91 97XXX 55012", score: 79, source: "Website", initials: "SR", color: "from-primary-glow to-accent" },
];

const ScoreRing = ({ score }: { score: number }) => {
  const r = 18, c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 90 ? "hsl(var(--hot))" : score >= 80 ? "hsl(var(--warning))" : "hsl(var(--accent))";
  return (
    <div className="relative w-11 h-11 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
        <circle
          cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dashoffset 1s" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-extrabold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
};

export const PriorityQueue = () => {
  return (
    <div className="glass-strong rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold tracking-tight">Priority Queue</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Hot leads needing attention</p>
        </div>
        <span className="text-[10px] font-bold text-hot bg-hot/15 px-2.5 py-1 rounded-full">
          {leads.length} URGENT
        </span>
      </div>

      <div className="space-y-2">
        {leads.map((lead, i) => (
          <div
            key={lead.name}
            className="glass rounded-xl p-3 flex items-center gap-3 hover:border-primary/40 transition-all group animate-fade-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-xs font-bold text-white flex-shrink-0", lead.color)}>
              {lead.initials}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold truncate">{lead.name}</p>
                <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase tracking-wider hidden sm:inline">
                  {lead.source}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">{lead.phone}</p>
            </div>

            <ScoreRing score={lead.score} />

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => toast.success(`Calling ${lead.name}…`)}
                className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-all hover:scale-110"
                title="Call"
              >
                <Phone className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => toast.success(`WhatsApp opened for ${lead.name}`)}
                className="w-8 h-8 rounded-lg bg-success/15 text-success flex items-center justify-center hover:bg-success hover:text-success-foreground transition-all hover:scale-110"
                title="WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => toast(`Marked ${lead.name} as done`)}
                className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all hover:scale-110"
                title="Mark done"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
