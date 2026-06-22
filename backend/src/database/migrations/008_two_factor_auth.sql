-- TOTP secret per user
CREATE TABLE IF NOT EXISTS user_2fa (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  secret     TEXT        NOT NULL,            -- base32-encoded TOTP secret
  enabled    BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Single-use recovery codes (stored as bcrypt hashes)
CREATE TABLE IF NOT EXISTS user_2fa_recovery (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash  TEXT        NOT NULL,
  used       BOOLEAN     NOT NULL DEFAULT false,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_2fa_recovery_user_idx ON user_2fa_recovery(user_id);
