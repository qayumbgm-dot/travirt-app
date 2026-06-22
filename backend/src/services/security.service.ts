import qrcode from 'qrcode';
import { hashPassword } from '../auth/password';
import { pool } from '../database/pool';
import {
  generateSecret,
  generateOtpAuthUri,
  generateRecoveryCodes,
  verifyTotp,
} from './totp.service';

export interface TwoFaStatus {
  enabled:    boolean;
  secret:     string | null;
  createdAt:  Date | null;
}

export const get2faStatus = async (userId: string): Promise<TwoFaStatus> => {
  const { rows } = await pool.query<{ enabled: boolean; secret: string; created_at: Date }>(
    'SELECT enabled, secret, created_at FROM user_2fa WHERE user_id = $1',
    [userId],
  );
  if (!rows[0]) return { enabled: false, secret: null, createdAt: null };
  return { enabled: rows[0].enabled, secret: rows[0].secret, createdAt: rows[0].created_at };
};

export interface SetupResult {
  secret:        string;
  otpAuthUri:    string;
  qrDataUrl:     string;
  recoveryCodes: string[];
}

export const setup2fa = async (userId: string, displayId: string): Promise<SetupResult> => {
  const secret       = generateSecret();
  const otpAuthUri   = generateOtpAuthUri(secret, displayId);
  const qrDataUrl    = await qrcode.toDataURL(otpAuthUri, { width: 256, margin: 2 });
  const recoveryCodes = generateRecoveryCodes();

  // Store secret as pending (enabled = false); regenerate recovery codes
  await pool.query(
    `INSERT INTO user_2fa (user_id, secret, enabled)
     VALUES ($1, $2, false)
     ON CONFLICT (user_id) DO UPDATE SET secret = $2, enabled = false, updated_at = NOW()`,
    [userId, secret],
  );

  // Delete old recovery codes and store new ones (hashed)
  await pool.query('DELETE FROM user_2fa_recovery WHERE user_id = $1', [userId]);
  for (const code of recoveryCodes) {
    const hash = await hashPassword(code);
    await pool.query(
      'INSERT INTO user_2fa_recovery (user_id, code_hash) VALUES ($1, $2)',
      [userId, hash],
    );
  }

  return { secret, otpAuthUri, qrDataUrl, recoveryCodes };
};

export const enable2fa = async (userId: string, code: string): Promise<boolean> => {
  const status = await get2faStatus(userId);
  if (!status.secret || status.enabled) return false;
  if (!verifyTotp(status.secret, code)) return false;

  await pool.query(
    'UPDATE user_2fa SET enabled = true, updated_at = NOW() WHERE user_id = $1',
    [userId],
  );
  return true;
};

export const disable2fa = async (userId: string, code: string): Promise<boolean> => {
  const status = await get2faStatus(userId);
  if (!status.enabled || !status.secret) return false;

  const valid = verifyTotp(status.secret, code) || await tryRecoveryCode(userId, code);
  if (!valid) return false;

  await pool.query('DELETE FROM user_2fa WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM user_2fa_recovery WHERE user_id = $1', [userId]);
  return true;
};

// Returns true and marks code used if it matches an unused recovery code
export const tryRecoveryCode = async (userId: string, input: string): Promise<boolean> => {
  const { rows } = await pool.query<{ id: string; code_hash: string }>(
    'SELECT id, code_hash FROM user_2fa_recovery WHERE user_id = $1 AND used = false',
    [userId],
  );
  const { verifyPassword } = await import('../auth/password');
  for (const row of rows) {
    if (await verifyPassword(input, row.code_hash)) {
      await pool.query(
        'UPDATE user_2fa_recovery SET used = true, used_at = NOW() WHERE id = $1',
        [row.id],
      );
      return true;
    }
  }
  return false;
};

export const getRemainingRecoveryCodes = async (userId: string): Promise<number> => {
  const { rows } = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM user_2fa_recovery WHERE user_id = $1 AND used = false',
    [userId],
  );
  return parseInt(rows[0]?.count ?? '0');
};
