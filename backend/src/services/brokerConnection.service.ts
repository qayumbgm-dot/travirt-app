import { pool } from '../database/pool';
import { encryptApiKey, decryptApiKey, placeAliceOrder, AliceOrderRequest } from '../integrations/aliceBlue';
import type { TradeRequest } from './trade.service';

interface BrokerConnection {
  id:             string;
  user_id:        string;
  broker:         string;
  broker_user_id: string;
  is_active:      boolean;
  connected_at:   string;
  last_used_at:   string | null;
}

interface BrokerConnectionRow extends BrokerConnection {
  encrypted_api_key: string;
}

export const connectBroker = async (
  userId:        string,
  brokerUserId:  string,
  rawApiKey:     string,
): Promise<BrokerConnection> => {
  const encrypted = encryptApiKey(rawApiKey);

  // Verify credentials work before storing by placing a test connection
  // (Alice Blue doesn't have a dedicated ping endpoint — we skip live verification
  //  here and catch failures at order time)

  const { rows } = await pool.query<BrokerConnection>(
    `INSERT INTO broker_connections (user_id, broker_user_id, encrypted_api_key)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, broker)
     DO UPDATE SET
       broker_user_id    = EXCLUDED.broker_user_id,
       encrypted_api_key = EXCLUDED.encrypted_api_key,
       is_active         = TRUE,
       connected_at      = NOW()
     RETURNING id, user_id, broker, broker_user_id, is_active, connected_at, last_used_at`,
    [userId, brokerUserId, encrypted],
  );
  return rows[0];
};

export const disconnectBroker = async (userId: string): Promise<boolean> => {
  const { rowCount } = await pool.query(
    `UPDATE broker_connections SET is_active = FALSE
     WHERE user_id = $1 AND broker = 'aliceblue' AND is_active = TRUE`,
    [userId],
  );
  return (rowCount ?? 0) > 0;
};

export const getBrokerConnection = async (userId: string): Promise<BrokerConnection | null> => {
  const { rows } = await pool.query<BrokerConnection>(
    `SELECT id, user_id, broker, broker_user_id, is_active, connected_at, last_used_at
     FROM broker_connections
     WHERE user_id = $1 AND is_active = TRUE
     LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
};

/**
 * Routes a virtual trade to the real broker after the virtual leg has committed.
 * Always fire-and-forget — a broker failure must never affect the virtual portfolio.
 */
export const routeToBroker = async (
  userId: string,
  trade:  TradeRequest,
): Promise<void> => {
  const { rows } = await pool.query<BrokerConnectionRow>(
    `SELECT broker_user_id, encrypted_api_key
     FROM broker_connections
     WHERE user_id = $1 AND is_active = TRUE AND broker = 'aliceblue'
     LIMIT 1`,
    [userId],
  );
  if (!rows[0]) return; // no active broker connection

  const { broker_user_id, encrypted_api_key } = rows[0];
  let apiKey: string;
  try {
    apiKey = decryptApiKey(encrypted_api_key);
  } catch {
    console.error('[broker] Failed to decrypt API key for user', userId);
    return;
  }

  const req: AliceOrderRequest = {
    brokerUserId:    broker_user_id,
    bearerToken:     apiKey,
    symbol:          trade.symbol,
    exchange:        trade.exchange,
    transactionType: trade.transactionType,
    orderType:       trade.orderType,
    quantity:        trade.quantity,
    price:           trade.price,
    triggerPrice:    trade.triggerPrice,
    productType:     trade.variety === 'CNC' ? 'CNC' : 'MIS',
  };

  const result = await placeAliceOrder(req);

  if (result.success) {
    console.log(`[broker] Live order placed for user ${userId}: brokerOrderId=${result.brokerOrderId}`);
    // Track last usage
    pool.query(
      'UPDATE broker_connections SET last_used_at = NOW() WHERE user_id = $1',
      [userId],
    ).catch(() => {});
  } else {
    console.warn(`[broker] Live order FAILED for user ${userId}: ${result.error}`);
  }
};
