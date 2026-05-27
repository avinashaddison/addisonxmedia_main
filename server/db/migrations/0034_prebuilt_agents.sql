CREATE TABLE IF NOT EXISTS prebuilt_agent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  business_name TEXT NOT NULL DEFAULT '',
  what_we_sell TEXT NOT NULL DEFAULT '',
  tone TEXT NOT NULL DEFAULT 'friendly',
  response_language TEXT NOT NULL DEFAULT 'hinglish',
  always_say TEXT NOT NULL DEFAULT '',
  never_say TEXT NOT NULL DEFAULT '',
  escalate_keywords TEXT NOT NULL DEFAULT 'refund, complaint, legal, lawyer, scam, police, cheating, fraud',
  products JSONB DEFAULT '[]'::jsonb,
  knowledge_base TEXT DEFAULT '',
  system_prompt TEXT DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_agent ADD COLUMN IF NOT EXISTS prebuilt_id UUID REFERENCES prebuilt_agent(id) ON DELETE SET NULL;
