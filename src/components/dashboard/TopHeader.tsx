import { Search, Bell, Plus, Calendar } from "lucide-react";

export const TopHeader = () => {
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>{today}</span>
        </div>
        <h1 className="text-2xl md:text-[28px] font-bold tracking-tight text-foreground">
          Welcome back, Addison 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Here's what's happening with your leads today
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="relative hidden md:flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search leads, contacts…"
            className="bg-card border border-border w-64 h-10 pl-10 pr-4 rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
          />
        </div>

        <button className="relative w-10 h-10 bg-card border border-border rounded-xl flex items-center justify-center hover:border-primary/40 hover:bg-primary-soft transition-all">
          <Bell className="w-4 h-4 text-foreground" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-hot ring-2 ring-card" />
        </button>

        <button className="h-10 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-semibold flex items-center gap-1.5 hover:bg-primary-glow transition-all shadow-[var(--shadow-glow)]">
          <Plus className="w-4 h-4" />
          New Lead
        </button>

        <div className="flex items-center gap-2.5 bg-card border border-border rounded-xl pl-1 pr-3 h-10 cursor-pointer hover:border-primary/40 transition-all">
          <div className="w-7 h-7 rounded-lg bg-gradient-accent flex items-center justify-center text-[11px] font-bold text-white">
            AP
          </div>
          <div className="hidden lg:block">
            <p className="text-xs font-semibold leading-none">Addison P.</p>
          </div>
        </div>
      </div>
    </header>
  );
};
