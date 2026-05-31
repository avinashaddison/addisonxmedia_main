// Frontend types for API responses. Snake_case to match the wire format.
// Source of truth is server/db/schema.ts; these are the JSON shapes after the
// snake_case conversion in api.ts.

export type LeadTag = "hot" | "warm" | "cold";
export type ConversationStatus = "open" | "pending" | "closed";
export type MessageDirection = "inbound" | "outbound";
export type MessageStatus = "queued" | "sent" | "delivered" | "read" | "failed";
export type DealStage = "new" | "qualification" | "proposal" | "closing" | "won" | "lost";
export type CampaignStatus = "draft" | "scheduled" | "active" | "paused" | "completed";
export type CampaignChannel = "whatsapp" | "sms" | "email" | "multi";
export type BroadcastStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type AppRole = "admin" | "agent";

export type Contact = {
  id: string;
  owner_id: string;
  name: string;
  phone: string;
  email: string | null;
  source: string | null;
  tag: LeadTag;
  score: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  contact_id: string;
  owner_id: string;
  assigned_to: string | null;
  status: ConversationStatus;
  unread_count: number;
  agent_mode: boolean;
  last_message_at: string | null;
  last_message_preview: string | null;
  source_ad_id?: string | null;
  source_headline?: string | null;
  ctwa_click_id?: string | null;
  source_type?: string | null;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  owner_id: string;
  sender_id: string | null;
  direction: MessageDirection;
  body: string;
  media_url: string | null;
  status: MessageStatus;
  twilio_sid: string | null;
  is_ai_generated: boolean;
  created_at: string;
};

export type Deal = {
  id: string;
  owner_id: string;
  contact_id: string;
  conversation_id: string | null;
  title: string;
  value: string | number;
  currency: string;
  stage: DealStage;
  probability: number;
  expected_close_date: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Campaign = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  channel: CampaignChannel;
  status: CampaignStatus;
  budget: string | number;
  audience_size: number;
  sent_count: number;
  opened_count: number;
  replied_count: number;
  conversion_count: number;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Broadcast = {
  id: string;
  owner_id: string;
  campaign_id: string | null;
  title: string;
  body: string;
  template_name: string | null;
  template_language: string | null;
  audience_tag: LeadTag | null;
  status: BroadcastStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  recipient_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  owner_id: string;
  contact_id: string | null;
  conversation_id: string | null;
  title: string;
  notes: string | null;
  due_at: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export type AiAgentProduct = {
  name: string;
  price: number;
  validity: string;
  activationMail?: string;
  activationTime?: string;
  description?: string;
  imageUrl?: string;
};

export type PrebuiltAgent = {
  id: string;
  name: string;
  business_name: string;
  what_we_sell: string;
  tone: string;
  response_language: string;
  always_say: string;
  never_say: string;
  escalate_keywords: string;
  products: AiAgentProduct[];
  knowledge_base: string;
  system_prompt: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type AiAgent = {
  id: string;
  owner_id: string;
  name: string;
  type: "prebuilt_sales" | "custom";
  business_name: string;
  what_we_sell: string;
  tone: string;
  response_language: string;
  always_say: string;
  never_say: string;
  escalate_keywords: string;
  products: AiAgentProduct[];
  knowledge_base: string;
  system_prompt: string;
  prebuilt_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Eligible24hChat = {
  conversation_id: string;
  contact_id: string;
  contact_name: string;
  contact_phone: string;
  last_inbound_at: string;
  expires_at: string;
  minutes_remaining: number;
};

export type BulkSend24hResponse = {
  sent_count: number;
  failed_count: number;
  details: Array<{
    contact_id: string;
    status: "sent" | "failed";
    error?: string;
  }>;
};
