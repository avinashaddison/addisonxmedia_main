import pino from 'pino';
import { createMiddleware } from 'hono/factory';
import crypto from 'node:crypto';

const level = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

export const logger = pino({
  level,
  ...(process.env.NODE_ENV !== 'production'
    ? { transport: { target: 'pino/file', options: { destination: 1 } } }
    : {}),
});

/**
 * Hono middleware that generates a request ID, logs request start/completion,
 * and sets X-Request-Id on the response.
 */
export const requestLogger = createMiddleware(async (c, next) => {
  const id = crypto.randomUUID();
  c.set('requestId', id);
  c.header('X-Request-Id', id);

  const method = c.req.method;
  const path = c.req.path;
  const start = Date.now();

  logger.info({ requestId: id, method, path }, 'request start');

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  logger.info({ requestId: id, method, path, status, duration_ms: duration }, 'request complete');
});

export default logger;
