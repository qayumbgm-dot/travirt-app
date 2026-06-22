import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { execFile } from 'child_process';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import * as admin from '../../services/admin.service';
import { logAction } from '../../services/audit.service';

const setRoleSchema         = z.object({ role:   z.enum(['user', 'admin', 'banned']) });
const setTicketStatusSchema = z.object({ status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']) });

const requireAdmin = async (req: FastifyRequest, reply: FastifyReply) => {
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return reply.code(403).send({ error: 'Forbidden' });
  }
};

export const adminRoutes = async (fastify: FastifyInstance) => {
  const auth = { preHandler: [fastify.authenticate, requireAdmin] };

  // Platform overview stats
  fastify.get('/stats', auth, async (_req, reply) => {
    const stats = await admin.getPlatformStats();
    return reply.send(stats);
  });

  // Paginated user list
  fastify.get('/users', auth, async (req: FastifyRequest, reply) => {
    const { page = '1', limit = '20', search = '' } = req.query as Record<string, string>;
    const result = await admin.listUsers(
      Math.max(1, parseInt(page) || 1),
      Math.min(100, parseInt(limit) || 20),
      search,
    );
    return reply.send(result);
  });

  // Update user role (ban / restore / promote)
  fastify.patch('/users/:id', auth, async (req: FastifyRequest, reply) => {
    const { id } = req.params as { id: string };
    const parsed = setRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'role must be one of: user, admin, banned' });
    }
    const { role } = parsed.data;
    await admin.setUserRole(id, role);
    logAction(req.user.sub, 'USER_ROLE_CHANGED', 'users', { targetId: id, newRole: role }, req.ip);
    return reply.send({ success: true });
  });

  // All support tickets (admin sees everyone's)
  fastify.get('/tickets', auth, async (req: FastifyRequest, reply) => {
    const { status } = req.query as { status?: string };
    const tickets = await admin.listAllTickets(status);
    return reply.send(tickets);
  });

  // Update ticket status
  fastify.patch('/tickets/:id', auth, async (req: FastifyRequest, reply) => {
    const { id } = req.params as { id: string };
    const parsed = setTicketStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'status must be one of: OPEN, IN_PROGRESS, RESOLVED, CLOSED' });
    }
    const { status } = parsed.data;
    await admin.updateTicketStatus(id, status);
    logAction(req.user.sub, 'TICKET_STATUS_CHANGED', 'support_tickets', { ticketId: id, status }, req.ip);
    return reply.send({ success: true });
  });

  // Audit log viewer
  fastify.get('/audit', auth, async (req: FastifyRequest, reply) => {
    const { userId, action, limit = '100' } = req.query as Record<string, string>;
    const rows = await admin.getAuditLog(userId, action, parseInt(limit) || 100);
    return reply.send(rows);
  });

  // Backup status — lists local backups and their sizes
  fastify.get('/backups', auth, async (_req, reply) => {
    const BACKUP_DIR = process.env.BACKUP_DIR ?? '/var/backups/travirt';
    try {
      const files = await readdir(BACKUP_DIR);
      const backups = await Promise.all(
        files
          .filter((f) => f.startsWith('travirt_pg_') && (f.endsWith('.sql.gz') || f.endsWith('.sql.gz.enc')))
          .sort()
          .reverse()
          .slice(0, 30)
          .map(async (f) => {
            const s = await stat(join(BACKUP_DIR, f));
            return { name: f, size: s.size, created_at: s.mtime.toISOString() };
          }),
      );
      return reply.send({ backup_dir: BACKUP_DIR, count: backups.length, backups });
    } catch {
      return reply.send({ backup_dir: BACKUP_DIR, count: 0, backups: [] });
    }
  });

  // Trigger a manual backup (runs backup.sh as a subprocess)
  fastify.post('/backups/trigger', auth, async (req: FastifyRequest, reply) => {
    const BACKUP_SCRIPT = process.env.BACKUP_SCRIPT ?? '/opt/travirt/deploy/backup.sh';
    logAction(req.user.sub, 'BACKUP_TRIGGERED', 'system', {}, req.ip);
    // Fire-and-forget — backup runs in background; response is immediate
    execFile(BACKUP_SCRIPT, [], { timeout: 600_000 }, (err) => {
      if (err) console.error('[admin] Manual backup failed:', err.message);
      else console.log('[admin] Manual backup completed');
    });
    return reply.code(202).send({ message: 'Backup started in background. Check /var/log/travirt/backup.log for progress.' });
  });
};
