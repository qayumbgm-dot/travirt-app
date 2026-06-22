import { pool } from '../database/pool';
import { insertOrder, insertTransaction, getPosition } from './portfolio.service';
import { awardReferrerBonus } from './referral.service';
import { marketService } from './market.service';
import { findUserById } from './user.service';
import { sendTradeConfirmationEmail } from './email.service';
import { routeToBroker } from './brokerConnection.service';

export interface PendingOrderRecord {
  id: string;
  user_id: string;
  symbol: string;
  exchange: string;
  transaction_type: string;
  order_type: string;
  quantity: number;
  limit_price: number;
  trigger_price: number | null;
  status: string;
  created_at: string;
  expires_at: string;
}

const dbOrderType = (t: string): string => (t === 'LIMIT' ? 'LMT' : t);

const storePendingOrder = async (
  userId: string,
  trade: TradeRequest,
): Promise<PendingOrderRecord> => {
  const { rows } = await pool.query<PendingOrderRecord>(
    `INSERT INTO pending_orders
       (user_id, symbol, exchange, transaction_type, order_type, quantity, limit_price, trigger_price)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      userId,
      trade.symbol,
      trade.exchange,
      trade.transactionType,
      dbOrderType(trade.orderType),
      trade.quantity,
      trade.price,
      trade.triggerPrice ?? null,
    ],
  );
  return rows[0];
};

export const getPendingOrders = async (userId: string): Promise<PendingOrderRecord[]> => {
  const { rows } = await pool.query<PendingOrderRecord>(
    "SELECT * FROM pending_orders WHERE user_id = $1 AND status = 'PENDING' AND expires_at > NOW() ORDER BY created_at DESC",
    [userId],
  );
  return rows;
};

export const cancelPendingOrder = async (userId: string, id: string): Promise<boolean> => {
  const { rowCount } = await pool.query(
    "UPDATE pending_orders SET status = 'CANCELLED' WHERE id = $1 AND user_id = $2 AND status = 'PENDING'",
    [id, userId],
  );
  return (rowCount ?? 0) > 0;
};

const isImmediatelyFillable = (trade: TradeRequest, ltp: number): boolean => {
  const { orderType, transactionType, price, triggerPrice } = trade;
  if (orderType === 'LIMIT') {
    return transactionType === 'BUY' ? ltp <= price : ltp >= price;
  }
  if (orderType === 'SL' || orderType === 'SLM') {
    const trigger = triggerPrice ?? price;
    return transactionType === 'BUY' ? ltp >= trigger : ltp <= trigger;
  }
  return true; // MARKET always immediate
};

export type TradeOutcome =
  | { pending: false; order: TradeResult['order']; newBalance: number }
  | { pending: true; order: PendingOrderRecord; newBalance: number };

export const queueOrExecuteTrade = async (
  userId: string,
  trade: TradeRequest,
): Promise<TradeOutcome> => {
  if (trade.orderType === 'MARKET') {
    const result = await executeTrade(userId, trade);
    return { pending: false, ...result };
  }

  const priceMap = marketService.getPriceMap();
  const ltp = priceMap.get(`${trade.exchange}:${trade.symbol}`);

  if (ltp !== undefined && isImmediatelyFillable(trade, ltp)) {
    const fillPrice = (trade.orderType === 'SLM') ? ltp : trade.price;
    const result = await executeTrade(userId, { ...trade, price: fillPrice, orderType: 'MARKET' });
    return { pending: false, ...result };
  }

  // Price condition not yet met — queue as pending
  const pending = await storePendingOrder(userId, trade);
  const { rows } = await pool.query<{ virtual_balance: number }>(
    'SELECT virtual_balance FROM portfolio_balances WHERE user_id = $1',
    [userId],
  );
  return { pending: true, order: pending, newBalance: Number(rows[0]?.virtual_balance ?? 0) };
};

export interface TradeRequest {
  symbol: string;
  exchange: string;
  quantity: number;
  price: number;
  orderType: 'MARKET' | 'LIMIT' | 'SL' | 'SLM';
  transactionType: 'BUY' | 'SELL';
  variety?: string;
  validity?: string;
  stopLoss?: number;
  takeProfit?: number;
  triggerPrice?: number;
}

export interface TradeResult {
  order: {
    id: string;
    symbol: string;
    exchange: string;
    quantity: number;
    price: number | null;
    order_type: string;
    transaction_type: string;
    status: string;
    executed_at: string;
  };
  newBalance: number;
}

const BUY_CHARGE_RATE = 0.0003;  // 0.03% brokerage simulation
const SELL_CHARGE_RATE = 0.0003;

export const executeTrade = async (userId: string, trade: TradeRequest): Promise<TradeResult> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: balRows } = await client.query<{ virtual_balance: number }>(
      'SELECT virtual_balance FROM portfolio_balances WHERE user_id = $1 FOR UPDATE',
      [userId],
    );
    if (!balRows[0]) throw Object.assign(new Error('Portfolio not found'), { statusCode: 404 });

    const currentBalance = Number(balRows[0].virtual_balance);
    const tradeValue = trade.quantity * trade.price;

    if (trade.transactionType === 'BUY') {
      const charges = tradeValue * BUY_CHARGE_RATE;
      const totalCost = tradeValue + charges;

      if (currentBalance < totalCost) {
        throw Object.assign(
          new Error(`Insufficient funds. Required ₹${totalCost.toFixed(2)}, available ₹${currentBalance.toFixed(2)}`),
          { statusCode: 400 },
        );
      }

      // Deduct balance
      await client.query(
        'UPDATE portfolio_balances SET virtual_balance = virtual_balance - $1, updated_at = NOW() WHERE user_id = $2',
        [totalCost, userId],
      );

      // Upsert position (weighted average price)
      const existing = await getPosition(userId, trade.symbol, trade.exchange, client);
      if (existing) {
        const newQty = existing.quantity + trade.quantity;
        const newAvgPrice = (existing.quantity * existing.avg_price + trade.quantity * trade.price) / newQty;
        await client.query(
          'UPDATE positions SET quantity = $1, avg_price = $2 WHERE user_id = $3 AND symbol = $4 AND exchange = $5',
          [newQty, newAvgPrice, userId, trade.symbol, trade.exchange],
        );
      } else {
        await client.query(
          'INSERT INTO positions (user_id, symbol, exchange, quantity, avg_price) VALUES ($1,$2,$3,$4,$5)',
          [userId, trade.symbol, trade.exchange, trade.quantity, trade.price],
        );
      }

      await insertTransaction(
        userId,
        'TRADE_BUY',
        `Bought ${trade.quantity} × ${trade.symbol} @ ₹${trade.price}`,
        `- ₹${totalCost.toFixed(2)}`,
        client,
      );

      const order = await insertOrder(userId, {
        symbol: trade.symbol,
        exchange: trade.exchange,
        quantity: trade.quantity,
        price: trade.price,
        order_type: trade.orderType,
        transaction_type: 'BUY',
        variety: trade.variety ?? null,
        status: 'COMPLETE',
        validity: trade.validity ?? null,
        stop_loss: trade.stopLoss ?? null,
        take_profit: trade.takeProfit ?? null,
        trigger_price: trade.triggerPrice ?? null,
      }, client);

      await client.query('COMMIT');
      awardReferrerBonus(userId).catch(() => {});
      routeToBroker(userId, trade).catch(() => {});
      const { rows: newBalRows } = await pool.query<{ virtual_balance: number }>(
        'SELECT virtual_balance FROM portfolio_balances WHERE user_id = $1',
        [userId],
      );
      const newBalance = Number(newBalRows[0]?.virtual_balance ?? 0);
      findUserById(userId).then((u) => {
        if (u) sendTradeConfirmationEmail(u.email, { symbol: trade.symbol, exchange: trade.exchange, quantity: trade.quantity, price: trade.price, type: 'BUY', newBalance }).catch(() => {});
      }).catch(() => {});
      return { order, newBalance };

    } else {
      // SELL — check position
      const existing = await getPosition(userId, trade.symbol, trade.exchange, client);
      if (!existing || existing.quantity < trade.quantity) {
        throw Object.assign(
          new Error(`Insufficient shares. Holding ${existing?.quantity ?? 0}, selling ${trade.quantity}`),
          { statusCode: 400 },
        );
      }

      const charges = tradeValue * SELL_CHARGE_RATE;
      const proceeds = tradeValue - charges;

      // Reduce / remove position
      const remainingQty = existing.quantity - trade.quantity;
      if (remainingQty === 0) {
        await client.query(
          'DELETE FROM positions WHERE user_id = $1 AND symbol = $2 AND exchange = $3',
          [userId, trade.symbol, trade.exchange],
        );
      } else {
        await client.query(
          'UPDATE positions SET quantity = $1 WHERE user_id = $2 AND symbol = $3 AND exchange = $4',
          [remainingQty, userId, trade.symbol, trade.exchange],
        );
      }

      // Add proceeds to balance
      await client.query(
        'UPDATE portfolio_balances SET virtual_balance = virtual_balance + $1, updated_at = NOW() WHERE user_id = $2',
        [proceeds, userId],
      );

      const pnlPerShare = trade.price - existing.avg_price;
      const pnl = pnlPerShare * trade.quantity;
      const pnlStr = pnl >= 0 ? `+₹${pnl.toFixed(2)}` : `-₹${Math.abs(pnl).toFixed(2)}`;

      await insertTransaction(
        userId,
        'TRADE_SELL',
        `Sold ${trade.quantity} × ${trade.symbol} @ ₹${trade.price} (P&L: ${pnlStr})`,
        `+ ₹${proceeds.toFixed(2)}`,
        client,
      );

      const order = await insertOrder(userId, {
        symbol: trade.symbol,
        exchange: trade.exchange,
        quantity: trade.quantity,
        price: trade.price,
        order_type: trade.orderType,
        transaction_type: 'SELL',
        variety: trade.variety ?? null,
        status: 'COMPLETE',
        validity: trade.validity ?? null,
        stop_loss: trade.stopLoss ?? null,
        take_profit: trade.takeProfit ?? null,
        trigger_price: trade.triggerPrice ?? null,
      }, client);

      await client.query('COMMIT');
      awardReferrerBonus(userId).catch(() => {});
      routeToBroker(userId, trade).catch(() => {});
      const { rows: newBalRows } = await pool.query<{ virtual_balance: number }>(
        'SELECT virtual_balance FROM portfolio_balances WHERE user_id = $1',
        [userId],
      );
      const newBalance = Number(newBalRows[0]?.virtual_balance ?? 0);
      findUserById(userId).then((u) => {
        if (u) sendTradeConfirmationEmail(u.email, { symbol: trade.symbol, exchange: trade.exchange, quantity: trade.quantity, price: trade.price, type: 'SELL', newBalance }).catch(() => {});
      }).catch(() => {});
      return { order, newBalance };
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
