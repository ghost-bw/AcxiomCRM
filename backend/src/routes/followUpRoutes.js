import { Router } from 'express';
import * as followUpController from '../controllers/followUpController.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createFollowUpSchema, updateFollowUpSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticate);

router.get('/', followUpController.listFollowUps);
router.post('/', validate(createFollowUpSchema), followUpController.createFollowUp);
router.get('/:id', followUpController.getFollowUpById);
router.put('/:id', validate(updateFollowUpSchema), followUpController.updateFollowUp);
router.patch('/:id/status', followUpController.updateFollowUpStatus);

export default router;
