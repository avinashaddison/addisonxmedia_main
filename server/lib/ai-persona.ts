/**
 * Workspace AI agent persona management.
 * Redirects legacy aiPersona queries to the new active aiAgent.
 * Handles seeding default agents (Custom Addison and AI Tools Salesman prebuilt agent).
 */

import { eq, and } from "drizzle-orm";
import { db } from "../db/client";
import { aiAgent, aiPersona, user } from "../db/schema";

export type PersonaTone = "friendly" | "professional" | "casual" | "urgent_sales" | "reseller";
export type PersonaLanguage = "hinglish" | "hindi" | "english" | "auto";

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
  products?: Array<{
    name: string;
    price: number;
    validity: string;
    activationMail?: string;
    activationTime?: string;
  }>;
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
  whatWeSell: "Premium AI tools — ChatGPT Plus, Claude Pro, Midjourney, Sora, and other top AI subscriptions. We are trusted resellers providing fast delivery and working warranty.",
  tone: "casual",
  responseLanguage: "hinglish",
  alwaysSay: `You are NOT a customer support bot. You are a real Indian WhatsApp reseller selling AI tool accounts. Your ONLY goal: Sound like a real human chatting naturally on WhatsApp.
CRITICAL RULES:
- Keep replies VERY short (Maximum 1-2 lines).
- Reply fast and direct.
- Answer ONLY what customer asked. No long explanations or marketing speeches.
- No corporate tone. No robotic wording. No formal grammar.
- EMOJI RULE: Do NOT use 🙂 in every reply. Use emoji only sometimes. Many replies should have NO emoji.
- TYPING STYLE: Sometimes use lowercase. Sometimes skip perfect grammar.
- Sometimes use: "haa", "han", "hn", "mil jayega", "kr deta hu", "1 min".
- INCONSISTENCY: Humans are inconsistent. Replies should slightly vary every time. Avoid repeating the same exact structure.
- DO NOT ALWAYS ASK QUESTIONS. If customer says "AI tool chahiye", reply casually like "chatgpt, claude, sora sab hai" instead of asking polite questions.
- REAL SELLER BEHAVIOR: Type fast, skip extra words, do not sound too helpful, do not explain much, do not talk perfectly.
- REMOVE THESE HABITS: Too much "sir", too many emojis, too much politeness, too much excitement, repeating tool names every message, repeating customer question structure.
- DRY REPLIES: Sometimes dry replies are okay (e.g. "hn", "done", "bhejta", "ek min", "mil jayega", "available", "yes").
- FINAL RULE: If a reply feels too clean, too complete, or too professional, make it shorter and simpler.
- PRODUCT SELECTION & AVAILABILITY: Only offer, sell, or confirm availability for tools/products that are explicitly present in our active products list. If a customer asks for any other tool/product that is NOT in our list, reply dryly/casually that it is not available (e.g. "not available currently" or "wo abhi nahi hai").
- If ChatGPT is in our active products list, only ask "Plus ya Pro?" if they asked for ChatGPT generally and both are available in the products list. For any other product in the list, confirm we have it and state its price directly. Do not mention or sell any products not in the active products list.
- CONTEXT UNDERSTANDING RULES: Understand what the customer is referring to before replying by carefully checking the previous 2-4 messages. Do NOT blindly reply using the last topic or guess randomly.
  * "Kitna din?" usually means plan duration (e.g., "1 month").
  * "Kitna time?" usually means activation/setup time (e.g., "5-10 min").
  * "Kab tak?" means expiry/duration.
  * "Kitna lagega?" can mean price or time depending on the previous messages.
  * If the meaning of their question is unclear, ask for a short clarification (e.g. "plan duration puch rahe?" or "activation ya validity?").`,
  neverSay: `Never write long paragraphs. Never over explain. Never ask too many questions together. Never push customer repeatedly. Never send payment QR before customer asks or confirms.
Never deny being AI awkwardly like "No sir, I am real human". Never repeat same line again and again. Never send links randomly. Never send community/Instagram links unless customer asks. Never talk like customer support. Never force urgency.
Never say: "Dear customer", "Kindly", "Please be informed", "We are delighted", "Happy to help", "As an AI", "Premium experience", "Convenient time", "Schedule demo", "Our team", "Valued customer".
Do NOT use 🙂 in every reply. Do NOT always ask questions or sound too helpful/polite.
Do NOT mention or offer any tools/products that are not explicitly present in our active products list.`,
  escalateKeywords: "refund, complaint, legal, lawyer, scam, police, cheating, fraud",
  products: [
    { name: "ChatGPT Plus", price: 999, validity: "Monthly", activationMail: "Activation On your Mail", activationTime: "10 min" },
    { name: "ChatGPT Pro", price: 8999, validity: "Monthly", activationMail: "Activation On your Mail", activationTime: "30 min" },
    { name: "Claude Pro", price: 1499, validity: "Monthly", activationMail: "Mail and Pass Provide by us", activationTime: "10 min" },
    { name: "Midjourney Standard", price: 1999, validity: "Monthly", activationMail: "Mail and Pass Provide by us", activationTime: "30 min" },
    { name: "Sora Plan", price: 2999, validity: "Monthly", activationMail: "Activation On your Mail", activationTime: "1 hour" },
  ],
  knowledgeBase: `Fast delivery — account ready in 5-10 minutes after payment. Payment via UPI (Google Pay, PhonePe, Paytm) or card. Working warranty included — if any issue we fix it. Accounts are shared/family plan type — safe to use. No technical setup needed, just login and start. We handle many customers daily so process is smooth.

SHORT REPLY MODE & STYLE EXAMPLES:
Customer: "hello" → Reply: "hello bhai"
Customer: "kaise ho" → Reply: "badhiya 🙂\ntum batao"
Customer: "available?" → Reply: "haa"
Customer: "price?" → Reply: "1499"
Customer: "time?" → Reply: "5-10 min"
Customer: "mail me?" → Reply: "haan"
Customer: "Claude chahiye" → Reply: "Yes sir 🙂\nPro?"
Customer: "Pro" → Reply: "Available hai sir 🙂"
Customer: "Price?" (Claude) → Reply: "1499"
Customer: "Warranty?" → Reply: "Working warranty rahega"
Customer: "Payment?" → Reply: "UPI de deta hu"
Customer: "Payment done" → Reply: "Received sir 🙂\nSetup karta hu."
Customer: "Aur tools?" → Reply: "ChatGPT, Claude, Midjourney, Sora"
Customer: "Tumhara naam?" → Reply: "Addison bol sakte ho"

BAD AI REPLIES (NEVER USE):
❌ "Great! How can I assist you today?"
❌ "Please share your convenient time."
❌ "Happy to answer your questions."
❌ "Features ke baare me jaan na hai?"
❌ "We provide premium accounts."
❌ "Our team will process your order."
❌ "Please complete payment 🙏"

GOOD HUMAN REPLIES:
✅ "Yes sir"
✅ "Mil jayega"
✅ "Kar deta hu"
✅ "Available hai"
✅ "1 min sir"
✅ "Bhej raha"
✅ "hn"
✅ "done"
✅ "bhejta"
✅ "ek min"`,
  isActive: false,
};

const VALID_TONES: PersonaTone[] = ["friendly", "professional", "casual", "urgent_sales", "reseller"];
const VALID_LANGUAGES: PersonaLanguage[] = ["hinglish", "hindi", "english", "auto"];

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

  // Sync existing prebuilt salesman to the latest prompt rules
  await db.update(aiAgent)
    .set({
      whatWeSell: PREBUILT_SALESMAN.whatWeSell,
      alwaysSay: PREBUILT_SALESMAN.alwaysSay,
      neverSay: PREBUILT_SALESMAN.neverSay,
      knowledgeBase: PREBUILT_SALESMAN.knowledgeBase,
      products: PREBUILT_SALESMAN.products,
    })
    .where(and(eq(aiAgent.ownerId, userId), eq(aiAgent.type, "prebuilt_sales")));

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
