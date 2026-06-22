import { randomBytes } from 'crypto';
import { pool } from '../database/pool';
import { hashToken } from '../auth/tokens';

/** Creates a new 24-hour email verification token for the given user.
 *  Any previous unused tokens for that user are invalidated first. */
export const createEmailVerificationToken = async (userId: string): Promise<string> => {
  await pool.query(
    'UPDATE email_verification_tokens SET used = true WHERE user_id = $1 AND used = false',
    [userId],
  );

  const rawToken  = randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt],
  );

  return rawToken;
};

/** Atomically consumes the token and marks the user as verified.
 *  Returns the user's UUID on success, null if the token is invalid/expired/used. */
export const consumeEmailVerificationToken = async (rawToken: string): Promise<string | null> => {
  const tokenHash = hashToken(rawToken);

  const result = await pool.query<{ user_id: string }>(
    `UPDATE email_verification_tokens
     SET used = true
     WHERE token_hash = $1 AND used = false AND expires_at > NOW()
     RETURNING user_id`,
    [tokenHash],
  );
  if (!result.rowCount) return null;

  const userId = result.rows[0].user_id;
  await pool.query('UPDATE users SET is_verified = true WHERE id = $1', [userId]);
  return userId;
};
