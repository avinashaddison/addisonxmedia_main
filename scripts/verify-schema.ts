// One-shot: list the columns of the `profile` table so we can confirm the
// social-link columns landed. Safe — read-only.
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false, idle_timeout: 5 });
try {
  const rows = await sql<{ column_name: string; data_type: string }[]>`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'profile' ORDER BY ordinal_position
  `;
  console.log("profile columns:");
  for (const r of rows) console.log(`  ${r.column_name.padEnd(30)} ${r.data_type}`);
  const need = ["whatsapp_community_url", "instagram_url", "website_url", "facebook_url"];
  const have = new Set(rows.map((r) => r.column_name));
  const missing = need.filter((c) => !have.has(c));
  console.log();
  if (missing.length) console.log("✗ Missing:", missing.join(", "));
  else console.log("✓ All 4 social-link columns present.");
} finally {
  await sql.end();
}
