import { z } from 'zod';

export const createAlertSchema = z.object({
  symbol:   z.string().min(1).max(50),
  exchange: z.string().min(1).max(10).default('NSE'),
  property: z.enum(['LTP', 'CHANGE', 'CHANGE%', 'VOLUME', 'HIGH', 'LOW']),
  operator: z.enum(['>', '<', '>=', '<=', '=']),
  value:    z.number(),
  type:     z.enum(['ALERT_ONLY', 'ATO']).default('ALERT_ONLY'),
});

export type CreateAlertInput = z.infer<typeof createAlertSchema>;
