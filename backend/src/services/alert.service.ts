import { pool } from '../database/pool';

export interface DbAlert {
  id: string;
  user_id: string;
  symbol: string;
  exchange: string;
  property: string;
  operator: string;
  value: number;
  type: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export interface CreateAlertPayload {
  symbol: string;
  exchange: string;
  property: 'LTP' | 'CHANGE' | 'CHANGE%' | 'VOLUME' | 'HIGH' | 'LOW';
  operator: '>' | '<' | '>=' | '<=' | '=';
  value: number;
  type?: 'ALERT_ONLY' | 'ATO';
}

export const createAlert = async (userId: string, p: CreateAlertPayload): Promise<DbAlert> => {
  const { rows } = await pool.query<DbAlert>(
    `INSERT INTO alerts (user_id, symbol, exchange, property, operator, value, type)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [userId, p.symbol, p.exchange, p.property, p.operator, p.value, p.type ?? 'ALERT_ONLY'],
  );
  return rows[0];
};

export const listAlerts = async (userId: string): Promise<DbAlert[]> => {
  const { rows } = await pool.query<DbAlert>(
    'SELECT * FROM alerts WHERE user_id = $1 ORDER BY created_at DESC',
    [userId],
  );
  return rows;
};

export const cancelAlert = async (userId: string, id: string): Promise<boolean> => {
  const { rowCount } = await pool.query(
    "UPDATE alerts SET status = 'CANCELLED' WHERE id = $1 AND user_id = $2 AND status = 'ACTIVE'",
    [id, userId],
  );
  return (rowCount ?? 0) > 0;
};
