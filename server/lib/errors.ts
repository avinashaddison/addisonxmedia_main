import type { Context } from 'hono';

export type ErrorCode =
  | 'not_found' | 'unauthorized' | 'forbidden' | 'validation_error'
  | 'rate_limited' | 'upgrade_required' | 'internal_error'
  | 'service_unavailable' | 'conflict' | 'invalid_transition';

export function apiError(c: Context, status: number, code: ErrorCode, detail?: string) {
  return c.json({ error: code, code, detail: detail ?? null }, status as any);
}

// Convenience shortcuts
export const notFound = (c: Context, detail?: string) => apiError(c, 404, 'not_found', detail);
export const unauthorized = (c: Context, detail?: string) => apiError(c, 401, 'unauthorized', detail);
export const forbidden = (c: Context, detail?: string) => apiError(c, 403, 'forbidden', detail);
export const validationError = (c: Context, detail?: string) => apiError(c, 400, 'validation_error', detail);
export const conflict = (c: Context, detail?: string) => apiError(c, 409, 'conflict', detail);
