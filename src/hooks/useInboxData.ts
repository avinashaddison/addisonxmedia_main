import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ConversationWithContact, Message } from "@/lib/inbox-types";
import { toast } from "sonner";

// =====================
// CONVERSATIONS
// =====================
export const useConversations = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ConversationWithContact[]> => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*, contact:contacts(*)")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as ConversationWithContact[];
    },
  });

  // Realtime: any change to conversations → refetch list
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("conversations-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => qc.invalidateQueries({ queryKey: ["conversations", user.id] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  return query;
};

// =====================
// MESSAGES (per conversation)
// =====================
export const useMessages = (conversationId: string | null) => {
  const qc = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["messages", conversationId],
    enabled: !!conversationId,
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });

  // Realtime: append new messages as they arrive
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          qc.setQueryData<Message[]>(["messages", conversationId], (old) => {
            if (!old) return [newMsg];
            // Avoid duplicate (we may have inserted it optimistically)
            if (old.some((m) => m.id === newMsg.id)) return old;
            return [...old, newMsg];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, qc]);

  return query;
};

// =====================
// SEND MESSAGE (outbound)
// =====================
export const useSendMessage = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      conversationId,
      body,
    }: {
      conversationId: string;
      body: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: msg, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          owner_id: user.id,
          sender_id: user.id,
          direction: "outbound",
          body,
          status: "sent",
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation preview + reset unread (we just replied)
      await supabase
        .from("conversations")
        .update({
          last_message_at: msg.created_at,
          last_message_preview: body.slice(0, 200),
          unread_count: 0,
        })
        .eq("id", conversationId);

      return msg;
    },
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
    mutationFn: async ({
      name,
      phone,
      email,
      source,
    }: {
      name: string;
      phone: string;
      email?: string;
      source?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Upsert contact (unique on owner_id + phone)
      const { data: contact, error: contactErr } = await supabase
        .from("contacts")
        .upsert(
          {
            owner_id: user.id,
            name,
            phone,
            email: email || null,
            source: source || "Manual",
          },
          { onConflict: "owner_id,phone" },
        )
        .select()
        .single();

      if (contactErr) throw contactErr;

      // Try to find an existing conversation for this contact first
      const { data: existing } = await supabase
        .from("conversations")
        .select("*")
        .eq("contact_id", contact.id)
        .eq("owner_id", user.id)
        .maybeSingle();

      if (existing) return existing;

      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .insert({
          contact_id: contact.id,
          owner_id: user.id,
          status: "open",
        })
        .select()
        .single();

      if (convErr) throw convErr;
      return conv;
    },
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
// MARK CONVERSATION READ
// =====================
export const useMarkRead = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from("conversations")
        .update({ unread_count: 0 })
        .eq("id", conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
    },
  });
};
