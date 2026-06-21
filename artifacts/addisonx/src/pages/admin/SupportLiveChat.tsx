import { MessageCircle } from "lucide-react";
import { AdminScaffoldShell } from "@/components/admin/AdminScaffoldShell";

const SupportLiveChat = () => {
  return (
    <AdminScaffoldShell
      title="Live Chat"
      subtitle="Staff aur customers ke beech real-time support chat"
      icon={<MessageCircle className="w-5 h-5 text-white" strokeWidth={2.5} />}
      emptyTitle="Live chat console jald"
      emptyHint="Real-time staff↔customer chat console — assign, reply aur resolve sab kuch ek jagah — bilkul jald yahin aa raha hai."
      emptyIcon={<MessageCircle className="w-7 h-7 text-[#FF6A1F]" strokeWidth={2.2} />}
    />
  );
};

export default SupportLiveChat;
