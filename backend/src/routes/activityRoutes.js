import { Router } from 'express';
import * as activityController from '../controllers/activityController.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createActivitySchema, updateActivitySchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticate);

router.get('/', activityController.listActivities);
router.post('/', validate(createActivitySchema), activityController.createActivity);
router.put('/:id', validate(updateActivitySchema), activityController.updateActivity);

export default router;
