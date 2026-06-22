import { FastifyInstance } from 'fastify';
import { getLeaderboard } from '../../services/leaderboard.service';
import { cacheGet, cacheSet } from '../../services/cache.service';

const CACHE_KEY = 'leaderboard:top100';
const TTL_SECONDS = 30;

export const leaderboardRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/', async (_req, reply) => {
    const cached = await cacheGet<{ data: Awaited<ReturnType<typeof getLeaderboard>>; computedAt: number }>(CACHE_KEY);
    if (cached) return reply.send({ ...cached, cached: true });

    const data = await getLeaderboard(100);
    const computedAt = Date.now();
    await cacheSet(CACHE_KEY, { data, computedAt }, TTL_SECONDS);
    return reply.send({ data, computedAt, cached: false });
  });
};
