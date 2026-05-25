import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// Mock the auth module before importing requireAuth
vi.mock('../auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Mock db
vi.mock('../db/client', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })),
    })),
  },
}));

// Mock schema
vi.mock('../db/schema', () => ({
  impersonationSession: { id: 'id', adminUserId: 'admin_user_id', targetUserId: 'target_user_id', endedAt: 'ended_at', expiresAt: 'expires_at' },
  user: { id: 'id', email: 'email' },
}));

// Mock drizzle-orm operators
vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args: any[]) => args),
  eq: vi.fn((a: any, b: any) => ({ eq: [a, b] })),
  gt: vi.fn((a: any, b: any) => ({ gt: [a, b] })),
  isNull: vi.fn((a: any) => ({ isNull: a })),
}));

const { auth } = await import('../auth');
const { requireAuth } = await import('./auth');

describe('requireAuth middleware', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.use('*', requireAuth);
    app.get('/test', (c) => c.json({ userId: c.get('userId'), email: c.get('userEmail') }));
  });

  it('returns 401 when no session exists', async () => {
    (auth.api.getSession as any).mockResolvedValue(null);
    const res = await app.request('/test');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('sets userId and userEmail from session', async () => {
    (auth.api.getSession as any).mockResolvedValue({
      user: { id: 'user-123', email: 'user@test.com' },
    });
    const res = await app.request('/test');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userId).toBe('user-123');
    expect(body.email).toBe('user@test.com');
  });

  it('returns 401 when session has no user', async () => {
    (auth.api.getSession as any).mockResolvedValue({ user: null });
    const res = await app.request('/test');
    expect(res.status).toBe(401);
  });
});
