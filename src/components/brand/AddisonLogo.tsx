import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  /** Size in px for the icon mark */
  size?: number;
  /** Show the wordmark next to the icon */
  withWordmark?: boolean;
  /** Show "Sales Engine" tagline below the wordmark */
  withTagline?: boolean;
};

/**
 * AddisonX brand mark.
 * Concept: a chat bubble fused with an upward growth arrow + an "X" spark —
 * conversations that close deals.
 */
export const AddisonMark = ({ className, size = 40 }: { className?: string; size?: number }) => (
  <span
    className={cn(
      "relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-glow shadow-lg shadow-primary/30 ring-1 ring-primary-foreground/10 overflow-hidden",
      className
    )}
    style={{ width: size, height: size }}
    aria-hidden
  >
    {/* Inner glow */}
    <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary-foreground)/0.25),transparent_60%)]" />

    <svg
      viewBox="0 0 32 32"
      width={size * 0.62}
      height={size * 0.62}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="relative drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
    >
      {/* Chat bubble */}
      <path
        d="M5 10.5C5 7.46243 7.46243 5 10.5 5H21.5C24.5376 5 27 7.46243 27 10.5V18.5C27 21.5376 24.5376 24 21.5 24H14.2L9.6 27.4C9.0 27.84 8.2 27.42 8.2 26.68V24C6.43 23.7 5 22.18 5 20.3V10.5Z"
        fill="hsl(var(--primary-foreground))"
        fillOpacity="0.96"
      />
      {/* Growth arrow / X spark inside bubble */}
      <path
        d="M11.5 18L15 14.5L17.5 17L21 13.5"
        stroke="hsl(var(--primary))"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 13.5H21V16"
        stroke="hsl(var(--primary))"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>

    {/* Online dot */}
    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success ring-2 ring-card animate-pulse" />
  </span>
);

export const AddisonLogo = ({
  className,
  size = 40,
  withWordmark = true,
  withTagline = true,
}: LogoProps) => {
  return (
    <div className={cn("flex items-center gap-2.5 min-w-0", className)}>
      <AddisonMark size={size} />
      {withWordmark && (
        <div className="flex-1 min-w-0 leading-none">
          <p className="font-extrabold tracking-tight text-[15px] truncate">
            <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
              Addison
            </span>
            <span className="bg-gradient-to-br from-primary to-primary-glow bg-clip-text text-transparent">
              X
            </span>
            <span className="text-foreground/80 font-semibold text-[13px] ml-1">Media</span>
          </p>
          {withTagline && (
            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Sales Engine
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default AddisonLogo;
