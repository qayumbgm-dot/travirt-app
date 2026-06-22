import type { FastifyInstance } from 'fastify';
import { createAlertHandler, listAlertsHandler, cancelAlertHandler } from '../controllers/alert.controller';

export const alertRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/', { preHandler: [fastify.authenticate] }, listAlertsHandler);

  fastify.post('/', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 30, timeWindow: '1 hour' } },
  }, createAlertHandler);

  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, cancelAlertHandler);
};
