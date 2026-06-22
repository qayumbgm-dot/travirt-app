CREATE TABLE IF NOT EXISTS alerts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol     VARCHAR(50) NOT NULL,
  exchange   VARCHAR(10) NOT NULL DEFAULT 'NSE',
  property   VARCHAR(10) NOT NULL CHECK (property IN ('LTP', 'CHANGE', 'CHANGE%', 'VOLUME', 'HIGH', 'LOW')),
  operator   VARCHAR(2)  NOT NULL CHECK (operator IN ('>', '<', '>=', '<=', '=')),
  value      NUMERIC(14, 4) NOT NULL,
  type       VARCHAR(12) NOT NULL DEFAULT 'ALERT_ONLY'
               CHECK (type IN ('ALERT_ONLY', 'ATO')),
  status     VARCHAR(10) NOT NULL DEFAULT 'ACTIVE'
               CHECK (status IN ('ACTIVE', 'TRIGGERED', 'CANCELLED', 'EXPIRED')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user   ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(status) WHERE status = 'ACTIVE';
