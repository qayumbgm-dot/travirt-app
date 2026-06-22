import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as funds from '../../services/funds.service';

const amountSchema = z.object({ amount: z.number().positive() });

export const addInr = async (req: FastifyRequest, reply: FastifyReply) => {
  const parsed = amountSchema.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: 'amount must be a positive number' });
  const inrBalance = await funds.addInr(req.user.sub, parsed.data.amount);
  return reply.send({ inrBalance });
};

export const buyNxo = async (req: FastifyRequest, reply: FastifyReply) => {
  const parsed = amountSchema.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: 'amount must be a positive number' });
  const result = await funds.buyNxo(req.user.sub, parsed.data.amount);
  return reply.send(result);
};

export const convertNxoToVirtual = async (req: FastifyRequest, reply: FastifyReply) => {
  const parsed = amountSchema.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: 'amount must be a positive number' });
  const result = await funds.convertNxoToVirtual(req.user.sub, parsed.data.amount);
  return reply.send(result);
};

export const claimDailyBonus = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = await funds.claimDailyBonus(req.user.sub);
  if (!result.claimed) {
    return reply.code(409).send({ error: 'Daily bonus already claimed. Come back tomorrow!', nxo_balance: result.nxo_balance });
  }
  return reply.send(result);
};
