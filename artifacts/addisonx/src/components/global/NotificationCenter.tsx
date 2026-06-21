import { useMemo, useState } from "react";
import { Bell, Flame, Clock, IndianRupee, UserPlus, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/inbox-types";
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
  page: string;
};

const ICONS = {
  lead: { icon: UserPlus, color: "text-accent", bg: "bg-accent-soft" },
  hot: { icon: Flame, color: "text-hot", bg: "bg-hot-soft" },
  overdue: { icon: Clock, color: "text-warning", bg: "bg-warning-soft" },
  payment: { icon: IndianRupee, color: "text-success", bg: "bg-success-soft" },
} as const;

type Props = { onNavigate: (page: string) => void };

const DAY = 24 * 3600 * 1000;

// Real notifications derived from workspace data — no seed array.
export const NotificationCenter = ({ onNavigate }: Props) => {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: !!user,
    queryFn: () => api.getDashboard(),
  });

  const items: Notif[] = useMemo(() => {
    if (!data) return [];
    const out: Notif[] = [];
    const now = Date.now();

    // Recent hot leads (created in last 24h)
    const recentHot = (data.contacts ?? [])
      .filter((c: any) => c.tag === "hot" && c.created_at && now - new Date(c.created_at).getTime() < DAY)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
    for (const c of recentHot) {
      out.push({
        id: `hot-${c.id}`,
        type: "hot",
        title: "Hot lead detected",
        body: `${c.name} (score ${c.score}) — ${c.phone}`,
        time: formatRelative(c.created_at),
        page: "contacts",
      });
    }

    // Overdue tasks
    const overdue = (data.tasks ?? [])
      .filter((t: any) => t.due_at && new Date(t.due_at).getTime() < now)
      .slice(0, 3);
    if (overdue.length > 0) {
      out.push({
        id: `overdue-${overdue.length}`,
        type: "overdue",
        title: `${overdue.length} follow-up${overdue.length > 1 ? "s" : ""} overdue`,
        body: overdue.map((t: any) => t.title).slice(0, 2).join(", "),
        time: formatRelative(overdue[0].due_at),
        page: "followups",
      });
    }

    // Recent won deals (last 7d)
    const recentWon = (data.deals ?? [])
      .filter((d: any) => d.stage === "won" && d.closed_at && now - new Date(d.closed_at).getTime() < 7 * DAY)
      .sort((a: any, b: any) => new Date(b.closed_at).getTime() - new Date(a.closed_at).getTime())
      .slice(0, 2);
    for (const d of recentWon) {
      out.push({
        id: `won-${d.id}`,
        type: "payment",
        title: "Deal closed-won",
        body: `₹${Number(d.value).toLocaleString("en-IN")} — ${d.title ?? "Deal"}`,
        time: formatRelative(d.closed_at),
        page: "deals",
      });
    }

    // Recently added regular leads
    const recentLeads = (data.contacts ?? [])
      .filter((c: any) => c.tag !== "hot" && c.created_at && now - new Date(c.created_at).getTime() < DAY)
      .slice(0, 2);
    for (const c of recentLeads) {
      out.push({
        id: `lead-${c.id}`,
        type: "lead",
        title: "New lead",
        body: `${c.name} via ${c.source ?? "manual entry"}`,
        time: formatRelative(c.created_at),
        page: "contacts",
      });
    }

    return out.slice(0, 8);
  }, [data]);

  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const unreadCount = items.filter((i) => !readIds.has(i.id)).length;

  const handleClick = (n: Notif) => {
    setReadIds((prev) => new Set(prev).add(n.id));
    setOpen(false);
    onNavigate(n.page);
  };

  const markAllRead = () => setReadIds(new Set(items.map((i) => i.id)));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative w-9 h-9 rounded-xl hover:bg-muted flex items-center justify-center transition-all hover:scale-105 group"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
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
            <p className="text-[10px] text-muted-foreground">{unreadCount} unread · derived from your workspace</p>
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
              <p className="text-[10px] text-muted-foreground">
                No hot leads, overdue tasks, or recent wins to flag.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const meta = ICONS[n.type];
                const Icon = meta.icon;
                const unread = !readIds.has(n.id);
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => handleClick(n)}
                      className={cn(
                        "w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/40 transition-colors group relative",
                        unread && "bg-primary-soft/20"
                      )}
                    >
                      {unread && <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />}
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", meta.bg)}>
                        <Icon className={cn("w-4 h-4", meta.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold leading-tight">{n.title}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">{n.time}</p>
                      </div>
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
