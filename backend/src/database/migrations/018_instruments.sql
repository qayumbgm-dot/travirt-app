-- Instrument master: all tradeable symbols across NSE, BSE, NFO, CDS, MCX.
-- Populated at startup and refreshed daily by instrumentMaster.service.ts.

CREATE TABLE IF NOT EXISTS instruments (
  id              SERIAL          PRIMARY KEY,
  token           VARCHAR(20)     NOT NULL,
  symbol          VARCHAR(100)    NOT NULL,
  name            VARCHAR(300)    NOT NULL DEFAULT '',
  exchange        VARCHAR(10)     NOT NULL,
  segment         VARCHAR(20)     NOT NULL,                 -- NSE_CM | NSE_FO | BSE_CM | MCX | CDS
  instrument_type VARCHAR(10)     NOT NULL DEFAULT 'EQ',   -- EQ | FUT | CE | PE | IDX
  expiry          DATE,
  strike          NUMERIC(12, 2),
  lot_size        INTEGER         NOT NULL DEFAULT 1,
  tick_size       NUMERIC(10, 4)  NOT NULL DEFAULT 0.05,
  isin            VARCHAR(20),
  refreshed_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  CONSTRAINT instruments_token_exchange_uq UNIQUE (token, exchange)
);

-- Fast text search on symbol and name
CREATE INDEX IF NOT EXISTS idx_instr_symbol   ON instruments (symbol);
CREATE INDEX IF NOT EXISTS idx_instr_name     ON instruments USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_instr_exchange ON instruments (exchange);
CREATE INDEX IF NOT EXISTS idx_instr_segment  ON instruments (segment);
CREATE INDEX IF NOT EXISTS idx_instr_type     ON instruments (instrument_type);
CREATE INDEX IF NOT EXISTS idx_instr_expiry   ON instruments (expiry) WHERE expiry IS NOT NULL;
