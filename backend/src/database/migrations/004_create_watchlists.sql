-- Watchlists — one user can have multiple named watchlists
CREATE TABLE IF NOT EXISTS watchlists (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON watchlists (user_id, sort_order);

-- Groups within a watchlist (collapsible sub-lists)
CREATE TABLE IF NOT EXISTS watchlist_groups (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id UUID        NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  color        VARCHAR(20),
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  is_collapsed BOOLEAN     NOT NULL DEFAULT FALSE,
  is_maximized BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_watchlist_groups_watchlist_id ON watchlist_groups (watchlist_id, sort_order);

-- Symbols within a group — composite key e.g. "NSE:RELIANCE"
CREATE TABLE IF NOT EXISTS watchlist_symbols (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID        NOT NULL REFERENCES watchlist_groups(id) ON DELETE CASCADE,
  symbol_key VARCHAR(200) NOT NULL,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  UNIQUE (group_id, symbol_key)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_symbols_group_id ON watchlist_symbols (group_id, sort_order);

-- Per-watchlist display settings (stored as JSON blob)
CREATE TABLE IF NOT EXISTS watchlist_settings (
  watchlist_id UUID PRIMARY KEY REFERENCES watchlists(id) ON DELETE CASCADE,
  settings_json JSONB NOT NULL DEFAULT '{}'
);

-- Per-watchlist per-symbol notes
CREATE TABLE IF NOT EXISTS watchlist_notes (
  watchlist_id UUID        NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  symbol_key   VARCHAR(200) NOT NULL,
  note_text    TEXT        NOT NULL DEFAULT '',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (watchlist_id, symbol_key)
);

-- Pinned header items (up to 2)
CREATE TABLE IF NOT EXISTS pinned_items (
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot       INTEGER     NOT NULL CHECK (slot IN (0, 1)),
  symbol     VARCHAR(100) NOT NULL,
  PRIMARY KEY (user_id, slot)
);
