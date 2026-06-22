import { describe, it, expect, vi } from 'vitest';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../database/pool', () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 }) },
}));

vi.mock('../config/env', () => ({
  env: {
    NODE_ENV:                   'test',
    REFRESH_TOKEN_EXPIRES_DAYS: 30,
    JWT_SECRET:                 'test-secret-at-least-32-characters-long',
  },
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { generateRefreshToken, hashToken } from '../auth/tokens';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('generateRefreshToken', () => {
  it('returns a 128-character hex string (64 random bytes)', () => {
    const token = generateRefreshToken();
    expect(token).toHaveLength(128);
    expect(token).toMatch(/^[0-9a-f]+$/);
  });

  it('generates a different token on each call', () => {
    const t1 = generateRefreshToken();
    const t2 = generateRefreshToken();
    expect(t1).not.toBe(t2);
  });
});

describe('hashToken', () => {
  it('returns a 64-character hex string (SHA-256 output)', () => {
    const hash = hashToken('any-token-value');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic — same input always produces the same hash', () => {
    const token = 'stable-token-abc123';
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashToken('token-A')).not.toBe(hashToken('token-B'));
  });

  it('round-trips: hashing a token then comparing against a stored hash works', () => {
    const raw    = generateRefreshToken();
    const stored = hashToken(raw);
    // Simulates: server stores hash, later re-hashes incoming token and compares
    expect(hashToken(raw)).toBe(stored);
  });
});
