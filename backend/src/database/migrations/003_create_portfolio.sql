-- Portfolio balances — one row per user
CREATE TABLE IF NOT EXISTS portfolio_balances (
  user_id              UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  inr_balance          NUMERIC(20,2) NOT NULL DEFAULT 0,
  nxo_balance          NUMERIC(20,4) NOT NULL DEFAULT 0,
  virtual_balance      NUMERIC(20,2) NOT NULL DEFAULT 0,
  daily_bonus_claimed  BOOLEAN       NOT NULL DEFAULT FALSE,
  daily_bonus_date     DATE,
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Open positions
CREATE TABLE IF NOT EXISTS positions (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol       VARCHAR(100) NOT NULL,
  exchange     VARCHAR(20)  NOT NULL,
  quantity     INTEGER      NOT NULL CHECK (quantity > 0),
  avg_price    NUMERIC(20,4) NOT NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, symbol, exchange)
);

CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions (user_id);

DROP TRIGGER IF EXISTS trg_positions_updated_at ON positions;
CREATE TRIGGER trg_positions_updated_at
  BEFORE UPDATE ON positions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Executed orders
CREATE TABLE IF NOT EXISTS orders (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol           VARCHAR(100) NOT NULL,
  exchange         VARCHAR(20)  NOT NULL,
  quantity         INTEGER      NOT NULL CHECK (quantity > 0),
  price            NUMERIC(20,4),
  order_type       VARCHAR(30)  NOT NULL,
  transaction_type VARCHAR(10)  NOT NULL,
  variety          VARCHAR(20),
  status           VARCHAR(20)  NOT NULL DEFAULT 'EXECUTED',
  validity         VARCHAR(20),
  stop_loss        NUMERIC(20,4),
  take_profit      NUMERIC(20,4),
  trigger_price    NUMERIC(20,4),
  executed_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id     ON orders (user_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_symbol      ON orders (user_id, symbol);

-- Wallet transactions (INR deposits, NXO purchases, reward credits)
CREATE TABLE IF NOT EXISTS transactions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(30) NOT NULL,
  description TEXT        NOT NULL,
  amount      VARCHAR(100) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id, created_at DESC);

-- GTT orders
CREATE TABLE IF NOT EXISTS gtt_orders (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol                 VARCHAR(100) NOT NULL,
  exchange               VARCHAR(20),
  transaction_type       VARCHAR(10) NOT NULL,
  trigger_type           VARCHAR(10) NOT NULL,
  quantity               INTEGER     NOT NULL,
  status                 VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  trigger_price          NUMERIC(20,4),
  limit_price            NUMERIC(20,4),
  stoploss_trigger_price NUMERIC(20,4),
  stoploss_limit_price   NUMERIC(20,4),
  target_trigger_price   NUMERIC(20,4),
  target_limit_price     NUMERIC(20,4),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at             TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gtt_orders_user_id ON gtt_orders (user_id, status);
CREATE INDEX IF NOT EXISTS idx_gtt_orders_active  ON gtt_orders (status, symbol) WHERE status = 'ACTIVE';

-- Price alerts
CREATE TABLE IF NOT EXISTS alerts (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol     VARCHAR(100) NOT NULL,
  exchange   VARCHAR(20),
  property   VARCHAR(30)  NOT NULL,
  operator   VARCHAR(5)   NOT NULL,
  value      NUMERIC(20,4) NOT NULL,
  type       VARCHAR(20)  NOT NULL DEFAULT 'ALERT_ONLY',
  status     VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts (user_id, status);
CREATE INDEX IF NOT EXISTS idx_alerts_active  ON alerts (status, symbol) WHERE status = 'ACTIVE';
