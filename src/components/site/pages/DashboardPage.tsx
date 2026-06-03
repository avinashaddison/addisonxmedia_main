import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, Loader2, Eye, ClipboardList,
  ShoppingCart, IndianRupee, Globe, Copy, ExternalLink,
  Rocket, EyeOff, CheckCircle2, Sparkles, ArrowRight,
  Package, Palette, Wrench, BarChart3, Search,
  AlertCircle, CircleDot, TrendingUp, TrendingDown, Clock, Users,
  ChevronRight, ImageIcon, Minus,
  FileText, Settings, CreditCard, Smartphone, Monitor,
  Tablet, ArrowUpRight, ArrowDownRight, Activity,
  MousePointerClick, Zap, Target, RefreshCcw
} from "lucide-react";
import { api, type SiteAnalyticsEvent, type AnalyticsCounters } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Skeleton Loader ────────────────────────────────────────────────────
const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={cn("animate-pulse bg-foreground/[0.06] rounded-lg", className)} />
);

const SkeletonCard = () => (
  <div className="p-4 rounded-xl bg-white border-2 border-[#E8B968]/40 space-y-3">
    <Skeleton className="h-3 w-16" />
    <Skeleton className="h-7 w-24" />
    <Skeleton className="h-2 w-20" />
  </div>
);

// ─── Dashboard Page ─────────────────────────────────────────────────────
export const DashboardPage = () => {
  const qc = useQueryClient();
  const nav = useNavigate();

  // ─── Core query (critical — loads first) ────────────────────────────
  const { data: site, isLoading: loadingSite, error: siteError } = useQuery({
    queryKey: ["site-me"],
    queryFn: () => api.getSite(),
    staleTime: 30_000,
  });

  // ─── Secondary queries (load in parallel, don't block render) ───────
  const { data: todayStats } = useQuery({
    queryKey: ["site-analytics-summary", 1],
    queryFn: () => api.getSiteAnalyticsSummary(1),
    staleTime: 60_000,
    enabled: !!site,
  });

  const { data: weekStats } = useQuery({
    queryKey: ["site-analytics-summary", 7],
    queryFn: () => api.getSiteAnalyticsSummary(7),
    staleTime: 60_000,
    enabled: !!site,
  });

  const { data: monthStats } = useQuery({
    queryKey: ["site-analytics-summary", 30],
    queryFn: () => api.getSiteAnalyticsSummary(30),
    staleTime: 60_000,
    enabled: !!site,
  });

  const { data: allOrders = [] } = useQuery({
    queryKey: ["site-orders"],
    queryFn: () => api.getOrders(),
    staleTime: 30_000,
    enabled: !!site,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["site-products"],
    queryFn: () => api.getProducts(),
    staleTime: 60_000,
    enabled: !!site,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["site-leads"],
    queryFn: () => api.getSiteLeads(),
    staleTime: 30_000,
    enabled: !!site,
  });

  const { data: pages = [] } = useQuery({
    queryKey: ["site-pages"],
    queryFn: () => api.getSitePages(),
    staleTime: 60_000,
    enabled: !!site,
  });

  // ─── Advanced tracking queries ──────────────────────────────────────
  const { data: recentEvents = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["site-analytics-recent"],
    queryFn: () => api.getSiteAnalyticsRecent(30),
    refetchInterval: 5_000,
    enabled: !!site,
  });

  const { data: timeseries = [] } = useQuery({
    queryKey: ["site-analytics-timeseries", 7],
    queryFn: () => api.getSiteAnalyticsTimeseries(7),
    staleTime: 120_000,
    enabled: !!site,
  });

  const { data: sources = [] } = useQuery({
    queryKey: ["site-analytics-sources", 30],
    queryFn: () => api.getSiteAnalyticsSources(30),
    staleTime: 120_000,
    enabled: !!site,
  });

  const { data: topPages = [] } = useQuery({
    queryKey: ["site-analytics-top-pages", 30],
    queryFn: () => api.getSiteAnalyticsTopPages(30),
    staleTime: 120_000,
    enabled: !!site,
  });

  // ─── Mutations ──────────────────────────────────────────────────────
  const publishMut = useMutation({
    mutationFn: () => api.publishSite(),
    onSuccess: (s) => { qc.setQueryData(["site-me"], s); toast.success("Website is now live!"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const unpublishMut = useMutation({
    mutationFn: () => api.unpublishSite(),
    onSuccess: (s) => { qc.setQueryData(["site-me"], s); toast.success("Website moved to draft"); },
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
    } catch { toast.error("Couldn't copy link"); }
  }, [publicUrl]);

  const isPublished = site?.status === "published";
  const todayCurr = todayStats?.current;
  const todayPrev = todayStats?.previous;
  const weekCurr = weekStats?.current;
  const monthCurr = monthStats?.current;
  const monthPrev = monthStats?.previous;
  const recentOrders = allOrders.slice(0, 5);
  const recentLeads = leads.slice(0, 5);

  // Setup checklist
  const checklist = useMemo(() => {
    if (!site) return [];
    return [
      { label: "Add business logo", done: !!site.copy?.logo_url, action: "site/customization", icon: ImageIcon },
      { label: "Add at least 1 product", done: products.length > 0, action: "site/products", icon: Package },
      { label: "Set up payment method", done: !!(site.copy?.upi_id), action: "site/payments", icon: CreditCard },
      { label: "Configure SEO meta tags", done: !!(site.seo_title), action: "site/seo", icon: Search },
      { label: "Publish your website", done: isPublished, action: "", icon: Rocket },
    ];
  }, [site, products, isPublished]);

  const completedCount = checklist.filter(i => i.done).length;
  const checklistPct = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

  // Conversion funnel
  const funnel = useMemo(() => {
    if (!monthCurr) return null;
    const views = Number(monthCurr.views || 0);
    const leads_n = Number(monthCurr.leads || 0);
    const orders_n = Number(monthCurr.orders || 0);
    const revenue_n = Number(monthCurr.revenue || 0);
    return {
      views,
      leads: leads_n,
      orders: orders_n,
      revenue: revenue_n,
      leadRate: views > 0 ? ((leads_n / views) * 100).toFixed(1) : "0",
      orderRate: views > 0 ? ((orders_n / views) * 100).toFixed(1) : "0",
      aov: orders_n > 0 ? Math.round(revenue_n / orders_n) : 0,
    };
  }, [monthCurr]);

  // Device breakdown from recent events
  const deviceBreakdown = useMemo(() => {
    if (!recentEvents.length) return { mobile: 0, desktop: 0, tablet: 0, total: 0 };
    let mobile = 0, desktop = 0, tablet = 0;
    recentEvents.forEach((e) => {
      const ua = (e.userAgent || "").toLowerCase();
      if (/ipad|tablet/i.test(ua)) tablet++;
      else if (/mobile|android|iphone/i.test(ua)) mobile++;
      else desktop++;
    });
    const total = mobile + desktop + tablet;
    return { mobile, desktop, tablet, total };
  }, [recentEvents]);

  // Sparkline data from timeseries (last 7 days)
  const sparkData = useMemo(() => {
    if (!timeseries.length) return [];
    return timeseries.map(d => Number(d.views || 0));
  }, [timeseries]);

  // ─── Stats period toggle ───────────────────────────────────────────
  const [statsPeriod, setStatsPeriod] = useState<"today" | "7d" | "30d">("today");
  const activePeriodStats = statsPeriod === "today" ? todayCurr 
    : statsPeriod === "7d" ? weekCurr : monthCurr;
  const activePeriodPrev = statsPeriod === "today" ? todayPrev 
    : statsPeriod === "7d" ? weekStats?.previous : monthPrev;

  // ─── Error state ──────────────────────────────────────────────────
  if (siteError && !site) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#FFF6E8] px-6">
        <div className="text-center max-w-md bg-white border-2 border-[#E8B968] p-6 rounded-2xl shadow-lg">
          <AlertCircle className="w-12 h-12 text-[#D4308E] mx-auto mb-3" />
          <h2 className="text-[18px] font-black mb-1">Could not load your website</h2>
          <p className="text-[13px] text-foreground/65 mb-4">Please check your connection and try again.</p>
          <button onClick={() => window.location.reload()} className="h-9 px-4 bg-[#0E8A4B] text-white rounded-xl text-[12px] font-extrabold">
            <RefreshCcw className="w-3.5 h-3.5 inline mr-1.5" /> Retry
          </button>
        </div>
      </div>
    );
  }

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
                    <span className="flex items-center gap-1">
                      <Palette className="w-3.5 h-3.5" />
                      Template: <strong className="capitalize">{site.template}</strong>
                    </span>
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

        {/* ═══ 2. PERFORMANCE METRICS WITH PERIOD TOGGLE ═══ */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-black uppercase tracking-wider text-foreground/55 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#0E8A4B]" />
              Performance Overview
            </h2>
            <div className="flex items-center gap-0.5 bg-white border border-[#E8B968] p-0.5 rounded-lg">
              {(["today", "7d", "30d"] as const).map((p) => (
                <button key={p} onClick={() => setStatsPeriod(p)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-[10.5px] font-extrabold uppercase tracking-wider transition",
                    statsPeriod === p ? "bg-[#0E8A4B] text-white shadow-sm" : "text-foreground/50 hover:text-foreground hover:bg-[#FFF6E8]"
                  )}>
                  {p === "today" ? "Today" : p}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {activePeriodStats ? (
              <>
                <MetricCard label="Page Views" value={activePeriodStats.views || "0"} prev={activePeriodPrev?.views} icon={Eye} color="#3C50E0" sparkline={sparkData} />
                <MetricCard label="Leads Captured" value={activePeriodStats.leads || "0"} prev={activePeriodPrev?.leads} icon={ClipboardList} color="#FF6A1F" />
                <MetricCard label="Orders" value={activePeriodStats.orders || "0"} prev={activePeriodPrev?.orders} icon={ShoppingCart} color="#0E8A4B" />
                <MetricCard label="Revenue" value={`₹${Math.round(Number(activePeriodStats.revenue || 0)).toLocaleString("en-IN")}`} prev={activePeriodPrev?.revenue} prefix="₹" icon={IndianRupee} color="#D4308E" />
              </>
            ) : (
              Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            )}
          </div>
        </div>

        {/* ═══ 3. MAIN CONTENT GRID ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── Left Column (8 cols) ── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Conversion Funnel */}
            {funnel && (
              <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-foreground/65 flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#D4308E]" />
                    Conversion Funnel
                    <span className="text-[9px] font-bold text-foreground/35 normal-case tracking-normal ml-1">Last 30 days</span>
                  </h3>
                  <a href="#" onClick={(e) => { e.preventDefault(); nav("/app/site/analytics"); }}
                    className="text-[11px] font-extrabold text-[#3C50E0] hover:underline flex items-center gap-1">
                    Deep Analytics <ArrowRight className="w-3 h-3" />
                  </a>
                </div>

                {/* Funnel bars */}
                <div className="space-y-3">
                  <FunnelRow label="Visitors" value={funnel.views} maxVal={funnel.views} color="#3C50E0" icon={Eye} />
                  <FunnelRow label="Leads" value={funnel.leads} maxVal={funnel.views} color="#FF6A1F" icon={ClipboardList}
                    badge={`${funnel.leadRate}% conversion`} />
                  <FunnelRow label="Orders" value={funnel.orders} maxVal={funnel.views} color="#0E8A4B" icon={ShoppingCart}
                    badge={`${funnel.orderRate}% conversion`} />
                </div>

                {/* Bottom metrics */}
                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-dashed border-[#E8B968]/40">
                  <div className="text-center">
                    <p className="text-[20px] font-black text-[#D4308E] tabular-nums leading-none">₹{funnel.revenue.toLocaleString("en-IN")}</p>
                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-foreground/45 mt-1">Total Revenue</p>
                  </div>
                  <div className="w-px h-10 bg-[#E8B968]/30" />
                  <div className="text-center">
                    <p className="text-[20px] font-black text-[#0E8A4B] tabular-nums leading-none">₹{funnel.aov.toLocaleString("en-IN")}</p>
                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-foreground/45 mt-1">Avg. Order Value</p>
                  </div>
                  <div className="w-px h-10 bg-[#E8B968]/30" />
                  <div className="text-center">
                    <p className="text-[20px] font-black text-[#3C50E0] tabular-nums leading-none">{Number(monthCurr?.unique_visitors || 0).toLocaleString("en-IN")}</p>
                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-foreground/45 mt-1">Unique Visitors</p>
                  </div>
                </div>
              </div>
            )}

            {/* Setup Checklist (show only if not all done) */}
            {site && checklistPct < 100 && (
              <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-foreground/65 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#FFD23F]" />
                    Store Setup
                  </h3>
                  <span className="text-[11px] font-extrabold text-[#0E8A4B]">{completedCount}/{checklist.length} completed</span>
                </div>
                
                <div className="h-2.5 rounded-full bg-foreground/5 overflow-hidden mb-4">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#0E8A4B] to-[#16C172] transition-all duration-700 ease-out"
                    style={{ width: `${checklistPct}%` }} />
                </div>

                <div className="space-y-2">
                  {checklist.map((item) => (
                    <div key={item.label}
                      className={cn("flex items-center gap-3 p-2.5 rounded-xl transition",
                        item.done ? "bg-[#E6F7EE]/50" : "bg-[#FFF6E8] hover:bg-[#FFE8C7]/50 cursor-pointer")}
                      onClick={() => { if (!item.done && item.action) nav(`/app/${item.action}`); }}>
                      {item.done ? <CheckCircle2 className="w-5 h-5 text-[#0E8A4B] flex-shrink-0" /> : <CircleDot className="w-5 h-5 text-[#E8B968] flex-shrink-0" />}
                      <span className={cn("text-[13px] font-bold flex-1", item.done ? "text-foreground/50 line-through" : "text-foreground/80")}>{item.label}</span>
                      {!item.done && <ChevronRight className="w-4 h-4 text-foreground/30 flex-shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Orders */}
            <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] overflow-hidden">
              <div className="p-5 pb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-foreground/65 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-[#0E8A4B]" />
                  Recent Orders
                </h3>
                <a href="#" onClick={(e) => { e.preventDefault(); nav("/app/site/orders"); }}
                  className="text-[11px] font-extrabold text-[#0E8A4B] hover:underline flex items-center gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </a>
              </div>

              {recentOrders.length === 0 ? (
                <div className="px-5 pb-5">
                  <div className="bg-[#FFF6E8] border border-dashed border-[#E8B968] rounded-xl p-6 text-center">
                    <ShoppingCart className="w-8 h-8 text-[#E8B968] mx-auto mb-2" />
                    <p className="text-[12px] text-foreground/50 font-bold">No orders yet</p>
                    <p className="text-[10.5px] text-foreground/40 mt-0.5">Orders from your store will show up here</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-t border-b border-[#E8B968]/40 bg-[#FFF6E8]/30">
                        <th className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 px-5 py-2.5">Order #</th>
                        <th className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 px-3 py-2.5">Customer</th>
                        <th className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 px-3 py-2.5">Amount</th>
                        <th className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 px-3 py-2.5">Status</th>
                        <th className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 px-3 py-2.5">Payment</th>
                        <th className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 px-3 py-2.5">Source</th>
                        <th className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 px-3 py-2.5">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8B968]/20">
                      {recentOrders.map((o) => (
                        <tr key={o.id} className="hover:bg-[#FFF6E8]/30 transition cursor-pointer" onClick={() => nav(`/app/site/orders`)}>
                          <td className="px-5 py-3 text-[12.5px] font-extrabold text-[#3C50E0]">#{o.order_number}</td>
                          <td className="px-3 py-3">
                            <p className="text-[12.5px] font-bold text-foreground/80 truncate max-w-[140px]">{o.customer_name}</p>
                            {o.customer_phone && <p className="text-[10px] text-foreground/45 font-medium">{o.customer_phone}</p>}
                          </td>
                          <td className="px-3 py-3 text-[12.5px] font-extrabold text-foreground/90 tabular-nums">₹{Math.round(Number(o.total_inr)).toLocaleString("en-IN")}</td>
                          <td className="px-3 py-3"><OrderStatusBadge status={o.status} /></td>
                          <td className="px-3 py-3"><PaymentBadge status={o.payment_status} /></td>
                          <td className="px-3 py-3"><SourceBadge source={o.source} /></td>
                          <td className="px-3 py-3 text-[11px] text-foreground/50 font-medium whitespace-nowrap">{formatShortDate(o.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Leads */}
            <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] overflow-hidden">
              <div className="p-5 pb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-foreground/65 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-[#FF6A1F]" />
                  Recent Leads
                </h3>
                <a href="#" onClick={(e) => { e.preventDefault(); nav("/app/site/leads"); }}
                  className="text-[11px] font-extrabold text-[#FF6A1F] hover:underline flex items-center gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </a>
              </div>

              {recentLeads.length === 0 ? (
                <div className="px-5 pb-5">
                  <div className="bg-[#FFF6E8] border border-dashed border-[#E8B968] rounded-xl p-6 text-center">
                    <ClipboardList className="w-8 h-8 text-[#E8B968] mx-auto mb-2" />
                    <p className="text-[12px] text-foreground/50 font-bold">No leads captured yet</p>
                    <p className="text-[10.5px] text-foreground/40 mt-0.5">Lead form submissions will appear here</p>
                  </div>
                </div>
              ) : (
                <div className="px-5 pb-4 space-y-2">
                  {recentLeads.map((lead) => (
                    <div key={lead.id} className="flex items-center gap-3 p-3 bg-[#FFF6E8]/40 rounded-xl border border-[#E8B968]/20 hover:border-[#E8B968]/50 transition">
                      <div className="w-9 h-9 rounded-full bg-[#FF6A1F]/10 flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-[#FF6A1F]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-bold text-foreground/80 truncate">{lead.name}</p>
                        <p className="text-[10.5px] text-foreground/50 font-medium truncate">
                          {lead.phone || lead.email || "No contact info"}
                          {lead.message && <> · "{lead.message.slice(0, 40)}{lead.message.length > 40 ? "..." : ""}"</>}
                        </p>
                      </div>
                      <span className="text-[10px] text-foreground/40 font-medium whitespace-nowrap flex-shrink-0">{formatRelativeTime(lead.created_at)}</span>
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
                <Zap className="w-4 h-4 text-[#FFD23F]" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <QuickActionBtn icon={Wrench} label="Customize" color="#0E8A4B" action="site/customization" />
                <QuickActionBtn icon={Package} label="Products" color="#3C50E0" action="site/products" />
                <QuickActionBtn icon={Palette} label="Themes" color="#D4308E" action="site/theme" />
                <QuickActionBtn icon={ShoppingCart} label="Orders" color="#FF6A1F" action="site/orders" />
                <QuickActionBtn icon={BarChart3} label="Analytics" color="#0E8A4B" action="site/analytics" />
                <QuickActionBtn icon={Settings} label="Settings" color="#B8651A" action="site/settings" />
              </div>
            </div>

            {/* Traffic Sources */}
            <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5 space-y-3">
              <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-foreground/65 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#3C50E0]" />
                Traffic Sources
                <span className="text-[9px] font-bold text-foreground/35 normal-case tracking-normal ml-1">30d</span>
              </h3>
              {sources.length === 0 ? (
                <p className="text-[11px] text-foreground/40 font-medium text-center py-4">No traffic data yet</p>
              ) : (
                <div className="space-y-2">
                  {sources.slice(0, 6).map((s, i) => {
                    const maxViews = Number(sources[0]?.views || 1);
                    const pct = Math.round((Number(s.views) / maxViews) * 100);
                    return (
                      <div key={s.source} className="flex items-center gap-2.5">
                        <span className="text-[11px] font-bold text-foreground/60 w-[90px] truncate">{s.source === "direct" ? "🔗 Direct" : s.source}</span>
                        <div className="flex-1 h-2 bg-foreground/[0.04] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" 
                            style={{ width: `${pct}%`, backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                        </div>
                        <span className="text-[10px] font-extrabold tabular-nums text-foreground/70 w-8 text-right">{s.views}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Device Breakdown */}
            <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5 space-y-3">
              <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-foreground/65 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#FF6A1F]" />
                Device Breakdown
                <span className="text-[9px] font-bold text-foreground/35 normal-case tracking-normal ml-1">Recent sessions</span>
              </h3>
              {deviceBreakdown.total === 0 ? (
                <p className="text-[11px] text-foreground/40 font-medium text-center py-4">No device data yet</p>
              ) : (
                <div className="space-y-2.5">
                  <DeviceRow icon={Smartphone} label="Mobile" count={deviceBreakdown.mobile} total={deviceBreakdown.total} color="#0E8A4B" />
                  <DeviceRow icon={Monitor} label="Desktop" count={deviceBreakdown.desktop} total={deviceBreakdown.total} color="#3C50E0" />
                  <DeviceRow icon={Tablet} label="Tablet" count={deviceBreakdown.tablet} total={deviceBreakdown.total} color="#D4308E" />
                </div>
              )}
            </div>

            {/* Top Pages */}
            <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5 space-y-3">
              <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-foreground/65 flex items-center gap-2">
                <MousePointerClick className="w-4 h-4 text-[#0E8A4B]" />
                Top Pages
                <span className="text-[9px] font-bold text-foreground/35 normal-case tracking-normal ml-1">30d</span>
              </h3>
              {topPages.length === 0 ? (
                <p className="text-[11px] text-foreground/40 font-medium text-center py-4">No page data yet</p>
              ) : (
                <div className="space-y-1.5">
                  {topPages.slice(0, 6).map((pg, i) => (
                    <div key={pg.path} className="flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-[#FFF6E8]/40 transition">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[9px] font-extrabold w-4 h-4 rounded flex items-center justify-center bg-[#0E8A4B]/10 text-[#0E8A4B]">{i + 1}</span>
                        <code className="text-[11.5px] font-bold text-foreground/70 truncate max-w-[130px]">{pg.path}</code>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Eye className="w-3 h-3 text-foreground/30" />
                        <span className="text-[11px] font-extrabold tabular-nums text-foreground/70">{Number(pg.views).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Store Info Snapshot */}
            <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] p-5 space-y-3">
              <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-foreground/65 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#3C50E0]" />
                Store Snapshot
              </h3>
              <div className="space-y-2.5">
                <InfoRow label="Products" value={`${products.length} items`} icon={Package} />
                <InfoRow label="Active Pages" value={`${pages.filter(p => p.active).length} pages`} icon={FileText} />
                <InfoRow label="Total Views" value={`${Number(site?.view_count || 0).toLocaleString("en-IN")}`} icon={Eye} />
                <InfoRow label="Total Orders" value={`${allOrders.length}`} icon={ShoppingCart} />
                <InfoRow label="Total Leads" value={`${leads.length}`} icon={ClipboardList} />
              </div>
            </div>
          </div>
        </div>

        {/* ═══ 4. REAL-TIME ACTIVITY STREAM (Full Width) ═══ */}
        <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] overflow-hidden">
          <div className="p-5 border-b border-[#E8B968]/40 bg-[#FFF6E8]/20 flex items-center justify-between">
            <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-foreground/65 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16C172] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#16C172]" />
              </span>
              Real-Time Visitor Activity
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-[#E6F7EE] text-[#0E8A4B] uppercase tracking-wider border border-[#0E8A4B]/20">
                {recentEvents.length} events
              </span>
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-[#E4E8FF] text-[#3C50E0] uppercase tracking-wider border border-[#3C50E0]/20">
                Refreshing every 5s
              </span>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loadingEvents && recentEvents.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#0E8A4B] mx-auto" />
                <p className="text-[11px] text-foreground/45 font-bold">Loading activity stream...</p>
              </div>
            ) : recentEvents.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Activity className="w-8 h-8 text-[#E8B968] mx-auto" />
                <p className="text-[12px] text-foreground/50 font-bold">No recent visitor activity</p>
                <p className="text-[10.5px] text-foreground/40">Events will appear here as visitors browse your site</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-[#FFF6E8]/90 backdrop-blur-sm">
                  <tr className="border-b border-[#E8B968]/40">
                    <th className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 px-5 py-2.5">Event</th>
                    <th className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 px-3 py-2.5">Page</th>
                    <th className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 px-3 py-2.5">Source</th>
                    <th className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 px-3 py-2.5">Device</th>
                    <th className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 px-3 py-2.5">Value</th>
                    <th className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/50 px-3 py-2.5 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8B968]/15">
                  {recentEvents.map((evt, i) => {
                    const evtMeta = getEventMeta(evt.eventType);
                    const device = parseDevice(evt.userAgent);
                    return (
                      <tr key={evt.id} className={cn("hover:bg-[#FFF6E8]/30 transition", i === 0 && "bg-[#E6F7EE]/20")}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", evtMeta.bg)}>
                              <evtMeta.icon className={cn("w-3 h-3", evtMeta.text)} />
                            </div>
                            <span className={cn("text-[11.5px] font-extrabold", evtMeta.text)}>{evtMeta.label}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <code className="text-[11px] font-bold text-foreground/60 bg-[#FFF6E8] px-1.5 py-0.5 rounded border border-[#E8B968]/30">{evt.path || "/"}</code>
                        </td>
                        <td className="px-3 py-3 text-[11px] font-medium text-foreground/55">{evt.referrerHost || "Direct"}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <device.icon className="w-3 h-3 text-foreground/40" />
                            <span className="text-[10.5px] font-bold text-foreground/55">{device.label}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-[11px] font-extrabold tabular-nums text-foreground/70">
                          {evt.valueInr ? `₹${Number(evt.valueInr).toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="px-3 py-3 text-[10.5px] text-foreground/45 font-medium text-right whitespace-nowrap">{formatRelativeTime(evt.occurredAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

// ─── Helper Components ────────────────────────────────────────────────────────

const SOURCE_COLORS = ["#0E8A4B", "#3C50E0", "#FF6A1F", "#D4308E", "#B8651A", "#7A1052"];

const MetricCard = ({ label, value, prev, prefix, icon: Icon, color, sparkline }: {
  label: string; value: string; prev?: string; prefix?: string; icon: any; color: string; sparkline?: number[];
}) => {
  const trend = useMemo(() => {
    if (!prev) return null;
    const currNum = Number(String(value).replace(/[₹,]/g, ""));
    const prevNum = Number(String(prev).replace(/[₹,]/g, ""));
    if (prevNum === 0 && currNum === 0) return { pct: 0, dir: "flat" as const };
    if (prevNum === 0) return { pct: 100, dir: "up" as const };
    const pct = Math.round(((currNum - prevNum) / prevNum) * 100);
    return { pct: Math.abs(pct), dir: pct > 0 ? "up" as const : pct < 0 ? "down" as const : "flat" as const };
  }, [value, prev]);

  return (
    <div className="relative overflow-hidden p-4 rounded-xl bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968] group hover:shadow-[0_4px_0_0_#E8B968] hover:-translate-y-0.5 transition-all duration-200">
      {/* Sparkline background */}
      {sparkline && sparkline.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-10 opacity-[0.06]">
          <MiniSparkline data={sparkline} color={color} />
        </div>
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
              <Icon className="w-3.5 h-3.5" style={{ color }} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color }}>{label}</span>
          </div>
          {trend && trend.dir !== "flat" && (
            <div className={cn("flex items-center gap-0.5 text-[9.5px] font-extrabold px-1.5 py-0.5 rounded",
              trend.dir === "up" ? "text-[#0E8A4B] bg-[#E6F7EE]" : "text-[#D4308E] bg-[#FCE5F0]"
            )}>
              {trend.dir === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trend.pct}%
            </div>
          )}
        </div>
        <p className="text-[22px] font-black tabular-nums text-foreground/90 leading-none">{value}</p>
      </div>
    </div>
  );
};

const MiniSparkline = ({ data, color }: { data: number[]; color: string }) => {
  const max = Math.max(...data, 1);
  const w = 200;
  const h = 40;
  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-full">
      <polyline fill="none" stroke={color} strokeWidth="3" points={points} />
    </svg>
  );
};

const FunnelRow = ({ label, value, maxVal, color, icon: Icon, badge }: {
  label: string; value: number; maxVal: number; color: string; icon: any; badge?: string;
}) => {
  const pct = maxVal > 0 ? Math.max(3, (value / maxVal) * 100) : 3;
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 flex items-center justify-center">
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11.5px] font-extrabold text-foreground/70">{label}</span>
          <div className="flex items-center gap-2">
            {badge && <span className="text-[9px] font-bold text-foreground/40 bg-foreground/[0.04] px-1.5 py-0.5 rounded">{badge}</span>}
            <span className="text-[12px] font-extrabold tabular-nums text-foreground/80">{value.toLocaleString("en-IN")}</span>
          </div>
        </div>
        <div className="h-2 bg-foreground/[0.04] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
    </div>
  );
};

const DeviceRow = ({ icon: Icon, label, count, total, color }: {
  icon: any; label: string; count: number; total: number; color: string;
}) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[11.5px] font-bold text-foreground/70">{label}</span>
          <span className="text-[11px] font-extrabold tabular-nums text-foreground/65">{pct}%</span>
        </div>
        <div className="h-1.5 bg-foreground/[0.04] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
    </div>
  );
};

const OrderStatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, { bg: string; text: string }> = {
    new: { bg: "bg-[#E4E8FF]", text: "text-[#3C50E0]" },
    confirmed: { bg: "bg-[#E6F7EE]", text: "text-[#0E8A4B]" },
    shipped: { bg: "bg-[#FFF1D6]", text: "text-[#B8651A]" },
    delivered: { bg: "bg-[#E6F7EE]", text: "text-[#0E8A4B]" },
    cancelled: { bg: "bg-[#FCE5F0]", text: "text-[#D4308E]" },
  };
  const s = styles[status] || styles.new;
  return <span className={cn("text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md", s.bg, s.text)}>{status}</span>;
};

const PaymentBadge = ({ status }: { status: string }) => {
  const styles: Record<string, { bg: string; text: string }> = {
    pending: { bg: "bg-[#FFF1D6]", text: "text-[#B8651A]" },
    paid: { bg: "bg-[#E6F7EE]", text: "text-[#0E8A4B]" },
    refunded: { bg: "bg-[#FCE5F0]", text: "text-[#D4308E]" },
  };
  const s = styles[status] || styles.pending;
  return <span className={cn("text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md", s.bg, s.text)}>{status}</span>;
};

const SourceBadge = ({ source }: { source: string }) => {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    website: { bg: "bg-[#E4E8FF]", text: "text-[#3C50E0]", label: "Web" },
    whatsapp: { bg: "bg-[#E6F7EE]", text: "text-[#0E8A4B]", label: "WhatsApp" },
    manual: { bg: "bg-[#FFF1D6]", text: "text-[#B8651A]", label: "Manual" },
  };
  const s = styles[source] || styles.website;
  return <span className={cn("text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md", s.bg, s.text)}>{s.label}</span>;
};

const QuickActionBtn = ({ icon: Icon, label, color, action }: { icon: any; label: string; color: string; action: string }) => (
  <Link to={`/app/${action}`}
    className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl bg-[#FFF6E8] hover:bg-[#FFE8C7] border border-[#E8B968]/40 transition group no-underline hover:-translate-y-0.5 hover:shadow-sm">
    <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110" style={{ backgroundColor: `${color}12` }}>
      <Icon className="w-4 h-4" style={{ color }} strokeWidth={2.2} />
    </div>
    <span className="text-[10px] font-extrabold text-foreground/70">{label}</span>
  </Link>
);

const InfoRow = ({ label, value, icon: Icon }: { label: string; value: string; icon: any }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-dashed border-[#E8B968]/30 last:border-0">
    <span className="text-[12px] font-bold text-foreground/60 flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-foreground/40" />{label}
    </span>
    <span className="text-[12.5px] font-extrabold text-foreground/80 tabular-nums">{value}</span>
  </div>
);

const getEventMeta = (type: string) => {
  switch (type) {
    case "view": return { icon: Eye, label: "Page View", bg: "bg-[#E4E8FF]", text: "text-[#3C50E0]" };
    case "lead": return { icon: ClipboardList, label: "Lead Captured", bg: "bg-[#FFF1D6]", text: "text-[#FF6A1F]" };
    case "cart_add": return { icon: ShoppingCart, label: "Cart Add", bg: "bg-[#FCE5F0]", text: "text-[#D4308E]" };
    case "order": return { icon: IndianRupee, label: "Order Placed", bg: "bg-[#E6F7EE]", text: "text-[#0E8A4B]" };
    default: return { icon: Activity, label: type, bg: "bg-foreground/5", text: "text-foreground/60" };
  }
};

const parseDevice = (ua: string | null): { icon: any; label: string } => {
  if (!ua) return { icon: Monitor, label: "Unknown" };
  const lower = ua.toLowerCase();

  // Browser detection
  let browser = "Browser";
  if (lower.includes("chrome") && !lower.includes("edg")) browser = "Chrome";
  else if (lower.includes("firefox")) browser = "Firefox";
  else if (lower.includes("safari") && !lower.includes("chrome")) browser = "Safari";
  else if (lower.includes("edg")) browser = "Edge";

  // Device detection
  if (/ipad|tablet/i.test(lower)) return { icon: Tablet, label: `Tablet (${browser})` };
  if (/mobile|android|iphone/i.test(lower)) return { icon: Smartphone, label: `Mobile (${browser})` };
  return { icon: Monitor, label: `Desktop (${browser})` };
};

const formatRelativeTime = (isoString: string) => {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSecs < 10) return "just now";
  if (diffSecs < 60) return `${diffSecs}s ago`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(isoString).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
};

const formatShortDate = (isoString: string) => {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};
