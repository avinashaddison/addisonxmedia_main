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

export { MetaApiError };
