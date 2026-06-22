-- Sessions — stores hashed refresh tokens; one row per active device/browser
CREATE TABLE IF NOT EXISTS sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash  VARCHAR(64) UNIQUE NOT NULL,   -- SHA-256 hex of the raw token
  expires_at          TIMESTAMPTZ NOT NULL,
  ip_address          VARCHAR(45),
  user_agent          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id            ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token_hash ON sessions (refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at         ON sessions (expires_at);
