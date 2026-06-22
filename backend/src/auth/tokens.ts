import { randomBytes, createHash } from 'crypto';
import { pool } from '../database/pool';
import { env } from '../config/env';

export const generateRefreshToken = (): string =>
  randomBytes(64).toString('hex');

export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const storeRefreshToken = async (
  userId: string,
  token: string,
  ipAddress: string,
  userAgent: string,
): Promise<void> => {
  const hash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_EXPIRES_DAYS);

  await pool.query(
    `INSERT INTO sessions (user_id, refresh_token_hash, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, hash, expiresAt, ipAddress || null, userAgent || null],
  );
};

export const validateAndRotateRefreshToken = async (
  token: string,
): Promise<{ userId: string } | null> => {
  const hash = hashToken(token);
  const result = await pool.query<{ user_id: string }>(
    `DELETE FROM sessions
     WHERE refresh_token_hash = $1 AND expires_at > NOW()
     RETURNING user_id`,
    [hash],
  );
  if (!result.rowCount) return null;
  return { userId: result.rows[0].user_id };
};

export const revokeRefreshToken = async (token: string): Promise<void> => {
  const hash = hashToken(token);
  await pool.query('DELETE FROM sessions WHERE refresh_token_hash = $1', [hash]);
};

export const revokeAllUserSessions = async (userId: string): Promise<void> => {
  await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
};
