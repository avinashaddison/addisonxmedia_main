import { Menu, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationCenter } from "./NotificationCenter";

type Props = { onNavigate: (page: string) => void; onMenuClick?: () => void };

export const GlobalTopbar = ({ onNavigate, onMenuClick }: Props) => {
  const [syncedAt, setSyncedAt] = useState<number>(Date.now());
  const [now, setNow] = useState<number>(Date.now());
  const [activeNow] = useState<number>(() => 2 + Math.floor(Math.random() * 4)); // 2–5 active

  // Tick every second for "Last sync" label
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // "Resync" every ~45s to keep the label feeling alive
  useEffect(() => {
    const t = setInterval(() => setSyncedAt(Date.now()), 45_000);
    return () => clearInterval(t);
  }, []);

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
        <GlobalSearch onNavigate={onNavigate} />
      </div>

      {/* Live presence — desktop only */}
      <div className="hidden md:flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5 bg-success-soft border border-success/20 rounded-full pl-1.5 pr-2.5 py-1">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          <span className="text-[11px] font-bold text-success leading-none">
            {activeNow} active now
          </span>
        </div>

        <button
          onClick={() => setSyncedAt(Date.now())}
          title="Resync workspace"
          className="group flex items-center gap-1.5 bg-muted/60 hover:bg-muted rounded-full px-2.5 py-1 transition-colors"
        >
          <RefreshCw className="w-3 h-3 text-muted-foreground group-hover:text-foreground group-active:rotate-180 transition-all duration-500" />
          <span className="text-[11px] font-semibold text-muted-foreground tabular-nums leading-none">
            Synced {syncLabel}
          </span>
        </button>
      </div>

      <NotificationCenter onNavigate={onNavigate} />
    </header>
  );
};
