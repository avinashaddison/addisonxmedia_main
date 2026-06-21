import { useTheme } from "next-themes";
import { Sun, Moon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type Props = {
  collapsed?: boolean;
};

export const ThemeToggle = ({ collapsed = false }: Props) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-[102px] h-[34px] rounded-full bg-muted/40 animate-pulse" />;
  }

  // Normalize theme value
  const currentTheme = (theme === "light" || theme === "dark" || theme === "cool-dark") ? theme : "light";

  const handleCycleTheme = () => {
    if (currentTheme === "light") setTheme("dark");
    else if (currentTheme === "dark") setTheme("cool-dark");
    else setTheme("light");
  };

  // Render a compact single-button cycler if sidebar is collapsed
  if (collapsed) {
    return (
      <button
        onClick={handleCycleTheme}
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-muted/80 border border-border/40 shadow-sm",
          currentTheme === "light" && "text-amber-500 bg-amber-500/5 hover:border-amber-500/20",
          currentTheme === "dark" && "text-emerald-400 bg-emerald-400/5 hover:border-emerald-400/20",
          currentTheme === "cool-dark" && "text-purple-400 bg-purple-400/5 hover:border-purple-400/20"
        )}
        title={`Current: ${currentTheme === "cool-dark" ? "Cool Dark" : currentTheme.toUpperCase()} · Click to cycle`}
      >
        {currentTheme === "light" && <Sun className="w-5 h-5 animate-pulse" style={{ animationDuration: "3s" }} />}
        {currentTheme === "dark" && <Moon className="w-5 h-5" />}
        {currentTheme === "cool-dark" && <Sparkles className="w-5 h-5 animate-float" />}
      </button>
    );
  }

  // Slider translation offsets
  const translationX =
    currentTheme === "light" ? "translate-x-0" :
    currentTheme === "dark" ? "translate-x-[33px]" :
    "translate-x-[66px]";

  return (
    <div 
      className={cn(
        "relative flex items-center bg-muted/50 border border-border/60 p-[2px] rounded-full w-[102px] h-[34px] select-none transition-all shadow-inner",
        currentTheme === "cool-dark" && "bg-slate-900 border-purple-500/20 shadow-purple-950/20",
        currentTheme === "dark" && "bg-zinc-900 border-emerald-500/10 shadow-emerald-950/25"
      )}
    >
      {/* Sliding Active Indicator */}
      <div
        className={cn(
          "absolute top-[2px] left-[2px] w-[30px] h-[28px] rounded-full bg-card shadow-md border transition-all duration-300 cubic-bezier(0.34, 1.56, 0.64, 1)",
          translationX,
          currentTheme === "light" && "border-amber-500/20 shadow-amber-500/10",
          currentTheme === "dark" && "border-emerald-500/20 shadow-emerald-950/40 bg-zinc-800",
          currentTheme === "cool-dark" && "border-purple-500/30 shadow-purple-950/50 bg-slate-850"
        )}
      />

      {/* Light Toggle */}
      <button
        onClick={() => setTheme("light")}
        className={cn(
          "relative z-10 w-[30px] h-[28px] rounded-full flex items-center justify-center transition-colors duration-200",
          currentTheme === "light" ? "text-amber-500" : "text-muted-foreground/50 hover:text-foreground"
        )}
        title="Light Mode"
      >
        <Sun className="w-4 h-4" />
      </button>

      {/* Dark Toggle */}
      <button
        onClick={() => setTheme("dark")}
        className={cn(
          "relative z-10 w-[30px] h-[28px] rounded-full flex items-center justify-center transition-colors duration-200",
          currentTheme === "dark" ? "text-emerald-400" : "text-muted-foreground/50 hover:text-foreground"
        )}
        title="Dark Mode"
      >
        <Moon className="w-4 h-4" />
      </button>

      {/* Cool Dark Toggle */}
      <button
        onClick={() => setTheme("cool-dark")}
        className={cn(
          "relative z-10 w-[30px] h-[28px] rounded-full flex items-center justify-center transition-colors duration-200",
          currentTheme === "cool-dark" ? "text-purple-400" : "text-muted-foreground/50 hover:text-foreground"
        )}
        title="Cool Dark Mode"
      >
        <Sparkles className="w-4 h-4" />
      </button>
    </div>
  );
};
