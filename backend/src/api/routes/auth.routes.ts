import type { FastifyInstance } from 'fastify';
import {
  register, login, refresh, logout, me,
  verify2fa, forgotPassword, resetPassword,
  getProfile, updateProfile,
  verifyEmail, resendVerification,
  deleteAccount,
} from '../controllers/auth.controller';
import {
  get2faStatus,
  setup2fa,
  enable2fa,
  disable2fa,
} from '../../services/security.service';
import { redis } from '../../config/redis';
import { z } from 'zod';

export const authRoutes = async (fastify: FastifyInstance): Promise<void> => {
  // Register: 5 attempts per hour — brute-force protection
  fastify.post('/register', {
    config: { rateLimit: { max: 5, timeWindow: '1 hour' } },
  }, register);

  // Login: 10 attempts per minute per IP
  fastify.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, login);

  // Refresh: 30 per minute (silent background call on every page load)
  fastify.post('/refresh', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, refresh);

  fastify.post('/logout', logout);
  fastify.get('/me', { preHandler: [fastify.authenticate] }, me);
  fastify.get('/me/profile',   { preHandler: [fastify.authenticate] }, getProfile);
  fastify.patch('/me/profile', { preHandler: [fastify.authenticate] }, updateProfile);

  // 2FA verification step (called after login when 2FA is enabled)
  fastify.post('/2fa-verify', {
    config: { rateLimit: { max: 10, timeWindow: '5 minutes' } },
  }, verify2fa);

  // 3 requests per hour per IP — prevents email-based enumeration spam
  fastify.post('/forgot-password', {
    config: { rateLimit: { max: 3, timeWindow: '1 hour' } },
  }, forgotPassword);

  // 5 per 15 min — prevents brute-force on reset tokens
  fastify.post('/reset-password', {
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
  }, resetPassword);

  // Consume a one-time email verification link (token from query string)
  fastify.post('/verify-email', {
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
  }, verifyEmail);

  // Resend verification email — requires auth (user must be logged in)
  fastify.post('/resend-verification', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 3, timeWindow: '1 hour' } },
  }, resendVerification);

  // GDPR right to erasure — requires auth + password confirmation
  // Strict rate limit: 3 per day prevents abuse while allowing legitimate retry
  fastify.delete('/me', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 3, timeWindow: '24 hours' } },
  }, deleteAccount);

  // ── Mobile-friendly aliases ────────────────────────────────────────────────
  // Flutter app uses /auth/profile and /auth/verify-2fa; mirror the canonical routes.

  fastify.get('/profile',   { preHandler: [fastify.authenticate] }, getProfile);
  fastify.patch('/profile', { preHandler: [fastify.authenticate] }, updateProfile);

  // POST /auth/verify-2fa — alias for /auth/2fa-verify (mobile client path)
  fastify.post('/verify-2fa', {
    config: { rateLimit: { max: 10, timeWindow: '5 minutes' } },
  }, verify2fa);

  // ── 2FA management (mobile calls /auth/2fa/* directly) ────────────────────

  fastify.get('/2fa/status', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const status = await get2faStatus(req.user.sub);
    return reply.send({ enabled: status.enabled, createdAt: status.createdAt });
  });

  fastify.post('/2fa/setup', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 5, timeWindow: '10 minutes' } },
  }, async (req, reply) => {
    const result = await setup2fa(req.user.sub, req.user.userId);
    return reply.send(result);
  });

  fastify.post('/2fa/verify', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 10, timeWindow: '5 minutes' } },
  }, async (req, reply) => {
    const parsed = z.object({ code: z.string().regex(/^\d{6}$/) }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'A 6-digit code is required' });
    const ok = await enable2fa(req.user.sub, parsed.data.code);
    if (!ok) return reply.code(400).send({ error: 'Invalid code or 2FA not yet set up' });
    return reply.send({ enabled: true });
  });

  fastify.post('/2fa/disable', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 5, timeWindow: '10 minutes' } },
  }, async (req, reply) => {
    const parsed = z.object({ code: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Verification code is required' });
    const ok = await disable2fa(req.user.sub, parsed.data.code);
    if (!ok) return reply.code(400).send({ error: 'Invalid code' });
    return reply.send({ enabled: false });
  });

  // ── FCM push token ─────────────────────────────────────────────────────────
  // Stores the device token in Redis (90-day TTL). Used by the server to send
  // push notifications via Firebase Cloud Messaging.
  fastify.post('/fcm-token', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const parsed = z.object({ token: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'token is required' });
    await redis.setex(`fcm:${req.user.sub}`, 90 * 24 * 60 * 60, parsed.data.token);
    return reply.send({ ok: true });
  });
};
