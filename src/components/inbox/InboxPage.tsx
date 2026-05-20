import { useEffect, useState } from "react";
import { ConversationList } from "./ConversationList";
import { ChatWindow } from "./ChatWindow";
import { LeadPanel } from "./LeadPanel";
import { useConversations } from "@/hooks/useInboxData";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { MessageCircle, Loader2 } from "lucide-react";

export const InboxPage = () => {
  const { data: conversations = [], isLoading } = useConversations();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [muted, toggleMuted] = useNotificationSound(conversations);

  // Auto-select the first conversation when the list loads / changes
  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
    // If the active conversation got deleted, fall back to the first one
    if (activeId && !conversations.some((c) => c.id === activeId)) {
      setActiveId(conversations[0]?.id ?? null);
    }
  }, [conversations, activeId]);

  const active = conversations.find((c) => c.id === activeId) ?? null;

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <ConversationList
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        loading={isLoading}
        muted={muted}
        onToggleMuted={toggleMuted}
      />

      {active ? (
        <>
          <ChatWindow conversation={active} />
          <LeadPanel contact={active.contact} conversationId={active.id} />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-card">
          <div className="text-center max-w-sm px-6">
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-primary-soft flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-[16px] font-bold mb-1">No conversations yet</h2>
                <p className="text-[13px] text-muted-foreground">
                  Click the <span className="font-semibold text-primary">+</span> button in the chats panel to start your first conversation.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
