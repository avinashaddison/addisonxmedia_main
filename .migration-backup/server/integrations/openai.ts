/**
 * OpenAI client wrapper for Addison AI.
 *
 * - Thin layer over the official `openai` package — exposes `chat()` and
 *   `chatJson()`, both returning content + token counts so the caller can
 *   log usage and bill against the monthly cap.
 * - Reads `OPENAI_API_KEY` from env. If missing, `isAiConfigured()` returns
 *   false and every AI route should short-circuit with 503 "AI not
 *   configured" — keeps the rest of the app working when the key isn't set
 *   (e.g. a self-hoster who only wants the CRM).
 * - Pricing constants below are in USD-per-1M-tokens (current as of
 *   2026-05) — multiplied by USD→INR for cost logging. Update when OpenAI
 *   changes rates.
 *
 * No retries, no streaming, no fallbacks. Keep it boring — add complexity
 * only when a real production incident demands it.
 */

import OpenAI from "openai";

let _client: OpenAI | null = null;

const getClient = (): OpenAI => {
  if (_client) return _client;
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");
  _client = new OpenAI({ apiKey: key });
  return _client;
};

export const isAiConfigured = (): boolean => !!process.env.OPENAI_API_KEY;

// USD → INR. Cheap-and-cheerful: hardcoded. Could fetch live rate later;
// for cost-logging purposes a 5% drift doesn't matter.
const USD_INR = 85;

// USD per 1M tokens. Source: https://openai.com/api/pricing/
const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "gpt-4o":      { input: 2.50, output: 10.00 },
  "gpt-5.5":     { input: 5.00, output: 30.00 },
};

const costInr = (model: string, promptTokens: number, completionTokens: number): number => {
  const p = PRICING[model];
  if (!p) return 0; // unknown model — log 0, admin will notice via the row
  const usd = (promptTokens * p.input + completionTokens * p.output) / 1_000_000;
  return Math.round(usd * USD_INR * 10_000) / 10_000; // 4-decimal precision
};

export type AiModel = "gpt-4o-mini" | "gpt-4o" | "gpt-5.5";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatResult = {
  content: string;
  model: AiModel;
  promptTokens: number;
  completionTokens: number;
  costInr: number;
};

export type ChatOpts = {
  model?: AiModel;
  temperature?: number;
  maxTokens?: number;
};

/** Plain-text chat completion. */
export const chat = async (
  messages: ChatMessage[],
  opts: ChatOpts = {},
): Promise<ChatResult> => {
  const model = opts.model ?? "gpt-4o-mini";
  const resp = await getClient().chat.completions.create({
    model,
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 600,
  });
  const content = resp.choices[0]?.message?.content?.trim() ?? "";
  const promptTokens = resp.usage?.prompt_tokens ?? 0;
  const completionTokens = resp.usage?.completion_tokens ?? 0;
  return {
    content,
    model,
    promptTokens,
    completionTokens,
    costInr: costInr(model, promptTokens, completionTokens),
  };
};

/**
 * JSON-mode chat completion. Returns parsed JSON.
 * IMPORTANT: when using this, your prompt MUST mention "JSON" somewhere
 * (OpenAI requirement) — otherwise the API rejects the request. We
 * inject a system line that does this automatically.
 */
export const chatJson = async <T = unknown>(
  messages: ChatMessage[],
  opts: ChatOpts = {},
): Promise<ChatResult & { json: T }> => {
  const model = opts.model ?? "gpt-4o-mini";
  const withJsonInstruction: ChatMessage[] = [
    { role: "system", content: "Respond ONLY with valid JSON. No prose, no markdown fences." },
    ...messages,
  ];
  const resp = await getClient().chat.completions.create({
    model,
    messages: withJsonInstruction,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 600,
    response_format: { type: "json_object" },
  });
  const content = resp.choices[0]?.message?.content?.trim() ?? "{}";
  const promptTokens = resp.usage?.prompt_tokens ?? 0;
  const completionTokens = resp.usage?.completion_tokens ?? 0;
  let json: T;
  try {
    json = JSON.parse(content) as T;
  } catch {
    throw new Error(`OpenAI returned invalid JSON: ${content.slice(0, 200)}`);
  }
  return {
    content,
    model,
    promptTokens,
    completionTokens,
    costInr: costInr(model, promptTokens, completionTokens),
    json,
  };
};
