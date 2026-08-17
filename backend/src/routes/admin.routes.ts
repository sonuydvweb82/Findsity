import { Router } from 'express';
import * as adminNS from '../controllers/admin.controller.js';
import { wrapController } from '../utils/errors.js';
const adminController = wrapController(adminNS);
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/public/stats', adminController.publicStats);

router.use(authenticate, requireAdmin);

router.get('/stats', adminController.stats);
router.get('/charts', adminController.charts);
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.adminUserDetail);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.get('/items', adminController.adminListItems);
router.delete('/items/:id', adminController.adminDeleteItem);
router.get('/claims', adminController.adminListClaims);
router.post('/claims/:id/review', adminController.adminReviewClaim);
router.get('/reports', adminController.listReports);
router.post('/reports/:id/resolve', adminController.adminResolveReport);
router.get('/actions', adminController.adminActionsLog);

export default router;
