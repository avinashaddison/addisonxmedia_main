import { Search, Bell, BellOff, Trash2, CheckCheck, Flame, Snowflake, Copy, ExternalLink, MessageCircleOff, Building2, Loader2, Sparkles, Brain } from "lucide-react";
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { cn } from "@/lib/utils";
import { ConversationWithContact, tagLabel, initialsFor, formatRelative, splitTextWithLinks } from "@/lib/inbox-types";
import { NewConversationDialog } from "./NewConversationDialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
// Lazy-load so the heavy SettingsPage bundle isn't pulled in on every
// inbox mount — only when the user actually opens the profile sheet.
const WhatsAppProfileCardLazy = lazy(() =>
  import("@/components/settings/SettingsPage").then((m) => ({ default: m.WhatsAppProfileCard }))
);
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger, ContextMenuLabel,
} from "@/components/ui/context-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteConversation, useMarkRead } from "@/hooks/useInboxData";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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
  const [deleteTarget, setDeleteTarget] = useState<ConversationWithContact | null>(null);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const qc = useQueryClient();
  const { user } = useAuth();
  const deleteMut = useDeleteConversation();
  const markReadMut = useMarkRead();

  const updateTag = async (id: string, tag: "hot" | "warm" | "cold") => {
    try {
      await api.updateContact(id, { tag });
      qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
      toast.success(`Marked ${tag}`);
    } catch (e) { toast.error(String(e)); }
  };

  const markUnread = async (id: string) => {
    try {
      await api.updateConversation(id, { unread_count: 1 });
      qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
    } catch (e) { toast.error(String(e)); }
  };

  const closeConversation = async (id: string) => {
    try {
      await api.updateConversation(id, { status: "closed" });
      qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
      toast.success("Conversation closed");
    } catch (e) { toast.error(String(e)); }
  };

  const filtered = conversations.filter((c) => {
    // Defensive: server uses leftJoin, so contact COULD be null on data races.
    // Without these guards the whole list silently filters to [] when one row
    // is missing its contact.
    if (search) {
      const q = search.toLowerCase();
      const inName = c.contact?.name?.toLowerCase().includes(q) ?? false;
      const inPhone = c.contact?.phone?.toLowerCase().includes(q) ?? false;
      const inMsg = (c.last_message_preview ?? "").toLowerCase().includes(q);
      if (!inName && !inPhone && !inMsg) return false;
    }
    if (filter === "Unread" && c.unread_count === 0) return false;
    if (filter === "Hot" && c.contact?.tag !== "hot") return false;
    if (filter === "Closed" && c.status !== "closed") return false;
    return true;
  });

  const sortedAndFiltered = [...filtered].sort((a, b) => {
    const aIsAgent = a.contact?.phone === "system_marketing";
    const bIsAgent = b.contact?.phone === "system_marketing";
    if (aIsAgent && !bIsAgent) return -1;
    if (!aIsAgent && bIsAgent) return 1;
    return 0;
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

      {/* Business Profile bar — top of the panel, opens a side sheet with
          the full Meta WhatsApp Business Profile editor. Lets the user fix
          their public 'About', address, vertical etc. without leaving the
          inbox. Same editor as in Settings → Integrations. */}
      <button
        onClick={() => setProfileSheetOpen(true)}
        className="group h-10 w-full px-3 flex items-center gap-2 bg-gradient-to-r from-[#0E8A4B] to-[#0A6E3C] text-white border-b-2 border-[#073D22] flex-shrink-0 hover:from-[#0A6E3C] hover:to-[#073D22] transition"
        title="Edit your public WhatsApp Business Profile"
      >
        <Building2 className="w-3.5 h-3.5" strokeWidth={2.5} />
        <span className="text-[10px] uppercase tracking-wider font-extrabold flex-1 text-left">
          WhatsApp Business Profile
        </span>
        <span className="text-[10px] font-extrabold opacity-80 group-hover:opacity-100">
          Edit →
        </span>
      </button>

      {/* Business Profile slide-out sheet */}
      <Sheet open={profileSheetOpen} onOpenChange={setProfileSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-4">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#0E8A4B]" />
              WhatsApp Business Profile
            </SheetTitle>
            <SheetDescription>
              What customers see on your WhatsApp number — about, description, address, email, website, industry.
              Saved instantly to Meta.
            </SheetDescription>
          </SheetHeader>
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-[#0E8A4B]" />
            </div>
          }>
            <WhatsAppProfileCardLazy />
          </Suspense>
        </SheetContent>
      </Sheet>

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

        {sortedAndFiltered.map((conv) => {
          const isActive = conv.id === activeId;
          const isHovered = hoveredId === conv.id;
          const tag = tagLabel[conv.contact.tag];
          const initials = initialsFor(conv.contact.name);
          const isMarketingAgent = conv.contact.phone === "system_marketing";
          const dot = statusDot(conv.contact.tag, conv.unread_count > 0);
          const isHot = conv.contact.tag === "hot";
          const preview = conv.last_message_preview || "";
          const hasLink = preview.match(/(https?:\/\/|www\.)/i);

          return (
            <ContextMenu key={conv.id}>
              <ContextMenuTrigger asChild>
                <button
                  onClick={() => onSelect(conv.id)}
                  onMouseEnter={() => setHoveredId(conv.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={cn(
                    "relative w-full flex items-start gap-3 px-4 py-3 text-left transition-all border-b border-[#E8B968]/40 group",
                    isActive
                      ? "bg-[#E6F7EE]"
                      : isMarketingAgent
                        ? "hover:bg-violet-50 bg-violet-50/30"
                        : isHot
                          ? "hover:bg-[#FCE5F0] bg-[#FCE5F0]/40"
                          : "hover:bg-[#FFF6E8]"
                  )}
                >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 rounded-r-full bg-[#0E8A4B]" />
              )}

              {/* Avatar — readable initial circle, tag-colored gradient.
                  We can't fetch real WhatsApp profile pictures (Meta doesn't
                  expose them in the webhook), so initials on a brand
                  gradient is the cleanest legible fallback. Hot/warm/cold
                  drive the gradient pair so the circle reads even at a
                  glance. */}
              <div className="relative flex-shrink-0">
                <div className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-black text-white shadow-md transition-transform group-hover:scale-105 ring-2 ring-white",
                  isMarketingAgent ? "bg-gradient-to-br from-[#8B5CF6] to-[#5B21B6]" :
                  isHot ? "bg-gradient-to-br from-[#FF4FA8] to-[#A11A6A]" :
                  conv.contact.tag === "warm" ? "bg-gradient-to-br from-[#FF8C42] to-[#B8420A]" :
                  "bg-gradient-to-br from-[#5468FF] to-[#1E40AF]"
                )}>
                  {isMarketingAgent ? (
                    <Brain className="w-5 h-5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]" />
                  ) : (
                    <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]">{initials}</span>
                  )}
                </div>
                <span
                  title={dot.label}
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white",
                    isMarketingAgent ? "bg-[#8B5CF6] animate-pulse" :
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
                    {isMarketingAgent ? (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0 bg-violet-600/15 text-violet-600">
                        Marketing AI
                      </span>
                    ) : (
                      <span className={cn(
                        "text-[8px] font-bold px-1 py-0.5 rounded uppercase tracking-wider flex-shrink-0",
                        isHot ? "bg-hot/15 text-hot" :
                        conv.contact.tag === "warm" ? "bg-warning/15 text-warning" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {tag.label}
                      </span>
                    )}
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
                    {hasLink && preview ? (
                      <span className="inline-flex items-center gap-1">
                        <ExternalLink className="w-2.5 h-2.5 inline text-[#3C50E0] flex-shrink-0" />
                        {splitTextWithLinks(preview).map((seg, i) =>
                          seg.kind === "link" ? (
                            <span key={i} className="text-[#3C50E0] underline decoration-1 underline-offset-2">{seg.label}</span>
                          ) : (
                            <span key={i}>{seg.value}</span>
                          )
                        )}
                      </span>
                    ) : (
                      preview || "No messages yet"
                    )}
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
              </ContextMenuTrigger>

              {/* Right-click menu — mark read/unread, tag changes, copy phone,
                  close, delete. Brand-styled via the shared ContextMenu prims. */}
              <ContextMenuContent className="w-60">
                <ContextMenuLabel className="text-[10px] uppercase tracking-wider font-extrabold text-foreground/55 truncate">
                  {conv.contact.name}
                </ContextMenuLabel>
                <ContextMenuSeparator />
                {isMarketingAgent ? (
                  <>
                    <ContextMenuLabel className="text-[9px] uppercase tracking-wider font-extrabold text-foreground/40">
                      System AI Agent
                    </ContextMenuLabel>
                    <ContextMenuSeparator />
                    <ContextMenuItem disabled className="opacity-90">
                      <Sparkles className="w-3.5 h-3.5 text-violet-500 mr-2" /> Admin Expert Mode
                    </ContextMenuItem>
                  </>
                ) : (
                  <>
                    {conv.unread_count > 0 ? (
                      <ContextMenuItem onClick={() => markReadMut.mutate(conv.id)}>
                        <CheckCheck className="w-3.5 h-3.5" /> Mark as read
                      </ContextMenuItem>
                    ) : (
                      <ContextMenuItem onClick={() => markUnread(conv.id)}>
                        <Bell className="w-3.5 h-3.5" /> Mark as unread
                      </ContextMenuItem>
                    )}
                    <ContextMenuSeparator />
                    <ContextMenuLabel className="text-[9px] uppercase tracking-wider font-extrabold text-foreground/40">
                      Lead tag
                    </ContextMenuLabel>
                    <ContextMenuItem onClick={() => updateTag(conv.contact.id, "hot")}>
                      <Flame className="w-3.5 h-3.5 text-[#D4308E]" /> Mark Hot
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => updateTag(conv.contact.id, "warm")}>
                      <Flame className="w-3.5 h-3.5 text-[#FF6A1F]" /> Mark Warm
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => updateTag(conv.contact.id, "cold")}>
                      <Snowflake className="w-3.5 h-3.5 text-[#3C50E0]" /> Mark Cold
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={() => {
                        navigator.clipboard.writeText(conv.contact.phone);
                        toast.success("Phone copied");
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy phone number
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => {
                        const url = `https://wa.me/${conv.contact.phone.replace(/[^\d]/g, "")}`;
                        window.open(url, "_blank", "noopener,noreferrer");
                      }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open in WhatsApp.com
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    {conv.status !== "closed" && (
                      <ContextMenuItem onClick={() => closeConversation(conv.id)}>
                        <MessageCircleOff className="w-3.5 h-3.5" /> Close conversation
                      </ContextMenuItem>
                    )}
                    <ContextMenuItem
                      className="text-[#D4308E] focus:text-[#D4308E] focus:bg-[#FCE5F0]"
                      onClick={() => setDeleteTarget(conv)}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete chat
                    </ContextMenuItem>
                  </>
                )}
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>

      {/* Delete confirmation — destructive, so guard with an alert dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  Removes the conversation with <span className="font-bold">{deleteTarget.contact.name}</span> (<span className="font-mono">{deleteTarget.contact.phone}</span>) and all messages inside it.
                  <br />
                  The contact record stays in your Contacts list — only the chat is deleted.
                  <br /><br />
                  <span className="text-[#B8420A] font-semibold">This cannot be undone.</span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#D4308E] text-white shadow-[0_4px_0_0_#A11A6A] hover:bg-[#C02680]"
              onClick={() => {
                if (deleteTarget) {
                  deleteMut.mutate(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
