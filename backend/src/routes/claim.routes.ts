import { Router } from 'express';
import * as claimNS from '../controllers/claim.controller.js';
import { wrapController } from '../utils/errors.js';
const claimController = wrapController(claimNS);
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { handoverSchema, notesSchema } from '../utils/schemas.js';

const router = Router();

router.use(authenticate);

router.get('/mine', claimController.myClaims);
router.get('/finder', claimController.claimsOnMyItems);
router.get('/:id', claimController.getClaim);

router.post('/:id/approve', claimController.approveClaim);
router.post('/:id/reject', validate(notesSchema), claimController.rejectClaim);
router.post('/:id/request-info', validate(notesSchema), claimController.requestMoreInfo);
router.post('/:id/escalate', claimController.escalateClaim);
router.post('/:id/handover', validate(handoverSchema), claimController.arrangeHandover);
router.post('/:id/handover/claimant-accept', claimController.acceptHandover);
router.post('/:id/handover/claimant-decline', claimController.declineHandover);
router.post('/:id/handover/finder-confirm', claimController.confirmHandoverFinder);
router.post('/:id/handover/claimant-confirm', claimController.confirmHandoverClaimant);

export default router;
