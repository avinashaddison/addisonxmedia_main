import { useEffect, useState } from "react";
import { UserPlus, Bot, Send, IndianRupee, MessageCircle, Phone, LucideIcon } from "lucide-react";
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
  { id: 1, icon: UserPlus, text: "New lead from Facebook Ads", detail: "Priya Sharma · Mumbai", time: "2s ago", color: "text-accent", bg: "bg-accent/15" },
  { id: 2, icon: Bot, text: "AI replied to Rohit Verma", detail: "Qualification stage", time: "14s ago", color: "text-primary-glow", bg: "bg-primary/15" },
  { id: 3, icon: IndianRupee, text: "Payment received ₹4,999", detail: "Anjali Mehta · Premium", time: "32s ago", color: "text-success", bg: "bg-success/15" },
  { id: 4, icon: Send, text: "Follow-up sent automatically", detail: "Batch of 12 leads", time: "1m ago", color: "text-warning", bg: "bg-warning/15" },
  { id: 5, icon: MessageCircle, text: "WhatsApp conversation started", detail: "Karan Singh", time: "2m ago", color: "text-accent", bg: "bg-accent/15" },
  { id: 6, icon: Bot, text: "AI closed deal with Neha", detail: "₹12,499 · Elite plan", time: "3m ago", color: "text-primary-glow", bg: "bg-primary/15" },
  { id: 7, icon: Phone, text: "Call scheduled with Arjun", detail: "Tomorrow 11:00 AM", time: "4m ago", color: "text-warning", bg: "bg-warning/15" },
  { id: 8, icon: UserPlus, text: "New lead from Instagram", detail: "Sneha Reddy · Bangalore", time: "5m ago", color: "text-accent", bg: "bg-accent/15" },
];

export const LiveActivity = () => {
  const [items, setItems] = useState(seed);

  useEffect(() => {
    const interval = setInterval(() => {
      const newItem = { ...seed[Math.floor(Math.random() * seed.length)], id: Date.now(), time: "now" };
      setItems((prev) => [newItem, ...prev].slice(0, 10));
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-strong rounded-2xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-hot" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-hot animate-ping" />
          </div>
          <h3 className="text-sm font-bold tracking-tight">Live Activity</h3>
        </div>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Real-time</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1 max-h-[440px]">
        {items.map((item, i) => (
          <div
            key={item.id}
            className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors animate-slide-in-left"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", item.bg)}>
              <item.icon className={cn("w-4 h-4", item.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{item.text}</p>
              <p className="text-[11px] text-muted-foreground truncate">{item.detail}</p>
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
