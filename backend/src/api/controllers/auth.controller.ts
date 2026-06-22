import type { FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import {
  registerSchema,
  loginSchema,
  verify2faSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.schema';
import { hashPassword, verifyPassword } from '../../auth/password';
import { signAccessToken } from '../../auth/jwt';
import {
  generateRefreshToken,
  storeRefreshToken,
  validateAndRotateRefreshToken,
  revokeRefreshToken,
} from '../../auth/tokens';
import {
  createUser,
  findUserByEmail,
  findUserByUserId,
  findUserById,
  updateLastLogin,
  isEmailTaken,
  isUserIdTaken,
  getUserProfile,
  upsertUserProfile,
} from '../../services/user.service';
import { env } from '../../config/env';
import {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
  sendAccountErasedEmail,
} from '../../services/email.service';
import { eraseUserData } from '../../services/gdpr.service';
import { createPasswordResetToken, consumeResetToken } from '../../services/password-reset.service';
import {
  createEmailVerificationToken,
  consumeEmailVerificationToken,
} from '../../services/emailVerification.service';
import { logAction } from '../../services/audit.service';
import { get2faStatus, tryRecoveryCode } from '../../services/security.service';
import { verifyTotp } from '../../services/totp.service';
import jwt from 'jsonwebtoken';

const REFRESH_COOKIE = 'refresh_token';

const cookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60,  // seconds
});

const userPublic = (u: Awaited<ReturnType<typeof findUserById>>) => ({
  id: u!.id,
  userId: u!.user_id,
  email: u!.email,
  displayName: u!.display_name,
  role: u!.role,
});

// POST /api/auth/register
export const register = async (req: FastifyRequest, reply: FastifyReply) => {
  let body: ReturnType<typeof registerSchema.parse>;
  try {
    body = registerSchema.parse(req.body);
  } catch (err) {
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: 'Validation error', details: err.flatten().fieldErrors });
    }
    throw err;
  }

  if (await isUserIdTaken(body.userId)) {
    return reply.code(409).send({ error: 'User ID is already taken. Please choose another.' });
  }
  if (await isEmailTaken(body.email)) {
    return reply.code(409).send({ error: 'Email is already registered. Try logging in.' });
  }

  const passwordHash = await hashPassword(body.password);
  const user = await createUser({
    userId: body.userId,
    email: body.email,
    passwordHash,
    displayName: body.displayName,
  });

  const accessToken = signAccessToken({
    sub: user.id,
    userId: user.user_id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = generateRefreshToken();
  await storeRefreshToken(user.id, refreshToken, req.ip, req.headers['user-agent'] ?? '');

  reply.setCookie(REFRESH_COOKIE, refreshToken, cookieOptions());

  // Send verification + welcome emails concurrently (fire-and-forget)
  createEmailVerificationToken(user.id)
    .then((rawToken) => {
      const base = env.FRONTEND_URL ?? env.CORS_ORIGIN;
      const link = `${base}?verify_token=${rawToken}`;
      return sendEmailVerificationEmail(user.email, link);
    })
    .catch(() => {});
  sendWelcomeEmail(user.email, user.user_id).catch(() => {});
  logAction(user.id, 'USER_REGISTERED', 'users', { userId: user.user_id }, req.ip);

  return reply.code(201).send({
    accessToken,
    user: userPublic(user),
  });
};

// POST /api/auth/login
export const login = async (req: FastifyRequest, reply: FastifyReply) => {
  let body: ReturnType<typeof loginSchema.parse>;
  try {
    body = loginSchema.parse(req.body);
  } catch (err) {
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: 'Validation error', details: err.flatten().fieldErrors });
    }
    throw err;
  }

  const isEmail = body.identifier.includes('@');
  const user = isEmail
    ? await findUserByEmail(body.identifier)
    : await findUserByUserId(body.identifier);

  // Constant-time failure path — don't reveal whether user exists
  const passwordOk = user
    ? await verifyPassword(body.password, user.password_hash)
    : false;

  if (!user || !passwordOk) {
    return reply.code(401).send({ error: 'Invalid credentials' });
  }

  await updateLastLogin(user.id);

  // If 2FA is enabled, issue a short-lived temp token instead of full credentials
  const twoFa = await get2faStatus(user.id);
  if (twoFa.enabled) {
    const tempToken = jwt.sign(
      { sub: user.id, userId: user.user_id, role: '2fa-pending' },
      env.JWT_SECRET,
      { expiresIn: '5m' },
    );
    return reply.send({ requires2FA: true, tempToken, userId: user.user_id });
  }

  const accessToken = signAccessToken({
    sub: user.id,
    userId: user.user_id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = generateRefreshToken();
  await storeRefreshToken(user.id, refreshToken, req.ip, req.headers['user-agent'] ?? '');

  reply.setCookie(REFRESH_COOKIE, refreshToken, cookieOptions());
  logAction(user.id, 'USER_LOGIN', 'users', { userId: user.user_id }, req.ip);

  return reply.send({
    accessToken,
    user: userPublic(user),
  });
};

// POST /api/auth/2fa-verify — complete login when 2FA is active
export const verify2fa = async (req: FastifyRequest, reply: FastifyReply) => {
  const v = verify2faSchema.safeParse(req.body);
  if (!v.success) {
    return reply.code(400).send({ error: 'Validation error', details: v.error.flatten() });
  }
  const { tempToken, code } = v.data;

  let payload: { sub: string; userId: string; role: string };
  try {
    payload = jwt.verify(tempToken, env.JWT_SECRET) as typeof payload;
  } catch {
    return reply.code(401).send({ error: 'Temporary token is invalid or expired' });
  }
  if (payload.role !== '2fa-pending') {
    return reply.code(401).send({ error: 'Invalid token type' });
  }

  const twoFa = await get2faStatus(payload.sub);
  if (!twoFa.enabled || !twoFa.secret) {
    return reply.code(401).send({ error: '2FA is not active for this account' });
  }

  const codeOk = verifyTotp(twoFa.secret, code) || await tryRecoveryCode(payload.sub, code);
  if (!codeOk) {
    return reply.code(401).send({ error: 'Invalid authentication code' });
  }

  const user = await findUserById(payload.sub);
  if (!user) return reply.code(401).send({ error: 'User not found' });

  const accessToken = signAccessToken({
    sub: user.id, userId: user.user_id, email: user.email, role: user.role,
  });
  const refreshToken = generateRefreshToken();
  await storeRefreshToken(user.id, refreshToken, req.ip, req.headers['user-agent'] ?? '');
  reply.setCookie(REFRESH_COOKIE, refreshToken, cookieOptions());
  logAction(user.id, 'USER_LOGIN_2FA', 'users', { userId: user.user_id }, req.ip);

  return reply.send({ accessToken, user: userPublic(user) });
};

// POST /api/auth/forgot-password
export const forgotPassword = async (req: FastifyRequest, reply: FastifyReply) => {
  const v = forgotPasswordSchema.safeParse(req.body);
  if (!v.success) {
    return reply.code(400).send({ error: v.error.errors[0].message });
  }
  const { email } = v.data;

  const rawToken = await createPasswordResetToken(email.toLowerCase().trim());
  if (rawToken) {
    const base = env.FRONTEND_URL ?? env.CORS_ORIGIN;
    const link = `${base}?reset_token=${rawToken}`;
    sendPasswordResetEmail(email, link).catch(() => {});
  }

  // Always 200 — never reveal whether the email exists
  return reply.send({ message: 'If that email is registered, a reset link has been sent.' });
};

// POST /api/auth/reset-password
export const resetPassword = async (req: FastifyRequest, reply: FastifyReply) => {
  const v = resetPasswordSchema.safeParse(req.body);
  if (!v.success) {
    return reply.code(400).send({ error: 'Validation error', details: v.error.flatten() });
  }
  const { token, password } = v.data;

  const userId = await consumeResetToken(token, password);
  if (!userId) {
    return reply.code(400).send({ error: 'Reset link is invalid or has expired' });
  }

  logAction(userId, 'PASSWORD_RESET', 'users', {}, req.ip);
  return reply.send({ message: 'Password updated. Please log in with your new password.' });
};

// POST /api/auth/refresh
export const refresh = async (req: FastifyRequest, reply: FastifyReply) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) {
    return reply.code(401).send({ error: 'No refresh token present' });
  }

  const session = await validateAndRotateRefreshToken(token);
  if (!session) {
    reply.clearCookie(REFRESH_COOKIE, { path: '/' });
    return reply.code(401).send({ error: 'Refresh token invalid or expired. Please log in again.' });
  }

  const user = await findUserById(session.userId);
  if (!user) {
    return reply.code(401).send({ error: 'User not found' });
  }

  const accessToken = signAccessToken({
    sub: user.id,
    userId: user.user_id,
    email: user.email,
    role: user.role,
  });

  // Rotate: issue a new refresh token
  const newRefreshToken = generateRefreshToken();
  await storeRefreshToken(user.id, newRefreshToken, req.ip, req.headers['user-agent'] ?? '');
  reply.setCookie(REFRESH_COOKIE, newRefreshToken, cookieOptions());

  return reply.send({ accessToken });
};

// POST /api/auth/logout
export const logout = async (req: FastifyRequest, reply: FastifyReply) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    await revokeRefreshToken(token).catch(() => {});
  }
  reply.clearCookie(REFRESH_COOKIE, { path: '/' });
  return reply.send({ message: 'Logged out successfully' });
};

// GET /api/auth/me  (requires authenticate preHandler)
export const me = async (req: FastifyRequest, reply: FastifyReply) => {
  const user = await findUserById(req.user!.sub);
  if (!user) return reply.code(404).send({ error: 'User not found' });
  return reply.send(userPublic(user));
};

// GET /api/auth/me/profile
export const getProfile = async (req: FastifyRequest, reply: FastifyReply) => {
  const profile = await getUserProfile(req.user.sub);
  return reply.send(profile ?? {});
};

// POST /api/auth/verify-email
export const verifyEmail = async (req: FastifyRequest, reply: FastifyReply) => {
  const { token } = req.body as { token?: string };
  if (!token || typeof token !== 'string') {
    return reply.code(400).send({ error: 'token is required' });
  }
  const userId = await consumeEmailVerificationToken(token);
  if (!userId) {
    return reply.code(400).send({ error: 'Verification link is invalid or has expired' });
  }
  logAction(userId, 'EMAIL_VERIFIED', 'users', {}, req.ip);
  return reply.send({ message: 'Email verified. Your account is now fully active.' });
};

// POST /api/auth/resend-verification
export const resendVerification = async (req: FastifyRequest, reply: FastifyReply) => {
  // Require auth so we know who to resend to (avoids email enumeration)
  const user = await findUserById(req.user.sub);
  if (!user) return reply.code(404).send({ error: 'User not found' });
  if (user.is_verified) {
    return reply.send({ message: 'Your email is already verified.' });
  }
  const rawToken = await createEmailVerificationToken(user.id);
  const base     = env.FRONTEND_URL ?? env.CORS_ORIGIN;
  const link     = `${base}?verify_token=${rawToken}`;
  sendEmailVerificationEmail(user.email, link).catch(() => {});
  return reply.send({ message: 'Verification email sent. Please check your inbox.' });
};

// DELETE /api/auth/me — GDPR right to erasure
export const deleteAccount = async (req: FastifyRequest, reply: FastifyReply) => {
  const { password } = (req.body ?? {}) as { password?: string };
  if (!password || typeof password !== 'string') {
    return reply.code(400).send({ error: 'password is required to confirm account deletion' });
  }

  const result = await eraseUserData(req.user.sub, password, req.ip);
  if (!result.ok) {
    return reply.code(result.error === 'User not found' ? 404 : 401).send({ error: result.error });
  }

  // Send goodbye email before we lose access to the address (fire-and-forget)
  sendAccountErasedEmail(result.email).catch(() => {});

  // Revoke the session cookie — the refresh token row is already gone via CASCADE
  reply.clearCookie('refresh_token', { path: '/' });

  return reply.send({ message: 'Your account and all associated data have been permanently deleted.' });
};

// PATCH /api/auth/me/profile
export const updateProfile = async (req: FastifyRequest, reply: FastifyReply) => {
  const allowed = [
    'first_name', 'last_name', 'phone', 'gender', 'address',
    'city', 'state', 'pincode', 'country',
    'bank_name', 'account_holder', 'account_number', 'ifsc', 'pan',
  ];
  const body = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = typeof body[key] === 'string' ? (body[key] as string).trim() || null : null;
  }
  const profile = await upsertUserProfile(req.user.sub, data);
  logAction(req.user.sub, 'PROFILE_UPDATED', 'user_profiles', {}, req.ip);
  return reply.send(profile);
};
