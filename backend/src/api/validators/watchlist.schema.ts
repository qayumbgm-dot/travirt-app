import { z } from 'zod';

export const watchlistNameSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(50, 'name must be at most 50 characters'),
});

export const addSymbolSchema = z.object({
  symbol:   z.string().trim().min(1, 'symbol is required').max(50),
  exchange: z.string().trim().min(1, 'exchange is required').max(10),
  groupId:  z.string().uuid().optional(),
});

export const setNoteSchema = z.object({
  notes: z.string().max(1000).default(''),
});
