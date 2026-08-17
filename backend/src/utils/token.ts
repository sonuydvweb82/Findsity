import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface JwtPayload {
  userId: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
  return { userId: String(decoded.userId), role: String(decoded.role) };
}

export function signResetToken(userId: string): string {
  return jwt.sign({ userId, purpose: 'password-reset' }, env.jwtSecret, { expiresIn: '1h' });
}

export function verifyResetToken(token: string): string {
  const decoded = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
  if (decoded.purpose !== 'password-reset') throw new Error('invalid token purpose');
  return String(decoded.userId);
}