/**
 * Workspace AI agent persona management.
 * Redirects legacy aiPersona queries to the new active aiAgent.
 * Handles seeding default agents (Custom Addison and AI Tools Salesman prebuilt agent).
 */

import { eq, and } from "drizzle-orm";
import { db } from "../db/client";
import { aiAgent, aiPersona, user } from "../db/schema";

export type PersonaTone = "friendly" | "professional" | "casual" | "urgent_sales";
export type PersonaLanguage = "hinglish" | "hindi" | "english";

export type Persona = {
  id?: string;
  name?: string;
  type?: string;
  business_name: string;
  what_we_sell: string;
  tone: PersonaTone;
  response_language: PersonaLanguage;
  always_say: string;
  never_say: string;
  escalate_keywords: string;
  products?: Array<{ name: string; price: number; validity: string }>;
  knowledge_base?: string;
  is_active?: boolean;
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

const PREBUILT_SALESMAN: Omit<typeof aiAgent.$inferInsert, "ownerId"> = {
  name: "AI Tools Salesman",
  type: "prebuilt_sales",
  businessName: "AI Tool Shop",
  whatWeSell: "We sell premium AI tools to automate workflows, transcribe audio, generate high-converting copy, and create beautiful images.",
  tone: "casual",
  responseLanguage: "hinglish",
  alwaysSay: "Briefly explain the benefit of the tool. Offer a 3-day free trial first. Mention the price and validity in a friendly manner.",
  neverSay: "Do not promise 100% accuracy. Do not offer custom discounts. Do not say refunds are available.",
  escalateKeywords: "refund, complaint, legal, lawyer, scam, police, cheating, fraud",
  products: [
    { name: "Image Studio Pro", price: 999, validity: "Monthly" },
    { name: "AudioTranscribe AI", price: 1499, validity: "Monthly" },
    { name: "Copywriter Pro", price: 4999, validity: "Yearly" }
  ],
  knowledgeBase: "All tools come with a 3-day free trial with full access. Round-the-clock support is provided. Payments can be made via UPI or Credit/Debit cards. Setup takes less than 2 minutes.",
  isActive: false,
};

const VALID_TONES: PersonaTone[] = ["friendly", "professional", "casual", "urgent_sales"];
const VALID_LANGUAGES: PersonaLanguage[] = ["hinglish", "hindi", "english"];

/** Seed default agents if none exist for this user. */
export const seedAgentsIfEmpty = async (userId: string): Promise<void> => {
  const existing = await db.select().from(aiAgent).where(eq(aiAgent.ownerId, userId)).limit(1);
  if (existing.length > 0) return;

  // Try to migrate data from legacy aiPersona
  const [legacy] = await db.select().from(aiPersona).where(eq(aiPersona.userId, userId)).limit(1);
  
  let customBusinessName = "";
  let customWhatWeSell = "";
  let customTone: PersonaTone = "friendly";
  let customLang: PersonaLanguage = "hinglish";
  let customAlways = "";
  let customNever = "";
  let customEscalate = DEFAULT_PERSONA.escalate_keywords;

  if (legacy) {
    customBusinessName = legacy.businessName;
    customWhatWeSell = legacy.whatWeSell;
    customTone = (VALID_TONES.includes(legacy.tone as PersonaTone) ? legacy.tone : "friendly") as PersonaTone;
    customLang = (VALID_LANGUAGES.includes(legacy.responseLanguage as PersonaLanguage) ? legacy.responseLanguage : "hinglish") as PersonaLanguage;
    customAlways = legacy.alwaysSay;
    customNever = legacy.neverSay;
    customEscalate = legacy.escalateKeywords;
  } else {
    const [u] = await db.select({ name: user.name }).from(user).where(eq(user.id, userId)).limit(1);
    customBusinessName = u?.name ?? "";
  }

  // Insert default custom agent (active)
  await db.insert(aiAgent).values({
    ownerId: userId,
    name: "Addison AI (Default)",
    type: "custom",
    businessName: customBusinessName,
    whatWeSell: customWhatWeSell,
    tone: customTone,
    responseLanguage: customLang,
    alwaysSay: customAlways,
    neverSay: customNever,
    escalateKeywords: customEscalate,
    isActive: true,
  });

  // Insert prebuilt salesman agent (inactive)
  await db.insert(aiAgent).values({
    ownerId: userId,
    ...PREBUILT_SALESMAN,
  });
};

/** Read the active agent for the workspace. */
export const getActiveAgent = async (userId: string): Promise<typeof aiAgent.$inferSelect> => {
  await seedAgentsIfEmpty(userId);
  const [active] = await db.select().from(aiAgent)
    .where(and(eq(aiAgent.ownerId, userId), eq(aiAgent.isActive, true)))
    .limit(1);
  
  if (active) return active;

  // Fallback if somehow no agent is marked active
  const [first] = await db.select().from(aiAgent).where(eq(aiAgent.ownerId, userId)).limit(1);
  return first;
};

/** Compatibility helper: Read active agent as Persona structure. */
export const getPersonaWithDefaults = async (userId: string): Promise<Persona> => {
  const active = await getActiveAgent(userId);
  return {
    id: active.id,
    name: active.name,
    type: active.type,
    business_name: active.businessName,
    what_we_sell: active.whatWeSell,
    tone: (VALID_TONES.includes(active.tone as PersonaTone) ? active.tone : "friendly") as PersonaTone,
    response_language: (VALID_LANGUAGES.includes(active.responseLanguage as PersonaLanguage) ? active.responseLanguage : "hinglish") as PersonaLanguage,
    always_say: active.alwaysSay,
    never_say: active.neverSay,
    escalate_keywords: active.escalateKeywords,
    products: active.products as Persona["products"],
    knowledge_base: active.knowledgeBase ?? "",
    is_active: active.isActive,
  };
};

/** Compatibility helper: Update the active agent. */
export const updatePersona = async (
  userId: string,
  patch: Partial<Persona>,
): Promise<Persona> => {
  const active = await getActiveAgent(userId);

  const tone = patch.tone && VALID_TONES.includes(patch.tone) ? patch.tone : undefined;
  const responseLanguage = patch.response_language && VALID_LANGUAGES.includes(patch.response_language)
    ? patch.response_language
    : undefined;

  const updateSet: Partial<typeof aiAgent.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (patch.name !== undefined) updateSet.name = patch.name;
  if (patch.business_name !== undefined) updateSet.businessName = patch.business_name;
  if (patch.what_we_sell !== undefined) updateSet.whatWeSell = patch.what_we_sell;
  if (tone !== undefined) updateSet.tone = tone;
  if (responseLanguage !== undefined) updateSet.responseLanguage = responseLanguage;
  if (patch.always_say !== undefined) updateSet.alwaysSay = patch.always_say;
  if (patch.never_say !== undefined) updateSet.neverSay = patch.never_say;
  if (patch.escalate_keywords !== undefined) updateSet.escalateKeywords = patch.escalate_keywords;
  if (patch.products !== undefined) updateSet.products = patch.products;
  if (patch.knowledge_base !== undefined) updateSet.knowledgeBase = patch.knowledge_base;

  await db.update(aiAgent)
    .set(updateSet)
    .where(eq(aiAgent.id, active.id));

  return getPersonaWithDefaults(userId);
};
