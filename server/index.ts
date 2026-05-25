import { config } from "dotenv";
import { Hono } from "hono";

config({ path: ".env.local" });
config({ path: ".env" });
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { sql } from "drizzle-orm";
import { auth } from "./auth";
import { db, warmupDb, pgClient } from "./db/client";
import { registerHandler, startJobWorker, stopJobWorker } from "./lib/job-queue";
import { handleBroadcastSend } from "./jobs/broadcast-send";
import logger, { requestLogger } from "./lib/logger";
import { rateLimit } from "./middleware/rateLimit";
import { csrfProtection } from "./middleware/csrf";
import crmRoutes from "./routes/crm";
import inboxRoutes from "./routes/inbox";
import metaRoutes from "./routes/meta";
import integrationsRoutes from "./routes/integrations";
import metaApiRoutes from "./routes/meta-api";
import webhookRoutes from "./routes/webhooks";
import adminRoutes from "./routes/admin";
import adsRoutes from "./routes/ads";
import paymentsRoutes from "./routes/payments";
import aiRoutes from "./routes/ai";
import billingRoutes from "./routes/billing";
import siteRoutes from "./routes/site";
import sitePublicRoutes from "./routes/site-public";
import productRoutes from "./routes/product";
import orderRoutes from "./routes/order";
import siteAnalyticsRoutes from "./routes/site-analytics";
import couponRoutes from "./routes/coupon";
import shippingRoutes from "./routes/shipping";
import orderPaymentRoutes from "./routes/order-payment";
import sitePageRoutes from "./routes/site-page";
import commerceRoutes from "./routes/commerce";
import bookingRoutes from "./routes/booking";
import exportRoutes from "./routes/export";
import { requireVerifiedEmail } from "./middleware/requireVerifiedEmail";
import { getSeoSettings, injectSeo, buildSitemapXml, buildRobotsTxt } from "./lib/seo";

const app = new Hono();

app.use('*', requestLogger);

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:8080")
  .split(",").map((s) => s.trim()).filter(Boolean);

app.use(
  "*",
  cors({
    origin: allowedOrigins,
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  })
);

// CSRF double-submit cookie protection — must be after cors so preflight
// OPTIONS responses include the CSRF cookie, but before route mounts.
app.use("*", csrfProtection);

// Global error handler — catches throws from any route, returns clean JSON
// instead of a Hono default HTML stack trace.
app.onError((err, c) => {
  logger.error({ method: c.req.method, path: c.req.path, err }, 'Unhandled error');
  if (err instanceof Error && /not.?found/i.test(err.message)) {
    return c.json({ error: err.message }, 404);
  }
  return c.json({ error: "Internal server error" }, 500);
});

app.get("/health", async (c) => {
  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    const dbLatency = Date.now() - start;
    if (dbLatency > 5000) {
      return c.json({ ok: false, ts: new Date().toISOString(), db: 'slow', db_latency_ms: dbLatency }, 503);
    }
    return c.json({ ok: true, ts: new Date().toISOString(), db: 'ok', db_latency_ms: dbLatency });
  } catch (err) {
    return c.json({ ok: false, ts: new Date().toISOString(), db: 'unreachable', error: (err as Error).message }, 503);
  }
});

// Rate limits — strict on auth MUTATIONS (brute-force protection), generous on data API.
// We only rate-limit endpoints that change state. Read-only routes like
// /api/auth/get-session are excluded — the customer app polls these every
// ~30s across multiple tabs, which used to exhaust the auth budget and
// erroneously block legitimate sign-up attempts.
const authMutationLimiter = rateLimit({ scope: "auth-mutate", windowMs: 5 * 60_000, max: 40 });
const AUTH_MUTATION_PATHS = [
  "/api/auth/sign-up/email",
  "/api/auth/sign-in/email",
  "/api/auth/request-password-reset",
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

// Request body size limit — 1MB for all API routes.
app.use("/api/*", bodyLimit({
  maxSize: 1024 * 1024,
  onError: (c) => c.json({ error: "Request body too large", max: "1MB" }, 413),
}));

// Mount Better Auth — handles /api/auth/sign-up, /sign-in, /sign-out, /session, etc.
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Public webhooks FIRST so the requireAuth middleware on the auth-protected
// sub-apps doesn't bleed into webhook paths.
app.route("/api", webhookRoutes);

// Email verification enforcement — applied AFTER auth handler + webhooks but
// BEFORE the main API routes. Disabled by default; set REQUIRE_EMAIL_VERIFICATION=true.
app.use('/api/*', requireVerifiedEmail);

// Admin + public system endpoints BEFORE the per-resource sub-apps. crm/inbox/
// meta/integrations each register `app.use("*", requireAuth)` which would
// otherwise eat unrelated paths like /api/system/flags (public) or /api/admin/me
// (its own auth path) and return 401 before adminRoutes gets a turn.
app.route("/", adminRoutes);

// App API surface (each sub-app applies requireAuth on its own routes)
app.route("/api", crmRoutes);
app.route("/api", inboxRoutes);
app.route("/api", metaRoutes);
app.route("/api", integrationsRoutes);
app.route("/api", metaApiRoutes);
app.route("/api", adsRoutes);
app.route("/api", paymentsRoutes);
app.route("/api", aiRoutes);
app.route("/api", billingRoutes);
app.route("/api", siteRoutes);
app.route("/api", productRoutes);
app.route("/api", orderRoutes);
app.route("/api", siteAnalyticsRoutes);
app.route("/api", couponRoutes);
app.route("/api", shippingRoutes);
// Order payment routes — mounted at root because /biz/... + /api/cashfree/order-webhook
// span both public and API surfaces.
app.route("/", orderPaymentRoutes);
app.route("/api", sitePageRoutes);
app.route("/api", commerceRoutes);
app.route("/api", bookingRoutes);
app.route("/api", exportRoutes);

// Public website renderer — no /api prefix. /biz/:slug is the public URL
// customers share, so it lives next to /sitemap.xml as a top-level route.
app.route("/", sitePublicRoutes);

// /sitemap.xml + /robots.txt are dynamic — driven by admin settings, available
// in both dev and prod so SEO checks work the same locally.
app.get("/sitemap.xml", async (c) => {
  const seo = await getSeoSettings();
  const xml = buildSitemapXml(seo);
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
});
app.get("/robots.txt", async (c) => {
  const seo = await getSeoSettings();
  const txt = buildRobotsTxt(seo);
  return new Response(txt, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
});

// In production (Render single-service deploy) the Hono server also serves the
// built Vite frontend. In dev, Vite serves the frontend on its own port and
// proxies /api → here, so this block is a no-op locally.
const SERVE_STATIC = process.env.NODE_ENV === "production" || process.env.SERVE_STATIC === "1";
if (SERVE_STATIC) {
  const distDir = resolve(process.cwd(), "dist");
  // Hashed asset files (long-cache friendly).
  app.use("/assets/*", serveStatic({ root: "./dist" }));
  // Top-level static files (favicon, robots.txt, logo, etc).
  app.use(
    "/*",
    serveStatic({
      root: "./dist",
      // Don't fall through to SPA shell for paths that obviously want a file
      // (have an extension) — let the static handler 404 those naturally.
      precompressed: false,
    })
  );
  // SPA fallback: any GET that isn't /api/*, isn't /health, and didn't match a
  // file above gets index.html so React Router can take over. SEO meta tags
  // are injected per-request from the system_setting table (60s cache).
  let indexHtmlTemplate: string | null = null;
  app.get("*", async (c) => {
    if (c.req.path.startsWith("/api/") || c.req.path === "/health") {
      return c.json({ error: "Not found" }, 404);
    }
    if (!indexHtmlTemplate) {
      indexHtmlTemplate = await readFile(resolve(distDir, "index.html"), "utf-8");
    }
    const seo = await getSeoSettings();
    return c.html(injectSeo(indexHtmlTemplate, seo));
  });
}

const port = Number(process.env.PORT ?? 3001);
// Bind on all interfaces in production so the platform (Render, Fly, etc) can
// reach the port. Locally we still default to all-interfaces — same behavior.
const server = serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
  const mode = SERVE_STATIC ? "API + static frontend" : "API only";
  logger.info({ mode, port: info.port }, `Listening on http://0.0.0.0:${info.port}`);
  warmupDb();
  // Register job handlers and start the background worker
  registerHandler('broadcast_send', handleBroadcastSend);
  startJobWorker();
});

// Graceful shutdown — Render sends SIGTERM before stopping the container.
const shutdown = (signal: string) => {
  logger.info({ signal }, 'Received signal, shutting down gracefully');
  stopJobWorker();
  server.close(() => {
    logger.info('HTTP server closed');
    pgClient.end({ timeout: 5 }).then(() => {
      logger.info('Database connections closed');
      process.exit(0);
    }).catch(() => process.exit(1));
  });
  // Force exit after 10s if drain hasn't completed
  setTimeout(() => { logger.error('Forced shutdown after timeout'); process.exit(1); }, 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export type AppType = typeof app;
