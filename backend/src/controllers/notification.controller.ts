import type { Request, Response } from 'express';
import { query, queryOne } from '../database/connection.js';

export async function listNotifications(req: Request, res: Response): Promise<void> {
  const rows = await query<Record<string, unknown>>(
    `SELECT id, type, title, body, link, read_at, created_at
     FROM notifications WHERE user_id = $1
     ORDER BY created_at DESC LIMIT 50`,
    [req.user!.id],
  );
  res.json({ notifications: rows });
}

export async function unreadCount(req: Request, res: Response): Promise<void> {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
    [req.user!.id],
  );
  res.json({ count: Number(row?.count || 0) });
}

export async function markRead(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const exists = await queryOne<{ id: string }>(
    `SELECT id FROM notifications WHERE id = $1 AND user_id = $2`,
    [id, req.user!.id],
  );
  if (!exists) {
    res.status(404).json({ error: 'Notification not found', code: 'NOT_FOUND' });
    return;
  }
  await query(`UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2`, [id, req.user!.id]);
  res.json({ message: 'Notification marked as read' });
}

export async function markAllRead(req: Request, res: Response): Promise<void> {
  await query(`UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`, [req.user!.id]);
  res.json({ message: 'All notifications marked as read' });
}