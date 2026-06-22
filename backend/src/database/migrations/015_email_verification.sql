-- Email verification tokens (one-time links sent on registration)
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  used       BOOLEAN     NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evtoken_hash    ON email_verification_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_evtoken_user_id ON email_verification_tokens (user_id);

-- New registrations now require email verification; existing rows keep their current value
ALTER TABLE users ALTER COLUMN is_verified SET DEFAULT FALSE;
