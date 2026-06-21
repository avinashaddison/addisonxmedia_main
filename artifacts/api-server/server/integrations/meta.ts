// Thin wrapper around the Meta WhatsApp Business Cloud API.
// https://developers.facebook.com/docs/whatsapp/cloud-api
//
// Per-user credentials live in the meta_config table. This module is stateless —
// each call takes credentials. Webhook routing is handled in routes/webhooks.ts.

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export type MetaCredentials = {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string | null;
};

class MetaApiError extends Error {
  status: number;
  meta: unknown;
  constructor(message: string, status: number, meta?: unknown) {
    super(message);
    this.status = status;
    this.meta = meta;
  }
}

async function metaFetch<T>(
  path: string,
  init: RequestInit & { token: string }
): Promise<T> {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${init.token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const msg = body?.error?.message ?? `Meta API ${res.status}`;
    throw new MetaApiError(msg, res.status, body);
  }
  return body as T;
}

// Verify credentials by fetching the phone number's display info.
// Used by /api/integrations/meta/test.
export async function verifyCredentials(creds: MetaCredentials): Promise<{
  display_phone_number: string;
  verified_name?: string;
  quality_rating?: string;
}> {
  return metaFetch(
    `/${creds.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`,
    { method: "GET", token: creds.accessToken }
  );
}

// Send a free-form text message (only valid in 24-hour window after a customer message).
// For first-contact / outside window, use sendTemplateMessage instead.
export async function sendTextMessage(
  creds: MetaCredentials,
  to: string,
  body: string
): Promise<{ messages: Array<{ id: string }> }> {
  return metaFetch(`/${creds.phoneNumberId}/messages`, {
    method: "POST",
    token: creds.accessToken,
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body },
    }),
  });
}

// Send an image to the user. The image must be a public HTTPS URL that Meta
// can download — they fetch + re-host before delivery. Caption supports
// WhatsApp formatting (*bold*, _italic_, ~strike~, ```mono```).
export async function sendImageMessage(
  creds: MetaCredentials,
  to: string,
  imageUrl: string,
  caption?: string,
): Promise<{ messages: Array<{ id: string }> }> {
  return metaFetch(`/${creds.phoneNumberId}/messages`, {
    method: "POST",
    token: creds.accessToken,
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "image",
      image: {
        link: imageUrl,
        ...(caption ? { caption } : {}),
      },
    }),
  });
}

// Send a video. Same shape as image — public HTTPS URL Meta downloads + re-hosts.
// Supported: mp4, 3gpp. Max 16 MB. Caption optional.
export async function sendVideoMessage(
  creds: MetaCredentials,
  to: string,
  videoUrl: string,
  caption?: string,
): Promise<{ messages: Array<{ id: string }> }> {
  return metaFetch(`/${creds.phoneNumberId}/messages`, {
    method: "POST",
    token: creds.accessToken,
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "video",
      video: { link: videoUrl, ...(caption ? { caption } : {}) },
    }),
  });
}

// Send a document (PDF, DOCX, XLSX, etc.). Max 100 MB. Filename optional —
// shown to the recipient if provided, otherwise WhatsApp derives from URL.
export async function sendDocumentMessage(
  creds: MetaCredentials,
  to: string,
  documentUrl: string,
  filename?: string,
  caption?: string,
): Promise<{ messages: Array<{ id: string }> }> {
  return metaFetch(`/${creds.phoneNumberId}/messages`, {
    method: "POST",
    token: creds.accessToken,
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "document",
      document: {
        link: documentUrl,
        ...(filename ? { filename } : {}),
        ...(caption ? { caption } : {}),
      },
    }),
  });
}

// Send audio (voice note style — no caption support). Supported: aac, mp4, mpeg, amr, ogg.
export async function sendAudioMessage(
  creds: MetaCredentials,
  to: string,
  audioUrl: string,
): Promise<{ messages: Array<{ id: string }> }> {
  return metaFetch(`/${creds.phoneNumberId}/messages`, {
    method: "POST",
    token: creds.accessToken,
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "audio",
      audio: { link: audioUrl },
    }),
  });
}

// Send an approved template message (works outside 24h window). Used for broadcasts.
export async function sendTemplateMessage(
  creds: MetaCredentials,
  to: string,
  templateName: string,
  language: string,
  parameters: string[] = []
): Promise<{ messages: Array<{ id: string }> }> {
  const components = parameters.length > 0
    ? [{
        type: "body",
        parameters: parameters.map((text) => ({ type: "text", text })),
      }]
    : [];
  return metaFetch(`/${creds.phoneNumberId}/messages`, {
    method: "POST",
    token: creds.accessToken,
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: language },
        ...(components.length > 0 ? { components } : {}),
      },
    }),
  });
}

// Mark an inbound message as "read" so the user sees the blue ticks on their phone.
export async function markMessageRead(
  creds: MetaCredentials,
  messageId: string
): Promise<{ success: boolean }> {
  return metaFetch(`/${creds.phoneNumberId}/messages`, {
    method: "POST",
    token: creds.accessToken,
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    }),
  });
}

// Create a message template — submits to Meta for review. Response includes
// a template id and initial status (usually PENDING; sometimes APPROVED
// instantly if the body is simple + matches a known pattern).
//
// Meta's approval typically takes 10-60 minutes for utility/marketing,
// faster for authentication. Rejected templates can be resubmitted after
// fixing the rejection reason (which appears on the template detail page
// in WhatsApp Manager).
//
// Body placeholders use {{1}}, {{2}}, etc. Meta requires the body to start
// with a placeholder OR a clear identifier (else they flag it as
// "low-quality"). We don't enforce that here — the customer learns by doing.
export type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";

export type TemplateComponent =
  | { type: "HEADER"; format: "TEXT"; text: string }
  | { type: "BODY"; text: string }
  | { type: "FOOTER"; text: string }
  | { type: "BUTTONS"; buttons: Array<{ type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER"; text: string; url?: string; phone_number?: string }> };

export type CreateTemplateRequest = {
  name: string;            // lowercase, snake_case, ≤ 512 chars
  category: TemplateCategory;
  language: string;        // e.g. "en", "en_US", "hi"
  components: TemplateComponent[];
};

export async function createMessageTemplate(
  creds: MetaCredentials,
  req: CreateTemplateRequest,
): Promise<{ id: string; status: string; category: string }> {
  if (!creds.businessAccountId) {
    throw new MetaApiError("businessAccountId is required to create templates", 400);
  }
  return metaFetch(
    `/${creds.businessAccountId}/message_templates`,
    {
      method: "POST",
      token: creds.accessToken,
      body: JSON.stringify(req),
    },
  );
}

export async function deleteMessageTemplate(
  creds: MetaCredentials,
  templateName: string,
): Promise<{ success: boolean }> {
  if (!creds.businessAccountId) {
    throw new MetaApiError("businessAccountId is required to delete templates", 400);
  }
  return metaFetch(
    `/${creds.businessAccountId}/message_templates?name=${encodeURIComponent(templateName)}`,
    {
      method: "DELETE",
      token: creds.accessToken,
    },
  );
}

// List approved message templates from a WABA. Requires businessAccountId.
export async function listTemplates(
  creds: MetaCredentials
): Promise<{ data: Array<{
  name: string;
  language: string;
  status: string;
  category: string;
  components: Array<{ type: string; text?: string; format?: string }>;
}> }> {
  if (!creds.businessAccountId) {
    throw new MetaApiError("businessAccountId is required to list templates", 400);
  }
  return metaFetch(
    `/${creds.businessAccountId}/message_templates?limit=100`,
    { method: "GET", token: creds.accessToken }
  );
}

// ── WhatsApp Business Profile (about/description/address/email/websites/vertical) ──
// This is the public-facing info customers see on the WhatsApp number — read +
// write via /{phone-number-id}/whatsapp_business_profile. Profile photo is
// intentionally omitted: Meta requires a `profile_picture_handle` from their
// Resumable Upload API, which is a multi-step flow we haven't wired yet.

export type WhatsAppBusinessProfile = {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  profile_picture_url?: string;
  websites?: string[];
  vertical?: string;
  messaging_product?: string;
};

const PROFILE_FIELDS = [
  "about", "address", "description", "email",
  "profile_picture_url", "websites", "vertical",
].join(",");

export async function getBusinessProfile(creds: MetaCredentials): Promise<WhatsAppBusinessProfile> {
  // Meta wraps the profile in { data: [ {...} ] } — always an array of one.
  const res = await metaFetch<{ data: WhatsAppBusinessProfile[] }>(
    `/${creds.phoneNumberId}/whatsapp_business_profile?fields=${PROFILE_FIELDS}`,
    { method: "GET", token: creds.accessToken }
  );
  return res.data?.[0] ?? {};
}

export type WhatsAppBusinessProfileUpdate = {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  websites?: string[];
  vertical?: string;
};

export async function updateBusinessProfile(
  creds: MetaCredentials,
  fields: WhatsAppBusinessProfileUpdate,
): Promise<{ success: boolean }> {
  // Meta requires messaging_product: "whatsapp" on every write. Only send the
  // keys that are actually provided — passing `undefined` would null them out.
  const body: Record<string, unknown> = { messaging_product: "whatsapp" };
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null) body[k] = v;
  }
  return metaFetch(`/${creds.phoneNumberId}/whatsapp_business_profile`, {
    method: "POST",
    token: creds.accessToken,
    body: JSON.stringify(body),
  });
}

// ─── Meta API capability probes for the diagnostics panel ──────────────────

/** Lists every permission the access token currently holds. Used by
 *  /api/admin/diagnostics/meta-permissions to show admins which Advanced
 *  Access permissions they already have (vs which need an App Review). */
export async function listAccessTokenPermissions(accessToken: string): Promise<{
  data: Array<{ permission: string; status: "granted" | "declined" }>;
}> {
  return metaFetch("/me/permissions", { method: "GET", token: accessToken });
}

/** Reads the WABA's messaging tier (e.g. TIER_1K, TIER_10K, TIER_100K, UNLIMITED)
 *  + quality rating. Surfaced in the topbar so the operator knows their
 *  current daily-message allowance without leaving the app. */
export async function getWabaMessagingTier(creds: MetaCredentials): Promise<{
  messaging_limit_tier?: string;
  quality_score?: { score?: string };
  display_phone_number?: string;
  verified_name?: string;
}> {
  return metaFetch(`/${creds.phoneNumberId}?fields=messaging_limit_tier,quality_score,display_phone_number,verified_name`,
    { method: "GET", token: creds.accessToken });
}

// ─── WhatsApp Catalog (Commerce API) ───────────────────────────────────────
//
// Verified-business unlock. Customer browses your products inside the
// WhatsApp chat itself ("single product message" or "multi product message")
// instead of clicking a link card to a website.

export type CatalogProduct = {
  id: string;
  retailer_id: string;
  name: string;
  description?: string;
  price?: string;
  currency?: string;
  url?: string;
  image_url?: string;
  availability?: "in stock" | "out of stock";
};

/** Lists products in a catalog. */
export async function listCatalogProducts(
  catalogId: string,
  accessToken: string,
  options?: { limit?: number; after?: string }
): Promise<{ data: CatalogProduct[]; paging?: { cursors?: { after?: string }; next?: string } }> {
  const params = new URLSearchParams({
    fields: "id,retailer_id,name,description,price,currency,url,image_url,availability",
    limit: String(options?.limit ?? 20),
  });
  if (options?.after) params.set("after", options.after);
  return metaFetch(`/${catalogId}/products?${params}`, { method: "GET", token: accessToken });
}

/** Sends a single-product message — image + price + "View" button in chat. */
export async function sendSingleProductMessage(
  creds: MetaCredentials,
  params: { to: string; catalogId: string; productRetailerId: string; bodyText?: string; footerText?: string }
): Promise<{ messages: Array<{ id: string }> }> {
  return metaFetch(`/${creds.phoneNumberId}/messages`, {
    method: "POST",
    token: creds.accessToken,
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: params.to,
      type: "interactive",
      interactive: {
        type: "product",
        body: params.bodyText ? { text: params.bodyText } : undefined,
        footer: params.footerText ? { text: params.footerText } : undefined,
        action: {
          catalog_id: params.catalogId,
          product_retailer_id: params.productRetailerId,
        },
      },
    }),
  });
}

/** Multi-product carousel — up to 30 items split across up to 10 sections. */
export async function sendMultiProductMessage(
  creds: MetaCredentials,
  params: {
    to: string;
    catalogId: string;
    headerText: string;
    bodyText: string;
    sections: Array<{ title: string; productRetailerIds: string[] }>;
    footerText?: string;
  }
): Promise<{ messages: Array<{ id: string }> }> {
  return metaFetch(`/${creds.phoneNumberId}/messages`, {
    method: "POST",
    token: creds.accessToken,
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: params.to,
      type: "interactive",
      interactive: {
        type: "product_list",
        header: { type: "text", text: params.headerText },
        body: { text: params.bodyText },
        footer: params.footerText ? { text: params.footerText } : undefined,
        action: {
          catalog_id: params.catalogId,
          sections: params.sections.map((s) => ({
            title: s.title,
            product_items: s.productRetailerIds.map((id) => ({ product_retailer_id: id })),
          })),
        },
      },
    }),
  });
}

// ─── Meta Conversions API (CAPI) ──────────────────────────────────────────
//
// Sends server-side conversion events to Meta's Pixel/Dataset so the algorithm
// can optimize Click-to-WhatsApp ads on actual revenue (not just message
// volume). PII is SHA-256 hashed per Meta's matching-key format.

import crypto from "node:crypto";

const sha = (s: string) => crypto.createHash("sha256").update(s.trim().toLowerCase()).digest("hex");

export type CapiEvent = {
  event_name: "Lead" | "Purchase" | "CompleteRegistration" | "Subscribe" | "Contact";
  event_time: number;
  event_id: string;
  action_source: "system_generated" | "website" | "business_messaging";
  user_data: {
    em?: string[];
    ph?: string[];
    fn?: string[];
    ln?: string[];
    external_id?: string[];
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string;
    fbp?: string;
  };
  custom_data?: {
    currency?: string;
    value?: number;
    content_name?: string;
    content_category?: string;
    content_ids?: string[];
  };
};

export const hashForCapi = (raw: string): string => sha(raw);

export function buildCapiUserData(input: {
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  externalId?: string | null;
  ctwaClickId?: string | null;
}): CapiEvent["user_data"] {
  const data: CapiEvent["user_data"] = {};
  if (input.email) data.em = [sha(input.email)];
  if (input.phone) data.ph = [sha(input.phone.replace(/\D/g, ""))];
  if (input.name) {
    const parts = input.name.trim().split(/\s+/);
    data.fn = [sha(parts[0] ?? "")];
    if (parts.length > 1) data.ln = [sha(parts.slice(1).join(" "))];
  }
  if (input.externalId) data.external_id = [sha(input.externalId)];
  if (input.ctwaClickId) data.fbc = `fb.1.${Date.now()}.${input.ctwaClickId}`;
  return data;
}

export async function sendCapiEvent(params: {
  pixelId: string;
  accessToken: string;
  events: CapiEvent[];
  testEventCode?: string;
}): Promise<{ events_received: number; messages: unknown[]; fbtrace_id?: string }> {
  const body: Record<string, unknown> = { data: params.events };
  if (params.testEventCode) body.test_event_code = params.testEventCode;
  return metaFetch(`/${params.pixelId}/events`, {
    method: "POST",
    token: params.accessToken,
    body: JSON.stringify(body),
  });
}

export { MetaApiError };
