/**
 * Wrapper around the Meta Conversions API (CAPI) wired to our domain events.
 *
 * Public callers don't construct CAPI events directly. They call one of:
 *   - fireLeadEvent(userId, contact)
 *   - firePurchaseEvent(userId, deal)
 *
 * Each function:
 *   1. Resolves the user's pixel_id + access_token from meta_config
 *   2. Hashes PII into Meta's match keys
 *   3. Generates a deterministic event_id (so retries don't double-count)
 *   4. Sends the event to /<pixel_id>/events
 *   5. Persists the result into meta_capi_event for audit + dedupe
 *
 * Silent no-op when capi is disabled or pixel not configured.
 */

import { db } from "../db/client";
import { metaConfig, metaCapiEvent, contact, deal, conversation, user } from "../db/schema";
import { and, eq } from "drizzle-orm";
import { sendCapiEvent, buildCapiUserData, type CapiEvent } from "../integrations/meta";
import { decrypt } from "../crypto";
import crypto from "node:crypto";

const stableEventId = (kind: string, ...parts: string[]) =>
  crypto.createHash("sha256").update([kind, ...parts].join(":")).digest("hex").slice(0, 32);

type CapiOutcome = { fired: boolean; reason?: string; eventId?: string; responseCode?: number };

async function loadCapiCreds(ownerId: string) {
  const [cfg] = await db.select().from(metaConfig).where(eq(metaConfig.userId, ownerId)).limit(1);
  if (!cfg) return { ok: false as const, reason: "no_meta_config" };
  if (!cfg.capiEnabled) return { ok: false as const, reason: "capi_disabled" };
  if (!cfg.pixelId) return { ok: false as const, reason: "no_pixel_id" };
  if (!cfg.accessToken) return { ok: false as const, reason: "no_access_token" };
  let token: string;
  try { token = decrypt(cfg.accessToken); } catch { return { ok: false as const, reason: "decrypt_failed" }; }
  return { ok: true as const, pixelId: cfg.pixelId, token, testCode: cfg.capiTestEventCode ?? undefined };
}

async function persistEvent(input: {
  ownerId: string;
  event: CapiEvent;
  sourceType: string;
  sourceId: string;
  responseCode: number | null;
  responseBody: unknown;
}) {
  // ON CONFLICT no-op via the unique event_id constraint — repeat fires of
  // the same logical event are silently ignored.
  await db.insert(metaCapiEvent).values({
    ownerId: input.ownerId,
    eventName: input.event.event_name,
    eventId: input.event.event_id,
    eventTime: new Date(input.event.event_time * 1000),
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    valueInr: input.event.custom_data?.value !== undefined ? String(input.event.custom_data.value) : null,
    currency: input.event.custom_data?.currency ?? "INR",
    userData: input.event.user_data as Record<string, unknown>,
    customData: input.event.custom_data as Record<string, unknown> | undefined,
    responseCode: input.responseCode,
    responseBody: input.responseBody as Record<string, unknown> | null,
  }).onConflictDoNothing();
}

/** Fires a "Lead" event when a new contact first reaches the workspace —
 *  ideally with ctwa_click_id from the source conversation so Meta's
 *  attribution model gets a 1:1 ad-click → lead match. */
export async function fireLeadEvent(ownerId: string, contactId: string, opts?: { ctwaClickId?: string | null }): Promise<CapiOutcome> {
  const creds = await loadCapiCreds(ownerId);
  if (!creds.ok) return { fired: false, reason: creds.reason };

  const [c] = await db.select().from(contact).where(and(eq(contact.id, contactId), eq(contact.ownerId, ownerId))).limit(1);
  if (!c) return { fired: false, reason: "contact_not_found" };

  // If we weren't passed a ctwa click id, look up the conversation's
  // source attribution — that's where webhook stamps it.
  let ctwaClickId = opts?.ctwaClickId ?? null;
  if (!ctwaClickId) {
    const [conv] = await db.select({ ctwaClickId: conversation.ctwaClickId })
      .from(conversation)
      .where(and(eq(conversation.contactId, contactId), eq(conversation.ownerId, ownerId)))
      .limit(1);
    ctwaClickId = conv?.ctwaClickId ?? null;
  }

  const event: CapiEvent = {
    event_name: "Lead",
    event_time: Math.floor(Date.now() / 1000),
    event_id: stableEventId("lead", contactId),
    action_source: "business_messaging",
    user_data: buildCapiUserData({
      email: c.email,
      phone: c.phone,
      name: c.name,
      externalId: c.id,
      ctwaClickId,
    }),
    custom_data: {
      content_name: c.name ?? "WhatsApp lead",
      content_category: c.source ?? "WhatsApp",
    },
  };

  try {
    const resp = await sendCapiEvent({
      pixelId: creds.pixelId,
      accessToken: creds.token,
      events: [event],
      testEventCode: creds.testCode,
    });
    await persistEvent({ ownerId, event, sourceType: "contact_created", sourceId: contactId, responseCode: 200, responseBody: resp });
    return { fired: true, eventId: event.event_id, responseCode: 200 };
  } catch (err) {
    const e = err as { status?: number; message?: string; meta?: unknown };
    await persistEvent({ ownerId, event, sourceType: "contact_created", sourceId: contactId, responseCode: e.status ?? 500, responseBody: { error: e.message, meta: e.meta } });
    return { fired: false, reason: e.message ?? "send_failed" };
  }
}

/** Fires a "Purchase" event when a deal hits stage=won, with the deal's
 *  value as the conversion value. Meta uses this to optimize bidding. */
export async function firePurchaseEvent(ownerId: string, dealId: string): Promise<CapiOutcome> {
  const creds = await loadCapiCreds(ownerId);
  if (!creds.ok) return { fired: false, reason: creds.reason };

  const [d] = await db.select().from(deal).where(and(eq(deal.id, dealId), eq(deal.ownerId, ownerId))).limit(1);
  if (!d) return { fired: false, reason: "deal_not_found" };
  if (d.stage !== "won") return { fired: false, reason: "deal_not_won" };

  // Pull the deal's linked contact for match keys + conversation for ctwa
  const contactRow = d.contactId
    ? (await db.select().from(contact).where(eq(contact.id, d.contactId)).limit(1))[0]
    : null;
  const convRow = d.conversationId
    ? (await db.select({ ctwaClickId: conversation.ctwaClickId }).from(conversation).where(eq(conversation.id, d.conversationId)).limit(1))[0]
    : null;

  const event: CapiEvent = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    event_id: stableEventId("purchase", dealId),
    action_source: "business_messaging",
    user_data: buildCapiUserData({
      email: contactRow?.email ?? null,
      phone: contactRow?.phone ?? null,
      name: contactRow?.name ?? null,
      externalId: contactRow?.id ?? null,
      ctwaClickId: convRow?.ctwaClickId ?? null,
    }),
    custom_data: {
      currency: "INR",
      value: Number(d.value ?? 0),
      content_name: d.title ?? "Deal won",
      content_category: "WhatsApp deal",
      content_ids: [dealId],
    },
  };

  try {
    const resp = await sendCapiEvent({
      pixelId: creds.pixelId,
      accessToken: creds.token,
      events: [event],
      testEventCode: creds.testCode,
    });
    await persistEvent({ ownerId, event, sourceType: "deal_won", sourceId: dealId, responseCode: 200, responseBody: resp });
    return { fired: true, eventId: event.event_id, responseCode: 200 };
  } catch (err) {
    const e = err as { status?: number; message?: string; meta?: unknown };
    await persistEvent({ ownerId, event, sourceType: "deal_won", sourceId: dealId, responseCode: e.status ?? 500, responseBody: { error: e.message, meta: e.meta } });
    return { fired: false, reason: e.message ?? "send_failed" };
  }
}

/** Helper that swallows errors — call from non-critical hook sites where
 *  we don't want CAPI failures to break the actual user-facing operation. */
export async function fireCapiSafely(fn: () => Promise<CapiOutcome>, label: string): Promise<void> {
  try {
    const outcome = await fn();
    if (!outcome.fired) {
      console.log(`[capi ${label}] not fired — ${outcome.reason}`);
    } else {
      console.log(`[capi ${label}] fired event_id=${outcome.eventId}`);
    }
  } catch (e) {
    console.error(`[capi ${label}] threw`, e);
  }
}
