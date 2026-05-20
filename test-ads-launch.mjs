/**
 * End-to-end test of the ad launch chain — runs the same 4 Meta calls our
 * /api/ads/campaigns endpoint runs (Campaign → AdSet → AdCreative → Ad),
 * using the encrypted token + ad account from meta_config in the DB.
 *
 * Always creates as PAUSED so nothing actually delivers / spends.
 * Auto-cleans up the test campaign at the end via DELETE on each object.
 *
 * Run: node test-ads-launch.mjs
 */
import { config } from "dotenv";
import postgres from "postgres";
import { createDecipheriv, scryptSync } from "node:crypto";

config({ path: ".env.local" });

const GRAPH = "https://graph.facebook.com/v21.0";

// ─── Crypto (matches server/crypto.ts) ───
const MASTER_KEY = process.env.MASTER_KEY;
const KDF_SALT = "addisonx-fixed-salt-v1";
const KEY = scryptSync(MASTER_KEY ?? "dev-fallback-key-do-not-use-in-prod-32+", KDF_SALT, 32);
const TAG = "v1:";

function decrypt(ciphertext) {
  if (!ciphertext.startsWith(TAG)) return ciphertext;
  const buf = Buffer.from(ciphertext.slice(TAG.length), "base64");
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(buf.length - 16);
  const enc = buf.subarray(12, buf.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

// ─── Meta API helper ───
async function meta(path, token, init = {}) {
  const url = path.startsWith("http") ? path : `${GRAPH}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const userMsg = body?.error?.error_user_msg;
    const title = body?.error?.error_user_title;
    const top = body?.error?.message;
    const trace = body?.error?.fbtrace_id;
    const composed = userMsg ? (title ? `${title}: ${userMsg}` : userMsg) : top;
    throw new Error(`${composed}${trace ? ` (trace: ${trace})` : ""}`);
  }
  return body;
}

// ─── Run ───
const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  ssl: { rejectUnauthorized: false },
  idle_timeout: 5,
  connect_timeout: 30,
});

const [row] = await sql`
  SELECT user_id, ad_account_id, ad_access_token, ad_account_name
  FROM meta_config
  WHERE ad_account_id IS NOT NULL AND ad_access_token IS NOT NULL
  ORDER BY ads_connected_at DESC NULLS LAST
  LIMIT 1
`;

if (!row) {
  console.error("[fail] No connected ad account found in meta_config. Connect Meta Ads in /app/ads first.");
  await sql.end();
  process.exit(1);
}

const adAccountId = row.ad_account_id;
const token = decrypt(row.ad_access_token);
console.log(`[ok] Using ad account: ${row.ad_account_name} (act_${adAccountId})`);

const actId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

let campaignId, adSetId, creativeId, adId;
let failedStep = null;
let failedError = null;

try {
  // ── Step 0: Find a page ──
  console.log("\n[step 0] Listing pages…");
  const pages = await meta(`/me/accounts?fields=id,name&limit=10`, token);
  if (!pages.data?.length) {
    throw new Error("No Facebook Pages available. Token needs pages_show_list scope + System User must be assigned to a Page.");
  }
  const page = pages.data[0];
  console.log(`  → using page: ${page.name} (${page.id})`);

  // ── Step 1: Campaign ──
  console.log("\n[step 1] Creating Campaign…");
  const campaign = await meta(`/${actId}/campaigns`, token, {
    method: "POST",
    body: JSON.stringify({
      name: `[TEST] AddisonX launch ${new Date().toISOString().slice(0, 16)}`,
      objective: "OUTCOME_TRAFFIC",
      status: "PAUSED",
      special_ad_categories: [],
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      daily_budget: 10000, // ₹100 in paise
    }),
  });
  campaignId = campaign.id;
  console.log(`  ✅ campaign: ${campaignId}`);

  // ── Step 2: Ad Set ──
  console.log("\n[step 2] Creating Ad Set…");
  failedStep = "ad_set";
  const adSet = await meta(`/${actId}/adsets`, token, {
    method: "POST",
    body: JSON.stringify({
      name: `[TEST] Ad Set`,
      campaign_id: campaignId,
      billing_event: "IMPRESSIONS",
      optimization_goal: "LINK_CLICKS",
      targeting: {
        geo_locations: { countries: ["IN"] },
        age_min: 18,
        age_max: 65,
      },
      promoted_object: { page_id: page.id },
      status: "PAUSED",
    }),
  });
  adSetId = adSet.id;
  console.log(`  ✅ ad set: ${adSetId}`);

  // ── Step 3: Ad Creative ──
  console.log("\n[step 3] Creating Ad Creative…");
  failedStep = "creative";
  const creative = await meta(`/${actId}/adcreatives`, token, {
    method: "POST",
    body: JSON.stringify({
      name: `[TEST] Creative`,
      object_story_spec: {
        page_id: page.id,
        link_data: {
          message: "Test ad body text — please ignore. AddisonX integration smoke test.",
          link: "https://wa.me/919709707311",
          name: "Test headline",
          picture: "https://res.cloudinary.com/dejj4ghmf/image/upload/c_fill,g_center,w_1200,h_628,q_auto,f_auto/sample.jpg",
          call_to_action: {
            type: "LEARN_MORE",
            value: { link: "https://wa.me/919709707311" },
          },
        },
      },
    }),
  });
  creativeId = creative.id;
  console.log(`  ✅ creative: ${creativeId}`);

  // ── Step 4: Ad ──
  console.log("\n[step 4] Creating Ad…");
  failedStep = "ad";
  const ad = await meta(`/${actId}/ads`, token, {
    method: "POST",
    body: JSON.stringify({
      name: `[TEST] Ad`,
      adset_id: adSetId,
      creative: { creative_id: creativeId },
      status: "PAUSED",
    }),
  });
  adId = ad.id;
  console.log(`  ✅ ad: ${adId}`);

  console.log("\n🎉 ALL 4 STEPS SUCCEEDED — launch chain is fully functional");
  console.log(`\nCheck in Ads Manager: https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${adAccountId}`);
  console.log(`The test campaign is PAUSED — won't spend. Cleaning up now…`);
} catch (e) {
  failedError = e;
  console.error(`\n❌ FAILED at step '${failedStep ?? "campaign"}': ${e.message}`);
}

// ── Cleanup ──
console.log("\n[cleanup] Deleting test objects…");
for (const [label, id] of [["ad", adId], ["creative", creativeId], ["ad_set", adSetId], ["campaign", campaignId]]) {
  if (!id) continue;
  try {
    await meta(`/${id}`, token, { method: "DELETE" });
    console.log(`  ✓ deleted ${label} ${id}`);
  } catch (e) {
    console.warn(`  ! couldn't delete ${label} ${id}: ${e.message}`);
  }
}

await sql.end();
process.exit(failedError ? 1 : 0);
