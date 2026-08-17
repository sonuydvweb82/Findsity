import { Router } from 'express';
import * as authNS from '../controllers/auth.controller.js';
import { wrapController } from '../utils/errors.js';
const authController = wrapController(authNS);
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, profileUpdateSchema } from '../utils/schemas.js';
import { uploadAvatar } from '../middleware/upload.js';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.get('/me', authenticate, authController.me);
router.put('/profile', authenticate, uploadAvatar.single('avatar'), validate(profileUpdateSchema), authController.updateProfile);

export default router;
