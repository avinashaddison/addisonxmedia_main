import { Check, X } from "lucide-react";
import { Reveal } from "./Reveal";

const rows = [
  { feature: "AI replies in <2s", us: true, others: false, diy: false },
  { feature: "Lead scoring (hot/warm/cold)", us: true, others: "limited", diy: false },
  { feature: "WhatsApp + Insta + forms in one inbox", us: true, others: "limited", diy: false },
  { feature: "Native pay links (UPI/Razorpay)", us: true, others: false, diy: false },
  { feature: "Revenue attribution per message", us: true, others: false, diy: false },
  { feature: "Setup time", us: "2 min", others: "2 weeks", diy: "Months" },
  { feature: "Tools you replace", us: "5 tools", others: "1 tool", diy: "0" },
  { feature: "Built for India (UPI, Hindi, INR)", us: true, others: false, diy: false },
];

const Cell = ({ v }: { v: boolean | string }) => {
  if (v === true) return <Check className="w-4 h-4 text-success mx-auto" strokeWidth={3} />;
  if (v === false) return <X className="w-4 h-4 text-muted-foreground/50 mx-auto" strokeWidth={2.5} />;
  if (v === "limited")
    return <span className="text-[11px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-full">Limited</span>;
  return <span className="text-[12px] font-bold text-foreground/80">{v}</span>;
};

export const ComparisonGrid = () => (
  <section className="max-w-7xl mx-auto px-6 py-20">
    <Reveal className="text-center max-w-2xl mx-auto mb-12">
      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Why teams switch</span>
      <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-3">
        Replaces 5 tools. <span className="text-muted-foreground">Costs less than 1.</span>
      </h2>
      <p className="text-muted-foreground mt-4">Stop stitching tools together. AddisonX does it all — natively.</p>
    </Reveal>

    <Reveal>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Feature</th>
              <th className="px-6 py-4 text-center">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-extrabold tracking-tight">
                  <span className="w-2 h-2 rounded-full bg-primary" /> AddisonX
                </span>
              </th>
              <th className="px-6 py-4 text-center text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                Other CRMs
              </th>
              <th className="px-6 py-4 text-center text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                DIY stack
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.feature}
                className={`border-b border-border last:border-0 transition-colors hover:bg-primary-soft/30 ${
                  i % 2 === 0 ? "bg-background" : "bg-muted/20"
                }`}
              >
                <td className="px-6 py-3.5 text-[13px] font-semibold">{r.feature}</td>
                <td className="px-6 py-3.5 text-center bg-primary-soft/40"><Cell v={r.us} /></td>
                <td className="px-6 py-3.5 text-center"><Cell v={r.others} /></td>
                <td className="px-6 py-3.5 text-center"><Cell v={r.diy} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Reveal>
  </section>
);

export default ComparisonGrid;
