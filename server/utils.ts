// Recursively converts object keys from camelCase to snake_case so the wire format
// matches what the existing frontend code expects (it was originally written
// against Supabase's snake_case column names).
export const toSnake = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toSnake);
  if (obj instanceof Date) return obj.toISOString();
  if (typeof obj !== "object") return obj;
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
      k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`),
      toSnake(v),
    ])
  );
};

// Converts incoming snake_case request bodies to camelCase so they can be
// spread directly into Drizzle's `.set({...})` (Drizzle uses JS prop names).
// Used in PATCH endpoints where the frontend sends a partial update object.
export const toCamel = <T = Record<string, any>>(obj: unknown): T => {
  if (obj === null || obj === undefined) return obj as T;
  if (Array.isArray(obj)) return obj.map(toCamel) as unknown as T;
  if (typeof obj !== "object") return obj as T;
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
      toCamel(v),
    ])
  ) as T;
};
