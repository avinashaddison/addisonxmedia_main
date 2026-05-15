import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";

config({ path: ".env.local" });
config({ path: ".env" });
import postgres from "postgres";
import * as schema from "./schema";

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
  max: 5,
  prepare: !isPooler,
  idle_timeout: 20,
  connect_timeout: 30,
  max_lifetime: 60 * 30,
  onnotice: () => {},
});

export const db = drizzle(client, { schema });
export type DB = typeof db;

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
      console.log(`[db] pool warmed up in ${Date.now() - start}ms (attempt ${attempt})`);
      return;
    } catch (err) {
      console.warn(`[db] warmup attempt ${attempt}/3 failed:`, (err as Error).message);
      if (attempt === 3) {
        console.error("[db] warmup gave up after 3 attempts — first user request may be slow");
        return;
      }
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
};
