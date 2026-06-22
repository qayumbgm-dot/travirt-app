import bcrypt from 'bcryptjs';

const COST_FACTOR = 10;

export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, COST_FACTOR);

export const verifyPassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);
