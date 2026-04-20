import { Search, Bell, Plus, ChevronDown, RefreshCw, Download, Filter, Calendar } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const tabs = ["Overview", "Leads", "Pipeline", "Analytics"];
const ranges = ["Today", "7 days", "30 days", "This quarter"];

export const TopHeader = () => {
  const [activeTab, setActiveTab] = useState("Overview");
  const [range, setRange] = useState("7 days");

  return (
    <header className="mb-6 animate-fade-in">
      {/* Top row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
            <span>Home</span>
            <span>/</span>
            <span className="text-foreground font-medium">Dashboard</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Date range */}
          <div className="hidden md:flex items-center bg-card border border-border rounded-lg p-0.5 gap-0.5">
            {ranges.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[11px] font-medium transition-all",
                  range === r
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Mobile date picker */}
          <button className="md:hidden h-9 px-3 bg-card border border-border rounded-lg text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            {range}
            <ChevronDown className="w-3 h-3" />
          </button>

          <div className="h-6 w-px bg-border hidden md:block" />

          <button className="h-9 w-9 bg-card border border-border rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button className="h-9 w-9 bg-card border border-border rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all" title="Export">
            <Download className="w-3.5 h-3.5" />
          </button>

          <div className="relative hidden md:flex items-center">
            <Search className="absolute left-3 w-3.5 h-3.5 text-muted-foreground" />
            <input
              placeholder="Search…"
              className="bg-card border border-border w-48 h-9 pl-9 pr-3 rounded-lg text-xs placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </div>

          <button className="relative h-9 w-9 bg-card border border-border rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
            <Bell className="w-3.5 h-3.5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-hot ring-2 ring-card" />
          </button>

          <button className="h-9 px-3.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-primary-glow transition-all shadow-sm">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Lead</span>
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-border -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "relative px-4 py-2.5 text-[13px] font-medium transition-colors",
              activeTab === tab
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>
    </header>
  );
};
