// One-shot migration runner for 0005_ads.sql.
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: "require" });
const file = readFileSync("./server/db/migrations/0005_ads.sql", "utf-8");

console.log("[migrate] applying 0005_ads.sql");
await sql.unsafe(file);
const cols = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'meta_config' AND column_name LIKE 'ad%'
  ORDER BY column_name`;
console.log(`[migrate] done. ${cols.length} ad-related columns on meta_config:`);
for (const c of cols) console.log(`  · ${c.column_name}`);
await sql.end();
