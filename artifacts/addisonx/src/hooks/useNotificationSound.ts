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

/**
 * Synthesize an attention-grabbing 3-tone chime via Web Audio API.
 *
 * Tones: G5 → C6 → E6, sine wave, gain ~0.55. Punchier than the old soft
 * two-tone "ding" — designed to cut through a workday and be heard even when
 * the tab isn't focused (browsers allow continued playback if the AudioContext
 * was unlocked by a prior user gesture).
 */
const playDing = (ctx: AudioContext) => {
  const now = ctx.currentTime;
  const notes = [
    { freq: 783.99, start: 0.00, dur: 0.22, peak: 0.55 }, // G5
    { freq: 1046.5, start: 0.14, dur: 0.26, peak: 0.55 }, // C6
    { freq: 1318.5, start: 0.32, dur: 0.34, peak: 0.45 }, // E6
  ];
  for (const n of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = n.freq;
    gain.gain.setValueAtTime(0.0001, now + n.start);
    gain.gain.exponentialRampToValueAtTime(n.peak, now + n.start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + n.start);
    osc.stop(now + n.start + n.dur + 0.02);
  }
};

/** Request OS notification permission opportunistically on first user gesture.
 *  We don't prompt at page-load because Chrome quietly punishes that. */
const requestNotificationPermission = () => {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
};

/** Best-effort OS notification — only fires when the tab isn't focused, so
 *  we don't double-notify an already-watching user. */
const fireOsNotification = (title: string, body: string) => {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (!document.hidden && document.hasFocus()) return; // user is here, no need
  try {
    const n = new Notification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: "addisonx-inbox",  // collapse multiple unread into one banner
      renotify: true,
    } as NotificationOptions & { renotify?: boolean });
    // Tapping the notification brings AddisonX to front + opens inbox
    n.onclick = () => {
      window.focus();
      if (window.location.pathname !== "/app/inbox") {
        window.location.assign("/app/inbox");
      }
      n.close();
    };
    setTimeout(() => n.close(), 8000);
  } catch {
    // Some browsers throw if service-worker registration is missing; ignore.
  }
};

/**
 * Plays a notification chime + fires an OS notification when the total unread
 * count across conversations increases — i.e. a new inbound message arrived
 * in any chat.
 *
 * Works across pages because this hook is mounted at the app-shell level
 * (src/pages/Index.tsx). Works even when the browser tab is hidden, as long
 * as the AudioContext was unlocked by an earlier click/keydown.
 *
 * Returns nothing — call useMuteState() separately to render a mute toggle.
 */
export const useNotificationSound = (conversations: ConversationWithContact[]) => {
  const [muted] = useMuteState();

  // Track the previous unread total. `null` means "haven't seen any data yet"
  // so the first load doesn't trigger a ding for existing unreads.
  const prevTotalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Lazy-init AudioContext on first user gesture (browsers block autoplay).
  // We listen once for any click/keydown anywhere, then create + resume.
  // We also opportunistically ask for OS notification permission on the same
  // gesture — bundling both into the user's first click avoids two separate
  // permission prompts later.
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
      requestNotificationPermission();
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

    // Find the conversation whose unread just incremented — used for the OS
    // notification's body text. Falls back to a generic preview.
    const justArrived = conversations.find((c) => (c.unread_count || 0) > 0);
    const senderName = justArrived?.contact?.name ?? "New message";
    const preview = (justArrived?.last_message_preview ?? "").slice(0, 140) || "Tap to open inbox";

    // Play chime — works whether tab is visible or hidden, as long as the
    // AudioContext was unlocked previously.
    const ctx = audioCtxRef.current;
    if (ctx) {
      if (ctx.state === "suspended") {
        ctx.resume().then(() => playDing(ctx)).catch(() => {});
      } else {
        playDing(ctx);
      }
    }

    // OS-level notification when the tab isn't focused — this is the part
    // that actually reaches the user when they're on another tab/app.
    fireOsNotification(`💬 ${senderName}`, preview);
  }, [conversations, muted]);
};
