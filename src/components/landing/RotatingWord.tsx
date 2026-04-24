import { useEffect, useState } from "react";

export const RotatingWord = ({ words, intervalMs = 2200 }: { words: string[]; intervalMs?: number }) => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % words.length), intervalMs);
    return () => clearInterval(t);
  }, [words.length, intervalMs]);

  return (
    <span className="relative inline-block align-baseline">
      {/* sizing ghost — keeps width stable at the widest word */}
      <span className="invisible block whitespace-nowrap">
        {words.reduce((a, b) => (b.length > a.length ? b : a), "")}
      </span>
      {words.map((w, i) => (
        <span
          key={w}
          className={`absolute inset-0 bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent transition-all duration-500 ease-out ${
            i === idx ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-3 blur-sm pointer-events-none"
          }`}
          style={{ backgroundSize: "200% 100%", animation: i === idx ? "aurora 6s ease-in-out infinite" : undefined }}
        >
          {w}
        </span>
      ))}
    </span>
  );
};
