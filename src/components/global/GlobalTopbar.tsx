import { Menu, RefreshCw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { CommandPalette } from "./CommandPalette";
import { NotificationCenter } from "./NotificationCenter";

type Props = { onNavigate: (page: string) => void; onMenuClick?: () => void };

export const GlobalTopbar = ({ onNavigate, onMenuClick }: Props) => {
  const qc = useQueryClient();
  const [syncedAt, setSyncedAt] = useState<number>(Date.now());
  const [now, setNow] = useState<number>(Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Global ⌘K / Ctrl+K to open command palette
  useEffect(() => {
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
    <header className="h-14 px-3 sm:px-4 border-b border-border bg-card/70 backdrop-blur-xl flex items-center gap-2 sm:gap-3 flex-shrink-0 z-30">
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="lg:hidden w-10 h-10 rounded-lg hover:bg-muted flex items-center justify-center text-foreground flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      <div className="flex-1 flex items-center justify-center min-w-0">
        <button
          onClick={() => setPaletteOpen(true)}
          className="group w-full max-w-md h-9 pl-3 pr-2 rounded-xl bg-muted/50 hover:bg-muted/80 border border-transparent hover:border-border flex items-center gap-2 transition-all"
        >
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="flex-1 text-left text-[13px] text-muted-foreground truncate">
            Search or jump to…
          </span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-card border border-border text-[9px] font-bold text-muted-foreground flex-shrink-0">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* WhatsApp API status — surfaces the live connection state of the
          Meta integration so customers know whether inbound messages can
          actually arrive without leaving the current page. */}
      <WhatsAppStatusPill />

      {/* Resync — actually invalidates queries */}
      <div className="hidden md:flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleResync}
          disabled={refreshing}
          aria-label="Refresh workspace data"
          title="Refresh workspace data"
          className="group flex items-center gap-1.5 bg-muted/60 hover:bg-muted disabled:opacity-60 rounded-full px-2.5 py-1 transition-colors"
        >
          <RefreshCw className={cn(
            "w-3 h-3 text-muted-foreground group-hover:text-foreground transition-all",
            refreshing && "animate-spin"
          )} />
          <span className="text-[11px] font-semibold text-muted-foreground tabular-nums leading-none">
            {refreshing ? "Refreshing…" : `Synced ${syncLabel}`}
          </span>
        </button>
      </div>

      {/* Theme toggle removed — see src/components/ThemeToggle.tsx for the
          rationale. Re-enable once a proper dark palette is designed. */}

      <NotificationCenter onNavigate={onNavigate} />

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onNavigate={onNavigate} />
    </header>
  );
};

/* WhatsApp Business API status pill.
 *
 * Three states (in order of severity):
 *   1. Live      — meta_connected && meta_enabled
 *                  → green pill, animated emerald dot, hover shows phone
 *   2. Pending   — meta_connected && !meta_enabled
 *                  → amber pill, pulsing amber dot — Meta hasn't verified yet
 *   3. Off       — !meta_connected
 *                  → soft red pill, links to settings to start setup
 *
 * Polls every 90s (status changes rarely — token expiry, webhook flip).
 * Used to live as a one-line note buried in settings; surfacing it in the
 * topbar means a glance tells the operator whether inbound delivery is
 * working without leaving whatever page they're on. */
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
      <div className="hidden md:flex items-center gap-1.5 bg-muted/40 rounded-full px-2.5 py-1 flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-pulse" />
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/70 leading-none">
          WhatsApp
        </span>
      </div>
    );
  }

  const isLive = data.meta_connected && data.meta_enabled;
  const isPending = data.meta_connected && !data.meta_enabled;

  // ── Live: emerald, dot-pulse, phone tooltip ────────────────────────────
  if (isLive) {
    return (
      <Link
        to="/app/settings"
        title={`WhatsApp Business: ${data.display_phone_number ?? "live"}`}
        className="hidden md:flex items-center gap-1.5 bg-[#E6F7EE] hover:bg-[#D0EFDD] border border-[#0E8A4B]/40 rounded-full pl-1.5 pr-2.5 py-1 flex-shrink-0 transition-colors group"
      >
        <span className="relative flex items-center justify-center w-3 h-3">
          <span className="absolute inset-0 rounded-full bg-[#0E8A4B] opacity-30 animate-ping" />
          <span className="relative w-2 h-2 rounded-full bg-[#0E8A4B] shadow-[0_0_4px_rgba(14,138,75,0.6)]" />
        </span>
        <div className="flex flex-col leading-none">
          <span className="text-[8px] font-extrabold uppercase tracking-wider text-[#0A6E3C]/70">
            WhatsApp API
          </span>
          <span className="text-[10px] font-black text-[#0A6E3C] leading-tight">
            Live
          </span>
        </div>
      </Link>
    );
  }

  // ── Pending: amber, pulsing dot ────────────────────────────────────────
  if (isPending) {
    return (
      <Link
        to="/app/settings"
        title="Connected but not yet verified by Meta — click to re-test"
        className="hidden md:flex items-center gap-1.5 bg-[#FFF1D6] hover:bg-[#FFE9BD] border border-[#E8B968] rounded-full pl-1.5 pr-2.5 py-1 flex-shrink-0 transition-colors group"
      >
        <span className="relative flex items-center justify-center w-3 h-3">
          <span className="absolute inset-0 rounded-full bg-[#FFB020] opacity-40 animate-ping" />
          <span className="relative w-2 h-2 rounded-full bg-[#FFB020] shadow-[0_0_4px_rgba(255,176,32,0.6)]" />
        </span>
        <div className="flex flex-col leading-none">
          <span className="text-[8px] font-extrabold uppercase tracking-wider text-[#B8651A]/80">
            WhatsApp API
          </span>
          <span className="text-[10px] font-black text-[#B8651A] leading-tight">
            Pending
          </span>
        </div>
      </Link>
    );
  }

  // ── Off: soft red, faster pulse, CTA ────────────────────────────────────
  return (
    <Link
      to="/app/settings"
      title="WhatsApp not connected — click to set up"
      className="hidden md:flex items-center gap-1.5 bg-[#FCE5F0] hover:bg-[#F8D4E5] border border-[#D4308E]/40 rounded-full pl-1.5 pr-2.5 py-1 flex-shrink-0 transition-colors group"
    >
      <span className="w-2.5 h-2.5 rounded-full bg-[#D4308E] shadow-[0_0_4px_rgba(212,48,142,0.5)]" />
      <div className="flex flex-col leading-none">
        <span className="text-[8px] font-extrabold uppercase tracking-wider text-[#A11A6A]/80">
          WhatsApp API
        </span>
        <span className="text-[10px] font-black text-[#A11A6A] leading-tight">
          Not connected
        </span>
      </div>
    </Link>
  );
};
