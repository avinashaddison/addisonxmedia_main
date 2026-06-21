import { useQuery } from "@tanstack/react-query";

export type SystemFlags = Record<string, string | null>;

/** Reads public system feature flags from /api/system/flags.
 *  Safe to call before login (no auth required). Cached for 5 minutes — these
 *  rarely change, and we don't want to spam the API. */
export const useSystemFlags = () => {
  return useQuery<SystemFlags>({
    queryKey: ["system-flags"],
    queryFn: async () => {
      const r = await fetch("/api/system/flags");
      if (!r.ok) return {};
      return r.json();
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: 0,
  });
};

/** True iff the flag exists in the DB and its value is the literal string "true". */
export const useFlag = (key: string): boolean => {
  const { data } = useSystemFlags();
  return data?.[key] === "true";
};
