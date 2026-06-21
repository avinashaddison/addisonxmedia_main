import { BookOpen } from "lucide-react";
import { AdminScaffoldShell } from "@/components/admin/AdminScaffoldShell";

const SupportKnowledgeBase = () => {
  return (
    <AdminScaffoldShell
      title="Knowledge Base"
      subtitle="Help articles aur FAQ ek jagah manage karein"
      icon={<BookOpen className="w-5 h-5 text-white" strokeWidth={2.5} />}
      emptyTitle="Knowledge base editor jald"
      emptyHint="Help articles likhna, categories banana aur FAQ publish karne ka editor bilkul jald yahin aa raha hai — taaki clients khud answers dhoondh sakein."
      emptyIcon={<BookOpen className="w-7 h-7 text-[#FF6A1F]" strokeWidth={2.2} />}
    />
  );
};

export default SupportKnowledgeBase;
