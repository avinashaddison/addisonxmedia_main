import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { Campaign, Broadcast, Task, Deal, Contact } from "@/lib/api-types";
import { toast } from "sonner";

export type { Campaign, Broadcast, Task, Deal };
export type DealWithContact = Deal & { contact?: Contact | null };

// ---------------- CAMPAIGNS ----------------
export const useCampaigns = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["campaigns", user?.id],
    enabled: !!user,
    queryFn: () => api.listCampaigns() as Promise<Campaign[]>,
  });
};

export const useCreateCampaign = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: Partial<Campaign>) => api.createCampaign(input),
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
    mutationFn: ({ id, ...patch }: Partial<Campaign> & { id: string }) =>
      api.updateCampaign(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns", user?.id] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
};

export const useDeleteCampaign = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (id: string) => api.deleteCampaign(id),
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
    queryFn: () => api.listBroadcasts() as Promise<Broadcast[]>,
  });
};

export const useCreateBroadcast = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: Partial<Broadcast>) => api.createBroadcast(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["broadcasts", user?.id] });
      toast.success("Broadcast saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
};

export const useUpdateBroadcast = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ id, ...patch }: Partial<Broadcast> & { id: string }) =>
      api.updateBroadcast(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["broadcasts", user?.id] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
};

export const useDeleteBroadcast = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (id: string) => api.deleteBroadcast(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["broadcasts", user?.id] });
      toast.success("Broadcast deleted");
    },
  });
};

export const useSendBroadcast = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (id: string) => api.sendBroadcast(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["broadcasts", user?.id] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["dashboard", user?.id] });
      if (res.failed === 0) {
        toast.success(`Sent to ${res.sent} contact${res.sent !== 1 ? "s" : ""}`);
      } else {
        toast.warning(`Sent ${res.sent}/${res.total}, ${res.failed} failed — check Meta logs`);
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Send failed"),
  });
};

// ---------------- TASKS (FOLLOW-UPS) ----------------
export const useTasks = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tasks", user?.id],
    enabled: !!user,
    queryFn: () => api.listTasks() as Promise<(Task & { contact?: Contact | null })[]>,
  });
};

export const useCreateTask = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: Partial<Task>) => api.createTask(input),
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
    mutationFn: ({ id, ...patch }: Partial<Task> & { id: string }) =>
      api.updateTask(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", user?.id] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
};

export const useDeleteTask = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
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
      const all = (await api.listContacts()) as Contact[];
      return all
        .map((c) => ({ id: c.id, name: c.name, phone: c.phone, tag: c.tag }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  });
};

// ---------------- DEALS ----------------
export const useDeals = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["deals", user?.id],
    enabled: !!user,
    queryFn: () => api.listDeals() as Promise<DealWithContact[]>,
  });
};

export const useCreateDeal = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: Partial<Deal>) => api.createDeal(input),
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
    mutationFn: ({ id, ...patch }: Partial<Deal> & { id: string }) =>
      api.updateDeal(id, patch),
    onMutate: async ({ id, ...patch }) => {
      const key = ["deals", user?.id];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<DealWithContact[]>(key);
      if (prev) {
        qc.setQueryData<DealWithContact[]>(
          key,
          prev.map((d) => (d.id === id ? ({ ...d, ...patch } as DealWithContact) : d))
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
    mutationFn: (id: string) => api.deleteDeal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals", user?.id] });
      toast.success("Deal removed");
    },
  });
};
