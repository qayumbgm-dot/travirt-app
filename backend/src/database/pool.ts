import { Pool } from 'pg';
import { env } from '../config/env';

// Add connect_timeout=10 and client_encoding=UTF8 so the socket handshake
// fails fast and the pg client always negotiates UTF-8 with Neon (without
// this, non-ASCII characters like ₹ and × are decoded as Windows-1252).
const addParam = (url: string, param: string) =>
  url + (url.includes('?') ? '&' : '?') + param;

let dbUrl = env.DATABASE_URL;
if (!dbUrl.includes('connect_timeout'))  dbUrl = addParam(dbUrl, 'connect_timeout=10');
if (!dbUrl.includes('client_encoding'))  dbUrl = addParam(dbUrl, 'client_encoding=UTF8');

export const pool = new Pool({
  connectionString: dbUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});
