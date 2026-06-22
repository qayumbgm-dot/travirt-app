import { Pool } from 'pg';
import { env } from '../config/env';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,  // Neon free tier needs up to 10s to wake from suspension
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});
