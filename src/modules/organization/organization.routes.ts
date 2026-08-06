import { Router } from 'express';
import { OrganizationController } from './organization.controller.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { UserRole } from '../../constants/roles.enum.js';

const router = Router();

// Protect all organization management routes
router.use(protect);

// Publicly searchable list for authenticated staff
router.get('/', OrganizationController.getOrganizations);
router.get('/:id', OrganizationController.getOrganizationById);

// Super Admin restricted administrative operations
router.post(
  '/',
  restrictTo(UserRole.SYSTEM_ADMIN),
  OrganizationController.createOrganization
);

router.patch(
  '/:id',
  restrictTo(UserRole.SYSTEM_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HMO_ADMIN),
  OrganizationController.updateOrganization
);

router.patch(
  '/:id/toggle-status',
  restrictTo(UserRole.SYSTEM_ADMIN),
  OrganizationController.toggleOrganizationStatus
);

export default router;