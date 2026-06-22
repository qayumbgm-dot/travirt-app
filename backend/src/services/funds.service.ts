import { pool } from '../database/pool';

const NXO_TO_VIRTUAL_RATE = 1000; // 1 NXO = ₹1000 virtual
const DAILY_BONUS_NXO    = 5;     // NXO credited per daily claim

export const addInr = async (userId: string, amount: number): Promise<number> => {
  if (amount <= 0) throw Object.assign(new Error('Amount must be positive'), { statusCode: 400 });
  const { rows } = await pool.query<{ inr_balance: number }>(
    `UPDATE portfolio_balances SET inr_balance = inr_balance + $1, updated_at = NOW()
     WHERE user_id = $2 RETURNING inr_balance`,
    [amount, userId],
  );
  await pool.query(
    'INSERT INTO transactions (user_id, type, description, amount) VALUES ($1,$2,$3,$4)',
    [userId, 'DEPOSIT_INR', 'Funds added to wallet', `+ ₹${amount.toFixed(2)}`],
  );
  return Number(rows[0].inr_balance);
};

export const buyNxo = async (userId: string, inrAmount: number): Promise<{ inr_balance: number; nxo_balance: number }> => {
  if (inrAmount <= 0) throw Object.assign(new Error('Amount must be positive'), { statusCode: 400 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: balRows } = await client.query<{ inr_balance: number; nxo_balance: number }>(
      'SELECT inr_balance, nxo_balance FROM portfolio_balances WHERE user_id = $1 FOR UPDATE',
      [userId],
    );
    const bal = balRows[0];
    if (Number(bal.inr_balance) < inrAmount) {
      throw Object.assign(
        new Error(`Insufficient INR balance. Available ₹${Number(bal.inr_balance).toFixed(2)}`),
        { statusCode: 400 },
      );
    }

    const { rows } = await client.query<{ inr_balance: number; nxo_balance: number }>(
      `UPDATE portfolio_balances
       SET inr_balance = inr_balance - $1, nxo_balance = nxo_balance + $1, updated_at = NOW()
       WHERE user_id = $2 RETURNING inr_balance, nxo_balance`,
      [inrAmount, userId],
    );
    await client.query(
      'INSERT INTO transactions (user_id, type, description, amount) VALUES ($1,$2,$3,$4)',
      [userId, 'BUY_NXO', `Purchased ${inrAmount} NXO`, `- ₹${inrAmount.toFixed(2)}`],
    );

    await client.query('COMMIT');
    return { inr_balance: Number(rows[0].inr_balance), nxo_balance: Number(rows[0].nxo_balance) };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export interface DailyBonusResult {
  claimed: boolean;          // false = already claimed today
  nxo_balance: number;
  daily_bonus_date: string;  // ISO date string (IST date)
}

export const claimDailyBonus = async (userId: string): Promise<DailyBonusResult> => {
  // Use a single atomic UPDATE + RETURNING so there's no TOCTOU race.
  // The WHERE clause prevents double-claims within the same IST calendar day.
  const { rows, rowCount } = await pool.query<{
    nxo_balance: number;
    daily_bonus_date: string;
  }>(
    `UPDATE portfolio_balances
     SET nxo_balance        = nxo_balance + $1,
         daily_bonus_claimed = TRUE,
         daily_bonus_date    = (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE,
         updated_at          = NOW()
     WHERE user_id = $2
       AND (daily_bonus_claimed = FALSE
            OR daily_bonus_date < (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE)
     RETURNING nxo_balance, daily_bonus_date`,
    [DAILY_BONUS_NXO, userId],
  );

  if (!rowCount) {
    // Already claimed today — return current balance without updating
    const { rows: cur } = await pool.query<{ nxo_balance: number; daily_bonus_date: string }>(
      'SELECT nxo_balance, daily_bonus_date FROM portfolio_balances WHERE user_id = $1',
      [userId],
    );
    return { claimed: false, nxo_balance: Number(cur[0]?.nxo_balance ?? 0), daily_bonus_date: cur[0]?.daily_bonus_date ?? '' };
  }

  await pool.query(
    'INSERT INTO transactions (user_id, type, description, amount) VALUES ($1,$2,$3,$4)',
    [userId, 'DAILY_BONUS', 'Daily login bonus', `+ ${DAILY_BONUS_NXO} NXO`],
  );

  return {
    claimed:          true,
    nxo_balance:      Number(rows[0].nxo_balance),
    daily_bonus_date: rows[0].daily_bonus_date,
  };
};

export const convertNxoToVirtual = async (
  userId: string,
  nxoAmount: number,
): Promise<{ nxo_balance: number; virtual_balance: number }> => {
  if (nxoAmount <= 0) throw Object.assign(new Error('Amount must be positive'), { statusCode: 400 });

  const virtualGain = nxoAmount * NXO_TO_VIRTUAL_RATE;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: balRows } = await client.query<{ nxo_balance: number }>(
      'SELECT nxo_balance FROM portfolio_balances WHERE user_id = $1 FOR UPDATE',
      [userId],
    );
    if (Number(balRows[0].nxo_balance) < nxoAmount) {
      throw Object.assign(
        new Error(`Insufficient NXO balance. Available ${Number(balRows[0].nxo_balance)} NXO`),
        { statusCode: 400 },
      );
    }

    const { rows } = await client.query<{ nxo_balance: number; virtual_balance: number }>(
      `UPDATE portfolio_balances
       SET nxo_balance = nxo_balance - $1, virtual_balance = virtual_balance + $2, updated_at = NOW()
       WHERE user_id = $3 RETURNING nxo_balance, virtual_balance`,
      [nxoAmount, virtualGain, userId],
    );
    await client.query(
      'INSERT INTO transactions (user_id, type, description, amount) VALUES ($1,$2,$3,$4)',
      [userId, 'CONVERT_NXO', `Converted ${nxoAmount} NXO to Virtual`, `+ ₹${virtualGain.toFixed(2)} Virtual`],
    );

    await client.query('COMMIT');
    return { nxo_balance: Number(rows[0].nxo_balance), virtual_balance: Number(rows[0].virtual_balance) };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
