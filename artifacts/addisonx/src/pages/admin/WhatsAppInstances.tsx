import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { Smartphone, Power, PowerOff, Layers } from "lucide-react";
import { AdminScaffoldShell } from "@/components/admin/AdminScaffoldShell";

const WhatsAppInstances = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-whatsapp-instances"],
    queryFn: () => adminApi.whatsappInstances(),
  });

  return (
    <AdminScaffoldShell
      title="WhatsApp Instances"
      subtitle="Sabhi WhatsApp instances ek jagah — start, stop aur restart controls"
      icon={<Smartphone className="w-5 h-5 text-white" strokeWidth={2.5} />}
      isLoading={isLoading}
      stats={[
        { label: "Total Instances", value: data?.total ?? 0, icon: <Layers className="w-4 h-4" strokeWidth={2.4} /> },
        { label: "Enabled", value: data?.enabled ?? 0, icon: <Power className="w-4 h-4" strokeWidth={2.4} /> },
        { label: "Disabled", value: data?.disabled ?? 0, icon: <PowerOff className="w-4 h-4" strokeWidth={2.4} /> },
      ]}
      emptyTitle="Instance controls aa rahe hain"
      emptyHint="Har WhatsApp instance ko start, stop aur restart karne ke controls bilkul jald yahin aa rahe hain. Tab tak counts upar live hain."
      emptyIcon={<Smartphone className="w-7 h-7 text-[#FF6A1F]" strokeWidth={2.2} />}
    />
  );
};

export default WhatsAppInstances;
