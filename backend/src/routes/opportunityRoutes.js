import { Router } from 'express';
import * as opportunityController from '../controllers/opportunityController.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createOpportunitySchema, updateOpportunitySchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticate);

router.get('/', opportunityController.listOpportunities);
router.post('/', validate(createOpportunitySchema), opportunityController.createOpportunity);
router.get('/:id', opportunityController.getOpportunityById);
router.put('/:id', validate(updateOpportunitySchema), opportunityController.updateOpportunity);
router.delete('/:id', opportunityController.deleteOpportunity);

export default router;
