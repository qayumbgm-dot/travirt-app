import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  connectBroker,
  disconnectBroker,
  getBrokerConnection,
} from '../../services/brokerConnection.service';
import { isBrokerEncryptionConfigured, exchangeAuthCode } from '../../integrations/aliceBlue';
import { marketService } from '../../services/market.service';
import { logAction } from '../../services/audit.service';
import { env } from '../../config/env';

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

const callbackSchema = z.object({
  authCode: z.string().min(1).max(100),
  userId:   z.string().min(1).max(50),
  appcode:  z.string().min(1).max(100),
});

// Receives the Alice Blue ANT OAuth redirect params, exchanges authCode for a
// session token, and activates the live market feed immediately.
export const aliceCallback = async (req: FastifyRequest, reply: FastifyReply) => {
  const parsed = callbackSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'authCode, userId and appcode are required' });
  }
  const { authCode, userId, appcode } = parsed.data;
  const apiKey = env.ALICE_API_KEY;
  if (!apiKey) {
    return reply.code(503).send({ error: 'ALICE_API_KEY not configured on this server' });
  }
  try {
    const token = await exchangeAuthCode(userId, apiKey, authCode, appcode);
    marketService.activateToken(token);
    logAction(req.user.sub, 'ALICE_OAUTH_CALLBACK', 'market', { userId }, req.ip);
    return reply.send({ ok: true, mode: marketService.getMode() });
  } catch (err) {
    return reply.code(502).send({ error: (err as Error).message });
  }
};
