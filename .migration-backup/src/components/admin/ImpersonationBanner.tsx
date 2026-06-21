import { useEffect, useState } from "react";
import { Eye, X } from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import { toast } from "sonner";

/**
 * Renders an unmissable yellow ribbon at the top of every customer-app page
 * when the admin has an active impersonation cookie. Clicking "End session"
 * clears the cookie and reloads back into normal mode.
 */
export const ImpersonationBanner = () => {
  const [active, setActive] = useState(false);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    // Check for the impersonation cookie. Since it's HttpOnly we can't read it
    // from JS — but the server sets a separate non-HttpOnly hint cookie.
    const has = document.cookie.split("; ").some((c) => c.startsWith("addisonx_impersonating_hint="));
    setActive(has);
  }, []);

  if (!active) return null;

  const handleEnd = async () => {
    setEnding(true);
    try {
      await adminApi.endImpersonation();
      toast.success("Impersonation ended");
      // Reload back into admin
      window.location.href = "/admin/dashboard";
    } catch (e) {
      toast.error(String(e));
      setEnding(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-[#FFD23F] via-[#FFC107] to-[#FFD23F] text-[#3D1A00] px-4 py-2 flex items-center justify-center gap-3 flex-wrap border-b-2 border-[#B8860B] shadow-[0_3px_0_0_#B8860B] sticky top-0 z-50">
      <span className="inline-flex items-center gap-2 font-extrabold text-[12px] uppercase tracking-[0.18em]">
        <Eye className="w-3.5 h-3.5" strokeWidth={3} />
        ADMIN IMPERSONATION ACTIVE
      </span>
      <span className="text-[12px] font-semibold">You are viewing this account as an admin. All actions are logged.</span>
      <button
        onClick={handleEnd}
        disabled={ending}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#7A1500] text-white text-[11px] font-extrabold uppercase tracking-wider hover:bg-[#B8230C] transition disabled:opacity-60"
      >
        <X className="w-3 h-3" strokeWidth={3} /> End session
      </button>
    </div>
  );
};
