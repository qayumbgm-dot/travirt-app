import { FastifyInstance } from 'fastify';
import * as ctrl from '../controllers/referral.controller';

export const referralRoutes = async (fastify: FastifyInstance) => {
  const auth = { preHandler: [fastify.authenticate] };

  // Get (or lazily create) the current user's referral code
  fastify.get('/code', auth, ctrl.getMyCode);

  // Get full referral stats — code, uses, NXO earned
  fastify.get('/stats', auth, ctrl.getStats);

  // Apply someone else's referral code — rate-limit to prevent brute-force
  fastify.post('/apply', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 5, timeWindow: '1 hour' } },
  }, ctrl.applyCode);
};
