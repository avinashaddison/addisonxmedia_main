/**
 * Cashfree Payment Gateway client — v2023-08-01.
 *
 * Why hand-rolled instead of the official `cashfree-pg` SDK:
 *   - SDK pulls axios + a lot of type bloat for what is effectively three
 *     fetch calls + one HMAC verify
 *   - we need fine control over the raw response body for webhook signature
 *     verification (SDKs hide that)
 *   - lets us swap sandbox/production cleanly via a single env var
 *
 * Docs (current): https://www.cashfree.com/docs/api-reference/payments/previous/v2023-08-01/overview
 */

import crypto from "node:crypto";

const API_VERSION = "2023-08-01";

const API_BASE_BY_MODE = {
  sandbox: "https://sandbox.cashfree.com/pg",
  production: "https://api.cashfree.com/pg",
} as const;

export type CashfreeMode = keyof typeof API_BASE_BY_MODE;

export class CashfreeError extends Error {
  status: number;
  code?: string;
  type?: string;
  raw: unknown;
  constructor(message: string, status: number, raw: unknown) {
    super(message);
    this.name = "CashfreeError";
    this.status = status;
    this.raw = raw;
    const r = raw as { code?: string; type?: string } | null;
    this.code = r?.code;
    this.type = r?.type;
  }
}

const env = () => {
  const mode = (process.env.CASHFREE_MODE ?? "sandbox").toLowerCase() as CashfreeMode;
  const appId = process.env.CASHFREE_APP_ID ?? "";
  const secret = process.env.CASHFREE_SECRET_KEY ?? "";
  if (!API_BASE_BY_MODE[mode]) {
    throw new Error(`Invalid CASHFREE_MODE: ${mode}. Must be 'sandbox' or 'production'.`);
  }
  return { mode, appId, secret, base: API_BASE_BY_MODE[mode] };
};

/** True when both APP_ID + SECRET_KEY are present in env. The UpgradePage
 *  uses this to decide whether to show the "Pay with Cashfree" button or
 *  fall back to the manual upgrade-request flow. */
export const cashfreeIsConfigured = (): boolean => {
  return !!(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY);
};

export const cashfreeMode = (): CashfreeMode => env().mode;

const headers = () => {
  const { appId, secret } = env();
  if (!appId || !secret) {
    throw new Error("Cashfree credentials missing — set CASHFREE_APP_ID + CASHFREE_SECRET_KEY");
  }
  return {
    "x-client-id": appId,
    "x-client-secret": secret,
    "x-api-version": API_VERSION,
    "content-type": "application/json",
    "accept": "application/json",
  };
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const { base } = env();
  const url = `${base}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { ...headers(), ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  if (!res.ok) {
    const message =
      (body && typeof body === "object" && "message" in body && typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : `Cashfree ${res.status}`);
    throw new CashfreeError(message, res.status, body);
  }
  return body as T;
}

// ── Types ──────────────────────────────────────────────────────────────────

export type CashfreeCustomerDetails = {
  customer_id: string;
  customer_email?: string;
  customer_phone: string;
  customer_name?: string;
};

export type CashfreeOrderMeta = {
  return_url?: string;
  notify_url?: string;
  payment_methods?: string;   // e.g. "cc,dc,upi,nb"
};

export type CreateOrderRequest = {
  order_id: string;
  order_amount: number;
  order_currency: "INR";
  customer_details: CashfreeCustomerDetails;
  order_meta?: CashfreeOrderMeta;
  order_note?: string;
  order_tags?: Record<string, string>;
};

export type OrderStatus = "ACTIVE" | "PAID" | "EXPIRED" | "TERMINATED" | "TERMINATION_REQUESTED";

export type CashfreeOrder = {
  cf_order_id: string;
  order_id: string;
  entity: "order";
  order_currency: "INR";
  order_amount: number;
  order_expiry_time: string;
  customer_details: CashfreeCustomerDetails;
  order_meta: CashfreeOrderMeta;
  order_status: OrderStatus;
  order_note?: string;
  created_at: string;
  payment_session_id: string;
  order_splits?: unknown[];
  order_tags?: Record<string, string>;
};

export type CashfreePayment = {
  cf_payment_id: number;
  order_id: string;
  entity: "payment";
  payment_currency: "INR";
  payment_amount: number;
  payment_time: string;
  payment_completion_time?: string;
  payment_status: "SUCCESS" | "FAILED" | "PENDING" | "USER_DROPPED" | "VOID" | "CANCELLED";
  payment_message?: string;
  payment_method?: Record<string, unknown>;
  payment_group?: string;       // 'upi' | 'card' | 'net_banking' | 'wallet' etc.
  bank_reference?: string;
  auth_id?: string;
  error_details?: { error_code?: string; error_description?: string };
};

// ── Endpoints ──────────────────────────────────────────────────────────────

export const createOrder = (req: CreateOrderRequest) =>
  call<CashfreeOrder>(`/orders`, { method: "POST", body: JSON.stringify(req) });

export const getOrder = (orderId: string) =>
  call<CashfreeOrder>(`/orders/${encodeURIComponent(orderId)}`);

export const getOrderPayments = (orderId: string) =>
  call<CashfreePayment[]>(`/orders/${encodeURIComponent(orderId)}/payments`);

// ── Webhook signature verification ─────────────────────────────────────────
/**
 * Cashfree signs the webhook as
 *   base64(HMAC-SHA256(secret, timestamp + rawBody))
 *
 * The signed payload is the concatenation of the `x-webhook-timestamp` header
 * value and the *raw* request body — re-serialized JSON breaks the signature
 * because of whitespace differences. Callers MUST pass the body string they
 * read directly from the wire (not the result of JSON.stringify(parsed)).
 */
export const verifyWebhookSignature = (params: {
  timestamp: string;
  rawBody: string;
  signature: string;
}): boolean => {
  const { secret } = env();
  if (!secret) return false;
  const signed = params.timestamp + params.rawBody;
  const expected = crypto.createHmac("sha256", secret).update(signed).digest("base64");
  // timingSafeEqual prevents string-comparison side-channel timing attacks
  if (expected.length !== params.signature.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(params.signature));
  } catch {
    return false;
  }
};

// ── Canonical plan pricing — source of truth on the server ────────────────
//
// Frontend never sends the amount. It picks plan + cycle, the server looks
// up the canonical price here, posts that to Cashfree. Prevents someone
// from intercepting the create-order call and lowering the amount.

export type PlanKey = "starter" | "growth" | "scale";
export type BillingCycle = "monthly" | "annual";

const PRICING: Record<PlanKey, { monthly: number; annual: number }> = {
  starter: { monthly: 999,  annual: 9_990 },   // 2 months free on annual
  growth:  { monthly: 2999, annual: 29_990 },
  scale:   { monthly: 7999, annual: 79_990 },
};

export const priceFor = (plan: PlanKey, cycle: BillingCycle): number => {
  return PRICING[plan][cycle];
};

export const isValidPlanKey = (s: string): s is PlanKey =>
  s === "starter" || s === "growth" || s === "scale";

export const isValidCycle = (s: string): s is BillingCycle =>
  s === "monthly" || s === "annual";
