import { UserX } from "lucide-react";
import { ClientStatusList } from "@/components/admin/ClientStatusList";

const AdminSuspendedClients = () => (
  <ClientStatusList
    status="suspended"
    title="Suspended Clients"
    subtitle="rok di gayi accounts"
    icon={<UserX className="w-5 h-5 text-white" strokeWidth={2.5} />}
    emptyTitle="Koi suspended client nahi"
    emptyHint="Jab aap kisi account ko suspend karenge, woh yahan list hoga. Detail page se unsuspend kar sakte hain."
  />
);

export default AdminSuspendedClients;
