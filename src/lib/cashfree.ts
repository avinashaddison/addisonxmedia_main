/**
 * Cashfree JS SDK v3 loader + typed wrapper.
 *
 * Loads https://sdk.cashfree.com/js/v3/cashfree.js on-demand, exposes a
 * tiny typed surface (`openCashfreeCheckout`) so callers don't have to
 * touch the global Cashfree() factory or worry about double-loading the
 * script across re-mounts.
 *
 * Usage:
 *   const { ok, error } = await openCashfreeCheckout({
 *     paymentSessionId: "session_xxx",
 *     mode: "sandbox",
 *     onClose: () => qc.invalidateQueries(["billing-me"]),
 *   });
 */

type CashfreeMode = "sandbox" | "production";

type CashfreeCheckoutOptions = {
  paymentSessionId: string;
  redirectTarget?: "_self" | "_top" | "_blank" | "_modal";
  returnUrl?: string;
};

type CashfreeCheckoutResult = {
  error?: { code?: string; message?: string };
  redirect?: boolean;
  paymentDetails?: { paymentMessage?: string };
};

type CashfreeInstance = {
  checkout: (opts: CashfreeCheckoutOptions) => Promise<CashfreeCheckoutResult>;
};

declare global {
  interface Window {
    Cashfree?: (cfg: { mode: CashfreeMode }) => CashfreeInstance;
    __cashfreeLoading?: Promise<void>;
  }
}

const SCRIPT_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";

const loadCashfreeSdk = (): Promise<void> => {
  if (typeof window === "undefined") return Promise.reject(new Error("server-side"));
  if (window.Cashfree) return Promise.resolve();
  if (window.__cashfreeLoading) return window.__cashfreeLoading;

  window.__cashfreeLoading = new Promise<void>((resolve, reject) => {
    // If a previous mount left a script tag, reuse it instead of re-adding.
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Cashfree SDK failed to load")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Cashfree SDK failed to load"));
    document.head.appendChild(s);
  });
  return window.__cashfreeLoading;
};

export type OpenCheckoutResult =
  | { ok: true; redirect?: boolean }
  | { ok: false; error: string };

/**
 * Loads the SDK if needed, then opens the Cashfree-hosted checkout in a
 * modal overlay. The customer pays inside the modal; Cashfree handles all
 * payment-method UIs (UPI / cards / netbanking / wallets).
 *
 * After the customer pays (or closes the modal), control returns here.
 * Whether the payment succeeded is NOT determined client-side — the caller
 * must hit /api/billing/cashfree/verify/:orderId server-side to confirm.
 * Cashfree may also fire the webhook before this resolves, which is fine
 * (both update paths are idempotent).
 */
export const openCashfreeCheckout = async (params: {
  paymentSessionId: string;
  mode: CashfreeMode;
  returnUrl?: string;
}): Promise<OpenCheckoutResult> => {
  try {
    await loadCashfreeSdk();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "SDK load failed" };
  }
  if (!window.Cashfree) {
    return { ok: false, error: "Cashfree SDK not available after load" };
  }

  const cashfree = window.Cashfree({ mode: params.mode });
  try {
    const result = await cashfree.checkout({
      paymentSessionId: params.paymentSessionId,
      redirectTarget: "_modal",
      returnUrl: params.returnUrl,
    });
    if (result?.error) {
      return { ok: false, error: result.error.message ?? result.error.code ?? "Checkout error" };
    }
    return { ok: true, redirect: !!result?.redirect };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Checkout threw" };
  }
};
