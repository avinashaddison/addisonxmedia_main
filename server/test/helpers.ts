import { Hono } from 'hono';
import type { AuthVariables } from '../middleware/auth';

/**
 * Creates a test Hono app with mocked auth that sets userId/userEmail.
 */
export function createTestApp(userId = 'test-user-id', userEmail = 'test@example.com') {
  const app = new Hono<{ Variables: AuthVariables }>();
  // Mock auth middleware
  app.use('*', async (c, next) => {
    c.set('userId', userId);
    c.set('userEmail', userEmail);
    await next();
  });
  return app;
}

/**
 * Helper to make requests against a Hono app for testing.
 */
export async function testRequest(app: Hono, path: string, init?: RequestInit) {
  const url = `http://localhost${path}`;
  const req = new Request(url, init);
  return app.fetch(req);
}
