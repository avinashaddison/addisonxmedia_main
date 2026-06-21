import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";

config({ path: ".env.local" });
config({ path: ".env" });
import postgres from "postgres";
import * as schema from "./schema";
import logger from "../lib/logger";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Put your Neon connection string in .env.local " +
      "(format: postgresql://user:pass@host/db?sslmode=require)."
  );
}

// Neon-friendly postgres-js client config.
// Neon free-tier auto-suspends after ~5 min idle; the first query after suspend
// can drop with ECONNRESET while the compute spins up. We mitigate with:
// - `prepare: false` for pooler URLs (PgBouncer rejects prepared statements)
// - small pool with idle_timeout so sockets get recycled before Neon kills them
// - generous connect_timeout for cold-start handshake (~5s typical)
const isPooler = url.includes("-pooler");
const client = postgres(url, {
  // max: 5 keeps total connection count low -- Neon free tier allows 20 total,
  // and each Render instance should leave headroom for migrations/admin queries.
  max: 5,
  prepare: !isPooler,
  // idle_timeout: 20s -- recycle idle connections before Neon's 5-min suspend
  // window so we never hold a stale socket that will ECONNRESET on next use.
  idle_timeout: 20,
  // connect_timeout: 30s -- Neon cold-start can take 3-8s; 30s handles worst case.
  connect_timeout: 30,
  // max_lifetime: 30 minutes -- rotate connections periodically to pick up
  // any Neon-side IP/cert changes without requiring a full restart.
  max_lifetime: 60 * 30,
  onnotice: () => {},
});

export const db = drizzle(client, { schema });
export type DB = typeof db;

// Export the raw postgres-js client so server/index.ts can call client.end()
// during graceful shutdown.
export { client as pgClient };

// Warm-up at startup. Pre-opens N parallel connections so the pool is fully
// hot before any real request — first user-facing query doesn't eat a TLS
// handshake (~300ms each on a remote DB) on top of query time.
let warmedUp = false;
export const warmupDb = async () => {
  if (warmedUp) return;
  const start = Date.now();
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Run 5 parallel queries to force the pool (max=5) to fully populate.
      // Each query returns instantly; the cost is TLS handshakes happening in
      // parallel rather than serially on first 5 user requests.
      await Promise.all(Array.from({ length: 5 }, () => client`SELECT 1 AS ok`));
      warmedUp = true;
      logger.info({ duration_ms: Date.now() - start, attempt }, 'DB pool warmed up');

      // Run startup migrations to ensure columns exist (self-healing)
      try {
        const { sql } = await import("drizzle-orm");
        await db.execute(sql`ALTER TABLE "contact" ADD COLUMN IF NOT EXISTS "is_reseller" boolean NOT NULL DEFAULT false;`);
        await db.execute(sql`ALTER TABLE "ai_agent" ADD COLUMN IF NOT EXISTS "upi_vpa" text;`);
        await db.execute(sql`ALTER TABLE "ai_agent" ADD COLUMN IF NOT EXISTS "binance_id" text;`);
        await db.execute(sql`ALTER TABLE "ai_agent" ADD COLUMN IF NOT EXISTS "qr_image_url" text;`);
        await db.execute(sql`ALTER TABLE "prebuilt_agent" ADD COLUMN IF NOT EXISTS "upi_vpa" text;`);
        await db.execute(sql`ALTER TABLE "prebuilt_agent" ADD COLUMN IF NOT EXISTS "binance_id" text;`);
        await db.execute(sql`ALTER TABLE "prebuilt_agent" ADD COLUMN IF NOT EXISTS "qr_image_url" text;`);
        await db.execute(sql`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "is_digital" boolean NOT NULL DEFAULT false;`);
        await db.execute(sql`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "validity" text;`);
        await db.execute(sql`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "activation_mail" text;`);
        await db.execute(sql`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "activation_time" text;`);
        await db.execute(sql`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "price_usd" numeric(10, 2);`);
        await db.execute(sql`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "is_reseller" boolean NOT NULL DEFAULT false;`);
        await db.execute(sql`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "reseller_price" numeric(10, 2);`);
        await db.execute(sql`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "reseller_price_usd" numeric(10, 2);`);
        // Landing-page "free templates" lead capture (see 0040_template_lead.sql).
        // Created here too so deployed DBs self-heal without a manual migration run.
        await db.execute(sql`CREATE TABLE IF NOT EXISTS "template_lead" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "email" text NOT NULL,
          "source" text NOT NULL DEFAULT 'landing_templates',
          "ip_hash" text,
          "user_agent" text,
          "emailed_at" timestamp with time zone,
          "created_at" timestamp with time zone NOT NULL DEFAULT now()
        );`);
        await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "template_lead_email_unq" ON "template_lead"("email");`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS "template_lead_created_idx" ON "template_lead"("created_at" DESC);`);
        // Backfill plan_renews_at for already-paid users whose plan was activated
        // before the renewal-date write path existed. Idempotent: only fills NULLs
        // for non-free accounts, derived from their latest completed upgrade_request
        // (completed_at + 1 year for annual, else + 1 month). Leaves trials alone
        // (the Renewals view falls back to trial_ends_at for those).
        await db.execute(sql`
          UPDATE "user" u SET "plan_renews_at" = ur.renews_at
          FROM (
            SELECT DISTINCT ON (r."user_id") r."user_id",
              r."completed_at" + (CASE WHEN r."billing_cycle" = 'annual' THEN interval '1 year' ELSE interval '1 month' END) AS renews_at
            FROM "upgrade_request" r
            WHERE r."status" = 'completed' AND r."completed_at" IS NOT NULL
            ORDER BY r."user_id", r."completed_at" DESC
          ) ur
          WHERE u."id" = ur."user_id"
            AND u."plan_renews_at" IS NULL
            AND u."plan" IS NOT NULL AND u."plan" <> 'free';
        `);
        logger.info('DB startup migrations completed successfully');
      } catch (migErr: any) {
        logger.error({ error: migErr.message || migErr }, 'DB startup migrations failed');
      }

      return;
    } catch (err) {
      logger.warn({ attempt, error: (err as Error).message }, 'DB warmup attempt failed');
      if (attempt === 3) {
        logger.error('DB warmup gave up after 3 attempts -- first user request may be slow');
        return;
      }
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
};
