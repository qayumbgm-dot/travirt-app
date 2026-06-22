import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AccessTokenPayload {
  sub: string;      // user UUID (primary key)
  userId: string;   // display handle e.g. TRDR001
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export const signAccessToken = (payload: Omit<AccessTokenPayload, 'iat' | 'exp'>): string =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
};
