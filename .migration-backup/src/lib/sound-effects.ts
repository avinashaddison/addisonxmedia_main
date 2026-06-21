/**
 * Web Audio API sound effects for UI interactions — no audio files shipped.
 *
 * Each `play*` function synthesizes a short tone or sequence via oscillators
 * + gain envelopes. Keeps the bundle small and lets us tune sounds in code.
 *
 * AudioContext is lazy-init on first user gesture (browsers block autoplay
 * until the user interacts with the page), so callers must:
 *   1. Hold the ref via `useAudioContext()`
 *   2. Pass `ctx.current` into a `play*` function
 * The hook handles the click/keydown listener + resume-on-suspended logic.
 */

import { useEffect, useRef } from "react";

// ── Lazy AudioContext hook ─────────────────────────────────────────────────
export const useAudioContext = () => {
  const ref = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (ref.current) return;
    const init = () => {
      if (ref.current) return;
      try {
        const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
        ref.current = new Ctx();
      } catch {
        // Browser doesn't support Web Audio — degrade silently.
      }
    };
    window.addEventListener("click", init, { once: true });
    window.addEventListener("keydown", init, { once: true });
    return () => {
      window.removeEventListener("click", init);
      window.removeEventListener("keydown", init);
    };
  }, []);

  return ref;
};

const ensureRunning = (ctx: AudioContext): Promise<void> => {
  if (ctx.state === "suspended") return ctx.resume();
  return Promise.resolve();
};

// ── Drop sound ─────────────────────────────────────────────────────────────
// Satisfying "thunk" — descending pair of notes with a click-y transient.
// Plays when a deal card is dropped into any non-special column.
export const playDrop = (ctx: AudioContext) => {
  void ensureRunning(ctx).then(() => {
    const now = ctx.currentTime;
    // Low transient click
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = "square";
    click.frequency.setValueAtTime(180, now);
    click.frequency.exponentialRampToValueAtTime(80, now + 0.06);
    clickGain.gain.setValueAtTime(0.0001, now);
    clickGain.gain.exponentialRampToValueAtTime(0.22, now + 0.005);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    click.connect(clickGain).connect(ctx.destination);
    click.start(now);
    click.stop(now + 0.1);

    // Confirming bell tone over the click
    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.type = "sine";
    bell.frequency.setValueAtTime(660, now + 0.02);
    bell.frequency.exponentialRampToValueAtTime(880, now + 0.08);
    bellGain.gain.setValueAtTime(0.0001, now + 0.02);
    bellGain.gain.exponentialRampToValueAtTime(0.16, now + 0.04);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    bell.connect(bellGain).connect(ctx.destination);
    bell.start(now + 0.02);
    bell.stop(now + 0.2);
  });
};

// ── Won sound ──────────────────────────────────────────────────────────────
// Ascending cash-register-ish arpeggio with a sparkle. Plays on drop into Won.
export const playWon = (ctx: AudioContext) => {
  void ensureRunning(ctx).then(() => {
    const now = ctx.currentTime;
    // Major arpeggio: C5 → E5 → G5 → C6
    const notes = [
      { freq: 523.25, start: 0.00 },
      { freq: 659.25, start: 0.07 },
      { freq: 783.99, start: 0.14 },
      { freq: 1046.5, start: 0.22 },
    ];
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = n.freq;
      gain.gain.setValueAtTime(0.0001, now + n.start);
      gain.gain.exponentialRampToValueAtTime(0.2, now + n.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.start + 0.32);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + n.start);
      osc.stop(now + n.start + 0.35);
    }
    // Sparkle: high sine that decays fast — adds the "ka-ching" feel
    const sparkle = ctx.createOscillator();
    const sparkleGain = ctx.createGain();
    sparkle.type = "sine";
    sparkle.frequency.setValueAtTime(2093, now + 0.22);
    sparkle.frequency.exponentialRampToValueAtTime(3136, now + 0.5);
    sparkleGain.gain.setValueAtTime(0.0001, now + 0.22);
    sparkleGain.gain.exponentialRampToValueAtTime(0.08, now + 0.26);
    sparkleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    sparkle.connect(sparkleGain).connect(ctx.destination);
    sparkle.start(now + 0.22);
    sparkle.stop(now + 0.65);
  });
};

// ── Lost sound ─────────────────────────────────────────────────────────────
// Soft descending two-tone — acknowledges the action without making the user
// feel bad about marking a deal lost. Lower volume than the others.
export const playLost = (ctx: AudioContext) => {
  void ensureRunning(ctx).then(() => {
    const now = ctx.currentTime;
    const notes = [
      { freq: 392.00, start: 0.00, dur: 0.18 }, // G4
      { freq: 293.66, start: 0.12, dur: 0.28 }, // D4
    ];
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = n.freq;
      gain.gain.setValueAtTime(0.0001, now + n.start);
      gain.gain.exponentialRampToValueAtTime(0.1, now + n.start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + n.start);
      osc.stop(now + n.start + n.dur + 0.05);
    }
  });
};
