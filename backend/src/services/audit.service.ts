import { pool } from '../database/pool';

export const logAction = (
  userId: string | null,
  action: string,
  resource: string,
  detail?: Record<string, unknown>,
  ip?: string,
): void => {
  pool.query(
    `INSERT INTO audit_log (user_id, action, resource, detail_json, ip_address)
     VALUES ($1, $2, $3, $4::jsonb, $5)`,
    [userId, action, resource, detail ? JSON.stringify(detail) : null, ip ?? null],
  ).catch((err) => console.error('[audit] Write failed:', err));
};
