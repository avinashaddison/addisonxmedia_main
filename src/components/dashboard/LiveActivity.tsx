import { useEffect, useState } from "react";
import { UserPlus, MessageCircle, IndianRupee, Send, CheckCheck, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Activity = {
  id: number;
  icon: LucideIcon;
  text: string;
  detail: string;
  time: string;
  color: string;
  bg: string;
};

const seed: Activity[] = [
  { id: 1, icon: UserPlus, text: "New lead added", detail: "Priya Sharma · Facebook Ads", time: "Just now", color: "text-accent", bg: "bg-accent-soft" },
  { id: 2, icon: MessageCircle, text: "WhatsApp reply received", detail: "Rohit Verma", time: "2m ago", color: "text-primary", bg: "bg-primary-soft" },
  { id: 3, icon: IndianRupee, text: "Payment received ₹4,999", detail: "Anjali Mehta · Premium plan", time: "5m ago", color: "text-success", bg: "bg-success-soft" },
  { id: 4, icon: Send, text: "Follow-up sent", detail: "12 leads · template #4", time: "12m ago", color: "text-warning", bg: "bg-warning-soft" },
  { id: 5, icon: CheckCheck, text: "Deal marked won", detail: "Neha Joshi · ₹12,499", time: "18m ago", color: "text-success", bg: "bg-success-soft" },
  { id: 6, icon: UserPlus, text: "New lead added", detail: "Karan Singh · Instagram", time: "24m ago", color: "text-accent", bg: "bg-accent-soft" },
  { id: 7, icon: MessageCircle, text: "WhatsApp reply received", detail: "Sneha Reddy", time: "31m ago", color: "text-primary", bg: "bg-primary-soft" },
];

export const LiveActivity = () => {
  const [items, setItems] = useState(seed);

  useEffect(() => {
    const t = setInterval(() => {
      const next = { ...seed[Math.floor(Math.random() * seed.length)], id: Date.now(), time: "Just now" };
      setItems((prev) => [next, ...prev].slice(0, 8));
    }, 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="surface p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-bold tracking-tight">Recent Activity</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Live feed from your account</p>
        </div>
        <div className="flex items-center gap-1.5 chip bg-success-soft text-success">
          <span className="relative w-1.5 h-1.5">
            <span className="absolute inset-0 rounded-full bg-success" />
            <span className="absolute inset-0 rounded-full bg-success live-dot" />
          </span>
          Live
        </div>
      </div>

      <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1 max-h-[400px]">
        {items.map((item, i) => (
          <div
            key={item.id}
            className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors animate-fade-in"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", item.bg)}>
              <item.icon className={cn("w-4 h-4", item.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-foreground truncate">{item.text}</p>
              <p className="text-[11px] text-muted-foreground truncate">{item.detail}</p>
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">{item.time}</span>
          </div>
        ))}
      </div>

      <button className="mt-3 w-full text-xs font-semibold text-primary hover:bg-primary-soft py-2 rounded-lg transition-colors">
        View all activity →
      </button>
    </div>
  );
};
