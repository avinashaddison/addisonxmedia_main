import { useState } from "react";
import { ConversationList } from "./ConversationList";
import { ChatWindow } from "./ChatWindow";
import { LeadPanel } from "./LeadPanel";
import { conversations } from "@/data/conversations";
import { MessageCircle } from "lucide-react";

export const InboxPage = () => {
  const [activeId, setActiveId] = useState<string>(conversations[0].id);
  const active = conversations.find((c) => c.id === activeId) ?? conversations[0];

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <ConversationList
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
      />
      <ChatWindow conversation={active} />
      <LeadPanel lead={active.lead} />
    </div>
  );
};
