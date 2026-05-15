import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { metaConfig } from "../db/schema";
import { requireAuth, type AuthVariables } from "../middleware/auth";
import {
  verifyCredentials,
  listTemplates as listMetaTemplates,
  MetaApiError,
} from "../integrations/meta";
import { encrypt, decrypt } from "../crypto";

const app = new Hono<{ Variables: AuthVariables }>();
app.use("*", requireAuth);

// ============================================================
// META WHATSAPP CONFIG
// ============================================================

// Returns the current user's Meta credentials (without access_token leaked).
app.get("/integrations/meta", async (c) => {
  const [row] = await db.select().from(metaConfig)
    .where(eq(metaConfig.userId, c.var.userId)).limit(1);
  if (!row) return c.json(null);
  // Mask the access token — never return it to the frontend after save.
  return c.json({
    id: row.id,
    phone_number_id: row.phoneNumberId,
    business_account_id: row.businessAccountId,
    display_phone_number: row.displayPhoneNumber,
    enabled: row.enabled,
    last_verified_at: row.lastVerifiedAt,
    has_token: !!row.accessToken,
  });
});

// Save/update credentials. Verifies them against Meta before persisting.
app.post("/integrations/meta", async (c) => {
  const body = await c.req.json();
  const accessToken = String(body.access_token ?? "").trim();
  const phoneNumberId = String(body.phone_number_id ?? "").trim();
  const businessAccountId = body.business_account_id ? String(body.business_account_id).trim() : null;

  if (!accessToken || !phoneNumberId) {
    return c.json({ error: "access_token and phone_number_id are required" }, 400);
  }

  // Verify against Meta — this both checks the credentials work and gives us
  // the display phone number for the UI.
  let verified;
  try {
    verified = await verifyCredentials({ accessToken, phoneNumberId, businessAccountId });
  } catch (err) {
    if (err instanceof MetaApiError) {
      return c.json({ error: `Meta rejected credentials: ${err.message}` }, 400);
    }
    throw err;
  }

  // Encrypt the access token before storing — DB dump doesn't expose Meta tokens.
  const encryptedToken = encrypt(accessToken);

  // Upsert by user_id (one config per user)
  const [row] = await db.insert(metaConfig).values({
    userId: c.var.userId,
    accessToken: encryptedToken,
    phoneNumberId,
    businessAccountId,
    displayPhoneNumber: verified.display_phone_number,
    enabled: true,
    lastVerifiedAt: new Date(),
  }).onConflictDoUpdate({
    target: metaConfig.userId,
    set: {
      accessToken: encryptedToken,
      phoneNumberId,
      businessAccountId,
      displayPhoneNumber: verified.display_phone_number,
      enabled: true,
      lastVerifiedAt: new Date(),
      updatedAt: new Date(),
    },
  }).returning();

  return c.json({
    id: row.id,
    phone_number_id: row.phoneNumberId,
    business_account_id: row.businessAccountId,
    display_phone_number: row.displayPhoneNumber,
    verified_name: verified.verified_name,
    quality_rating: verified.quality_rating,
    enabled: row.enabled,
    last_verified_at: row.lastVerifiedAt,
  });
});

// Test the saved credentials without changing them.
app.post("/integrations/meta/test", async (c) => {
  const [row] = await db.select().from(metaConfig)
    .where(eq(metaConfig.userId, c.var.userId)).limit(1);
  if (!row) return c.json({ error: "No Meta config saved" }, 404);

  try {
    const verified = await verifyCredentials({
      accessToken: decrypt(row.accessToken),
      phoneNumberId: row.phoneNumberId,
      businessAccountId: row.businessAccountId,
    });
    await db.update(metaConfig).set({ lastVerifiedAt: new Date() })
      .where(eq(metaConfig.userId, c.var.userId));
    return c.json({ ok: true, ...verified });
  } catch (err) {
    if (err instanceof MetaApiError) {
      return c.json({ ok: false, error: err.message }, 400);
    }
    throw err;
  }
});

app.delete("/integrations/meta", async (c) => {
  await db.delete(metaConfig).where(eq(metaConfig.userId, c.var.userId));
  return c.body(null, 204);
});

// List templates from the user's WABA — used by Templates and Broadcasts pages.
app.get("/integrations/meta/templates", async (c) => {
  const [row] = await db.select().from(metaConfig)
    .where(eq(metaConfig.userId, c.var.userId)).limit(1);
  if (!row) return c.json({ error: "No Meta config saved" }, 404);
  if (!row.businessAccountId) return c.json({ error: "business_account_id not set" }, 400);

  try {
    const out = await listMetaTemplates({
      accessToken: decrypt(row.accessToken),
      phoneNumberId: row.phoneNumberId,
      businessAccountId: row.businessAccountId,
    });
    return c.json(out);
  } catch (err) {
    if (err instanceof MetaApiError) {
      const status = err.status >= 400 && err.status < 600 ? (err.status as 400 | 401 | 403 | 404 | 500) : 500;
      return c.json({ error: err.message }, status);
    }
    throw err;
  }
});

export default app;
