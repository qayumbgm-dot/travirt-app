import { FastifyInstance, FastifyRequest } from 'fastify';
import type { SocketStream } from '@fastify/websocket';
import WebSocket from 'ws';
import { z } from 'zod';
import { marketService, MarketTick } from '../../services/market.service';
import { getHistoricalData } from '../../services/historicalData.service';
import { subscriptionManager } from '../../websockets/subscriptionManager';
import { incCounter } from '../../services/metrics.service';

// ─── Validation ───────────────────────────────────────────────────────────────

const historyQuerySchema = z.object({
  symbol:   z.string().min(1).max(50),
  exchange: z.string().min(1).max(10).default('NSE'),
  interval: z.enum(['1min', '5min', '15min', '30min', '60min', '1hour', '1day', '1week']).default('1day'),
  from:     z.coerce.number().int().positive(),
  to:       z.coerce.number().int().positive(),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

export const marketRoutes = async (fastify: FastifyInstance) => {

  // ── GET /api/market/ws — WebSocket with per-symbol subscription filtering ──
  fastify.get(
    '/ws',
    { websocket: true },
    (connection: SocketStream, _req: FastifyRequest) => {
      const socket = connection.socket;
      incCounter('market_ws_connects_total');

      // Send full snapshot immediately on connect (client starts in wildcard mode)
      socket.send(JSON.stringify({
        type: 'snapshot',
        mode: marketService.getMode(),
        data: marketService.getSnapshot(),
      }));

      // Handle subscribe / unsubscribe messages from the browser client.
      // Protocol:
      //   { "type": "subscribe",   "symbols": ["NSE:RELIANCE", "NSE:TCS"] }
      //   { "type": "unsubscribe", "symbols": ["NSE:RELIANCE"] }
      // Once the first subscribe is sent the socket leaves wildcard mode.
      socket.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString()) as { type?: string; symbols?: unknown };
          if (!Array.isArray(msg.symbols) || !msg.type) return;
          const symbols = (msg.symbols as unknown[]).filter((s): s is string => typeof s === 'string');
          if (symbols.length === 0) return;

          if (msg.type === 'subscribe') {
            subscriptionManager.add(socket, symbols);
            // Acknowledge so the client knows the subscription is active
            socket.send(JSON.stringify({ type: 'subscribed', symbols }));
          } else if (msg.type === 'unsubscribe') {
            subscriptionManager.remove(socket, symbols);
            socket.send(JSON.stringify({ type: 'unsubscribed', symbols }));
          }
        } catch { /* ignore malformed frames */ }
      });

      // Fan-out: only deliver ticks the socket has subscribed to.
      // Wildcard sockets (no subscriptions yet) receive every tick.
      const onTick = (tick: MarketTick) => {
        if (socket.readyState !== WebSocket.OPEN) return;
        const key = `${tick.exchange}:${tick.symbol}`;
        if (
          subscriptionManager.isWildcard(socket) ||
          subscriptionManager.getSubscribersForSymbol(key).has(socket)
        ) {
          socket.send(JSON.stringify({ type: 'tick', data: tick }));
        }
      };
      marketService.on('tick', onTick);

      const cleanup = () => {
        marketService.off('tick', onTick);
        subscriptionManager.cleanup(socket);
        incCounter('market_ws_disconnects_total');
      };
      socket.on('close', cleanup);
      socket.on('error', cleanup);
    },
  );

  // ── GET /api/market/snapshot — latest price for all symbols ───────────────
  fastify.get('/snapshot', async (_req, reply) =>
    reply.send({ mode: marketService.getMode(), data: marketService.getSnapshot() }),
  );

  // ── GET /api/market/history — OHLCV bars with Redis caching ───────────────
  fastify.get('/history', async (req: FastifyRequest, reply) => {
    const parsed = historyQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Validation error', details: parsed.error.flatten() });
    }
    const { symbol, exchange, interval, from, to } = parsed.data;
    if (to <= from) {
      return reply.code(400).send({ error: '`to` must be greater than `from`' });
    }
    // Cap range: no more than 2 years of minute bars in one request
    const maxBars = 2 * 365 * 24 * 60;
    const step    = intervalSeconds(interval);
    if (Math.ceil((to - from) / step) > maxBars) {
      return reply.code(400).send({ error: 'Requested range too large' });
    }

    const bars = await getHistoricalData(symbol, exchange, interval, from, to);
    return reply.send({ symbol, exchange, interval, bars });
  });

  // ── GET /api/market/stats — connection and subscription statistics ─────────
  fastify.get('/stats', async (_req, reply) =>
    reply.send({
      mode:       marketService.getMode(),
      ...subscriptionManager.getStats(),
    }),
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const intervalSeconds = (interval: string): number => {
  const map: Record<string, number> = {
    '1min':  60, '5min': 300, '15min': 900,
    '30min': 1_800, '60min': 3_600, '1hour': 3_600,
    '1day':  86_400, '1week': 604_800,
  };
  return map[interval] ?? 300;
};
