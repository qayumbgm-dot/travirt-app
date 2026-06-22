import { Pool } from 'pg';
import { env } from '../config/env';

// Add connect_timeout=10 so the PostgreSQL socket-level handshake fails fast
// instead of hanging until Render's proxy closes the HTTP connection.
const dbUrl = env.DATABASE_URL.includes('connect_timeout')
  ? env.DATABASE_URL
  : env.DATABASE_URL + (env.DATABASE_URL.includes('?') ? '&' : '?') + 'connect_timeout=10';

export const pool = new Pool({
  connectionString: dbUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});
