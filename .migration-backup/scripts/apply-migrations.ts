/**
 * Apply raw SQL migrations from server/db/migrations against the DATABASE_URL.
 *
 * Why exists: drizzle-kit push diffs the schema and can ask to drop columns
 * if it sees drift. Our migrations are hand-written, idempotent (`IF NOT
 * EXISTS` everywhere), and order-stable — running them directly is the
 * safest way to bring a deploy up to current schema without surprises.
 *
 * Usage: tsx scripts/apply-migrations.ts
 *
 * - Reads .env.local first, then .env, for DATABASE_URL
 * - Runs each migration file in lexicographic order (0001 → 0009 → ...)
 * - Each statement is wrapped in a single execution; if the file has multiple
 *   statements separated by `;`, postgres-js executes them as a single batch
 * - Logs each file as it runs; throws on first failure
 */

import { config } from "dotenv";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("✗ DATABASE_URL is not set. Add it to .env.local or .env.");
  process.exit(1);
}

const MIG_DIR = resolve(process.cwd(), "server/db/migrations");

const files = readdirSync(MIG_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.log("No .sql files found in server/db/migrations.");
  process.exit(0);
}

const sql = postgres(DB_URL, { max: 1, prepare: false, idle_timeout: 5 });

console.log(`→ Applying ${files.length} migration file(s) to ${DB_URL.replace(/:[^:@]+@/, ":****@")}`);
console.log();

try {
  for (const file of files) {
    const content = readFileSync(join(MIG_DIR, file), "utf-8");
    process.stdout.write(`  ${file} … `);
    const start = Date.now();
    await sql.unsafe(content);
    console.log(`ok (${Date.now() - start}ms)`);
  }
  console.log();
  console.log("✓ All migrations applied successfully.");
} catch (err) {
  console.log();
  console.error("✗ Migration failed:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await sql.end();
}
