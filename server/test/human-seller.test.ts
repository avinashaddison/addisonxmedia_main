import { describe, it, expect } from "vitest";
import { humanizeReply, buildDynamicSystemPrompt, type ContactMemory, type MessageAnalysis } from "../lib/human-seller";

describe("Human-Like AI WhatsApp Seller Engine", () => {
  const dummyMemory = (buyerType = "serious_buyer", relationship = "new_customer"): ContactMemory => ({
    customer_name: "Rahul",
    language: "auto",
    tone: "neutral",
    preferred_tools: [],
    buyer_type: buyerType,
    last_tool: null,
    payment_status: "pending",
    relationship_level: relationship,
    relationship_score: 1,
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

  const dummyAnalysis = (intent = "pricing", tone = "neutral"): MessageAnalysis => ({
    language: "Hinglish",
    mood: "interested",
    buyer_type: "serious_buyer",
    urgency: "medium",
    intent: intent as any,
    tone: tone as any,
    detected_tool: "Claude Pro",
    payment_action: false,
  });

  describe("humanizeReply", () => {
    it("should remove forbidden phrases from output", () => {
      const forbiddenText = "Dear customer, we are delighted to offer you a premium experience. Kindly pay now.";
      const analysis = dummyAnalysis();
      const memory = dummyMemory();
      
      const humanized = humanizeReply(forbiddenText, analysis, memory);
      expect(humanized.toLowerCase()).not.toContain("dear customer");
      expect(humanized.toLowerCase()).not.toContain("we are delighted");
      expect(humanized.toLowerCase()).not.toContain("premium experience");
      expect(humanized.toLowerCase()).not.toContain("kindly");
    });

    it("should strip trailing periods on WhatsApp replies", () => {
      const text = "Aap kal call kar sakte hain.";
      const analysis = dummyAnalysis();
      const memory = dummyMemory();
      
      const humanized = humanizeReply(text, analysis, memory);
      expect(humanized.endsWith(".")).toBe(false);
    });

    it("should remove greeting prefixes when answering questions", () => {
      const text = "Hello sir, please select a tool";
      const analysis = dummyAnalysis("pricing");
      const memory = dummyMemory();
      
      const humanized = humanizeReply(text, analysis, memory);
      expect(humanized.toLowerCase()).not.toContain("hello sir");
    });

    it("should keep greetings if the intent itself is greeting", () => {
      const text = "hello bhai";
      const analysis = dummyAnalysis("greeting");
      const memory = dummyMemory();
      
      const humanized = humanizeReply(text, analysis, memory);
      expect(humanized.toLowerCase()).toContain("hello");
    });

    it("should limit multiple emojis to at most 1 emoji", () => {
      const text = "haa mil jayega 🙂👍🔥";
      const analysis = dummyAnalysis();
      const memory = dummyMemory();
      
      const humanized = humanizeReply(text, analysis, memory);
      const emojiCount = (humanized.match(/[\u{1F300}-\u{1F9FF}]|[\u{2700}-\u{27BF}]/gu) || []).length;
      expect(emojiCount).toBeLessThanOrEqual(1);
    });

    it("should shorten long replies for fast buyers", () => {
      const text = "Available hai aur accounts working warranty ke sath milenge. Setup time is 5-10 minutes only after you complete the payment from UPI QR code. Pure family and shared accounts rahenge. No issue.";
      const analysis = dummyAnalysis();
      const memory = dummyMemory("fast_buyer");
      
      const humanized = humanizeReply(text, analysis, memory);
      // For fast buyer, should shorten long replies
      expect(humanized.length).toBeLessThan(text.length);
    });
  });

  describe("buildDynamicSystemPrompt", () => {
    it("should build a prompt containing the active agent and products", () => {
      const agent: any = {
        name: "Addison Reseller",
        businessName: "Addison Store",
        whatWeSell: "ChatGPT accounts",
        tone: "casual",
        alwaysSay: "only official login",
        neverSay: "refund",
        knowledgeBase: "No technical setup needed",
        products: [],
      };
      
      const memory = dummyMemory("technical_buyer", "regular_customer");
      const productContext = "Available Products:\n- ChatGPT Plus: ₹999";
      
      const prompt = buildDynamicSystemPrompt(agent, memory, productContext, "http://community.link");
      
      expect(prompt).toContain("Addison Reseller");
      expect(prompt).toContain("Addison Store");
      expect(prompt).toContain("ChatGPT accounts");
      expect(prompt).toContain("only official login");
      expect(prompt).toContain("refund");
      expect(prompt).toContain("No technical setup needed");
      expect(prompt).toContain("Available Products:\n- ChatGPT Plus: ₹999");
      expect(prompt).toContain("http://community.link");
      expect(prompt).toContain("technical"); // matches "Customer is technical"
      expect(prompt).toContain("regular customer"); // matches "This is a regular customer"
    });
  });
});
