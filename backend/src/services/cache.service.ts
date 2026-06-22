import { redis } from '../config/redis';

// Thin Redis cache wrapper — all methods swallow errors so a Redis outage
// never crashes the application; callers fall back to the DB naturally.

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const cacheSet = async (
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> => {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch { /* non-fatal */ }
};

export const cacheDel = async (...keys: string[]): Promise<void> => {
  try {
    if (keys.length) await redis.del(...keys);
  } catch { /* non-fatal */ }
};

// Delete all keys matching a glob pattern (e.g. 'leaderboard:*')
export const cacheInvalidatePattern = async (pattern: string): Promise<void> => {
  try {
    let cursor = '0';
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      if (keys.length) await redis.del(...keys);
    } while (cursor !== '0');
  } catch { /* non-fatal */ }
};
