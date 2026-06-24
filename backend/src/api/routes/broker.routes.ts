import { FastifyInstance } from 'fastify';
import { getStatus, connect, disconnect, aliceCallback } from '../controllers/broker.controller';
import { env } from '../../config/env';

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

  // GET /api/broker/alice/auth-url — returns the ANT OAuth login URL for the mobile app
  // The app opens this URL in a browser; Alice Blue redirects back with authCode params.
  fastify.get('/alice/auth-url', auth, async (_req, reply) => {
    const appId = env.ALICE_ANT_APP_ID;
    if (!appId) {
      return reply.code(503).send({ error: 'ALICE_ANT_APP_ID not configured on this server' });
    }
    const redirectUrl = encodeURIComponent('travirt://broker/alice/callback');
    const url = `https://a3.aliceblueonline.com/#login?applicationId=${appId}&redirectUrl=${redirectUrl}`;
    return reply.send({ url });
  });

  // POST /api/broker/alice/callback — mobile-friendly alias for /alice-callback
  fastify.post('/alice/callback', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
  }, aliceCallback);
};
