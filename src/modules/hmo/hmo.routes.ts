import { Router } from 'express';
import { HmoController } from './hmo.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/verify-eligibility', authorize('HOSPITAL', 'ADMIN', 'DESK_OFFICER'), HmoController.verifyEligibility);
router.post('/pre-authorization', authorize('HOSPITAL', 'ADMIN', 'DOCTOR'), HmoController.requestPreAuthorization);
router.post('/claims', authorize('HOSPITAL', 'ADMIN', 'BILLING_OFFICER'), HmoController.submitClaim);
router.get('/claims', authorize('HOSPITAL', 'HMO', 'ADMIN', 'BILLING_OFFICER'), HmoController.getClaims);
router.get('/claims/:id', authorize('HOSPITAL', 'HMO', 'ADMIN', 'BILLING_OFFICER'), HmoController.getClaimById);

export default router;