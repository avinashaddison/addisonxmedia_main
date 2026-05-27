import { cn } from "@/lib/utils";
import { useState } from "react";

type LogoProps = {
  className?: string;
  /** Height in px for the full lockup */
  size?: number;
  /** Show the wordmark next to the icon */
  withWordmark?: boolean;
  /** Show "From Local to Viral" tagline below the wordmark */
  withTagline?: boolean;
};

/* Brand palette */
const BRAND_RED = "#E91E1E";
const BRAND_RED_DEEP = "#B71414";
const BRAND_INK = "#0D0D0D";

/* Aspect ratio of the source logo image (1280 × 325 ≈ 3.94:1) */
const LOGO_ASPECT = 1280 / 325;

/**
 * AddisonX Media brand logo.
 *
 *   PRIMARY:   <img src="/logo.png">         — the real artwork
 *   FALLBACK:  inline SVG mark + wordmark    — shown only if /logo.png is missing
 *
 * To use the real artwork:
 *   save your image to →   c:\Users\user\revenue-engine-x\public\logo.png
 *
 * (For a square mark in the collapsed sidebar, also drop a square crop at
 *  c:\Users\user\revenue-engine-x\public\logo-mark.png)
 */

/* ─────────── Square FX mark — used in collapsed sidebar ─────────── */
export const AddisonMark = ({ className, size = 40 }: { className?: string; size?: number }) => {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center rounded-2xl overflow-hidden bg-white border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968]",
        className
      )}
      style={{ width: size, height: size }}
      aria-label="AddisonX"
    >
      {!imgFailed && (
        <img
          src="/logo-mark.png"
          alt=""
          className="w-full h-full object-contain p-1"
          draggable={false}
          onError={() => setImgFailed(true)}
        />
      )}
      {imgFailed && (
        <svg viewBox="0 0 100 100" width={size * 0.78} height={size * 0.78} aria-hidden>
          <defs>
            <linearGradient id="ax-red-mark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND_RED} />
              <stop offset="100%" stopColor={BRAND_RED_DEEP} />
            </linearGradient>
          </defs>
          <FXGlyph color="url(#ax-red-mark)" />
        </svg>
      )}
      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#16C172] ring-2 ring-white animate-pulse" />
    </span>
  );
};

/* ─────────── Full horizontal lockup ─────────── */
export const AddisonLogo = ({
  className,
  size = 40,
  withWordmark = true,
  withTagline = true,
}: LogoProps) => {
  const [imgFailed, setImgFailed] = useState(false);

  // When the real image is shown, calculate width from aspect ratio.
  const imgHeight = size * 1.6; // a bit taller than `size` since real image has padding
  const imgWidth = imgHeight * LOGO_ASPECT;

  if (!imgFailed) {
    return (
      <div className={cn("flex items-center min-w-0 select-none group", className)}>
        <img
          src="/logo.png"
          alt="AddisonX Media · From Local to Viral"
          style={{
            height: imgHeight,
            width: "auto",
            maxWidth: imgWidth,
            mixBlendMode: "multiply", // knocks out the white background so it blends with the page
          }}
          className="block object-contain transition-transform duration-300 group-hover:scale-[1.03]"
          draggable={false}
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  // Fallback rendering — only shown if /logo.png 404s
  return (
    <div className={cn("flex items-center min-w-0 select-none", className)} aria-label="AddisonX Media · From Local to Viral">
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden className="flex-shrink-0">
        <defs>
          <linearGradient id="ax-red-full" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND_RED} />
            <stop offset="100%" stopColor={BRAND_RED_DEEP} />
          </linearGradient>
        </defs>
        <FXGlyph color="url(#ax-red-full)" />
      </svg>
      {withWordmark && (
        <>
          <span className="bg-foreground/25 flex-shrink-0 mx-2.5" style={{ width: 2, height: size * 0.85 }} aria-hidden />
          <div className="flex flex-col leading-none min-w-0" style={{ gap: size * 0.08 }}>
            <div className="font-black tracking-tight whitespace-nowrap text-foreground" style={{ fontSize: size * 0.46, lineHeight: 1 }}>
              AddisonX
            </div>
            <div className="font-black tracking-tight whitespace-nowrap text-foreground" style={{ fontSize: size * 0.46, lineHeight: 1 }}>
              Media<span style={{ color: BRAND_RED }}>.</span>Com
            </div>
            {withTagline && (
              <div className="flex items-center gap-1.5 mt-0.5" style={{ fontSize: size * 0.2 }} aria-hidden>
                <span className="block flex-shrink-0" style={{ width: size * 0.2, height: 1.5, background: BRAND_RED }} />
                <span className="font-bold italic tracking-tight whitespace-nowrap text-foreground">
                  From Local to <span style={{ color: BRAND_RED }}>Viral</span>
                </span>
                <span style={{ fontSize: size * 0.22, lineHeight: 1 }} aria-hidden>🚀</span>
                <span className="block flex-shrink-0" style={{ width: size * 0.2, height: 1.5, background: BRAND_RED }} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/* ─────────── India flag SVG (renders on every OS — works around Windows
   not having color regional flag glyphs in Segoe UI Emoji) ─────────── */
const IndiaFlag = ({ className }: { className?: string }) => {
  // 24 evenly-spaced spokes for an accurate Ashoka Chakra
  const spokes = Array.from({ length: 24 }, (_, i) => (i * 360) / 24);
  return (
    <svg
      viewBox="0 0 36 24"
      width="20"
      height="14"
      aria-hidden
      className={className}
      style={{ verticalAlign: "-3px", overflow: "visible" }}
    >
      <defs>
        <clipPath id="flagClip">
          <rect x="0" y="0" width="36" height="24" rx="3.5" ry="3.5" />
        </clipPath>
        <filter id="flagShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="0.5" stdDeviation="0.4" floodOpacity="0.35" />
        </filter>
      </defs>
      <g clipPath="url(#flagClip)" filter="url(#flagShadow)">
        {/* Saffron · White · Green tricolor — official Indian flag colors */}
        <rect x="0" y="0" width="36" height="8" fill="#FF9933" />
        <rect x="0" y="8" width="36" height="8" fill="#FFFFFF" />
        <rect x="0" y="16" width="36" height="8" fill="#138808" />

        {/* Ashoka Chakra centred in the white band */}
        <g transform="translate(18 12)">
          {/* Outer ring */}
          <circle r="3.2" fill="none" stroke="#000080" strokeWidth="0.55" />
          {/* 24 spokes */}
          {spokes.map((angle) => (
            <line
              key={angle}
              x1="0"
              y1="0"
              x2="0"
              y2="-3.0"
              stroke="#000080"
              strokeWidth="0.35"
              strokeLinecap="round"
              transform={`rotate(${angle})`}
            />
          ))}
          {/* Centre hub */}
          <circle r="0.55" fill="#000080" />
        </g>
      </g>
      {/* Hairline border to lift flag off any background */}
      <rect x="0" y="0" width="36" height="24" rx="3.5" ry="3.5" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="0.5" />
    </svg>
  );
};

/* ─────────── FX glyph fallback ─────────── */
const FXGlyph = ({ color }: { color: string }) => (
  <g fill={color}>
    <path d="M 12 16 L 12 84 L 26 84 L 26 56 L 50 56 L 50 44 L 26 44 L 26 28 L 56 28 L 56 16 Z" />
    <path d="M 44 32 L 56 32 L 70 50 L 84 32 L 96 32 L 76 58 L 96 84 L 84 84 L 70 66 L 56 84 L 44 84 L 64 58 Z" />
    <circle cx="91" cy="84" r="4.5" />
  </g>
);

/* ─────────── BrandLockup — the styled pill + "Made in भारत" badge ─────────── */

type LockupProps = {
  /** Height (px) of the inner AddisonLogo */
  size?: number;
  /** Show the "Made in भारत" floating sticker below the pill */
  withBadge?: boolean;
  /** Use the dark-mode color scheme (yellow text on emerald badge) */
  dark?: boolean;
  className?: string;
};

/**
 * The full poster-style header lockup:
 *   creamy gradient pill · thick saffron border · 3D shadow · pulsing dot
 *   + an optional "Made in भारत" sticker badge underneath
 *
 * Use this in every public-page header (landing, auth, legal, password flow).
 */
export const BrandLockup = ({ size = 40, withBadge = true, dark = false, className }: LockupProps) => (
  <span className={cn("relative inline-flex items-center group", className)} aria-label="Addison X Media">
    <span className="relative inline-flex items-center px-2.5 py-1 rounded-2xl bg-gradient-to-br from-white via-[#FFF6E8] to-[#FFF1D6] border-2 border-[#FFD23F] shadow-[0_4px_0_0_#E8B400] group-hover:shadow-[0_2px_0_0_#E8B400] group-hover:translate-y-[2px] transition-all">
      <AddisonLogo size={size} />
      <span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-[#FF6A1F] ring-2 ring-[#FFD23F] animate-pulse" />
    </span>
    {withBadge && (
      <span
        className={cn(
          "absolute -bottom-3.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-[0.18em] border whitespace-nowrap shadow-md",
          dark
            ? "bg-[#0A3D24] text-[#FFD23F] border-[#FFD23F]/40"
            : "bg-[#FFD23F] text-[#7A1500] border-[#7A1500]/30"
        )}
      >
        Made in भारत <IndiaFlag className="ml-1 inline-block" />
      </span>
    )}
  </span>
);

export default AddisonLogo;
