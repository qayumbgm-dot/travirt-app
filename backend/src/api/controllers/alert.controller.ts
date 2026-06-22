import type { FastifyRequest, FastifyReply } from 'fastify';
import { createAlertSchema } from '../validators/alert.schema';
import { createAlert, listAlerts, cancelAlert } from '../../services/alert.service';

export const createAlertHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const parsed = createAlertSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Invalid alert request', details: parsed.error.flatten() });
  }
  const alert = await createAlert(req.user.sub, parsed.data);
  return reply.code(201).send(alert);
};

export const listAlertsHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const alerts = await listAlerts(req.user.sub);
  return reply.send(alerts);
};

export const cancelAlertHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  const ok = await cancelAlert(req.user.sub, id);
  if (!ok) return reply.code(404).send({ error: 'Alert not found or already inactive' });
  return reply.send({ message: 'Alert cancelled' });
};
