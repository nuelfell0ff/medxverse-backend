import { Router } from 'express';
import { UserController } from './user.controller.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { UserRole } from '../../constants/roles.enum.js';

const router = Router();

// Protect all user routes
router.use(protect);

// Staff Directory (Accessible by Hospital/HMO Admins and medical staff)
router.get('/', UserController.getUsers);
router.get('/:id', UserController.getUserById);

// Admin-only Staff Management Operations
router.post(
  '/',
  restrictTo(UserRole.SYSTEM_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HMO_ADMIN),
  UserController.createUser
);

router.patch(
  '/:id',
  restrictTo(UserRole.SYSTEM_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HMO_ADMIN),
  UserController.updateUser
);

router.patch(
  '/:id/toggle-status',
  restrictTo(UserRole.SYSTEM_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HMO_ADMIN),
  UserController.toggleUserStatus
);

export default router;