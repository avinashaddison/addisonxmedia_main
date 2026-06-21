import { z } from "zod";

export const patchContactSchema = z.object({
  name: z.string().max(255),
  phone: z.string().max(20),
  email: z.string().email().max(255).nullish(),
  source: z.string().max(100).nullish(),
  tag: z.enum(["hot", "warm", "cold"]),
  leadStatus: z.enum(["new", "contacted", "qualified", "proposal", "won", "lost"]).nullish(),
  score: z.number().int().min(0).max(100),
  notes: z.string().max(10000).nullish(),
  isReseller: z.boolean().nullish(),
}).partial();

export const patchDealSchema = z.object({
  title: z.string().max(500),
  value: z.string().max(50),
  currency: z.string().max(10),
  stage: z.enum(["new", "qualification", "proposal", "closing", "won", "lost"]),
  probability: z.number().int().min(0).max(100),
  expectedCloseDate: z.string().max(30).nullish(),
  closedAt: z.string().max(30).nullish(),
}).partial();

export const patchCampaignSchema = z.object({
  name: z.string().max(255),
  description: z.string().max(5000).nullish(),
  channel: z.string().max(50),
  status: z.enum(["draft", "active", "paused", "completed", "archived"]),
  budget: z.string().max(50),
  audienceSize: z.coerce.number().int().min(0),
  scheduledAt: z.string().max(30).nullish(),
}).partial();

export const patchBroadcastSchema = z.object({
  title: z.string().max(500),
  body: z.string().max(10000).nullish(),
  templateName: z.string().max(255).nullish(),
  templateLanguage: z.string().max(10).nullish(),
  audienceTag: z.string().max(100).nullish(),
  status: z.enum(["draft", "queued", "sending", "sent", "failed"]),
  scheduledAt: z.string().max(30).nullish(),
  recipientCount: z.coerce.number().int().min(0),
}).partial();

export const patchConversationSchema = z.object({
  status: z.enum(["open", "closed", "archived"]),
  unreadCount: z.coerce.number().int().min(0),
  agentMode: z.boolean(),
}).partial();

export const patchTaskSchema = z.object({
  title: z.string().max(500),
  notes: z.string().max(10000).nullish(),
  dueAt: z.string().max(30).nullish(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
  contactId: z.string().max(100).nullish(),
  completedAt: z.string().max(30).nullish(),
}).partial();
