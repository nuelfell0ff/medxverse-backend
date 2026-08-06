import { Router } from 'express';
import { HMOController } from './hmo.controller.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { UserRole } from '../../constants/roles.enum.js';

const router = Router();

// Protect all HMO routes
router.use(protect);

// ------------------------------------------
// HMO Provider Management Routes
// ------------------------------------------
router.get('/providers', HMOController.getProviders);
router.get('/providers/:id', HMOController.getProviderById);

router.post(
  '/providers',
  restrictTo(
    UserRole.SYSTEM_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.HMO_OFFICER
  ),
  HMOController.createProvider
);

router.patch(
  '/providers/:id',
  restrictTo(
    UserRole.SYSTEM_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.HMO_OFFICER
  ),
  HMOController.updateProvider
);

// ------------------------------------------
// Pre-Authorization Routes
// ------------------------------------------
router.get('/pre-auths', HMOController.getPreAuths);

router.post(
  '/pre-auths',
  restrictTo(
    UserRole.SYSTEM_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.HMO_OFFICER,
    UserRole.DOCTOR
  ),
  HMOController.createPreAuth
);

router.patch(
  '/pre-auths/:id/status',
  restrictTo(
    UserRole.SYSTEM_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.HMO_OFFICER
  ),
  HMOController.updatePreAuthStatus
);

// ------------------------------------------
// Claims Routes
// ------------------------------------------
router.get('/claims', HMOController.getClaims);
router.get('/claims/:id', HMOController.getClaimById);

router.post(
  '/claims',
  restrictTo(
    UserRole.SYSTEM_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.HMO_OFFICER,
    UserRole.BILLING_OFFICER
  ),
  HMOController.createClaim
);

router.patch(
  '/claims/:id/status',
  restrictTo(
    UserRole.SYSTEM_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.HMO_OFFICER
  ),
  HMOController.updateClaimStatus
);

export default router;