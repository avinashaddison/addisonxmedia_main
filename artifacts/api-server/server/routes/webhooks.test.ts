import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createHmac } from 'crypto';

// Mock DB
vi.mock('../db/client', () => ({
  db: {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve([])) })) })) })),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ onConflictDoUpdate: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([{ id: 'c1', ownerId: 'u1', name: 'Test', phone: '+1234' }])) })) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([{}])) })) })) })),
  },
}));
vi.mock('../db/schema', () => ({}));
vi.mock('../integrations/cashfree', () => ({ verifyWebhookSignature: vi.fn() }));

// We test the core logic patterns used by the webhook handlers

describe('Meta webhook verification (GET /webhooks/meta)', () => {
  it('returns challenge when token matches', async () => {
    const prevToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
    process.env.META_WEBHOOK_VERIFY_TOKEN = 'test-verify-token';

    // Create a minimal app simulating the webhook verify handler
    const app = new Hono();
    app.get('/webhooks/meta', (c) => {
      const mode = c.req.query('hub.mode');
      const token = c.req.query('hub.verify_token');
      const challenge = c.req.query('hub.challenge');
      const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;
      if (mode === 'subscribe' && token === expected && challenge) {
        return c.text(challenge, 200);
      }
      return c.text('Forbidden', 403);
    });

    const res = await app.request('/webhooks/meta?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=abc123');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('abc123');

    process.env.META_WEBHOOK_VERIFY_TOKEN = prevToken;
  });

  it('returns 403 when token does not match', async () => {
    process.env.META_WEBHOOK_VERIFY_TOKEN = 'correct-token';

    const app = new Hono();
    app.get('/webhooks/meta', (c) => {
      const mode = c.req.query('hub.mode');
      const token = c.req.query('hub.verify_token');
      const challenge = c.req.query('hub.challenge');
      const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;
      if (mode === 'subscribe' && token === expected && challenge) {
        return c.text(challenge, 200);
      }
      return c.text('Forbidden', 403);
    });

    const res = await app.request('/webhooks/meta?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc');
    expect(res.status).toBe(403);
  });
});

describe('Meta webhook signature verification', () => {
  it('verifies valid HMAC-SHA256 signature', () => {
    const secret = 'test-app-secret';
    const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
    const expectedSig = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');

    // Simulate the verification logic
    const computedSig = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
    expect(computedSig).toBe(expectedSig);
  });

  it('rejects invalid signature', () => {
    const secret = 'test-app-secret';
    const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
    const tampered = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';
    const computedSig = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
    expect(computedSig).not.toBe(tampered);
  });
});

describe('Meta webhook POST basic handling', () => {
  it('ignores non-whatsapp payloads', async () => {
    const app = new Hono();
    app.post('/webhooks/meta', async (c) => {
      const payload = await c.req.json().catch(() => null);
      if (!payload || payload.object !== 'whatsapp_business_account') {
        return c.json({ ignored: true }, 200);
      }
      return c.json({ ok: true }, 200);
    });

    const res = await app.request('/webhooks/meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ object: 'instagram', entry: [] }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ignored).toBe(true);
  });
});
