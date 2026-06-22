import { pool } from '../database/pool';

export interface DbGttOrder {
  id: string;
  user_id: string;
  symbol: string;
  exchange: string;
  transaction_type: string;
  trigger_type: string;
  quantity: number;
  trigger_price: number | null;
  limit_price: number | null;
  stoploss_trigger_price: number | null;
  stoploss_limit_price: number | null;
  target_trigger_price: number | null;
  target_limit_price: number | null;
  status: string;
  expires_at: string;
  created_at: string;
}

export interface CreateGttPayload {
  symbol: string;
  exchange: string;
  transactionType: 'BUY' | 'SELL';
  triggerType: 'SINGLE' | 'OCO';
  quantity: number;
  triggerPrice?: number;
  limitPrice?: number;
  stoplossTriggerPrice?: number;
  stoplossLimitPrice?: number;
  targetTriggerPrice?: number;
  targetLimitPrice?: number;
}

export const createGtt = async (userId: string, p: CreateGttPayload): Promise<DbGttOrder> => {
  const { rows } = await pool.query<DbGttOrder>(
    `INSERT INTO gtt_orders
      (user_id, symbol, exchange, transaction_type, trigger_type, quantity,
       trigger_price, limit_price,
       stoploss_trigger_price, stoploss_limit_price,
       target_trigger_price,  target_limit_price)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      userId, p.symbol, p.exchange, p.transactionType, p.triggerType, p.quantity,
      p.triggerPrice          ?? null,
      p.limitPrice            ?? null,
      p.stoplossTriggerPrice  ?? null,
      p.stoplossLimitPrice    ?? null,
      p.targetTriggerPrice    ?? null,
      p.targetLimitPrice      ?? null,
    ],
  );
  return rows[0];
};

export const listGtts = async (userId: string): Promise<DbGttOrder[]> => {
  const { rows } = await pool.query<DbGttOrder>(
    'SELECT * FROM gtt_orders WHERE user_id = $1 ORDER BY created_at DESC',
    [userId],
  );
  return rows;
};

export const cancelGtt = async (userId: string, id: string): Promise<boolean> => {
  const { rowCount } = await pool.query(
    "UPDATE gtt_orders SET status = 'CANCELLED' WHERE id = $1 AND user_id = $2 AND status = 'ACTIVE'",
    [id, userId],
  );
  return (rowCount ?? 0) > 0;
};
