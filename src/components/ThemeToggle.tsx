import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

type Props = {
  collapsed?: boolean;
};

export const ThemeToggle = ({ collapsed = false }: Props) => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const toggle = () => setTheme(isDark ? "light" : "dark");

  if (collapsed) {
    return (
      <button
        onClick={toggle}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className="mx-auto w-9 h-9 rounded-xl bg-muted hover:bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all group relative"
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-foreground text-background text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 shadow-lg">
          {isDark ? "Light mode" : "Dark mode"}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="w-full h-10 rounded-xl bg-muted/60 hover:bg-muted border border-border flex items-center gap-1 p-1 transition-all relative"
      aria-label="Toggle theme"
    >
      <span
        className={cn(
          "absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-card shadow-sm border border-border transition-all duration-300 ease-out",
          isDark ? "left-[calc(50%+0px)]" : "left-1"
        )}
      />
      <span
        className={cn(
          "relative z-10 flex-1 h-full flex items-center justify-center gap-1.5 text-[11px] font-semibold transition-colors",
          !isDark ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <Sun className="w-3.5 h-3.5" />
        Light
      </span>
      <span
        className={cn(
          "relative z-10 flex-1 h-full flex items-center justify-center gap-1.5 text-[11px] font-semibold transition-colors",
          isDark ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <Moon className="w-3.5 h-3.5" />
        Dark
      </span>
    </button>
  );
};
