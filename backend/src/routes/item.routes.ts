import { Router } from 'express';
import * as itemNS from '../controllers/item.controller.js';
import * as claimNS from '../controllers/claim.controller.js';
import { wrapController } from '../utils/errors.js';
const itemController = wrapController(itemNS);
const claimController = wrapController(claimNS);
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadImages } from '../middleware/upload.js';
import {
  createItemSchema,
  updateItemSchema,
  itemListQuerySchema,
  claimSchema,
  handoverSchema,
} from '../utils/schemas.js';

const router = Router();

// Public browse
router.get('/', validate(itemListQuerySchema, 'query'), itemController.listItems);
router.get('/mine', authenticate, itemController.myItems);

// Item detail (public), matches (owner only)
router.get('/:id/matches', authenticate, itemController.getItemMatches);
router.get('/:id', itemController.getItem);

// Auth-only item management
router.post(
  '/',
  authenticate,
  uploadImages.array('images', 6),
  (req, _res, next) => {
    if (req.body && typeof req.body.categoryId === 'string') {
      req.body.categoryId = Number(req.body.categoryId);
    }
    next();
  },
  validate(createItemSchema),
  itemController.createItem,
);

router.put(
  '/:id',
  authenticate,
  uploadImages.array('images', 6),
  (req, _res, next) => {
    if (req.body && typeof req.body.categoryId === 'string') {
      req.body.categoryId = Number(req.body.categoryId);
    }
    next();
  },
  validate(updateItemSchema),
  itemController.updateItem,
);
router.delete('/:id', authenticate, itemController.deleteItem);
router.post('/:id/mark-returned', authenticate, itemController.markReturned);

// Claims
router.post('/:id/claims', authenticate, validate(claimSchema), claimController.createClaim);

export default router;
