import { Router } from 'express';
import * as messageNS from '../controllers/message.controller.js';
import { wrapController } from '../utils/errors.js';
const messageController = wrapController(messageNS);
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { messageSchema } from '../utils/schemas.js';

const router = Router();

router.use(authenticate);

router.get('/', messageController.listConversations);
router.get('/unread-count', messageController.unreadCount);
router.get('/:id', messageController.getConversation);
router.get('/:id/messages', messageController.getConversation);
router.post('/', messageController.createConversation);
router.post('/:id/messages', validate(messageSchema), messageController.sendMessage);

export default router;
