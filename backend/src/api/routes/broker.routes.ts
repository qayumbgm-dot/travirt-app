import { FastifyInstance } from 'fastify';
import { getStatus, connect, disconnect, aliceCallback } from '../controllers/broker.controller';

export const brokerRoutes = async (fastify: FastifyInstance) => {
  const auth = { preHandler: [fastify.authenticate] };

  // GET  /api/broker/status  — is a broker account connected?
  fastify.get('/status', auth, getStatus);

  // POST /api/broker/connect  — link Alice Blue credentials (rate-limited: 10/hr)
  fastify.post('/connect', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
  }, connect);

  // DELETE /api/broker/connect  — unlink broker account
  fastify.delete('/connect', auth, disconnect);

  // POST /api/broker/alice-callback  — exchange Alice Blue ANT OAuth authCode → live feed
  fastify.post('/alice-callback', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
  }, aliceCallback);
};
