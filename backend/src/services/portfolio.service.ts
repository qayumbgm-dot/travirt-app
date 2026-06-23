import { Pool, PoolClient } from 'pg';
import { pool } from '../database/pool';

type Queryable = Pool | PoolClient;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DbBalances {
  inr_balance: number;
  nxo_balance: number;
  virtual_balance: number;
  daily_bonus_claimed: boolean;
  daily_bonus_date: string | null;
}

export interface DbPosition {
  id: string;
  symbol: string;
  exchange: string;
  quantity: number;
  avg_price: number;
}

export interface DbOrder {
  id: string;
  symbol: string;
  exchange: string;
  quantity: number;
  price: number | null;
  order_type: string;
  transaction_type: string;
  variety: string | null;
  status: string;
  validity: string | null;
  stop_loss: number | null;
  take_profit: number | null;
  trigger_price: number | null;
  executed_at: string;
}

export interface DbTransaction {
  id: string;
  type: string;
  description: string;
  amount: string;
  created_at: string;
}

export interface DbGttOrder {
  id: string;
  symbol: string;
  exchange: string | null;
  transaction_type: string;
  trigger_type: string;
  quantity: number;
  status: string;
  trigger_price: number | null;
  limit_price: number | null;
  stoploss_trigger_price: number | null;
  stoploss_limit_price: number | null;
  target_trigger_price: number | null;
  target_limit_price: number | null;
  created_at: string;
  expires_at: string;
}

export interface DbAlert {
  id: string;
  symbol: string;
  exchange: string | null;
  property: string;
  operator: string;
  value: number;
  type: string;
  status: string;
  created_at: string;
  expires_at: string;
}

// ─── Balances ─────────────────────────────────────────────────────────────────

export const getBalances = async (userId: string): Promise<DbBalances> => {
  const { rows } = await pool.query<DbBalances>(
    'SELECT inr_balance, nxo_balance, virtual_balance, daily_bonus_claimed, daily_bonus_date FROM portfolio_balances WHERE user_id = $1',
    [userId],
  );
  return rows[0] ?? { inr_balance: 0, nxo_balance: 0, virtual_balance: 0, daily_bonus_claimed: false, daily_bonus_date: null };
};

export const incrementBalance = async (
  userId: string,
  field: 'inr_balance' | 'nxo_balance' | 'virtual_balance',
  delta: number,
  client: Queryable = pool,
): Promise<void> => {
  await (client as any).query(
    `UPDATE portfolio_balances SET ${field} = ${field} + $1, updated_at = NOW() WHERE user_id = $2`,
    [delta, userId],
  );
};

// ─── Positions ────────────────────────────────────────────────────────────────

export const getPositions = async (userId: string): Promise<DbPosition[]> => {
  const { rows } = await pool.query<DbPosition>(
    'SELECT id, symbol, exchange, quantity, avg_price FROM positions WHERE user_id = $1 ORDER BY symbol',
    [userId],
  );
  return rows;
};

export const getPosition = async (
  userId: string,
  symbol: string,
  exchange: string,
  client: Queryable = pool,
): Promise<DbPosition | null> => {
  const { rows } = await client.query<DbPosition>(
    'SELECT id, symbol, exchange, quantity, avg_price FROM positions WHERE user_id = $1 AND symbol = $2 AND exchange = $3',
    [userId, symbol, exchange],
  );
  return rows[0] ?? null;
};

// ─── Orders ───────────────────────────────────────────────────────────────────

export const getOrders = async (userId: string, limit = 200): Promise<DbOrder[]> => {
  const { rows } = await pool.query<DbOrder>(
    `SELECT id, symbol, exchange, quantity, price, order_type, transaction_type, variety,
            status, validity, stop_loss, take_profit, trigger_price, executed_at
     FROM orders WHERE user_id = $1 ORDER BY executed_at DESC LIMIT $2`,
    [userId, limit],
  );
  return rows;
};

export const insertOrder = async (
  userId: string,
  order: Omit<DbOrder, 'id' | 'executed_at'>,
  client: Queryable = pool,
): Promise<DbOrder> => {
  const { rows } = await client.query<DbOrder>(
    `INSERT INTO orders (user_id, symbol, exchange, quantity, price, order_type, transaction_type, variety, status, validity, stop_loss, take_profit, trigger_price)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      userId, order.symbol, order.exchange, order.quantity, order.price ?? null,
      order.order_type, order.transaction_type, order.variety ?? null, order.status,
      order.validity ?? null, order.stop_loss ?? null, order.take_profit ?? null,
      order.trigger_price ?? null,
    ],
  );
  return rows[0];
};

// ─── CSV Export ───────────────────────────────────────────────────────────────

const escapeCsv = (v: unknown): string => {
  if (v == null) return '';
  const s = String(v);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
};

const toCsvRow = (values: unknown[]): string => values.map(escapeCsv).join(',');

export const exportOrdersCsv = async (userId: string): Promise<string> => {
  const { rows } = await pool.query<DbOrder>(
    'SELECT * FROM orders WHERE user_id = $1 ORDER BY executed_at DESC',
    [userId],
  );
  const header = toCsvRow(['ID', 'Symbol', 'Exchange', 'Quantity', 'Price', 'Order Type', 'Transaction Type', 'Variety', 'Status', 'Validity', 'Stop Loss', 'Take Profit', 'Trigger Price', 'Executed At']);
  const dataRows = rows.map(r => toCsvRow([
    r.id, r.symbol, r.exchange, r.quantity, r.price ?? '',
    r.order_type, r.transaction_type, r.variety ?? '', r.status, r.validity ?? '',
    r.stop_loss ?? '', r.take_profit ?? '', r.trigger_price ?? '', r.executed_at,
  ]));
  return [header, ...dataRows].join('\r\n');
};

export const exportTransactionsCsv = async (userId: string): Promise<string> => {
  const { rows } = await pool.query<DbTransaction>(
    'SELECT id, type, description, amount, created_at FROM transactions WHERE user_id = $1 ORDER BY created_at DESC',
    [userId],
  );
  const header = toCsvRow(['ID', 'Type', 'Description', 'Amount (INR)', 'Date']);
  const dataRows = rows.map(r => toCsvRow([r.id, r.type, r.description, r.amount, r.created_at]));
  return [header, ...dataRows].join('\r\n');
};

// ─── Transactions ─────────────────────────────────────────────────────────────

export const getTransactions = async (userId: string): Promise<DbTransaction[]> => {
  const { rows } = await pool.query<DbTransaction>(
    'SELECT id, type, description, amount, created_at FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200',
    [userId],
  );
  return rows;
};

export const insertTransaction = async (
  userId: string,
  type: string,
  description: string,
  amount: string,
  client: Queryable = pool,
): Promise<void> => {
  await client.query(
    'INSERT INTO transactions (user_id, type, description, amount) VALUES ($1,$2,$3,$4)',
    [userId, type, description, amount],
  );
};

// ─── GTT Orders ───────────────────────────────────────────────────────────────

export const getGttOrders = async (userId: string): Promise<DbGttOrder[]> => {
  const { rows } = await pool.query<DbGttOrder>(
    `SELECT id, symbol, exchange, transaction_type, trigger_type, quantity, status,
            trigger_price, limit_price, stoploss_trigger_price, stoploss_limit_price,
            target_trigger_price, target_limit_price, created_at, expires_at
     FROM gtt_orders WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return rows;
};

export const insertGttOrder = async (userId: string, gtt: Omit<DbGttOrder, 'id' | 'created_at' | 'expires_at' | 'status'>): Promise<DbGttOrder> => {
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  const { rows } = await pool.query<DbGttOrder>(
    `INSERT INTO gtt_orders (user_id, symbol, exchange, transaction_type, trigger_type, quantity,
      trigger_price, limit_price, stoploss_trigger_price, stoploss_limit_price, target_trigger_price, target_limit_price, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [
      userId, gtt.symbol, gtt.exchange ?? null, gtt.transaction_type, gtt.trigger_type, gtt.quantity,
      gtt.trigger_price ?? null, gtt.limit_price ?? null,
      gtt.stoploss_trigger_price ?? null, gtt.stoploss_limit_price ?? null,
      gtt.target_trigger_price ?? null, gtt.target_limit_price ?? null,
      expiresAt,
    ],
  );
  return rows[0];
};

export const deleteGttOrder = async (userId: string, gttId: string): Promise<boolean> => {
  const { rowCount } = await pool.query(
    'DELETE FROM gtt_orders WHERE id = $1 AND user_id = $2',
    [gttId, userId],
  );
  return (rowCount ?? 0) > 0;
};

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const getAlerts = async (userId: string): Promise<DbAlert[]> => {
  const { rows } = await pool.query<DbAlert>(
    `SELECT id, symbol, exchange, property, operator, value, type, status, created_at, expires_at
     FROM alerts WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return rows;
};

export const insertAlert = async (userId: string, alert: Omit<DbAlert, 'id' | 'created_at' | 'expires_at' | 'status'>): Promise<DbAlert> => {
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  const { rows } = await pool.query<DbAlert>(
    `INSERT INTO alerts (user_id, symbol, exchange, property, operator, value, type, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [userId, alert.symbol, alert.exchange ?? null, alert.property, alert.operator, alert.value, alert.type, expiresAt],
  );
  return rows[0];
};

export const deleteAlert = async (userId: string, alertId: string): Promise<boolean> => {
  const { rowCount } = await pool.query(
    'DELETE FROM alerts WHERE id = $1 AND user_id = $2',
    [alertId, userId],
  );
  return (rowCount ?? 0) > 0;
};

// ─── Daily Bonus ──────────────────────────────────────────────────────────────

export const claimDailyBonus = async (userId: string): Promise<{ success: boolean }> => {
  const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query<{ daily_bonus_claimed: boolean; daily_bonus_date: string | null }>(
      'SELECT daily_bonus_claimed, daily_bonus_date FROM portfolio_balances WHERE user_id = $1 FOR UPDATE',
      [userId],
    );

    const bal = rows[0];
    if (bal.daily_bonus_claimed && bal.daily_bonus_date === todayIST) {
      await client.query('ROLLBACK');
      return { success: false };
    }

    const BONUS = 10;
    await client.query(
      `UPDATE portfolio_balances
       SET nxo_balance = nxo_balance + $1, daily_bonus_claimed = TRUE, daily_bonus_date = $2, updated_at = NOW()
       WHERE user_id = $3`,
      [BONUS, todayIST, userId],
    );
    await client.query(
      'INSERT INTO transactions (user_id, type, description, amount) VALUES ($1, $2, $3, $4)',
      [userId, 'REWARD_NXO', 'Daily Login Bonus', `+ ${BONUS} NXO`],
    );

    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ─── Full Portfolio Snapshot ──────────────────────────────────────────────────

export const getFullPortfolio = async (userId: string) => {
  const [balances, positions, orders, transactions, gttOrders, alerts] = await Promise.all([
    getBalances(userId),
    getPositions(userId),
    getOrders(userId),
    getTransactions(userId),
    getGttOrders(userId),
    getAlerts(userId),
  ]);

  const totalInvested = positions.reduce((sum, p) => sum + p.quantity * p.avg_price, 0);

  return { balances, positions, orders, transactions, gttOrders, alerts, totalInvested };
};
