-- Add agent_mode boolean to conversation table.
-- When true, the AI auto-replies to every inbound message in that conversation
-- using the workspace's active agent persona (fire-and-forget, never delays
-- Meta's webhook 200 ack).
ALTER TABLE conversation
  ADD COLUMN IF NOT EXISTS agent_mode boolean NOT NULL DEFAULT false;
