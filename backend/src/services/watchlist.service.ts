import { pool } from '../database/pool';

export interface DbWatchlist {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

export interface DbWatchlistGroup {
  id: string;
  watchlist_id: string;
  name: string;
  sort_order: number;
}

export interface DbWatchlistSymbol {
  id: string;
  watchlist_id: string;
  group_id: string | null;
  symbol: string;
  exchange: string;
  sort_order: number;
  notes: string | null;
}

export interface WatchlistWithData extends DbWatchlist {
  groups: Array<DbWatchlistGroup & { symbols: DbWatchlistSymbol[] }>;
  ungrouped: DbWatchlistSymbol[];
}

// ─── List / Get ───────────────────────────────────────────────────────────────

export const getUserWatchlists = async (userId: string): Promise<WatchlistWithData[]> => {
  const { rows: lists } = await pool.query<DbWatchlist>(
    'SELECT * FROM watchlists WHERE user_id = $1 ORDER BY created_at',
    [userId],
  );
  if (!lists.length) return [];

  const ids = lists.map((l) => l.id);
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');

  const [{ rows: groups }, { rows: symbols }] = await Promise.all([
    pool.query<DbWatchlistGroup>(
      `SELECT * FROM watchlist_groups WHERE watchlist_id IN (${placeholders}) ORDER BY sort_order`,
      ids,
    ),
    pool.query<DbWatchlistSymbol>(
      `SELECT ws.*, wn.notes FROM watchlist_symbols ws
       LEFT JOIN watchlist_notes wn ON wn.watchlist_symbol_id = ws.id AND wn.user_id = $${ids.length + 1}
       WHERE ws.watchlist_id IN (${placeholders}) ORDER BY ws.sort_order`,
      [...ids, userId],
    ),
  ]);

  return lists.map((list) => {
    const listGroups = groups.filter((g) => g.watchlist_id === list.id);
    const listSymbols = symbols.filter((s) => s.watchlist_id === list.id);
    return {
      ...list,
      groups: listGroups.map((g) => ({
        ...g,
        symbols: listSymbols.filter((s) => s.group_id === g.id),
      })),
      ungrouped: listSymbols.filter((s) => s.group_id === null),
    };
  });
};

// ─── Watchlist CRUD ───────────────────────────────────────────────────────────

export const createWatchlist = async (userId: string, name: string): Promise<DbWatchlist> => {
  const { rows } = await pool.query<DbWatchlist>(
    'INSERT INTO watchlists (user_id, name) VALUES ($1, $2) RETURNING *',
    [userId, name.trim()],
  );
  return rows[0];
};

export const renameWatchlist = async (userId: string, watchlistId: string, name: string): Promise<boolean> => {
  const { rowCount } = await pool.query(
    'UPDATE watchlists SET name = $1 WHERE id = $2 AND user_id = $3',
    [name.trim(), watchlistId, userId],
  );
  return (rowCount ?? 0) > 0;
};

export const deleteWatchlist = async (userId: string, watchlistId: string): Promise<boolean> => {
  const { rowCount } = await pool.query(
    'DELETE FROM watchlists WHERE id = $1 AND user_id = $2',
    [watchlistId, userId],
  );
  return (rowCount ?? 0) > 0;
};

// ─── Group CRUD ───────────────────────────────────────────────────────────────

export const createGroup = async (watchlistId: string, userId: string, name: string): Promise<DbWatchlistGroup> => {
  // Verify ownership
  const { rows: ownCheck } = await pool.query(
    'SELECT id FROM watchlists WHERE id = $1 AND user_id = $2',
    [watchlistId, userId],
  );
  if (!ownCheck.length) throw Object.assign(new Error('Watchlist not found'), { statusCode: 404 });

  const { rows: sortRows } = await pool.query<{ max: number }>(
    'SELECT COALESCE(MAX(sort_order), 0) AS max FROM watchlist_groups WHERE watchlist_id = $1',
    [watchlistId],
  );
  const nextSort = Number(sortRows[0]?.max ?? 0) + 1;

  const { rows } = await pool.query<DbWatchlistGroup>(
    'INSERT INTO watchlist_groups (watchlist_id, name, sort_order) VALUES ($1,$2,$3) RETURNING *',
    [watchlistId, name.trim(), nextSort],
  );
  return rows[0];
};

export const deleteGroup = async (groupId: string, userId: string): Promise<boolean> => {
  // Ungroup symbols rather than deleting them
  await pool.query(
    `UPDATE watchlist_symbols SET group_id = NULL
     WHERE group_id = $1 AND watchlist_id IN (SELECT id FROM watchlists WHERE user_id = $2)`,
    [groupId, userId],
  );
  const { rowCount } = await pool.query(
    `DELETE FROM watchlist_groups WHERE id = $1
     AND watchlist_id IN (SELECT id FROM watchlists WHERE user_id = $2)`,
    [groupId, userId],
  );
  return (rowCount ?? 0) > 0;
};

// ─── Symbol CRUD ──────────────────────────────────────────────────────────────

export const addSymbol = async (
  watchlistId: string,
  userId: string,
  symbol: string,
  exchange: string,
  groupId?: string,
): Promise<DbWatchlistSymbol> => {
  const { rows: ownCheck } = await pool.query(
    'SELECT id FROM watchlists WHERE id = $1 AND user_id = $2',
    [watchlistId, userId],
  );
  if (!ownCheck.length) throw Object.assign(new Error('Watchlist not found'), { statusCode: 404 });

  const { rows: sortRows } = await pool.query<{ max: number }>(
    'SELECT COALESCE(MAX(sort_order), 0) AS max FROM watchlist_symbols WHERE watchlist_id = $1',
    [watchlistId],
  );
  const nextSort = Number(sortRows[0]?.max ?? 0) + 1;

  const { rows } = await pool.query<DbWatchlistSymbol>(
    `INSERT INTO watchlist_symbols (watchlist_id, group_id, symbol, exchange, sort_order)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (watchlist_id, symbol, exchange) DO NOTHING
     RETURNING *`,
    [watchlistId, groupId ?? null, symbol.toUpperCase(), exchange.toUpperCase(), nextSort],
  );
  if (!rows.length) throw Object.assign(new Error(`${symbol} is already in this watchlist`), { statusCode: 409 });
  return rows[0];
};

export const removeSymbol = async (symbolId: string, userId: string): Promise<boolean> => {
  const { rowCount } = await pool.query(
    `DELETE FROM watchlist_symbols WHERE id = $1
     AND watchlist_id IN (SELECT id FROM watchlists WHERE user_id = $2)`,
    [symbolId, userId],
  );
  return (rowCount ?? 0) > 0;
};

export const setSymbolNote = async (
  symbolId: string,
  userId: string,
  notes: string,
): Promise<void> => {
  if (notes.trim()) {
    await pool.query(
      `INSERT INTO watchlist_notes (watchlist_symbol_id, user_id, notes)
       VALUES ($1, $2, $3)
       ON CONFLICT (watchlist_symbol_id, user_id) DO UPDATE SET notes = $3, updated_at = NOW()`,
      [symbolId, userId, notes.trim()],
    );
  } else {
    await pool.query(
      'DELETE FROM watchlist_notes WHERE watchlist_symbol_id = $1 AND user_id = $2',
      [symbolId, userId],
    );
  }
};
