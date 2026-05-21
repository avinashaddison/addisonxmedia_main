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
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { contact, conversation, message } from "../db/schema";
import { requireAuth, type AuthVariables } from "../middleware/auth";
import { rateLimit } from "../middleware/rateLimit";
import { chat, chatJson, isAiConfigured } from "../integrations/openai";
import { checkAiCap, logAiUsage, getUsageSummary } from "../lib/ai-usage";
import { getPersonaWithDefaults, updatePersona, type Persona } from "../lib/ai-persona";

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

/** Read the workspace's AI persona (falls back to defaults if no row yet). */
app.get("/ai/persona", async (c) => {
  const persona = await getPersonaWithDefaults(c.var.userId);
  return c.json(persona);
});

/** Save / update the workspace's AI persona. Whitelisted-field upsert. */
app.patch("/ai/persona", async (c) => {
  const body = await c.req.json<Partial<Persona>>();
  const updated = await updatePersona(c.var.userId, body);
  return c.json(updated);
});

// ─── Reply suggestions ───────────────────────────────────────────────────────
//
// POST /ai/reply-suggestions  { conversation_id }
// Returns 3 reply drafts (or an escalate signal if the customer mentioned a
// keyword in persona.escalate_keywords). Always grounded in:
//   - persona (business voice, language, guardrails)
//   - last 10 messages (recency-weighted context)
//   - contact tag (hot / warm / cold drives urgency)
// Manual-approval only — never auto-sends. The UI just fills the composer.

const TONE_INSTRUCTIONS: Record<Persona["tone"], string> = {
  friendly:     "Warm and helpful. Light emojis OK (max 1 per reply). Short sentences.",
  professional: "Polished and formal. No emojis. Use proper salutations.",
  casual:       "Chill and conversational. No jargon. Like texting a friend.",
  urgent_sales: "Push toward a close — but stay polite. Add light urgency words (today, abhi, jaldi). Always include a CTA.",
};

const LANGUAGE_INSTRUCTIONS: Record<Persona["response_language"], string> = {
  hinglish: "Reply in Hinglish (roman-script Hindi/English code-switching) — how Indian SMBs actually chat on WhatsApp. Examples: 'Sure sir, ye details bhej deta hoon', 'Aap kal call kar sakte hain?'",
  hindi:    "Reply in Hindi using Devanagari script (हिंदी).",
  english:  "Reply in clean English — Indian business English is fine (e.g. 'Kindly', 'Please revert').",
};

const TAG_INSTRUCTIONS = {
  hot:  "This is a HOT lead — they are actively interested. Be confident, push toward booking / payment / next step. Avoid sounding desperate.",
  warm: "This is a WARM lead — interested but not committed. Build value, offer a demo/visit/sample, gently move them forward.",
  cold: "This is a COLD lead — re-engaging or low interest. Be light, add value, no hard sell. Goal is just to get them to reply.",
} as const;

type Suggestion = { type: "polite" | "sell" | "qualify"; text: string };
type SuggestionsResult =
  | { escalate: true; reason: string; suggestions: [] }
  | { escalate: false; suggestions: Suggestion[] };

app.post("/ai/reply-suggestions", async (c) => {
  const userId = c.var.userId;
  const body = await c.req.json<{ conversation_id: string }>();
  if (!body.conversation_id) return c.json({ error: "conversation_id required" }, 400);

  if (!isAiConfigured()) return c.json({ error: "AI not configured on server" }, 503);

  // 1. Verify conversation belongs to the workspace + load contact
  const [conv] = await db
    .select({ id: conversation.id, contactId: conversation.contactId })
    .from(conversation)
    .where(and(eq(conversation.id, body.conversation_id), eq(conversation.ownerId, userId)))
    .limit(1);
  if (!conv) return c.json({ error: "Conversation not found" }, 404);

  const [ctc] = await db
    .select({ name: contact.name, tag: contact.tag })
    .from(contact).where(eq(contact.id, conv.contactId)).limit(1);
  if (!ctc) return c.json({ error: "Contact not found" }, 404);

  // 2. Pull last 10 messages, oldest→newest
  const recent = await db
    .select({ direction: message.direction, body: message.body, createdAt: message.createdAt })
    .from(message)
    .where(eq(message.conversationId, conv.id))
    .orderBy(desc(message.createdAt))
    .limit(10);
  const history = recent.slice().reverse();

  const lastInbound = [...history].reverse().find((m) => m.direction === "inbound");
  if (!lastInbound) {
    return c.json({
      escalate: false,
      suggestions: [],
      note: "No inbound message yet — nothing to suggest a reply to.",
    });
  }

  // 3. Load persona
  const persona = await getPersonaWithDefaults(userId);

  // 4. Escalate-keyword detection — short-circuit BEFORE burning tokens
  const escalateList = persona.escalate_keywords
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const inboundLower = lastInbound.body.toLowerCase();
  const matchedKeyword = escalateList.find((kw) => kw.length > 0 && inboundLower.includes(kw));
  if (matchedKeyword) {
    return c.json<SuggestionsResult>({
      escalate: true,
      reason: `Customer mentioned "${matchedKeyword}" — handle this personally, do not auto-reply.`,
      suggestions: [],
    });
  }

  // 5. Cap check (weight=1 per call)
  const gate = await checkAiCap(userId, "reply_suggestion");
  if (!gate.allowed) return c.json({ error: gate.reason, code: gate.code }, 429);

  // 6. Build prompt + call OpenAI in JSON mode
  const businessLine = persona.business_name
    ? `Business: ${persona.business_name}.`
    : "";
  const sellsLine = persona.what_we_sell
    ? `What we sell: ${persona.what_we_sell}`
    : "";
  const alwaysLine = persona.always_say ? `ALWAYS: ${persona.always_say}` : "";
  const neverLine = persona.never_say ? `NEVER: ${persona.never_say}` : "";

  const systemPrompt = [
    `You are Addison AI, a sales assistant helping ${persona.business_name || "an Indian SMB"} reply to a WhatsApp customer.`,
    businessLine,
    sellsLine,
    `Tone: ${TONE_INSTRUCTIONS[persona.tone]}`,
    `Language: ${LANGUAGE_INSTRUCTIONS[persona.response_language]}`,
    `Lead temperature: ${TAG_INSTRUCTIONS[ctc.tag as keyof typeof TAG_INSTRUCTIONS] ?? TAG_INSTRUCTIONS.cold}`,
    alwaysLine,
    neverLine,
    "",
    "Generate exactly 3 reply DRAFTS for the operator to choose from. Each must be:",
    "- 1-3 sentences max",
    "- Sales-oriented (this is a sales conversation, not customer support)",
    "- Distinct from each other in approach",
    "- Specific to what the customer just said — do not produce generic chatbot replies",
    "",
    "Output JSON: {\"suggestions\":[{\"type\":\"polite\"|\"sell\"|\"qualify\",\"text\":\"...\"}]}",
    "  - 'polite'  = acknowledge + soft answer + open the door",
    "  - 'sell'    = move them toward the next step (visit/demo/payment)",
    "  - 'qualify' = ask one specific qualifying question to learn more",
  ]
    .filter(Boolean)
    .join("\n");

  const historyText = history
    .map((m) => `${m.direction === "inbound" ? "CUSTOMER" : "YOU"}: ${m.body}`)
    .join("\n");
  const userPrompt = [
    `Contact name: ${ctc.name}`,
    `Conversation so far (oldest → newest):`,
    historyText,
    "",
    `Customer's latest message: "${lastInbound.body}"`,
    "",
    "Generate 3 reply drafts now.",
  ].join("\n");

  try {
    const result = await chatJson<{ suggestions: Suggestion[] }>(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { model: "gpt-4o-mini", temperature: 0.7, maxTokens: 500 },
    );

    await logAiUsage({
      userId,
      feature: "reply_suggestion",
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      costInr: result.costInr,
      ok: true,
    });

    const suggestions = Array.isArray(result.json?.suggestions)
      ? result.json.suggestions.filter((s) => s && typeof s.text === "string" && s.text.trim().length > 0).slice(0, 3)
      : [];

    return c.json<SuggestionsResult>({ escalate: false, suggestions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logAiUsage({
      userId,
      feature: "reply_suggestion",
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
