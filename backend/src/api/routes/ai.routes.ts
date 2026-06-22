import { FastifyInstance } from 'fastify';
import { fetchHeadlines, summarizeNews } from '../../services/ai.service';

export const aiRoutes = async (fastify: FastifyInstance) => {
  // GET /api/ai/news  — fetch headlines + AI summary in one call
  fastify.get('/news', async (_req, reply) => {
    const result = await fetchHeadlines();
    const summary = await summarizeNews(result.headlines);
    return reply.send({ ...result, summary });
  });

  // GET /api/ai/headlines  — raw headlines only (faster, no Gemini call)
  fastify.get('/headlines', async (_req, reply) => {
    const result = await fetchHeadlines();
    return reply.send(result);
  });

  // POST /api/ai/summarize  — summarize provided headlines
  fastify.post('/summarize', async (req, reply) => {
    const { headlines } = req.body as { headlines?: string[] };
    if (!Array.isArray(headlines) || headlines.length === 0) {
      return reply.code(400).send({ error: 'headlines array is required' });
    }
    const summary = await summarizeNews(headlines);
    return reply.send({ summary });
  });
};
