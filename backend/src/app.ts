import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { env } from './config/env';
import authenticatePlugin from './api/middleware/authenticate';
import { errorHandler } from './api/middleware/errorHandler';
import { authRoutes } from './api/routes/auth.routes';
import { portfolioRoutes } from './api/routes/portfolio.routes';
import { tradeRoutes } from './api/routes/trade.routes';
import { watchlistRoutes } from './api/routes/watchlist.routes';
import { fundsRoutes } from './api/routes/funds.routes';
import { marketRoutes } from './api/routes/market.routes';
import { aiRoutes } from './api/routes/ai.routes';
import { leaderboardRoutes } from './api/routes/leaderboard.routes';
import { settingsRoutes } from './api/routes/settings.routes';
import { supportRoutes } from './api/routes/support.routes';
import { adminRoutes } from './api/routes/admin.routes';
import { billingRoutes } from './api/routes/billing.routes';
import { securityRoutes } from './api/routes/security.routes';
import { metricsRoutes } from './api/routes/metrics.routes';
import { analyticsRoutes } from './api/routes/analytics.routes';
import { referralRoutes } from './api/routes/referral.routes';
import { gttRoutes } from './api/routes/gtt.routes';
import { alertRoutes } from './api/routes/alert.routes';
import { brokerRoutes } from './api/routes/broker.routes';
import instrumentRoutes from './api/routes/instruments.routes';
import { pool } from './database/pool';
import { redis } from './config/redis';
import { recordRequest } from './services/metrics.service';

export const buildApp = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'warn' : 'info',
      transport:
        env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
    trustProxy: true,   // Needed for correct req.ip behind Nginx / Cloudflare
    bodyLimit: 1_048_576, // 1 MB — reject oversized payloads early
  });

  // ── Security headers ──────────────────────────────────────────────────────
  await app.register(helmet, {
    // API is consumed cross-origin — allow subresource fetch from any origin
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // CSP is enforced in production; disabled in dev to allow Vite HMR / inline scripts
    contentSecurityPolicy: env.NODE_ENV === 'production' ? {
      directives: {
        defaultSrc:  ["'self'"],
        scriptSrc:   ["'self'"],
        styleSrc:    ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', 'https://fonts.googleapis.com'],
        fontSrc:     ["'self'", 'https://cdnjs.cloudflare.com', 'https://fonts.gstatic.com'],
        imgSrc:      ["'self'", 'data:', 'https:'],
        connectSrc:  ["'self'", 'wss:', 'ws:'],
        objectSrc:   ["'none'"],
        frameSrc:    ["'none'"],
        upgradeInsecureRequests: [],
      },
    } : false,
    // HSTS: 1 year in production — tells browsers to always use HTTPS
    hsts: env.NODE_ENV === 'production' ? {
      maxAge: 31_536_000,
      includeSubDomains: true,
      preload: true,
    } : false,
    // Mitigate MIME sniffing and clickjacking everywhere
    xContentTypeOptions: true,
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });

  // ── CORS ──────────────────────────────────────────────────────────────────
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // non-browser / server-to-server
      const allowed =
        allowedOrigins.includes(origin) ||
        /^https:\/\/travirt-[\w-]+-[\w-]+-projects\.vercel\.app$/.test(origin) ||
        /^https:\/\/travirt-[\w-]+\.vercel\.app$/.test(origin);
      cb(allowed ? null : new Error('Not allowed by CORS'), allowed);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // ── Cookies ───────────────────────────────────────────────────────────────
  await app.register(cookie);

  // ── Global rate limiting ──────────────────────────────────────────────────
  await app.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
    keyGenerator: (req) => (req as any).user?.sub ?? req.ip,
    errorResponseBuilder: () => ({
      error: 'Rate limit exceeded. Please slow down.',
    }),
  });

  // ── WebSocket support ─────────────────────────────────────────────────────
  await app.register(websocket);

  // ── Request ID (X-Request-ID propagation) ────────────────────────────────
  app.addHook('onRequest', (req, reply, done) => {
    const id = (req.headers['x-request-id'] as string | undefined) ?? crypto.randomUUID();
    reply.header('X-Request-ID', id);
    done();
  });

  // ── Request metrics ───────────────────────────────────────────────────────
  app.addHook('onResponse', (req, reply, done) => {
    recordRequest(req.method, req.routeOptions?.url ?? req.url, reply.statusCode, reply.elapsedTime);
    done();
  });

  // ── Auth decorator (fastify.authenticate) ─────────────────────────────────
  await app.register(authenticatePlugin);

  // ── Error handler ─────────────────────────────────────────────────────────
  app.setErrorHandler(errorHandler);

  // ── Health check ──────────────────────────────────────────────────────────
  app.get('/health', async (_req, reply) => {
    const [dbResult, redisResult] = await Promise.allSettled([
      pool.query('SELECT 1'),
      redis.ping(),
    ]);
    const dbOk    = dbResult.status    === 'fulfilled';
    const redisOk = redisResult.status === 'fulfilled';
    const allOk   = dbOk && redisOk;

    return reply
      .code(allOk ? 200 : 503)
      .send({
        status:    allOk ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        env:       env.NODE_ENV,
        version:   '1.0.0',
        services: {
          database: dbOk    ? 'ok' : 'error',
          redis:    redisOk ? 'ok' : 'error',
        },
      });
  });

  // ── Root-level routes (metrics — scraped directly, not through Nginx /api) ─
  await app.register(metricsRoutes);

  // ── API routes ────────────────────────────────────────────────────────────
  await app.register(
    async (api) => {
      await api.register(authRoutes, { prefix: '/auth' });
      await api.register(portfolioRoutes, { prefix: '/portfolio' });
      await api.register(tradeRoutes, { prefix: '/trade' });
      await api.register(watchlistRoutes, { prefix: '/watchlists' });
      await api.register(fundsRoutes, { prefix: '/funds' });
      await api.register(marketRoutes, { prefix: '/market' });
      await api.register(aiRoutes, { prefix: '/ai' });
      await api.register(leaderboardRoutes, { prefix: '/leaderboard' });
      await api.register(settingsRoutes, { prefix: '/settings' });
      await api.register(supportRoutes, { prefix: '/support' });
      await api.register(adminRoutes,    { prefix: '/admin' });
      await api.register(billingRoutes,  { prefix: '/billing' });
      await api.register(securityRoutes, { prefix: '/security' });
      await api.register(analyticsRoutes, { prefix: '/analytics' });
      await api.register(referralRoutes,  { prefix: '/referrals' });
      await api.register(gttRoutes,       { prefix: '/gtt' });
      await api.register(alertRoutes,     { prefix: '/alerts' });
      await api.register(brokerRoutes,       { prefix: '/broker' });
      await api.register(instrumentRoutes,   { prefix: '/instruments' });
    },
    { prefix: '/api' },
  );

  return app;
};
