import type { FastifyInstance } from 'fastify';
import { createGttHandler, listGttsHandler, cancelGttHandler } from '../controllers/gtt.controller';

export const gttRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/', { preHandler: [fastify.authenticate] }, listGttsHandler);

  fastify.post('/', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 20, timeWindow: '1 hour' } },
  }, createGttHandler);

  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, cancelGttHandler);
};
