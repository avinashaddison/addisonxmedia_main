import { Tables } from "@/integrations/supabase/types";

export type Contact = Tables<"contacts">;
export type Conversation = Tables<"conversations">;
export type Message = Tables<"messages">;

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
