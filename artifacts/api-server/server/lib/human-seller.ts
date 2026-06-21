import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/client";
import { contact, conversation, message, aiAgent, profile } from "../db/schema";
import { chatJson, chat, isAiConfigured } from "../integrations/openai";
import { checkAiCap, logAiUsage } from "./ai-usage";
import logger from "./logger";

export interface ContactMemory {
  customer_name: string;
  language: string; // 'hinglish' | 'hindi' | 'english' | 'auto'
  tone: string; // 'casual' | 'neutral' | 'formal' | 'dry'
  preferred_tools: string[];
  buyer_type: string; // 'serious_buyer' | 'confused_buyer' | 'technical_buyer' | 'reseller' | 'timepass' | 'scammer' | 'fast_buyer' | 'premium_buyer'
  last_tool: string | null;
  payment_status: string; // 'pending' | 'completed'
  relationship_level: string; // 'new_customer' | 'regular_customer' | 'frequent_buyer'
  relationship_score: number; // incremented with every interaction
  context: {
    current_tool: string | null;
    payment_state: string | null; // 'none' | 'pricing_sent' | 'qr_sent' | 'paid'
    discussion_topic: string | null;
  };
  learning: {
    replies_sent: number;
    conversions: number;
    satisfaction_score: number;
    ai_detection_moments: number;
    best_performing_tone: string | null;
  };
}

const DEFAULT_MEMORY = (name: string): ContactMemory => ({
  customer_name: name || "Customer",
  language: "auto",
  tone: "neutral",
  preferred_tools: [],
  buyer_type: "serious_buyer",
  last_tool: null,
  payment_status: "pending",
  relationship_level: "new_customer",
  relationship_score: 0,
  context: {
    current_tool: null,
    payment_state: "none",
    discussion_topic: null,
  },
  learning: {
    replies_sent: 0,
    conversions: 0,
    satisfaction_score: 100,
    ai_detection_moments: 0,
    best_performing_tone: null,
  },
});

export interface MessageAnalysis {
  language: "English" | "Hinglish" | "Hindi";
  mood: "interested" | "neutral" | "angry" | "hurry" | "casual" | "suspicious" | "frustrated";
  buyer_type: "serious_buyer" | "confused_buyer" | "technical_buyer" | "reseller" | "timepass" | "scammer" | "fast_buyer" | "premium_buyer";
  urgency: "high" | "medium" | "low";
  intent: "pricing" | "availability" | "plan_validity" | "activation_time" | "payment_done" | "greeting" | "other";
  tone: "casual" | "neutral" | "formal" | "dry";
  detected_tool: string | null;
  payment_action: boolean; // True if they ask to pay, want payment QR/details, etc.
}

function calculateLeadScoreAndTag(
  currentScore: number,
  currentTag: "hot" | "warm" | "cold",
  analysis: MessageAnalysis
): { score: number; tag: "hot" | "warm" | "cold" } {
  let score = currentScore;

  // Base adjustments based on intent
  if (analysis.intent === "payment_done") {
    score = 100;
  } else if (analysis.payment_action) {
    score = Math.max(score, 90);
  } else if (analysis.intent === "pricing" || analysis.intent === "plan_validity" || analysis.intent === "activation_time") {
    score = Math.max(score, 60);
  } else if (analysis.intent === "availability") {
    score = Math.max(score, 45);
  }

  // Adjustments based on buyer type
  if (
    analysis.buyer_type === "serious_buyer" ||
    analysis.buyer_type === "fast_buyer" ||
    analysis.buyer_type === "premium_buyer" ||
    analysis.buyer_type === "reseller"
  ) {
    score = Math.max(score, 75);
  } else if (analysis.buyer_type === "timepass") {
    score = Math.min(score, 30);
  } else if (analysis.buyer_type === "scammer") {
    score = Math.min(score, 10);
  }

  // Adjustments based on mood and urgency
  if (analysis.mood === "interested") {
    score = Math.min(100, score + 10);
  }
  if (analysis.urgency === "high") {
    score = Math.min(100, score + 10);
  }

  // Cap score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // Determine tag from score
  let tag: "hot" | "warm" | "cold" = "cold";
  if (score >= 75) {
    tag = "hot";
  } else if (score >= 35) {
    tag = "warm";
  }

  return { score, tag };
}

/**
 * MESSAGE ANALYZER & INTENT DETECTOR
 * Runs an OpenAI analysis step to extract metadata from incoming message + recent history.
 */
export async function analyzeIncomingMessage(
  latestMessage: string,
  historyText: string,
  customerName: string
): Promise<MessageAnalysis> {
  const systemPrompt = `You are the Message Analyzer layer of a Human-Like WhatsApp Seller System.
Analyze the customer's latest message and the recent conversation history.
Extract structured metadata in the requested JSON format.

Available Intents:
- "pricing": asking for price, cost, discount, how much
- "availability": asking if a tool/product is in stock or if we have it
- "plan_validity": asking about duration, how many days, validity, expiry
- "activation_time": asking how much time it takes to deliver/activate
- "payment_done": confirming they paid, sent screenshot, payment done
- "greeting": hello, hi, how are you, kaise ho, bro
- "other": custom questions, support questions, technical specs

Return JSON in this format:
{
  "language": "English" | "Hinglish" | "Hindi",
  "mood": "interested" | "neutral" | "angry" | "hurry" | "casual" | "suspicious" | "frustrated",
  "buyer_type": "serious_buyer" | "confused_buyer" | "technical_buyer" | "reseller" | "timepass" | "scammer" | "fast_buyer" | "premium_buyer",
  "urgency": "high" | "medium" | "low",
  "intent": "pricing" | "availability" | "plan_validity" | "activation_time" | "payment_done" | "greeting" | "other",
  "tone": "casual" | "neutral" | "formal" | "dry",
  "detected_tool": "ChatGPT Plus" | "Claude Pro" | "Sora Plan" | null (or other specific AI tool they ask about),
  "payment_action": true | false (true ONLY if they explicitly want to pay, ask for QR code/UPI/link, or say they are ready to purchase now)
}`;

  const userPrompt = `Customer Name: ${customerName}
Conversation history:
${historyText}

Latest message: "${latestMessage}"`;

  try {
    const result = await chatJson<MessageAnalysis>(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { model: "gpt-4o-mini", temperature: 0.1, maxTokens: 250 }
    );
    return result.json;
  } catch (e) {
    logger.error({ err: e }, "Message analysis failed, using fallback analysis");
    // Fallback logic
    const lower = latestMessage.toLowerCase();
    const isPayment = lower.includes("qr") || lower.includes("pay") || lower.includes("upi") || lower.includes("bhejo") || lower.includes("gpay") || lower.includes("phonepe");
    const isPricing = lower.includes("price") || lower.includes("cost") || lower.includes("rate") || lower.includes("kitna") || lower.includes("amount") || lower.includes("charge");
    const isTime = lower.includes("time") || lower.includes("setup") || lower.includes("kab") || lower.includes("min") || lower.includes("hour");
    
    return {
      language: lower.match(/[अ-ह]/) ? "Hindi" : (lower.includes("bhai") || lower.includes("hai") || lower.includes("bhejo") ? "Hinglish" : "English"),
      mood: "neutral",
      buyer_type: "serious_buyer",
      urgency: "medium",
      intent: isPricing ? "pricing" : (isTime ? "activation_time" : (isPayment ? "payment_done" : "other")),
      tone: "neutral",
      detected_tool: lower.includes("claude") ? "Claude Pro" : (lower.includes("chatgpt") ? "ChatGPT Plus" : null),
      payment_action: isPayment && !lower.includes("done"),
    };
  }
}

/**
 * HUMANIZER ENGINE
 * Post-processes generated drafts to strip AI formatting and inject natural WhatsApp seller variations.
 */
export function humanizeReply(
  text: string,
  analysis: MessageAnalysis,
  memory: ContactMemory
): string {
  if (!text) return "";

  let reply = text.trim();

  // 1. Remove FORBIDDEN structures and greetings
  const forbiddenRegex = /(dear customer|kindly|happy to help|please be informed|valued customer|we are delighted|as an ai|our team|schedule demo|premium experience)/gi;
  reply = reply.replace(forbiddenRegex, "");

  // Clean up introductory greetings if the reply is an answer to a question
  if (analysis.intent !== "greeting") {
    reply = reply.replace(/^(hello sir|hello bhai|hi there|greetings|dear),?\s*/i, "");
  }

  // 2. Trailing punctuation: strip ending periods on WhatsApp (feel too passive-aggressive/corporate)
  if (reply.endsWith(".")) {
    reply = reply.slice(0, -1);
  }

  // 3. Lowercase imperfection:
  // Randomly make replies lowercase (especially if customer speaks casually or is a fast/reseller buyer)
  const isCasualBuyer = ["fast_buyer", "reseller", "timepass"].includes(memory.buyer_type);
  const isCasualTone = analysis.tone === "casual" || memory.tone === "casual";
  const lowercaseChance = isCasualBuyer ? 0.6 : (isCasualTone ? 0.4 : 0.2);

  if (Math.random() < lowercaseChance) {
    // Avoid lowercasing proper names of tools like ChatGPT/Claude/Midjourney to stay accurate
    const parts = reply.split(/(\bChatGPT\b|\bClaude\b|\bMidjourney\b|\bSora\b|\bUPI\b|\bQR\b)/i);
    reply = parts
      .map((part) => {
        if (/^(chatgpt|claude|midjourney|sora|upi|qr)$/i.test(part)) return part; // Keep capitalization for tools/payment
        return part.toLowerCase();
      })
      .join("");
  }

  // 4. Random reply substitutions for dry, fast resellers (Hinglish/English WhatsApp slangs)
  const replacements: Array<[RegExp, string | string[]]> = [
    [/yes sir/gi, ["yes", "haa", "ha sir", "haan"]],
    [/yes/gi, ["haa", "yes", "available hai", "ha sir"]],
    [/available/gi, ["stock h", "available h", "mil jayega", "haa"]],
    [/wait a minute|please wait|hold on/gi, ["1 min", "ek min", "wait bhai"]],
    [/i am setting it up|setup is in progress/gi, ["setup kr deta hu", "setup kr raha", "setup krta hu"]],
    [/payment received/gi, ["payment mil gaya", "payment done", "received sir"]],
    [/thank you/gi, ["thanks sir", "ok bhai", "shukriya"]],
  ];

  for (const [regex, replacement] of replacements) {
    if (regex.test(reply) && Math.random() < 0.7) {
      const selected = Array.isArray(replacement)
        ? replacement[Math.floor(Math.random() * replacement.length)]
        : replacement;
      reply = reply.replace(regex, selected);
    }
  }

  // 5. Shorten excessively long sentences or corporate-sounding descriptions
  // For fast/reseller buyers, if the reply is longer than 150 chars, split it and keep only the direct answer.
  if (isCasualBuyer && reply.length > 120) {
    const sentences = reply.split(/[.।\n!?]/).filter(Boolean);
    if (sentences.length > 1) {
      reply = sentences[0].trim(); // Take only the first sentence
    }
  }

  // 6. Vary emojis: remove spam
  // If the reply contains multiple emojis, keep at most 1
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2700}-\u{27BF}]/gu;
  const emojis = reply.match(emojiRegex);
  if (emojis && emojis.length > 1) {
    // Keep only the first emoji, remove the rest
    let first = true;
    reply = reply.replace(emojiRegex, (match) => {
      if (first) {
        first = false;
        return match;
      }
      return "";
    });
  }

  // Sometimes remove emojis completely (30% chance for regular, 60% chance for reseller/dry types)
  const noEmojiChance = memory.buyer_type === "reseller" ? 0.7 : 0.4;
  if (Math.random() < noEmojiChance) {
    reply = reply.replace(emojiRegex, "");
  }

  // 7. Imperfect double typing (combining options)
  // e.g. "available 🙂" -> "available hai sir"
  reply = reply.trim();

  // If the response is still empty or too short, return the original text trimmed
  return reply || text.trim();
}

/**
 * DYNAMIC PROMPT BUILDER
 * Generates system prompts customized to the customer's history, tone, and relationship level.
 */
export function buildDynamicSystemPrompt(
  agent: typeof aiAgent.$inferSelect,
  memory: ContactMemory,
  productContext: string,
  communityUrl: string | null
): string {
  const TONE_INSTRUCTIONS: Record<string, string> = {
    friendly: "Warm and helpful. Light emojis OK (max 1 per reply). Short sentences.",
    professional: "Polished and formal. No emojis. Use proper salutations.",
    casual: "Chill and conversational. No jargon. Like texting a friend.",
    urgent_sales: "Push toward a close — but stay polite. Add light urgency words (today, abhi, jaldi). Always include a CTA.",
    reseller: "Indian WhatsApp reseller style (dry, fast, casual Hinglish). Keep it extremely direct.",
  };

  const CUSTOMER_TYPE_INSTRUCTIONS: Record<string, string> = {
    fast_buyer: "Customer wants speed. Give extremely short replies (1-5 words). State only the price or time directly. No greetings. No chit-chat.",
    confused_buyer: "Customer is confused. Give helpful but short explanations (1-2 sentences). Guide them step-by-step. Do not overwhelm them.",
    technical_buyer: "Customer is technical. Provide exact specs (e.g. 'private profile', 'working warranty', 'official login'). No fluff.",
    reseller: "Customer is a reseller. Talk bulk prices, fast activations, and maintain a business partner tone. Keep it very dry and short.",
    timepass: "Customer is just checking. Answer shortly, do not waste time, do not pitch aggressively.",
    scammer: "Customer behaves suspiciously. Be extremely short and firm. Do not give any accounts or access until payment status is fully verified.",
    serious_buyer: "Customer is serious. Provide direct answers and smooth payment directions when asked.",
    premium_buyer: "Customer buys high-ticket items. Be respectful, casual-professional, and fast.",
  };

  const RELATIONSHIP_INSTRUCTIONS: Record<string, string> = {
    new_customer: "This is a new customer. Be neutral-casual. Use polite words like 'sir' or keep it neutral.",
    regular_customer: "This is a regular customer. Treat them with familiarity. You can use casual words like 'bhai' or 'bro' if they mirror it. Skip formal greetings.",
    frequent_buyer: "This is a frequent buyer. You know them well. Be extremely friendly and informal. Talk like a buddy.",
  };

  const selectedTone = memory.tone && TONE_INSTRUCTIONS[memory.tone] 
    ? memory.tone 
    : (agent.tone || "friendly");

  const communityLine = communityUrl
    ? `COMMUNITY LINK: ${communityUrl}\nRule: If the conversation is concluding, or the customer has agreed to buy / is paying, suggest joining the community for daily updates using this exact link. Keep it very short.`
    : "";

  return [
    `You are ${agent.name || "Addison AI"}, representing the business "${agent.businessName || "AI Tool Shop"}".`,
    agent.whatWeSell ? `We sell: ${agent.whatWeSell}` : "",
    `Tone: ${TONE_INSTRUCTIONS[selectedTone] || TONE_INSTRUCTIONS.casual}`,
    `Relationship: ${RELATIONSHIP_INSTRUCTIONS[memory.relationship_level] || RELATIONSHIP_INSTRUCTIONS.new_customer}`,
    `Customer Type: ${CUSTOMER_TYPE_INSTRUCTIONS[memory.buyer_type] || CUSTOMER_TYPE_INSTRUCTIONS.serious_buyer}`,
    `Current Selected Tool: ${memory.context.current_tool || "None selected yet"}`,
    `Payment State: ${memory.context.payment_state || "none"}`,
    `Always Say: ${agent.alwaysSay || "None"}`,
    `Never Say: ${agent.neverSay || "None"}`,
    agent.knowledgeBase ? `KNOWLEDGE BASE:\n${agent.knowledgeBase}` : "",
    "",
    productContext,
    communityLine,
    "",
    "WHATSAPP RESELLER STYLE MANDATORY GUIDELINES:",
    "- DYNAMIC STYLE MATCHING: Match the customer's length, script (Hinglish/English/Hindi), and formality. If they message with short words like 'price?', reply with only the price (e.g. '1499' or '₹1499').",
    "- NO CORPORATE CHATBOT HABITS: Do NOT say things like 'I am happy to assist you', 'How may I help you today?', 'Please be informed', 'Kindly'. Write like an actual human typing on phone.",
    "- SHORT REPLIES ONLY: Maximum 1-2 sentences. 1 sentence is preferred. Even single-word replies are perfect (e.g., 'haa', 'available', '10 min').",
    "- PAYMENT DIRECTION: Do NOT share payment info or UPI details unless they explicitly ask for UPI, QR code, payment details, or confirm they want to buy. Do not push payment options too early.",
    "- IF PRODUCT IS NOT CONFIGURED: If the customer asks for a tool or product that is NOT present in the Available Products list, reply casually/dryly that we don't have it (e.g. 'nahi h bhai' or 'abhi stock nahi hai').",
    "- TRIGGERS FOR PAYMENT ACTIONS: If they are ready to purchase and ask for payment details/QR code, trigger a send_qr action by returning the correct JSON schema with \"action\": \"send_qr\", \"amount\": <amount>, \"note\": \"<product name>\".",
  ].filter(Boolean).join("\n");
}

/**
 * MAIN HUMAN-LIKE PIPELINE FOR REPLY SUGGESTIONS
 */
export async function getHumanizedSuggestions(
  userId: string,
  conversationId: string
): Promise<{ allowed: boolean; escalate: boolean; reason?: string; suggestions: Array<{ type: string; text: string }>; suggested_products?: any[]; error?: string; code?: string }> {
  // 1. Cap check (weight=1 per call)
  const gate = await checkAiCap(userId, "reply_suggestion");
  if (!gate.allowed) {
    return {
      allowed: false,
      escalate: false,
      error: gate.reason,
      code: gate.code,
      suggestions: [],
    };
  }

  // 2. Fetch conversation + contact
  const [conv] = await db.select().from(conversation).where(and(eq(conversation.id, conversationId), eq(conversation.ownerId, userId))).limit(1);
  if (!conv) throw new Error("Conversation not found");

  const [ctc] = await db.select().from(contact).where(eq(contact.id, conv.contactId)).limit(1);
  if (!ctc) throw new Error("Contact not found");

  // 3. Load and initialize memory
  let memory: ContactMemory;
  try {
    memory = ctc.memory ? (ctc.memory as unknown as ContactMemory) : DEFAULT_MEMORY(ctc.name);
    // Backward compatibility or deep copy check
    if (!memory.context) memory.context = { current_tool: null, payment_state: "none", discussion_topic: null };
    if (!memory.learning) memory.learning = { replies_sent: 0, conversions: 0, satisfaction_score: 100, ai_detection_moments: 0, best_performing_tone: null };
  } catch {
    memory = DEFAULT_MEMORY(ctc.name);
  }

  // 4. Load active agent
  const [agent] = await db.select().from(aiAgent).where(and(eq(aiAgent.ownerId, userId), eq(aiAgent.isActive, true))).limit(1);
  if (!agent) throw new Error("No active agent found for workspace");

  // Load storefront products as active agent products
  const productsRows = await db.select().from(product)
    .where(and(eq(product.ownerId, userId), eq(product.status, "active")))
    .orderBy(asc(product.sortOrder));

  const agentProducts = Array.isArray(agent.products) ? (agent.products as any[]) : [];
  agent.products = productsRows.map(p => {
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
  }) as any;

  // 5. Fetch last 10 messages
  const recentMessages = await db.select().from(message).where(eq(message.conversationId, conversationId)).orderBy(desc(message.createdAt)).limit(10);
  const history = recentMessages.slice().reverse();

  const lastInbound = [...history].reverse().find((m) => m.direction === "inbound");
  if (!lastInbound) {
    return { allowed: true, escalate: false, suggestions: [] };
  }

  // 6. Escalate Check (fast check)
  const escalateKeywords = (agent.escalateKeywords || "")
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
  const inboundLower = lastInbound.body.toLowerCase();
  const matchedKeyword = escalateKeywords.find((kw) => kw.length > 0 && inboundLower.includes(kw));
  if (matchedKeyword) {
    return {
      allowed: true,
      escalate: true,
      reason: `Customer mentioned "${matchedKeyword}" — handle this personally, do not auto-reply.`,
      suggestions: [],
    };
  }

  // 7. Running Message Analyzer
  const historyText = history
    .map((m) => `${m.direction === "inbound" ? "CUSTOMER" : "YOU"}: ${m.body}`)
    .join("\n");
  const analysis = await analyzeIncomingMessage(lastInbound.body, historyText, ctc.name);

  // 8. Context & Memory Engine updates
  memory.relationship_score = (memory.relationship_score || 0) + 1;
  if (memory.relationship_score < 5) {
    memory.relationship_level = "new_customer";
  } else if (memory.relationship_score < 15) {
    memory.relationship_level = "regular_customer";
  } else {
    memory.relationship_level = "frequent_buyer";
  }

  // Update current topic and tool
  if (analysis.detected_tool) {
    memory.context.current_tool = analysis.detected_tool;
    memory.last_tool = analysis.detected_tool;
    if (!memory.preferred_tools.includes(analysis.detected_tool)) {
      memory.preferred_tools.push(analysis.detected_tool);
    }
  }

  // Intent mappings
  memory.context.discussion_topic = analysis.intent;
  memory.buyer_type = analysis.buyer_type;
  memory.tone = analysis.tone;
  memory.language = analysis.language.toLowerCase();

  // If customer says payment done
  if (analysis.intent === "payment_done") {
    memory.payment_status = "completed";
    memory.context.payment_state = "paid";
    if (memory.learning) memory.learning.conversions = (memory.learning.conversions || 0) + 1;
  } else if (analysis.payment_action) {
    memory.context.payment_state = "qr_sent";
  }

  // Detect AI accusation
  if (inboundLower.includes("bot") || inboundLower.includes("robot") || inboundLower.includes("ai") || inboundLower.includes("computer")) {
    memory.learning.ai_detection_moments = (memory.learning.ai_detection_moments || 0) + 1;
  }

  // 9. Build product context
  let productContext = "";
  let suggestedProducts: any[] = [];
  const productsList = agent.products && Array.isArray(agent.products) ? agent.products : [];
  
  if (productsList.length > 0) {
    suggestedProducts = productsList.map((p: any, idx: number) => {
      let price = Number(p.price) || 0;
      if (ctc.isReseller) {
        price = Number(p.resellerPrice || p.reseller_price || p.price) || 0;
      }
      return {
        id: `agent-prod-${idx}`,
        name: p.name,
        price: price,
        photo_url: p.imageUrl || p.image_url || null,
      };
    });
    const productLines = productsList.map((p: any) => {
      let priceInr = p.price;
      let priceUsd = p.priceUsd || p.price_usd;
      if (ctc.isReseller) {
        priceInr = p.resellerPrice || p.reseller_price || p.price;
        priceUsd = p.resellerPriceUsd || p.reseller_price_usd || p.priceUsd || p.price_usd;
      }
      let priceStr = `₹${Number(priceInr).toLocaleString("en-IN")}`;
      if (priceUsd && Number(priceUsd) > 0) {
        priceStr += ` ($${priceUsd})`;
      }
      let line = `- ${p.name}: ${priceStr} (${p.validity})`;
      const actMail = p.activationMail || p.activation_mail;
      const actTime = p.activationTime || p.activation_time;
      if (actMail) line += `, Activation: ${actMail}`;
      if (actTime) line += `, Setup time: ${actTime}`;
      return line;
    }).join("\n");
    productContext = `Available Products:\n${productLines}`;
  } else {
    productContext = `WARNING: No products are currently available in the system. Everything is OUT OF STOCK. If the customer asks for any tool/account, reply that it is not available.`;
  }

  const [pf] = await db.select().from(profile).where(eq(profile.userId, userId)).limit(1);
  const communityUrl = pf?.whatsappCommunityUrl ?? null;

  // 10. Generate suggestions using Dynamic Prompt Builder
  const dynamicSystemPrompt = buildDynamicSystemPrompt(agent, memory, productContext, communityUrl);
  const userPrompt = `Contact name: ${ctc.name}
Customer latest message: "${lastInbound.body}"
Generate exactly 3 reply DRAFTS for the operator to choose from. Each must be:
- 1 sentence (extremely short, casual, natural WhatsApp styling)
- Specific to what the customer said
- Distinct in approach (polite, sell, qualify)

Output JSON: {"suggestions":[{"type":"polite"|"sell"|"qualify","text":"..."}]}`;

  try {
    const result = await chatJson<{ suggestions: Array<{ type: string; text: string }> }>(
      [
        { role: "system", content: dynamicSystemPrompt },
        { role: "user", content: userPrompt },
      ],
      { model: "gpt-4o-mini", temperature: 0.85, maxTokens: 400 }
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

    // Humanizer Engine post-processing
    const suggestions = (result.json?.suggestions || [])
      .filter((s) => s && typeof s.text === "string" && s.text.trim().length > 0)
      .map((s) => ({
        type: s.type,
        text: humanizeReply(s.text, analysis, memory),
      }))
      .slice(0, 3);

    // Save updated Memory to Database
    const { score: newScore, tag: newTag } = calculateLeadScoreAndTag(ctc.score, ctc.tag, analysis);
    const updates: Record<string, any> = {
      memory: memory as any,
      updatedAt: new Date(),
    };
    if (newScore > ctc.score) {
      updates.score = newScore;
      updates.tag = newTag;
    }
    if (analysis.buyer_type === "reseller") {
      updates.isReseller = true;
    }

    await db
      .update(contact)
      .set(updates)
      .where(eq(contact.id, ctc.id));

    return {
      allowed: true,
      escalate: false,
      suggestions,
      suggested_products: suggestedProducts.length > 0 ? suggestedProducts : undefined,
    };
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
    throw e;
  }
}

/**
 * MAIN HUMAN-LIKE PIPELINE FOR AUTOMATIC AGENT AUTO-REPLIES (AGENT MODE)
 */
export async function getHumanizedAutoReply(
  userId: string,
  conversationId: string,
  inboundBody: string
): Promise<{ allowed: boolean; reply: string; action: string | null; amount: number | null; note: string | null; error?: string; code?: string }> {
  // 1. Cap check (weight=1 per call)
  const gate = await checkAiCap(userId, "auto_reply");
  if (!gate.allowed) {
    return {
      allowed: false,
      reply: "",
      action: null,
      amount: null,
      note: null,
      error: gate.reason,
      code: gate.code,
    };
  }

  // 2. Fetch conversation + contact
  const [conv] = await db.select().from(conversation).where(and(eq(conversation.id, conversationId), eq(conversation.ownerId, userId))).limit(1);
  if (!conv) throw new Error("Conversation not found");

  const [ctc] = await db.select().from(contact).where(eq(contact.id, conv.contactId)).limit(1);
  if (!ctc) throw new Error("Contact not found");

  // 3. Load memory
  let memory: ContactMemory;
  try {
    memory = ctc.memory ? (ctc.memory as unknown as ContactMemory) : DEFAULT_MEMORY(ctc.name);
    if (!memory.context) memory.context = { current_tool: null, payment_state: "none", discussion_topic: null };
    if (!memory.learning) memory.learning = { replies_sent: 0, conversions: 0, satisfaction_score: 100, ai_detection_moments: 0, best_performing_tone: null };
  } catch {
    memory = DEFAULT_MEMORY(ctc.name);
  }

  // 4. Load active agent
  const [agent] = await db.select().from(aiAgent).where(and(eq(aiAgent.ownerId, userId), eq(aiAgent.isActive, true))).limit(1);
  if (!agent) throw new Error("No active agent found for workspace");

  // 5. Fetch last 6 messages
  const recentMessages = await db.select().from(message).where(eq(message.conversationId, conversationId)).orderBy(desc(message.createdAt)).limit(6);
  const history = recentMessages.slice().reverse();

  // 6. Message Analyzer
  const historyText = history
    .map((m) => `${m.direction === "inbound" ? "CUSTOMER" : "YOU"}: ${m.body}`)
    .join("\n");
  const analysis = await analyzeIncomingMessage(inboundBody, historyText, ctc.name);

  // 7. Context & Memory updates
  memory.relationship_score = (memory.relationship_score || 0) + 1;
  if (memory.relationship_score < 5) {
    memory.relationship_level = "new_customer";
  } else if (memory.relationship_score < 15) {
    memory.relationship_level = "regular_customer";
  } else {
    memory.relationship_level = "frequent_buyer";
  }

  if (analysis.detected_tool) {
    memory.context.current_tool = analysis.detected_tool;
    memory.last_tool = analysis.detected_tool;
    if (!memory.preferred_tools.includes(analysis.detected_tool)) {
      memory.preferred_tools.push(analysis.detected_tool);
    }
  }

  memory.context.discussion_topic = analysis.intent;
  memory.buyer_type = analysis.buyer_type;
  memory.tone = analysis.tone;
  memory.language = analysis.language.toLowerCase();

  // Payment triggers
  if (analysis.intent === "payment_done") {
    memory.payment_status = "completed";
    memory.context.payment_state = "paid";
    if (memory.learning) memory.learning.conversions = (memory.learning.conversions || 0) + 1;
  } else if (analysis.payment_action) {
    memory.context.payment_state = "qr_sent";
  }

  // Detect bot accusals
  if (inboundBody.toLowerCase().includes("bot") || inboundBody.toLowerCase().includes("robot") || inboundBody.toLowerCase().includes("ai")) {
    memory.learning.ai_detection_moments = (memory.learning.ai_detection_moments || 0) + 1;
  }

  // 8. Products list
  let productContext = "";
  const productsList = agent.products && Array.isArray(agent.products) ? agent.products : [];
  
  if (productsList.length > 0) {
    const productLines = productsList.map((p: any) => {
      let priceInr = p.price;
      let priceUsd = p.priceUsd || p.price_usd;
      if (ctc.isReseller) {
        priceInr = p.resellerPrice || p.reseller_price || p.price;
        priceUsd = p.resellerPriceUsd || p.reseller_price_usd || p.priceUsd || p.price_usd;
      }
      let priceStr = `₹${Number(priceInr).toLocaleString("en-IN")}`;
      if (priceUsd && Number(priceUsd) > 0) {
        priceStr += ` ($${priceUsd})`;
      }
      let line = `- ${p.name}: ${priceStr} (${p.validity})`;
      const actMail = p.activationMail || p.activation_mail;
      const actTime = p.activationTime || p.activation_time;
      if (actMail) line += `, Activation: ${actMail}`;
      if (actTime) line += `, Setup time: ${actTime}`;
      return line;
    }).join("\n");
    productContext = `Available Products:\n${productLines}`;
  } else {
    productContext = `WARNING: No products are currently available in the system. Everything is OUT OF STOCK. If the customer asks for any tool/account, reply that it is not available.`;
  }

  const [pf] = await db.select().from(profile).where(eq(profile.userId, userId)).limit(1);
  const communityUrl = pf?.whatsappCommunityUrl ?? null;

  // 9. Build dynamic prompt & generate response
  const dynamicSystemPrompt = buildDynamicSystemPrompt(agent, memory, productContext, communityUrl);
  const userPrompt = `Conversation so far:\n${historyText}\n\nCustomer latest message: "${inboundBody}"\n\nGenerate single reply now:`;

  try {
    const result = await chatJson<{
      reply: string;
      action?: "send_qr" | null;
      amount?: number | null;
      note?: string | null;
    }>(
      [
        { role: "system", content: dynamicSystemPrompt + '\n\nReturn JSON: {"reply": "<message>", "action": "send_qr"|null, "amount": <price>|null, "note": "<product name>"|null}' },
        { role: "user", content: userPrompt },
      ],
      { model: "gpt-4o-mini", temperature: 0.7, maxTokens: 300 }
    );

    await logAiUsage({
      userId,
      feature: "auto_reply",
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      costInr: result.costInr,
      ok: true,
    });

    let replyText = (result.json?.reply ?? "").trim();
    const action = result.json?.action ?? null;
    let amount = result.json?.amount ?? null;
    const note = result.json?.note ?? null;

    // 10. If payment_action was analyzed but AI did not trigger "send_qr", we enforce it if a tool context is present
    let finalAction = action;
    let finalAmount = amount;
    let finalNote = note;

    if (analysis.payment_action && !finalAction && memory.context.current_tool) {
      // Lookup product price from configured products
      const selectedProd = productsList.find((p: any) => p.name.toLowerCase().includes(memory.context.current_tool!.toLowerCase()) || memory.context.current_tool!.toLowerCase().includes(p.name.toLowerCase()));
      if (selectedProd) {
        finalAction = "send_qr";
        let price = Number(selectedProd.price);
        if (ctc.isReseller) {
          price = Number(selectedProd.resellerPrice || selectedProd.reseller_price || selectedProd.price);
        }
        finalAmount = price;
        finalNote = selectedProd.name;
        if (!replyText.toLowerCase().includes("qr")) {
          replyText = "payment qr de deta hu bhai, ek min";
        }
      }
    }

    // 11. Humanizer Engine post-processing
    const humanizedReplyText = humanizeReply(replyText, analysis, memory);

    // 12. Learning Engine updates
    memory.learning.replies_sent = (memory.learning.replies_sent || 0) + 1;
    memory.learning.best_performing_tone = analysis.tone;

    // Save memory
    const { score: newScore, tag: newTag } = calculateLeadScoreAndTag(ctc.score, ctc.tag, analysis);
    const updates: Record<string, any> = {
      memory: memory as any,
      updatedAt: new Date(),
    };
    if (newScore > ctc.score) {
      updates.score = newScore;
      updates.tag = newTag;
    }
    if (analysis.buyer_type === "reseller") {
      updates.isReseller = true;
    }

    await db
      .update(contact)
      .set(updates)
      .where(eq(contact.id, ctc.id));

    return {
      allowed: true,
      reply: humanizedReplyText,
      action: finalAction,
      amount: finalAmount,
      note: finalNote,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logAiUsage({
      userId,
      feature: "auto_reply",
      model: "gpt-4o-mini",
      promptTokens: 0,
      completionTokens: 0,
      costInr: 0,
      ok: false,
      errorMessage: msg,
    });
    throw e;
  }
}
