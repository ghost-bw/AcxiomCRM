import { Router } from 'express';
import * as leadController from '../controllers/leadController.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createLeadSchema, updateLeadSchema, convertLeadSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticate);

router.get('/', leadController.listLeads);
router.post('/', validate(createLeadSchema), leadController.createLead);
router.get('/:id', leadController.getLeadById);
router.put('/:id', validate(updateLeadSchema), leadController.updateLead);
router.delete('/:id', leadController.deleteLead);
router.post('/:id/convert', validate(convertLeadSchema), leadController.convertLead);

export default router;
