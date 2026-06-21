import { Menu, RefreshCw, Search, Sparkles, ArrowUpRight, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { CommandPalette } from "./CommandPalette";
import { NotificationCenter } from "./NotificationCenter";
import { AddisonLogo } from "@/components/brand/AddisonLogo";


type Props = { onNavigate: (page: string) => void; onMenuClick?: () => void };

export const GlobalTopbar = ({ onNavigate, onMenuClick }: Props) => {
  const qc = useQueryClient();
  const [syncedAt, setSyncedAt] = useState<number>(Date.now());
  const [now, setNow] = useState<number>(Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  // Global ⌘K / Ctrl+K to open command palette
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
    }
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Tick every second for the "synced X ago" label.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleResync = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await qc.invalidateQueries();
      setSyncedAt(Date.now());
    } finally {
      setRefreshing(false);
    }
  };

  const secsAgo = Math.max(0, Math.floor((now - syncedAt) / 1000));
  const syncLabel = secsAgo < 60 ? `${secsAgo}s ago` : `${Math.floor(secsAgo / 60)}m ago`;

  return (
    <header className="h-16 px-3 sm:px-4 border-b border-border bg-card/70 backdrop-blur-xl flex items-center justify-between gap-3 flex-shrink-0 z-30">
      {/* Left: Mobile Menu + Logo */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden w-10 h-10 rounded-lg hover:bg-muted flex items-center justify-center text-foreground flex-shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <Link to="/app/dashboard" className="lg:hidden flex items-center flex-shrink-0 transition-transform hover:scale-[1.02]">
          <AddisonLogo size={28} />
        </Link>
      </div>

      {/* Center: Global Search Bar */}
      <div className="flex-1 max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl mx-2 hidden md:block">
        <button
          onClick={() => setPaletteOpen(true)}
          className="w-full flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#FFF6E8] hover:bg-[#FFE9BD] border-2 border-[#E8B968] text-[#B8651A]/60 hover:text-[#B8651A] transition-all duration-200 text-left shadow-[0_2px_0_0_rgba(232,185,104,0.2)] hover:shadow-[0_2px_0_0_rgba(232,185,104,0.4)] group"
        >
          <Search className="w-4 h-4 text-[#B8651A] group-hover:scale-110 transition-transform" />
          <span className="text-[13px] text-[#B8651A] font-semibold flex-1 truncate">
            Search contacts, chats, deals...
          </span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-black uppercase bg-white text-[#B8651A] border border-[#E8B968] rounded shadow-sm leading-none">
            {isMac ? "⌘K" : "Ctrl+K"}
          </kbd>
        </button>
      </div>

      {/* Right Side Controls */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* On Mobile: compact search button */}
        <button
          onClick={() => setPaletteOpen(true)}
          className="md:hidden w-9 h-9 rounded-full bg-[#FFF1D6] hover:bg-[#FFE9BD] border-2 border-[#E8B968] flex items-center justify-center transition-colors flex-shrink-0 shadow-[0_2px_0_0_#E8B968]"
          aria-label="Search"
        >
          <Search className="w-4 h-4 text-[#B8651A]" />
        </button>

        {/* WhatsApp & Plan status pills */}
        <div className="hidden xl:flex items-center gap-2">
          <WhatsAppStatusPill />
          <PlanStatusPill onNavigate={onNavigate} />
        </div>

        {/* Resync Button */}
        <button
          onClick={handleResync}
          disabled={refreshing}
          aria-label={refreshing ? "Refreshing" : `Synced ${syncLabel}`}
          title={refreshing ? "Refreshing…" : `Synced ${syncLabel} · click to refresh`}
          className="w-9 h-9 rounded-full bg-[#FFF1D6] hover:bg-[#FFE9BD] border-2 border-[#E8B968] disabled:opacity-60 flex items-center justify-center transition-colors flex-shrink-0 shadow-[0_2px_0_0_#E8B968]"
        >
          <RefreshCw className={cn(
            "w-4 h-4 text-[#B8651A]",
            refreshing && "animate-spin"
          )} />
        </button>

        {/* Notifications */}
        <NotificationCenter onNavigate={onNavigate} />
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onNavigate={onNavigate} />
    </header>
  );
};

/* WhatsApp Business API status chip — sits in the topbar so operators see
 * the connection state at a glance no matter what page they're on.
 *
 * Style: white card with brand-colored border + heavy shadow (matches the
 * AddisonX dashboard chip language). Hover lifts the chip slightly.
 *
 *   Live      — emerald border, pulsing emerald dot, "LIVE" badge
 *   Pending   — amber border, pulsing amber dot, "PENDING" badge
 *   Off       — magenta border, solid magenta dot, "OFF" badge
 */
const WhatsAppStatusPill = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["inbox-status-pill"],
    queryFn: () => api.inboxStatus(),
    staleTime: 60_000,
    refetchInterval: 90_000,
    refetchOnWindowFocus: true,
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 bg-white border-2 border-[#E8B968] rounded-full pl-2 pr-3 py-1 shadow-[0_2px_0_0_#E8B968]">
        <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse" />
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/40 leading-none">
          WhatsApp API · …
        </span>
      </div>
    );
  }

  const isLive = data.meta_connected && data.meta_enabled;
  const isPending = data.meta_connected && !data.meta_enabled;

  const config = isLive
    ? {
        border: "border-[#0E8A4B]",
        shadow: "shadow-[0_2px_0_0_#0A6E3C]",
        hoverShadow: "hover:shadow-[0_4px_0_0_#0A6E3C]",
        labelText: "text-foreground/60",
        statusBg: "bg-[#0E8A4B]",
        statusText: "text-white",
        statusLabel: "LIVE",
        dotColor: "bg-[#0E8A4B]",
        animate: true,
        tooltip: `WhatsApp Business: ${data.display_phone_number ?? "live"}`,
      }
    : isPending
    ? {
        border: "border-[#FFB020]",
        shadow: "shadow-[0_2px_0_0_#B8651A]",
        hoverShadow: "hover:shadow-[0_4px_0_0_#B8651A]",
        labelText: "text-foreground/60",
        statusBg: "bg-[#FFB020]",
        statusText: "text-[#3D1A00]",
        statusLabel: "PENDING",
        dotColor: "bg-[#FFB020]",
        animate: true,
        tooltip: "Connected but Meta hasn't verified — click to re-test",
      }
    : {
        border: "border-[#D4308E]",
        shadow: "shadow-[0_2px_0_0_#A11A6A]",
        hoverShadow: "hover:shadow-[0_4px_0_0_#A11A6A]",
        labelText: "text-foreground/60",
        statusBg: "bg-[#D4308E]",
        statusText: "text-white",
        statusLabel: "OFF",
        dotColor: "bg-[#D4308E]",
        animate: false,
        tooltip: "WhatsApp not connected — click to set up",
      };

  return (
    <Link
      to="/app/settings"
      title={config.tooltip}
      className={cn(
        "group flex items-center gap-2.5 bg-white border-2 rounded-full pl-3 pr-2 py-1.5 transition-all hover:-translate-y-0.5 active:translate-y-0",
        config.border,
        config.shadow,
        config.hoverShadow,
      )}
    >
      <img
        src="https://i.ibb.co/mChFMDSm/whatsapp.png"
        alt="WhatsApp"
        className="w-5 h-5 flex-shrink-0"
        loading="lazy"
      />
      <span className={cn("text-[12px] font-extrabold uppercase tracking-wider leading-none", config.labelText)}>
        WhatsApp&nbsp;API&nbsp;Status&nbsp;:
      </span>
      <span className={cn(
        "text-[11px] font-black uppercase tracking-wider px-2 py-1 rounded-full leading-none",
        config.statusBg,
        config.statusText,
      )}>
        {config.statusLabel}
      </span>
      {/* Live messaging tier badge — only shown when connected. Refresh via
          /api/meta/refresh-tier (admin can trigger from settings). */}
      {isLive && <MessagingTierBadge />}
    </Link>
  );
};

/* Messaging tier — e.g. TIER_10K, TIER_100K, UNLIMITED. Reads from the
 * cached value on meta_config (refreshed periodically via /meta/refresh-tier).
 * Displays as a compact pill: "10K/day" or "UNLIMITED" with a quality dot. */
const MessagingTierBadge = () => {
  const { data } = useQuery({
    queryKey: ["meta-tier"],
    queryFn: () => api.metaGetTier(),
    staleTime: 5 * 60_000,
  });
  if (!data?.messaging_limit_tier) return null;

  const tierLabel = data.messaging_limit_tier
    .replace("TIER_", "")
    .replace("K", "K/day")
    .replace("UNLIMITED", "∞");

  const quality = data.quality_rating?.toUpperCase();
  const qualityColor =
    quality === "GREEN" ? "bg-[#0E8A4B]" :
    quality === "YELLOW" ? "bg-[#FFB020]" :
    quality === "RED" ? "bg-[#D4308E]" :
    "bg-foreground/30";

  return (
    <span
      title={`Messaging tier · ${data.messaging_limit_tier}${quality ? ` · quality ${quality}` : ""}`}
      className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full leading-none bg-white border border-[#0A6E3C]/30 text-[#0A6E3C]"
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", qualityColor)} />
      {tierLabel}
    </span>
  );
};

/* Current plan + upsell — chip on the right of the WhatsApp status that
 * shows the workspace's plan and either:
 *   - on free/starter → "Explore Plans" CTA (yellow brand pill)
 *   - on growth/scale/enterprise → small crown badge (no CTA, they're paying)
 *
 * Plan reads from /api/billing/me which already drives the upgrade card in
 * the sidebar — cached 60s so this doesn't add a new round-trip.
 */
const PlanStatusPill = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["billing-me-pill"],
    queryFn: () => api.getBillingMe(),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 bg-white border-2 border-[#E8B968] rounded-full pl-2.5 pr-3 py-1 shadow-[0_2px_0_0_#E8B968]">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/40 leading-none">
          Plan · …
        </span>
      </div>
    );
  }

  const plan = (data.plan ?? "free").toLowerCase();
  const isPaid = plan !== "free" && plan !== "trial";

  // Surface annual savings if the upgrade request specified billing_cycle.
  // Falls back to monthly — annual is purely cosmetic in the chip.
  const cycle = data.pending_upgrade?.billing_cycle ?? "monthly";

  const planColor =
    plan === "enterprise" ? "text-[#7A4A00] bg-[#FFD23F]"
    : plan === "scale"     ? "text-white bg-[#FF6A1F]"
    : plan === "growth"    ? "text-white bg-[#0E8A4B]"
    : plan === "starter"   ? "text-white bg-[#3C50E0]"
    :                        "text-foreground/65 bg-[#FFF1D6] border border-[#E8B968]";

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 bg-white border-2 rounded-full pl-3 pr-1.5 py-1.5 shadow-[0_2px_0_0_#B8230C]",
        isPaid ? "border-[#FFD23F]" : "border-[#E8B968]",
      )}
    >
      <span className="text-[12px] font-extrabold uppercase tracking-wider text-foreground/55 leading-none">
        Current&nbsp;Plan&nbsp;:
      </span>
      <span className={cn(
        "inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-2 py-1 rounded-full leading-none",
        planColor,
      )}>
        {isPaid && <Crown className="w-3 h-3" strokeWidth={2.5} />}
        {plan}
        {isPaid && cycle === "annual" && <span className="opacity-80">·YR</span>}
      </span>

      <button
        onClick={() => onNavigate("upgrade")}
        title={isPaid ? "Manage plan" : "Upgrade for more features"}
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-full leading-none transition-all hover:-translate-y-0.5 active:translate-y-0",
          isPaid
            ? "bg-[#FFF1D6] text-[#B8651A] border border-[#E8B968] hover:bg-[#FFE9BD]"
            : "bg-gradient-to-r from-[#B8230C] to-[#7A1500] text-white shadow-[0_2px_0_0_#5A0F00] hover:from-[#A01F0A] hover:to-[#691200]",
        )}
      >
        <Sparkles className="w-3 h-3" strokeWidth={2.5} />
        {isPaid ? "Manage" : "Explore Plans"}
        <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
      </button>
    </div>
  );
};
