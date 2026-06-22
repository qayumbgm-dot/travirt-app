import { randomBytes } from 'crypto';
import { pool } from '../database/pool';
import { hashToken, revokeAllUserSessions } from '../auth/tokens';
import { findUserByEmail } from './user.service';
import { hashPassword } from '../auth/password';

export const createPasswordResetToken = async (email: string): Promise<string | null> => {
  const user = await findUserByEmail(email);
  if (!user) return null;

  // Invalidate any previous unused tokens so only one is valid at a time
  await pool.query(
    `UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false`,
    [user.id],
  );

  const rawToken  = randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt],
  );

  return rawToken;
};

// Atomically consume the token and update the password; returns userId on success or null
export const consumeResetToken = async (rawToken: string, newPassword: string): Promise<string | null> => {
  const tokenHash = hashToken(rawToken);

  const result = await pool.query<{ user_id: string }>(
    `UPDATE password_reset_tokens
     SET used = true
     WHERE token_hash = $1 AND used = false AND expires_at > NOW()
     RETURNING user_id`,
    [tokenHash],
  );
  if (!result.rowCount) return null;

  const userId      = result.rows[0].user_id;
  const passwordHash = await hashPassword(newPassword);

  await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, userId]);

  // Sign out every existing session so the old password can't be used via active cookies
  await revokeAllUserSessions(userId);

  return userId;
};
