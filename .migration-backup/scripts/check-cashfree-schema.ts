// Read-only sanity check: did migrations 0010-0013 land in Neon?
//  - 0010 ad_attribution → conversation.source_ad_id et al
//  - 0011 upgrade_request → upgrade_request table
//  - 0012 webhook_orphan → webhook_orphan table
//  - 0013 cashfree → upgrade_request.cashfree_* columns + index
//
// Also peeks at upgrade_request rows so we can see what Cashfree create-order
// has been inserting (if anything).

import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set in .env / .env.local");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false, idle_timeout: 5 });

const COLOR = {
  ok: (s: string) => `\x1b[32m${s}\x1b[0m`,
  bad: (s: string) => `\x1b[31m${s}\x1b[0m`,
  warn: (s: string) => `\x1b[33m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

const check = async (label: string, fn: () => Promise<boolean>) => {
  try {
    const ok = await fn();
    console.log(`  ${ok ? COLOR.ok("✓") : COLOR.bad("✗")} ${label}`);
    return ok;
  } catch (e) {
    console.log(`  ${COLOR.bad("✗")} ${label} — ${(e as Error).message}`);
    return false;
  }
};

const hasColumn = async (table: string, column: string) => {
  const r = await sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM information_schema.columns
    WHERE table_name = ${table} AND column_name = ${column}
  `;
  return (r[0]?.n ?? 0) > 0;
};

const hasTable = async (table: string) => {
  const r = await sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM information_schema.tables
    WHERE table_name = ${table}
  `;
  return (r[0]?.n ?? 0) > 0;
};

const hasIndex = async (idx: string) => {
  const r = await sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM pg_indexes WHERE indexname = ${idx}
  `;
  return (r[0]?.n ?? 0) > 0;
};

try {
  console.log(COLOR.bold("\nMigrations applied?"));

  console.log(COLOR.dim("  0010_ad_attribution"));
  await check("conversation.source_ad_id",     () => hasColumn("conversation", "source_ad_id"));
  await check("conversation.source_headline",  () => hasColumn("conversation", "source_headline"));
  await check("conversation.ctwa_click_id",    () => hasColumn("conversation", "ctwa_click_id"));
  await check("conversation.source_type",      () => hasColumn("conversation", "source_type"));

  console.log(COLOR.dim("  0011_upgrade_request"));
  await check("upgrade_request table exists",  () => hasTable("upgrade_request"));

  console.log(COLOR.dim("  0012_webhook_orphan"));
  await check("webhook_orphan table exists",   () => hasTable("webhook_orphan"));

  console.log(COLOR.dim("  0013_cashfree"));
  await check("upgrade_request.cashfree_order_id",           () => hasColumn("upgrade_request", "cashfree_order_id"));
  await check("upgrade_request.cashfree_payment_session_id", () => hasColumn("upgrade_request", "cashfree_payment_session_id"));
  await check("upgrade_request.cashfree_payment_id",         () => hasColumn("upgrade_request", "cashfree_payment_id"));
  await check("upgrade_request.cashfree_payment_method",     () => hasColumn("upgrade_request", "cashfree_payment_method"));
  await check("upgrade_request.amount_inr",                  () => hasColumn("upgrade_request", "amount_inr"));
  await check("upgrade_request_cashfree_order_idx",          () => hasIndex("upgrade_request_cashfree_order_idx"));

  console.log(COLOR.bold("\nRecent upgrade_request rows (last 10):"));
  const rows = await sql<{
    id: string;
    user_id: string;
    target_plan: string;
    status: string;
    cashfree_order_id: string | null;
    amount_inr: string | null;
    created_at: Date;
  }[]>`
    SELECT id, user_id, target_plan, status, cashfree_order_id, amount_inr, created_at
    FROM upgrade_request
    ORDER BY created_at DESC
    LIMIT 10
  `;
  if (rows.length === 0) {
    console.log(COLOR.dim("  (none — no upgrade requests have been recorded yet)"));
  } else {
    for (const r of rows) {
      const id = r.id.slice(0, 8);
      const uid = r.user_id.slice(0, 8);
      const plan = r.target_plan.padEnd(7);
      const status = r.status.padEnd(10);
      const cf = r.cashfree_order_id ? COLOR.ok(r.cashfree_order_id.slice(0, 24)) : COLOR.dim("(no cashfree)");
      const amt = r.amount_inr ?? "—";
      const dt = r.created_at.toISOString().slice(0, 19).replace("T", " ");
      console.log(`  ${id}…  user:${uid}…  ${plan} ${status} ₹${amt.padStart(6)}  ${cf}  ${COLOR.dim(dt)}`);
    }
  }

  console.log(COLOR.bold("\nUser plans summary:"));
  const planRows = await sql<{ plan: string; n: number }[]>`
    SELECT COALESCE(plan, 'free') AS plan, COUNT(*)::int AS n
    FROM "user"
    GROUP BY COALESCE(plan, 'free')
    ORDER BY n DESC
  `;
  for (const r of planRows) console.log(`  ${r.plan.padEnd(12)} ${r.n}`);

  console.log(COLOR.bold("\nWebhook orphan health (last 24h):"));
  const orphan = await sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM webhook_orphan
    WHERE created_at > NOW() - INTERVAL '24 hours'
  `;
  console.log(`  ${orphan[0]?.n ?? 0} unrouted webhook events`);

  console.log();
} catch (e) {
  console.error("Connection / query failed:", (e as Error).message);
  process.exit(1);
} finally {
  await sql.end();
}
