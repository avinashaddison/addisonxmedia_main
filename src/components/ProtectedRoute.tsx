import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Wrench } from "lucide-react";
import { useFlag } from "@/hooks/useSystemFlags";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const maintenance = useFlag("maintenance_mode");
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  // Maintenance mode: only show the maintenance screen for /app/*; admins can
  // still reach /admin/* to flip the flag back off.
  if (maintenance && location.pathname.startsWith("/app")) {
    return <MaintenanceScreen />;
  }

  return <>{children}</>;
};

const MaintenanceScreen = () => (
  <div className="min-h-screen bg-[#FFF6E8] flex items-center justify-center p-6">
    <div className="max-w-md bg-white border-2 border-[#FFD23F] rounded-2xl shadow-[0_5px_0_0_#B8860B] p-8 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#FFD23F] to-[#E8B400] text-[#3D1A00] flex items-center justify-center shadow-md mb-4">
        <Wrench className="w-7 h-7" strokeWidth={2.5} />
      </div>
      <h1 className="text-2xl font-black tracking-tight">Quick maintenance</h1>
      <p className="text-[13px] text-foreground/70 font-medium mt-2 leading-relaxed">
        Hum kuch important upgrades kar rahe hain. Thodi der mein wapas aaiye —
        <br />aapka data safe hai aur kuch khaaya nahi hai.
      </p>
      <p className="text-[11px] text-foreground/50 font-medium mt-4">
        Need urgent help? WhatsApp{" "}
        <a href="https://wa.me/916206153116" className="text-[#0E8A4B] font-extrabold underline">+91 62061 53116</a>
      </p>
    </div>
  </div>
);
