import { Router } from 'express';
import * as reportController from '../controllers/reportController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/customers', reportController.getCustomerReport);
router.get('/leads', reportController.getLeadReport);
router.get('/followups', reportController.getFollowUpReport);
router.get('/opportunities', reportController.getOpportunityReport);
router.get('/pipeline', reportController.getPipelineReport);
router.get('/conversions', reportController.getConversionReport);
router.get('/user-activity', reportController.getUserActivityReport);
router.get('/audit', reportController.getAuditReport);

export default router;
