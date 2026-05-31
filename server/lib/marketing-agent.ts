import { eq, and, desc, sql, not } from "drizzle-orm";
import { db } from "../db/client";
import { contact, conversation, message, metaConfig } from "../db/schema";
import { decrypt } from "../crypto";
import {
  listCampaigns,
  updateCampaign,
  singleCampaignInsights,
  campaignTimeSeries,
  type AdsCredentials
} from "../integrations/meta-ads";
import OpenAI from "openai";

const getOpenAIClient = (): OpenAI => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured on the server.");
  return new OpenAI({ apiKey: key });
};

// Realistic mock campaigns for demo mode
const DEMO_CAMPAIGNS = [
  { id: "demo_c1", name: "Diwali Sale · CTW Ads", platform: "meta", objective: "Click-to-WhatsApp", status: "active", daily_budget_inr: 2500, spent_inr: 18420, impressions: 248910, clicks: 8412, results: 612, result_type: "WhatsApp chats", cpc_inr: 2.19, ctr: 3.38 },
  { id: "demo_c2", name: "Class 10 Admissions · Tier-2", platform: "meta", objective: "Lead generation", status: "active", daily_budget_inr: 1200, spent_inr: 9240, impressions: 142500, clicks: 4280, results: 318, result_type: "Form fills", cpc_inr: 2.16, ctr: 3.0 },
  { id: "demo_c3", name: "Catalogue · Dynamic Retarget", platform: "meta", objective: "Catalog sales", status: "paused", daily_budget_inr: 1500, spent_inr: 0, impressions: 0, clicks: 0, results: 0, result_type: "Purchases", cpc_inr: 0, ctr: 0 }
];

async function getAdCreds(userId: string): Promise<AdsCredentials | null> {
  const [row] = await db.select().from(metaConfig).where(eq(metaConfig.userId, userId)).limit(1);
  if (!row?.adAccountId || !row?.adAccessToken) return null;
  return {
    accessToken: decrypt(row.adAccessToken),
    adAccountId: row.adAccountId,
  };
}

/**
 * 1. Tool implementations
 */

async function listCampaignsTool(userId: string) {
  const creds = await getAdCreds(userId);
  if (!creds) {
    return { demo: true, campaigns: DEMO_CAMPAIGNS };
  }
  try {
    const list = await listCampaigns(creds);
    return { demo: false, campaigns: list };
  } catch (err: any) {
    return { error: err.message || String(err), fallbackCampaigns: DEMO_CAMPAIGNS };
  }
}

async function getCampaignAnalyticsTool(userId: string, campaignId: string) {
  const creds = await getAdCreds(userId);
  if (!creds || campaignId.startsWith("demo_")) {
    const matched = DEMO_CAMPAIGNS.find(c => c.id === campaignId) || DEMO_CAMPAIGNS[0];
    return {
      demo: true,
      campaign: matched,
      totals: {
        spend: matched.spent_inr,
        impressions: matched.impressions,
        clicks: matched.clicks,
        ctr: matched.ctr,
        cpc: matched.cpc_inr,
        results: matched.results
      }
    };
  }
  try {
    const [totals, ts] = await Promise.all([
      singleCampaignInsights(creds, campaignId, "last_30d").catch(() => null),
      campaignTimeSeries(creds, campaignId, "last_30d").catch(() => [])
    ]);
    return {
      demo: false,
      campaignId,
      totals: totals ? {
        spend: Number(totals.spend ?? 0),
        impressions: Number(totals.impressions ?? 0),
        clicks: Number(totals.clicks ?? 0),
        ctr: Number(totals.ctr ?? 0),
        cpc: Number(totals.cpc ?? 0),
        reach: Number(totals.reach ?? 0)
      } : null,
      recentTimeSeries: ts.slice(0, 5)
    };
  } catch (err: any) {
    return { error: err.message || String(err) };
  }
}

async function updateCampaignTool(userId: string, campaignId: string, updates: { status?: "ACTIVE" | "PAUSED"; dailyBudgetInr?: number }) {
  const creds = await getAdCreds(userId);
  const payload: { status?: "ACTIVE" | "PAUSED"; daily_budget?: number } = {};
  if (updates.status) payload.status = updates.status;
  if (updates.dailyBudgetInr) payload.daily_budget = Math.round(updates.dailyBudgetInr * 100);

  if (!creds || campaignId.startsWith("demo_")) {
    // Mock update
    const idx = DEMO_CAMPAIGNS.findIndex(c => c.id === campaignId);
    if (idx !== -1) {
      if (updates.status) DEMO_CAMPAIGNS[idx].status = updates.status.toLowerCase() as any;
      if (updates.dailyBudgetInr) DEMO_CAMPAIGNS[idx].daily_budget_inr = updates.dailyBudgetInr;
    }
    return { success: true, demo: true, campaignId, updatedFields: updates };
  }

  try {
    await updateCampaign(creds, campaignId, payload);
    return { success: true, demo: false, campaignId, updatedFields: updates };
  } catch (err: any) {
    return { error: err.message || String(err) };
  }
}

async function analyzeCrmCustomerChatsTool(userId: string) {
  try {
    // Retrieve up to 8 recent customer conversations (excluding the system agent conversation)
    const activeConvs = await db
      .select({
        id: conversation.id,
        contactName: contact.name,
        contactPhone: contact.phone,
        contactTag: contact.tag
      })
      .from(conversation)
      .leftJoin(contact, eq(contact.id, conversation.contactId))
      .where(and(
        eq(conversation.ownerId, userId),
        not(eq(contact.phone, "system_marketing"))
      ))
      .orderBy(desc(conversation.lastMessageAt))
      .limit(8);

    if (activeConvs.length === 0) {
      return { message: "No customer chats found in the CRM database yet." };
    }

    const conversationDetails = [];
    for (const conv of activeConvs) {
      const messagesList = await db
        .select({
          direction: message.direction,
          body: message.body,
          createdAt: message.createdAt
        })
        .from(message)
        .where(eq(message.conversationId, conv.id))
        .orderBy(desc(message.createdAt))
        .limit(6);

      const formattedMsgs = messagesList.reverse().map(m =>
        `${m.direction === "inbound" ? "CUSTOMER" : "SELLER"}: ${m.body}`
      ).join(" | ");

      conversationDetails.push({
        customerName: conv.contactName,
        customerPhone: conv.contactPhone,
        tag: conv.contactTag,
        recentDialog: formattedMsgs || "(No messages yet)"
      });
    }

    return {
      chatsAnalyzed: activeConvs.length,
      conversations: conversationDetails
    };
  } catch (err: any) {
    return { error: err.message || String(err) };
  }
}

/**
 * 2. OpenAI system definition & chat loop
 */

const SYSTEM_PROMPT = `You are the Addison AI Marketing Agent, hired by the company owner as their senior marketing manager and ad specialist. 
Your goal is to make the company's marketing highly profitable. You are an expert in Meta Ads, Conversion Rate Optimization (CRO), and sales funnels.

Capabilities:
- You have full access to view, audit, and modify Meta Ads (Budget changes, status changes) using your tools.
- You can analyze recent CRM customer chats to understand pain points, questions, and feedback.
- You communicate directly with the owner in a human-like, consultative, and professional tone.

Guidelines:
- Explain your findings logically. If CPC is high or CTR is low, suggest action items.
- If the owner asks you to change budgets or pause/activate campaigns, run the appropriate tools and confirm the execution in your response.
- Keep replies focused, human, and direct. Skip boilerplate chatbot greetings (like "How can I assist you today?"). Talk like a marketing partner.
- If you run in demo mode (no credentials connected), inform the owner politely that you are running on mock campaign data, but still perform the changes and critique as if they are real to demonstrate your capabilities.

Budget Safety limits:
- If updates.dailyBudgetInr is more than ₹10,000, ask the owner to confirm again. Otherwise, execute immediately.`;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_campaigns",
      description: "List Meta Ads campaigns with their name, objective, status, and daily budget.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "get_campaign_analytics",
      description: "Retrieve 30-day totals and analytics metrics for a specific campaign ID.",
      parameters: {
        type: "object",
        properties: {
          campaignId: { type: "string", description: "The ID of the campaign to analyze." }
        },
        required: ["campaignId"]
      }
    },
  },
  {
    type: "function",
    function: {
      name: "update_campaign",
      description: "Modify status or daily budget for a campaign ID.",
      parameters: {
        type: "object",
        properties: {
          campaignId: { type: "string", description: "The ID of the campaign to update." },
          status: { type: "string", enum: ["ACTIVE", "PAUSED"], description: "Activate or pause the campaign." },
          dailyBudgetInr: { type: "number", description: "New daily budget in INR." }
        },
        required: ["campaignId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "analyze_crm_customer_chats",
      description: "Analyze recent CRM WhatsApp customer conversations to inspect sentiment, objections, FAQs, and product demand.",
      parameters: { type: "object", properties: {} }
    }
  }
];

export async function processMarketingAgentMessage(
  userId: string,
  conversationId: string,
  userMessageText: string
): Promise<string> {
  const openai = getOpenAIClient();

  // Fetch conversation history
  const recentMsgs = await db
    .select({
      direction: message.direction,
      body: message.body,
      isAiGenerated: message.isAiGenerated
    })
    .from(message)
    .where(eq(message.conversationId, conversationId))
    .orderBy(desc(message.createdAt))
    .limit(15);

  const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT }
  ];

  // Append history in order
  const orderedMsgs = recentMsgs.reverse();
  for (const m of orderedMsgs) {
    if (m.direction === "inbound") {
      openaiMessages.push({ role: "assistant", content: m.body });
    } else {
      openaiMessages.push({ role: "user", content: m.body });
    }
  }

  // Append the current message
  openaiMessages.push({ role: "user", content: userMessageText });

  let runnerCount = 0;
  const maxIterations = 5;

  while (runnerCount < maxIterations) {
    runnerCount++;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: openaiMessages,
      tools: TOOLS,
      tool_choice: "auto",
      temperature: 0.7
    });

    const choice = response.choices[0];
    const assistantMsg = choice.message;

    // Push response to message sequence for context
    openaiMessages.push(assistantMsg);

    if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
      for (const call of assistantMsg.tool_calls) {
        const { name, arguments: argsText } = call.function;
        let args: any = {};
        try {
          args = JSON.parse(argsText);
        } catch {}

        let toolResult: any;

        if (name === "list_campaigns") {
          toolResult = await listCampaignsTool(userId);
        } else if (name === "get_campaign_analytics") {
          toolResult = await getCampaignAnalyticsTool(userId, args.campaignId);
        } else if (name === "update_campaign") {
          toolResult = await updateCampaignTool(userId, args.campaignId, {
            status: args.status,
            dailyBudgetInr: args.dailyBudgetInr
          });
        } else if (name === "analyze_crm_customer_chats") {
          toolResult = await analyzeCrmCustomerChatsTool(userId);
        } else {
          toolResult = { error: "Unknown tool" };
        }

        openaiMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(toolResult)
        });
      }
    } else {
      // No more tool calls, return final message body
      return assistantMsg.content || "I audited your marketing but did not gather any findings. Let me know what to analyze next.";
    }
  }

  return "I apologize, but my execution flow timed out. Please tell me again what you would like me to check.";
}
