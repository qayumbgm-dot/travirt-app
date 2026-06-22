import fp from 'fastify-plugin';
import type { FastifyPluginCallback, FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken, type AccessTokenPayload } from '../../auth/jwt';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user: AccessTokenPayload;
  }
}

const plugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.decorate(
    'authenticate',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.code(401).send({ error: 'Missing or invalid Authorization header' });
      }
      const token = authHeader.slice(7);
      try {
        req.user = verifyAccessToken(token);
      } catch {
        return reply.code(401).send({ error: 'Access token expired or invalid' });
      }
    },
  );
  done();
};

export default fp(plugin, { name: 'authenticate' });
