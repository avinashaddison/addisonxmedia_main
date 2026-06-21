// Read-only: did migration 0014_meta_extras land in Neon?
// Confirms columns exist on meta_config + the meta_capi_event table.
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const sql = postgres(url, { max: 1, prepare: false, idle_timeout: 5 });

const G = "\x1b[32m", R = "\x1b[31m", D = "\x1b[2m", B = "\x1b[1m", X = "\x1b[0m";

const hasCol = async (t: string, c: string) =>
  ((await sql<{ n: number }[]>`SELECT COUNT(*)::int n FROM information_schema.columns WHERE table_name=${t} AND column_name=${c}`)[0]?.n ?? 0) > 0;

const hasTable = async (t: string) =>
  ((await sql<{ n: number }[]>`SELECT COUNT(*)::int n FROM information_schema.tables WHERE table_name=${t}`)[0]?.n ?? 0) > 0;

const check = async (label: string, fn: () => Promise<boolean>) => {
  const ok = await fn().catch(() => false);
  console.log(`  ${ok ? G + "✓" + X : R + "✗" + X} ${label}`);
  return ok;
};

try {
  console.log(B + "\nMigration 0014_meta_extras applied?" + X);
  await check("meta_config.catalog_id",            () => hasCol("meta_config", "catalog_id"));
  await check("meta_config.pixel_id",              () => hasCol("meta_config", "pixel_id"));
  await check("meta_config.capi_enabled",          () => hasCol("meta_config", "capi_enabled"));
  await check("meta_config.capi_test_event_code",  () => hasCol("meta_config", "capi_test_event_code"));
  await check("meta_config.messaging_limit_tier",  () => hasCol("meta_config", "messaging_limit_tier"));
  await check("meta_config.quality_rating",        () => hasCol("meta_config", "quality_rating"));
  await check("meta_config.tier_refreshed_at",     () => hasCol("meta_config", "tier_refreshed_at"));
  await check("meta_capi_event table",             () => hasTable("meta_capi_event"));

  console.log(B + "\nYour current CAPI state:" + X);
  const cfgs = await sql<{ user_email: string; capi_enabled: boolean; pixel_id: string | null; test_code: string | null }[]>`
    SELECT u.email AS user_email, mc.capi_enabled, mc.pixel_id, mc.capi_test_event_code AS test_code
    FROM meta_config mc LEFT JOIN "user" u ON u.id = mc.user_id
    ORDER BY mc.created_at DESC
  `;
  if (cfgs.length === 0) {
    console.log(D + "  (no meta_config rows yet)" + X);
  } else {
    for (const r of cfgs) {
      const en = r.capi_enabled ? G + "ENABLED " + X : D + "disabled" + X;
      console.log(`  ${en}  ${r.user_email?.padEnd(30) ?? "(no email)"}  pixel:${r.pixel_id ?? "—"}  test:${r.test_code ?? "—"}`);
    }
  }

  console.log(B + "\nRecent CAPI events (last 10):" + X);
  const evs = await sql<{ event_name: string; owner_email: string; response_code: number | null; fired_at: Date; source_type: string | null }[]>`
    SELECT e.event_name, u.email AS owner_email, e.response_code, e.fired_at, e.source_type
    FROM meta_capi_event e LEFT JOIN "user" u ON u.id = e.owner_id
    ORDER BY e.fired_at DESC LIMIT 10
  `;
  if (evs.length === 0) {
    console.log(D + "  (no events fired yet)" + X);
  } else {
    for (const e of evs) {
      const code = e.response_code === 200 ? G + "200" + X : R + String(e.response_code) + X;
      console.log(`  ${code}  ${e.event_name.padEnd(10)}  ${(e.owner_email ?? "—").padEnd(30)}  ${(e.source_type ?? "—").padEnd(16)}  ${D + e.fired_at.toISOString().slice(0, 19) + X}`);
    }
  }
  console.log();
} catch (e) {
  console.error("Query failed:", (e as Error).message);
  process.exit(1);
} finally {
  await sql.end();
}
