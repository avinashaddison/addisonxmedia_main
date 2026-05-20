/**
 * Workspace AI persona — read/write + sensible defaults.
 *
 * Step 3 (reply suggestions) will call getPersonaWithDefaults() before every
 * OpenAI call to ground the system prompt. By returning defaults when no row
 * exists, brand-new workspaces get usable AI from day one without forcing
 * them through the training form first.
 *
 * The defaults are deliberately generic — accurate enough that a generic
 * "friendly Hinglish reply" comes back, vague enough that the AI doesn't
 * fabricate prices or product details it doesn't know.
 */

import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { aiPersona, user } from "../db/schema";

export type PersonaTone = "friendly" | "professional" | "casual" | "urgent_sales";
export type PersonaLanguage = "hinglish" | "hindi" | "english";

export type Persona = {
  business_name: string;
  what_we_sell: string;
  tone: PersonaTone;
  response_language: PersonaLanguage;
  always_say: string;
  never_say: string;
  escalate_keywords: string;
};

const DEFAULT_PERSONA: Persona = {
  business_name: "",
  what_we_sell: "",
  tone: "friendly",
  response_language: "hinglish",
  always_say: "",
  never_say: "",
  escalate_keywords: "refund, complaint, legal, lawyer, scam, police, cheating, fraud",
};

const VALID_TONES: PersonaTone[] = ["friendly", "professional", "casual", "urgent_sales"];
const VALID_LANGUAGES: PersonaLanguage[] = ["hinglish", "hindi", "english"];

/** Read this workspace's persona, falling back to defaults + the user's name. */
export const getPersonaWithDefaults = async (userId: string): Promise<Persona> => {
  const [row] = await db.select().from(aiPersona).where(eq(aiPersona.userId, userId)).limit(1);

  if (!row) {
    // Borrow the user's display name as a starting business name so the AI
    // doesn't say "Hello from My Business 👋" on day one.
    const [u] = await db.select({ name: user.name }).from(user).where(eq(user.id, userId)).limit(1);
    return { ...DEFAULT_PERSONA, business_name: u?.name ?? "" };
  }

  return {
    business_name: row.businessName,
    what_we_sell: row.whatWeSell,
    tone: (VALID_TONES.includes(row.tone as PersonaTone) ? row.tone : "friendly") as PersonaTone,
    response_language: (VALID_LANGUAGES.includes(row.responseLanguage as PersonaLanguage) ? row.responseLanguage : "hinglish") as PersonaLanguage,
    always_say: row.alwaysSay,
    never_say: row.neverSay,
    escalate_keywords: row.escalateKeywords,
  };
};

/**
 * Upsert the workspace's persona. Whitelisted-field update — callers can
 * only change the fields below; user_id + timestamps are server-managed.
 */
export const updatePersona = async (
  userId: string,
  patch: Partial<Persona>,
): Promise<Persona> => {
  // Validate enums — bad values silently fall back to defaults so a typo
  // doesn't break the AI later.
  const tone = patch.tone && VALID_TONES.includes(patch.tone) ? patch.tone : undefined;
  const responseLanguage = patch.response_language && VALID_LANGUAGES.includes(patch.response_language)
    ? patch.response_language
    : undefined;

  // Build the values object so omitted keys are left alone on update.
  const values = {
    userId,
    businessName: patch.business_name ?? "",
    whatWeSell: patch.what_we_sell ?? "",
    tone: tone ?? "friendly",
    responseLanguage: responseLanguage ?? "hinglish",
    alwaysSay: patch.always_say ?? "",
    neverSay: patch.never_say ?? "",
    escalateKeywords: patch.escalate_keywords ?? DEFAULT_PERSONA.escalate_keywords,
    updatedAt: new Date(),
  };

  const updateSet: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.business_name !== undefined) updateSet.businessName = patch.business_name;
  if (patch.what_we_sell !== undefined) updateSet.whatWeSell = patch.what_we_sell;
  if (tone !== undefined) updateSet.tone = tone;
  if (responseLanguage !== undefined) updateSet.responseLanguage = responseLanguage;
  if (patch.always_say !== undefined) updateSet.alwaysSay = patch.always_say;
  if (patch.never_say !== undefined) updateSet.neverSay = patch.never_say;
  if (patch.escalate_keywords !== undefined) updateSet.escalateKeywords = patch.escalate_keywords;

  await db.insert(aiPersona)
    .values(values)
    .onConflictDoUpdate({ target: aiPersona.userId, set: updateSet });

  return getPersonaWithDefaults(userId);
};
