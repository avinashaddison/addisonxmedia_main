import { useQuery } from "@tanstack/react-query";
import { adminApi, WhatsAppNumber } from "@/lib/admin-api";
import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminScaffoldShell } from "@/components/admin/AdminScaffoldShell";

const WhatsAppNumbers = () => {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-whatsapp-numbers"],
    queryFn: () => adminApi.whatsappNumbers(),
  });

  const table =
    rows.length > 0 ? (
      <div className="bg-white border-2 border-[#E8B968] rounded-2xl overflow-hidden shadow-[0_5px_0_0_#E8B968]">
        <div className="grid grid-cols-[1.8fr_1.2fr_110px_110px_120px] gap-3 px-5 py-3.5 border-b-2 border-[#E8B968] bg-[#FFF6E8] text-[10px] font-extrabold uppercase tracking-wider text-[#0A3D24]">
          <div>Account</div>
          <div>Number</div>
          <div>Status</div>
          <div>Quality</div>
          <div>Tier</div>
        </div>
        {rows.map((n: WhatsAppNumber) => (
          <div
            key={n.id}
            className="grid grid-cols-[1.8fr_1.2fr_110px_110px_120px] gap-3 px-5 py-3 border-b border-slate-100 last:border-b-0 items-center hover:bg-[#FFF6E8]/30 transition"
          >
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-slate-850 truncate">{n.name ?? "—"}</p>
              <p className="text-[11px] text-slate-400 font-mono truncate">{n.email ?? "—"}</p>
            </div>
            <span className="text-[12px] font-bold text-slate-700 font-mono truncate">
              {n.displayPhoneNumber ?? n.phoneNumberId}
            </span>
            <span
              className={cn(
                "inline-flex px-2 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wider w-fit",
                n.enabled
                  ? "bg-[#E6F7EE] border-[#0E8A4B]/20 text-[#0A6E3C]"
                  : "bg-slate-50 border-slate-200 text-slate-600"
              )}
            >
              {n.enabled ? "Active" : "Disabled"}
            </span>
            <span className="text-[12px] font-semibold text-slate-600">{n.qualityRating ?? "—"}</span>
            <span className="text-[12px] font-semibold text-slate-600">{n.messagingLimitTier ?? "—"}</span>
          </div>
        ))}
      </div>
    ) : undefined;

  return (
    <AdminScaffoldShell
      title="WhatsApp Numbers"
      subtitle="Platform ke saath connected sabhi WhatsApp business numbers"
      icon={<Phone className="w-5 h-5 text-white" strokeWidth={2.5} />}
      isLoading={isLoading}
      stats={[{ label: "Connected", value: rows.length, icon: <Phone className="w-4 h-4" strokeWidth={2.4} /> }]}
      emptyTitle="Koi number connected nahi"
      emptyHint="Jab clients apna WhatsApp business number connect karenge, woh yahaan automatically dikhne lagega."
      emptyIcon={<Phone className="w-7 h-7 text-[#FF6A1F]" strokeWidth={2.2} />}
    >
      {table}
    </AdminScaffoldShell>
  );
};

export default WhatsAppNumbers;
