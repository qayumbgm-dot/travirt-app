import { pool } from '../database/pool';
import { marketService, MarketTick } from '../services/market.service';
import { executeTrade } from '../services/trade.service';

interface DbPendingOrder {
  id: string;
  user_id: string;
  symbol: string;
  exchange: string;
  transaction_type: string;
  order_type: string;
  quantity: number;
  limit_price: number;
  trigger_price: number | null;
}

let pending:      DbPendingOrder[] = [];
let lastRefresh   = 0;
let isRefreshing  = false;
const REFRESH_INTERVAL = 30_000;

const refreshPending = async (): Promise<void> => {
  if (isRefreshing) return;
  isRefreshing = true;
  try {
    const { rows } = await pool.query<DbPendingOrder>(
      "SELECT id, user_id, symbol, exchange, transaction_type, order_type, quantity, limit_price, trigger_price FROM pending_orders WHERE status = 'PENDING' AND expires_at > NOW()",
    );
    pending     = rows;
    lastRefresh = Date.now();
  } finally {
    isRefreshing = false;
  }
};

const markFilled = async (id: string): Promise<void> => {
  await pool.query("UPDATE pending_orders SET status = 'FILLED' WHERE id = $1", [id]);
  pending = pending.filter((p) => p.id !== id);
};

const markFailed = async (id: string): Promise<void> => {
  await pool.query("UPDATE pending_orders SET status = 'EXPIRED' WHERE id = $1", [id]);
  pending = pending.filter((p) => p.id !== id);
};

const expireStale = async (): Promise<void> => {
  await pool.query(
    "UPDATE pending_orders SET status = 'EXPIRED' WHERE status = 'PENDING' AND expires_at <= NOW()",
  );
};

const isFillable = (order: DbPendingOrder, ltp: number): boolean => {
  const { order_type, transaction_type, limit_price, trigger_price } = order;

  if (order_type === 'LMT') {
    return transaction_type === 'BUY' ? ltp <= limit_price : ltp >= limit_price;
  }
  if (order_type === 'SL' || order_type === 'SLM') {
    const trigger = trigger_price ?? limit_price;
    return transaction_type === 'BUY' ? ltp >= trigger : ltp <= trigger;
  }
  return false;
};

const fillOrder = async (order: DbPendingOrder, ltp: number): Promise<void> => {
  const fillPrice = order.order_type === 'SLM' ? ltp : order.limit_price;
  try {
    await executeTrade(order.user_id, {
      symbol:          order.symbol,
      exchange:        order.exchange,
      quantity:        order.quantity,
      price:           fillPrice,
      orderType:       'MARKET',
      transactionType: order.transaction_type as 'BUY' | 'SELL',
    });
    await markFilled(order.id);
    console.log(`[limit-worker] filled ${order.order_type} ${order.transaction_type} ${order.quantity}×${order.symbol} @ ${fillPrice}`);
  } catch (err) {
    console.error(`[limit-worker] failed to fill order ${order.id}:`, err);
    await markFailed(order.id);
  }
};

export const startLimitOrderWorker = (): void => {
  refreshPending().catch(console.error);

  marketService.on('tick', async (tick: MarketTick) => {
    if (Date.now() - lastRefresh > REFRESH_INTERVAL) {
      await refreshPending().catch(console.error);
    }
    const matching = pending.filter(
      (p) => p.symbol === tick.symbol && p.exchange === tick.exchange,
    );
    for (const order of matching) {
      if (isFillable(order, tick.ltp)) {
        await fillOrder(order, tick.ltp).catch(console.error);
      }
    }
  });

  setInterval(async () => {
    await expireStale().catch(console.error);
    await refreshPending().catch(console.error);
  }, REFRESH_INTERVAL);

  console.log('[limit-order-worker] started');
};
