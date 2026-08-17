import { query, queryOne, transaction } from '../database/connection.js';
import { notifyUser } from './notification.service.js';

export interface MatchReasons {
  score: number;
  reasons: string[];
}

interface ItemRow {
  id: string;
  type: string;
  status: string;
  name: string;
  brand: string | null;
  model: string | null;
  color: string | null;
  location: string | null;
  date_incident: string | null;
  description: string | null;
  category_id: number;
  user_id: string;
}

function normalize(s: string | null | undefined): string {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

function tokens(s: string): Set<string> {
  const stop = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'my', 'it', 'is', 'with', 'for', 'to']);
  return new Set(
    normalize(s)
      .split(/\s+/)
      .filter((t) => t.length > 1 && !stop.has(t)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function locationSimilar(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wa = na.split(' ');
  const wb = nb.split(' ');
  return wa.some((w) => w.length > 3 && wb.includes(w));
}

function dateDiffDays(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b) return null;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (Number.isNaN(da) || Number.isNaN(db)) return null;
  return Math.abs(da - db) / 86_400_000;
}

/**
 * Scores a lost item against a found item (or vice versa).
 * Returns a score from 0–100 plus human-readable reasons.
 * This is a "possible match" heuristic — never a guarantee.
 */
export function scoreItems(lost: ItemRow, found: ItemRow): MatchReasons {
  let score = 0;
  const reasons: string[] = [];

  if (lost.category_id === found.category_id) {
    score += 30;
    reasons.push('Same category');
  }

  const nameOverlap = jaccard(tokens(lost.name), tokens(found.name));
  if (nameOverlap >= 0.5) {
    score += 15;
    reasons.push('Similar item name');
  } else if (nameOverlap >= 0.3) {
    score += 8;
    reasons.push('Partially similar name');
  }

  const brandMatch = normalize(lost.brand) === normalize(found.brand) && normalize(lost.brand).length > 0;
  if (brandMatch) {
    score += 10;
    reasons.push('Same brand');
  }

  const modelMatch = normalize(lost.model) === normalize(found.model) && normalize(lost.model).length > 0;
  if (modelMatch) {
    score += 10;
    reasons.push('Same model');
  }

  const colorMatch = normalize(lost.color) === normalize(found.color) && normalize(lost.color).length > 0;
  if (colorMatch) {
    score += 8;
    reasons.push('Similar color');
  }

  if (locationSimilar(lost.location, found.location)) {
    score += 8;
    reasons.push('Nearby location');
  }

  const diff = dateDiffDays(lost.date_incident, found.date_incident);
  if (diff !== null && diff <= 7) {
    score += 9;
    reasons.push('Similar date');
  } else if (diff !== null && diff <= 14) {
    score += 4;
    reasons.push('Nearby date');
  }

  const descOverlap = jaccard(tokens(lost.description ?? ''), tokens(found.description ?? ''));
  if (descOverlap >= 0.4) {
    score += 10;
    reasons.push('Similar description');
  }

  return { score: Math.min(100, score), reasons };
}

export const MATCH_THRESHOLD = 55;

export interface ScoredMatch extends MatchReasons {
  foundItemId: string;
}

/** Finds possible matches for a lost item and returns scored found items. */
export async function findMatchesForLostItem(lostItemId: string): Promise<ScoredMatch[]> {
  const lost = await queryOne<ItemRow>(
    `SELECT id, type, status, name, brand, model, color, location, date_incident, description, category_id, user_id
     FROM items WHERE id = $1 AND deleted_at IS NULL`,
    [lostItemId],
  );
  if (!lost || lost.type !== 'lost') return [];

  const foundItems = await query<ItemRow>(
    `SELECT id, type, status, name, brand, model, color, location, date_incident, description, category_id, user_id
     FROM items
     WHERE type = 'found' AND status IN ('found', 'return_pending')
       AND deleted_at IS NULL
       AND user_id != $1
     ORDER BY created_at DESC
     LIMIT 200`,
    [lost.user_id],
  );

  const results: ScoredMatch[] = [];
  for (const found of foundItems) {
    const match = scoreItems(lost, found);
    if (match.score >= MATCH_THRESHOLD) {
      results.push({ ...match, foundItemId: found.id });
    }
  }
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Called whenever a new found item is posted (or updated).
 * Finds matching lost items, records the match and notifies the owner.
 */
export async function checkMatchesForFoundItem(foundItemId: string): Promise<void> {
  const found = await queryOne<ItemRow>(
    `SELECT id, type, status, name, brand, model, color, location, date_incident, description, category_id, user_id
     FROM items WHERE id = $1 AND deleted_at IS NULL`,
    [foundItemId],
  );
  if (!found || found.type !== 'found') return;

  const lostItems = await query<ItemRow>(
    `SELECT id, type, status, name, brand, model, color, location, date_incident, description, category_id, user_id
     FROM items
     WHERE type = 'lost' AND status = 'lost'
       AND deleted_at IS NULL
       AND user_id != $1
     ORDER BY created_at DESC
     LIMIT 200`,
    [found.user_id],
  );

  for (const lost of lostItems) {
    const match = scoreItems(lost, found);
    if (match.score < MATCH_THRESHOLD) continue;

    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM matches WHERE lost_item_id = $1 AND found_item_id = $2`,
      [lost.id, found.id],
    );

    if (!existing) {
      await query(
        `INSERT INTO matches (lost_item_id, found_item_id, score, reasons, notified_owner)
         VALUES ($1, $2, $3, $4::jsonb, true)`,
        [lost.id, found.id, match.score, JSON.stringify(match.reasons)],
      );
      await notifyUser(
        (lost as ItemRow & { user_id: string }).user_id,
        'match_found',
        `We found a possible match for your lost item`,
        `A found "${found.name}" could be yours (${match.score}% match).`,
        `/items/${found.id}`,
      );
    } else {
      await query(`UPDATE matches SET score = $3, reasons = $4::jsonb WHERE lost_item_id = $1 AND found_item_id = $2`, [
        lost.id,
        found.id,
        match.score,
        JSON.stringify(match.reasons),
      ]);
    }
  }
}

/** Called when a new lost item is posted — notifies the owner of existing found items that may match. */
export async function checkMatchesForLostItem(lostItemId: string): Promise<void> {
  const lost = await queryOne<ItemRow>(
    `SELECT id, type, status, name, brand, model, color, location, date_incident, description, category_id, user_id
     FROM items WHERE id = $1 AND deleted_at IS NULL`,
    [lostItemId],
  );
  if (!lost || lost.type !== 'lost') return;

  const foundItems = await query<ItemRow>(
    `SELECT id, type, status, name, brand, model, color, location, date_incident, description, category_id, user_id
     FROM items
     WHERE type = 'found' AND status IN ('found', 'return_pending')
       AND deleted_at IS NULL
       AND user_id != $1
     ORDER BY created_at DESC
     LIMIT 200`,
    [lost.user_id],
  );

  for (const found of foundItems) {
    const match = scoreItems(lost, found);
    if (match.score < MATCH_THRESHOLD) continue;
    await transaction(async (q) => {
      await q(
        `INSERT INTO matches (lost_item_id, found_item_id, score, reasons)
         VALUES ($1, $2, $3, $4::jsonb)
         ON CONFLICT (lost_item_id, found_item_id)
         DO UPDATE SET score = EXCLUDED.score, reasons = EXCLUDED.reasons`,
        [lost.id, found.id, match.score, JSON.stringify(match.reasons)],
      );
    });
    await notifyUser(
      lost.user_id,
      'match_found',
      `We found a possible match for your lost item`,
      `A found "${found.name}" could be yours (${match.score}% match).`,
      `/items/${found.id}`,
    );
  }
}