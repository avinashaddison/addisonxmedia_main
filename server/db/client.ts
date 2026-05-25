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
