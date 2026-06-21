/**
 * Meta API expansion routes — covers the verified-business unlocks:
 *   - Permissions diagnostic (list scopes on access token)
 *   - WABA messaging tier display + refresh
 *   - WhatsApp Catalog (browse + send)
 *   - Conversions API (settings + test-fire + event log)
 *
 * All routes require user auth via the shared requireAuth middleware.
 * Cred resolution: meta_config table, scoped to c.var.userId.
 */

import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { metaConfig, metaCapiEvent } from "../db/schema";
import { requireAuth, type AuthVariables } from "../middleware/auth";
import {
  listAccessTokenPermissions, getWabaMessagingTier,
  listCatalogProducts, sendSingleProductMessage, sendMultiProductMessage,
  sendCapiEvent, buildCapiUserData, MetaApiError, type CapiEvent,
} from "../integrations/meta";
import { decrypt } from "../crypto";

const app = new Hono<{ Variables: AuthVariables }>();
app.use("*", requireAuth);

/** Resolves the calling user's Meta credentials. Returns null when the
 *  user hasn't connected Meta yet (frontend shows the "Connect WhatsApp"
 *  CTA from inbox empty-state instead). */
async function loadCreds(userId: string) {
  const [cfg] = await db.select().from(metaConfig).where(eq(metaConfig.userId, userId)).limit(1);
  if (!cfg) return null;
  try {
    return {
      accessToken: decrypt(cfg.accessToken),
      phoneNumberId: cfg.phoneNumberId,
      businessAccountId: cfg.businessAccountId,
      catalogId: cfg.catalogId,
      pixelId: cfg.pixelId,
      capiEnabled: cfg.capiEnabled,
      capiTestEventCode: cfg.capiTestEventCode,
    };
  } catch {
    return null;
  }
}

// ─── 1. Permissions diagnostic ─────────────────────────────────────────────

app.get("/meta/permissions", async (c) => {
  const creds = await loadCreds(c.var.userId);
  if (!creds) return c.json({ error: "Meta not connected" }, 404);
  try {
    const result = await listAccessTokenPermissions(creds.accessToken);
    return c.json({
      permissions: result.data,
      summary: {
        // High-value permissions we use across the product.
        hasWabaManagement: result.data.some((p) => p.permission === "whatsapp_business_management" && p.status === "granted"),
        hasWabaMessaging:  result.data.some((p) => p.permission === "whatsapp_business_messaging" && p.status === "granted"),
        hasAdsManagement:  result.data.some((p) => p.permission === "ads_management" && p.status === "granted"),
        hasCatalog:        result.data.some((p) => p.permission === "catalog_management" && p.status === "granted"),
        hasInstagramMsg:   result.data.some((p) => p.permission === "instagram_manage_messages" && p.status === "granted"),
        hasLeadsRetrieval: result.data.some((p) => p.permission === "leads_retrieval" && p.status === "granted"),
      },
    });
  } catch (err) {
    const e = err as MetaApiError;
    return c.json({ error: e.message ?? "Permissions probe failed", status: e.status ?? 500 }, 502);
  }
});

// ─── 2. Messaging tier display ─────────────────────────────────────────────

app.post("/meta/refresh-tier", async (c) => {
  const creds = await loadCreds(c.var.userId);
  if (!creds) return c.json({ error: "Meta not connected" }, 404);
  try {
    const tier = await getWabaMessagingTier({
      accessToken: creds.accessToken,
      phoneNumberId: creds.phoneNumberId,
    });
    // Cache on meta_config so the topbar can show without an API call every time
    await db.update(metaConfig).set({
      messagingLimitTier: tier.messaging_limit_tier ?? null,
      qualityRating: tier.quality_score?.score ?? null,
      tierRefreshedAt: new Date(),
    }).where(eq(metaConfig.userId, c.var.userId));
    return c.json({
      messagingLimitTier: tier.messaging_limit_tier ?? null,
      qualityRating: tier.quality_score?.score ?? null,
      displayPhoneNumber: tier.display_phone_number ?? null,
      verifiedName: tier.verified_name ?? null,
      refreshedAt: new Date().toISOString(),
    });
  } catch (err) {
    const e = err as MetaApiError;
    return c.json({ error: e.message ?? "Tier probe failed", status: e.status ?? 500 }, 502);
  }
});

app.get("/meta/tier", async (c) => {
  const [cfg] = await db.select({
    messagingLimitTier: metaConfig.messagingLimitTier,
    qualityRating: metaConfig.qualityRating,
    tierRefreshedAt: metaConfig.tierRefreshedAt,
  }).from(metaConfig).where(eq(metaConfig.userId, c.var.userId)).limit(1);
  if (!cfg) return c.json(null);
  return c.json(cfg);
});

// ─── 3. WhatsApp Catalog ───────────────────────────────────────────────────

app.patch("/meta/catalog/settings", async (c) => {
  const body = await c.req.json<{ catalog_id?: string | null }>();
  if (body.catalog_id !== undefined) {
    await db.update(metaConfig)
      .set({ catalogId: body.catalog_id || null })
      .where(eq(metaConfig.userId, c.var.userId));
  }
  return c.json({ ok: true });
});

app.get("/meta/catalog/products", async (c) => {
  const creds = await loadCreds(c.var.userId);
  if (!creds) return c.json({ error: "Meta not connected" }, 404);
  if (!creds.catalogId) return c.json({ error: "No catalog_id set — go to Settings → Integrations → WhatsApp → Catalog" }, 400);
  const after = c.req.query("after");
  try {
    const result = await listCatalogProducts(creds.catalogId, creds.accessToken, { after, limit: 30 });
    return c.json(result);
  } catch (err) {
    const e = err as MetaApiError;
    return c.json({ error: e.message, status: e.status }, 502);
  }
});

app.post("/meta/catalog/send-product", async (c) => {
  const creds = await loadCreds(c.var.userId);
  if (!creds) return c.json({ error: "Meta not connected" }, 404);
  if (!creds.catalogId) return c.json({ error: "No catalog_id set" }, 400);

  const body = await c.req.json<{ to: string; product_retailer_id: string; body_text?: string; footer_text?: string }>();
  if (!body.to || !body.product_retailer_id) {
    return c.json({ error: "to and product_retailer_id are required" }, 400);
  }
  try {
    const result = await sendSingleProductMessage({
      accessToken: creds.accessToken,
      phoneNumberId: creds.phoneNumberId,
    }, {
      to: body.to,
      catalogId: creds.catalogId,
      productRetailerId: body.product_retailer_id,
      bodyText: body.body_text,
      footerText: body.footer_text,
    });
    return c.json({ ok: true, messageId: result.messages[0]?.id });
  } catch (err) {
    const e = err as MetaApiError;
    return c.json({ error: e.message, status: e.status }, 502);
  }
});

app.post("/meta/catalog/send-list", async (c) => {
  const creds = await loadCreds(c.var.userId);
  if (!creds) return c.json({ error: "Meta not connected" }, 404);
  if (!creds.catalogId) return c.json({ error: "No catalog_id set" }, 400);

  const body = await c.req.json<{
    to: string;
    header_text: string;
    body_text: string;
    sections: Array<{ title: string; product_retailer_ids: string[] }>;
    footer_text?: string;
  }>();
  if (!body.to || !body.sections?.length) return c.json({ error: "to + sections required" }, 400);

  try {
    const result = await sendMultiProductMessage({
      accessToken: creds.accessToken,
      phoneNumberId: creds.phoneNumberId,
    }, {
      to: body.to,
      catalogId: creds.catalogId,
      headerText: body.header_text,
      bodyText: body.body_text,
      footerText: body.footer_text,
      sections: body.sections.map((s) => ({
        title: s.title,
        productRetailerIds: s.product_retailer_ids,
      })),
    });
    return c.json({ ok: true, messageId: result.messages[0]?.id });
  } catch (err) {
    const e = err as MetaApiError;
    return c.json({ error: e.message, status: e.status }, 502);
  }
});

// ─── 4. Conversions API ───────────────────────────────────────────────────

app.get("/meta/capi/settings", async (c) => {
  const [cfg] = await db.select({
    pixelId: metaConfig.pixelId,
    capiEnabled: metaConfig.capiEnabled,
    capiTestEventCode: metaConfig.capiTestEventCode,
  }).from(metaConfig).where(eq(metaConfig.userId, c.var.userId)).limit(1);
  return c.json(cfg ?? { pixelId: null, capiEnabled: false, capiTestEventCode: null });
});

app.patch("/meta/capi/settings", async (c) => {
  const body = await c.req.json<{
    pixel_id?: string | null;
    capi_enabled?: boolean;
    capi_test_event_code?: string | null;
  }>();
  const update: Record<string, unknown> = {};
  if (body.pixel_id !== undefined) update.pixelId = body.pixel_id || null;
  if (body.capi_enabled !== undefined) update.capiEnabled = body.capi_enabled;
  if (body.capi_test_event_code !== undefined) update.capiTestEventCode = body.capi_test_event_code || null;
  if (Object.keys(update).length === 0) return c.json({ ok: true });
  await db.update(metaConfig).set(update).where(eq(metaConfig.userId, c.var.userId));
  return c.json({ ok: true });
});

/** Fire a dummy Lead event so customer can verify their Pixel + token wiring.
 *  Routes through meta-capi.fireTestEvent so the event lands in the
 *  Recent events table (the old inline implementation forgot to persist,
 *  leaving customers staring at "Recent events (0)" after a successful fire). */
app.post("/meta/capi/test-fire", async (c) => {
  const { fireTestEvent } = await import("../lib/meta-capi");
  const outcome = await fireTestEvent(c.var.userId);
  if (!outcome.fired) {
    return c.json({
      ok: false,
      error: outcome.reason ?? "fire_failed",
      hint: outcome.reason === "no_pixel_id"     ? "Set pixel_id first"
          : outcome.reason === "capi_disabled"   ? "Toggle CAPI enabled first"
          : outcome.reason === "no_meta_config"  ? "Connect Meta first"
          : outcome.reason === "no_access_token" ? "Meta token is missing"
          : null,
    }, 502);
  }
  return c.json({ ok: true, eventId: outcome.eventId, responseCode: outcome.responseCode });
});

app.get("/meta/capi/events", async (c) => {
  const rows = await db.select()
    .from(metaCapiEvent)
    .where(eq(metaCapiEvent.ownerId, c.var.userId))
    .orderBy(desc(metaCapiEvent.firedAt))
    .limit(50);
  return c.json(rows);
});

export default app;
