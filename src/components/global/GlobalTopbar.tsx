import { Menu, RefreshCw, Moon, Sun, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { CommandPalette } from "./CommandPalette";
import { NotificationCenter } from "./NotificationCenter";

type Props = { onNavigate: (page: string) => void; onMenuClick?: () => void };

export const GlobalTopbar = ({ onNavigate, onMenuClick }: Props) => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const [syncedAt, setSyncedAt] = useState<number>(Date.now());
  const [now, setNow] = useState<number>(Date.now());
  const [activeNow] = useState<number>(() => 2 + Math.floor(Math.random() * 4)); // 2–5 active
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

      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        aria-label="Toggle theme"
        className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 relative overflow-hidden"
      >
        <Sun className={`w-4 h-4 absolute transition-all duration-300 ${isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
        <Moon className={`w-4 h-4 absolute transition-all duration-300 ${isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`} />
      </button>

      <NotificationCenter onNavigate={onNavigate} />

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onNavigate={onNavigate} />
    </header>
  );
};
