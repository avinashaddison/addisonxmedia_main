import { createMiddleware } from "hono/factory";
import { getCookie, setCookie } from "hono/cookie";

/**
 * Double-submit cookie CSRF protection.
 *
 * - On every response, if no csrf_token cookie exists, set one with a random UUID.
 * - On POST/PATCH/DELETE to /api/* (excluding /api/webhooks/*), verify that
 *   the X-CSRF-Token header matches the csrf_token cookie value.
 * - If the cookie does not exist yet on a state-changing request, generate one,
 *   set it, and reject with 403 so the client must retry with the token.
 * - If mismatch or missing header (when cookie exists), return 403.
 */
export const csrfProtection = createMiddleware(async (c, next) => {
  // Read existing csrf cookie
  let token = getCookie(c, "csrf_token");

  // Check CSRF on state-changing methods for /api/* (except webhooks)
  const method = c.req.method;
  const path = c.req.path;
  // Exempt paths that must always work regardless of CSRF state:
  // - webhooks (external systems can't send CSRF tokens)
  // - auth endpoints (sign-in/sign-up/sign-out happen before/after session lifecycle)
  const CSRF_EXEMPT_PATHS = [
    "/api/webhooks/",
    "/api/auth/",
  ];
  const isExempt = CSRF_EXEMPT_PATHS.some((p) => path.startsWith(p));

  const needsCheck =
    (method === "POST" || method === "PATCH" || method === "DELETE") &&
    path.startsWith("/api/") &&
    !isExempt;

  if (needsCheck) {
    if (!token) {
      // First request without a csrf cookie: generate one, set it, and reject.
      // The client must GET a page first (which sets the cookie) before mutations.
      token = crypto.randomUUID();
      setCookie(c, "csrf_token", token, {
        path: "/",
        sameSite: "Lax",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
      });
      return c.json({ error: "CSRF token missing. Retry with X-CSRF-Token header." }, 403);
    }
    const headerToken = c.req.header("X-CSRF-Token") ?? "";
    if (!headerToken || headerToken !== token) {
      return c.json({ error: "CSRF token mismatch" }, 403);
    }
  }

  await next();

  // Set csrf_token cookie on every response if not already present
  if (!token) {
    token = crypto.randomUUID();
    setCookie(c, "csrf_token", token, {
      path: "/",
      sameSite: "Lax",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
    });
  }
});
