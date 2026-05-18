import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ============================================================
// Better Auth tables (managed by Better Auth via Drizzle adapter)
// ============================================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // ── Admin / staff fields (AddisonX Media operators) ──
  isStaff: boolean("is_staff").notNull().default(false),
  adminRole: text("admin_role"),                              // 'super_admin' | 'support' | 'billing' | 'moderator'
  adminInvitedBy: text("admin_invited_by"),
  adminLastLoginAt: timestamp("admin_last_login_at", { withTimezone: true }),
  // ── Customer account state ──
  accountStatus: text("account_status").notNull().default("active"),  // 'active' | 'suspended' | 'cancelled' | 'trial'
  plan: text("plan").notNull().default("starter"),                    // 'starter' | 'growth' | 'enterprise'
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  mrrInr: numeric("mrr_inr", { precision: 12, scale: 2 }).notNull().default("0"),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  suspendedReason: text("suspended_reason"),
  suspendedBy: text("suspended_by"),
  // ──
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// ADMIN — staff actions, audit, impersonation
// ============================================================

export const adminAuditLog = pgTable("admin_audit_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  actorUserId: text("actor_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  action: text("action").notNull(),                       // 'impersonate' | 'change_plan' | 'suspend' | 'refund' | 'invite_staff' | etc.
  targetUserId: text("target_user_id"),                   // who was affected
  payload: text("payload"),                               // JSON stringified context
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  actorIdx: index("admin_audit_actor_idx").on(t.actorUserId, t.createdAt),
  actionIdx: index("admin_audit_action_idx").on(t.action, t.createdAt),
}));

export const impersonationSession = pgTable("impersonation_session", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  adminUserId: text("admin_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  targetUserId: text("target_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),                       // required — minimum 10 chars
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  ipAddress: text("ip_address"),
}, (t) => ({
  adminIdx: index("impersonation_admin_idx").on(t.adminUserId),
  targetIdx: index("impersonation_target_idx").on(t.targetUserId),
}));

export type AdminAuditEntry = typeof adminAuditLog.$inferSelect;
export type ImpersonationSession = typeof impersonationSession.$inferSelect;

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// Enums (ported from supabase/migrations)
// ============================================================

export const appRoleEnum = pgEnum("app_role", ["admin", "agent"]);
export const leadTagEnum = pgEnum("lead_tag", ["hot", "warm", "cold"]);
export const conversationStatusEnum = pgEnum("conversation_status", ["open", "pending", "closed"]);
export const messageDirectionEnum = pgEnum("message_direction", ["inbound", "outbound"]);
export const messageStatusEnum = pgEnum("message_status", ["queued", "sent", "delivered", "read", "failed"]);
export const dealStageEnum = pgEnum("deal_stage", ["new", "qualification", "proposal", "closing", "won", "lost"]);
export const campaignStatusEnum = pgEnum("campaign_status", ["draft", "scheduled", "active", "paused", "completed"]);
export const campaignChannelEnum = pgEnum("campaign_channel", ["whatsapp", "sms", "email", "multi"]);
export const broadcastStatusEnum = pgEnum("broadcast_status", ["draft", "scheduled", "sending", "sent", "failed"]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high", "urgent"]);
export const taskStatusEnum = pgEnum("task_status", ["pending", "in_progress", "completed", "cancelled"]);

// ============================================================
// App tables (ports of supabase/migrations, RLS removed —
// ownership enforced in backend middleware instead)
// ============================================================

export const profile = pgTable("profile", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userRole = pgTable("user_role", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  role: appRoleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqUserRole: uniqueIndex("user_role_user_id_role_key").on(t.userId, t.role),
}));

export const contact = pgTable("contact", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  source: text("source"),
  tag: leadTagEnum("tag").notNull().default("cold"),
  score: integer("score").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqOwnerPhone: uniqueIndex("contact_owner_phone_key").on(t.ownerId, t.phone),
  ownerIdx: index("contact_owner_idx").on(t.ownerId),
  phoneIdx: index("contact_phone_idx").on(t.phone),
  scoreCheck: check("contact_score_check", sql`${t.score} >= 0 AND ${t.score} <= 100`),
}));

export const conversation = pgTable("conversation", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: uuid("contact_id").notNull().references(() => contact.id, { onDelete: "cascade" }),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  assignedTo: text("assigned_to").references(() => user.id, { onDelete: "set null" }),
  status: conversationStatusEnum("status").notNull().default("open"),
  unreadCount: integer("unread_count").notNull().default(0),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  lastMessagePreview: text("last_message_preview"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ownerIdx: index("conversation_owner_idx").on(t.ownerId),
  contactIdx: index("conversation_contact_idx").on(t.contactId),
  lastMsgIdx: index("conversation_last_msg_idx").on(t.lastMessageAt),
}));

export const message = pgTable("message", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: uuid("conversation_id").notNull().references(() => conversation.id, { onDelete: "cascade" }),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  senderId: text("sender_id").references(() => user.id, { onDelete: "set null" }),
  direction: messageDirectionEnum("direction").notNull(),
  body: text("body").notNull(),
  mediaUrl: text("media_url"),
  status: messageStatusEnum("status").notNull().default("sent"),
  twilioSid: text("twilio_sid"),
  isAiGenerated: boolean("is_ai_generated").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  convIdx: index("message_conversation_idx").on(t.conversationId, t.createdAt),
  ownerIdx: index("message_owner_idx").on(t.ownerId),
}));

export const deal = pgTable("deal", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id").notNull().references(() => contact.id, { onDelete: "cascade" }),
  conversationId: uuid("conversation_id").references(() => conversation.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  value: numeric("value", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("INR"),
  stage: dealStageEnum("stage").notNull().default("new"),
  probability: integer("probability").notNull().default(0),
  expectedCloseDate: timestamp("expected_close_date", { mode: "date" }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ownerIdx: index("deal_owner_idx").on(t.ownerId),
  contactIdx: index("deal_contact_idx").on(t.contactId),
  probabilityCheck: check("deal_probability_check", sql`${t.probability} >= 0 AND ${t.probability} <= 100`),
}));

export const campaign = pgTable("campaign", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  channel: campaignChannelEnum("channel").notNull().default("whatsapp"),
  status: campaignStatusEnum("status").notNull().default("draft"),
  budget: numeric("budget").notNull().default("0"),
  audienceSize: integer("audience_size").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  openedCount: integer("opened_count").notNull().default(0),
  repliedCount: integer("replied_count").notNull().default(0),
  conversionCount: integer("conversion_count").notNull().default(0),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ownerStatusIdx: index("campaign_owner_status_idx").on(t.ownerId, t.status),
}));

export const broadcast = pgTable("broadcast", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  campaignId: uuid("campaign_id").references(() => campaign.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  // Meta requires APPROVED templates for outbound messages outside the 24-hour window.
  // When sending via the API, we use template_name (+ language) to call Meta.
  templateName: text("template_name"),
  templateLanguage: text("template_language").default("en"),
  audienceTag: leadTagEnum("audience_tag"),
  status: broadcastStatusEnum("status").notNull().default("draft"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  recipientCount: integer("recipient_count").notNull().default(0),
  deliveredCount: integer("delivered_count").notNull().default(0),
  readCount: integer("read_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ownerStatusIdx: index("broadcast_owner_status_idx").on(t.ownerId, t.status),
}));

export const task = pgTable("task", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id").references(() => contact.id, { onDelete: "set null" }),
  conversationId: uuid("conversation_id").references(() => conversation.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  notes: text("notes"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  status: taskStatusEnum("status").notNull().default("pending"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ownerStatusDueIdx: index("task_owner_status_due_idx").on(t.ownerId, t.status, t.dueAt),
}));

// ============================================================
// Meta WhatsApp Business API credentials (per user)
// SECURITY: access_token is stored plaintext for dev simplicity. For production
// SaaS use, encrypt at rest with KMS or use a secrets vault.
// ============================================================

export const metaConfig = pgTable("meta_config", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" }),
  // Long-lived access token (system user token) for sending messages
  accessToken: text("access_token").notNull(),
  // The WhatsApp phone number's ID in Meta — used in send-message URL
  phoneNumberId: text("phone_number_id").notNull(),
  // Business Account (WABA) ID — used to list templates
  businessAccountId: text("business_account_id"),
  // Display number (e.g., +91 80 4567 8910) — purely for UI
  displayPhoneNumber: text("display_phone_number"),
  enabled: boolean("enabled").notNull().default(false),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // Webhook receiver looks up user by phone_number_id from Meta payload
  phoneNumberIdx: index("meta_config_phone_number_idx").on(t.phoneNumberId),
}));

// ============================================================
// Relations (for db.query.X.findMany({ with: ... }))
// ============================================================

export const conversationRelations = relations(conversation, ({ one, many }) => ({
  contact: one(contact, { fields: [conversation.contactId], references: [contact.id] }),
  messages: many(message),
}));

export const contactRelations = relations(contact, ({ many }) => ({
  conversations: many(conversation),
  deals: many(deal),
  tasks: many(task),
}));

export const messageRelations = relations(message, ({ one }) => ({
  conversation: one(conversation, { fields: [message.conversationId], references: [conversation.id] }),
}));

export const dealRelations = relations(deal, ({ one }) => ({
  contact: one(contact, { fields: [deal.contactId], references: [contact.id] }),
  conversation: one(conversation, { fields: [deal.conversationId], references: [conversation.id] }),
}));

export const taskRelations = relations(task, ({ one }) => ({
  contact: one(contact, { fields: [task.contactId], references: [contact.id] }),
  conversation: one(conversation, { fields: [task.conversationId], references: [conversation.id] }),
}));

export const broadcastRelations = relations(broadcast, ({ one }) => ({
  campaign: one(campaign, { fields: [broadcast.campaignId], references: [campaign.id] }),
}));

export type User = typeof user.$inferSelect;
export type Profile = typeof profile.$inferSelect;
export type Contact = typeof contact.$inferSelect;
export type Conversation = typeof conversation.$inferSelect;
export type Message = typeof message.$inferSelect;
export type Deal = typeof deal.$inferSelect;
export type Campaign = typeof campaign.$inferSelect;
export type Broadcast = typeof broadcast.$inferSelect;
export type Task = typeof task.$inferSelect;
