import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { queryOne } from '../database/connection.js';
import { ApiError } from '../utils/errors.js';
import { env } from '../config/env.js';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  college: string;
  avatarUrl: string | null;
  createdAt: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Please log in to continue');
    }
    const token = header.slice(7);
    let payload: { userId: string; role: string };
    try {
      payload = jwt.verify(token, env.jwtSecret) as { userId: string; role: string };
    } catch {
      throw ApiError.unauthorized('Your session has expired. Please log in again.', 'TOKEN_EXPIRED');
    }

    const user = await queryOne<Record<string, unknown>>(
      `SELECT id, full_name, email, role, status, college, avatar_url, created_at
       FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [payload.userId],
    );
    if (!user) throw ApiError.unauthorized('Account not found');
    if (user.status === 'suspended') {
      throw ApiError.forbidden('Your account has been suspended. Contact campus administration.', 'ACCOUNT_SUSPENDED');
    }

    req.user = {
      id: String(user.id),
      fullName: String(user.full_name),
      email: String(user.email),
      role: String(user.role),
      status: String(user.status),
      college: String(user.college || ''),
      avatarUrl: user.avatar_url ? String(user.avatar_url) : null,
      createdAt: String(user.created_at),
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(ApiError.unauthorized());
    return;
  }
  if (req.user.role !== 'admin') {
    next(ApiError.forbidden('Admin access required'));
    return;
  }
  next();
}