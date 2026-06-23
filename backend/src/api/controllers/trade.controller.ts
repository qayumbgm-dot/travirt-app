import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { queueOrExecuteTrade, getPendingOrders, cancelPendingOrder } from '../../services/trade.service';

const tradeSchema = z.object({
  symbol: z.string().min(1).max(50),
  exchange: z.string().min(1).max(10),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
  orderType: z.enum(['MARKET', 'LIMIT', 'SL', 'SLM']),
  transactionType: z.enum(['BUY', 'SELL']),
  variety: z.string().optional(),
  validity: z.string().optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  triggerPrice: z.number().positive().optional(),
});

export const placeOrder = async (req: FastifyRequest, reply: FastifyReply) => {
  const parsed = tradeSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Invalid trade request', details: parsed.error.flatten() });
  }
  const outcome = await queueOrExecuteTrade(req.user.sub, parsed.data);
  // Trade confirmation email is sent inside trade.service (covers controller + worker paths)
  return reply.code(201).send(outcome);
};

export const listPendingOrders = async (req: FastifyRequest, reply: FastifyReply) => {
  const orders = await getPendingOrders(req.user.sub);
  return reply.send(orders);
};

export const cancelPendingOrderHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  const ok = await cancelPendingOrder(req.user.sub, id);
  if (!ok) return reply.code(404).send({ error: 'Pending order not found or already settled' });
  return reply.send({ message: 'Order cancelled' });
};
