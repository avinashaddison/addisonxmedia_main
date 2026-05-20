import { useEffect, useRef, useState } from "react";
import type { ConversationWithContact } from "@/lib/inbox-types";

const MUTE_KEY = "addisonx-inbox-muted";
const MUTE_EVENT = "addisonx-inbox-mute-change";

const readMuted = () =>
  typeof window !== "undefined" && window.localStorage.getItem(MUTE_KEY) === "1";

/**
 * Subscribe to the inbox mute flag across the whole app.
 * Returns `[muted, toggle]`. Toggling from any component updates every other
 * subscriber via a custom event (localStorage `storage` events only fire
 * cross-tab, not within the same tab — hence the manual dispatch).
 */
export const useMuteState = () => {
  const [muted, setMuted] = useState<boolean>(readMuted);

  useEffect(() => {
    const sync = () => setMuted(readMuted());
    const onStorage = (e: StorageEvent) => {
      if (e.key === MUTE_KEY) sync();
    };
    window.addEventListener(MUTE_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(MUTE_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const toggle = () => {
    const next = !readMuted();
    window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
    window.dispatchEvent(new Event(MUTE_EVENT));
  };

  return [muted, toggle] as const;
};

// Synthesize a soft two-tone "ding" via Web Audio API so we don't ship a binary.
// G5 → C6, sine wave, ~250ms fade. Plays at ~0.18 gain so it's noticeable but
// not jarring during a workday.
const playDing = (ctx: AudioContext) => {
  const now = ctx.currentTime;
  const notes = [
    { freq: 783.99, start: 0,    dur: 0.18 }, // G5
    { freq: 1046.5, start: 0.10, dur: 0.22 }, // C6
  ];
  for (const n of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = n.freq;
    gain.gain.setValueAtTime(0.0001, now + n.start);
    gain.gain.exponentialRampToValueAtTime(0.18, now + n.start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + n.start);
    osc.stop(now + n.start + n.dur + 0.02);
  }
};

/**
 * Plays a notification chime when the total unread count across conversations
 * increases — i.e. a new inbound message arrived in any chat (active or not).
 *
 * Returns `[muted, toggle]` so callers can render a mute button.
 *
 * Why total-unread instead of per-conversation diff: simpler + matches what
 * users actually care about (something new came in). The 5s conversation poll
 * already drives this; no extra fetching needed.
 */
export const useNotificationSound = (conversations: ConversationWithContact[]) => {
  const [muted] = useMuteState();

  // Track the previous unread total. `null` means "haven't seen any data yet"
  // so the first load doesn't trigger a ding for existing unreads.
  const prevTotalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Lazy-init AudioContext on first user gesture (browsers block autoplay).
  // We listen once for any click/keydown anywhere, then create + resume.
  useEffect(() => {
    if (audioCtxRef.current) return;
    const init = () => {
      if (audioCtxRef.current) return;
      try {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
        audioCtxRef.current = new Ctx();
      } catch {
        // Browser doesn't support Web Audio — silently skip.
      }
    };
    window.addEventListener("click", init, { once: true });
    window.addEventListener("keydown", init, { once: true });
    return () => {
      window.removeEventListener("click", init);
      window.removeEventListener("keydown", init);
    };
  }, []);

  useEffect(() => {
    const total = conversations.reduce((a, c) => a + (c.unread_count || 0), 0);
    const prev = prevTotalRef.current;
    prevTotalRef.current = total;

    if (prev === null) return; // first run — don't ding on existing state
    if (total <= prev) return;
    if (muted) return;
    if (document.hidden) {
      // Tab hidden — most browsers throttle audio anyway, but the polling
      // also pauses (refetchIntervalInBackground:false), so this is mostly
      // defensive.
      return;
    }

    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().then(() => playDing(ctx)).catch(() => {});
    } else {
      playDing(ctx);
    }
  }, [conversations, muted]);
};
