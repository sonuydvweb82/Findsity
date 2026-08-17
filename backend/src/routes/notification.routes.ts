import { Router } from 'express';
import * as notificationNS from '../controllers/notification.controller.js';
import { wrapController } from '../utils/errors.js';
const notificationController = wrapController(notificationNS);
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', notificationController.listNotifications);
router.get('/unread-count', notificationController.unreadCount);
router.post('/read-all', notificationController.markAllRead);
router.post('/:id/read', notificationController.markRead);

export default router;
