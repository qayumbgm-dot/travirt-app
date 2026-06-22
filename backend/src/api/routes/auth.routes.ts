import type { FastifyInstance } from 'fastify';
import {
  register, login, refresh, logout, me,
  verify2fa, forgotPassword, resetPassword,
  getProfile, updateProfile,
  verifyEmail, resendVerification,
  deleteAccount,
} from '../controllers/auth.controller';

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
};
