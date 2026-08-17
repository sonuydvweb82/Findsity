import { Router } from 'express';
import * as authNS from '../controllers/auth.controller.js';
import { wrapController } from '../utils/errors.js';
import { authenticate } from '../middleware/auth.js';

const authController = wrapController(authNS);
const router = Router();

router.get('/:id', authenticate, authController.publicProfile);

export default router;