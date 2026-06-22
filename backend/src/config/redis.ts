import Redis from 'ioredis';
import { env } from './env';

// Upstash requires TLS. ioredis only enables TLS automatically for the
// `rediss://` scheme — so if the URL is a plain `redis://` Upstash endpoint
// (a common copy/paste mistake), force TLS on so the connection succeeds.
const url = env.REDIS_URL;
const isUpstash = /\.upstash\.io/i.test(url);
const needsTls = url.startsWith('rediss://') || isUpstash;

export const redis = new Redis(url, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  ...(needsTls ? { tls: {} } : {}),
});

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

redis.on('connect', () => {
  console.log('[Redis] Connected');
});
