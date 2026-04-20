import { Search, Bell, Command } from "lucide-react";

export const TopHeader = () => {
  return (
    <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 animate-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-accent tracking-widest uppercase">● LIVE</span>
          <span className="text-xs text-muted-foreground">/ AddisonX Media</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tightest text-foreground">
          Revenue <span className="gradient-text">Command Center</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time pulse of your automated sales engine
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search leads, conversations…"
            className="glass w-72 h-11 pl-10 pr-16 rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:shadow-[0_0_20px_hsl(var(--primary)/0.2)] transition-all"
          />
          <kbd className="absolute right-3 hidden md:flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
            <Command className="w-3 h-3" />K
          </kbd>
        </div>

        <button className="relative w-11 h-11 glass rounded-xl flex items-center justify-center hover:border-primary/50 transition-all group">
          <Bell className="w-4 h-4 text-foreground group-hover:text-primary-glow" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-hot animate-pulse" />
        </button>

        <div className="flex items-center gap-3 glass rounded-xl pl-2 pr-4 h-11 cursor-pointer hover:border-primary/50 transition-all">
          <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center text-xs font-bold text-white">
            AX
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-semibold leading-none">Addison Patel</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Founder</p>
          </div>
        </div>
      </div>
    </header>
  );
};
