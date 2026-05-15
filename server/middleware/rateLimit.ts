import type { Context, Next } from "hono";

// Lightweight in-memory rate limiter. Token bucket per (key, route-class).
// For prod with multiple instances, swap to Redis. For single-server dev/MVP,
// in-memory is fine and avoids the latency of a remote counter.

type Bucket = { tokens: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Sweep expired buckets every 60s so the map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
}, 60_000).unref?.();

export type RateLimitOpts = {
  windowMs: number;
  max: number;
  // Pick the bucket key. Default: client IP. For auth-protected routes you
  // could swap to the userId from c.var.
  keyOf?: (c: Context) => string;
  // Differentiate buckets by route name so /api/auth and /api/contacts have
  // separate counters even for the same IP.
  scope: string;
};

const ipOf = (c: Context): string => {
  // Best-effort client IP. Behind a proxy/load balancer set X-Forwarded-For.
  const fwd = c.req.header("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = c.req.header("x-real-ip");
  if (real) return real;
  // Hono/Node — try the raw socket
  return (c.req.raw as any)?.headers?.get?.("x-forwarded-for") ?? "unknown";
};

export const rateLimit = (opts: RateLimitOpts) => async (c: Context, next: Next) => {
  const key = `${opts.scope}:${(opts.keyOf ?? ipOf)(c)}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { tokens: opts.max - 1, resetAt: now + opts.windowMs });
    c.header("X-RateLimit-Limit", String(opts.max));
    c.header("X-RateLimit-Remaining", String(opts.max - 1));
    c.header("X-RateLimit-Reset", String(Math.ceil((now + opts.windowMs) / 1000)));
    await next();
    return;
  }

  if (bucket.tokens <= 0) {
    c.header("X-RateLimit-Limit", String(opts.max));
    c.header("X-RateLimit-Remaining", "0");
    c.header("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
    c.header("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
    return c.json({ error: "Too many requests" }, 429);
  }

  bucket.tokens -= 1;
  c.header("X-RateLimit-Limit", String(opts.max));
  c.header("X-RateLimit-Remaining", String(bucket.tokens));
  c.header("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
  await next();
};
