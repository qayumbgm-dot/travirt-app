import type { FastifyRequest, FastifyReply } from 'fastify';
import { createGttSchema } from '../validators/gtt.schema';
import { createGtt, listGtts, cancelGtt } from '../../services/gtt.service';

export const createGttHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const parsed = createGttSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Invalid GTT request', details: parsed.error.flatten() });
  }
  const gtt = await createGtt(req.user.sub, parsed.data as any);
  return reply.code(201).send(gtt);
};

export const listGttsHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const gtts = await listGtts(req.user.sub);
  return reply.send(gtts);
};

export const cancelGttHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  const ok = await cancelGtt(req.user.sub, id);
  if (!ok) return reply.code(404).send({ error: 'GTT not found or already inactive' });
  return reply.send({ message: 'GTT cancelled' });
};
