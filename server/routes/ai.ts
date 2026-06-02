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
import { contact, conversation, message, product, aiAgent, profile } from "../db/schema";
import { requireAuth, type AuthVariables } from "../middleware/auth";
import { rateLimit } from "../middleware/rateLimit";
import { requirePlan } from "../middleware/requirePlan";
import { escapeSqlLike } from "../utils";
import { chat, chatJson, isAiConfigured } from "../integrations/openai";
import { checkAiCap, logAiUsage, getUsageSummary } from "../lib/ai-usage";
import { getPersonaWithDefaults, updatePersona, type Persona, seedAgentsIfEmpty } from "../lib/ai-persona";
import { getHumanizedSuggestions } from "../lib/human-seller";

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

app.get("/ai/agents", async (c) => {
  const userId = c.var.userId;
  await seedAgentsIfEmpty(userId);
  const agents = await db.select().from(aiAgent).where(eq(aiAgent.ownerId, userId)).orderBy(desc(aiAgent.createdAt));
  const productsRows = await db.select().from(product)
    .where(and(eq(product.ownerId, userId), eq(product.status, "active")))
    .orderBy(asc(product.sortOrder));

  return c.json(agents.map(a => {
    const agentProducts = Array.isArray(a.products) ? (a.products as any[]) : [];
    const mergedProducts = productsRows.map(p => {
      const existing = agentProducts.find((ap: any) => ap.name && ap.name.toLowerCase() === p.name.toLowerCase());
      return {
        name: p.name,
        price: Number(p.priceInr) || 0,
        imageUrl: p.photoUrl || "",
        description: p.description || "",
        validity: existing?.validity || "Lifetime",
        activationMail: existing?.activationMail || existing?.activation_mail || "On your Mail",
        activationTime: existing?.activationTime || existing?.activation_time || "10 min",
        priceUsd: existing?.priceUsd || existing?.price_usd,
        isReseller: existing?.isReseller || existing?.is_reseller || false,
        resellerPrice: existing?.resellerPrice || existing?.reseller_price,
        resellerPriceUsd: existing?.resellerPriceUsd || existing?.reseller_price_usd,
      };
    });

    return {
      id: a.id,
      owner_id: a.ownerId,
      name: a.name,
      type: a.type,
      business_name: a.businessName,
      what_we_sell: a.whatWeSell,
      tone: a.tone,
      response_language: a.responseLanguage,
      always_say: a.alwaysSay,
      never_say: a.neverSay,
      escalate_keywords: a.escalateKeywords,
      products: mergedProducts,
      raw_products: agentProducts,
      knowledge_base: a.knowledgeBase,
      system_prompt: a.systemPrompt,
      prebuilt_id: a.prebuiltId,
      is_active: a.isActive,
      upi_vpa: a.upiVpa || "",
      binance_id: a.binanceId || "",
      qr_image_url: a.qrImageUrl || "",
      created_at: a.createdAt,
      updated_at: a.updatedAt,
    };
  }));
});

app.post("/ai/agents", async (c) => {
  const userId = c.var.userId;
  const body = await c.req.json<any>();
  const [agent] = await db.insert(aiAgent).values({
    ownerId: userId,
    name: body.name || "New Custom Agent",
    type: "custom",
    businessName: body.business_name || "",
    whatWeSell: body.what_we_sell || "",
    tone: body.tone || "friendly",
    responseLanguage: body.response_language || "hinglish",
    alwaysSay: body.always_say || "",
    neverSay: body.never_say || "",
    escalateKeywords: body.escalate_keywords || "refund, complaint, legal, lawyer, scam, police, cheating, fraud",
    products: body.products || [],
    knowledgeBase: body.knowledge_base || "",
    systemPrompt: body.system_prompt || "",
    upiVpa: body.upi_vpa || null,
    binanceId: body.binance_id || null,
    qrImageUrl: body.qr_image_url || null,
    isActive: false,
  }).returning();

  if (body.products && Array.isArray(body.products)) {
    const incomingNames = new Set(body.products.map((p: any) => (p.name || "").trim().toLowerCase()).filter(Boolean));
    const dbProds = await db.select().from(product).where(and(eq(product.ownerId, userId), eq(product.status, "active")));
    for (const dp of dbProds) {
      if (!incomingNames.has(dp.name.toLowerCase())) {
        await db.update(product).set({ status: "archived", updatedAt: new Date() }).where(eq(product.id, dp.id));
      }
    }

    for (const p of body.products) {
      if (!p.name) continue;
      const priceStr = String(p.price || 0);
      const [existingProd] = await db.select().from(product)
        .where(and(eq(product.ownerId, userId), eq(product.name, p.name))).limit(1);
      if (existingProd) {
        await db.update(product).set({
          priceInr: priceStr,
          photoUrl: p.imageUrl || p.image_url || null,
          description: p.description || null,
          status: "active",
          updatedAt: new Date()
        }).where(eq(product.id, existingProd.id));
      } else {
        await db.insert(product).values({
          ownerId: userId,
          name: p.name,
          priceInr: priceStr,
          photoUrl: p.imageUrl || p.image_url || null,
          description: p.description || null,
          status: "active"
        });
      }
    }
  }

  return c.json({
    id: agent.id,
    owner_id: agent.ownerId,
    name: agent.name,
    type: agent.type,
    business_name: agent.businessName,
    what_we_sell: agent.whatWeSell,
    tone: agent.tone,
    response_language: agent.responseLanguage,
    always_say: agent.alwaysSay,
    never_say: agent.neverSay,
    escalate_keywords: agent.escalateKeywords,
    products: agent.products,
    knowledge_base: agent.knowledgeBase,
    system_prompt: agent.systemPrompt,
    prebuilt_id: agent.prebuiltId,
    is_active: agent.isActive,
    upi_vpa: agent.upiVpa || "",
    binance_id: agent.binanceId || "",
    qr_image_url: agent.qrImageUrl || "",
    created_at: agent.createdAt,
    updated_at: agent.updatedAt,
  }, 201);
});

app.patch("/ai/agents/:id", async (c) => {
  const userId = c.var.userId;
  const id = c.req.param("id");
  const body = await c.req.json<any>();

  const updateSet: any = { updatedAt: new Date() };
  if (body.name !== undefined) updateSet.name = body.name;
  if (body.business_name !== undefined) updateSet.businessName = body.business_name;
  if (body.what_we_sell !== undefined) updateSet.whatWeSell = body.what_we_sell;
  if (body.tone !== undefined) updateSet.tone = body.tone;
  if (body.response_language !== undefined) updateSet.responseLanguage = body.response_language;
  if (body.always_say !== undefined) updateSet.alwaysSay = body.always_say;
  if (body.never_say !== undefined) updateSet.neverSay = body.never_say;
  if (body.escalate_keywords !== undefined) updateSet.escalateKeywords = body.escalate_keywords;
  if (body.products !== undefined) updateSet.products = body.products;
  if (body.knowledge_base !== undefined) updateSet.knowledgeBase = body.knowledge_base;
  if (body.system_prompt !== undefined) updateSet.systemPrompt = body.system_prompt;
  if (body.upi_vpa !== undefined) updateSet.upiVpa = body.upi_vpa || null;
  if (body.binance_id !== undefined) updateSet.binanceId = body.binance_id || null;
  if (body.qr_image_url !== undefined) updateSet.qrImageUrl = body.qr_image_url || null;

  const [agent] = await db.update(aiAgent)
    .set(updateSet)
    .where(and(eq(aiAgent.id, id), eq(aiAgent.ownerId, userId)))
    .returning();

  if (!agent) return c.json({ error: "Agent not found" }, 404);

  if (body.products && Array.isArray(body.products)) {
    const incomingNames = new Set(body.products.map((p: any) => (p.name || "").trim().toLowerCase()).filter(Boolean));
    const dbProds = await db.select().from(product).where(and(eq(product.ownerId, userId), eq(product.status, "active")));
    for (const dp of dbProds) {
      if (!incomingNames.has(dp.name.toLowerCase())) {
        await db.update(product).set({ status: "archived", updatedAt: new Date() }).where(eq(product.id, dp.id));
      }
    }

    for (const p of body.products) {
      if (!p.name) continue;
      const priceStr = String(p.price || 0);
      const [existingProd] = await db.select().from(product)
        .where(and(eq(product.ownerId, userId), eq(product.name, p.name))).limit(1);
      if (existingProd) {
        await db.update(product).set({
          priceInr: priceStr,
          photoUrl: p.imageUrl || p.image_url || null,
          description: p.description || null,
          status: "active",
          updatedAt: new Date()
        }).where(eq(product.id, existingProd.id));
      } else {
        await db.insert(product).values({
          ownerId: userId,
          name: p.name,
          priceInr: priceStr,
          photoUrl: p.imageUrl || p.image_url || null,
          description: p.description || null,
          status: "active"
        });
      }
    }
  }

  return c.json({
    id: agent.id,
    owner_id: agent.ownerId,
    name: agent.name,
    type: agent.type,
    business_name: agent.businessName,
    what_we_sell: agent.whatWeSell,
    tone: agent.tone,
    response_language: agent.responseLanguage,
    always_say: agent.alwaysSay,
    never_say: agent.neverSay,
    escalate_keywords: agent.escalateKeywords,
    products: agent.products,
    knowledge_base: agent.knowledgeBase,
    system_prompt: agent.systemPrompt,
    prebuilt_id: agent.prebuiltId,
    is_active: agent.isActive,
    upi_vpa: agent.upiVpa || "",
    binance_id: agent.binanceId || "",
    qr_image_url: agent.qrImageUrl || "",
    created_at: agent.createdAt,
    updated_at: agent.updatedAt,
  });
});

app.post("/ai/agents/:id/activate", async (c) => {
  const userId = c.var.userId;
  const id = c.req.param("id");

  const [agent] = await db.select().from(aiAgent).where(and(eq(aiAgent.id, id), eq(aiAgent.ownerId, userId))).limit(1);
  if (!agent) return c.json({ error: "Agent not found" }, 404);

  await db.update(aiAgent).set({ isActive: false, updatedAt: new Date() }).where(eq(aiAgent.ownerId, userId));
  await db.update(aiAgent).set({ isActive: true, updatedAt: new Date() }).where(eq(aiAgent.id, id));

  return c.json({ ok: true });
});

app.delete("/ai/agents/:id", async (c) => {
  const userId = c.var.userId;
  const id = c.req.param("id");

  const [agent] = await db.select().from(aiAgent).where(and(eq(aiAgent.id, id), eq(aiAgent.ownerId, userId))).limit(1);
  if (!agent) return c.json({ error: "Agent not found" }, 404);
  if (agent.type === "prebuilt_sales") {
    return c.json({ error: "Cannot delete a prebuilt agent" }, 400);
  }
  if (agent.isActive) {
    return c.json({ error: "Cannot delete an active agent. Please activate another agent first." }, 400);
  }

  await db.delete(aiAgent).where(eq(aiAgent.id, id));
  return c.json({ ok: true });
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
  reseller:     "Indian WhatsApp reseller style (dry, fast, casual Hinglish).",
};

const LANGUAGE_INSTRUCTIONS: Record<Persona["response_language"], string> = {
  hinglish: "Reply in Hinglish (roman-script Hindi/English code-switching) — how Indian SMBs actually chat on WhatsApp. Examples: 'Sure sir, ye details bhej deta hoon', 'Aap kal call kar sakte hain?'",
  hindi:    "Reply in Hindi using Devanagari script (हिंदी).",
  english:  "Reply in clean English — Indian business English is fine (e.g. 'Kindly', 'Please revert').",
  auto:     "Automatically detect and match the customer's language/script. If they message in Hinglish, reply in Hinglish. If they message in Devanagari Hindi, reply in Devanagari Hindi. If they message in English, reply in English.",
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

app.post("/ai/reply-suggestions", requirePlan('growth', 'scale', 'enterprise'), async (c) => {
  const userId = c.var.userId;
  const body = await c.req.json<{ conversation_id: string }>();
  if (!body.conversation_id) return c.json({ error: "conversation_id required" }, 400);

  if (!isAiConfigured()) return c.json({ error: "AI not configured on server" }, 503);

  try {
    const result = await getHumanizedSuggestions(userId, body.conversation_id);
    if (!result.allowed) {
      return c.json({ error: result.error, code: result.code }, 429);
    }

    return c.json({
      escalate: result.escalate,
      reason: result.reason,
      suggestions: result.suggestions,
      suggested_products: result.suggested_products,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
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

app.post("/ai/ad-copy", requirePlan('growth', 'scale', 'enterprise'), async (c) => {
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
