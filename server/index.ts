import { config } from "dotenv";
import { Hono } from "hono";

config({ path: ".env.local" });
config({ path: ".env" });
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { auth } from "./auth";
import { warmupDb } from "./db/client";
import { rateLimit } from "./middleware/rateLimit";
import crmRoutes from "./routes/crm";
import inboxRoutes from "./routes/inbox";
import metaRoutes from "./routes/meta";
import integrationsRoutes from "./routes/integrations";
import webhookRoutes from "./routes/webhooks";
import adminRoutes from "./routes/admin";

const app = new Hono();

app.use(logger());

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:8080")
  .split(",").map((s) => s.trim()).filter(Boolean);

app.use(
  "*",
  cors({
    origin: allowedOrigins,
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  })
);

// Global error handler — catches throws from any route, returns clean JSON
// instead of a Hono default HTML stack trace.
app.onError((err, c) => {
  console.error(`[${c.req.method} ${c.req.path}]`, err);
  if (err instanceof Error && /not.?found/i.test(err.message)) {
    return c.json({ error: err.message }, 404);
  }
  return c.json({ error: "Internal server error" }, 500);
});

app.get("/health", (c) => c.json({ ok: true, ts: new Date().toISOString() }));

// Rate limits — strict on auth MUTATIONS (brute-force protection), generous on data API.
// We only rate-limit endpoints that change state. Read-only routes like
// /api/auth/get-session are excluded — the customer app polls these every
// ~30s across multiple tabs, which used to exhaust the auth budget and
// erroneously block legitimate sign-up attempts.
const authMutationLimiter = rateLimit({ scope: "auth-mutate", windowMs: 5 * 60_000, max: 40 });
const AUTH_MUTATION_PATHS = [
  "/api/auth/sign-up/email",
  "/api/auth/sign-in/email",
  "/api/auth/forget-password",
  "/api/auth/reset-password",
  "/api/auth/two-factor/verify-totp",
  "/api/auth/two-factor/verify-backup-code",
];
app.use("/api/auth/*", async (c, next) => {
  if (AUTH_MUTATION_PATHS.includes(c.req.path)) {
    return authMutationLimiter(c, next);
  }
  return next();
});
// General API: 600 requests per IP per minute (10 rps avg).
app.use("/api/*", rateLimit({ scope: "api", windowMs: 60_000, max: 600 }));

// Mount Better Auth — handles /api/auth/sign-up, /sign-in, /sign-out, /session, etc.
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Public webhooks FIRST so the requireAuth middleware on the auth-protected
// sub-apps doesn't bleed into webhook paths.
app.route("/api", webhookRoutes);

// App API surface (each sub-app applies requireAuth on its own routes)
app.route("/api", crmRoutes);
app.route("/api", inboxRoutes);
app.route("/api", metaRoutes);
app.route("/api", integrationsRoutes);
app.route("/", adminRoutes);

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API listening on http://localhost:${info.port}`);
  // Fire and forget — wakes Neon if it's auto-suspended so the first real
  // user request doesn't eat a cold-start.
  warmupDb();
});

export type AppType = typeof app;
