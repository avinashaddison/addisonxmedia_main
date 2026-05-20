/**
 * Addison AI routes.
 *
 * Step 1 = foundation only. The feature endpoints (reply suggestions, ad copy,
 * follow-up gen, etc.) will mount here in later steps.
 *
 * What's here now:
 *   GET  /ai/usage    — current-month consumption + plan cap for the workspace
 *   POST /ai/ping     — smoke test: round-trips a 1-line prompt to OpenAI so
 *                       you can verify the key works without building UI.
 *                       Logs as feature="test", weight=0 (free).
 */

import { Hono } from "hono";
import { requireAuth, type AuthVariables } from "../middleware/auth";
import { rateLimit } from "../middleware/rateLimit";
import { chat, isAiConfigured } from "../integrations/openai";
import { checkAiCap, logAiUsage, getUsageSummary } from "../lib/ai-usage";

const app = new Hono<{ Variables: AuthVariables }>();
app.use("*", requireAuth);

// Per-workspace AI rate limit: 30 calls/min. Stops a runaway loop or a
// scripted hammering from blasting the OpenAI account. Plan caps are
// monthly; this is the burst guard.
app.use(
  "*",
  rateLimit({
    scope: "ai",
    windowMs: 60_000,
    max: 30,
    keyOf: (c) => (c.var as AuthVariables).userId,
  }),
);

/** Current-month usage + cap. Drives the Settings → AI usage meter. */
app.get("/ai/usage", async (c) => {
  const summary = await getUsageSummary(c.var.userId);
  return c.json(summary);
});

/**
 * Smoke test — verifies env key + network path + token-counting end to end.
 * Free (weight=0). Useful both for dev and for an admin "is AI alive?" check.
 */
app.post("/ai/ping", async (c) => {
  if (!isAiConfigured()) {
    return c.json({ error: "OPENAI_API_KEY not set on server" }, 503);
  }
  const gate = await checkAiCap(c.var.userId, "test");
  if (!gate.allowed) return c.json({ error: gate.reason, code: gate.code }, 429);

  try {
    const result = await chat(
      [
        { role: "system", content: "You are Addison AI. Reply with one short Hinglish sentence confirming you're online." },
        { role: "user", content: "Ping" },
      ],
      { model: "gpt-4o-mini", maxTokens: 60 },
    );
    await logAiUsage({
      userId: c.var.userId,
      feature: "test",
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      costInr: result.costInr,
      ok: true,
    });
    return c.json({
      ok: true,
      reply: result.content,
      tokens: { input: result.promptTokens, output: result.completionTokens },
      cost_inr: result.costInr,
      model: result.model,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logAiUsage({
      userId: c.var.userId,
      feature: "test",
      model: "gpt-4o-mini",
      promptTokens: 0,
      completionTokens: 0,
      costInr: 0,
      ok: false,
      errorMessage: msg,
    });
    return c.json({ error: msg }, 500);
  }
});

export default app;
