import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  connectBroker,
  disconnectBroker,
  getBrokerConnection,
} from '../../services/brokerConnection.service';
import { isBrokerEncryptionConfigured } from '../../integrations/aliceBlue';
import { logAction } from '../../services/audit.service';

const connectSchema = z.object({
  brokerUserId: z.string().min(1).max(100),
  apiKey:       z.string().min(1).max(512),
});

export const getStatus = async (req: FastifyRequest, reply: FastifyReply) => {
  if (!isBrokerEncryptionConfigured()) {
    return reply.send({ connected: false, reason: 'Broker integration not configured on this server' });
  }
  const conn = await getBrokerConnection(req.user.sub);
  if (!conn) return reply.send({ connected: false });
  return reply.send({
    connected:      true,
    broker:         conn.broker,
    brokerUserId:   conn.broker_user_id,
    connectedAt:    conn.connected_at,
    lastUsedAt:     conn.last_used_at,
  });
};

export const connect = async (req: FastifyRequest, reply: FastifyReply) => {
  if (!isBrokerEncryptionConfigured()) {
    return reply.code(503).send({ error: 'Broker integration not configured on this server' });
  }
  const parsed = connectSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Validation error', details: parsed.error.flatten() });
  }
  const { brokerUserId, apiKey } = parsed.data;
  const conn = await connectBroker(req.user.sub, brokerUserId, apiKey);
  logAction(req.user.sub, 'BROKER_CONNECTED', 'broker_connections', { broker: conn.broker }, req.ip);
  return reply.code(201).send({
    connected:    true,
    broker:       conn.broker,
    brokerUserId: conn.broker_user_id,
    connectedAt:  conn.connected_at,
  });
};

export const disconnect = async (req: FastifyRequest, reply: FastifyReply) => {
  const ok = await disconnectBroker(req.user.sub);
  if (!ok) return reply.code(404).send({ error: 'No active broker connection found' });
  logAction(req.user.sub, 'BROKER_DISCONNECTED', 'broker_connections', {}, req.ip);
  return reply.send({ message: 'Broker connection removed. Future trades will be virtual only.' });
};
