import type { Context } from "hono";

/**
 * Parse cursor-based pagination query params.
 * - limit: clamped between 1 and 200, default 50
 * - cursor: opaque base64url-encoded ISO date string, or null
 */
export function parsePaginationParams(c: Context): { limit: number; cursor: Date | null } {
  const limit = Math.min(Math.max(1, Number(c.req.query("limit") ?? 50)), 200);
  const cursorStr = c.req.query("cursor");
  const cursor = cursorStr ? new Date(Buffer.from(cursorStr, "base64url").toString()) : null;
  return { limit, cursor };
}

export function encodeCursor(date: Date): string {
  return Buffer.from(date.toISOString()).toString("base64url");
}

/**
 * Returns true if the request contains pagination params (cursor or limit),
 * indicating the client wants the paginated response format.
 */
export function wantsPagination(c: Context): boolean {
  return c.req.query("cursor") !== undefined || c.req.query("limit") !== undefined;
}
