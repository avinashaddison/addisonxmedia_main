import type { Context, Next } from "hono";
import { auth } from "../auth";

export type AuthVariables = {
  userId: string;
  userEmail: string;
};

// Reads Better Auth session cookie, sets userId/userEmail on c.var, rejects 401.
export const requireAuth = async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("userId", session.user.id);
  c.set("userEmail", session.user.email);
  await next();
};
