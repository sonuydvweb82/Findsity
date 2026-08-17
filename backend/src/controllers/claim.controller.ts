import type { Request, Response } from 'express';
import { query, queryOne, transaction } from '../database/connection.js';
import { ApiError } from '../utils/errors.js';
import { generateClaimUid } from '../utils/ids.js';
import { computeRiskLevel, RISK_LABELS, type RiskLevel } from '../services/risk.service.js';
import { notifyUser, notifyAdmins } from '../services/notification.service.js';

interface ClaimRow {
  id: string;
  uid: string;
  item_id: string;
  item_name: string;
  claimant_id: string;
  risk_level: RiskLevel;
  status: string;
  lost_location: string | null;
  lost_date: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
  unique_feature: string | null;
  proof_of_ownership: string | null;
  proof_urls: string[];
  additional_info: string | null;
  finder_notes: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  item_user_id: string;
}

type ClaimWithFinder = ClaimRow;

const CLAIM_BASE_SELECT = `
  SELECT cl.*, i.name AS item_name, i.uid AS item_uid, i.type AS item_type, i.status AS item_status,
         i.private_identifying_features AS item_private_features,
         c.name AS category_name, c.slug AS category_slug,
         u.full_name AS claimant_name, u.college AS claimant_college, u.avatar_url AS claimant_avatar,
         u.created_at AS claimant_joined, u.id AS claimant_id
  FROM claims cl
  JOIN items i ON i.id = cl.item_id
  JOIN categories c ON c.id = i.category_id
  JOIN users u ON u.id = cl.claimant_id
  WHERE 1 = 1`;

export async function createClaim(req: Request, res: Response): Promise<void> {
  const { id: itemId } = req.params;
  const body = req.validated as Record<string, unknown>;
  const claimantId = req.user!.id;

  const item = await queryOne<Record<string, unknown>>(
    `SELECT i.id, i.user_id, i.type, i.status, i.name, i.brand, i.model, i.category_id, i.description,
            c.slug AS category_slug
     FROM items i JOIN categories c ON c.id = i.category_id
     WHERE i.id = $1 AND i.deleted_at IS NULL`,
    [itemId],
  );
  if (!item) throw ApiError.notFound('Item not found');
  if (String(item.type) !== 'found') throw ApiError.badRequest('You can only claim found items');
  if (!['found', 'return_pending'].includes(String(item.status))) {
    throw ApiError.badRequest('This item is no longer claimable');
  }
  if (String(item.user_id) === claimantId) throw ApiError.badRequest('You cannot claim your own item');

  const duplicate = await queryOne(
    `SELECT id FROM claims
     WHERE item_id = $1 AND claimant_id = $2 AND status IN ('pending', 'more_info', 'approved')
     LIMIT 1`,
    [itemId, claimantId],
  );
  if (duplicate) throw ApiError.conflict('You already have an active claim on this item');

  const riskLevel = computeRiskLevel(
    String(item.category_slug),
    String(item.name),
    String(item.brand || ''),
    String(body.model || ''),
    String(item.description || ''),
  );

  const proofUrls: string[] = Array.isArray(body.proofUrls) ? body.proofUrls.map(String).slice(0, 6) : [];

  const claimId = await transaction(async (q) => {
    const inserted = await q<{ id: string }>(
      `INSERT INTO claims (
         uid, item_id, claimant_id, risk_level, status, lost_location, lost_date,
         brand, model, color, unique_feature, proof_of_ownership, proof_urls, additional_info
       ) VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13)
       RETURNING id`,
      [
        generateClaimUid(),
        itemId,
        claimantId,
        riskLevel,
        String(body.lostLocation),
        String(body.lostDate),
        String(body.brand || ''),
        String(body.model || ''),
        String(body.color || ''),
        String(body.uniqueFeature),
        String(body.proofOfOwnership || ''),
        JSON.stringify(proofUrls),
        String(body.additionalInfo || ''),
      ],
    );
    return String(inserted[0].id);
  });

  // Store the structured answers (the 7 ownership questions).
  const answerFieldMap: Record<string, string> = {
    lostLocation: 'Where did you lose the item?',
    lostDate: 'When did you lose it?',
    brand: 'What brand is it?',
    model: 'What model is it?',
    color: 'What color is it?',
    uniqueFeature: 'Describe a unique feature not visible in the public listing.',
    proofOfOwnership: 'Do you have proof of ownership?',
    additionalInfo: 'Additional information',
  };
  const questions = await query<{ id: number; question: string }>(
    `SELECT id, question FROM verification_questions ORDER BY sort_order, id`,
  );
  const answerValues: Record<string, string> = {
    lostLocation: String(body.lostLocation),
    lostDate: String(body.lostDate),
    brand: String(body.brand || ''),
    model: String(body.model || ''),
    color: String(body.color || ''),
    uniqueFeature: String(body.uniqueFeature),
    proofOfOwnership: String(body.proofOfOwnership || ''),
    additionalInfo: String(body.additionalInfo || ''),
  };
  for (const question of questions) {
    const field = answerFieldMap[question.question];
    await query(`INSERT INTO claim_answers (claim_id, question_id, answer) VALUES ($1, $2, $3)`, [
      claimId,
      question.id,
      answerValues[field] ?? '',
    ]);
  }

  await notifyUser(
    String(item.user_id),
    'claim_submitted',
    `Someone submitted a claim for "${String(item.name)}"`,
    `${req.user!.fullName} thinks this item might be theirs. Review the claim.`,
    `/claims/${claimId}`,
  );

  if (riskLevel === 'high') {
    await notifyAdmins(
      'claim_submitted',
      `High-risk claim needs review`,
      `A high-risk claim (${RISK_LABELS.high}) was submitted for "${String(item.name)}". Admin review required.`,
      `/admin/claims/${claimId}`,
    );
  }

  res.status(201).json({
    message: 'Claim submitted successfully. The finder has been notified.',
    claim: { id: claimId, riskLevel },
  });
}

export async function myClaims(req: Request, res: Response): Promise<void> {
  const rows = await query<Record<string, unknown>>(
    `SELECT cl.id, cl.uid, cl.status, cl.risk_level, cl.created_at, cl.updated_at,
            i.name AS item_name, i.uid AS item_uid, i.type AS item_type, i.status AS item_status,
            c.name AS category_name,
            (SELECT url FROM item_images im WHERE im.item_id = i.id ORDER BY im.position, im.id LIMIT 1) AS cover_url
     FROM claims cl
     JOIN items i ON i.id = cl.item_id
     JOIN categories c ON c.id = i.category_id
     WHERE cl.claimant_id = $1
     ORDER BY cl.created_at DESC`,
    [req.user!.id],
  );
  res.json({ claims: rows });
}

export async function claimsOnMyItems(req: Request, res: Response): Promise<void> {
  const rows = await query<Record<string, unknown>>(
    `SELECT cl.id, cl.uid, cl.status, cl.risk_level, cl.created_at, cl.updated_at,
            i.name AS item_name, i.uid AS item_uid, i.type AS item_type, i.status AS item_status,
            c.name AS category_name,
            u.full_name AS claimant_name, u.avatar_url AS claimant_avatar, u.college AS claimant_college,
            (SELECT url FROM item_images im WHERE im.item_id = i.id ORDER BY im.position, im.id LIMIT 1) AS cover_url
     FROM claims cl
     JOIN items i ON i.id = cl.item_id
     JOIN categories c ON c.id = i.category_id
     JOIN users u ON u.id = cl.claimant_id
     WHERE i.user_id = $1 AND cl.status NOT IN ('closed')
     ORDER BY cl.created_at DESC`,
    [req.user!.id],
  );
  res.json({ claims: rows });
}

export async function getClaim(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const viewer = req.user!;

  const row = await queryOne<Record<string, unknown>>(
    `${CLAIM_BASE_SELECT} AND cl.id = $1`,
    [id],
  );
  if (!row) throw ApiError.notFound('Claim not found');

  const isClaimant = String(row.claimant_id) === viewer.id;
  const isAdmin = viewer.role === 'admin';

  // Finder = the item owner.
  const itemOwner = await queryOne<{ user_id: string }>(`SELECT user_id FROM items WHERE id = $1`, [row.item_id]);
  const actualFinder = Boolean(itemOwner && String(itemOwner.user_id) === viewer.id);

  if (!actualFinder && !isClaimant && !isAdmin) throw ApiError.forbidden('You do not have access to this claim');

  const answers = await query<{ question: string; answer: string }>(
    `SELECT vq.question, ca.answer
     FROM claim_answers ca JOIN verification_questions vq ON vq.id = ca.question_id
     WHERE ca.claim_id = $1 ORDER BY vq.sort_order, vq.id`,
    [id],
  );

  const handover = await queryOne<Record<string, unknown>>(
    `SELECT * FROM handovers WHERE claim_id = $1`,
    [id],
  );

  const claimant = await queryOne<Record<string, unknown>>(
    `SELECT u.id, u.full_name, u.college, u.avatar_url, u.created_at,
            (SELECT COUNT(*)::int FROM claims c2 WHERE c2.claimant_id = u.id AND c2.status = 'returned') AS successful_returns,
            (SELECT COUNT(*)::int FROM items i2 WHERE i2.user_id = u.id AND i2.deleted_at IS NULL) AS total_items
     FROM users u WHERE u.id = $1`,
    [row.claimant_id],
  );

  const payload: Record<string, unknown> = {
    ...row,
    answers,
    handover: handover || null,
claimant: {
      id: claimant?.id ? String(claimant.id) : null,
      name: claimant?.full_name,
      college: claimant?.college,
      avatarUrl: claimant?.avatar_url,
      joinedAt: claimant?.created_at,
      successfulReturns: claimant?.successful_returns ?? 0,
      totalItems: claimant?.total_items ?? 0,
      // The claimant's private student ID is never revealed to the finder.
      studentId: isAdmin ? claimant?.student_id : null,
    },
canReview: actualFinder || isAdmin,
    // Lets the UI show role-specific handover actions without exposing raw user ids.
    viewerRole: isAdmin ? 'admin' : isClaimant ? 'claimant' : actualFinder ? 'finder' : null,
    riskLabel: RISK_LABELS[row.risk_level as RiskLevel],
  };

  delete payload.claimant_id;
  delete payload.item_private_features;

  // The finder's private identifying features are only visible to the finder and admins.
  if (actualFinder || isAdmin) {
    payload.privateIdentifyingFeatures = row.item_private_features;
  }

  res.json({ claim: payload });
}

export async function approveClaim(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const viewer = req.user!;

  const claim = await queryOne<ClaimWithFinder>(
    `SELECT cl.*, i.user_id AS item_user_id FROM claims cl JOIN items i ON i.id = cl.item_id WHERE cl.id = $1`,
    [id],
  );
  if (!claim) throw ApiError.notFound('Claim not found');
  const isFinder = String(claim.item_user_id) === viewer.id;
  const isAdmin = viewer.role === 'admin';
  if (!isFinder && !isAdmin) throw ApiError.forbidden('Only the finder (or an admin) can approve claims');
  if (claim.status === 'returned') throw ApiError.badRequest('This claim is already completed');
  if (claim.status === 'rejected' || claim.status === 'closed') throw ApiError.badRequest('This claim is no longer active');

  if (claim.risk_level === 'high' && !isAdmin) {
    throw ApiError.forbidden('High-risk claims require admin review before approval');
  }

  await transaction(async (q) => {
    await q(`UPDATE claims SET status = 'approved', reviewed_by = $1, reviewed_at = now() WHERE id = $2`, [
      viewer.id,
      id,
    ]);
    await q(`UPDATE items SET status = 'return_pending', updated_at = now() WHERE id = $1`, [claim.item_id]);
    await q(`UPDATE claims SET status = 'closed' WHERE item_id = $1 AND id != $2 AND status IN ('pending', 'more_info')`, [
      claim.item_id,
      id,
    ]);
await q(
      `INSERT INTO handovers (claim_id, pickup_location, arranged_by, status)
       VALUES ($1, '', $2, 'pending')
       ON CONFLICT (claim_id) DO NOTHING`,
      [id, viewer.id],
    );
  });

  await notifyUser(
    claim.claimant_id,
    'claim_approved',
    `Your claim for "${claim.item_name ?? 'an item'}" was approved`,
    `The finder approved your claim. Arrange a handover to collect your item.`,
    `/claims/${id}`,
  );

  res.json({ message: 'Claim approved. Arrange the handover to complete the return.' });
}

export async function rejectClaim(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const viewer = req.user!;
  const body = (req.validated || {}) as { notes?: string };

  const claim = await queryOne<ClaimWithFinder>(
    `SELECT cl.*, i.user_id AS item_user_id FROM claims cl JOIN items i ON i.id = cl.item_id WHERE cl.id = $1`,
    [id],
  );
  if (!claim) throw ApiError.notFound('Claim not found');
  const isFinder = String(claim.item_user_id) === viewer.id;
  const isAdmin = viewer.role === 'admin';
  if (!isFinder && !isAdmin) throw ApiError.forbidden('Only the finder (or an admin) can reject claims');

  await query(`UPDATE claims SET status = 'rejected', finder_notes = $1, reviewed_by = $2, reviewed_at = now() WHERE id = $3`, [
    body.notes || '',
    viewer.id,
    id,
  ]);

  await notifyUser(
    claim.claimant_id,
    'claim_rejected',
    `Your claim for "${claim.item_name ?? 'an item'}" was not approved`,
    body.notes || 'The finder could not verify your claim.',
    `/claims/${id}`,
  );

  res.json({ message: 'Claim rejected' });
}

export async function requestMoreInfo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const viewer = req.user!;
  const body = (req.validated || {}) as { notes?: string };

  const claim = await queryOne<ClaimWithFinder>(
    `SELECT cl.*, i.user_id AS item_user_id FROM claims cl JOIN items i ON i.id = cl.item_id WHERE cl.id = $1`,
    [id],
  );
  if (!claim) throw ApiError.notFound('Claim not found');
  const isFinder = String(claim.item_user_id) === viewer.id;
  const isAdmin = viewer.role === 'admin';
  if (!isFinder && !isAdmin) throw ApiError.forbidden('Only the finder (or an admin) can request more information');

  await query(`UPDATE claims SET status = 'more_info', finder_notes = $1 WHERE id = $2`, [body.notes || '', id]);

  await notifyUser(
    claim.claimant_id,
    'claim_more_info',
    `More information needed for your claim`,
    body.notes || 'The finder asked for more details about your claim.',
    `/claims/${id}`,
  );

  res.json({ message: 'More information requested' });
}

export async function escalateClaim(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const viewer = req.user!;

  const claim = await queryOne<ClaimWithFinder>(
    `SELECT cl.*, i.user_id AS item_user_id FROM claims cl JOIN items i ON i.id = cl.item_id WHERE cl.id = $1`,
    [id],
  );
  if (!claim) throw ApiError.notFound('Claim not found');
  const isFinder = String(claim.item_user_id) === viewer.id;
  const isClaimant = String(claim.claimant_id) === viewer.id;
  if (!isFinder && !isClaimant && viewer.role !== 'admin') {
    throw ApiError.forbidden('Only the finder or claimant can escalate a claim');
  }

  await query(`UPDATE claims SET status = 'escalated' WHERE id = $1`, [id]);

  await notifyAdmins(
    'claim_escalated',
    `A claim was escalated for review`,
    `Claim ${claim.uid} needs admin attention.`,
    `/admin/claims/${id}`,
  );

  res.json({ message: 'Claim escalated to an administrator' });
}

export async function arrangeHandover(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const viewer = req.user!;
  const body = req.validated as Record<string, unknown>;

  const claim = await queryOne<ClaimWithFinder>(
    `SELECT cl.*, i.user_id AS item_user_id, i.name AS item_name FROM claims cl JOIN items i ON i.id = cl.item_id WHERE cl.id = $1`,
    [id],
  );
  if (!claim) throw ApiError.notFound('Claim not found');
  const isFinder = String(claim.item_user_id) === viewer.id;
  if (!isFinder && viewer.role !== 'admin') throw ApiError.forbidden('Only the finder can arrange the handover');
  if (claim.status !== 'approved') throw ApiError.badRequest('The claim must be approved before arranging a handover');

  const handover = await queryOne<{ status: string }>(`SELECT status FROM handovers WHERE claim_id = $1`, [id]);
  if (handover && (handover.status === 'handed_over' || handover.status === 'completed')) {
    throw ApiError.badRequest('The handover is already in progress');
  }

  const pickupLocation = String(body.pickupLocation).trim();
  const scheduledDate = String(body.scheduledDate || '');
  const scheduledTime = String(body.scheduledTime || '');

  await query(
    `INSERT INTO handovers (claim_id, pickup_location, scheduled_date, scheduled_time, notes, arranged_by, status)
     VALUES ($1, $2, NULLIF($3, '')::date, $4, $5, $6, 'proposed')
     ON CONFLICT (claim_id) DO UPDATE SET
       pickup_location = EXCLUDED.pickup_location,
       scheduled_date = EXCLUDED.scheduled_date,
       scheduled_time = EXCLUDED.scheduled_time,
       notes = EXCLUDED.notes,
       arranged_by = EXCLUDED.arranged_by,
       status = 'proposed',
       claimant_accepted_at = NULL,
       declined_at = NULL,
       updated_at = now()`,
    [id, pickupLocation, scheduledDate, scheduledTime, String(body.notes || ''), viewer.id],
  );

  await notifyUser(
    claim.claimant_id,
    'handover_scheduled',
    `Handover proposed for "${claim.item_name}"`,
    `Pickup location: ${pickupLocation}. Confirm the time to complete the handover.`,
    `/claims/${id}`,
  );

  res.json({ message: 'Handover proposed. Waiting for the claimant to confirm.' });
}

export async function acceptHandover(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const viewer = req.user!;

  const claim = await queryOne<ClaimWithFinder>(
    `SELECT cl.*, i.user_id AS item_user_id, i.name AS item_name FROM claims cl JOIN items i ON i.id = cl.item_id WHERE cl.id = $1`,
    [id],
  );
  if (!claim) throw ApiError.notFound('Claim not found');
  if (String(claim.claimant_id) !== viewer.id) throw ApiError.forbidden('Only the claimant can confirm the handover');
  if (claim.status !== 'approved') throw ApiError.badRequest('The claim must be approved before confirming a handover');

  const handover = await queryOne<{ status: string }>(`SELECT status FROM handovers WHERE claim_id = $1`, [id]);
  if (!handover) throw ApiError.badRequest('No handover proposal found');
  if (handover.status === 'scheduled' || handover.status === 'handed_over' || handover.status === 'completed') {
    res.json({ message: 'Handover already confirmed' });
    return;
  }
  if (handover.status !== 'proposed') throw ApiError.badRequest('There is no handover proposal to confirm');

  await query(
    `UPDATE handovers SET claimant_accepted_at = now(), declined_at = NULL, status = 'scheduled', updated_at = now() WHERE claim_id = $1`,
    [id],
  );

  await notifyUser(
    String(claim.item_user_id),
    'handover_scheduled',
    `Handover confirmed for "${claim.item_name}"`,
    `The claimant confirmed the handover. Hand the item over to complete the return.`,
    `/claims/${id}`,
  );

  res.json({ message: 'Handover confirmed. The finder has been notified.' });
}

export async function declineHandover(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const viewer = req.user!;

  const claim = await queryOne<ClaimWithFinder>(
    `SELECT cl.*, i.user_id AS item_user_id, i.name AS item_name FROM claims cl JOIN items i ON i.id = cl.item_id WHERE cl.id = $1`,
    [id],
  );
  if (!claim) throw ApiError.notFound('Claim not found');
  if (String(claim.claimant_id) !== viewer.id) throw ApiError.forbidden('Only the claimant can decline the handover');
  if (claim.status !== 'approved') throw ApiError.badRequest('The claim must be approved before changing a handover');

  const handover = await queryOne<{ status: string }>(`SELECT status FROM handovers WHERE claim_id = $1`, [id]);
  if (!handover) throw ApiError.badRequest('No handover proposal found');
  if (handover.status === 'pending') {
    res.json({ message: 'There is no handover proposal to decline' });
    return;
  }
  if (handover.status !== 'proposed') throw ApiError.badRequest('The confirmed handover can no longer be declined');

  await query(
    `UPDATE handovers SET status = 'pending', declined_at = now(), claimant_accepted_at = NULL, updated_at = now() WHERE claim_id = $1`,
    [id],
  );

  await notifyUser(
    String(claim.item_user_id),
    'handover_scheduled',
    `Handover declined for "${claim.item_name}"`,
    `The claimant could not make the proposed time. Propose another handover slot.`,
    `/claims/${id}`,
  );

  res.json({ message: 'Handover declined. The finder can propose another time.' });
}

export async function confirmHandoverFinder(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const viewer = req.user!;

  const claim = await queryOne<ClaimWithFinder>(
    `SELECT cl.*, i.user_id AS item_user_id, i.name AS item_name FROM claims cl JOIN items i ON i.id = cl.item_id WHERE cl.id = $1`,
    [id],
  );
  if (!claim) throw ApiError.notFound('Claim not found');
  const isFinder = String(claim.item_user_id) === viewer.id;
  if (!isFinder) throw ApiError.forbidden('Only the finder can confirm the handover');

  const handover = await queryOne<{ status: string; finder_confirmed_at: string | null }>(
    `SELECT status, finder_confirmed_at FROM handovers WHERE claim_id = $1`,
    [id],
  );
  if (!handover) throw ApiError.badRequest('Arrange the handover first');
  if (handover.status === 'handed_over' || handover.status === 'completed') {
    res.json({ message: 'Handover already confirmed' });
    return;
  }
  if (handover.status !== 'scheduled') {
    throw ApiError.badRequest('Wait for the claimant to confirm the proposed handover');
  }

  await query(
    `UPDATE handovers SET finder_confirmed_at = CASE WHEN finder_confirmed_at IS NULL THEN now() ELSE finder_confirmed_at END,
       status = 'handed_over', updated_at = now() WHERE claim_id = $1`,
    [id],
  );

  await notifyUser(
    claim.claimant_id,
    'item_returned',
    `The finder handed over "${claim.item_name}"`,
    `Confirm that you received your item to complete the return.`,
    `/claims/${id}`,
  );

  res.json({ message: 'Handover confirmed. Waiting for the claimant to confirm receipt.' });
}

export async function confirmHandoverClaimant(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const viewer = req.user!;

  const claim = await queryOne<ClaimWithFinder & { claimant_name: string }>(
    `SELECT cl.*, i.user_id AS item_user_id, i.name AS item_name,
            u.full_name AS claimant_name
     FROM claims cl JOIN items i ON i.id = cl.item_id JOIN users u ON u.id = cl.claimant_id
     WHERE cl.id = $1`,
    [id],
  );
  if (!claim) throw ApiError.notFound('Claim not found');
  const isClaimant = String(claim.claimant_id) === viewer.id;
  if (!isClaimant) throw ApiError.forbidden('Only the claimant can confirm receipt');

  const handover = await queryOne<{ status: string; finder_confirmed_at: string | null; claimant_confirmed_at: string | null }>(
    `SELECT status, finder_confirmed_at, claimant_confirmed_at FROM handovers WHERE claim_id = $1`,
    [id],
  );
  if (!handover) throw ApiError.badRequest('No handover record found');
  if (handover.status === 'completed') {
    res.json({ message: 'Item successfully returned' });
    return;
  }
  if (handover.status !== 'handed_over' || !handover.finder_confirmed_at) {
    throw ApiError.badRequest('The finder must confirm the handover before you can confirm receipt');
  }

  await transaction(async (q) => {
    await q(
      `UPDATE handovers SET claimant_confirmed_at = CASE WHEN claimant_confirmed_at IS NULL THEN now() ELSE claimant_confirmed_at END,
         status = 'completed', updated_at = now() WHERE claim_id = $1`,
      [id],
    );
    await q(`UPDATE claims SET status = 'returned', returned_at = now(), updated_at = now() WHERE id = $1`, [id]);
    await q(`UPDATE items SET status = 'returned', returned_at = now(), updated_at = now() WHERE id = $1`, [claim.item_id]);
  });

  await notifyUser(
    String(claim.item_user_id),
    'item_returned',
    'Item successfully returned 🎉',
    `${claim.claimant_name} confirmed receiving "${claim.item_name}".`,
    `/items/${claim.item_id}`,
  );

  res.json({ message: 'Item successfully returned 🎉' });
}


