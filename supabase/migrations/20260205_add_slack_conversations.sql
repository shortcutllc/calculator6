-- Slack conversation history for the Pro assistant
-- Stores Anthropic message format per Slack thread for multi-turn context

CREATE TABLE IF NOT EXISTS slack_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id TEXT NOT NULL,
  thread_ts TEXT NOT NULL,
  messages JSONB DEFAULT '[]'::jsonb,
  last_proposal_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, thread_ts)
);

CREATE INDEX IF NOT EXISTS idx_slack_conv_thread ON slack_conversations(channel_id, thread_ts);

-- RLS: only service role can access (serverless function uses service role key)
ALTER TABLE slack_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON slack_conversations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
