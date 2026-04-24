import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: number;
  /** show full wordmark "AddisonX Media" */
  withWordmark?: boolean;
  /** show the small "Sales Engine" tagline */
  withTagline?: boolean;
  /** white/inverted mode for dark backgrounds */
  inverted?: boolean;
};

/**
 * AddisonX Media — premium brand mark.
 * Concept: a chat bubble fused with an upward-trending spark "X",
 * wrapped in a soft conic-gradient orbit ring.
 *
 * Built to feel like Stripe / Linear / Intercom — modern, confident, alive.
 */
export const AddisonXMark = ({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) => {
  return (
    <span
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Outer glow */}
      <span
        className="absolute inset-0 rounded-[28%] blur-md opacity-60"
        style={{
          background:
            "conic-gradient(from 140deg at 50% 50%, hsl(var(--primary)) 0deg, hsl(var(--accent)) 120deg, hsl(var(--primary-glow)) 240deg, hsl(var(--primary)) 360deg)",
        }}
      />

      {/* Mark body */}
      <span
        className="relative inline-flex items-center justify-center rounded-[28%] overflow-hidden ring-1 ring-primary-foreground/15 shadow-xl shadow-primary/30"
        style={{
          width: size,
          height: size,
          background:
            "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-glow)) 55%, hsl(var(--accent)) 100%)",
        }}
      >
        {/* inner highlights */}
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_28%_22%,hsl(var(--primary-foreground)/0.35),transparent_55%)]" />
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_80%_85%,hsl(var(--accent)/0.45),transparent_60%)]" />

        <svg
          viewBox="0 0 40 40"
          width={size * 0.66}
          height={size * 0.66}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
        >
          {/* Chat bubble silhouette */}
          <path
            d="M7 12.5C7 9.46243 9.46243 7 12.5 7H27.5C30.5376 7 33 9.46243 33 12.5V22.5C33 25.5376 30.5376 28 27.5 28H18.5L13.6 31.6C13 32.04 12.2 31.62 12.2 30.88V28C9.43 27.7 7 25.68 7 22.5V12.5Z"
            fill="hsl(var(--primary-foreground))"
            fillOpacity="0.97"
          />
          {/* "X" spark — two overlapping arrow strokes signalling growth + AI */}
          <path
            d="M13.5 22 L20 15.5 L23.5 19 L28 14"
            stroke="hsl(var(--primary))"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M25 14 H28 V17"
            stroke="hsl(var(--primary))"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* tiny spark dot */}
          <circle cx="14" cy="14.5" r="1.2" fill="hsl(var(--accent))" />
        </svg>

        {/* shine sweep */}
        <span className="pointer-events-none absolute -inset-y-2 -left-1/3 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-primary-foreground/25 to-transparent animate-[shine_3.5s_ease-in-out_infinite]" />
      </span>

      {/* Online pulse dot */}
      <span className="absolute -bottom-0.5 -right-0.5 z-10">
        <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-60" />
        <span className="relative block w-2.5 h-2.5 rounded-full bg-success ring-2 ring-background" />
      </span>
    </span>
  );
};

export const AddisonXLogo = ({
  className,
  size = 40,
  withWordmark = true,
  withTagline = false,
  inverted = false,
}: Props) => {
  return (
    <div className={cn("flex items-center gap-2.5 min-w-0 group", className)}>
      <AddisonXMark size={size} className="transition-transform duration-300 group-hover:scale-[1.06] group-hover:rotate-[-3deg]" />
      {withWordmark && (
        <div className="leading-none min-w-0">
          <p
            className={cn(
              "font-extrabold tracking-tight text-[16px] flex items-baseline gap-1 whitespace-nowrap",
              inverted ? "text-background" : "text-foreground"
            )}
          >
            <span>Addison</span>
            <span className="bg-gradient-to-br from-primary via-primary-glow to-accent bg-clip-text text-transparent">
              X
            </span>
            <span className={cn("font-semibold text-[13px]", inverted ? "text-background/75" : "text-foreground/70")}>
              Media
            </span>
          </p>
          {withTagline && (
            <p className={cn("mt-1 text-[9px] font-bold uppercase tracking-[0.22em]", inverted ? "text-background/60" : "text-muted-foreground")}>
              Sales Engine
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default AddisonXLogo;
