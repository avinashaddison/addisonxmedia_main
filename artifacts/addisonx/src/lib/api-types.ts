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

export type LeadStatus = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";

export type Contact = {
  id: string;
  owner_id: string;
  name: string;
  phone: string;
  email: string | null;
  source: string | null;
  tag: LeadTag;
  lead_status?: LeadStatus | null;
  score: number;
  notes: string | null;
  is_reseller?: boolean;
  created_at: string;
  updated_at: string;
};

// Lead = a contact enriched with deal aggregates for the CRM pipeline view.
export type Lead = Contact & {
  lead_status: LeadStatus;
  open_value: number;
  won_value: number;
  deal_count: number;
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
  assigned_to_member_id: string | null;
  assigned_member?: { id: string; name: string | null; email: string; role: TeamRole } | null;
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
  whatsapp_community_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  facebook_url: string | null;
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
  priceUsd?: number;
  isReseller?: boolean;
  resellerPrice?: number;
  resellerPriceUsd?: number;
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
  upi_vpa?: string | null;
  binance_id?: string | null;
  qr_image_url?: string | null;
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
  raw_products?: AiAgentProduct[];
  knowledge_base: string;
  system_prompt: string;
  prebuilt_id?: string | null;
  is_active: boolean;
  upi_vpa?: string | null;
  binance_id?: string | null;
  qr_image_url?: string | null;
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

// ============================================================
// Customer Dashboard — Notes, Finance, Team, Reports
// ============================================================

export type Note = {
  id: string;
  owner_id: string;
  contact_id: string | null;
  contact_name?: string | null;
  title: string | null;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export type InvoiceLineItem = {
  id: string;
  invoice_id: string;
  description: string;
  quantity: string | number;
  unit_price: string | number;
  amount: string | number;
  position: number;
};

export type Invoice = {
  id: string;
  owner_id: string;
  contact_id: string | null;
  contact_name?: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  currency: string;
  subtotal: string | number;
  tax_rate: string | number;
  tax_amount: string | number;
  discount: string | number;
  total: string | number;
  notes: string | null;
  issue_date: string;
  due_at: string | null;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  line_items: InvoiceLineItem[];
};

export type Expense = {
  id: string;
  owner_id: string;
  category: string;
  description: string;
  amount: string | number;
  currency: string;
  vendor: string | null;
  spent_at: string;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  source: "deal" | "invoice";
  label: string;
  contact_name: string | null;
  amount: string | number;
  currency: string;
  date: string;
};

export type PaymentsSummary = {
  payments: Payment[];
  total_received: number;
  count: number;
};

export type TeamRole = "owner" | "admin" | "manager" | "agent" | "viewer";
export type TeamMemberStatus = "invited" | "active" | "suspended";

export type TeamMember = {
  id: string;
  owner_id: string;
  email: string;
  name: string | null;
  role: TeamRole;
  status: TeamMemberStatus;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ReportRange = { from: string; to: string; granularity: "day" | "month" };

export type LeadsReport = {
  range: ReportRange;
  totals: { total_leads: number; new_in_range: number; converted: number; conversion_rate: number };
  by_status: Array<{ status: string; count: number }>;
  by_tag: Array<{ tag: string; count: number }>;
  by_source: Array<{ source: string; count: number }>;
  timeline: Array<{ date: string; leads: number }>;
};

export type CustomersReport = {
  range: ReportRange;
  totals: { total_contacts: number; customers: number; new_in_range: number; avg_customer_value: number };
  by_tag: Array<{ tag: string; count: number }>;
  top_customers: Array<{ id: string; name: string; value: number }>;
  timeline: Array<{ date: string; customers: number }>;
};

export type RevenueReport = {
  range: ReportRange;
  totals: {
    total_revenue: number;
    deal_revenue: number;
    invoice_revenue: number;
    total_expenses: number;
    net_profit: number;
  };
  by_source: Array<{ source: string; value: number }>;
  expenses_by_category: Array<{ category: string; value: number }>;
  timeline: Array<{ date: string; revenue: number; expenses: number; net: number }>;
};

export type PerformanceReport = {
  range: ReportRange;
  totals: {
    deals_won: number;
    deals_lost: number;
    win_rate: number;
    open_pipeline: number;
    tasks_completed: number;
    tasks_pending: number;
    broadcasts_sent: number;
    messages_out: number;
    messages_in: number;
  };
  campaign_performance: Array<{
    id: string;
    name: string;
    sent: number;
    replied: number;
    conversions: number;
    conversion_rate: number;
  }>;
  timeline: Array<{ date: string; sent: number; received: number }>;
};
