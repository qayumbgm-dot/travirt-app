-- Per-user broker account connections
-- The platform's own Alice Blue credentials (ALICE_USER_ID / ALICE_API_KEY env vars)
-- are used only for the shared market-data WebSocket.
-- This table stores each individual user's own broker credentials for live order routing.
CREATE TABLE IF NOT EXISTS broker_connections (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  broker            VARCHAR(30)  NOT NULL DEFAULT 'aliceblue',
  broker_user_id    VARCHAR(100) NOT NULL,
  -- AES-256-GCM encrypted API key: "{iv_hex}:{auth_tag_hex}:{ciphertext_hex}"
  encrypted_api_key TEXT         NOT NULL,
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  connected_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_used_at      TIMESTAMPTZ,
  UNIQUE (user_id, broker)
);

CREATE INDEX IF NOT EXISTS idx_broker_conn_user_id ON broker_connections (user_id, is_active);
