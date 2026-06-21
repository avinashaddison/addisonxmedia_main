/**
 * Bookings — appointment/booking management for service businesses.
 *
 * Primary surface for salons, clinics, gyms, coaches. Replaces the Western
 * "orders dashboard" mental model with one that matches how Indian service
 * businesses actually run: "today's appointments + pending confirmations".
 *
 * Source breakdown:
 *   website  — customer booked via the Salon template's booking modal
 *   whatsapp — manually logged from a WhatsApp chat
 *   manual   — seller typed directly into this page
 *
 * Status flow: new → confirmed → completed (or cancelled / no_show at any step).
 */

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar, Loader2, Plus, X, MessageSquare, Phone, Mail, Clock, IndianRupee,
  Filter, ChevronRight, CheckCircle2, AlertCircle, Ban, UserX, Inbox, Save,
} from "lucide-react";
import { api, type BookingDto } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Status = BookingDto["status"];
const STATUS: Record<Status, { label: string; color: string; bg: string; icon: any }> = {
  new:       { label: "New",       color: "#FF6A1F", bg: "#FFEFE0", icon: AlertCircle },
  confirmed: { label: "Confirmed", color: "#3C50E0", bg: "#E4E8FF", icon: CheckCircle2 },
  completed: { label: "Completed", color: "#0E8A4B", bg: "#E6F7EE", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "#D4308E", bg: "#FCE5F0", icon: Ban },
  no_show:   { label: "No-show",   color: "#7A1052", bg: "#FCE5F0", icon: UserX },
};

const FILTERS: Array<{ id: "all" | "today" | "upcoming" | "pending"; label: string; accent: string }> = [
  { id: "today",    label: "Today",    accent: "#FF6A1F" },
  { id: "upcoming", label: "Upcoming", accent: "#3C50E0" },
  { id: "pending",  label: "Pending",  accent: "#FFD23F" },
  { id: "all",      label: "All",      accent: "#0A3D24" },
];

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + n * 86400_000).toISOString().slice(0, 10);

const fmtDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  const t = today();
  if (iso === t) return "Today";
  if (iso === inDays(1)) return "Tomorrow";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
};
const fmtTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const hr12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hr12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

export const BookingsPage = () => {
  const [filter, setFilter] = useState<"all" | "today" | "upcoming" | "pending">("today");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  const queryParams = useMemo(() => {
    if (filter === "today") return { date_from: today(), date_to: today() };
    if (filter === "upcoming") return { date_from: today() };
    if (filter === "pending") return { status: "new" };
    return {};
  }, [filter]);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings", filter],
    queryFn: () => api.getBookings(queryParams),
    refetchInterval: 30_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["bookings-stats"],
    queryFn: () => api.getBookingStats(),
    refetchInterval: 60_000,
  });

  // Group by date for the list view
  const grouped = useMemo(() => {
    const m = new Map<string, BookingDto[]>();
    for (const b of bookings) {
      const k = b.booking_date;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(b);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [bookings]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#FFF6E8]">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0 bg-[#D4308E]">
            <Calendar className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-black leading-tight">Bookings</h1>
            <p className="text-[14px] text-foreground/70 font-medium mt-1">
              Appointments from your website + WhatsApp. Confirm or update status in one tap.
            </p>
          </div>
          <button onClick={() => setShowManual(true)}
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0E8A4B] text-white font-extrabold text-[13px] shadow-[0_4px_0_0_#073D22] hover:bg-[#0A6E3C] active:translate-y-0.5 transition flex-shrink-0">
            <Plus className="w-4 h-4" strokeWidth={2.5} /> Log booking
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Today" value={stats?.today_count || "0"} accent="#FF6A1F" />
          <Stat label="Pending confirm" value={stats?.pending_count || "0"} accent="#FFD23F" />
          <Stat label="Next 7 days" value={stats?.week_count || "0"} accent="#3C50E0" />
          <Stat label="Lifetime revenue" value={`₹${Math.round(Number(stats?.total_revenue_inr || 0)).toLocaleString("en-IN")}`} accent="#0E8A4B" />
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[12px] font-extrabold border-2 transition",
                      filter === f.id ? "bg-white shadow-[0_2px_0_0_#E8B968]"
                                      : "bg-[#FFF1D6]/50 border-[#E8B968]/40 text-foreground/65 hover:bg-[#FFF1D6]"
                    )}
                    style={filter === f.id ? { borderColor: f.accent, color: f.accent } : undefined}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Bookings list */}
        <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] overflow-hidden">
          {isLoading ? (
            <div className="py-16 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-foreground/40" /></div>
          ) : grouped.length === 0 ? (
            <div className="py-16 text-center px-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FFEFE0] flex items-center justify-center mb-3">
                <Inbox className="w-7 h-7 text-[#FF6A1F]" />
              </div>
              <h3 className="text-[15px] font-extrabold mb-1">No bookings in this view</h3>
              <p className="text-[12.5px] text-foreground/60 max-w-md mx-auto leading-relaxed">
                Bookings from your Salon site land here automatically. Or tap "Log booking" to add one from a WhatsApp chat or phone call.
              </p>
            </div>
          ) : (
            grouped.map(([date, dayBookings]) => (
              <div key={date}>
                <div className="px-4 sm:px-5 py-2 bg-[#FFF6E8]/60 border-b border-[#E8B968]/40 flex items-center justify-between">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/65">{fmtDate(date)}</p>
                  <p className="text-[10.5px] text-foreground/55 font-bold">{dayBookings.length} booking{dayBookings.length === 1 ? "" : "s"}</p>
                </div>
                <ul className="divide-y divide-foreground/10">
                  {dayBookings.map((b) => (
                    <li key={b.id}>
                      <button onClick={() => setSelectedId(b.id)}
                              className="w-full text-left px-4 sm:px-5 py-3 hover:bg-[#FFF6E8]/50 transition flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-[#D4308E] to-[#7A1052] text-white">
                          <span className="text-[13px] font-extrabold">{fmtTime(b.booking_time).split(" ")[0]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13.5px] font-extrabold truncate">{b.customer_name}</span>
                            <StatusBadge status={b.status} />
                          </div>
                          <p className="text-[12px] text-foreground/65 truncate mt-0.5">
                            💆 {b.service_name}
                            {Number(b.service_price_inr) > 0 && <span className="ml-2 font-extrabold text-[#0E8A4B]">₹{Number(b.service_price_inr).toLocaleString("en-IN")}</span>}
                          </p>
                          {b.customer_phone && (
                            <p className="text-[11px] font-mono text-foreground/55 mt-0.5">{b.customer_phone}</p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-foreground/30 flex-shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        <p className="text-[11px] text-center text-foreground/45">
          New bookings poll every 30s. Use the Salon template's booking modal on your public site to capture them automatically.
        </p>
      </div>

      {selectedId && <BookingDetailDialog bookingId={selectedId} onClose={() => setSelectedId(null)} />}
      {showManual && <ManualBookingDialog onClose={() => setShowManual(false)} />}
    </div>
  );
};

const Stat = ({ label, value, accent }: { label: string; value: string; accent: string }) => (
  <div className="p-4 rounded-xl bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968]">
    <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: accent }}>{label}</p>
    <p className="text-[20px] sm:text-[24px] font-black mt-1 leading-none tabular-nums">{value}</p>
  </div>
);

const StatusBadge = ({ status }: { status: Status }) => {
  const s = STATUS[status];
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
};

// ─── Detail dialog ─────────────────────────────────────────────────────────

const BookingDetailDialog = ({ bookingId, onClose }: { bookingId: string; onClose: () => void }) => {
  const qc = useQueryClient();
  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => api.getBooking(bookingId),
  });

  const statusMut = useMutation({
    mutationFn: (status: Status) => api.updateBooking(bookingId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking", bookingId] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["bookings-stats"] });
      toast.success("Booking updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const waLink = useMemo(() => {
    if (!booking?.customer_phone) return null;
    const phone = booking.customer_phone.replace(/\D+/g, "");
    if (!phone) return null;
    const msg = `Hi ${booking.customer_name}, regarding your booking #${booking.booking_number} for ${booking.service_name} on ${fmtDate(booking.booking_date)} at ${fmtTime(booking.booking_time)}.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  }, [booking]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full sm:max-w-md max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="sticky top-0 z-10 bg-white border-b-2 border-[#E8B968] px-5 py-3 flex items-center justify-between">
          <h2 className="text-[15px] font-black">{booking ? `Booking #${booking.booking_number}` : "Loading…"}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-foreground/5 flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>

        {isLoading || !booking ? (
          <div className="py-20 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-foreground/40" /></div>
        ) : (
          <div className="p-5 space-y-4">
            {/* When */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#FCE5F0] to-white border-2 border-[#D4308E]/30">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#7A1854] mb-1">When</p>
              <p className="text-[20px] font-black leading-tight">{fmtDate(booking.booking_date)}</p>
              <p className="text-[14px] font-extrabold mt-0.5" style={{ color: "#D4308E" }}>🕐 {fmtTime(booking.booking_time)}</p>
            </div>

            {/* Service */}
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/55 mb-1.5">Service</p>
              <div className="p-3 rounded-xl border border-[#E8B968] bg-[#FFF1D6]">
                <p className="text-[14px] font-extrabold">{booking.service_name}</p>
                {Number(booking.service_price_inr) > 0 && (
                  <p className="text-[13px] font-extrabold mt-0.5 text-[#0E8A4B]">₹{Number(booking.service_price_inr).toLocaleString("en-IN")}</p>
                )}
                {booking.service_duration_min && (
                  <p className="text-[11px] text-foreground/65 mt-0.5">⏱ {booking.service_duration_min} min</p>
                )}
              </div>
            </div>

            {/* Customer */}
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/55 mb-1.5">Customer</p>
              <div className="p-3 rounded-xl border border-[#E8B968] bg-white space-y-1.5">
                <p className="text-[14px] font-extrabold">{booking.customer_name}</p>
                {booking.customer_phone && (
                  <a href={`tel:${booking.customer_phone}`} className="flex items-center gap-1.5 text-[12.5px] font-mono font-bold hover:text-[#0E8A4B]">
                    <Phone className="w-3.5 h-3.5" /> {booking.customer_phone}
                  </a>
                )}
                {booking.customer_email && (
                  <a href={`mailto:${booking.customer_email}`} className="flex items-center gap-1.5 text-[12.5px] font-bold hover:text-[#0E8A4B] truncate">
                    <Mail className="w-3.5 h-3.5" /> {booking.customer_email}
                  </a>
                )}
              </div>
              {waLink && (
                <a href={waLink} target="_blank" rel="noopener noreferrer"
                   className="mt-2 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#25D366] text-white text-[12px] font-extrabold hover:opacity-90 transition">
                  <MessageSquare className="w-3.5 h-3.5" /> WhatsApp customer
                </a>
              )}
            </div>

            {/* Notes */}
            {booking.notes && (
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/55 mb-1.5">Customer notes</p>
                <p className="p-3 rounded-xl bg-foreground/5 text-[12.5px] italic leading-relaxed">"{booking.notes}"</p>
              </div>
            )}

            {/* Status actions */}
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/55 mb-2">Update status</p>
              <div className="grid grid-cols-2 gap-2">
                {(["confirmed", "completed", "cancelled", "no_show"] as Status[]).map((s) => {
                  const active = booking.status === s;
                  const meta = STATUS[s];
                  return (
                    <button key={s} onClick={() => statusMut.mutate(s)} disabled={statusMut.isPending || active}
                            className={cn(
                              "h-10 rounded-lg border-2 text-[12px] font-extrabold uppercase tracking-wider transition flex items-center justify-center gap-1.5",
                              active ? "shadow-[0_2px_0_0_rgba(0,0,0,0.1)]" : "bg-white border-[#E8B968]/60 text-foreground/55 hover:border-[#E8B968]"
                            )}
                            style={active ? { background: meta.bg, borderColor: meta.color, color: meta.color } : undefined}>
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-[10.5px] text-center text-foreground/40">
              Created {new Date(booking.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · via {booking.source}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Manual booking entry ──────────────────────────────────────────────────

const ManualBookingDialog = ({ onClose }: { onClose: () => void }) => {
  const qc = useQueryClient();
  const [draft, setDraft] = useState({
    service_name: "",
    service_price_inr: "",
    booking_date: today(),
    booking_time: "10:00",
    customer_name: "",
    customer_phone: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!draft.service_name.trim()) { toast.error("Service name required"); return; }
    if (!draft.customer_name.trim()) { toast.error("Customer name required"); return; }
    setSaving(true);
    try {
      await api.createManualBooking({
        service_name: draft.service_name.trim(),
        service_price_inr: Number(draft.service_price_inr) || 0,
        booking_date: draft.booking_date,
        booking_time: draft.booking_time,
        customer_name: draft.customer_name.trim(),
        customer_phone: draft.customer_phone.trim() || null,
        notes: draft.notes.trim() || null,
      });
      toast.success("Booking logged");
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["bookings-stats"] });
      onClose();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="sticky top-0 z-10 bg-white border-b-2 border-[#E8B968] px-5 py-3 flex items-center justify-between">
          <h2 className="text-[15px] font-black">Log a booking</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-foreground/5 flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <Field label="Service *">
            <input value={draft.service_name} onChange={(e) => setDraft({ ...draft, service_name: e.target.value })}
                   placeholder="e.g. Hair cut & style" autoFocus
                   className="w-full px-3 py-2.5 rounded-lg border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[14px] font-bold" />
          </Field>
          <Field label="Price (₹)">
            <div className="relative">
              <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/45" strokeWidth={2.5} />
              <input type="number" min="0" value={draft.service_price_inr} onChange={(e) => setDraft({ ...draft, service_price_inr: e.target.value })}
                     placeholder="0"
                     className="w-full pl-8 pr-3 py-2.5 rounded-lg border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[14px] font-extrabold tabular-nums" />
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date *">
              <input type="date" value={draft.booking_date} onChange={(e) => setDraft({ ...draft, booking_date: e.target.value })}
                     className="w-full px-3 py-2.5 rounded-lg border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[13px] font-bold" />
            </Field>
            <Field label="Time *">
              <input type="time" value={draft.booking_time} onChange={(e) => setDraft({ ...draft, booking_time: e.target.value })}
                     className="w-full px-3 py-2.5 rounded-lg border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[13px] font-bold" />
            </Field>
          </div>
          <Field label="Customer name *">
            <input value={draft.customer_name} onChange={(e) => setDraft({ ...draft, customer_name: e.target.value })}
                   placeholder="Full name"
                   className="w-full px-3 py-2.5 rounded-lg border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[14px] font-bold" />
          </Field>
          <Field label="WhatsApp number">
            <input type="tel" value={draft.customer_phone} onChange={(e) => setDraft({ ...draft, customer_phone: e.target.value })}
                   placeholder="+91 9XXXXXXXXX"
                   className="w-full px-3 py-2.5 rounded-lg border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[14px] font-mono" />
          </Field>
          <Field label="Notes (optional)">
            <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                      rows={2} placeholder="Anything else?"
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[13px] resize-none" />
          </Field>
        </div>
        <div className="sticky bottom-0 bg-white border-t-2 border-[#E8B968] px-5 py-3 flex items-center justify-end gap-2">
          <button onClick={onClose} className="h-10 px-3 rounded-lg text-foreground/65 text-[12px] font-extrabold hover:bg-foreground/5">Cancel</button>
          <button onClick={submit} disabled={saving}
                  className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-[#0E8A4B] text-white text-[13px] font-extrabold shadow-[0_3px_0_0_#073D22] hover:bg-[#0A6E3C] disabled:opacity-50 transition">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save booking
          </button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-[10.5px] font-extrabold uppercase tracking-wider text-foreground/65 mb-1.5 block">{label}</label>
    {children}
  </div>
);
