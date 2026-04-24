import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Flame, X } from "lucide-react";

export const StickyTrialBar = ({ ctaHref }: { ctaHref: string }) => {
  const [visible, setVisible] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (closed || !visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-2xl animate-slide-up">
      <div className="rounded-2xl bg-foreground text-background shadow-2xl shadow-foreground/30 flex items-center gap-3 pl-4 pr-2 py-2 border border-foreground/10">
        <span className="relative flex w-7 h-7 rounded-full bg-hot/20 items-center justify-center flex-shrink-0">
          <span className="absolute inset-0 rounded-full bg-hot/30 animate-ping" />
          <Flame className="relative w-3.5 h-3.5 text-hot fill-hot" />
        </span>
        <p className="text-[13px] font-semibold flex-1 min-w-0">
          <span className="hidden sm:inline">Every missed reply = lost revenue. </span>
          <span>Start free → close your first deal today.</span>
        </p>
        <Link
          to={ctaHref}
          className="bg-primary hover:bg-primary-glow text-primary-foreground text-[12px] font-bold rounded-xl px-3.5 py-2 flex items-center gap-1.5 shadow-md shadow-primary/40 hover:scale-[1.03] transition-all whitespace-nowrap"
        >
          Start free
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <button
          onClick={() => setClosed(true)}
          className="w-7 h-7 rounded-lg hover:bg-background/10 flex items-center justify-center text-background/60 hover:text-background transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
