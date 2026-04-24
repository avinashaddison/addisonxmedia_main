import { Search } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ConversationWithContact, tagLabel, initialsFor, formatRelative } from "@/lib/inbox-types";
import { NewConversationDialog } from "./NewConversationDialog";

type Props = {
  conversations: ConversationWithContact[];
  activeId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  className?: string;
};

const filters = ["All", "Unread", "Hot", "Closed"] as const;

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const statusDot = (tag: string, hasUnread: boolean) => {
  if (tag === "hot") return { color: "bg-hot", pulse: true, label: "Hot lead" };
  if (hasUnread) return { color: "bg-warning", pulse: false, label: "Waiting" };
  return { color: "bg-success", pulse: false, label: "Online" };
};

export const ConversationList = ({ conversations, activeId, onSelect, loading, className }: Props) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = conversations.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      const inName = c.contact.name.toLowerCase().includes(q);
      const inPhone = c.contact.phone.toLowerCase().includes(q);
      const inMsg = (c.last_message_preview ?? "").toLowerCase().includes(q);
      if (!inName && !inPhone && !inMsg) return false;
    }
    if (filter === "Unread" && c.unread_count === 0) return false;
    if (filter === "Hot" && c.contact.tag !== "hot") return false;
    if (filter === "Closed" && c.status !== "closed") return false;
    return true;
  });

  // Keyboard navigation: ↑ ↓ to switch chats
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      if (filtered.length === 0) return;
      e.preventDefault();
      const idx = filtered.findIndex((c) => c.id === activeId);
      const nextIdx = e.key === "ArrowDown"
        ? Math.min(filtered.length - 1, idx + 1)
        : Math.max(0, idx - 1);
      onSelect(filtered[nextIdx].id);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [filtered, activeId, onSelect]);

  const unreadTotal = conversations.reduce((a, c) => a + (c.unread_count || 0), 0);
  const hotCount = conversations.filter((c) => c.contact.tag === "hot").length;

  return (
    <div className="w-[340px] h-full bg-card border-r border-border flex flex-col flex-shrink-0 relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/5 to-transparent" />

      {/* Header */}
      <div className="relative h-16 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
        <div className="min-w-0">
          <h2 className="text-[16px] font-bold tracking-tight leading-tight">Chats</h2>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <span>{conversations.length} total</span>
            <span>·</span>
            <span className="text-warning">{unreadTotal} unread</span>
            <span>·</span>
            <span className="text-hot flex items-center gap-1">
              {hotCount} hot
              {hotCount > 0 && <span className="w-1 h-1 rounded-full bg-hot animate-pulse" />}
            </span>
          </p>
        </div>
        <NewConversationDialog onCreated={onSelect} />
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats…  ↑ ↓ to navigate"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted border-0 text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      {/* Sticky Filters */}
      <div className="sticky top-0 z-10 px-3 pb-2 flex gap-1 flex-shrink-0 overflow-x-auto bg-card/95 backdrop-blur">
        {filters.map((f) => {
          const count = f === "Unread" ? unreadTotal : f === "Hot" ? hotCount : null;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1",
                filter === f
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
              {count !== null && count > 0 && (
                <span className={cn(
                  "text-[9px] font-bold px-1 rounded-full min-w-[14px] text-center",
                  filter === f ? "bg-primary-foreground/20" : "bg-foreground/10"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Conversations */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {loading && (
          <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">Loading…</div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-[13px] font-semibold text-foreground mb-1">
              {conversations.length === 0 ? "No conversations yet" : "No matches"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {conversations.length === 0
                ? "Click + above to start your first chat"
                : "Try a different search or filter"}
            </p>
          </div>
        )}

        {filtered.map((conv) => {
          const isActive = conv.id === activeId;
          const isHovered = hoveredId === conv.id;
          const tag = tagLabel[conv.contact.tag];
          const initials = initialsFor(conv.contact.name);
          const dot = statusDot(conv.contact.tag, conv.unread_count > 0);
          const potentialValue = Math.round(2000 + conv.contact.score * 100);
          const isHot = conv.contact.tag === "hot";

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              onMouseEnter={() => setHoveredId(conv.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={cn(
                "relative w-full flex items-start gap-3 px-4 py-3 text-left transition-all border-b border-border/40 group",
                isActive
                  ? "bg-gradient-to-r from-primary-soft/70 via-primary-soft/30 to-transparent"
                  : isHot
                    ? "hover:bg-hot-soft/40 bg-gradient-to-r from-hot-soft/20 to-transparent"
                    : "hover:bg-muted/50",
                isHot && !isActive && "hot-glow"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-10 rounded-r-full bg-gradient-to-b from-primary to-primary-glow shadow-[0_0_12px_hsl(var(--primary)/0.5)]" />
              )}

              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center text-[12px] font-bold ring-2 ring-card transition-transform group-hover:scale-105",
                  isHot ? "bg-gradient-to-br from-hot-soft to-hot/20 text-hot" :
                  conv.contact.tag === "warm" ? "bg-gradient-to-br from-warning-soft to-warning/20 text-warning" :
                  "bg-gradient-to-br from-muted to-muted/60 text-muted-foreground"
                )}>
                  {initials}
                </div>
                {/* Status dot */}
                <span
                  title={dot.label}
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-card",
                    dot.color,
                    dot.pulse && "animate-pulse"
                  )}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={cn("text-[13px] font-semibold truncate", conv.unread_count > 0 ? "text-foreground" : "text-foreground/80")}>
                      {conv.contact.name}
                    </span>
                    <span className={cn(
                      "text-[8px] font-bold px-1 py-0.5 rounded uppercase tracking-wider flex-shrink-0",
                      isHot ? "bg-hot/15 text-hot" :
                      conv.contact.tag === "warm" ? "bg-warning/15 text-warning" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {tag.label}
                    </span>
                  </div>
                  <span className={cn("text-[10px] flex-shrink-0 ml-2", conv.unread_count > 0 ? "text-primary font-semibold" : "text-muted-foreground")}>
                    {formatRelative(conv.last_message_at)}
                  </span>
                </div>

                {/* ₹ potential value */}
                <div className="flex items-center justify-between mb-0.5">
                  <span className={cn(
                    "text-[10px] font-bold tabular-nums",
                    isHot ? "text-hot" : conv.contact.tag === "warm" ? "text-warning" : "text-muted-foreground"
                  )}>
                    {formatINR(potentialValue)} potential
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <p className={cn(
                    "text-[12px] truncate pr-2 transition-all",
                    isHovered ? "whitespace-normal line-clamp-2 text-foreground" : "truncate",
                    conv.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                  )}>
                    {conv.last_message_preview || "No messages yet"}
                  </p>
                  {conv.unread_count > 0 && (
                    <span className={cn(
                      "w-5 h-5 rounded-full text-primary-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0",
                      isHot ? "bg-hot animate-hot-pulse" : "bg-primary"
                    )}>
                      {conv.unread_count}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 mt-1">
                  {conv.contact.source && (
                    <>
                      <span className="text-[10px] text-muted-foreground">{conv.contact.source}</span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                    </>
                  )}
                  <span className="text-[10px] text-muted-foreground font-mono truncate">{conv.contact.phone}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
