/**
 * Apply raw SQL migrations from server/db/migrations against the DATABASE_URL.
 *
 * Why exists: drizzle-kit push diffs the schema and can ask to drop columns
 * if it sees drift. Our migrations are hand-written and order-stable —
 * running them directly is the safest way to bring a deploy up to current
 * schema without surprises.
 *
 * Migration tracking:
 *   This script maintains a `schema_migration` table (filename, applied_at)
 *   and only runs files that haven't been applied yet. Without tracking,
 *   every deploy re-ran every file, which broke the moment a non-idempotent
 *   statement (e.g. ALTER TABLE ... RENAME COLUMN) entered the directory:
 *   the second deploy would fail with "column does not exist", taking down
 *   the build, and leaving the DB in whatever state the partial run left it.
 *
 *   On first run after this change, the tracker is empty — every file will
 *   be (re)applied. This is safe because every migration in this directory
 *   is now idempotent (uses CREATE/ADD COLUMN/INDEX IF NOT EXISTS, or
 *   wraps DDL in a DO block with information_schema existence checks).
 *
 *   If you need to force-replay a single migration on a specific
 *   environment, delete its row from `schema_migration` and redeploy.
 *
 * Usage: tsx scripts/apply-migrations.ts
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
const TRACKER_TABLE = "schema_migration";

const files = readdirSync(MIG_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.log("No .sql files found in server/db/migrations.");
  process.exit(0);
}

const sql = postgres(DB_URL, { max: 1, prepare: false, idle_timeout: 5 });

console.log(`→ Applying migrations to ${DB_URL.replace(/:[^:@]+@/, ":****@")}`);
console.log();

try {
  // 1) Ensure tracker table exists.
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS ${TRACKER_TABLE} (
      filename text PRIMARY KEY,
      applied_at timestamp with time zone NOT NULL DEFAULT now()
    );
  `);

  // 2) Find which files have already been applied.
  const existing = await sql<{ filename: string }[]>`
    SELECT filename FROM ${sql(TRACKER_TABLE)}
  `;
  const applied = new Set(existing.map((r) => r.filename));
  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log(`  All ${files.length} migration(s) already applied. Nothing to do.`);
    process.exit(0);
  }

  console.log(`  ${pending.length} pending migration(s) (${applied.size} already applied):`);

  // 3) Run only pending files, recording success in the same transaction
  //    so a deploy crash mid-file can't lie about completion.
  for (const file of pending) {
    const content = readFileSync(join(MIG_DIR, file), "utf-8");
    process.stdout.write(`    ${file} … `);
    const start = Date.now();
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`INSERT INTO ${sql(TRACKER_TABLE)} (filename) VALUES (${file}) ON CONFLICT DO NOTHING`;
    });
    console.log(`ok (${Date.now() - start}ms)`);
  }
  console.log();
  console.log(`✓ ${pending.length} migration(s) applied successfully.`);
} catch (err) {
  console.log();
  console.error("✗ Migration failed:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await sql.end();
}
