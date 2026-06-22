import { z } from 'zod';

export const createGttSchema = z.discriminatedUnion('triggerType', [
  z.object({
    triggerType:     z.literal('SINGLE'),
    symbol:          z.string().min(1).max(50),
    exchange:        z.string().min(1).max(10).default('NSE'),
    transactionType: z.enum(['BUY', 'SELL']),
    quantity:        z.number().int().positive(),
    triggerPrice:    z.number().positive(),
    limitPrice:      z.number().positive().optional(),
  }),
  z.object({
    triggerType:          z.literal('OCO'),
    symbol:               z.string().min(1).max(50),
    exchange:             z.string().min(1).max(10).default('NSE'),
    transactionType:      z.literal('SELL'),
    quantity:             z.number().int().positive(),
    stoplossTriggerPrice: z.number().positive(),
    stoplossLimitPrice:   z.number().positive().optional(),
    targetTriggerPrice:   z.number().positive(),
    targetLimitPrice:     z.number().positive().optional(),
  }),
]);

export type CreateGttInput = z.infer<typeof createGttSchema>;
