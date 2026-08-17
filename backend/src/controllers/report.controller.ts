import type { Request, Response } from 'express';
import { query, queryOne } from '../database/connection.js';
import { ApiError } from '../utils/errors.js';
import { notifyAdmins } from '../services/notification.service.js';

export async function createReport(req: Request, res: Response): Promise<void> {
  const body = req.validated as { targetType: string; targetId: string; reason: string; details?: string };

  if (body.targetType === 'item') {
    const item = await queryOne<{ id: string }>(`SELECT id FROM items WHERE id = $1 AND deleted_at IS NULL`, [
      body.targetId,
    ]);
    if (!item) throw ApiError.notFound('Item not found');
  } else if (body.targetType === 'user') {
    const user = await queryOne<{ id: string }>(`SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL`, [
      body.targetId,
    ]);
    if (!user) throw ApiError.notFound('User not found');
  }

  const report = await queryOne<Record<string, unknown>>(
    `INSERT INTO reports (reporter_id, target_type, target_id, reason, details)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, status, created_at`,
    [req.user!.id, body.targetType, body.targetId, body.reason, body.details || ''],
  );

  await notifyAdmins('report_update', 'New moderation report', `A ${body.targetType} was reported for ${body.reason}.`, '/admin/reports');

  res.status(201).json({ message: 'Report submitted. Our moderation team will review it.', report });
}

export async function myReports(req: Request, res: Response): Promise<void> {
  const rows = await query<Record<string, unknown>>(
    `SELECT id, target_type, target_id, reason, details, status, created_at, updated_at
     FROM reports WHERE reporter_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [req.user!.id],
  );
  res.json({ reports: rows });
}