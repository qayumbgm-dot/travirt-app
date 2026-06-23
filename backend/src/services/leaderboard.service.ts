import { pool } from '../database/pool';
import { marketService } from './market.service';

export interface LeaderEntry {
  rank: number;
  userId: string;
  displayName: string;
  portfolioValue: number;
  totalDeposited: number;
  returnPct: number;
  pnl: number;
  tradeCount: number;
}

export const getLeaderboard = async (limit = 100): Promise<LeaderEntry[]> => {
  // Get all users with their balances, positions, trade counts, and total deposited
  const { rows } = await pool.query<{
    user_uuid: string;
    user_id: string;
    display_name: string;
    virtual_balance: string;
    trade_count: string;
    total_deposited: string;
  }>(`
    SELECT
      u.id                                         AS user_uuid,
      u.user_id,
      COALESCE(u.display_name, u.user_id)          AS display_name,
      COALESCE(pb.virtual_balance, 0)              AS virtual_balance,
      (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id AND o.status = 'COMPLETE') AS trade_count,
      (SELECT COALESCE(SUM(CASE WHEN t.type = 'CONVERT_NXO'
                               THEN CAST(REGEXP_REPLACE(t.amount, '[^0-9.]', '', 'g') AS NUMERIC)
                               ELSE 0 END), 0)
       FROM transactions t WHERE t.user_id = u.id)  AS total_deposited
    FROM users u
    LEFT JOIN portfolio_balances pb ON pb.user_id = u.id
    ORDER BY virtual_balance DESC
    LIMIT $1
  `, [limit * 2]);

  if (!rows.length) return [];

  // Fetch all positions for these users in one query (ANY is plan-cache friendly)
  const userIds = rows.map((r) => r.user_uuid);
  const { rows: positions } = await pool.query<{
    user_id: string;
    symbol: string;
    exchange: string;
    quantity: string;
    avg_price: string;
  }>(
    'SELECT user_id, symbol, exchange, quantity, avg_price FROM positions WHERE user_id = ANY($1::uuid[])',
    [userIds],
  );

  // Group positions by user
  const positionsByUser = new Map<string, typeof positions>();
  for (const p of positions) {
    let bucket = positionsByUser.get(p.user_id);
    if (!bucket) { bucket = []; positionsByUser.set(p.user_id, bucket); }
    bucket.push(p);
  }

  // Compute portfolio value for each user using O(1) getLtp instead of copying the full map
  const entries: LeaderEntry[] = rows.map((row) => {
    const virtualBal    = parseFloat(row.virtual_balance);
    const totalDeposited = parseFloat(row.total_deposited);
    const userPositions  = positionsByUser.get(row.user_uuid) ?? [];

    const positionsValue = userPositions.reduce((sum, pos) => {
      const ltp = marketService.getLtp(pos.exchange, pos.symbol) ?? parseFloat(pos.avg_price);
      return sum + parseInt(pos.quantity) * ltp;
    }, 0);

    const portfolioValue = virtualBal + positionsValue;
    const pnl            = portfolioValue - totalDeposited;
    const returnPct      = totalDeposited > 0 ? (pnl / totalDeposited) * 100 : 0;

    return {
      rank: 0,
      userId: row.user_id,
      displayName: row.display_name,
      portfolioValue,
      totalDeposited,
      returnPct,
      pnl,
      tradeCount: parseInt(row.trade_count),
    };
  });

  // Sort by return % (for users with deposits), then by portfolio value
  entries.sort((a, b) => {
    if (a.totalDeposited > 0 && b.totalDeposited > 0) return b.returnPct - a.returnPct;
    if (a.totalDeposited > 0) return -1;
    if (b.totalDeposited > 0) return 1;
    return b.portfolioValue - a.portfolioValue;
  });

  return entries.slice(0, limit).map((e, i) => ({ ...e, rank: i + 1 }));
};

/**
 * Returns the authenticated user's rank without loading the full leaderboard.
 * Uses a SQL window function for O(log n) performance instead of O(n) in-process sort.
 * Approximates position values at avg_price (no live LTP) — accurate enough for rank display.
 */
export const getUserRank = async (userUuid: string): Promise<{ rank: number; total: number } | null> => {
  const { rows } = await pool.query<{ rank: string; total: string }>(`
    WITH portfolio_values AS (
      SELECT
        pb.user_id,
        pb.virtual_balance + COALESCE(
          (SELECT SUM(p.quantity * p.avg_price) FROM positions p WHERE p.user_id = pb.user_id),
          0
        ) AS total_value
      FROM portfolio_balances pb
    ),
    ranked AS (
      SELECT
        user_id,
        RANK() OVER (ORDER BY total_value DESC) AS rank,
        COUNT(*) OVER ()                         AS total
      FROM portfolio_values
    )
    SELECT rank, total FROM ranked WHERE user_id = $1
  `, [userUuid]);

  if (!rows[0]) return null;
  return { rank: Number(rows[0].rank), total: Number(rows[0].total) };
};
