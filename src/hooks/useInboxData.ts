import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { ConversationWithContact, Message } from "@/lib/inbox-types";
import { toast } from "sonner";

// =====================
// CONVERSATIONS — polls every 5s while focused, instant on tab focus, paused when hidden.
// =====================
export const useConversations = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: () => api.listConversations() as Promise<ConversationWithContact[]>,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false, // pauses when tab is hidden
    refetchOnWindowFocus: true,         // instant refresh when user returns to tab
    staleTime: 1_500,
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
// SEND MESSAGE (outbound)
// =====================
export const useSendMessage = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ conversationId, body }: { conversationId: string; body: string }) =>
      api.sendMessage(conversationId, { body, direction: "outbound", status: "sent" }),
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
