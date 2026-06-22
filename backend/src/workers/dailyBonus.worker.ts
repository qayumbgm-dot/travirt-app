import { pool } from '../database/pool';

// IST is UTC+5:30
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** Milliseconds from now until the next midnight IST. */
const msUntilMidnightIST = (): number => {
  const nowIstMs       = Date.now() + IST_OFFSET_MS;
  const msIntoIstDay   = nowIstMs % (24 * 60 * 60 * 1000);
  const msUntilMidnight = (24 * 60 * 60 * 1000) - msIntoIstDay;
  // Add a 5-second buffer so we land reliably after midnight, not right at it
  return msUntilMidnight + 5_000;
};

/**
 * Resets daily_bonus_claimed = FALSE for every portfolio row whose
 * daily_bonus_date is before today in IST.  Rows that were never claimed
 * (daily_bonus_date IS NULL) are also eligible immediately — no reset needed.
 */
const resetDailyBonuses = async (): Promise<void> => {
  try {
    const { rowCount } = await pool.query(
      `UPDATE portfolio_balances
       SET daily_bonus_claimed = FALSE
       WHERE daily_bonus_claimed = TRUE
         AND daily_bonus_date < (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE`,
    );
    if (rowCount && rowCount > 0) {
      console.log(`[daily-bonus] Reset ${rowCount} claimed flag(s) for new IST day`);
    }
  } catch (err) {
    console.error('[daily-bonus] Reset failed:', err);
  }
};

export const startDailyBonusWorker = (): void => {
  // Run immediately on startup to catch any resets that were missed if the
  // server was down at midnight (idempotent — only touches stale rows)
  resetDailyBonuses().catch(console.error);

  const scheduleNext = () => {
    const delay = msUntilMidnightIST();
    const nextReset = new Date(Date.now() + delay).toISOString();
    console.log(`[daily-bonus] Next reset scheduled at ${nextReset} (in ${Math.round(delay / 60_000)} min)`);

    setTimeout(async () => {
      await resetDailyBonuses();
      scheduleNext(); // re-schedule 24h later
    }, delay);
  };

  scheduleNext();
  console.log('[daily-bonus] worker started');
};
