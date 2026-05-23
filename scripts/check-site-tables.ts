/** One-off verification — checks every site-builder table + column exists. */
import { config } from "dotenv";
import postgres from "postgres";
config({ path: ".env.local" });
config({ path: ".env" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });

const TABLES = [
  "site", "site_lead", "product", "customer_order", "order_item",
  "site_analytics_event", "coupon", "shipping_zone", "site_page",
];

const REQUIRED_COLUMNS: Record<string, string[]> = {
  customer_order: ["coupon_id", "coupon_code", "shipping_zone_id", "shipping_zone_name", "customer_pincode"],
};

(async () => {
  console.log("\n┌─ Site-builder schema verification ─────────────");
  for (const t of TABLES) {
    const [exists] = await sql<{ exists: boolean }[]>`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = ${t}) AS exists
    `;
    console.log(`│ ${exists.exists ? "✓" : "✗"} ${t}`);
    if (!exists.exists) continue;

    const need = REQUIRED_COLUMNS[t];
    if (!need) continue;
    const cols = await sql<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns WHERE table_name = ${t}
    `;
    const have = new Set(cols.map((c) => c.column_name));
    for (const c of need) {
      console.log(`│    ${have.has(c) ? "✓" : "✗"} ${t}.${c}`);
    }
  }
  console.log("└────────────────────────────────────────────────\n");
  await sql.end();
})().catch((e) => { console.error(e); process.exit(1); });
