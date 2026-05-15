import { createAuthClient } from "better-auth/react";

// In dev, Vite proxies /api/* to the Hono server on :3001 (see vite.config.ts).
// In prod, frontend + API will live on the same origin. Either way, relative URLs work.
export const authClient = createAuthClient();

export const { useSession, signIn, signUp, signOut, forgetPassword, resetPassword } = authClient;
