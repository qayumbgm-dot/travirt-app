import { createHash } from 'crypto';
import { pool } from '../database/pool';
import { verifyPassword } from '../auth/password';
import { cancelSubscription } from './stripe.service';

type EraseResult =
  | { ok: true;  email: string }
  | { ok: false; error: string };

/**
 * Verifies the user's password then hard-deletes their account.
 *
 * Execution order:
 *  1. Verify password — fail fast before touching anything
 *  2. Capture email + Stripe subscription ID (needed after row is gone)
 *  3. Cancel active Stripe subscription (best-effort)
 *  4. Log to gdpr_erasure_log (survives the DELETE)
 *  5. DELETE FROM users — all child rows CASCADE automatically
 *
 * Returns the user's email so the caller can send a goodbye email
 * before the address is gone from the DB.
 */
export const eraseUserData = async (
  userId:    string,
  password:  string,
  ipAddress: string,
): Promise<EraseResult> => {
  // 1 — Fetch the row we're about to erase
  const { rows } = await pool.query<{
    password_hash:         string;
    email:                 string;
    stripe_subscription_id: string | null;
  }>(
    `SELECT u.password_hash, u.email, us.stripe_subscription_id
     FROM users u
     LEFT JOIN user_subscriptions us
       ON us.user_id = u.id AND us.status = 'active'
     WHERE u.id = $1
     LIMIT 1`,
    [userId],
  );

  if (!rows[0]) return { ok: false, error: 'User not found' };

  const { password_hash, email, stripe_subscription_id } = rows[0];

  // 2 — Verify password before any destructive action
  const valid = await verifyPassword(password, password_hash);
  if (!valid) return { ok: false, error: 'Incorrect password' };

  // 3 — Cancel Stripe subscription (best-effort; don't block erasure if Stripe is down)
  if (stripe_subscription_id) {
    await cancelSubscription(stripe_subscription_id).catch((err: unknown) =>
      console.warn('[gdpr] Stripe cancel failed:', (err as Error).message),
    );
  }

  const emailHash = createHash('sha256').update(email.toLowerCase().trim()).digest('hex');

  // 4 — Write erasure log BEFORE deleting (this table has no FK to users)
  await pool.query(
    `INSERT INTO gdpr_erasure_log (email_hash, stripe_sub_id, ip_address)
     VALUES ($1, $2, $3)`,
    [emailHash, stripe_subscription_id ?? null, ipAddress],
  );

  // 5 — Hard delete; all child tables cascade automatically
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);

  return { ok: true, email };
};
