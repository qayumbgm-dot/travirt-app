import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getOrCreateCode, applyReferralCode, getReferralStats } from '../../services/referral.service';
import { logAction } from '../../services/audit.service';

const applyCodeSchema = z.object({
  code: z.string().trim().min(1, 'code is required'),
});

export const getMyCode = async (req: FastifyRequest, reply: FastifyReply) => {
  const code = await getOrCreateCode(req.user.sub);
  return reply.send({ code });
};

export const applyCode = async (req: FastifyRequest, reply: FastifyReply) => {
  const parsed = applyCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: parsed.error.errors[0].message });
  }
  const { code } = parsed.data;

  const result = await applyReferralCode(req.user.sub, code);
  if (!result.success) {
    return reply.code(400).send({ error: result.error });
  }

  logAction(req.user.sub, 'REFERRAL_CODE_APPLIED', 'referral_uses', { code: code.toUpperCase() }, req.ip);
  return reply.send({ message: 'Referral code applied! +50 NXO added to your account.' });
};

export const getStats = async (req: FastifyRequest, reply: FastifyReply) => {
  const stats = await getReferralStats(req.user.sub);
  return reply.send(stats);
};
