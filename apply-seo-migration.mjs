// One-shot migration runner for 0004_seo_branding.sql.
// Reads the SQL file and pushes it to the Neon DB pointed at by DATABASE_URL.
// Run: node apply-seo-migration.mjs
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: "require" });
const file = readFileSync("./server/db/migrations/0004_seo_branding.sql", "utf-8");

console.log("[migrate] applying 0004_seo_branding.sql");
await sql.unsafe(file);
const rows = await sql`SELECT key, category FROM system_setting WHERE category IN ('seo','branding') ORDER BY category, key`;
console.log(`[migrate] done. ${rows.length} seo/branding rows present:`);
for (const r of rows) console.log(`  [${r.category}] ${r.key}`);
await sql.end();
