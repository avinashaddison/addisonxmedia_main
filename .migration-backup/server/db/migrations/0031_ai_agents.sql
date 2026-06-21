CREATE TABLE IF NOT EXISTS ai_agent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom',
  business_name TEXT NOT NULL DEFAULT '',
  what_we_sell TEXT NOT NULL DEFAULT '',
  tone TEXT NOT NULL DEFAULT 'friendly',
  response_language TEXT NOT NULL DEFAULT 'hinglish',
  always_say TEXT NOT NULL DEFAULT '',
  never_say TEXT NOT NULL DEFAULT '',
  escalate_keywords TEXT NOT NULL DEFAULT 'refund, complaint, legal, lawyer, scam, police, cheating, fraud',
  products JSONB DEFAULT '[]'::jsonb,
  knowledge_base TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_agent_owner_idx ON ai_agent(owner_id);
CREATE INDEX IF NOT EXISTS ai_agent_owner_active_idx ON ai_agent(owner_id, is_active);
