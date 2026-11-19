import { Router } from 'express';
import * as customerController from '../controllers/customerController.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createCustomerSchema, updateCustomerSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticate);

router.get('/', customerController.listCustomers);
router.post('/', validate(createCustomerSchema), customerController.createCustomer);
router.get('/:id', customerController.getCustomerById);
router.put('/:id', validate(updateCustomerSchema), customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

export default router;
