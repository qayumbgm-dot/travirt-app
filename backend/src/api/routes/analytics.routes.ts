import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { incCounter, observeHistogram } from '../../services/metrics.service';

const vitalsSchema = z.object({
  name:   z.enum(['CLS', 'FID', 'LCP', 'FCP', 'TTFB', 'INP']),
  value:  z.number().nonnegative(),
  id:     z.string().max(64),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
});

// Unauthenticated — browser fires sendBeacon after navigation so no auth token.
// Rate limit is inherited from global 120 req/min; additionally capped below.
export const analyticsRoutes = async (fastify: FastifyInstance) => {
  fastify.post(
    '/vitals',
    { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const parsed = vitalsSchema.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: 'Invalid payload' });

      const { name, value, rating } = parsed.data;

      incCounter(`webvital_${name.toLowerCase()}_total`);
      observeHistogram(`webvital_${name.toLowerCase()}_ms`, value);

      if (rating === 'poor') {
        req.log.warn({ metric: name, value, rating }, '[WebVitals] poor score reported');
      }

      return reply.code(204).send();
    },
  );
};
