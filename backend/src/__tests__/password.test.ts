import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../auth/password';

// Note: bcrypt cost factor is 12 in production; these tests are intentionally
// slow (~200ms each) because they use the real hash algorithm.

describe('hashPassword', () => {
  it('produces a bcrypt hash string', async () => {
    const hash = await hashPassword('MySecurePass1');
    expect(hash).toMatch(/^\$2[ab]\$12\$/);
  });

  it('produces a different hash each call (random salt)', async () => {
    const hash1 = await hashPassword('SamePassword1');
    const hash2 = await hashPassword('SamePassword1');
    expect(hash1).not.toBe(hash2);
  });

  it('returns a 60-character hash (standard bcrypt length)', async () => {
    const hash = await hashPassword('AnyPassword1');
    expect(hash).toHaveLength(60);
  });
});

describe('verifyPassword', () => {
  it('returns true when the plain password matches the hash', async () => {
    const plain = 'CorrectHorse99';
    const hash  = await hashPassword(plain);
    expect(await verifyPassword(plain, hash)).toBe(true);
  });

  it('returns false for a wrong password', async () => {
    const hash = await hashPassword('CorrectHorse99');
    expect(await verifyPassword('WrongPassword1', hash)).toBe(false);
  });

  it('returns false for an empty string', async () => {
    const hash = await hashPassword('SomePass1');
    expect(await verifyPassword('', hash)).toBe(false);
  });

  it('returns false when password is correct but hash belongs to a different input', async () => {
    const hash = await hashPassword('SecretA1');
    expect(await verifyPassword('SecretB1', hash)).toBe(false);
  });
});
