import { pool } from '../database/pool';

export const getSettings = async (userId: string): Promise<Record<string, unknown>> => {
  const { rows } = await pool.query<{ settings_json: Record<string, unknown> }>(
    'SELECT settings_json FROM user_settings WHERE user_id = $1',
    [userId],
  );
  return rows[0]?.settings_json ?? {};
};

export const saveSettings = async (userId: string, settings: Record<string, unknown>): Promise<void> => {
  await pool.query(
    `INSERT INTO user_settings (user_id, settings_json)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (user_id) DO UPDATE SET settings_json = $2::jsonb, updated_at = NOW()`,
    [userId, JSON.stringify(settings)],
  );
};
