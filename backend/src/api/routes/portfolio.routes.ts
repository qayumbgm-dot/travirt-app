import { FastifyInstance } from 'fastify';
import * as ctrl from '../controllers/portfolio.controller';

export const portfolioRoutes = async (fastify: FastifyInstance) => {
  const auth = { preHandler: [fastify.authenticate] };
  const authRateLimited = (max: number, timeWindow: string) => ({
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max, timeWindow } },
  });

  fastify.get('/', auth, ctrl.getPortfolio);
  fastify.get('/balances', auth, ctrl.getBalances);
  fastify.get('/positions', auth, ctrl.getPositions);
  fastify.get('/orders', auth, ctrl.getOrders);
  fastify.get('/transactions', auth, ctrl.getTransactions);

  fastify.get('/gtt', auth, ctrl.getGttOrders);
  fastify.post('/gtt', auth, ctrl.createGttOrder);
  fastify.delete('/gtt/:id', auth, ctrl.deleteGttOrder);

  fastify.get('/alerts', auth, ctrl.getAlerts);
  fastify.post('/alerts', auth, ctrl.createAlert);
  fastify.delete('/alerts/:id', auth, ctrl.deleteAlert);

  fastify.post('/daily-bonus', auth, ctrl.claimDailyBonus);

  fastify.get('/export', authRateLimited(10, '1 hour'), ctrl.exportPortfolioData);
};
