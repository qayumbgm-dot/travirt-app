import { FastifyInstance, FastifyRequest } from 'fastify';
import { getSettings, saveSettings } from '../../services/settings.service';

export const settingsRoutes = async (fastify: FastifyInstance) => {
  const auth = { preHandler: [fastify.authenticate] };

  fastify.get('/', auth, async (req: FastifyRequest, reply) => {
    const settings = await getSettings(req.user.sub);
    return reply.send(settings);
  });

  fastify.put('/', auth, async (req: FastifyRequest, reply) => {
    if (!req.body || typeof req.body !== 'object') {
      return reply.code(400).send({ error: 'settings object required' });
    }
    await saveSettings(req.user.sub, req.body as Record<string, unknown>);
    return reply.code(204).send();
  });
};
