CREATE TABLE IF NOT EXISTS gtt_orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol                VARCHAR(50) NOT NULL,
  exchange              VARCHAR(10) NOT NULL DEFAULT 'NSE',
  transaction_type      VARCHAR(4)  NOT NULL CHECK (transaction_type IN ('BUY', 'SELL')),
  trigger_type          VARCHAR(6)  NOT NULL CHECK (trigger_type IN ('SINGLE', 'OCO')),
  quantity              INT         NOT NULL CHECK (quantity > 0),
  trigger_price         NUMERIC(14, 4),
  limit_price           NUMERIC(14, 4),
  stoploss_trigger_price NUMERIC(14, 4),
  stoploss_limit_price  NUMERIC(14, 4),
  target_trigger_price  NUMERIC(14, 4),
  target_limit_price    NUMERIC(14, 4),
  status                VARCHAR(10) NOT NULL DEFAULT 'ACTIVE'
                          CHECK (status IN ('ACTIVE', 'TRIGGERED', 'CANCELLED', 'FAILED')),
  expires_at            TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 year',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gtt_orders_user   ON gtt_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_gtt_orders_active ON gtt_orders(status) WHERE status = 'ACTIVE';
