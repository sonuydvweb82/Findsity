import type { Request, Response } from 'express';
import { query, queryOne } from '../database/connection.js';
import { ApiError } from '../utils/errors.js';
import { notifyUser, notifyAdmins } from '../services/notification.service.js';
import { maskId } from '../utils/mask.js';

export async function stats(req: Request, res: Response): Promise<void> {
  const totalUsers = await queryOne<{ count: string }>(`SELECT COUNT(*)::int AS count FROM users WHERE deleted_at IS NULL`);
  const totalLost = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM items WHERE type = 'lost' AND deleted_at IS NULL`,
  );
  const totalFound = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM items WHERE type = 'found' AND deleted_at IS NULL`,
  );
  const returned = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM items WHERE status = 'returned' AND deleted_at IS NULL`,
  );
  const activeClaims = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM claims WHERE status IN ('pending', 'more_info', 'approved', 'escalated')`,
  );
  const pendingReports = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM reports WHERE status = 'pending'`,
  );
  const suspendedUsers = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM users WHERE status = 'suspended' AND deleted_at IS NULL`,
  );

  const totalResolved = Number(returned?.count || 0);
  const totalDecided = totalResolved + Number(await queryOne<{ count: string }>(`SELECT COUNT(*)::int AS count FROM claims WHERE status = 'rejected'`).then((r) => r?.count || 0));
  const successRate = totalDecided > 0 ? Math.round((totalResolved / totalDecided) * 100) : 0;

  res.json({
    stats: {
      totalUsers: Number(totalUsers?.count || 0),
      totalLost: Number(totalLost?.count || 0),
      totalFound: Number(totalFound?.count || 0),
      returned: totalResolved,
      activeClaims: Number(activeClaims?.count || 0),
      pendingReports: Number(pendingReports?.count || 0),
      suspendedUsers: Number(suspendedUsers?.count || 0),
      successRate,
    },
  });
}

export async function charts(req: Request, res: Response): Promise<void> {
  const lostVsFound = await query<{ label: string; count: string }>(
    `SELECT type AS label, COUNT(*)::int AS count FROM items WHERE deleted_at IS NULL GROUP BY type`,
  );

  const returnsOverTime = await query<{ date: string; count: string }>(
    `SELECT to_char(date_trunc('day', updated_at), 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
     FROM items WHERE status = 'returned' AND deleted_at IS NULL
     GROUP BY 1 ORDER BY 1 DESC LIMIT 30`,
  );

  const popularCategories = await query<{ name: string; count: string }>(
    `SELECT c.name, COUNT(*)::int AS count
     FROM items i JOIN categories c ON c.id = i.category_id
     WHERE i.deleted_at IS NULL
     GROUP BY c.name ORDER BY count DESC LIMIT 10`,
  );

  const claimsByStatus = await query<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::int AS count FROM claims GROUP BY status`,
  );

  const claimsByRisk = await query<{ risk_level: string; count: string }>(
    `SELECT risk_level, COUNT(*)::int AS count FROM claims GROUP BY risk_level`,
  );

  res.json({ charts: { lostVsFound, returnsOverTime, popularCategories, claimsByStatus, claimsByRisk } });
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  const { q = '', page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (Number(page) - 1) * Number(limit);
  const search = `%${q}%`;

  const rows = await query<Record<string, unknown>>(
    `SELECT id, full_name, email, college, role, status, avatar_url, created_at, last_login_at,
            (SELECT COUNT(*)::int FROM items i WHERE i.user_id = users.id AND i.deleted_at IS NULL) AS item_count,
            (SELECT COUNT(*)::int FROM claims cl WHERE cl.claimant_id = users.id) AS claim_count
     FROM users
     WHERE deleted_at IS NULL AND (full_name ILIKE $1 OR email ILIKE $1 OR college ILIKE $1)
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [search, Number(limit), offset],
  );

  const total = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM users WHERE deleted_at IS NULL AND (full_name ILIKE $1 OR email ILIKE $1 OR college ILIKE $1)`,
    [search],
  );

  res.json({ users: rows, total: Number(total?.count || 0), page: Number(page) });
}

export async function updateUserStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { status } = req.body as { status: string };

  if (id === req.user!.id) throw ApiError.badRequest('You cannot suspend your own account');
  if (!['active', 'suspended'].includes(status)) throw ApiError.badRequest('Invalid status');

  const user = await queryOne<{ id: string; role: string }>(`SELECT id, role FROM users WHERE id = $1 AND deleted_at IS NULL`, [id]);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === 'admin' && status === 'suspended') throw ApiError.badRequest('Admin accounts cannot be suspended');

  await query(`UPDATE users SET status = $1 WHERE id = $2`, [status, id]);
  await query(
    `INSERT INTO admin_actions (admin_id, action, target_type, target_id, details)
     VALUES ($1, $2, 'user', $3, $4::jsonb)`,
    [req.user!.id, status === 'suspended' ? 'suspend_user' : 'restore_user', id, JSON.stringify({ status })],
  );
  if (status === 'suspended') {
    await notifyUser(id, 'system', 'Your account has been suspended', 'Contact campus administration for details.');
  } else {
    await notifyUser(id, 'system', 'Your account has been reactivated', 'You can log in again.');
  }

  res.json({ message: `User ${status === 'suspended' ? 'suspended' : 'reactivated'}` });
}

export async function adminListItems(req: Request, res: Response): Promise<void> {
  const { q = '', status = '', page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (Number(page) - 1) * Number(limit);
  const search = `%${q}%`;
  const where: string[] = [`i.deleted_at IS NULL`];
  const params: unknown[] = [];

  if (q) {
    params.push(search);
    where.push(`(i.name ILIKE $${params.length} OR i.uid ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }
  if (status && status !== 'all') {
    params.push(status);
    where.push(`i.status = $${params.length}`);
  }

  const rows = await query<Record<string, unknown>>(
    `SELECT i.id, i.uid, i.type, i.status, i.name, i.created_at, i.updated_at,
            c.name AS category_name, u.full_name AS owner_name, u.email AS owner_email,
            (SELECT url FROM item_images im WHERE im.item_id = i.id ORDER BY im.position, im.id LIMIT 1) AS cover_url
     FROM items i
     JOIN categories c ON c.id = i.category_id
     JOIN users u ON u.id = i.user_id
     WHERE ${where.join(' AND ')}
     ORDER BY i.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, Number(limit), offset],
  );

  const total = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM items i JOIN users u ON u.id = i.user_id WHERE ${where.join(' AND ')}`,
    params,
  );

  res.json({ items: rows, total: Number(total?.count || 0), page: Number(page) });
}

export async function adminDeleteItem(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const item = await queryOne<{ id: string }>(`SELECT id FROM items WHERE id = $1 AND deleted_at IS NULL`, [id]);
  if (!item) throw ApiError.notFound('Item not found');

  await query(`UPDATE items SET deleted_at = now() WHERE id = $1`, [id]);
  await query(
    `INSERT INTO admin_actions (admin_id, action, target_type, target_id) VALUES ($1, 'delete_item', 'item', $2)`,
    [req.user!.id, id],
  );

  res.json({ message: 'Item removed from the platform' });
}

export async function adminListClaims(req: Request, res: Response): Promise<void> {
  const { status = '', risk = '', page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (Number(page) - 1) * Number(limit);
  const where: string[] = ['1 = 1'];
  const params: unknown[] = [];

  if (status && status !== 'all') {
    params.push(status);
    where.push(`cl.status = $${params.length}`);
  }
  if (risk && risk !== 'all') {
    params.push(risk);
    where.push(`cl.risk_level = $${params.length}`);
  }

  const rows = await query<Record<string, unknown>>(
    `SELECT cl.id, cl.uid, cl.status, cl.risk_level, cl.created_at, cl.updated_at,
            i.name AS item_name, i.uid AS item_uid,
            u.full_name AS claimant_name, u.email AS claimant_email,
            (SELECT url FROM item_images im WHERE im.item_id = i.id ORDER BY im.position, im.id LIMIT 1) AS cover_url
     FROM claims cl
     JOIN items i ON i.id = cl.item_id
     JOIN users u ON u.id = cl.claimant_id
     WHERE ${where.join(' AND ')}
     ORDER BY cl.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, Number(limit), offset],
  );

  const total = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM claims cl WHERE ${where.join(' AND ')}`,
    params,
  );

  res.json({ claims: rows, total: Number(total?.count || 0), page: Number(page) });
}

export async function adminResolveReport(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { decision, note = '' } = req.body as { decision: string; note?: string };

  if (!['resolved', 'rejected'].includes(decision)) throw ApiError.badRequest('Invalid decision');

  const report = await queryOne<{ id: string; reporter_id: string; target_type: string; target_id: string }>(
    `SELECT * FROM reports WHERE id = $1`,
    [id],
  );
  if (!report) throw ApiError.notFound('Report not found');

  await query(
    `UPDATE reports SET status = $1, resolution_note = $2, resolved_by = $3, updated_at = now() WHERE id = $4`,
    [decision, note, req.user!.id, id],
  );
  await query(
    `INSERT INTO admin_actions (admin_id, action, target_type, target_id, details)
     VALUES ($1, $2, 'report', $3, $4::jsonb)`,
    [req.user!.id, `resolve_report_${decision}`, id, JSON.stringify({ note })],
  );

  await notifyUser(
    report.reporter_id,
    'report_update',
    `Your report was ${decision === 'resolved' ? 'resolved' : 'not accepted'}`,
    note || 'Thank you for keeping Findsity safe.',
  );

  if (decision === 'resolved' && report.target_type === 'item') {
    const item = await queryOne<{ id: string }>(`SELECT id FROM items WHERE id = $1 AND deleted_at IS NULL`, [
      report.target_id,
    ]);
    if (item) {
      await query(`UPDATE items SET deleted_at = now() WHERE id = $1`, [report.target_id]);
      const owner = await queryOne<{ user_id: string }>(`SELECT user_id FROM items WHERE id = $1`, [report.target_id]);
      if (owner) {
        await notifyUser(String(owner.user_id), 'system', 'Your listing was removed', 'It violated our community guidelines or was reported by users.');
      }
    }
  }

  res.json({ message: `Report ${decision}` });
}

export async function listReports(req: Request, res: Response): Promise<void> {
  const { status = 'pending', page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (Number(page) - 1) * Number(limit);
  const params: unknown[] = [];
  const where: string[] = [];

  if (status && status !== 'all') {
    params.push(status);
    where.push(`r.status = $${params.length}`);
  }

  const rows = await query<Record<string, unknown>>(
    `SELECT r.id, r.target_type, r.target_id, r.reason, r.details, r.status, r.created_at, r.updated_at,
            u.full_name AS reporter_name, u.email AS reporter_email,
            ad.full_name AS resolver_name
     FROM reports r
     JOIN users u ON u.id = r.reporter_id
     LEFT JOIN users ad ON ad.id = r.resolved_by
     ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY r.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, Number(limit), offset],
  );

  const total = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM reports r ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}`,
    params,
  );

  res.json({ reports: rows, total: Number(total?.count || 0), page: Number(page) });
}

export async function adminReviewClaim(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { decision, note = '' } = req.body as { decision: 'approve' | 'reject' | 'request_info'; note?: string };

  const claim = await queryOne<Record<string, unknown>>(
    `SELECT cl.*, i.user_id AS item_user_id, i.name AS item_name
     FROM claims cl JOIN items i ON i.id = cl.item_id WHERE cl.id = $1`,
    [id],
  );
  if (!claim) throw ApiError.notFound('Claim not found');

  await query(`UPDATE claims SET admin_notes = $1 WHERE id = $2`, [note, id]);

  if (decision === 'approve') {
    if (claim.status === 'rejected' || claim.status === 'closed') throw ApiError.badRequest('This claim is no longer active');
    await query(`UPDATE claims SET status = 'approved', reviewed_by = $1, reviewed_at = now() WHERE id = $2`, [req.user!.id, id]);
    await query(`UPDATE items SET status = 'return_pending', updated_at = now() WHERE id = $1`, [claim.item_id]);
    await query(`UPDATE claims SET status = 'closed' WHERE item_id = $1 AND id != $2 AND status IN ('pending', 'more_info')`, [
      claim.item_id,
      id,
    ]);
    await query(`INSERT INTO handovers (claim_id, pickup_location, arranged_by) VALUES ($1, '', $2) ON CONFLICT (claim_id) DO NOTHING`, [
      id,
      req.user!.id,
    ]);
    await notifyUser(String(claim.claimant_id), 'claim_approved', `Your claim was approved by an administrator`, `Arrange the handover to collect your item.`, `/claims/${id}`);
    await notifyUser(String(claim.item_user_id), 'claim_approved', `An administrator approved a claim on your item`, `Arrange the handover with the claimant.`, `/claims/${id}`);
    res.json({ message: 'Claim approved' });
    return;
  }

  if (decision === 'reject') {
    await query(`UPDATE claims SET status = 'rejected', finder_notes = $1, reviewed_by = $2, reviewed_at = now() WHERE id = $3`, [note, req.user!.id, id]);
    await notifyUser(String(claim.claimant_id), 'claim_rejected', `Your claim was not approved by the administration`, note || 'The claim could not be verified.', `/claims/${id}`);
    res.json({ message: 'Claim rejected' });
    return;
  }

  await query(`UPDATE claims SET status = 'more_info', finder_notes = $1 WHERE id = $2`, [note, id]);
  await notifyUser(String(claim.claimant_id), 'claim_more_info', `More information needed for your claim`, note || 'Please provide more details.', `/claims/${id}`);
  res.json({ message: 'More information requested' });
}

export async function adminActionsLog(req: Request, res: Response): Promise<void> {
  const rows = await query<Record<string, unknown>>(
    `SELECT aa.*, u.full_name AS admin_name
     FROM admin_actions aa JOIN users u ON u.id = aa.admin_id
     ORDER BY aa.created_at DESC LIMIT 100`,
  );
  res.json({ actions: rows });
}

export async function publicStats(req: Request, res: Response): Promise<void> {
  const itemsReported = await queryOne<{ count: string }>(`SELECT COUNT(*)::int AS count FROM items WHERE deleted_at IS NULL`);
  const itemsFound = await queryOne<{ count: string }>(`SELECT COUNT(*)::int AS count FROM items WHERE type = 'found' AND deleted_at IS NULL`);
  const itemsReturned = await queryOne<{ count: string }>(`SELECT COUNT(*)::int AS count FROM items WHERE status = 'returned' AND deleted_at IS NULL`);
  const activeUsers = await queryOne<{ count: string }>(`SELECT COUNT(*)::int AS count FROM users WHERE deleted_at IS NULL AND status = 'active'`);
  res.json({
    stats: {
      itemsReported: Number(itemsReported?.count || 0),
      itemsFound: Number(itemsFound?.count || 0),
      itemsReturned: Number(itemsReturned?.count || 0),
      activeUsers: Number(activeUsers?.count || 0),
    },
  });
}

export async function adminUserDetail(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = await queryOne<Record<string, unknown>>(
    `SELECT id, full_name, email, college, student_id, avatar_url, role, status, created_at, last_login_at,
            (SELECT COUNT(*)::int FROM items i WHERE i.user_id = users.id AND i.deleted_at IS NULL) AS item_count,
            (SELECT COUNT(*)::int FROM claims cl WHERE cl.claimant_id = users.id) AS claim_count,
            (SELECT COUNT(*)::int FROM claims cl WHERE cl.claimant_id = users.id AND cl.status = 'returned') AS returned_count
     FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  if (!user) throw ApiError.notFound('User not found');
  user.student_id = maskId(user.student_id as string | null);
  res.json({ user });
}