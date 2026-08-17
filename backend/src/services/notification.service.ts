import { query } from '../database/connection.js';

export type NotificationType =
  | 'message'
  | 'claim_submitted'
  | 'claim_approved'
  | 'claim_rejected'
  | 'claim_more_info'
  | 'claim_escalated'
  | 'match_found'
  | 'handover_scheduled'
  | 'item_returned'
  | 'report_update'
  | 'system';

export async function notifyUser(
  userId: string,
  type: NotificationType,
  title: string,
  body = '',
  link = '',
): Promise<void> {
  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, body, link) VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, body, link],
    );
  } catch (err) {
    console.error('[notifications] failed to insert', err);
  }
}

export async function notifyAdmins(
  type: NotificationType,
  title: string,
  body = '',
  link = '',
): Promise<void> {
  try {
    const admins = await query<{ id: string }>(`SELECT id FROM users WHERE role = 'admin' AND status = 'active'`);
    for (const admin of admins) {
      await notifyUser(admin.id, type, title, body, link);
    }
  } catch (err) {
    console.error('[notifications] failed to notify admins', err);
  }
}