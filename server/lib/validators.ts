import { z } from "zod";

export const patchContactSchema = z.object({
  name: z.any(),
  phone: z.any(),
  email: z.any(),
  source: z.any(),
  tag: z.any(),
  score: z.any(),
  notes: z.any(),
}).partial();

export const patchDealSchema = z.object({
  title: z.any(),
  value: z.any(),
  currency: z.any(),
  stage: z.any(),
  probability: z.any(),
  expectedCloseDate: z.any(),
  closedAt: z.any(),
}).partial();

export const patchCampaignSchema = z.object({
  name: z.any(),
  description: z.any(),
  channel: z.any(),
  status: z.any(),
  budget: z.any(),
  audienceSize: z.any(),
  scheduledAt: z.any(),
}).partial();

export const patchBroadcastSchema = z.object({
  title: z.any(),
  body: z.any(),
  templateName: z.any(),
  templateLanguage: z.any(),
  audienceTag: z.any(),
  status: z.any(),
  scheduledAt: z.any(),
  recipientCount: z.any(),
}).partial();

export const patchConversationSchema = z.object({
  status: z.any(),
  unreadCount: z.any(),
}).partial();

export const patchTaskSchema = z.object({
  title: z.any(),
  notes: z.any(),
  dueAt: z.any(),
  priority: z.any(),
  status: z.any(),
  contactId: z.any(),
  completedAt: z.any(),
}).partial();
