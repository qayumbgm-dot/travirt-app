-- Plans catalogue
CREATE TABLE IF NOT EXISTS plans (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(50)  NOT NULL UNIQUE,
  display_name    VARCHAR(100) NOT NULL,
  price_inr       INTEGER      NOT NULL DEFAULT 0,   -- monthly, in paise (₹99 = 9900)
  stripe_price_id VARCHAR(255),                       -- Stripe Price ID (set from dashboard)
  features        JSONB        NOT NULL DEFAULT '{}',
  sort_order      INTEGER      NOT NULL DEFAULT 0,
  is_active       BOOLEAN      NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Per-user subscription state (synced from Stripe webhooks)
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id                UUID        NOT NULL REFERENCES plans(id),
  status                 VARCHAR(30) NOT NULL DEFAULT 'active',
  stripe_customer_id     VARCHAR(255),
  stripe_subscription_id VARCHAR(255) UNIQUE,
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  cancel_at_period_end   BOOLEAN     NOT NULL DEFAULT false,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_subscriptions_user_idx    ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS user_subscriptions_stripe_cust ON user_subscriptions(stripe_customer_id);

-- Seed plan catalogue
INSERT INTO plans (name, display_name, price_inr, features, sort_order) VALUES
  (
    'free', 'Free', 0,
    '{"watchlists":1,"alerts":10,"aiNews":false,"leaderboard":true,"virtualBalance":100000,"prioritySupport":false,"propFirmReports":false}'::jsonb,
    0
  ),
  (
    'pro', 'Pro', 9900,
    '{"watchlists":5,"alerts":50,"aiNews":true,"leaderboard":true,"virtualBalance":500000,"prioritySupport":true,"propFirmReports":false}'::jsonb,
    1
  ),
  (
    'elite', 'Elite', 29900,
    '{"watchlists":-1,"alerts":-1,"aiNews":true,"leaderboard":true,"virtualBalance":1000000,"prioritySupport":true,"propFirmReports":true}'::jsonb,
    2
  )
ON CONFLICT (name) DO NOTHING;
