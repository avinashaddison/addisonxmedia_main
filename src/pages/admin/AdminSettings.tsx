import { Settings, Construction } from "lucide-react";

const AdminSettings = () => (
  <div className="px-6 lg:px-10 py-6">
    <div className="flex items-center gap-3 mb-5">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#B8651A] to-[#7A4A00] text-white flex items-center justify-center shadow-md">
        <Settings className="w-6 h-6" strokeWidth={2.5} />
      </div>
      <div>
        <h1 className="text-[26px] font-black tracking-tight">Admin settings</h1>
        <p className="text-[12px] text-foreground/70 font-medium">Global feature flags, rate limits, system config</p>
      </div>
    </div>

    <div className="bg-white border-2 border-[#FFD23F] rounded-2xl shadow-[0_4px_0_0_#E8B400] p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FFD23F] to-[#E8B400] text-[#3D1A00] flex items-center justify-center shadow-md mx-auto mb-4">
        <Construction className="w-7 h-7" strokeWidth={2.5} />
      </div>
      <p className="text-xl font-black tracking-tight">Coming in v1.1</p>
      <p className="text-[13px] text-foreground/70 font-medium mt-2 max-w-md mx-auto">
        Feature flags, broadcast composer for system-wide announcements, IP allow-list, 2FA enforcement, and Razorpay live mode toggle.
      </p>
    </div>
  </div>
);

export default AdminSettings;
