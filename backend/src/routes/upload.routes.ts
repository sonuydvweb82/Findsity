import { Router } from 'express';
import * as uploadNS from '../controllers/upload.controller.js';
import { wrapController } from '../utils/errors.js';
const uploadController = wrapController(uploadNS);
import { authenticate } from '../middleware/auth.js';
import { uploadImages, uploadAvatar } from '../middleware/upload.js';

const router = Router();

router.use(authenticate);

router.post('/images', uploadImages.array('images', 6), uploadController.uploadItemImages);
router.post('/avatar', uploadAvatar.single('avatar'), uploadController.uploadAvatar);
router.delete('/:publicId', uploadController.deleteImage);

export default router;
