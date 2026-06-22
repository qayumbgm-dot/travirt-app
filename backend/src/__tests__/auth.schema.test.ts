import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema } from '../api/validators/auth.schema';

describe('registerSchema', () => {
  const VALID = {
    userId: 'TESTER1',
    email: 'test@example.com',
    password: 'Password1',
  };

  it('accepts a valid registration payload', () => {
    const result = registerSchema.parse(VALID);
    expect(result.userId).toBe('TESTER1');
    expect(result.email).toBe('test@example.com');
  });

  it('rejects a user ID shorter than 4 characters', () => {
    expect(() => registerSchema.parse({ ...VALID, userId: 'AB' })).toThrow();
  });

  it('rejects a user ID longer than 20 characters', () => {
    expect(() => registerSchema.parse({ ...VALID, userId: 'A'.repeat(21) })).toThrow();
  });

  it('rejects a user ID with special characters', () => {
    expect(() => registerSchema.parse({ ...VALID, userId: 'BAD USER!' })).toThrow();
  });

  it('rejects an invalid email', () => {
    expect(() => registerSchema.parse({ ...VALID, email: 'not-an-email' })).toThrow();
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(() => registerSchema.parse({ ...VALID, password: 'Ab1' })).toThrow();
  });

  it('rejects a password with no uppercase letter', () => {
    expect(() => registerSchema.parse({ ...VALID, password: 'password1' })).toThrow();
  });

  it('rejects a password with no number', () => {
    expect(() => registerSchema.parse({ ...VALID, password: 'PasswordOnly' })).toThrow();
  });

  it('accepts an optional displayName', () => {
    const result = registerSchema.parse({ ...VALID, displayName: 'Test User' });
    expect(result.displayName).toBe('Test User');
  });
});

describe('loginSchema', () => {
  it('accepts a valid login with email identifier', () => {
    const result = loginSchema.parse({ identifier: 'user@example.com', password: 'anypass' });
    expect(result.identifier).toBe('user@example.com');
  });

  it('accepts a valid login with user ID identifier', () => {
    const result = loginSchema.parse({ identifier: 'TESTER1', password: 'anypass' });
    expect(result.identifier).toBe('TESTER1');
  });

  it('rejects an empty identifier', () => {
    expect(() => loginSchema.parse({ identifier: '', password: 'pass' })).toThrow();
  });

  it('rejects an empty password', () => {
    expect(() => loginSchema.parse({ identifier: 'user', password: '' })).toThrow();
  });
});
