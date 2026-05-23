import { Hono } from "hono";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { metaConfig, user } from "../db/schema";
import { requireAuth, type AuthVariables } from "../middleware/auth";
import {
  verifyCredentials,
  listTemplates as listMetaTemplates,
  createMessageTemplate,
  deleteMessageTemplate,
  getBusinessProfile,
  updateBusinessProfile,
  type TemplateCategory,
  type TemplateComponent,
  MetaApiError,
} from "../integrations/meta";
import { encrypt, decrypt } from "../crypto";

const app = new Hono<{ Variables: AuthVariables }>();
app.use("*", requireAuth);

/** Mask an email like avi***@gmail.com — used in collision errors to confirm
 *  ownership without leaking enough info for account enumeration. */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "an account";
  const visible = local.slice(0, Math.min(3, Math.max(1, local.length - 2)));
  return `${visible}${"*".repeat(Math.max(2, local.length - visible.length))}@${domain}`;
}

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
  const force = body.force === true; // Set client-side after user confirms collision

  if (!accessToken || !phoneNumberId) {
    return c.json({ error: "access_token and phone_number_id are required" }, 400);
  }

  // Collision check — is this phone_number_id already owned by a DIFFERENT
  // user? If so, the inbound webhook is currently routing to them, not the
  // person trying to connect now. This is the #1 cause of "I don't see my
  // chats" support tickets. We refuse-with-info unless the caller passes
  // `force: true`, which the frontend sends only after the user explicitly
  // confirms they want to take ownership.
  if (!force) {
    const [existing] = await db.select().from(metaConfig)
      .where(eq(metaConfig.phoneNumberId, phoneNumberId)).limit(1);
    if (existing && existing.userId !== c.var.userId) {
      const [otherUser] = await db.select({ email: user.email, name: user.name })
        .from(user).where(eq(user.id, existing.userId)).limit(1);
      // Mask the email so a malicious actor can't enumerate accounts by
      // probing phone_number_ids. Reveal only enough for the legitimate owner
      // to recognize their own account.
      const maskedEmail = otherUser?.email ? maskEmail(otherUser.email) : "another account";
      return c.json({
        error: "collision",
        code: "PHONE_ALREADY_CLAIMED",
        message: `This WhatsApp number is already connected to ${maskedEmail}. If that account is also yours, log in there. If you intend to transfer the number, re-submit with confirmation.`,
        existingAccount: { masked_email: maskedEmail, connected_at: existing.lastVerifiedAt },
      }, 409);
    }
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

  // If force=true and another user owned the phone, transfer ownership of
  // that meta_config row to the current user. (Existing meta_config has a
  // UNIQUE on user_id, so we delete-then-insert via two-step.)
  if (force) {
    const [collider] = await db.select().from(metaConfig)
      .where(and(eq(metaConfig.phoneNumberId, phoneNumberId), sql`${metaConfig.userId} <> ${c.var.userId}`)).limit(1);
    if (collider) {
      await db.delete(metaConfig).where(eq(metaConfig.id, collider.id));
    }
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

// ── WhatsApp Business Profile (about/description/address/email/websites/vertical) ──
// Public-facing info on the WhatsApp number. Read + write via Meta's
// /{phone-number-id}/whatsapp_business_profile endpoint. Profile photo upload
// is intentionally not exposed yet — Meta requires the multi-step Resumable
// Upload API which we haven't wired.

// Meta v21 enum. Anything outside this list is rejected by Meta with an opaque
// error, so we validate up-front to give a useful message.
const VALID_VERTICALS = new Set([
  "UNDEFINED", "OTHER", "AUTO", "BEAUTY", "APPAREL", "EDU", "ENTERTAIN",
  "EVENT_PLAN", "FINANCE", "GROCERY", "GOVT", "HOTEL", "HEALTH", "NONPROFIT",
  "PROF_SERVICES", "RETAIL", "TRAVEL", "RESTAURANT", "NOT_A_BIZ",
]);

app.get("/integrations/meta/profile", async (c) => {
  const [row] = await db.select().from(metaConfig)
    .where(eq(metaConfig.userId, c.var.userId)).limit(1);
  if (!row) return c.json({ error: "No Meta config saved" }, 404);

  try {
    const profile = await getBusinessProfile({
      accessToken: decrypt(row.accessToken),
      phoneNumberId: row.phoneNumberId,
      businessAccountId: row.businessAccountId,
    });
    return c.json(profile);
  } catch (err) {
    if (err instanceof MetaApiError) {
      const status = err.status >= 400 && err.status < 600 ? (err.status as 400 | 401 | 403 | 404 | 500) : 500;
      return c.json({ error: err.message }, status);
    }
    throw err;
  }
});

app.patch("/integrations/meta/profile", async (c) => {
  const [row] = await db.select().from(metaConfig)
    .where(eq(metaConfig.userId, c.var.userId)).limit(1);
  if (!row) return c.json({ error: "No Meta config saved" }, 404);

  const body = await c.req.json<{
    about?: string;
    address?: string;
    description?: string;
    email?: string;
    websites?: string[];
    vertical?: string;
  }>();

  // Length / format validation — Meta returns opaque errors for these, so
  // catch them here with messages a customer can act on.
  const updates: {
    about?: string; address?: string; description?: string;
    email?: string; websites?: string[]; vertical?: string;
  } = {};

  if (body.about !== undefined) {
    const v = body.about.trim();
    if (v.length > 139) return c.json({ error: "About must be 139 characters or fewer" }, 400);
    updates.about = v;
  }
  if (body.address !== undefined) {
    const v = body.address.trim();
    if (v.length > 256) return c.json({ error: "Address must be 256 characters or fewer" }, 400);
    updates.address = v;
  }
  if (body.description !== undefined) {
    const v = body.description.trim();
    if (v.length > 512) return c.json({ error: "Description must be 512 characters or fewer" }, 400);
    updates.description = v;
  }
  if (body.email !== undefined) {
    const v = body.email.trim();
    if (v.length > 128) return c.json({ error: "Email must be 128 characters or fewer" }, 400);
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      return c.json({ error: "Email looks invalid" }, 400);
    }
    updates.email = v;
  }
  if (body.websites !== undefined) {
    const sites = body.websites.map((s) => s.trim()).filter(Boolean);
    if (sites.length > 2) return c.json({ error: "Up to 2 websites only" }, 400);
    for (const s of sites) {
      if (s.length > 256) return c.json({ error: "Each website must be 256 characters or fewer" }, 400);
      if (!/^https?:\/\//i.test(s)) return c.json({ error: `Website must start with http:// or https:// — got "${s}"` }, 400);
    }
    updates.websites = sites;
  }
  if (body.vertical !== undefined) {
    const v = body.vertical.trim().toUpperCase();
    if (v && !VALID_VERTICALS.has(v)) {
      return c.json({ error: `Invalid vertical "${v}"` }, 400);
    }
    updates.vertical = v;
  }

  if (Object.keys(updates).length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  try {
    await updateBusinessProfile({
      accessToken: decrypt(row.accessToken),
      phoneNumberId: row.phoneNumberId,
      businessAccountId: row.businessAccountId,
    }, updates);
    // Return the latest server state so the UI doesn't have to round-trip.
    const profile = await getBusinessProfile({
      accessToken: decrypt(row.accessToken),
      phoneNumberId: row.phoneNumberId,
      businessAccountId: row.businessAccountId,
    });
    return c.json(profile);
  } catch (err) {
    if (err instanceof MetaApiError) {
      const status = err.status >= 400 && err.status < 600 ? (err.status as 400 | 401 | 403 | 404 | 500) : 500;
      return c.json({ error: `Meta rejected: ${err.message}` }, status);
    }
    throw err;
  }
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

/* Create a message template — submits to Meta for review.
 *
 * Customer flow:
 *   1. Customer fills the create-template form on /app/templates
 *   2. We POST to {waba_id}/message_templates with the body
 *   3. Meta returns { id, status, category } — usually status=PENDING
 *   4. Within 10-60 min Meta approves/rejects — customer refreshes to see
 *
 * Validation here is intentionally light — Meta is the source of truth and
 * returns clear errors (e.g. "name must be lowercase", "body too long").
 * We surface those errors verbatim so the customer knows what to fix.
 */
app.post("/integrations/meta/templates", async (c) => {
  const [row] = await db.select().from(metaConfig)
    .where(eq(metaConfig.userId, c.var.userId)).limit(1);
  if (!row) return c.json({ error: "No Meta config saved" }, 404);
  if (!row.businessAccountId) return c.json({ error: "business_account_id not set" }, 400);

  type CreateBody = {
    name?: string;
    category?: TemplateCategory;
    language?: string;
    components?: TemplateComponent[];
  };
  const body = await c.req.json<CreateBody>().catch(() => ({} as CreateBody));
  if (!body.name || !body.category || !body.language || !body.components?.length) {
    return c.json({
      error: "Required: name, category, language, components[]",
    }, 400);
  }

  // Meta requires template names to be lowercase + snake_case (no spaces).
  // Pre-normalize so a copy-paste of a friendly name doesn't get rejected.
  const normalizedName = body.name.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_").slice(0, 512);

  try {
    const out = await createMessageTemplate(
      {
        accessToken: decrypt(row.accessToken),
        phoneNumberId: row.phoneNumberId,
        businessAccountId: row.businessAccountId,
      },
      {
        name: normalizedName,
        category: body.category,
        language: body.language,
        components: body.components,
      },
    );
    return c.json({ ok: true, ...out, name_submitted: normalizedName });
  } catch (err) {
    if (err instanceof MetaApiError) {
      const status = err.status >= 400 && err.status < 600 ? (err.status as 400 | 401 | 403 | 404 | 500) : 500;
      return c.json({
        error: err.message,
        // Common Meta error helpers — let the frontend toast suggest the fix
        hint: err.message.toLowerCase().includes("name") ? "Template names must be lowercase, snake_case, ≤ 512 chars."
            : err.message.toLowerCase().includes("body") ? "Body must include text + the right placeholder count {{1}}, {{2}}, etc."
            : err.message.toLowerCase().includes("category") ? "Pick MARKETING (promotional), UTILITY (transactional), or AUTHENTICATION (OTP)."
            : null,
      }, status);
    }
    throw err;
  }
});

/* Delete a template by name. Meta deletes ALL languages of that name. */
app.delete("/integrations/meta/templates/:name", async (c) => {
  const [row] = await db.select().from(metaConfig)
    .where(eq(metaConfig.userId, c.var.userId)).limit(1);
  if (!row) return c.json({ error: "No Meta config saved" }, 404);
  if (!row.businessAccountId) return c.json({ error: "business_account_id not set" }, 400);

  const templateName = c.req.param("name");
  if (!templateName) return c.json({ error: "name required" }, 400);

  try {
    await deleteMessageTemplate(
      {
        accessToken: decrypt(row.accessToken),
        phoneNumberId: row.phoneNumberId,
        businessAccountId: row.businessAccountId,
      },
      templateName,
    );
    return c.json({ ok: true });
  } catch (err) {
    if (err instanceof MetaApiError) {
      const status = err.status >= 400 && err.status < 600 ? (err.status as 400 | 401 | 403 | 404 | 500) : 500;
      return c.json({ error: err.message }, status);
    }
    throw err;
  }
});

export default app;
