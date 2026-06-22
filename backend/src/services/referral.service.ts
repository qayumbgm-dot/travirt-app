import { pool } from '../database/pool';
import { incrementBalance, insertTransaction } from './portfolio.service';

const REFEREE_BONUS_NXO  = 50;
const REFERRER_BONUS_NXO = 100;

const generateCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous I,O,0,1
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// ─── Get or create a referral code for a user ─────────────────────────────────

export const getOrCreateCode = async (userId: string): Promise<string> => {
  const existing = await pool.query<{ code: string }>(
    'SELECT code FROM referral_codes WHERE user_id = $1',
    [userId],
  );
  if (existing.rows[0]) return existing.rows[0].code;

  // Generate a unique code — retry on collision (extremely rare)
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode();
    try {
      await pool.query(
        'INSERT INTO referral_codes (user_id, code) VALUES ($1, $2)',
        [userId, code],
      );
      return code;
    } catch {
      // UNIQUE violation — try again
    }
  }
  throw new Error('Failed to generate unique referral code');
};

// ─── Apply a referral code (called at signup or from profile) ─────────────────

export interface ApplyResult {
  success: boolean;
  error?: string;
}

export const applyReferralCode = async (refereeUserId: string, code: string): Promise<ApplyResult> => {
  const codeUpper = code.trim().toUpperCase();

  // Look up the code
  const { rows } = await pool.query<{ user_id: string; code: string }>(
    'SELECT user_id, code FROM referral_codes WHERE code = $1',
    [codeUpper],
  );
  if (!rows[0]) return { success: false, error: 'Invalid referral code' };

  const referrerId = rows[0].user_id;

  // Cannot refer yourself
  if (referrerId === refereeUserId) {
    return { success: false, error: 'You cannot use your own referral code' };
  }

  // Check if referee already used a code
  const alreadyUsed = await pool.query(
    'SELECT 1 FROM referral_uses WHERE referee_id = $1',
    [refereeUserId],
  );
  if (alreadyUsed.rows[0]) {
    return { success: false, error: 'You have already used a referral code' };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Record the use
    await client.query(
      `INSERT INTO referral_uses (code, referrer_id, referee_id, referee_rewarded)
       VALUES ($1, $2, $3, true)`,
      [codeUpper, referrerId, refereeUserId],
    );

    // Increment use counter on the code
    await client.query(
      'UPDATE referral_codes SET total_uses = total_uses + 1 WHERE code = $1',
      [codeUpper],
    );

    // Award NXO to referee immediately
    await incrementBalance(refereeUserId, 'nxo_balance', REFEREE_BONUS_NXO, client);
    await insertTransaction(refereeUserId, 'REFERRAL_BONUS', `Referral signup bonus`, `+${REFEREE_BONUS_NXO} NXO`, client);

    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ─── Award referrer bonus when referee completes their first trade ─────────────

export const awardReferrerBonus = async (refereeUserId: string): Promise<void> => {
  const { rows } = await pool.query<{ referrer_id: string }>(
    `UPDATE referral_uses
     SET referrer_rewarded = true
     WHERE referee_id = $1 AND referrer_rewarded = false
     RETURNING referrer_id`,
    [refereeUserId],
  );
  if (!rows[0]) return; // already rewarded or no referral

  const referrerId = rows[0].referrer_id;
  await incrementBalance(referrerId, 'nxo_balance', REFERRER_BONUS_NXO);
  await insertTransaction(referrerId, 'REFERRAL_REWARD', 'Referral reward — your invitee placed their first trade', `+${REFERRER_BONUS_NXO} NXO`);
};

// ─── Referral stats for the current user ──────────────────────────────────────

export interface ReferralStats {
  code: string;
  totalUses: number;
  pendingRewards: number;   // invitees who haven't traded yet
  nxoEarned: number;        // total NXO awarded to this user from referrals
  hasAppliedCode: boolean;  // did this user use someone else's code?
  appliedCode: string | null;
}

export const getReferralStats = async (userId: string): Promise<ReferralStats> => {
  const code = await getOrCreateCode(userId);

  const { rows: useRows } = await pool.query<{
    total_uses: string;
    pending: string;
  }>(
    `SELECT
       total_uses,
       (SELECT COUNT(*) FROM referral_uses ru WHERE ru.referrer_id = $2 AND ru.referrer_rewarded = false) AS pending
     FROM referral_codes
     WHERE user_id = $2`,
    [userId, userId],
  );

  const totalUses    = parseInt(useRows[0]?.total_uses ?? '0');
  const pendingRewards = parseInt(useRows[0]?.pending ?? '0');
  const nxoEarned    = (totalUses - pendingRewards) * REFERRER_BONUS_NXO;

  const { rows: appliedRows } = await pool.query<{ code: string }>(
    'SELECT code FROM referral_uses WHERE referee_id = $1',
    [userId],
  );

  return {
    code,
    totalUses,
    pendingRewards,
    nxoEarned,
    hasAppliedCode: appliedRows.length > 0,
    appliedCode: appliedRows[0]?.code ?? null,
  };
};
