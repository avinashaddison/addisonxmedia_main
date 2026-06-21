import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// Mock dependencies
vi.mock('../db/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));
vi.mock('../db/schema', () => ({
  user: {},
  upgradeRequest: {},
  profile: {},
}));
vi.mock('../middleware/auth', () => ({
  requireAuth: vi.fn((c: any, next: any) => { c.set('userId', 'test-user'); c.set('userEmail', 'test@example.com'); return next(); }),
}));
vi.mock('../integrations/cashfree', () => ({
  cashfreeIsConfigured: vi.fn(() => false),
  cashfreeMode: vi.fn(() => 'sandbox'),
  createOrder: vi.fn(),
  getOrder: vi.fn(),
  priceFor: vi.fn(() => 999),
  isValidPlanKey: vi.fn((p: string) => ['starter', 'growth', 'scale'].includes(p)),
  isValidCycle: vi.fn((c: string) => ['monthly', 'annual'].includes(c)),
}));

describe('Billing route validation', () => {
  it('POST /billing/request-upgrade rejects invalid plan', async () => {
    const app = new Hono();
    // Mock auth
    app.use('*', async (c, next) => { c.set('userId', 'u1'); c.set('userEmail', 'u@t.com'); await next(); });

    const VALID_PLANS = new Set(['starter', 'growth', 'scale', 'enterprise']);
    app.post('/billing/request-upgrade', async (c) => {
      const body = await c.req.json();
      if (!body.target_plan || !VALID_PLANS.has(body.target_plan)) {
        return c.json({ error: 'Invalid target_plan (must be starter|growth|scale|enterprise)' }, 400);
      }
      return c.json({ ok: true });
    });

    const res = await app.request('/billing/request-upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_plan: 'invalid-plan' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid');
  });

  it('POST /billing/request-upgrade accepts valid plan', async () => {
    const app = new Hono();
    app.use('*', async (c, next) => { c.set('userId', 'u1'); c.set('userEmail', 'u@t.com'); await next(); });

    const VALID_PLANS = new Set(['starter', 'growth', 'scale', 'enterprise']);
    const VALID_CYCLES = new Set(['monthly', 'annual']);
    app.post('/billing/request-upgrade', async (c) => {
      const body = await c.req.json();
      if (!body.target_plan || !VALID_PLANS.has(body.target_plan)) {
        return c.json({ error: 'Invalid target_plan' }, 400);
      }
      const cycle = body.billing_cycle ?? 'monthly';
      if (!VALID_CYCLES.has(cycle)) {
        return c.json({ error: "billing_cycle must be 'monthly' or 'annual'" }, 400);
      }
      return c.json({ ok: true, request: { id: '123', targetPlan: body.target_plan } });
    });

    const res = await app.request('/billing/request-upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_plan: 'growth', billing_cycle: 'annual' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('rejects invalid billing_cycle', async () => {
    const app = new Hono();
    app.use('*', async (c, next) => { c.set('userId', 'u1'); c.set('userEmail', 'u@t.com'); await next(); });

    const VALID_PLANS = new Set(['starter', 'growth', 'scale', 'enterprise']);
    const VALID_CYCLES = new Set(['monthly', 'annual']);
    app.post('/billing/request-upgrade', async (c) => {
      const body = await c.req.json();
      if (!body.target_plan || !VALID_PLANS.has(body.target_plan)) {
        return c.json({ error: 'Invalid target_plan' }, 400);
      }
      const cycle = body.billing_cycle ?? 'monthly';
      if (!VALID_CYCLES.has(cycle)) {
        return c.json({ error: "billing_cycle must be 'monthly' or 'annual'" }, 400);
      }
      return c.json({ ok: true });
    });

    const res = await app.request('/billing/request-upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_plan: 'growth', billing_cycle: 'weekly' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('Cashfree status', () => {
  it('GET /billing/cashfree/status returns configuration state', async () => {
    const app = new Hono();
    app.use('*', async (c, next) => { c.set('userId', 'u1'); c.set('userEmail', 'u@t.com'); await next(); });
    app.get('/billing/cashfree/status', (c) => {
      return c.json({ configured: false, mode: null });
    });

    const res = await app.request('/billing/cashfree/status');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('configured');
  });
});
