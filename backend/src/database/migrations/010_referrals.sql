-- Referral codes — one per user, auto-generated on first request
CREATE TABLE IF NOT EXISTS referral_codes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code        TEXT        NOT NULL UNIQUE,         -- 8-char uppercase alphanumeric
  total_uses  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT referral_codes_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes (code);

-- Tracks each time someone used a referral code
CREATE TABLE IF NOT EXISTS referral_uses (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code               TEXT        NOT NULL REFERENCES referral_codes(code) ON DELETE CASCADE,
  referrer_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referee_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referee_rewarded   BOOLEAN     NOT NULL DEFAULT false,  -- +50 NXO on signup
  referrer_rewarded  BOOLEAN     NOT NULL DEFAULT false,  -- +100 NXO on referee's first trade
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT referral_uses_referee_unique UNIQUE (referee_id)  -- each user can only use one code
);

CREATE INDEX IF NOT EXISTS idx_referral_uses_referrer ON referral_uses (referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_uses_referee  ON referral_uses (referee_id);
