import type { Contact, Conversation, Message } from "@/lib/api-types";
export type { Contact, Conversation, Message };

// Conversation joined with its contact (used by the inbox list & lead panel)
export type ConversationWithContact = Conversation & {
  contact: Contact;
};

export const tagLabel: Record<Contact["tag"], { label: string; emoji: string }> = {
  hot: { label: "Hot", emoji: "🔥" },
  warm: { label: "Warm", emoji: "🟡" },
  cold: { label: "Cold", emoji: "❄️" },
};

// Initials helper used in avatars
export const initialsFor = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "?";

// Friendly "5m ago" / "Just now"
export const formatRelative = (iso: string | null | undefined) => {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 30) return "Just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

// HH:MM AM/PM in local time, used in chat bubbles
export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });

// URL regex covers http(s) + www. — anchored on word boundaries so
// punctuation following a URL doesn't end up swallowed into the link.
const URL_RE = /\b((?:https?:\/\/|www\.)[^\s<>"']+[^\s<>"',.;:!?)\]])/gi;

/**
 * Split a string into alternating text + URL segments. Lets us render
 * URL fragments as <a> tags inside an otherwise-plain message body without
 * dangerouslySetInnerHTML (and without trusting any HTML in the message).
 */
export type TextSegment = { kind: "text"; value: string } | { kind: "link"; href: string; label: string };

export const splitTextWithLinks = (body: string): TextSegment[] => {
  if (!body) return [];
  const segments: TextSegment[] = [];
  let last = 0;
  for (const m of body.matchAll(URL_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) segments.push({ kind: "text", value: body.slice(last, idx) });
    const matched = m[1];
    const href = matched.startsWith("www.") ? `https://${matched}` : matched;
    segments.push({ kind: "link", href, label: matched });
    last = idx + matched.length;
  }
  if (last < body.length) segments.push({ kind: "text", value: body.slice(last) });
  return segments;
};

/** DiceBear-based avatar URL. Deterministic per contact (phone) so the same
 *  contact always gets the same avatar across sessions. Note: Meta's webhook
 *  payload doesn't expose WhatsApp profile pictures, so this is the next-best
 *  thing — colorful initials avatars instead of plain text-on-color circles. */
export const avatarUrlFor = (seed: string, name: string): string => {
  const trimmed = (name ?? "").trim() || "?";
  return `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(seed || trimmed)}&backgroundType=gradientLinear&fontWeight=700&fontSize=42`;
};
