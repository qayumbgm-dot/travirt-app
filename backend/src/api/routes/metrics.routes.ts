import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { toPrometheusText } from '../../services/metrics.service';

const requireAdmin = async (req: FastifyRequest, reply: FastifyReply) => {
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return reply.code(403).send({ error: 'Forbidden' });
  }
};

// Registered at root level (not under /api) so Prometheus can scrape
// the backend directly at http://host:3001/metrics without Nginx proxying.
export const metricsRoutes = async (fastify: FastifyInstance) => {
  fastify.get(
    '/metrics',
    { preHandler: [fastify.authenticate, requireAdmin] },
    async (_req, reply) => {
      reply.header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      return reply.send(toPrometheusText());
    },
  );
};
