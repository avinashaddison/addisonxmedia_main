import { Megaphone } from "lucide-react";
import { AdminScaffoldShell } from "@/components/admin/AdminScaffoldShell";

const SupportAnnouncements = () => {
  return (
    <AdminScaffoldShell
      title="Announcements"
      subtitle="Saare clients ko platform updates broadcast karein"
      icon={<Megaphone className="w-5 h-5 text-white" strokeWidth={2.5} />}
      emptyTitle="Announcements tool jald"
      emptyHint="Naye features, maintenance windows aur important updates ko ek hi click mein saare clients tak pohchane ka tool bilkul jald yahin aa raha hai."
      emptyIcon={<Megaphone className="w-7 h-7 text-[#FF6A1F]" strokeWidth={2.2} />}
    />
  );
};

export default SupportAnnouncements;
