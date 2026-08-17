import type { Request, Response } from 'express';
import { query, queryOne } from '../database/connection.js';
import { ApiError } from '../utils/errors.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken, signResetToken, verifyResetToken } from '../utils/token.js';
import { persistImages } from '../services/upload.service.js';
import { maskId } from '../utils/mask.js';
import { env } from '../config/env.js';

export interface SafeUser {
  id: string;
  fullName: string;
  email: string;
  college: string;
  studentId: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  status: string;
  createdAt: string;
}

function toSafeUser(row: Record<string, unknown>): SafeUser {
  return {
    id: String(row.id),
    fullName: String(row.full_name),
    email: String(row.email),
    college: String(row.college || ''),
    studentId: row.student_id ? String(row.student_id) : null,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    bio: row.bio ? String(row.bio) : null,
    role: String(row.role),
    status: String(row.status),
    createdAt: String(row.created_at),
  };
}

export async function register(req: Request, res: Response): Promise<void> {
  const body = req.validated as {
    fullName: string;
    email: string;
    password: string;
    college: string;
    studentId?: string | null;
  };

  const existing = await queryOne(
    `SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL`,
    [body.email.toLowerCase()],
  );
  if (existing) throw ApiError.conflict('An account with this email already exists', 'EMAIL_TAKEN');

  const passwordHash = await hashPassword(body.password);
  const user = await queryOne(
    `INSERT INTO users (full_name, email, password_hash, college, student_id)
     VALUES ($1, $2, $3, $4, NULLIF($5, ''))
     RETURNING id, full_name, email, college, student_id, avatar_url, bio, role, status, created_at`,
    [body.fullName.trim(), body.email.toLowerCase(), passwordHash, body.college.trim(), body.studentId || ''],
  );
  if (!user) throw ApiError.badRequest('Could not create account');

  const token = signToken({ userId: String(user.id), role: String(user.role) });
  res.status(201).json({ token, user: toSafeUser(user) });
}

export async function login(req: Request, res: Response): Promise<void> {
  const body = req.validated as { email: string; password: string };

  const user = await queryOne(
    `SELECT id, full_name, email, password_hash, college, student_id, avatar_url, role, status, created_at
     FROM users WHERE email = $1 AND deleted_at IS NULL`,
    [body.email.toLowerCase()],
  );
  if (!user) throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');

  const ok = await verifyPassword(body.password, String(user.password_hash));
  if (!ok) throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');

  if (user.status === 'suspended') {
    throw ApiError.forbidden('Your account has been suspended. Contact campus administration.', 'ACCOUNT_SUSPENDED');
  }

  await query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [user.id]);

  const token = signToken({ userId: String(user.id), role: String(user.role) });
  res.json({ token, user: toSafeUser(user) });
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await queryOne(
`SELECT id, full_name, email, college, student_id, avatar_url, bio, role, status, created_at
     FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [req.user!.id],
  );
  if (!user) throw ApiError.unauthorized('Account not found');
  res.json({ user: toSafeUser(user) });
}

/**
 * Minimal public profile for another user. Only safe, non-identifying fields
 * are returned: never email, phone, raw student ID or private claim data.
 */
export async function publicProfile(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = await queryOne<Record<string, unknown>>(
    `SELECT id, full_name, college, avatar_url, bio, student_id, created_at,
            (SELECT COUNT(*)::int FROM claims c WHERE c.claimant_id = u.id AND c.status = 'returned') AS successful_returns,
            (SELECT COUNT(*)::int FROM items i WHERE i.user_id = u.id AND i.deleted_at IS NULL AND i.status != 'returned') AS active_listings
     FROM users u WHERE u.id = $1 AND u.deleted_at IS NULL`,
    [id],
  );
  if (!user) throw ApiError.notFound('User not found');
  res.json({
    user: {
      id: String(user.id),
      fullName: String(user.full_name),
      college: String(user.college || ''),
      avatarUrl: user.avatar_url ? String(user.avatar_url) : null,
      bio: user.bio ? String(user.bio) : null,
      // Never expose the raw student ID — only a masked version.
      studentIdMasked: maskId(user.student_id as string | null),
      joinedAt: user.created_at,
      successfulReturns: Number(user.successful_returns ?? 0),
      activeListings: Number(user.active_listings ?? 0),
    },
  });
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const body = req.validated as {
    fullName?: string;
    college?: string;
    studentId?: string | null;
    bio?: string | null;
  };

  const avatarFile = (req as Request & { file?: Express.Multer.File }).file;
  let avatarUrl: string | null = null;
  if (avatarFile) {
    const [img] = await persistImages([avatarFile]);
    avatarUrl = img.url;
  }

  const sets: string[] = [];
  const params: unknown[] = [];
  if (body.fullName !== undefined) {
    params.push(body.fullName.trim());
    sets.push(`full_name = $${params.length}`);
  }
  if (body.college !== undefined) {
    params.push(body.college.trim());
    sets.push(`college = $${params.length}`);
  }
  if (body.studentId !== undefined) {
    params.push(body.studentId || null);
    sets.push(`student_id = $${params.length}`);
  }
  if (body.bio !== undefined) {
    params.push(body.bio || null);
    sets.push(`bio = $${params.length}`);
  }
  if (avatarUrl) {
    params.push(avatarUrl);
    sets.push(`avatar_url = $${params.length}`);
  }
  if (sets.length === 0) throw ApiError.badRequest('Nothing to update');

  params.push(req.user!.id);
  const user = await queryOne(
    `UPDATE users SET ${sets.join(', ')}, updated_at = now()
     WHERE id = $${params.length}
     RETURNING id, full_name, email, college, student_id, avatar_url, bio, role, status, created_at`,
    params,
  );
  res.json({ user: toSafeUser(user!) });
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.validated as { email: string };

  const user = await queryOne(`SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL`, [
    email.toLowerCase(),
  ]);

  // Always respond the same way to avoid leaking which emails exist.
  if (!user) {
    res.json({
      message: 'If an account exists for this email, a password reset link has been sent.',
    });
    return;
  }

  const token = signResetToken(String(user.id));
  await query(
    `UPDATE users SET reset_token = $1, reset_token_expires_at = now() + interval '1 hour' WHERE id = $2`,
    [token, user.id],
  );

  const resetUrl = `${env.clientUrl}/reset-password?token=${token}`;
  // In development there is no SMTP server, so the reset link is returned to the client
  // (and would be emailed in production via a transactional email provider).
  if (!env.isProd) {
    console.log(`[auth] password reset link for ${email}: ${resetUrl}`);
  }

  res.json({
    message: 'If an account exists for this email, a password reset link has been sent.',
    ...(env.isProd ? {} : { devResetUrl: resetUrl }),
  });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, password } = req.validated as { token: string; password: string };

  let userId: string;
  try {
    userId = verifyResetToken(token);
  } catch {
    throw ApiError.badRequest('This reset link is invalid or has expired', 'INVALID_RESET_TOKEN');
  }

  const user = await queryOne(
    `SELECT id FROM users WHERE id = $1 AND reset_token = $2 AND reset_token_expires_at > now() AND deleted_at IS NULL`,
    [userId, token],
  );
  if (!user) throw ApiError.badRequest('This reset link is invalid or has expired', 'INVALID_RESET_TOKEN');

  const passwordHash = await hashPassword(password);
  await query(`UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires_at = NULL WHERE id = $2`, [
    passwordHash,
    userId,
  ]);

  res.json({ message: 'Your password has been reset. You can now log in.' });
}
