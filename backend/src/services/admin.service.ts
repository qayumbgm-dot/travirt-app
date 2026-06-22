import { pool } from '../database/pool';
import { cacheGet, cacheSet, cacheDel } from './cache.service';

export interface AdminUserRow {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  role: string;
  is_verified: boolean;
  created_at: Date;
  last_login_at: Date | null;
  virtual_balance: number | null;
  order_count: number;
}

export interface PlatformStats {
  totalUsers: number;
  usersToday: number;
  totalOrders: number;
  ordersToday: number;
  openTickets: number;
  totalTickets: number;
}

const STATS_CACHE_KEY = 'admin:platform_stats';

export const getPlatformStats = async (): Promise<PlatformStats> => {
  const cached = await cacheGet<PlatformStats>(STATS_CACHE_KEY);
  if (cached) return cached;

  const [users, orders, tickets] = await Promise.all([
    pool.query<{ total: string; today: string }>(`
      SELECT
        COUNT(*)::text                                                                AS total,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day')::text         AS today
      FROM users
    `),
    pool.query<{ total: string; today: string }>(`
      SELECT
        COUNT(*)::text                                                                AS total,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day')::text         AS today
      FROM orders
    `),
    pool.query<{ total: string; open: string }>(`
      SELECT
        COUNT(*)::text                                                                AS total,
        COUNT(*) FILTER (WHERE status = 'OPEN')::text                                AS open
      FROM support_tickets
    `),
  ]);

  const result: PlatformStats = {
    totalUsers:   parseInt(users.rows[0]?.total   ?? '0'),
    usersToday:   parseInt(users.rows[0]?.today   ?? '0'),
    totalOrders:  parseInt(orders.rows[0]?.total  ?? '0'),
    ordersToday:  parseInt(orders.rows[0]?.today  ?? '0'),
    totalTickets: parseInt(tickets.rows[0]?.total ?? '0'),
    openTickets:  parseInt(tickets.rows[0]?.open  ?? '0'),
  };
  await cacheSet(STATS_CACHE_KEY, result, 60);
  return result;
};

export const invalidatePlatformStatsCache = (): Promise<void> =>
  cacheDel(STATS_CACHE_KEY);

export const listUsers = async (
  page: number,
  limit: number,
  search: string,
): Promise<{ users: AdminUserRow[]; total: number }> => {
  const offset = (page - 1) * limit;
  const searchParam = search.trim() ? `%${search.trim()}%` : '%';

  const [rows, countRow] = await Promise.all([
    pool.query<AdminUserRow>(`
      SELECT
        u.id, u.user_id, u.email, u.display_name, u.role,
        u.is_verified, u.created_at, u.last_login_at,
        pb.virtual_balance,
        COUNT(o.id)::int AS order_count
      FROM users u
      LEFT JOIN portfolio_balances pb ON pb.user_id = u.id
      LEFT JOIN orders o              ON o.user_id  = u.id
      WHERE u.user_id ILIKE $1 OR u.email ILIKE $1 OR COALESCE(u.display_name, '') ILIKE $1
      GROUP BY u.id, pb.virtual_balance
      ORDER BY u.created_at DESC
      LIMIT $2 OFFSET $3
    `, [searchParam, limit, offset]),

    pool.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count FROM users
      WHERE user_id ILIKE $1 OR email ILIKE $1 OR COALESCE(display_name, '') ILIKE $1
    `, [searchParam]),
  ]);

  return { users: rows.rows, total: parseInt(countRow.rows[0]?.count ?? '0') };
};

export const setUserRole = async (id: string, role: string): Promise<void> => {
  await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
};

export interface AdminTicketRow {
  id: string;
  user_id: string;
  user_user_id: string;
  email: string;
  subject: string;
  category: string | null;
  status: string;
  created_at: Date;
}

export const listAllTickets = async (status?: string): Promise<AdminTicketRow[]> => {
  const params: unknown[] = [];
  let where = 'WHERE TRUE';
  if (status) {
    params.push(status);
    where += ` AND t.status = $${params.length}`;
  }

  const { rows } = await pool.query<AdminTicketRow>(`
    SELECT
      t.id, t.user_id, u.user_id AS user_user_id, u.email,
      t.subject, t.category, t.status, t.created_at
    FROM support_tickets t
    JOIN users u ON u.id = t.user_id
    ${where}
    ORDER BY t.created_at DESC
    LIMIT 200
  `, params);

  return rows;
};

export const updateTicketStatus = async (id: string, status: string): Promise<void> => {
  await pool.query(
    'UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2',
    [status, id],
  );
};

export interface AuditRow {
  id: string;
  action: string;
  resource: string;
  detail_json: unknown;
  ip_address: string | null;
  created_at: Date;
  user_handle: string | null;
  email: string | null;
}

export const getAuditLog = async (
  userHandle?: string,
  action?: string,
  limit = 100,
): Promise<AuditRow[]> => {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (userHandle) {
    params.push(userHandle);
    conditions.push(`u.user_id = $${params.length}`);
  }
  if (action) {
    params.push(action);
    conditions.push(`a.action = $${params.length}`);
  }

  params.push(Math.min(limit, 500));
  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const { rows } = await pool.query<AuditRow>(`
    SELECT
      a.id, a.action, a.resource, a.detail_json,
      a.ip_address, a.created_at,
      u.user_id AS user_handle,
      u.email
    FROM audit_log a
    LEFT JOIN users u ON u.id = a.user_id
    ${where}
    ORDER BY a.created_at DESC
    LIMIT $${params.length}
  `, params);

  return rows;
};
