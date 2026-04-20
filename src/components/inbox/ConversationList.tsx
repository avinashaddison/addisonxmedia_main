import { Search } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ConversationWithContact, tagLabel, initialsFor, formatRelative } from "@/lib/inbox-types";
import { NewConversationDialog } from "./NewConversationDialog";

type Props = {
  conversations: ConversationWithContact[];
  activeId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
};

const filters = ["All", "Unread", "Hot Leads", "Closed"] as const;

export const ConversationList = ({ conversations, activeId, onSelect, loading }: Props) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("All");

  const filtered = conversations.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      const inName = c.contact.name.toLowerCase().includes(q);
      const inPhone = c.contact.phone.toLowerCase().includes(q);
      const inMsg = (c.last_message_preview ?? "").toLowerCase().includes(q);
      if (!inName && !inPhone && !inMsg) return false;
    }
    if (filter === "Unread" && c.unread_count === 0) return false;
    if (filter === "Hot Leads" && c.contact.tag !== "hot") return false;
    if (filter === "Closed" && c.status !== "closed") return false;
    return true;
  });

  return (
    <div className="w-[320px] h-full bg-card border-r border-border flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
        <h2 className="text-[15px] font-bold">Chats</h2>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground font-medium">{conversations.length}</span>
          <NewConversationDialog onCreated={onSelect} />
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats…"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted border-0 text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="px-3 pb-2 flex gap-1 flex-shrink-0 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors",
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto">
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
          const tag = tagLabel[conv.contact.tag];
          const initials = initialsFor(conv.contact.name);
          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-border/50 hover:bg-muted/50",
                isActive && "bg-primary-soft/40 border-l-2 border-l-primary"
              )}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold text-card-foreground",
                  conv.contact.tag === "hot" ? "bg-hot-soft" : conv.contact.tag === "warm" ? "bg-warning-soft" : "bg-muted"
                )}>
                  {initials}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={cn("text-[13px] font-semibold truncate", conv.unread_count > 0 ? "text-foreground" : "text-foreground/80")}>
                      {conv.contact.name}
                    </span>
                    <span className="text-[10px] flex-shrink-0">{tag.emoji}</span>
                  </div>
                  <span className={cn("text-[10px] flex-shrink-0 ml-2", conv.unread_count > 0 ? "text-primary font-semibold" : "text-muted-foreground")}>
                    {formatRelative(conv.last_message_at)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <p className={cn(
                    "text-[12px] truncate pr-2",
                    conv.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                  )}>
                    {conv.last_message_preview || "No messages yet"}
                  </p>
                  {conv.unread_count > 0 && (
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">
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
