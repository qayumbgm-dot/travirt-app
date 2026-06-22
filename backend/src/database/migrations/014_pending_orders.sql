CREATE TABLE IF NOT EXISTS pending_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol           VARCHAR(50) NOT NULL,
  exchange         VARCHAR(10) NOT NULL DEFAULT 'NSE',
  transaction_type VARCHAR(4)  NOT NULL CHECK (transaction_type IN ('BUY', 'SELL')),
  order_type       VARCHAR(3)  NOT NULL CHECK (order_type IN ('LMT', 'SL', 'SLM')),
  quantity         INT         NOT NULL CHECK (quantity > 0),
  limit_price      NUMERIC(14, 4) NOT NULL,
  trigger_price    NUMERIC(14, 4),
  status           VARCHAR(10) NOT NULL DEFAULT 'PENDING'
                     CHECK (status IN ('PENDING', 'FILLED', 'CANCELLED', 'EXPIRED')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 day'
);

CREATE INDEX IF NOT EXISTS idx_pending_orders_user   ON pending_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_orders_active ON pending_orders(status) WHERE status = 'PENDING';
