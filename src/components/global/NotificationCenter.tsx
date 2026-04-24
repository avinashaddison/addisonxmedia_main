import { useState } from "react";
import { Bell, Flame, Clock, IndianRupee, UserPlus, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

type Notif = {
  id: string;
  type: "lead" | "hot" | "overdue" | "payment";
  title: string;
  body: string;
  time: string;
  unread: boolean;
  page: string;
};

const ICONS = {
  lead: { icon: UserPlus, color: "text-accent", bg: "bg-accent-soft" },
  hot: { icon: Flame, color: "text-hot", bg: "bg-hot-soft" },
  overdue: { icon: Clock, color: "text-warning", bg: "bg-warning-soft" },
  payment: { icon: IndianRupee, color: "text-success", bg: "bg-success-soft" },
} as const;

const SEED: Notif[] = [
  { id: "n1", type: "hot", title: "Hot lead detected", body: "Karan Mehra (high intent · 92%) is asking about Pro plan", time: "2m ago", unread: true, page: "inbox" },
  { id: "n2", type: "payment", title: "Payment received", body: "₹14,999 from Priya M. — Pro plan activated", time: "12m ago", unread: true, page: "deals" },
  { id: "n3", type: "lead", title: "New lead received", body: "Rohit S. came through Instagram ad", time: "38m ago", unread: true, page: "contacts" },
  { id: "n4", type: "overdue", title: "Follow-up overdue", body: "3 leads waiting > 1h — risk of losing", time: "1h ago", unread: false, page: "followups" },
  { id: "n5", type: "lead", title: "New lead received", body: "Aman K. via website chat widget", time: "2h ago", unread: false, page: "contacts" },
];

type Props = { onNavigate: (page: string) => void };

export const NotificationCenter = ({ onNavigate }: Props) => {
  const [items, setItems] = useState<Notif[]>(SEED);
  const [open, setOpen] = useState(false);
  const unreadCount = items.filter((i) => i.unread).length;

  const handleClick = (n: Notif) => {
    setItems((arr) => arr.map((i) => (i.id === n.id ? { ...i, unread: false } : i)));
    setOpen(false);
    onNavigate(n.page);
  };

  const markAllRead = () => setItems((arr) => arr.map((i) => ({ ...i, unread: false })));
  const dismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItems((arr) => arr.filter((i) => i.id !== id));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative w-9 h-9 rounded-xl hover:bg-muted flex items-center justify-center transition-all hover:scale-105 group"
          title="Notifications"
        >
          <Bell className={cn("w-[18px] h-[18px] text-muted-foreground group-hover:text-foreground transition-colors",
            unreadCount > 0 && "text-foreground")} strokeWidth={2} />
          {unreadCount > 0 && (
            <>
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-gradient-to-br from-hot to-destructive text-[9px] font-bold text-hot-foreground flex items-center justify-center ring-2 ring-card shadow-md shadow-hot/40">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
              <span className="absolute top-1.5 right-1.5 w-[16px] h-[16px] rounded-full bg-hot animate-ping opacity-50" />
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 overflow-hidden" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary-soft/40 to-transparent">
          <div>
            <p className="text-[13px] font-bold">Notifications</p>
            <p className="text-[10px] text-muted-foreground">{unreadCount} unread</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={markAllRead}>
              <Check className="w-3 h-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Bell className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-[12px] font-semibold">All caught up 🎉</p>
              <p className="text-[10px] text-muted-foreground">No new notifications</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const meta = ICONS[n.type];
                const Icon = meta.icon;
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => handleClick(n)}
                      className={cn(
                        "w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/40 transition-colors group relative",
                        n.unread && "bg-primary-soft/20"
                      )}
                    >
                      {n.unread && <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />}
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", meta.bg)}>
                        <Icon className={cn("w-4 h-4", meta.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold leading-tight">{n.title}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">{n.time}</p>
                      </div>
                      <button
                        onClick={(e) => dismiss(n.id, e)}
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-destructive transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
