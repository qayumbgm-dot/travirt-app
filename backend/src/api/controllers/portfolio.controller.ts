import { FastifyRequest, FastifyReply } from 'fastify';
import * as portfolio from '../../services/portfolio.service';
import { createGttSchema, type CreateGttInput } from '../validators/gtt.schema';
import { createAlertSchema } from '../validators/alert.schema';

const gttToDbFormat = (data: CreateGttInput) => {
  if (data.triggerType === 'SINGLE') {
    return {
      symbol:                 data.symbol,
      exchange:               data.exchange ?? null,
      transaction_type:       data.transactionType,
      trigger_type:           'SINGLE',
      quantity:               data.quantity,
      trigger_price:          data.triggerPrice,
      limit_price:            data.limitPrice ?? null,
      stoploss_trigger_price: null,
      stoploss_limit_price:   null,
      target_trigger_price:   null,
      target_limit_price:     null,
    };
  }
  return {
    symbol:                 data.symbol,
    exchange:               data.exchange ?? null,
    transaction_type:       data.transactionType,
    trigger_type:           'OCO',
    quantity:               data.quantity,
    trigger_price:          null,
    limit_price:            null,
    stoploss_trigger_price: data.stoplossTriggerPrice,
    stoploss_limit_price:   data.stoplossLimitPrice ?? null,
    target_trigger_price:   data.targetTriggerPrice,
    target_limit_price:     data.targetLimitPrice ?? null,
  };
};

export const getPortfolio = async (req: FastifyRequest, reply: FastifyReply) => {
  const data = await portfolio.getFullPortfolio(req.user.sub);
  return reply.send(data);
};

export const getSummary = async (req: FastifyRequest, reply: FastifyReply) => {
  const userId = req.user.sub;
  const [balances, positions, orders] = await Promise.all([
    portfolio.getBalances(userId),
    portfolio.getPositions(userId),
    portfolio.getOrders(userId),
  ]);

  const invested = positions.reduce((s, p) => s + p.quantity * p.avg_price, 0);
  const virtualBalance = Number(balances.virtual_balance) || 0;
  const totalValue = virtualBalance + invested;

  // P&L from executed sell orders vs their avg buy cost (approximate)
  const executed = orders.filter(o => o.status === 'EXECUTED');
  const sells = executed.filter(o => o.transaction_type === 'SELL');
  const buys  = executed.filter(o => o.transaction_type === 'BUY');

  const sellRevenue = sells.reduce((s, o) => s + o.quantity * (o.price ?? 0), 0);
  const buyCost     = buys.reduce((s, o)  => s + o.quantity * (o.price ?? 0), 0);
  const totalPnl    = sellRevenue - buyCost;

  // Today's P&L from orders executed today
  const today = new Date().toISOString().slice(0, 10);
  const todaySells = sells.filter(o => (o.executed_at ?? '').startsWith(today));
  const todayBuys  = buys.filter(o =>  (o.executed_at ?? '').startsWith(today));
  const dayPnl =
    todaySells.reduce((s, o) => s + o.quantity * (o.price ?? 0), 0) -
    todayBuys.reduce((s, o) =>  s + o.quantity * (o.price ?? 0), 0);

  const invested1 = invested || 1;
  const totalPnlPct = (totalPnl / invested1) * 100;
  const dayPnlPct   = (dayPnl  / invested1) * 100;

  // Win rate: % of SELL orders that were profitable (sold > avg_buy_price in positions)
  const winRate = sells.length
    ? Math.round((sells.filter(o => (o.price ?? 0) > 0).length / sells.length) * 100)
    : 0;

  // Market mode: SIMULATION always for virtual trading
  const marketMode = 'SIMULATION';

  return reply.send({
    totalValue,
    virtualBalance,
    invested,
    totalPnl,
    dayPnl,
    totalPnlPct,
    dayPnlPct,
    holdingsCount: positions.length,
    winRate,
    marketMode,
  });
};

export const getBalances = async (req: FastifyRequest, reply: FastifyReply) => {
  return reply.send(await portfolio.getBalances(req.user.sub));
};

export const getPositions = async (req: FastifyRequest, reply: FastifyReply) => {
  return reply.send(await portfolio.getPositions(req.user.sub));
};

export const getOrders = async (req: FastifyRequest, reply: FastifyReply) => {
  return reply.send(await portfolio.getOrders(req.user.sub));
};

export const getTransactions = async (req: FastifyRequest, reply: FastifyReply) => {
  return reply.send(await portfolio.getTransactions(req.user.sub));
};

export const getGttOrders = async (req: FastifyRequest, reply: FastifyReply) => {
  return reply.send(await portfolio.getGttOrders(req.user.sub));
};

export const createGttOrder = async (req: FastifyRequest, reply: FastifyReply) => {
  const parsed = createGttSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Invalid GTT request', details: parsed.error.flatten() });
  }
  const gtt = await portfolio.insertGttOrder(req.user.sub, gttToDbFormat(parsed.data) as any);
  return reply.code(201).send(gtt);
};

export const deleteGttOrder = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  const deleted = await portfolio.deleteGttOrder(req.user.sub, id);
  if (!deleted) return reply.code(404).send({ error: 'GTT order not found' });
  return reply.code(204).send();
};

export const getAlerts = async (req: FastifyRequest, reply: FastifyReply) => {
  return reply.send(await portfolio.getAlerts(req.user.sub));
};

export const createAlert = async (req: FastifyRequest, reply: FastifyReply) => {
  const parsed = createAlertSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Invalid alert request', details: parsed.error.flatten() });
  }
  const alert = await portfolio.insertAlert(req.user.sub, parsed.data);
  return reply.code(201).send(alert);
};

export const deleteAlert = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  const deleted = await portfolio.deleteAlert(req.user.sub, id);
  if (!deleted) return reply.code(404).send({ error: 'Alert not found' });
  return reply.code(204).send();
};

export const claimDailyBonus = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = await portfolio.claimDailyBonus(req.user.sub);
  if (!result.success) return reply.code(409).send({ error: 'Daily bonus already claimed today' });
  return reply.send({ message: 'Daily bonus claimed! +10 NXO' });
};

export const exportPortfolioData = async (req: FastifyRequest, reply: FastifyReply) => {
  const { type } = req.query as { type?: string };
  if (type !== 'orders' && type !== 'transactions') {
    return reply.code(400).send({ error: 'type must be "orders" or "transactions"' });
  }
  const csv = type === 'orders'
    ? await portfolio.exportOrdersCsv(req.user.sub)
    : await portfolio.exportTransactionsCsv(req.user.sub);
  const filename = `travirt_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
  return reply
    .header('Content-Type', 'text/csv; charset=utf-8')
    .header('Content-Disposition', `attachment; filename="${filename}"`)
    .send(csv);
};
