import { FastifyInstance } from 'fastify';
import {
  searchInstruments,
  getOptionChain,
  getExpiries,
  getInstrumentByToken,
  getInstrumentCount,
  refreshInstruments,
} from '../../services/instrumentMaster.service';
import { env } from '../../config/env';

export default async function instrumentRoutes(app: FastifyInstance) {
  // GET /api/instruments/search?q=RELIANCE&exchange=NSE&segment=NSE_CM&limit=20
  app.get('/search', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { q = '', exchange, segment, limit } = req.query as {
      q?: string; exchange?: string; segment?: string; limit?: string;
    };
    if (!q || q.length < 1) return reply.code(400).send({ error: 'q is required' });
    const results = await searchInstruments(q, exchange, segment, parseInt(limit ?? '20', 10));
    return reply.send(results);
  });

  // GET /api/instruments/token/:exchange/:token
  app.get('/token/:exchange/:token', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { exchange, token } = req.params as { exchange: string; token: string };
    const instrument = await getInstrumentByToken(token, exchange);
    if (!instrument) return reply.code(404).send({ error: 'Instrument not found' });
    return reply.send(instrument);
  });

  // GET /api/instruments/expiries?underlying=NIFTY
  app.get('/expiries', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { underlying } = req.query as { underlying?: string };
    if (!underlying) return reply.code(400).send({ error: 'underlying is required' });
    const expiries = await getExpiries(underlying);
    return reply.send(expiries);
  });

  // GET /api/instruments/optionchain?underlying=NIFTY&expiry=2026-06-26
  app.get('/optionchain', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { underlying, expiry } = req.query as { underlying?: string; expiry?: string };
    if (!underlying) return reply.code(400).send({ error: 'underlying is required' });
    const chain = await getOptionChain(underlying, expiry);
    return reply.send(chain);
  });

  // GET /api/instruments/count
  app.get('/count', { preHandler: [app.authenticate] }, async (_req, reply) => {
    const count = await getInstrumentCount();
    return reply.send({ count });
  });

  // POST /api/instruments/refresh  (admin only)
  app.post('/refresh', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = (req as any).user;
    if (!['admin', 'super_admin'].includes(user?.role)) {
      return reply.code(403).send({ error: 'Admin only' });
    }
    const aliceToken = (env as any).ALICE_ACCESS_TOKEN;
    refreshInstruments(aliceToken).catch(console.error);
    return reply.send({ message: 'Instrument refresh started' });
  });
}
