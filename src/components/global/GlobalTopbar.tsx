import { Menu, RefreshCw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
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
