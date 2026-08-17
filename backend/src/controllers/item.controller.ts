import type { Request, Response } from 'express';
import { query, queryOne, transaction } from '../database/connection.js';
import { ApiError } from '../utils/errors.js';
import { generateItemUid } from '../utils/ids.js';
import { maskId, maskPrivateData, isSensitiveCategory } from '../utils/mask.js';
import { persistImages, deleteStoredImage, cleanupFailedUpload } from '../services/upload.service.js';
import { checkMatchesForFoundItem, checkMatchesForLostItem, findMatchesForLostItem } from '../services/match.service.js';

interface ItemRow {
  id: string;
  uid: string;
  type: string;
  status: string;
  name: string;
  description: string;
  brand: string | null;
  model: string | null;
  color: string | null;
  date_incident: string | null;
  time_approx: string | null;
  location: string | null;
  location_details: string | null;
  current_location: string | null;
  private_identifying_features: string | null;
  reward: string | null;
  notes: string | null;
  category_id: number;
  user_id: string;
  view_count: number;
  created_at: string;
  updated_at: string;
  category_name?: string;
  category_slug?: string;
  cover_url?: string | null;
}

type PosterRow = ItemRow & {
  poster_name: string;
  poster_college: string;
  poster_student_id: string | null;
  poster_avatar: string | null;
  poster_created_at: string;
  poster_role: string;
};

function attachPoster(detail: Record<string, unknown>, row: ItemRow, isOwner: boolean, isAdmin: boolean): void {
  const poster = row as unknown as PosterRow;
  detail.poster = {
    id: String(poster.user_id),
    name: poster.poster_name,
    college: poster.poster_college,
    avatarUrl: poster.poster_avatar,
    // Never expose the full student ID publicly.
    studentId: isOwner || isAdmin ? poster.poster_student_id : maskId(poster.poster_student_id),
    joinedAt: poster.poster_created_at,
  };
  delete detail.poster_name;
  delete detail.poster_college;
  delete detail.poster_student_id;
  delete detail.poster_avatar;
  delete detail.poster_created_at;
  delete detail.poster_role;
}

function scrubItemForPublic(row: ItemRow, viewerId?: string | null, isAdmin = false): Record<string, unknown> {
  const isOwner = viewerId != null && String(row.user_id) === String(viewerId);
  const out: Record<string, unknown> = isOwner || isAdmin ? { ...row } : { ...row };

  if (!isOwner && !isAdmin) {
    const sensitive = isSensitiveCategory(String(row.category_slug || ''));
    if (sensitive || true) {
      out.description = maskPrivateData(row.description);
      out.notes = maskPrivateData(row.notes);
      out.location_details = maskPrivateData(row.location_details);
    }
    delete out.private_identifying_features;
    delete out.user_id;
  }

  attachPoster(out, row, isOwner, isAdmin);
  return out;
}

const ITEM_BASE_SELECT = `
  SELECT i.id, i.uid, i.type, i.status, i.name, i.description, i.brand, i.model, i.color,
         i.date_incident, i.time_approx, i.location, i.location_details, i.current_location,
         i.private_identifying_features, i.reward, i.notes, i.category_id, i.user_id,
         i.view_count, i.created_at, i.updated_at, i.returned_at,
         c.name AS category_name, c.slug AS category_slug,
         (SELECT url FROM item_images im WHERE im.item_id = i.id ORDER BY im.position, im.id LIMIT 1) AS cover_url,
         u.full_name AS poster_name, u.college AS poster_college, u.student_id AS poster_student_id,
         u.avatar_url AS poster_avatar, u.created_at AS poster_created_at, u.role AS poster_role
  FROM items i
  JOIN categories c ON c.id = i.category_id
  LEFT JOIN users u ON u.id = i.user_id
  WHERE i.deleted_at IS NULL`;

function parseItemField(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export async function createItem(req: Request, res: Response): Promise<void> {
  const body = req.validated as Record<string, unknown>;
  const files = (req.files as Express.Multer.File[] | undefined) || [];

  const userId = req.user!.id;
  const type = String(body.type);

  const category = await queryOne<{ id: number }>(`SELECT id FROM categories WHERE id = $1`, [body.categoryId]);
  if (!category) throw ApiError.badRequest('Invalid category');

  if (type === 'found' && !body.currentLocation) {
    // current location optional but encouraged
  }

  const images = await persistImages(files);

  let itemId = '';
  try {
    const result = await transaction(async (q) => {
      const inserted = await q<ItemRow>(
        `INSERT INTO items (
           uid, user_id, type, status, name, category_id, description, brand, model, color,
           date_incident, time_approx, location, location_details, current_location,
           private_identifying_features, reward, notes
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         RETURNING id`,
        [
          generateItemUid(),
          userId,
          type,
          type, // status starts as the type
          String(body.name),
          body.categoryId,
          parseItemField(body.description),
          parseItemField(body.brand),
          parseItemField(body.model),
          parseItemField(body.color),
          parseItemField(body.dateIncident) || null,
          parseItemField(body.timeApprox),
          parseItemField(body.location),
          parseItemField(body.locationDetails),
          parseItemField(body.currentLocation),
          parseItemField(body.privateIdentifyingFeatures),
          parseItemField(body.reward),
          parseItemField(body.notes),
        ],
      );
      itemId = String(inserted[0].id);

      for (let i = 0; i < images.length; i += 1) {
        await q(
          `INSERT INTO item_images (item_id, url, public_id, position) VALUES ($1, $2, $3, $4)`,
          [itemId, images[i].url, images[i].publicId, i],
        );
      }
      return itemId;
    });
    void result;
  } catch (err) {
    cleanupFailedUpload(files);
    throw err;
  }

  // Fire-and-forget match checks in the background.
  if (type === 'found') {
    void checkMatchesForFoundItem(itemId);
  } else {
    void checkMatchesForLostItem(itemId);
  }

  res.status(201).json({
    message: type === 'lost' ? 'Your lost item has been reported successfully.' : 'Thank you! Your found item has been posted.',
    item: await getItemDetail(itemId, userId, true),
  });
}

export async function listItems(req: Request, res: Response): Promise<void> {
  const q = req.validatedQuery as {
    type?: string;
    status?: string;
    category?: string;
    q?: string;
    location?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: string;
    page: number;
    limit: number;
  };

  const where: string[] = [`i.deleted_at IS NULL`];
  const params: unknown[] = [];

  if (q.type) {
    params.push(q.type);
    where.push(`i.type = $${params.length}`);
  }
if (q.status && q.status !== 'all') {
    if (q.status === 'returned') {
      params.push('returned');
      where.push(`i.status = $${params.length}`);
    } else {
      params.push(q.status);
      where.push(`i.status = $${params.length} AND i.type = '${q.status}'`);
    }
  } else {
    // Returned items are no longer active lost/found listings.
    where.push(`i.status != 'returned'`);
  }
  if (q.category) {
    params.push(q.category);
    where.push(`c.slug = $${params.length}`);
  }
  if (q.q) {
    params.push(`%${q.q}%`);
    where.push(
      `(i.name ILIKE $${params.length} OR i.description ILIKE $${params.length} OR i.brand ILIKE $${params.length} OR i.model ILIKE $${params.length} OR i.location ILIKE $${params.length} OR c.name ILIKE $${params.length})`,
    );
  }
  if (q.location) {
    params.push(`%${q.location}%`);
    where.push(`(i.location ILIKE $${params.length} OR i.location_details ILIKE $${params.length} OR i.current_location ILIKE $${params.length})`);
  }
  if (q.dateFrom) {
    params.push(q.dateFrom);
    where.push(`i.date_incident >= $${params.length}`);
  }
  if (q.dateTo) {
    params.push(q.dateTo);
    where.push(`i.date_incident <= $${params.length}`);
  }

  const sortMap: Record<string, string> = {
    newest: 'i.created_at DESC',
    oldest: 'i.created_at ASC',
    recently_updated: 'i.updated_at DESC',
  };
  const orderBy = sortMap[q.sort || 'newest'] || sortMap.newest;

  const countParams = [...params];
  const countRes = await queryOne<{ total: string }>(
    `SELECT COUNT(*)::int AS total FROM items i JOIN categories c ON c.id = i.category_id WHERE ${where.join(' AND ')}`,
    countParams,
  );
  const total = Number(countRes?.total || 0);

  const offset = (q.page - 1) * q.limit;
  params.push(q.limit, offset);
  const rows = await query<ItemRow>(
    `${ITEM_BASE_SELECT} AND ${where.join(' AND ')} ORDER BY ${orderBy} LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  const viewerId = req.user?.id;
  const isAdmin = req.user?.role === 'admin';
  const items = rows.map((row) => scrubItemForPublic(row, viewerId, isAdmin));

  res.json({ items, total, page: q.page, limit: q.limit, totalPages: Math.max(1, Math.ceil(total / q.limit)) });
}

export async function getItem(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const viewerId = req.user?.id;
  const isAdmin = req.user?.role === 'admin';

const row = await queryOne<ItemRow & { poster_name: string; poster_college: string; poster_student_id: string | null; poster_avatar: string | null; poster_created_at: string; poster_role: string }>(
    `${ITEM_BASE_SELECT} AND i.id = $1`,
    [id],
  );
  if (!row) throw ApiError.notFound('Item not found');

  await query(`UPDATE items SET view_count = view_count + 1 WHERE id = $1`, [id]);

  const images = await query<{ url: string; position: number }>(
    `SELECT url, position FROM item_images WHERE item_id = $1 ORDER BY position, id`,
    [id],
  );

  const isOwner = viewerId != null && row.user_id === viewerId;

  const detail = scrubItemForPublic(row, viewerId, isAdmin);
  detail.images = images;
  delete detail.cover_url;

  if (isOwner && row.type === 'lost') {
    const matches = await findMatchesForLostItem(id);
    const matchRows = await Promise.all(
      matches.map(async (m) => {
        const found = await queryOne<ItemRow>(`${ITEM_BASE_SELECT} AND i.id = $1`, [m.foundItemId]);
        return found ? { score: m.score, reasons: m.reasons, item: scrubItemForPublic(found, viewerId, isAdmin) } : null;
      }),
    );
    detail.possibleMatches = matchRows.filter(Boolean);
  }

  if (isOwner) {
    const claims = await query<Record<string, unknown>>(
      `SELECT id, uid, status, risk_level, claimant_id, created_at
       FROM claims WHERE item_id = $1 ORDER BY created_at DESC`,
      [id],
    );
    detail.claims = claims;
  }

  res.json({ item: detail });
}

export async function updateItem(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const body = req.validated as Record<string, unknown>;
  const files = (req.files as Express.Multer.File[] | undefined) || [];

  const existing = await queryOne<ItemRow>(`${ITEM_BASE_SELECT} AND i.id = $1`, [id]);
  if (!existing) throw ApiError.notFound('Item not found');
  if (existing.user_id !== req.user!.id && req.user!.role !== 'admin') {
    throw ApiError.forbidden('You can only edit your own items');
  }

  const sets: string[] = [];
  const params: unknown[] = [];
  const fieldMap: Record<string, string> = {
    name: 'name',
    description: 'description',
    brand: 'brand',
    model: 'model',
    color: 'color',
    dateIncident: 'date_incident',
    timeApprox: 'time_approx',
    location: 'location',
    locationDetails: 'location_details',
    currentLocation: 'current_location',
    privateIdentifyingFeatures: 'private_identifying_features',
    reward: 'reward',
    notes: 'notes',
    status: 'status',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (body[key] !== undefined) {
      params.push(typeof body[key] === 'string' ? (body[key] as string).trim() : body[key]);
      sets.push(`${col} = $${params.length}`);
    }
  }
  if (body.categoryId !== undefined) {
    const category = await queryOne(`SELECT id FROM categories WHERE id = $1`, [body.categoryId]);
    if (!category) throw ApiError.badRequest('Invalid category');
    params.push(body.categoryId);
    sets.push(`category_id = $${params.length}`);
  }

  if (files.length > 0) {
    const images = await persistImages(files);
    try {
      await transaction(async (q) => {
        const existingImages = await q<{ url: string }>(`SELECT url FROM item_images WHERE item_id = $1`, [id]);
        for (const img of existingImages) deleteStoredImage(img.url);
        await q(`DELETE FROM item_images WHERE item_id = $1`, [id]);
        for (let i = 0; i < images.length; i += 1) {
          await q(`INSERT INTO item_images (item_id, url, public_id, position) VALUES ($1, $2, $3, $4)`, [
            id,
            images[i].url,
            images[i].publicId,
            i,
          ]);
        }
      });
    } catch (err) {
      cleanupFailedUpload(files);
      throw err;
    }
  }

  if (sets.length === 0 && files.length === 0) throw ApiError.badRequest('Nothing to update');
  if (sets.length > 0) {
    params.push(id);
    await query(`UPDATE items SET ${sets.join(', ')}, updated_at = now() WHERE id = $${params.length}`, params);
  }

  res.json({ message: 'Item updated successfully', item: await getItemDetail(id, req.user!.id, true) });
}

export async function deleteItem(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const existing = await queryOne<ItemRow>(`${ITEM_BASE_SELECT} AND i.id = $1`, [id]);
  if (!existing) throw ApiError.notFound('Item not found');
  if (existing.user_id !== req.user!.id && req.user!.role !== 'admin') {
    throw ApiError.forbidden('You can only delete your own items');
  }

  await query(`UPDATE items SET deleted_at = now() WHERE id = $1`, [id]);
  res.json({ message: 'Item removed' });
}

export async function myItems(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const rows = await query<ItemRow & { images: unknown }>(
    `${ITEM_BASE_SELECT}
     AND i.user_id = $1
     ORDER BY i.created_at DESC`,
    [userId],
  );

  const counts = await query<{ type: string; status: string; count: string }>(
    `SELECT type, status, COUNT(*)::int AS count FROM items
     WHERE user_id = $1 AND deleted_at IS NULL GROUP BY type, status`,
    [userId],
  );

  res.json({
    items: rows,
    counts: {
      lost: counts.find((c) => c.type === 'lost' && c.status !== 'returned')?.count ?? '0',
      found: counts.find((c) => c.type === 'found' && c.status !== 'returned')?.count ?? '0',
      returned: counts.find((c) => c.status === 'returned')?.count ?? '0',
    },
  });
}

export async function markReturned(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const existing = await queryOne<ItemRow>(`${ITEM_BASE_SELECT} AND i.id = $1`, [id]);
  if (!existing) throw ApiError.notFound('Item not found');
  if (existing.user_id !== req.user!.id && req.user!.role !== 'admin') {
    throw ApiError.forbidden('You can only update your own items');
  }
  if (existing.type !== 'found') throw ApiError.badRequest('Only found items can be marked as returned');

  await query(`UPDATE items SET status = 'returned', updated_at = now() WHERE id = $1`, [id]);
  await query(`UPDATE claims SET status = 'returned' WHERE item_id = $1 AND status = 'approved'`, [id]);

  res.json({ message: 'Item marked as returned' });
}

export async function getItemMatches(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const item = await queryOne<ItemRow>(`${ITEM_BASE_SELECT} AND i.id = $1`, [id]);
  if (!item) throw ApiError.notFound('Item not found');
  if (item.user_id !== req.user!.id && req.user!.role !== 'admin') {
    throw ApiError.forbidden('You can only view matches for your own items');
  }
  if (item.type !== 'lost') throw ApiError.badRequest('Possible matches are available for lost items');

  const matches = await findMatchesForLostItem(id);
  const results = await Promise.all(
    matches.map(async (m) => {
const found = await queryOne<ItemRow>(`${ITEM_BASE_SELECT} AND i.id = $1`, [m.foundItemId]);
      return found ? { score: m.score, reasons: m.reasons, item: scrubItemForPublic(found, req.user!.id, req.user!.role === 'admin') } : null;
    }),
  );

  res.json({ matches: results.filter(Boolean) });
}

async function getItemDetail(id: string, viewerId: string, isAdmin: boolean): Promise<Record<string, unknown>> {
  const row = await queryOne<ItemRow>(
    `${ITEM_BASE_SELECT} AND i.id = $1`,
    [id],
  );
  if (!row) throw ApiError.notFound('Item not found');
  const images = await query<{ url: string; position: number }>(
    `SELECT url, position FROM item_images WHERE item_id = $1 ORDER BY position, id`,
    [id],
  );
  const detail = scrubItemForPublic(row, viewerId, isAdmin);
  detail.images = images;
  delete detail.cover_url;
  return detail;
}
