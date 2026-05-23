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

// Schemes-other-than-http we want to STRIP from displayed message text. The
// UPI route used to include the raw `upi://pay?...` link inline alongside the
// QR image — older messages in the DB still have it, and it renders as ugly
// URL-encoded gibberish in the chat. The QR itself is the better UX so we
// hide the raw deep link at render time.
const NON_HTTP_DEEPLINK_RE = /\b(upi|tel|mailto|sms):\/?\/?[^\s]+/gi;

/**
 * Split a string into alternating text + URL segments. Lets us render
 * URL fragments as <a> tags inside an otherwise-plain message body without
 * dangerouslySetInnerHTML (and without trusting any HTML in the message).
 */
export type TextSegment = { kind: "text"; value: string } | { kind: "link"; href: string; label: string };

export const splitTextWithLinks = (body: string): TextSegment[] => {
  if (!body) return [];
  // Strip non-HTTP deep-link URLs before splitting — they'd otherwise show
  // as raw ugly URL-encoded text. Collapses any whitespace runs left behind.
  const cleaned = body.replace(NON_HTTP_DEEPLINK_RE, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  const segments: TextSegment[] = [];
  let last = 0;
  for (const m of cleaned.matchAll(URL_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) segments.push({ kind: "text", value: cleaned.slice(last, idx) });
    const matched = m[1];
    const href = matched.startsWith("www.") ? `https://${matched}` : matched;
    segments.push({ kind: "link", href, label: matched });
    last = idx + matched.length;
  }
  if (last < cleaned.length) segments.push({ kind: "text", value: cleaned.slice(last) });
  return segments;
};

/**
 * WhatsApp-style inline formatting inside a single text segment.
 *
 *   *bold*  → <strong>bold</strong>
 *   _italic_ → <em>italic</em>
 *   ~strike~ → <s>strike</s>
 *   `code`  → <code>code</code>
 *
 * Returns an array of small tokens that the chat bubble can render — we keep
 * the transformation lightweight (no full markdown parser) because chats are
 * short strings and we don't need block-level features (lists, headings, etc).
 */
export type FormattedToken =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "italic"; value: string }
  | { kind: "strike"; value: string }
  | { kind: "code"; value: string };

// Match patterns where the wrapper char isn't preceded/followed by alphanumeric
// (so prices like `*₹500*` work but `5*4*3` math doesn't). Each regex captures
// the inner content. Order matters: backticks first (code is literal, no nested
// formatting).
const FORMAT_PATTERNS: Array<{ re: RegExp; kind: FormattedToken["kind"] }> = [
  { re: /`([^`\n]+)`/g,           kind: "code" },
  { re: /(?<![\w*])\*([^*\n]+)\*(?![\w*])/g, kind: "bold" },
  { re: /(?<![\w_])_([^_\n]+)_(?![\w_])/g,   kind: "italic" },
  { re: /(?<![\w~])~([^~\n]+)~(?![\w~])/g,   kind: "strike" },
];

export const tokenizeWhatsAppFormatting = (text: string): FormattedToken[] => {
  if (!text) return [];
  // Find all matches across all patterns, sorted by start position
  type Match = { start: number; end: number; kind: FormattedToken["kind"]; inner: string };
  const matches: Match[] = [];
  for (const { re, kind } of FORMAT_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      matches.push({ start: m.index, end: m.index + m[0].length, kind, inner: m[1] });
    }
  }
  matches.sort((a, b) => a.start - b.start);

  // Greedy non-overlapping selection
  const selected: Match[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start < cursor) continue;
    selected.push(m);
    cursor = m.end;
  }

  const tokens: FormattedToken[] = [];
  let pos = 0;
  for (const m of selected) {
    if (m.start > pos) tokens.push({ kind: "text", value: text.slice(pos, m.start) });
    tokens.push({ kind: m.kind, value: m.inner });
    pos = m.end;
  }
  if (pos < text.length) tokens.push({ kind: "text", value: text.slice(pos) });
  return tokens;
};

/** DiceBear-based avatar URL. Deterministic per contact (phone) so the same
 *  contact always gets the same avatar across sessions. Note: Meta's webhook
 *  payload doesn't expose WhatsApp profile pictures, so this is the next-best
 *  thing — colorful initials avatars instead of plain text-on-color circles. */
export const avatarUrlFor = (seed: string, name: string): string => {
  const trimmed = (name ?? "").trim() || "?";
  return `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(seed || trimmed)}&backgroundType=gradientLinear&fontWeight=700&fontSize=42`;
};
