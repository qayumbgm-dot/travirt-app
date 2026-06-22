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
  const priceMap = marketService.getPriceMap();

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
      (SELECT COUNT(*)  FROM orders o  WHERE o.user_id = u.id AND o.status = 'COMPLETE') AS trade_count,
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

  // Fetch all positions for these users in one query
  const userIds = rows.map((r) => r.user_uuid);
  const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
  const { rows: positions } = await pool.query<{
    user_id: string;
    symbol: string;
    exchange: string;
    quantity: string;
    avg_price: string;
  }>(`SELECT user_id, symbol, exchange, quantity, avg_price FROM positions WHERE user_id IN (${placeholders})`, userIds);

  // Group positions by user
  const positionsByUser = new Map<string, typeof positions>();
  positions.forEach((p) => {
    if (!positionsByUser.has(p.user_id)) positionsByUser.set(p.user_id, []);
    positionsByUser.get(p.user_id)!.push(p);
  });

  // Compute portfolio value for each user
  const entries: LeaderEntry[] = rows.map((row) => {
    const virtualBal = parseFloat(row.virtual_balance);
    const totalDeposited = parseFloat(row.total_deposited);
    const userPositions = positionsByUser.get(row.user_uuid) ?? [];

    const positionsValue = userPositions.reduce((sum, pos) => {
      const ltp = priceMap.get(`${pos.exchange}:${pos.symbol}`) ?? parseFloat(pos.avg_price);
      return sum + parseInt(pos.quantity) * ltp;
    }, 0);

    const portfolioValue = virtualBal + positionsValue;
    const pnl = portfolioValue - totalDeposited;
    const returnPct = totalDeposited > 0 ? (pnl / totalDeposited) * 100 : 0;

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

export const getUserRank = async (userUuid: string): Promise<{ rank: number; total: number } | null> => {
  const all = await getLeaderboard(10000);
  const idx = all.findIndex((e) => {
    // compare by userId string since we only have uuid in service
    return e.userId === userUuid;
  });
  if (idx === -1) return null;
  return { rank: idx + 1, total: all.length };
};
