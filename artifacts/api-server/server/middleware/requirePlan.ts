import type { Context, Next } from 'hono';
import { db } from '../db/client';
import { user } from '../db/schema';
import { eq } from 'drizzle-orm';

export const requirePlan = (...allowedPlans: string[]) => async (c: Context, next: Next) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'unauthorized' }, 401);

  const [u] = await db.select({ plan: user.plan }).from(user).where(eq(user.id, userId)).limit(1);
  const currentPlan = u?.plan ?? 'starter';

  if (!allowedPlans.includes(currentPlan)) {
    return c.json({
      error: 'upgrade_required',
      code: 'upgrade_required',
      required_plans: allowedPlans,
      current_plan: currentPlan,
    }, 403);
  }
  await next();
};
