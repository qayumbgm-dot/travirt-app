import { describe, it, expect, vi } from 'vitest';

// Mock the pool before importing the module
vi.mock('../database/pool', () => ({
  pool: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
  },
}));

import { logAction } from '../services/audit.service';
import { pool } from '../database/pool';

describe('logAction', () => {
  it('calls pool.query with the correct parameters', () => {
    logAction('user-uuid-123', 'USER_LOGIN', 'users', { userId: 'TESTER1' }, '127.0.0.1');

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO audit_log'),
      expect.arrayContaining(['user-uuid-123', 'USER_LOGIN', 'users']),
    );
  });

  it('handles null userId (unauthenticated action)', () => {
    expect(() => logAction(null, 'HEALTH_CHECK', 'system')).not.toThrow();
  });

  it('does not throw if pool.query rejects (fire-and-forget)', async () => {
    (pool.query as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('DB down'));
    expect(() => logAction('uid', 'ACTION', 'resource')).not.toThrow();
  });
});
