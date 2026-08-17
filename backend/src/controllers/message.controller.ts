import type { Request, Response } from 'express';
import { query, queryOne, transaction } from '../database/connection.js';
import { ApiError } from '../utils/errors.js';
import { notifyUser } from '../services/notification.service.js';

const CONVERSATION_SELECT = `
  SELECT c.id, c.created_at, c.updated_at,
         i.name AS item_name, i.uid AS item_uid, i.id AS item_id,
         CASE WHEN c.user1_id = $1 THEN u2.full_name ELSE u1.full_name END AS other_name,
         CASE WHEN c.user1_id = $1 THEN u2.avatar_url ELSE u1.avatar_url END AS other_avatar,
         CASE WHEN c.user1_id = $1 THEN u2.id ELSE u1.id END AS other_id,
         (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
         (SELECT COUNT(*)::int FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != $1 AND m.read_at IS NULL) AS unread_count
  FROM conversations c
  JOIN users u1 ON u1.id = c.user1_id
  JOIN users u2 ON u2.id = c.user2_id
  LEFT JOIN items i ON i.id = c.item_id
  WHERE (c.user1_id = $1 OR c.user2_id = $1)`;

export async function listConversations(req: Request, res: Response): Promise<void> {
  const rows = await query<Record<string, unknown>>(
    `${CONVERSATION_SELECT}
     ORDER BY c.updated_at DESC`,
    [req.user!.id],
  );
  res.json({ conversations: rows });
}

export async function getConversation(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;

  const conversation = await queryOne<Record<string, unknown>>(
    `${CONVERSATION_SELECT} AND c.id = $2`,
    [userId, id],
  );
  if (!conversation) throw ApiError.notFound('Conversation not found');

  const messages = await query<Record<string, unknown>>(
    `SELECT id, sender_id, body, read_at, created_at
     FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [id],
  );

  // Mark incoming messages as read.
  await query(`UPDATE messages SET read_at = now() WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL`, [
    id,
    userId,
  ]);

  res.json({ conversation, messages });
}

export async function createConversation(req: Request, res: Response): Promise<void> {
  const { itemId, userId: otherUserId, initialMessage } = req.body as {
    itemId?: string;
    userId?: string;
    initialMessage?: string;
  };
  const me = req.user!.id;

  let otherId = otherUserId;
  let itemIdVal = itemId;

  if (!otherId && itemIdVal) {
    const item = await queryOne<{ user_id: string }>(`SELECT user_id FROM items WHERE id = $1 AND deleted_at IS NULL`, [
      itemIdVal,
    ]);
    if (!item) throw ApiError.notFound('Item not found');
    otherId = String(item.user_id);
  }
  if (!otherId) throw ApiError.badRequest('A conversation partner is required');
  if (otherId === me) throw ApiError.badRequest('You cannot message yourself');

  const other = await queryOne(`SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL AND status = 'active'`, [otherId]);
  if (!other) throw ApiError.notFound('User not found');

  const [low, high] = [me, otherId].sort();
  let conversation = await queryOne<{ id: string }>(
    `SELECT id FROM conversations WHERE user1_id = $1 AND user2_id = $2`,
    [low, high],
  );

  if (!conversation) {
    conversation = await transaction(async (q) => {
      const created = await q<{ id: string }>(
        `INSERT INTO conversations (user1_id, user2_id, item_id) VALUES ($1, $2, $3) RETURNING id`,
        [low, high, itemIdVal || null],
      );
      return created[0];
    });
  }

  if (initialMessage && initialMessage.trim().length > 0) {
    await sendMessageInternal(String(conversation.id), me, otherId, initialMessage.trim());
  }

  res.status(201).json({ conversation: { id: conversation.id } });
}

export async function sendMessage(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const me = req.user!.id;
  const body = req.validated as { body: string };

  const conversation = await queryOne<{ user1_id: string; user2_id: string }>(
    `SELECT user1_id, user2_id FROM conversations WHERE id = $1`,
    [id],
  );
  if (!conversation) throw ApiError.notFound('Conversation not found');
  const isMember = conversation.user1_id === me || conversation.user2_id === me;
  if (!isMember) throw ApiError.forbidden('You do not have access to this conversation');

  const otherId = conversation.user1_id === me ? conversation.user2_id : conversation.user1_id;
  const message = await sendMessageInternal(id, me, otherId, body.body);

  res.status(201).json({ message });
}

async function sendMessageInternal(conversationId: string, senderId: string, recipientId: string, bodyText: string) {
  const created = await queryOne<Record<string, unknown>>(
    `INSERT INTO messages (conversation_id, sender_id, body) VALUES ($1, $2, $3)
     RETURNING id, sender_id, body, read_at, created_at`,
    [conversationId, senderId, bodyText],
  );
  await query(`UPDATE conversations SET updated_at = now() WHERE id = $1`, [conversationId]);
  await notifyUser(recipientId, 'message', 'You have a new message', bodyText.slice(0, 140), `/messages/${conversationId}`);
  return created;
}

export async function unreadCount(req: Request, res: Response): Promise<void> {
  const me = req.user!.id;
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     WHERE (c.user1_id = $1 OR c.user2_id = $1) AND m.sender_id != $1 AND m.read_at IS NULL`,
    [me],
  );
  res.json({ count: Number(row?.count || 0) });
}