import { pool } from '../database/pool';
import { marketService, MarketTick } from '../services/market.service';
import { executeTrade } from '../services/trade.service';

interface DbActiveGtt {
  id: string;
  user_id: string;
  symbol: string;
  exchange: string | null;
  transaction_type: string;
  trigger_type: string;
  quantity: number;
  trigger_price: number | null;
  limit_price: number | null;
  stoploss_trigger_price: number | null;
  stoploss_limit_price: number | null;
  target_trigger_price: number | null;
  target_limit_price: number | null;
}

let activeGtts:   DbActiveGtt[] = [];
let lastGttRefresh = 0;
let isRefreshing   = false;
const GTT_REFRESH_INTERVAL = 60_000;

const refreshGtts = async (): Promise<void> => {
  if (isRefreshing) return;
  isRefreshing = true;
  try {
    const { rows } = await pool.query<DbActiveGtt>(
      "SELECT id, user_id, symbol, exchange, transaction_type, trigger_type, quantity, trigger_price, limit_price, stoploss_trigger_price, stoploss_limit_price, target_trigger_price, target_limit_price FROM gtt_orders WHERE status = 'ACTIVE' AND expires_at > NOW()",
    );
    activeGtts     = rows;
    lastGttRefresh = Date.now();
  } finally {
    isRefreshing = false;
  }
};

const markTriggered = async (gttId: string): Promise<void> => {
  await pool.query("UPDATE gtt_orders SET status = 'TRIGGERED' WHERE id = $1", [gttId]);
  activeGtts = activeGtts.filter((g) => g.id !== gttId);
};

const markFailed = async (gttId: string): Promise<void> => {
  await pool.query("UPDATE gtt_orders SET status = 'FAILED' WHERE id = $1", [gttId]);
  activeGtts = activeGtts.filter((g) => g.id !== gttId);
};

const checkGtt = async (gtt: DbActiveGtt, ltp: number): Promise<void> => {
  const price = gtt.limit_price ?? ltp;

  if (gtt.trigger_type === 'SINGLE') {
    if (!gtt.trigger_price) return;
    const triggered =
      gtt.transaction_type === 'BUY' ? ltp <= gtt.trigger_price : ltp >= gtt.trigger_price;
    if (!triggered) return;

    try {
      await executeTrade(gtt.user_id, {
        symbol: gtt.symbol, exchange: gtt.exchange ?? 'NSE',
        quantity: gtt.quantity, price, orderType: 'LIMIT',
        transactionType: gtt.transaction_type as 'BUY' | 'SELL',
      });
      await markTriggered(gtt.id);
    } catch (err) {
      console.error(`[gtt] Failed to execute GTT ${gtt.id}:`, err);
      await markFailed(gtt.id);
    }
    return;
  }

  if (gtt.trigger_type === 'OCO') {
    const slTriggered = gtt.stoploss_trigger_price != null && ltp <= gtt.stoploss_trigger_price;
    const tpTriggered = gtt.target_trigger_price  != null && ltp >= gtt.target_trigger_price;
    if (!slTriggered && !tpTriggered) return;

    const execPrice = slTriggered
      ? (gtt.stoploss_limit_price ?? ltp)
      : (gtt.target_limit_price   ?? ltp);

    try {
      await executeTrade(gtt.user_id, {
        symbol: gtt.symbol, exchange: gtt.exchange ?? 'NSE',
        quantity: gtt.quantity, price: execPrice,
        orderType: 'LIMIT', transactionType: 'SELL',
      });
      await markTriggered(gtt.id);
    } catch (err) {
      console.error(`[gtt] Failed OCO GTT ${gtt.id}:`, err);
      await markFailed(gtt.id);
    }
  }
};

export const startGttWorker = (): void => {
  refreshGtts().catch(console.error);

  marketService.on('tick', async (tick: MarketTick) => {
    if (Date.now() - lastGttRefresh > GTT_REFRESH_INTERVAL) {
      await refreshGtts().catch(console.error);
    }
    const matching = activeGtts.filter(
      (g) => g.symbol === tick.symbol && (g.exchange === null || g.exchange === tick.exchange),
    );
    for (const gtt of matching) {
      await checkGtt(gtt, tick.ltp).catch(console.error);
    }
  });

  setInterval(() => refreshGtts().catch(console.error), GTT_REFRESH_INTERVAL);

  console.log('[gtt-worker] started');
};
