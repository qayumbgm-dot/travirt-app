import { FastifyInstance } from 'fastify';
import { placeOrder, listPendingOrders, cancelPendingOrderHandler } from '../controllers/trade.controller';

export const tradeRoutes = async (fastify: FastifyInstance) => {
  fastify.post('/orders',           { preHandler: [fastify.authenticate] }, placeOrder);
  fastify.get('/orders/pending',    { preHandler: [fastify.authenticate] }, listPendingOrders);
  fastify.delete('/orders/pending/:id', { preHandler: [fastify.authenticate] }, cancelPendingOrderHandler);
};
