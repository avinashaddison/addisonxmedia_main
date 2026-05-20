import { Search, Bell, BellOff } from "lucide-react";
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
  muted?: boolean;
  onToggleMuted?: () => void;
};

const filters = ["All", "Unread", "Hot", "Closed"] as const;

const statusDot = (tag: string, hasUnread: boolean) => {
  if (tag === "hot") return { color: "bg-hot", pulse: true, label: "Hot lead" };
  if (hasUnread) return { color: "bg-warning", pulse: false, label: "Waiting" };
  return { color: "bg-muted-foreground", pulse: false, label: "Quiet" };
};

export const ConversationList = ({ conversations, activeId, onSelect, loading, className, muted, onToggleMuted }: Props) => {
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
    <div className={cn("w-full md:w-[340px] h-full bg-white border-r-2 border-[#E8B968] flex flex-col flex-shrink-0 relative", className)}>

      {/* Header */}
      <div className="relative h-16 flex items-center justify-between px-4 border-b-2 border-[#E8B968] bg-[#FFF6E8] flex-shrink-0">
        <div className="min-w-0">
          <h2 className="text-[18px] font-black tracking-tight leading-tight">Chats</h2>
          <p className="text-[10px] text-foreground/60 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
            <span>{conversations.length} total</span>
            <span>·</span>
            <span className="text-[#FF6A1F]">{unreadTotal} unread</span>
            <span>·</span>
            <span className="text-[#D4308E] flex items-center gap-1">
              {hotCount} hot
              {hotCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#D4308E] animate-pulse" />}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {onToggleMuted && (
            <button
              onClick={onToggleMuted}
              title={muted ? "Sound off — click to unmute" : "Sound on — click to mute"}
              aria-label={muted ? "Unmute notifications" : "Mute notifications"}
              className={cn(
                "w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all",
                muted
                  ? "bg-[#FFF6E8] border-[#E8B968] text-foreground/50 hover:text-foreground"
                  : "bg-[#FFD23F] border-[#E8B968] text-[#7A4A00] hover:bg-[#FFC10E]"
              )}
            >
              {muted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            </button>
          )}
          <NewConversationDialog onCreated={onSelect} />
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B8651A]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Chat search… ↑ ↓ navigate"
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#FFF6E8] border-2 border-[#E8B968] text-[13px] font-medium placeholder:text-foreground/40 focus:outline-none focus:border-[#FF6A1F] focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Sticky Filters */}
      <div className="sticky top-0 z-10 px-3 pb-2 flex gap-1.5 flex-shrink-0 overflow-x-auto bg-white">
        {filters.map((f) => {
          const count = f === "Unread" ? unreadTotal : f === "Hot" ? hotCount : null;
          const colors = {
            All: { active: "bg-foreground text-white", inactive: "bg-[#FFF6E8] text-foreground border-[#E8B968]" },
            Unread: { active: "bg-[#FF6A1F] text-white", inactive: "bg-[#FFEFE0] text-[#FF6A1F] border-[#FF6A1F]/30" },
            Hot: { active: "bg-[#D4308E] text-white", inactive: "bg-[#FCE5F0] text-[#D4308E] border-[#D4308E]/30" },
            Closed: { active: "bg-[#3C50E0] text-white", inactive: "bg-[#E4E8FF] text-[#3C50E0] border-[#3C50E0]/30" },
          }[f];
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 h-8 rounded-full text-[11px] font-extrabold whitespace-nowrap transition-all flex items-center gap-1 border-2",
                filter === f ? colors.active + " border-transparent shadow-sm" : colors.inactive
              )}
            >
              {f}
              {count !== null && count > 0 && (
                <span className={cn(
                  "text-[9px] font-extrabold px-1.5 rounded-full min-w-[16px] text-center",
                  filter === f ? "bg-white/25" : "bg-current/15"
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
          const isHot = conv.contact.tag === "hot";

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              onMouseEnter={() => setHoveredId(conv.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={cn(
                "relative w-full flex items-start gap-3 px-4 py-3 text-left transition-all border-b border-[#E8B968]/40 group",
                isActive
                  ? "bg-[#E6F7EE]"
                  : isHot
                    ? "hover:bg-[#FCE5F0] bg-[#FCE5F0]/40"
                    : "hover:bg-[#FFF6E8]"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 rounded-r-full bg-[#0E8A4B]" />
              )}

              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center text-[12px] font-extrabold text-white shadow-md transition-transform group-hover:scale-105",
                  isHot ? "bg-[#D4308E]" :
                  conv.contact.tag === "warm" ? "bg-[#FF6A1F]" :
                  "bg-[#3C50E0]"
                )}>
                  {initials}
                </div>
                <span
                  title={dot.label}
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white",
                    isHot ? "bg-[#D4308E] animate-pulse" : conv.unread_count > 0 ? "bg-[#FF6A1F]" : "bg-[#0E8A4B]"
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
                      "min-w-[20px] h-5 px-1.5 rounded-full text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0 shadow-sm",
                      isHot ? "bg-[#D4308E]" : "bg-[#FF6A1F]"
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
