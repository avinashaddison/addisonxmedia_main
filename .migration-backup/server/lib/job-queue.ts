import { db } from '../db/client';
import { jobQueue } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import logger from './logger';

export async function enqueueJob(type: string, payload: Record<string, unknown>) {
  const [job] = await db.insert(jobQueue).values({ type, payload }).returning();
  return job;
}

// Job handlers registry
const handlers: Record<string, (payload: any) => Promise<void>> = {};

export function registerHandler(type: string, handler: (payload: any) => Promise<void>) {
  handlers[type] = handler;
}

export async function processJobs() {
  // Atomic job claim using CTE with row lock
  const claimed = await db.execute(sql`
    UPDATE job_queue SET status = 'processing', started_at = now(), attempts = attempts + 1
    WHERE id = (
      SELECT id FROM job_queue
      WHERE status = 'pending' AND scheduled_for <= now()
      ORDER BY scheduled_for
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `);
  const job = (claimed.rows ?? claimed)?.[0] as any;
  if (!job) return;

  const handler = handlers[job.type];
  if (!handler) {
    await db.update(jobQueue).set({ status: 'failed', error: `No handler for type: ${job.type}`, failedAt: new Date() }).where(eq(jobQueue.id, job.id));
    return;
  }

  try {
    await handler(job.payload);
    await db.update(jobQueue).set({ status: 'completed', completedAt: new Date() }).where(eq(jobQueue.id, job.id));
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    if (job.attempts >= job.max_attempts) {
      await db.update(jobQueue).set({ status: 'failed', error, failedAt: new Date() }).where(eq(jobQueue.id, job.id));
    } else {
      await db.update(jobQueue).set({ status: 'pending', error }).where(eq(jobQueue.id, job.id));
    }
    logger.error({ jobId: job.id, type: job.type, error }, 'Job failed');
  }
}

// Start polling (call once at server startup)
let polling = false;
export function startJobWorker(intervalMs = 5000) {
  if (polling) return;
  polling = true;
  const tick = async () => {
    try { await processJobs(); } catch (e) { logger.error(e, 'Job worker error'); }
    if (polling) setTimeout(tick, intervalMs);
  };
  setTimeout(tick, intervalMs);
}

export function stopJobWorker() { polling = false; }
