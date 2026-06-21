import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { BarChart3, MessageSquare, CalendarDays, CalendarRange, Megaphone } from "lucide-react";
import { AdminScaffoldShell } from "@/components/admin/AdminScaffoldShell";

const WhatsAppUsage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-whatsapp-usage"],
    queryFn: () => adminApi.whatsappUsage(),
  });

  return (
    <AdminScaffoldShell
      title="WhatsApp Usage"
      subtitle="Messages aur broadcasts ka platform-wide usage"
      icon={<BarChart3 className="w-5 h-5 text-white" strokeWidth={2.5} />}
      isLoading={isLoading}
      stats={[
        { label: "Messages 24h", value: data?.messages24h ?? 0, icon: <MessageSquare className="w-4 h-4" strokeWidth={2.4} /> },
        { label: "Messages 7d", value: data?.messages7d ?? 0, icon: <CalendarDays className="w-4 h-4" strokeWidth={2.4} /> },
        { label: "Messages 30d", value: data?.messages30d ?? 0, icon: <CalendarRange className="w-4 h-4" strokeWidth={2.4} /> },
        { label: "Broadcasts", value: data?.broadcastsTotal ?? 0, icon: <Megaphone className="w-4 h-4" strokeWidth={2.4} /> },
      ]}
      emptyTitle="Detailed usage charts jald"
      emptyHint="Time-series graphs, per-number breakdown aur delivery trends ke deeper charts bilkul jald yahin aa rahe hain. Tab tak live counts upar hain."
      emptyIcon={<BarChart3 className="w-7 h-7 text-[#FF6A1F]" strokeWidth={2.2} />}
    />
  );
};

export default WhatsAppUsage;
