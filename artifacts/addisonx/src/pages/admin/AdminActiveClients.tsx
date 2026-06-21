import { UserCheck } from "lucide-react";
import { ClientStatusList } from "@/components/admin/ClientStatusList";

const AdminActiveClients = () => (
  <ClientStatusList
    status="active"
    title="Active Clients"
    subtitle="paying / live accounts"
    icon={<UserCheck className="w-5 h-5 text-white" strokeWidth={2.5} />}
    emptyTitle="Abhi koi active client nahi"
    emptyHint="Jab koi client paid plan le lega, woh yahan dikhega. Trial accounts alag hote hain."
  />
);

export default AdminActiveClients;
