import { useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, Loader2, Globe, Copy, ExternalLink,
  Rocket, EyeOff, CheckCircle2, Package,
  AlertCircle, Clock, Users, ChevronRight, ImageIcon,
  CreditCard, Calendar, Plus, Phone, ArrowUpRight, Check, Play
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Skeleton Loader ────────────────────────────────────────────────────
const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={cn("animate-pulse bg-foreground/[0.06] rounded-lg", className)} />
);

const SkeletonCard = () => (
  <div className="p-5 rounded-xl bg-white border-2 border-[#E8B968]/40 space-y-3">
    <Skeleton className="h-3 w-16" />
    <Skeleton className="h-7 w-24" />
    <Skeleton className="h-2.5 w-20" />
  </div>
);

// ─── Dashboard Page ─────────────────────────────────────────────────────
export const DashboardPage = () => {
  const qc = useQueryClient();
  const nav = useNavigate();

  // ─── Core queries ───────────────────────────────────────────────────
  const { data: site, isLoading: loadingSite, error: siteError } = useQuery({
    queryKey: ["site-me"],
    queryFn: () => api.getSite(),
    staleTime: 30_000,
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["site-products"],
    queryFn: () => api.getProducts(),
    staleTime: 30_000,
    enabled: !!site,
  });

  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["site-bookings"],
    queryFn: () => api.getBookings(),
    staleTime: 30_000,
    enabled: !!site,
  });

  const { data: bookingStats } = useQuery({
    queryKey: ["bookings-stats"],
    queryFn: () => api.getBookingStats(),
    staleTime: 30_000,
    enabled: !!site,
  });

  // ─── Mutations ──────────────────────────────────────────────────────
  const publishMut = useMutation({
    mutationFn: () => api.publishSite(),
    onSuccess: (s) => {
      qc.setQueryData(["site-me"], s);
      toast.success("Website is now live!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unpublishMut = useMutation({
    mutationFn: () => api.unpublishSite(),
    onSuccess: (s) => {
      qc.setQueryData(["site-me"], s);
      toast.success("Website moved to draft");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ─── Derived data ──────────────────────────────────────────────────
  const publicUrl = useMemo(() => {
    if (!site?.slug) return "";
    return `${window.location.origin}/biz/${site.slug}`;
  }, [site?.slug]);

  const copyPublicUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link copied!");
    } catch {
      toast.error("Couldn't copy link");
    }
  }, [publicUrl]);

  const isPublished = site?.status === "published";
  const upcomingBookings = useMemo(() => {
    return bookings
      .filter(b => b.status === "new" || b.status === "confirmed")
      .slice(0, 5);
  }, [bookings]);

  // Setup checklist for core site setup
  const checklist = useMemo(() => {
    if (!site) return [];
    return [
      { label: "Add business details & logo", done: !!site.copy?.business_name && !!site.copy?.logo_url, action: "site/products", icon: ImageIcon },
      { label: "Add products to catalog", done: products.length > 0, action: "site/products", icon: Package },
      { label: "Configure UPI / QR payment VPA", done: !!(site.copy?.upi_vpa || site.copy?.upi_id), action: "site/payments", icon: CreditCard },
      { label: "Publish your live website", done: isPublished, action: "", icon: Rocket },
    ];
  }, [site, products, isPublished]);

  const completedCount = checklist.filter(i => i.done).length;
  const checklistPct = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

  // ─── Error state ──────────────────────────────────────────────────
  if (siteError && !site) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#FFF6E8] px-6">
        <div className="text-center max-w-md bg-white border-2 border-[#E8B968] p-6 rounded-2xl shadow-lg">
          <AlertCircle className="w-12 h-12 text-[#D4308E] mx-auto mb-3" />
          <h2 className="text-[18px] font-black mb-1">Could not load your website</h2>
          <p className="text-[13px] text-foreground/65 mb-4">Please check your connection and try again.</p>
          <button onClick={() => window.location.reload()} className="h-9 px-4 bg-[#0E8A4B] text-white rounded-xl text-[12px] font-extrabold">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isUpiConfigured = !!(site?.copy?.upi_vpa || site?.copy?.upi_id);

  return (
    <div className="flex-1 overflow-y-auto bg-[#FFF6E8] pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* ═══ 1. STORE STATUS HEADER ═══ */}
        {loadingSite ? (
          <div className="bg-white border-2 border-[#E8B968]/40 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-4">
              <Skeleton className="w-14 h-14 rounded-xl" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
          </div>
        ) : site && (
          <div className="relative overflow-hidden bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968]">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0E8A4B] via-[#FFD23F] to-[#D4308E]" />
            
            <div className="p-5 pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {site.copy?.logo_url ? (
                  <img src={site.copy.logo_url} alt="Logo" className="w-14 h-14 rounded-xl border-2 border-[#E8B968] object-cover shadow-md flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-[#0E8A4B] to-[#10B981] shadow-md flex-shrink-0 border-2 border-[#0E8A4B]/30">
                    <LayoutDashboard className="w-7 h-7" />
                  </div>
                )}
                <div>
                  <h1 className="text-[22px] font-black leading-tight flex items-center gap-2.5">
                    {site.copy?.business_name || "My Store"}
                    <span className={cn(
                      "text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border inline-flex items-center gap-1",
                      isPublished
                        ? "bg-[#E6F7EE] text-[#0E8A4B] border-[#0E8A4B]/30"
                        : "bg-[#FFF1D6] text-[#B8651A] border-[#FFD23F]/50"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", isPublished ? "bg-[#0E8A4B] animate-pulse" : "bg-[#B8651A]")} />
                      {isPublished ? "Live" : "Draft"}
                    </span>
                  </h1>
                  <p className="text-[12.5px] text-foreground/60 font-medium mt-1 flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1 font-mono text-foreground/80 text-[11.5px]">
                      <Globe className="w-3.5 h-3.5" />
                      {publicUrl.replace(/^https?:\/\//, "")}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button onClick={copyPublicUrl}
                  className="inline-flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-xl bg-[#FFF1D6] hover:bg-[#FFE8C7] border border-[#E8B968] text-[12.5px] font-extrabold text-[#B8651A] transition shadow-sm">
                  <Copy className="w-3.5 h-3.5" /> Copy Link
                </button>
                <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-xl bg-white border border-[#E8B968] text-[12.5px] font-extrabold text-foreground hover:bg-[#FFF6E8]/40 transition shadow-sm">
                  <ExternalLink className="w-3.5 h-3.5" /> Visit Site
                </a>
                {isPublished ? (
                  <button onClick={() => unpublishMut.mutate()} disabled={unpublishMut.isPending}
                    className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-white text-[#D4308E] border border-[#D4308E]/30 font-extrabold text-[12.5px] hover:bg-[#FCE5F0] active:translate-y-[1px] transition disabled:opacity-50">
                    {unpublishMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <EyeOff className="w-3.5 h-3.5" />}
                    Unpublish
                  </button>
                ) : (
                  <button onClick={() => publishMut.mutate()} disabled={publishMut.isPending}
                    className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-[#0E8A4B] text-white font-extrabold text-[12.5px] shadow-[0_3px_0_0_#073D22] hover:bg-[#0A6E3C] active:translate-y-[1px] active:shadow-[0_1px_0_0_#073D22] transition disabled:opacity-50">
                    {publishMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" strokeWidth={2.5} />}
                    Publish Store
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ 2. CORE SETUP OVERVIEW (PRODUCTS, PAYMENTS, BOOKINGS) ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loadingSite || loadingProducts || loadingBookings ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              {/* Products Card */}
              <div className="p-5 rounded-xl bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] flex flex-col justify-between hover:shadow-[0_4px_0_0_#E8B968] hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0E8A4B]">Store Catalog</span>
                    <h3 className="text-[24px] font-black text-foreground/80 leading-none">{products.length} Items</h3>
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#E6F7EE]">
                    <Package className="w-4 h-4 text-[#0E8A4B]" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-dashed border-[#E8B968]/30 flex items-center justify-between text-[11.5px] font-bold text-foreground/50">
                  <span>{products.filter(p => p.status === 'active').length} Active products</span>
                  <Link to="/app/site/products" className="text-[#0E8A4B] hover:underline flex items-center">
                    Manage <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Bookings Card */}
              <div className="p-5 rounded-xl bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] flex flex-col justify-between hover:shadow-[0_4px_0_0_#E8B968] hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#3C50E0]">Bookings & Schedules</span>
                    <h3 className="text-[24px] font-black text-foreground/80 leading-none">
                      {bookingStats?.today_count || bookings.length} Bookings
                    </h3>
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#E4E8FF]">
                    <Calendar className="w-4 h-4 text-[#3C50E0]" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-dashed border-[#E8B968]/30 flex items-center justify-between text-[11.5px] font-bold text-foreground/50">
                  <span>{bookingStats?.pending_count || bookings.filter(b => b.status === 'new').length} Pending approval</span>
                  <Link to="/app/site/bookings" className="text-[#3C50E0] hover:underline flex items-center">
                    View appointments <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Payments Card */}
              <div className="p-5 rounded-xl bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] flex flex-col justify-between hover:shadow-[0_4px_0_0_#E8B968] hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#D4308E]">Payments Configuration</span>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        isUpiConfigured ? "bg-[#0E8A4B]" : "bg-[#B8651A]"
                      )} />
                      <h4 className="text-[15.5px] font-extrabold text-foreground/80 leading-none">
                        {isUpiConfigured ? "UPI Configured" : "UPI Pending"}
                      </h4>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#FCE5F0]">
                    <CreditCard className="w-4 h-4 text-[#D4308E]" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-dashed border-[#E8B968]/30 flex items-center justify-between text-[11.5px] font-bold text-foreground/50">
                  <span className="truncate max-w-[150px] font-mono text-[10.5px]">
                    {isUpiConfigured ? (site.copy.upi_vpa || site.copy.upi_id) : "No address linked"}
                  </span>
                  <Link to="/app/site/payments" className="text-[#D4308E] hover:underline flex items-center">
                    Setup UPI <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ═══ 3. MAIN CONTENT GRID ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── Left Column (8 cols) ── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Upcoming Appointments */}
            <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] overflow-hidden">
              <div className="p-5 pb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-foreground/65 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#3C50E0]" />
                  Upcoming Bookings
                </h3>
                <Link to="/app/site/bookings" className="text-[11px] font-extrabold text-[#3C50E0] hover:underline flex items-center gap-1">
                  View Schedule <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {loadingBookings ? (
                <div className="p-6 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#3C50E0] mx-auto" />
                </div>
              ) : upcomingBookings.length === 0 ? (
                <div className="px-5 pb-5">
                  <div className="bg-[#FFF6E8] border border-dashed border-[#E8B968] rounded-xl p-8 text-center">
                    <Calendar className="w-8 h-8 text-[#E8B968] mx-auto mb-2" />
                    <p className="text-[13px] text-foreground/65 font-bold">No upcoming bookings</p>
                    <p className="text-[11px] text-foreground/45 mt-0.5">Bookings created by customers will appear here.</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-t border-b border-[#E8B968]/30 bg-[#FFF6E8]/30">
                        <th className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 px-5 py-3">Customer</th>
                        <th className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 px-3 py-3">Service</th>
                        <th className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 px-3 py-3">Schedule</th>
                        <th className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 px-3 py-3">Price</th>
                        <th className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 px-5 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8B968]/15">
                      {upcomingBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-[#FFF6E8]/20 transition cursor-pointer" onClick={() => nav('/app/site/bookings')}>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#E4E8FF] text-[#3C50E0] flex items-center justify-center font-bold text-[11px]">
                                {b.customer_name[0]?.toUpperCase() || "C"}
                              </div>
                              <div>
                                <p className="text-[12.5px] font-extrabold text-foreground/80 leading-none">{b.customer_name}</p>
                                {b.customer_phone && (
                                  <p className="text-[10px] text-foreground/50 font-medium mt-0.5 flex items-center gap-1">
                                    <Phone className="w-2.5 h-2.5" /> {b.customer_phone}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3.5">
                            <p className="text-[12.5px] font-extrabold text-foreground/80 leading-none truncate max-w-[150px]">
                              {b.service_name}
                            </p>
                            {b.service_duration_min && (
                              <p className="text-[10px] text-foreground/45 font-bold mt-1 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> {b.service_duration_min} min
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-3.5">
                            <p className="text-[12px] font-extrabold text-foreground/75 leading-none">{formatShortDate(b.booking_date)}</p>
                            <p className="text-[10.5px] text-[#3C50E0] font-extrabold mt-1">{b.booking_time}</p>
                          </td>
                          <td className="px-3 py-3.5 text-[12.5px] font-extrabold text-foreground/80 tabular-nums">
                            ₹{b.service_price_inr ? parseFloat(b.service_price_inr).toLocaleString("en-IN") : "0"}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className={cn(
                              "text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md",
                              b.status === "confirmed" ? "bg-[#E6F7EE] text-[#0E8A4B]" : "bg-[#FFF1D6] text-[#B8651A]"
                            )}>
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Products Preview */}
            <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] overflow-hidden">
              <div className="p-5 pb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-foreground/65 flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#0E8A4B]" />
                  Active Catalog Products
                </h3>
                <Link to="/app/site/products" className="text-[11px] font-extrabold text-[#0E8A4B] hover:underline flex items-center gap-1">
                  View Catalog <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {loadingProducts ? (
                <div className="p-6 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0E8A4B] mx-auto" />
                </div>
              ) : products.length === 0 ? (
                <div className="px-5 pb-5">
                  <div className="bg-[#FFF6E8] border border-dashed border-[#E8B968] rounded-xl p-8 text-center">
                    <Package className="w-8 h-8 text-[#E8B968] mx-auto mb-2" />
                    <p className="text-[13px] text-foreground/65 font-bold">No products added</p>
                    <p className="text-[11px] text-foreground/45 mt-0.5">Build your item catalog and accept payments directly.</p>
                    <Link to="/app/site/products" className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0E8A4B] text-white text-[11px] font-extrabold shadow">
                      <Plus className="w-3 h-3" /> Add Product
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {products.slice(0, 4).map((p) => (
                    <div key={p.id} className="flex gap-3 p-3 bg-[#FFF6E8]/40 border border-[#E8B968]/20 rounded-xl hover:border-[#E8B968]/50 transition duration-150">
                      {p.photo_url ? (
                        <img src={p.photo_url} alt={p.name} className="w-12 h-12 rounded-lg object-cover border border-[#E8B968]/30 flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h4 className="text-[12.5px] font-extrabold text-foreground/80 truncate leading-tight">{p.name}</h4>
                          <span className="text-[9px] font-extrabold text-foreground/40 uppercase tracking-wider block mt-0.5">
                            {p.is_digital ? "Digital Product" : "Physical Product"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[12.5px] font-black text-[#0E8A4B] tabular-nums">
                            ₹{parseFloat(p.price_inr).toLocaleString("en-IN")}
                          </span>
                          <span className={cn(
                            "text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded",
                            p.status === "active" ? "bg-[#E6F7EE] text-[#0E8A4B]" : "bg-gray-100 text-gray-500"
                          )}>
                            {p.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* ── Right Column (4 cols) ── */}
          <div className="lg:col-span-4 space-y-6">

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5">
              <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-foreground/65 mb-3 flex items-center gap-2">
                <Play className="w-3.5 h-3.5 text-[#0E8A4B]" />
                Quick Actions
              </h3>
              <div className="flex flex-col gap-2">
                <Link to="/app/site/products"
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#FFF6E8] hover:bg-[#FFE8C7] border border-[#E8B968]/40 transition font-extrabold text-[12.5px] text-foreground/80 no-underline">
                  <div className="w-8 h-8 rounded-lg bg-[#E6F7EE] flex items-center justify-center">
                    <Package className="w-4 h-4 text-[#0E8A4B]" />
                  </div>
                  Manage Products
                  <ArrowUpRight className="w-4 h-4 ml-auto text-foreground/35" />
                </Link>
                <Link to="/app/site/bookings"
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#FFF6E8] hover:bg-[#FFE8C7] border border-[#E8B968]/40 transition font-extrabold text-[12.5px] text-foreground/80 no-underline">
                  <div className="w-8 h-8 rounded-lg bg-[#E4E8FF] flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-[#3C50E0]" />
                  </div>
                  Appointments & Schedules
                  <ArrowUpRight className="w-4 h-4 ml-auto text-foreground/35" />
                </Link>
                <Link to="/app/site/payments"
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#FFF6E8] hover:bg-[#FFE8C7] border border-[#E8B968]/40 transition font-extrabold text-[12.5px] text-foreground/80 no-underline">
                  <div className="w-8 h-8 rounded-lg bg-[#FCE5F0] flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-[#D4308E]" />
                  </div>
                  Setup UPI Payments
                  <ArrowUpRight className="w-4 h-4 ml-auto text-foreground/35" />
                </Link>
              </div>
            </div>

            {/* Setup Progress */}
            {site && (
              <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-foreground/65">
                    Console Setup
                  </h3>
                  <span className="text-[11px] font-extrabold text-[#0E8A4B]">{completedCount}/{checklist.length} Completed</span>
                </div>
                
                <div className="h-2.5 rounded-full bg-foreground/5 overflow-hidden mb-4">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#0E8A4B] to-[#16C172] transition-all duration-700 ease-out"
                    style={{ width: `${checklistPct}%` }} />
                </div>

                <div className="space-y-2">
                  {checklist.map((item) => (
                    <div key={item.label}
                      className={cn("flex items-center gap-2.5 p-2 rounded-xl transition",
                        item.done ? "bg-[#E6F7EE]/40" : "bg-[#FFF6E8] hover:bg-[#FFE8C7]/50 cursor-pointer")}
                      onClick={() => { if (!item.done && item.action) nav(`/app/${item.action}`); }}>
                      {item.done ? (
                        <Check className="w-4.5 h-4.5 text-[#0E8A4B] flex-shrink-0" />
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-full border-2 border-[#E8B968] flex-shrink-0" />
                      )}
                      <span className={cn("text-[12px] font-bold flex-1", item.done ? "text-foreground/45 line-through" : "text-foreground/75")}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};

const formatShortDate = (dateString: string) => {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", weekday: "short" });
};
