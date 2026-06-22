import { FastifyInstance } from 'fastify';
import * as ctrl from '../controllers/watchlist.controller';

export const watchlistRoutes = async (fastify: FastifyInstance) => {
  const auth = { preHandler: [fastify.authenticate] };

  fastify.get('/', auth, ctrl.getAll);
  fastify.post('/', auth, ctrl.create);
  fastify.patch('/:id', auth, ctrl.rename);
  fastify.delete('/:id', auth, ctrl.remove);

  fastify.post('/:id/groups', auth, ctrl.createGroup);
  fastify.delete('/:id/groups/:groupId', auth, ctrl.deleteGroup);

  fastify.post('/:id/symbols', auth, ctrl.addSymbol);
  fastify.delete('/:id/symbols/:symbolId', auth, ctrl.removeSymbol);
  fastify.patch('/:id/symbols/:symbolId/note', auth, ctrl.setNote);
};
