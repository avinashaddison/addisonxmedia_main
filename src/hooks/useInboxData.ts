import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { ConversationWithContact, Message } from "@/lib/inbox-types";
import { toast } from "sonner";

// =====================
// CONVERSATIONS — polls every 2.5s, keeps polling when tab hidden so the
// notification ding + OS notification still fire while user is on another
// tab. Snappy on focus return.
// =====================
export const useConversations = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: () => api.listConversations() as Promise<ConversationWithContact[]>,
    refetchInterval: 2_500,
    refetchIntervalInBackground: true,  // keep polling for sound + OS notifications
    refetchOnWindowFocus: true,         // instant refresh when user returns to tab
    staleTime: 1_000,
  });
};

// =====================
// MESSAGES (per conversation) — 3s polling on the active chat.
// Matches WhatsApp Web's cadence. Paused when tab hidden, instant on focus.
// =====================
export const useMessages = (conversationId: string | null) => {
  return useQuery({
    queryKey: ["messages", conversationId],
    enabled: !!conversationId,
    queryFn: () =>
      conversationId
        ? (api.listMessages(conversationId) as Promise<Message[]>)
        : Promise.resolve([]),
    refetchInterval: 3_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 1_000,
  });
};

// =====================
// SEND MESSAGE (outbound) — optionally with media attachment
// =====================
type SendMessageVars = {
  conversationId: string;
  body: string;
  media_url?: string | null;
  media_type?: "image" | "video" | "audio" | "document" | null;
  media_filename?: string | null;
};

export const useSendMessage = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (vars: SendMessageVars) =>
      api.sendMessage(vars.conversationId, {
        body: vars.body,
        direction: "outbound",
        status: "sent",
        media_url: vars.media_url ?? null,
        media_type: vars.media_type ?? null,
        media_filename: vars.media_filename ?? null,
      }),
    onSuccess: (_msg, vars) => {
      qc.invalidateQueries({ queryKey: ["messages", vars.conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    },
  });
};

// =====================
// CREATE CONVERSATION (with new or existing contact)
// =====================
export const useCreateConversation = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (input: { name: string; phone: string; email?: string; source?: string }) =>
      api.createConversation(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
      toast.success("Conversation started");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Could not create conversation");
    },
  });
};

// =====================
// DELETE CONVERSATION
// =====================
export const useDeleteConversation = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (conversationId: string) => api.deleteConversation(conversationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
      toast.success("Chat deleted");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Could not delete chat");
    },
  });
};

// =====================
// MARK CONVERSATION READ
// =====================
export const useMarkRead = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (conversationId: string) =>
      api.updateConversation(conversationId, { unread_count: 0 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
    },
  });
};
