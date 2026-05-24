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
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "../db/client";
import { contact, conversation, message, product } from "../db/schema";
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
type ProductHint = { id: string; name: string; price: number; photo_url: string | null };
type SuggestionsResult =
  | { escalate: true; reason: string; suggestions: []; suggested_products?: ProductHint[] }
  | { escalate: false; suggestions: Suggestion[]; suggested_products?: ProductHint[] };

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

  // 5b. Shopping intent — if customer's message looks like a product enquiry,
  // pull matching products + suggest a reply that mentions them with prices.
  // This is what turns the AI inbox into a real WhatsApp Commerce assistant.
  const SHOPPING_KEYWORDS = ["price", "cost", "how much", "kitna", "rate", "available", "stock", "show me", "do you have", "want", "buy", "order", "send me", "details", "image", "photo", "size", "colour", "color"];
  const looksLikeShopping = SHOPPING_KEYWORDS.some((kw) => inboundLower.includes(kw));

  let productContext = "";
  let suggestedProducts: Array<{ id: string; name: string; price: number; photoUrl: string | null }> = [];
  if (looksLikeShopping) {
    // Try keyword search across product name + description using significant
    // words from the inbound message (drop common stop words).
    const STOP = new Set(["i", "me", "you", "the", "a", "an", "is", "are", "want", "need", "buy", "order", "send", "show", "how", "much", "do", "have", "available", "any", "some", "this", "that", "what", "for", "to", "in", "on", "of", "and", "or"]);
    const tokens = inboundLower.split(/[^a-z0-9]+/).filter((t) => t.length >= 2 && !STOP.has(t));
    let matches: typeof product.$inferSelect[] = [];
    if (tokens.length > 0) {
      const conditions = tokens.map((t) => or(ilike(product.name, `%${t}%`), ilike(product.description, `%${t}%`))!);
      matches = await db.select().from(product)
        .where(and(eq(product.ownerId, userId), eq(product.status, "active"), or(...conditions)!))
        .orderBy(asc(product.sortOrder), asc(product.createdAt))
        .limit(6);
    }
    // If no specific match, fall back to top 4 active products
    if (matches.length === 0) {
      matches = await db.select().from(product)
        .where(and(eq(product.ownerId, userId), eq(product.status, "active")))
        .orderBy(asc(product.sortOrder), asc(product.createdAt))
        .limit(4);
    }
    suggestedProducts = matches.map((p) => ({ id: p.id, name: p.name, price: Number(p.priceInr) || 0, photoUrl: p.photoUrl }));
    if (matches.length > 0) {
      productContext = "\n\nMATCHING PRODUCTS (customer asked about products — reference these by exact name + price in your reply):\n"
        + matches.map((p) => `• ${p.name} — ₹${Number(p.priceInr).toLocaleString("en-IN")}${p.description ? ` (${p.description})` : ""}`).join("\n");
    }
  }

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
    productContext,
    "",
    "Generate 3 reply drafts now.",
  ].filter(Boolean).join("\n");

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

    return c.json<SuggestionsResult>({
      escalate: false,
      suggestions,
      suggested_products: suggestedProducts.length > 0
        ? suggestedProducts.map((p) => ({ id: p.id, name: p.name, price: p.price, photo_url: p.photoUrl }))
        : undefined,
    });
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

// ─── Ad copy generator ──────────────────────────────────────────────────────
//
// POST /ai/ad-copy { description, language?, objective?, audience? }
//
// Customer types ONE sentence about what they're promoting; we return three
// fully-formed ad-copy bundles plus campaign-name, targeting interests and a
// budget recommendation. Click any bundle → auto-fills the Create Campaign
// wizard.
//
// Plan-gated to Growth + Enterprise (Starter doesn't get ad_copy — see
// PLAN_FEATURES in lib/ai-usage.ts). Weighted 5 because the prompt is large
// (multi-variant JSON) and we want it to count meaningfully vs reply
// suggestions.

type AdCopyResult = {
  campaign_name: string;
  variants: Array<{
    label: string;          // "Bold", "Friendly", "Urgent" — short style tag
    headline: string;       // ≤40 chars
    primary_text: string;   // ≤125 chars (Meta ads body limit)
    icebreaker: string;     // WhatsApp prefill for CTW
  }>;
  targeting_interests: string[]; // 5-7 Meta-style interest names
  budget_inr_daily: number;
  budget_reasoning: string;      // 1-line explanation
  cta_label: "LEARN_MORE" | "SHOP_NOW" | "SIGN_UP" | "CONTACT_US" | "GET_OFFER" | "BOOK_NOW" | "ORDER_NOW";
};

app.post("/ai/ad-copy", async (c) => {
  if (!isAiConfigured()) return c.json({ error: "AI not configured on server" }, 503);

  type AdCopyBody = {
    description?: string;
    language?: "english" | "hinglish" | "hindi";
    objective?: "ctw" | "sales" | "leads" | "awareness" | "traffic";
    audience?: string;
  };
  const body = await c.req.json<AdCopyBody>().catch(() => ({} as AdCopyBody));

  const description = (body.description ?? "").trim();
  if (description.length < 10) {
    return c.json({ error: "Describe what you're promoting in at least 10 characters" }, 400);
  }
  if (description.length > 600) {
    return c.json({ error: "Description too long — keep it under 600 characters" }, 400);
  }

  // Persona feeds tone preferences if the workspace has configured one
  const persona = await getPersonaWithDefaults(c.var.userId);
  const language: "english" | "hinglish" | "hindi" =
    body.language ?? (persona.response_language as "english" | "hinglish" | "hindi") ?? "hinglish";
  const objective: "ctw" | "sales" | "leads" | "awareness" | "traffic" = body.objective ?? "ctw";

  // Cap + plan gate (ad_copy weight=5, Growth+ only)
  const gate = await checkAiCap(c.var.userId, "ad_copy");
  if (!gate.allowed) return c.json({ error: gate.reason, code: gate.code }, 429);

  // ── Prompt: one system message + one user message. Constrained to JSON.
  const objectiveHint = {
    ctw:       "Click-to-WhatsApp ad — primary text should make the reader want to chat. Use phrases like 'WhatsApp karein', 'message us', 'aaj hi puchein'.",
    sales:     "Direct sales — push toward purchase with urgency or value.",
    leads:     "Lead generation — invite them to fill a form or learn more.",
    awareness: "Brand awareness — memorable, emotional, simple message.",
    traffic:   "Drive clicks to a website — compelling reason to visit.",
  }[objective];

  const languageHint = {
    hinglish: "Hinglish (roman-script Hindi/English mix). Examples: 'Diwali ke liye special offer', 'Sirf 3 din ke liye'. Sound like a friendly Indian SMB owner, not a corporate.",
    hindi:    "Pure Hindi in Devanagari script (हिन्दी).",
    english:  "Indian-English. Crisp, professional, no jargon.",
  }[language];

  const messages = [
    {
      role: "system" as const,
      content:
        `You are an expert Meta Ads copywriter for Indian small businesses (D2C brands, kirana, ` +
        `clinics, coaching, salons). Write copy that converts on Facebook + Instagram + WhatsApp ` +
        `for the Indian market. Always be specific, concrete, and emotional — never generic. ` +
        `${languageHint} ${objectiveHint}`,
    },
    {
      role: "user" as const,
      content:
        `Product/service description (from the business owner):\n"""\n${description}\n"""\n\n` +
        (body.audience ? `Target audience the owner has in mind: ${body.audience}\n\n` : ``) +
        `Generate a JSON response with this exact shape (no extra fields):\n` +
        `{\n` +
        `  "campaign_name": "<short 3-6 word internal campaign name>",\n` +
        `  "variants": [\n` +
        `    { "label": "Bold",     "headline": "<≤40 chars>", "primary_text": "<≤125 chars>", "icebreaker": "<≤120 chars WhatsApp opener the customer will see>" },\n` +
        `    { "label": "Friendly", "headline": "<≤40 chars>", "primary_text": "<≤125 chars>", "icebreaker": "<≤120 chars>" },\n` +
        `    { "label": "Urgent",   "headline": "<≤40 chars>", "primary_text": "<≤125 chars>", "icebreaker": "<≤120 chars>" }\n` +
        `  ],\n` +
        `  "targeting_interests": ["<5-7 Meta-style interest names — real things like 'Online shopping', 'Food and drink', 'Indian wedding', not vague categories>"],\n` +
        `  "budget_inr_daily": <integer, conservative recommendation between 300 and 3000 based on product price>,\n` +
        `  "budget_reasoning": "<1 short sentence why this budget>",\n` +
        `  "cta_label": "<one of: LEARN_MORE | SHOP_NOW | SIGN_UP | CONTACT_US | GET_OFFER | BOOK_NOW | ORDER_NOW>"\n` +
        `}\n\n` +
        `Hard constraints:\n` +
        `- headline ≤ 40 chars (Meta's hard limit)\n` +
        `- primary_text ≤ 125 chars\n` +
        `- icebreaker should sound like the CUSTOMER messaging the business — first person, 1-2 sentences\n` +
        `- 3 variants must feel distinctly different — not just rephrasings\n` +
        `- targeting_interests must be real Meta interest categories, not vague generic terms\n` +
        `- budget_inr_daily for low-margin/price products ≤ ₹500 → 300-500/day; ₹500-2000 → 500-1000/day; >₹2000 → 1000-3000/day`,
    },
  ];

  try {
    const result = await chatJson<AdCopyResult>(messages, {
      model: "gpt-4o-mini",
      temperature: 0.85,  // higher for creative variation
      maxTokens: 1100,    // 3 variants + targeting + budget reasoning needs room
    });

    // Defensive: trim oversize fields rather than rejecting Meta's accepted output
    const trimmed: AdCopyResult = {
      campaign_name: (result.json.campaign_name ?? "Untitled campaign").slice(0, 80),
      variants: (result.json.variants ?? []).slice(0, 3).map((v) => ({
        label: (v.label ?? "Variant").slice(0, 20),
        headline: (v.headline ?? "").slice(0, 40),
        primary_text: (v.primary_text ?? "").slice(0, 125),
        icebreaker: (v.icebreaker ?? "").slice(0, 200),
      })),
      targeting_interests: (result.json.targeting_interests ?? []).slice(0, 7),
      budget_inr_daily: Math.max(300, Math.min(5000, Math.round(Number(result.json.budget_inr_daily ?? 500)))),
      budget_reasoning: (result.json.budget_reasoning ?? "").slice(0, 200),
      cta_label: result.json.cta_label ?? (objective === "ctw" ? "LEARN_MORE" : "SHOP_NOW"),
    };

    if (trimmed.variants.length === 0) {
      return c.json({ error: "AI returned no variants — try a different description" }, 502);
    }

    await logAiUsage({
      userId: c.var.userId,
      feature: "ad_copy",
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      costInr: result.costInr,
      ok: true,
    });

    return c.json({
      ok: true,
      ...trimmed,
      meta: {
        model: result.model,
        tokens: { input: result.promptTokens, output: result.completionTokens },
        cost_inr: result.costInr,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logAiUsage({
      userId: c.var.userId,
      feature: "ad_copy",
      model: "gpt-4o-mini",
      promptTokens: 0,
      completionTokens: 0,
      costInr: 0,
      ok: false,
      errorMessage: msg,
    });
    return c.json({ error: "AI generation failed", detail: msg }, 502);
  }
});

export default app;
