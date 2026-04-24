import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type Campaign = Tables<"campaigns">;
export type Broadcast = Tables<"broadcasts">;
export type Task = Tables<"tasks">;
export type Deal = Tables<"deals">;
export type DealWithContact = Deal & { contact?: Tables<"contacts"> | null };

// ---------------- CAMPAIGNS ----------------
export const useCampaigns = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["campaigns", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Campaign[]> => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useCreateCampaign = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"campaigns">, "owner_id">) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("campaigns")
        .insert({ ...input, owner_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns", user?.id] });
      toast.success("Campaign created");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
};

export const useUpdateCampaign = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...patch }: TablesUpdate<"campaigns"> & { id: string }) => {
      const { data, error } = await supabase.from("campaigns").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns", user?.id] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
};

export const useDeleteCampaign = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns", user?.id] });
      toast.success("Campaign deleted");
    },
  });
};

// ---------------- BROADCASTS ----------------
export const useBroadcasts = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["broadcasts", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Broadcast[]> => {
      const { data, error } = await supabase
        .from("broadcasts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useCreateBroadcast = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"broadcasts">, "owner_id">) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("broadcasts")
        .insert({ ...input, owner_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["broadcasts", user?.id] });
      toast.success("Broadcast saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
};

export const useDeleteBroadcast = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("broadcasts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["broadcasts", user?.id] });
      toast.success("Broadcast deleted");
    },
  });
};

// ---------------- TASKS (FOLLOW-UPS) ----------------
export const useTasks = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tasks", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<(Task & { contact?: Tables<"contacts"> | null })[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, contact:contacts(*)")
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as (Task & { contact?: Tables<"contacts"> | null })[];
    },
  });
};

export const useCreateTask = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"tasks">, "owner_id">) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...input, owner_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", user?.id] });
      toast.success("Follow-up added");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
};

export const useUpdateTask = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...patch }: TablesUpdate<"tasks"> & { id: string }) => {
      const { data, error } = await supabase.from("tasks").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", user?.id] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
};

export const useDeleteTask = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", user?.id] });
      toast.success("Follow-up removed");
    },
  });
};

// ---------------- CONTACTS (shared lookup) ----------------
export const useContactsLookup = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["contacts-lookup", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, phone, tag")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
};

// ---------------- DEALS ----------------
export const useDeals = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["deals", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<DealWithContact[]> => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, contact:contacts(*)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DealWithContact[];
    },
  });
};

export const useCreateDeal = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"deals">, "owner_id">) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("deals")
        .insert({ ...input, owner_id: user.id })
        .select("*, contact:contacts(*)")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals", user?.id] });
      toast.success("Deal added to pipeline");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
};

export const useUpdateDeal = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...patch }: TablesUpdate<"deals"> & { id: string }) => {
      const { data, error } = await supabase
        .from("deals")
        .update(patch)
        .eq("id", id)
        .select("*, contact:contacts(*)")
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, ...patch }) => {
      const key = ["deals", user?.id];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<DealWithContact[]>(key);
      if (prev) {
        qc.setQueryData<DealWithContact[]>(
          key,
          prev.map((d) => (d.id === id ? { ...d, ...patch } as DealWithContact : d))
        );
      }
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["deals", user?.id], ctx.prev);
      toast.error(e instanceof Error ? e.message : "Failed");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["deals", user?.id] }),
  });
};

export const useDeleteDeal = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals", user?.id] });
      toast.success("Deal removed");
    },
  });
};
