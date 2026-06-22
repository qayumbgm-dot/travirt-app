import { FastifyInstance } from 'fastify';
import { addInr, buyNxo, convertNxoToVirtual, claimDailyBonus } from '../controllers/funds.controller';

export const fundsRoutes = async (fastify: FastifyInstance) => {
  const auth = { preHandler: [fastify.authenticate] };

  fastify.post('/add-inr',     auth, addInr);
  fastify.post('/buy-nxo',     auth, buyNxo);
  fastify.post('/convert-nxo', auth, convertNxoToVirtual);

  // Rate-limited to once per hour per user (the DB guard is the true lock, but
  // this stops floods from hammering the DB on a client bug)
  fastify.post('/daily-bonus', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 5, timeWindow: '1 hour' } },
  }, claimDailyBonus);
};
