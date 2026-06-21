import { db } from '../db/client';
import { userActivityLog } from '../db/schema';
import logger from './logger';

interface ActivityOpts {
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log a user activity. Fire-and-forget — never blocks or throws.
 */
export function logActivity(userId: string, action: string, opts?: ActivityOpts): void {
  db.insert(userActivityLog).values({
    userId,
    action,
    resourceType: opts?.resourceType ?? null,
    resourceId: opts?.resourceId ?? null,
    ipAddress: opts?.ipAddress ?? null,
    userAgent: opts?.userAgent ?? null,
    metadata: opts?.metadata ?? null,
  }).catch((err) => {
    logger.error({ err, userId, action }, 'Failed to log activity');
  });
}
