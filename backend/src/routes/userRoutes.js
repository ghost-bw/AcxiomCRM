import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { authenticate } from '../middlewares/auth.js';
import { authorizeRoles } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { createUserSchema, updateUserSchema } from '../validators/schemas.js';
import { ROLES } from '../constants/index.js';

const router = Router();

router.use(authenticate);

// Endpoint for form dropdowns (Managers & Execs can access permitted assignees)
router.get('/assignees', userController.getAssignees);

// Admin-only user management routes
router.use(authorizeRoles(ROLES.ADMIN));

router.get('/', userController.listUsers);
router.post('/', validate(createUserSchema), userController.createUser);
router.get('/:id', userController.getUserById);
router.put('/:id', validate(updateUserSchema), userController.updateUser);
router.post('/:id/unlock', userController.unlockUser);

export default router;
