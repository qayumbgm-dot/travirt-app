import { FastifyRequest, FastifyReply } from 'fastify';
import * as wl from '../../services/watchlist.service';
import { watchlistNameSchema, addSymbolSchema, setNoteSchema } from '../validators/watchlist.schema';

export const getAll = async (req: FastifyRequest, reply: FastifyReply) => {
  return reply.send(await wl.getUserWatchlists(req.user.sub));
};

export const create = async (req: FastifyRequest, reply: FastifyReply) => {
  const parsed = watchlistNameSchema.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.errors[0].message });
  return reply.code(201).send(await wl.createWatchlist(req.user.sub, parsed.data.name));
};

export const rename = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  const parsed = watchlistNameSchema.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.errors[0].message });
  const ok = await wl.renameWatchlist(req.user.sub, id, parsed.data.name);
  if (!ok) return reply.code(404).send({ error: 'Watchlist not found' });
  return reply.code(204).send();
};

export const remove = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  const ok = await wl.deleteWatchlist(req.user.sub, id);
  if (!ok) return reply.code(404).send({ error: 'Watchlist not found' });
  return reply.code(204).send();
};

export const createGroup = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  const parsed = watchlistNameSchema.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.errors[0].message });
  return reply.code(201).send(await wl.createGroup(id, req.user.sub, parsed.data.name));
};

export const deleteGroup = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id, groupId } = req.params as { id: string; groupId: string };
  const ok = await wl.deleteGroup(groupId, req.user.sub);
  if (!ok) return reply.code(404).send({ error: 'Group not found' });
  return reply.code(204).send();
};

export const addSymbol = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  const parsed = addSymbolSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Validation error', details: parsed.error.flatten() });
  }
  return reply.code(201).send(
    await wl.addSymbol(id, req.user.sub, parsed.data.symbol, parsed.data.exchange, parsed.data.groupId),
  );
};

export const removeSymbol = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id, symbolId } = req.params as { id: string; symbolId: string };
  const ok = await wl.removeSymbol(symbolId, req.user.sub);
  if (!ok) return reply.code(404).send({ error: 'Symbol not found' });
  return reply.code(204).send();
};

export const setNote = async (req: FastifyRequest, reply: FastifyReply) => {
  const { symbolId } = req.params as { id: string; symbolId: string };
  const parsed = setNoteSchema.safeParse(req.body);
  const notes = parsed.success ? parsed.data.notes : '';
  await wl.setSymbolNote(symbolId, req.user.sub, notes);
  return reply.code(204).send();
};
