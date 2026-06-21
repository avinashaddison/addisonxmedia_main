import type { Context, Next } from 'hono';
import { db } from '../db/client';
import { user } from '../db/schema';
import { eq } from 'drizzle-orm';

const ENABLED = process.env.REQUIRE_EMAIL_VERIFICATION === 'true';

// Paths that should work without email verification (auth flows, verification itself)
const EXEMPT_PREFIXES = ['/api/auth/', '/api/webhooks/', '/health'];

export const requireVerifiedEmail = async (c: Context, next: Next) => {
  if (!ENABLED) return next();

  // Skip exempt paths
  const path = c.req.path;
  if (EXEMPT_PREFIXES.some(p => path.startsWith(p))) return next();

  const userId = c.get('userId');
  if (!userId) return next(); // requireAuth will handle this

  const [u] = await db.select({ emailVerified: user.emailVerified }).from(user)
    .where(eq(user.id, userId)).limit(1);

  if (u && !u.emailVerified) {
    return c.json({
      error: 'email_not_verified',
      code: 'email_not_verified',
      detail: 'Please verify your email address before accessing this resource',
    }, 403);
  }

  return next();
};
