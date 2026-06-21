import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

// Controls what the insert .returning() resolves to per-test:
//   non-empty array → first capture (insert happened)
//   empty array     → duplicate (onConflictDoNothing matched, no row returned)
let insertReturning: Array<{ id: string }> = [];
const updateWhere = vi.fn(() => Promise.resolve());

vi.mock("../db/client", () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve(insertReturning)),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: updateWhere })),
    })),
  },
}));
vi.mock("../db/schema", () => ({
  templateLead: { id: "id", email: "email" },
}));
const sendMail = vi.fn(() => Promise.resolve({ ok: true, id: "x", mode: "live" }));
vi.mock("../lib/mailer", () => ({ sendMail: (...a: unknown[]) => sendMail(...a) }));
vi.mock("../lib/logger", () => ({ default: { error: vi.fn(), info: vi.fn() } }));

import leadsApp from "./leads";

const makeApp = () => {
  const app = new Hono();
  app.route("/api", leadsApp);
  return app;
};

const post = (app: Hono, body: unknown, ip: string) =>
  app.request("/api/leads/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });

describe("POST /api/leads/templates", () => {
  beforeEach(() => {
    insertReturning = [];
    sendMail.mockClear();
    updateWhere.mockClear();
  });

  it("stores a new lead and returns ok", async () => {
    insertReturning = [{ id: "lead-1" }];
    const app = makeApp();
    const res = await post(app, { email: "new@example.com" }, "ip-new");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("treats a duplicate as a no-op but still returns ok", async () => {
    insertReturning = []; // onConflictDoNothing returned nothing
    const app = makeApp();
    const res = await post(app, { email: "dupe@example.com" }, "ip-dupe");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    // No confirmation email on a duplicate.
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("rejects an invalid email with 400", async () => {
    const app = makeApp();
    const res = await post(app, { email: "not-an-email" }, "ip-invalid");
    expect(res.status).toBe(400);
  });

  it("rate-limits a single IP after the per-window cap", async () => {
    const app = makeApp();
    const ip = "ip-ratelimit";
    let last: Response | undefined;
    // Limiter is 10 requests / IP / window — the 11th must be blocked.
    for (let i = 0; i < 11; i++) {
      last = await post(app, { email: `rl${i}@example.com` }, ip);
    }
    expect(last!.status).toBe(429);
  });
});
