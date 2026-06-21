import {
  boolean,
  check,
  index,
  integer,
  jsonb,
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
  // ── Better Auth twoFactor plugin field ──
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
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
}, (t) => ({
  userIdIdx: index("session_user_id_idx").on(t.userId),
}));

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
}, (t) => ({
  userIdIdx: index("account_user_id_idx").on(t.userId),
}));

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  identifierIdx: index("verification_identifier_idx").on(t.identifier),
}));

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
  // UPI payment settings — used by /api/payments/upi/send to construct
  // upi://pay deep links + QR codes when the operator wants to collect
  // money via WhatsApp.
  upiVpa: text("upi_vpa"),
  upiDisplayName: text("upi_display_name"),
  // Public links shared with customers via LeadPanel "Quick share" buttons.
  // Each can be sent in one click with a Hinglish templated message.
  whatsappCommunityUrl: text("whatsapp_community_url"),
  instagramUrl: text("instagram_url"),
  websiteUrl: text("website_url"),
  facebookUrl: text("facebook_url"),
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
  memory: jsonb("memory").default(sql`'{}'::jsonb`),
  isReseller: boolean("is_reseller").notNull().default(false),
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
  // AI Agent Mode — when true, every inbound message triggers an auto-reply
  // using the workspace's active AI agent persona (fire-and-forget on webhook).
  agentMode: boolean("agent_mode").notNull().default(false),
  // Ad-to-Sale attribution — populated from Meta's CTW referral payload on the
  // first inbound message. NULL for organic (non-ad) conversations.
  sourceAdId: text("source_ad_id"),
  sourceHeadline: text("source_headline"),
  ctwaClickId: text("ctwa_click_id"),
  sourceType: text("source_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ownerIdx: index("conversation_owner_idx").on(t.ownerId),
  contactIdx: index("conversation_contact_idx").on(t.contactId),
  lastMsgIdx: index("conversation_last_msg_idx").on(t.lastMessageAt),
  sourceAdIdx: index("conversation_source_ad_idx").on(t.sourceAdId, t.createdAt),
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
  externalMessageId: text("external_message_id"),
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
  // ── Marketing API credentials (ads_management scope token + ad account) ──
  // Stored encrypted at rest via server/crypto.ts. Routes encrypt on write,
  // decrypt on read — never put plaintext in this column.
  adAccountId: text("ad_account_id"),
  adAccessToken: text("ad_access_token"),
  adAccountName: text("ad_account_name"),
  adAccountCurrency: text("ad_account_currency"),
  adsConnectedAt: timestamp("ads_connected_at", { withTimezone: true }),
  adsLastVerifiedAt: timestamp("ads_last_verified_at", { withTimezone: true }),
  // ── Catalog (Commerce API) — verified-business unlock ───────────────────
  catalogId: text("catalog_id"),
  // ── Conversions API (CAPI) — closes the ad → revenue feedback loop ──────
  pixelId: text("pixel_id"),
  capiEnabled: boolean("capi_enabled").notNull().default(false),
  capiTestEventCode: text("capi_test_event_code"),
  // ── Messaging tier cache (refreshed by /api/meta/refresh-tier) ───────────
  messagingLimitTier: text("messaging_limit_tier"),
  qualityRating: text("quality_rating"),
  tierRefreshedAt: timestamp("tier_refreshed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // Webhook receiver looks up user by phone_number_id from Meta payload
  phoneNumberIdx: index("meta_config_phone_number_idx").on(t.phoneNumberId),
}));

// ============================================================
// Meta CAPI event log — every server-side conversion event we fire to
// Meta's Conversions API gets a row here. Dedup index on event_id prevents
// double-firing on retries; admin diagnostics can also visualize fire
// volume + Meta's response codes for debugging match-rate.
// ============================================================

export const metaCapiEvent = pgTable("meta_capi_event", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  eventName: text("event_name").notNull(),           // 'Lead' | 'Purchase' | ...
  eventId: text("event_id").notNull(),               // dedupe key
  eventTime: timestamp("event_time", { withTimezone: true }).notNull().defaultNow(),
  sourceType: text("source_type"),                   // 'deal_won' | 'contact_created'
  sourceId: text("source_id"),                       // related row id
  valueInr: numeric("value_inr", { precision: 10, scale: 2 }),
  currency: text("currency").default("INR"),
  userData: jsonb("user_data"),
  customData: jsonb("custom_data"),
  responseCode: integer("response_code"),
  responseBody: jsonb("response_body"),
  firedAt: timestamp("fired_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ownerIdx: index("meta_capi_event_owner_idx").on(t.ownerId, t.firedAt),
  eventIdUnq: uniqueIndex("meta_capi_event_id_unq").on(t.eventId),
}));

// ============================================================
// Webhook orphan log
//
// Captures inbound WhatsApp webhooks that arrived for a phone_number_id we
// have no meta_config for. Without this, those events fall into a silent
// console.warn and admins have no way to find out which numbers are trying
// to reach the platform but failing to land in any inbox.
// ============================================================

export const webhookOrphan = pgTable("webhook_orphan", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  phoneNumberId: text("phone_number_id").notNull(),
  displayPhoneNumber: text("display_phone_number"),
  fromPhone: text("from_phone"),
  fromName: text("from_name"),
  messagePreview: text("message_preview"),
  raw: jsonb("raw"),
  claimedUserId: text("claimed_user_id").references(() => user.id, { onDelete: "set null" }),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  phoneIdx: index("webhook_orphan_phone_idx").on(t.phoneNumberId),
  createdIdx: index("webhook_orphan_created_idx").on(t.createdAt),
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

export const workspace = pgTable("workspace", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerUserId: text("owner_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  workspaceUserId: text("workspace_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ownerUserIdIdx: index("workspace_owner_user_id_idx").on(t.ownerUserId),
  workspaceUserIdIdx: index("workspace_workspace_user_id_idx").on(t.workspaceUserId),
}));

export const workspaceRelations = relations(workspace, ({ one }) => ({
  owner: one(user, { fields: [workspace.ownerUserId], references: [user.id] }),
  workspaceUser: one(user, { fields: [workspace.workspaceUserId], references: [user.id] }),
}));

export type Workspace = typeof workspace.$inferSelect;
export type User = typeof user.$inferSelect;
export type Profile = typeof profile.$inferSelect;
export type Contact = typeof contact.$inferSelect;
export type Conversation = typeof conversation.$inferSelect;
export type Message = typeof message.$inferSelect;
export type Deal = typeof deal.$inferSelect;
export type Campaign = typeof campaign.$inferSelect;
export type Broadcast = typeof broadcast.$inferSelect;
export type Task = typeof task.$inferSelect;

// Better Auth twoFactor plugin storage
export const twoFactor = pgTable("two_factor", {
  id: text("id").primaryKey(),
  secret: text("secret").notNull(),
  backupCodes: text("backup_codes").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  verified: boolean("verified").default(false),
}, (t) => ({
  userIdIdx: index("two_factor_user_id_idx").on(t.userId),
}));

// Key-value system settings (feature flags, mode toggles)
export const systemSetting = pgTable("system_setting", {
  key: text("key").primaryKey(),
  value: text("value"),
  category: text("category").notNull().default("general"),
  description: text("description"),
  updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SystemSetting = typeof systemSetting.$inferSelect;

// ============================================================
// AI — usage log for Addison AI features
// ============================================================
// One row per OpenAI call. Source of truth for monthly cap enforcement
// (sum weight WHERE user_id = ? AND created_at >= month_start) — no
// separate counter column, so resets happen automatically on the 1st.
export const aiUsage = pgTable("ai_usage", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  feature: text("feature").notNull(),                                       // 'reply_suggestion' | 'auto_reply' | 'ad_copy' | 'followup_gen' | 'insights' | 'test'
  model: text("model").notNull(),                                           // 'gpt-4o-mini' | 'gpt-4o' | 'gpt-5.5'
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  costInr: numeric("cost_inr", { precision: 10, scale: 4 }).notNull().default("0"),
  weight: integer("weight").notNull().default(1),                           // counts toward monthly cap
  ok: boolean("ok").notNull().default(true),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userCreatedIdx: index("ai_usage_user_created_idx").on(t.userId, t.createdAt),
  featureCreatedIdx: index("ai_usage_feature_created_idx").on(t.feature, t.createdAt),
}));

export type AiUsage = typeof aiUsage.$inferSelect;

// ============================================================
// AI persona — workspace-level "Train Addison" config
// ============================================================
// One row per workspace (1 user = 1 workspace today). The helper
// getPersonaWithDefaults() in server/lib/ai-persona.ts returns sensible
// defaults when no row exists, so brand-new accounts can call AI features
// before filling the form.
export const aiPersona = pgTable("workspace_ai_persona", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  businessName: text("business_name").notNull().default(""),
  whatWeSell: text("what_we_sell").notNull().default(""),
  tone: text("tone").notNull().default("friendly"),                                            // 'friendly' | 'professional' | 'casual' | 'urgent_sales'
  responseLanguage: text("response_language").notNull().default("hinglish"),                   // 'hinglish' | 'hindi' | 'english'
  alwaysSay: text("always_say").notNull().default(""),
  neverSay: text("never_say").notNull().default(""),
  escalateKeywords: text("escalate_keywords").notNull().default("refund, complaint, legal, lawyer, scam, police, cheating, fraud"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AiPersona = typeof aiPersona.$inferSelect;

// ============================================================
// AI — prebuilt agent templates managed by admin
// ============================================================
export const prebuiltAgent = pgTable("prebuilt_agent", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  businessName: text("business_name").notNull().default(""),
  whatWeSell: text("what_we_sell").notNull().default(""),
  tone: text("tone").notNull().default("friendly"),
  responseLanguage: text("response_language").notNull().default("hinglish"),
  alwaysSay: text("always_say").notNull().default(""),
  neverSay: text("never_say").notNull().default(""),
  escalateKeywords: text("escalate_keywords").notNull().default("refund, complaint, legal, lawyer, scam, police, cheating, fraud"),
  products: jsonb("products").default(sql`'[]'::jsonb`),
  knowledgeBase: text("knowledge_base").default(""),
  systemPrompt: text("system_prompt").default(""),
  isEnabled: boolean("is_enabled").notNull().default(true),
  upiVpa: text("upi_vpa"),
  binanceId: text("binance_id"),
  qrImageUrl: text("qr_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PrebuiltAgent = typeof prebuiltAgent.$inferSelect;

// ============================================================
// AI Agent — support for multiple agents (custom + prebuilt)
// ============================================================
export const aiAgent = pgTable("ai_agent", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().default("custom"),                                              // 'prebuilt_sales' | 'custom'
  businessName: text("business_name").notNull().default(""),
  whatWeSell: text("what_we_sell").notNull().default(""),
  tone: text("tone").notNull().default("friendly"),                                            // 'friendly' | 'professional' | 'casual' | 'urgent_sales'
  responseLanguage: text("response_language").notNull().default("hinglish"),                   // 'hinglish' | 'hindi' | 'english'
  alwaysSay: text("always_say").notNull().default(""),
  neverSay: text("never_say").notNull().default(""),
  escalateKeywords: text("escalate_keywords").notNull().default("refund, complaint, legal, lawyer, scam, police, cheating, fraud"),
  products: jsonb("products").default(sql`'[]'::jsonb`),                                       // Array<{ name: string, price: number, validity: string }>
  knowledgeBase: text("knowledge_base").default(""),
  systemPrompt: text("system_prompt").default(""),
  prebuiltId: uuid("prebuilt_id").references(() => prebuiltAgent.id, { onDelete: "set null" }),
  isActive: boolean("is_active").notNull().default(false),
  upiVpa: text("upi_vpa"),
  binanceId: text("binance_id"),
  qrImageUrl: text("qr_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ownerIdx: index("ai_agent_owner_idx").on(t.ownerId),
  ownerActiveIdx: index("ai_agent_owner_active_idx").on(t.ownerId, t.isActive),
}));

export type AiAgent = typeof aiAgent.$inferSelect;

// ============================================================
// BILLING — plan upgrade requests (manual fulfillment until Razorpay live)
// ============================================================
// Customer clicks "Upgrade to Growth" in /app/upgrade → row inserted here.
// Admin sees pending rows in the admin panel, sends a Razorpay payment link
// via WhatsApp, on confirmation marks status='completed' + bumps user.plan
// via the existing /api/admin/workspaces/:id PATCH. When Razorpay is live
// this table becomes the audit trail of every plan-change attempt.
export const upgradeRequest = pgTable("upgrade_request", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  targetPlan: text("target_plan").notNull(),                                // 'starter' | 'growth' | 'scale' | 'enterprise'
  billingCycle: text("billing_cycle").notNull().default("monthly"),         // 'monthly' | 'annual'
  status: text("status").notNull().default("requested"),                    // 'requested' | 'contacted' | 'paid' | 'completed' | 'declined' | 'cancelled'
  customerNote: text("customer_note"),
  adminNotes: text("admin_notes"),
  razorpayPaymentId: text("razorpay_payment_id"),
  // ── Cashfree Payment Gateway integration ──────────────────────────────
  cashfreeOrderId: text("cashfree_order_id"),
  cashfreePaymentSessionId: text("cashfree_payment_session_id"),
  cashfreePaymentId: text("cashfree_payment_id"),
  cashfreePaymentMethod: text("cashfree_payment_method"),
  amountInr: numeric("amount_inr", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (t) => ({
  userIdx: index("upgrade_request_user_idx").on(t.userId, t.createdAt),
  statusIdx: index("upgrade_request_status_idx").on(t.status, t.createdAt),
  cashfreeOrderIdx: index("upgrade_request_cashfree_order_idx").on(t.cashfreeOrderId),
}));

export type UpgradeRequest = typeof upgradeRequest.$inferSelect;

// ============================================================
// SITE — website / storefront builder (Phase 1)
// ============================================================

export const site = pgTable("site", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  template: text("template").notNull().default("kirana"),                   // 'kirana' | 'salon' | 'restaurant' | 'services'
  status: text("status").notNull().default("draft"),                       // 'draft' | 'published'
  publishedAt: timestamp("published_at", { withTimezone: true }),
  theme: jsonb("theme").notNull().default(sql`'{}'::jsonb`),               // { primary, secondary, font, logo_url }
  copy: jsonb("copy").notNull().default(sql`'{}'::jsonb`),                 // { hero_headline, hero_sub, about, ... }
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  seoOgImage: text("seo_og_image"),
  customDomain: text("custom_domain").unique(),
  customDomainVerified: boolean("custom_domain_verified").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  faviconUrl: text("favicon_url"),
  ga4Id: text("ga4_id"),
  metaPixelId: text("meta_pixel_id"),
  customHeadHtml: text("custom_head_html"),
  allowIndexing: boolean("allow_indexing").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  slugIdx: index("site_slug_idx").on(t.slug),
  statusIdx: index("site_status_idx").on(t.status),
}));

export type Site = typeof site.$inferSelect;

export const siteLead = pgTable("site_lead", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  siteId: uuid("site_id").notNull().references(() => site.id, { onDelete: "cascade" }),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  message: text("message"),
  sourcePath: text("source_path"),
  userAgent: text("user_agent"),
  ipHash: text("ip_hash"),
  contactId: uuid("contact_id"),
  contactedAt: timestamp("contacted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ownerIdx: index("site_lead_owner_idx").on(t.ownerId, t.createdAt),
  siteIdx: index("site_lead_site_idx").on(t.siteId, t.createdAt),
}));

export type SiteLead = typeof siteLead.$inferSelect;

export const product = pgTable("product", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  priceInr: numeric("price_inr", { precision: 10, scale: 2 }).notNull().default("0"),
  photoUrl: text("photo_url"),
  stock: integer("stock"),
  category: text("category"),
  status: text("status").notNull().default("active"),  // 'active' | 'draft' | 'archived'
  sortOrder: integer("sort_order").notNull().default(0),
  isDigital: boolean("is_digital").notNull().default(false),
  validity: text("validity"),
  activationMail: text("activation_mail"),
  activationTime: text("activation_time"),
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }),
  isReseller: boolean("is_reseller").notNull().default(false),
  resellerPrice: numeric("reseller_price", { precision: 10, scale: 2 }),
  resellerPriceUsd: numeric("reseller_price_usd", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ownerIdx: index("product_owner_idx").on(t.ownerId, t.sortOrder),
  statusIdx: index("product_status_idx").on(t.ownerId, t.status),
}));

export type Product = typeof product.$inferSelect;

// `order` is reserved in SQL — table named `customer_order`. Alias `orderTbl`
// inside the codebase to avoid colliding with the desc()/asc() helpers.
export const orderTbl = pgTable("customer_order", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  siteId: uuid("site_id").references(() => site.id, { onDelete: "set null" }),
  orderNumber: integer("order_number").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  customerAddress: text("customer_address"),
  subtotalInr: numeric("subtotal_inr", { precision: 10, scale: 2 }).notNull().default("0"),
  shippingInr: numeric("shipping_inr", { precision: 10, scale: 2 }).notNull().default("0"),
  discountInr: numeric("discount_inr", { precision: 10, scale: 2 }).notNull().default("0"),
  totalInr: numeric("total_inr", { precision: 10, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("new"),          // new | confirmed | shipped | delivered | cancelled
  paymentMethod: text("payment_method"),                    // upi | cod | cashfree
  paymentStatus: text("payment_status").notNull().default("pending"),  // pending | paid | refunded
  source: text("source").notNull().default("website"),      // website | whatsapp | manual
  notes: text("notes"),
  contactId: uuid("contact_id").references(() => contact.id, { onDelete: "set null" }),
  couponId: uuid("coupon_id"),
  couponCode: text("coupon_code"),
  shippingZoneId: uuid("shipping_zone_id"),
  shippingZoneName: text("shipping_zone_name"),
  customerPincode: text("customer_pincode"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ownerNumberUnq: uniqueIndex("customer_order_owner_number_idx").on(t.ownerId, t.orderNumber),
  ownerIdx: index("customer_order_owner_idx").on(t.ownerId, t.createdAt),
  statusIdx: index("customer_order_status_idx").on(t.ownerId, t.status, t.createdAt),
}));

export type CustomerOrder = typeof orderTbl.$inferSelect;

export const orderItem = pgTable("order_item", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").notNull().references(() => orderTbl.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => product.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(),
  productPhotoUrl: text("product_photo_url"),
  unitPriceInr: numeric("unit_price_inr", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  lineTotalInr: numeric("line_total_inr", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orderIdx: index("order_item_order_idx").on(t.orderId),
}));

export type OrderItem = typeof orderItem.$inferSelect;

export const siteAnalyticsEvent = pgTable("site_analytics_event", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  siteId: uuid("site_id").notNull().references(() => site.id, { onDelete: "cascade" }),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),       // 'view' | 'lead' | 'cart_add' | 'order'
  path: text("path"),
  referrerHost: text("referrer_host"),
  valueInr: numeric("value_inr", { precision: 10, scale: 2 }),
  sessionHash: text("session_hash"),
  userAgent: text("user_agent"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ownerIdx: index("site_analytics_owner_idx").on(t.ownerId, t.occurredAt),
  typeIdx: index("site_analytics_type_idx").on(t.ownerId, t.eventType, t.occurredAt),
}));

export type SiteAnalyticsEvent = typeof siteAnalyticsEvent.$inferSelect;

export const coupon = pgTable("coupon", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  discountType: text("discount_type").notNull().default("percent"),   // 'percent' | 'flat'
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }).notNull().default("0"),
  minCartInr: numeric("min_cart_inr", { precision: 10, scale: 2 }).notNull().default("0"),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ownerCodeUnq: uniqueIndex("coupon_owner_code_idx").on(t.ownerId, t.code),
  ownerIdx: index("coupon_owner_idx").on(t.ownerId, t.createdAt),
}));

export type Coupon = typeof coupon.$inferSelect;

export const shippingZone = pgTable("shipping_zone", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  pincodePrefixes: text("pincode_prefixes").notNull().default(""),
  rateInr: numeric("rate_inr", { precision: 10, scale: 2 }).notNull().default("0"),
  freeAboveInr: numeric("free_above_inr", { precision: 10, scale: 2 }),
  etaDays: integer("eta_days"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ownerIdx: index("shipping_zone_owner_idx").on(t.ownerId, t.sortOrder),
}));

export type ShippingZone = typeof shippingZone.$inferSelect;

export const sitePage = pgTable("site_page", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  siteId: uuid("site_id").notNull().references(() => site.id, { onDelete: "cascade" }),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  path: text("path").notNull(),                                       // '/' | '/about' | '/contact'
  title: text("title"),
  sections: jsonb("sections").notNull().default(sql`'[]'::jsonb`),     // PUBLISHED — read by renderer
  draftSections: jsonb("draft_sections").default(sql`'[]'::jsonb`),    // editor working copy
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  lastPublishedAt: timestamp("last_published_at", { withTimezone: true }),
}, (t) => ({
  unq: uniqueIndex("site_page_unq").on(t.siteId, t.path),
  ownerIdx: index("site_page_owner_idx").on(t.ownerId),
}));

export type SitePage = typeof sitePage.$inferSelect;

export const booking = pgTable("booking", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  siteId: uuid("site_id").references(() => site.id, { onDelete: "set null" }),
  bookingNumber: integer("booking_number").notNull(),
  serviceId: uuid("service_id").references(() => product.id, { onDelete: "set null" }),
  serviceName: text("service_name").notNull(),
  servicePriceInr: numeric("service_price_inr", { precision: 10, scale: 2 }).notNull().default("0"),
  serviceDurationMin: integer("service_duration_min"),
  bookingDate: text("booking_date").notNull(),      // YYYY-MM-DD
  bookingTime: text("booking_time").notNull(),      // HH:MM 24h
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  notes: text("notes"),
  status: text("status").notNull().default("new"),  // new | confirmed | completed | cancelled | no_show
  source: text("source").notNull().default("website"),
  contactId: uuid("contact_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ownerNumberUnq: uniqueIndex("booking_owner_number_idx").on(t.ownerId, t.bookingNumber),
  ownerDateIdx: index("booking_owner_date_idx").on(t.ownerId, t.bookingDate, t.bookingTime),
  statusIdx: index("booking_status_idx").on(t.ownerId, t.status, t.bookingDate),
}));

export type Booking = typeof booking.$inferSelect;

// ============================================================
// User Activity Log -- tracks user-facing actions (non-admin)
// ============================================================

export const userActivityLog = pgTable("user_activity_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index("user_activity_log_user_idx").on(t.userId, t.createdAt),
  actionIdx: index("user_activity_log_action_idx").on(t.action, t.createdAt),
}));

export type UserActivityLog = typeof userActivityLog.$inferSelect;

// ============================================================
// Background Job Queue
// ============================================================

export const jobQueue = pgTable("job_queue", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  failedAt: timestamp("failed_at", { withTimezone: true }),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pendingIdx: index("job_queue_pending_idx").on(t.status, t.scheduledFor),
  typeIdx: index("job_queue_type_idx").on(t.type, t.createdAt),
}));

export type JobQueue = typeof jobQueue.$inferSelect;
