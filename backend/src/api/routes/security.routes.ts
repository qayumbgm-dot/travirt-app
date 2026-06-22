import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  get2faStatus,
  setup2fa,
  enable2fa,
  disable2fa,
  getRemainingRecoveryCodes,
} from '../../services/security.service';

const enable2faSchema  = z.object({ code: z.string().regex(/^\d{6}$/, 'A 6-digit code is required') });
const disable2faSchema = z.object({ code: z.string().min(1, 'Verification code is required') });

const auth = (fastify: FastifyInstance) => ({ preHandler: [fastify.authenticate] });

export const securityRoutes = async (fastify: FastifyInstance) => {
  // GET /security/2fa/status
  fastify.get('/2fa/status', auth(fastify), async (req: FastifyRequest, reply: FastifyReply) => {
    const status = await get2faStatus(req.user.sub);
    const remaining = status.enabled ? await getRemainingRecoveryCodes(req.user.sub) : 0;
    return reply.send({
      enabled:                status.enabled,
      createdAt:              status.createdAt,
      remainingRecoveryCodes: remaining,
    });
  });

  // POST /security/2fa/setup — generates secret + QR, returns recovery codes once
  fastify.post(
    '/2fa/setup',
    { ...auth(fastify), config: { rateLimit: { max: 5, timeWindow: '10 minutes' } } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const result = await setup2fa(req.user.sub, req.user.userId);
      return reply.send(result);
    },
  );

  // POST /security/2fa/enable — confirm first TOTP code to activate
  fastify.post(
    '/2fa/enable',
    { ...auth(fastify), config: { rateLimit: { max: 10, timeWindow: '5 minutes' } } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const parsed = enable2faSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.errors[0].message });
      }
      const ok = await enable2fa(req.user.sub, parsed.data.code);
      if (!ok) return reply.code(400).send({ error: 'Invalid code or 2FA not yet set up' });
      return reply.send({ enabled: true });
    },
  );

  // POST /security/2fa/disable — requires current TOTP or recovery code
  fastify.post(
    '/2fa/disable',
    { ...auth(fastify), config: { rateLimit: { max: 5, timeWindow: '10 minutes' } } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const parsed = disable2faSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.errors[0].message });
      }
      const ok = await disable2fa(req.user.sub, parsed.data.code);
      if (!ok) return reply.code(400).send({ error: 'Invalid code' });
      return reply.send({ enabled: false });
    },
  );
};
