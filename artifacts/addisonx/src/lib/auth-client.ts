import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

// Requests to /api/* are routed to the Hono api-server by the Replit path router (same origin).
// In prod, frontend + API will live on the same origin. Either way, relative URLs work.
export const authClient = createAuthClient({
  plugins: [twoFactorClient()],
});

export const { useSession, signIn, signUp, signOut, requestPasswordReset, resetPassword, twoFactor } = authClient;
