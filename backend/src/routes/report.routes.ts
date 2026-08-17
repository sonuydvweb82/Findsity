import { Router } from 'express';
import * as reportNS from '../controllers/report.controller.js';
import { wrapController } from '../utils/errors.js';
const reportController = wrapController(reportNS);
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { reportSchema } from '../utils/schemas.js';

const router = Router();

router.use(authenticate);

router.post('/', validate(reportSchema), reportController.createReport);
router.get('/mine', reportController.myReports);

export default router;
