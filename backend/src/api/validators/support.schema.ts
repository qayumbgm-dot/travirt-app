import { z } from 'zod';

export const createTicketSchema = z.object({
  subject:  z.string().trim().min(1, 'subject is required').max(200),
  message:  z.string().trim().min(1, 'message is required').max(5000),
  category: z.string().trim().max(50).default('General'),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
