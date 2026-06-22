import { FastifyInstance, FastifyRequest } from 'fastify';
import { pool } from '../../database/pool';
import { sendSupportAckEmail } from '../../services/email.service';
import { findUserById } from '../../services/user.service';
import { createTicketSchema } from '../validators/support.schema';

export const supportRoutes = async (fastify: FastifyInstance) => {
  const auth = { preHandler: [fastify.authenticate] };

  fastify.post('/tickets', auth, async (req: FastifyRequest, reply) => {
    const parsed = createTicketSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Validation error', details: parsed.error.flatten() });
    }
    const { subject, message, category } = parsed.data;

    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO support_tickets (user_id, subject, message, category, status)
       VALUES ($1, $2, $3, $4, 'OPEN') RETURNING id`,
      [req.user.sub, subject, message, category],
    );
    const ticketId = rows[0].id;

    findUserById(req.user.sub).then((user) => {
      if (user) sendSupportAckEmail(user.email, ticketId, subject).catch(() => {});
    }).catch(() => {});

    return reply.code(201).send({ id: ticketId, message: 'Ticket submitted. We\'ll respond within 24–48 hours.' });
  });

  fastify.get('/tickets', auth, async (req: FastifyRequest, reply) => {
    const { rows } = await pool.query(
      'SELECT id, subject, category, status, created_at FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.sub],
    );
    return reply.send(rows);
  });
};
