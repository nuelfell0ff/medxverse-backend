import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { HmoPortalsController } from './hmo-portals.controller.js';

const router = Router();
router.use(authenticate);

// Member portal
router.get('/member/profile', HmoPortalsController.memberProfile);
router.patch('/member/profile', HmoPortalsController.updateMemberProfile);
router.get('/member/dashboard', HmoPortalsController.memberDashboard);
router.get('/member/benefits', HmoPortalsController.memberBenefits);
router.get('/member/providers', HmoPortalsController.memberProviders);
router.get('/member/records/:type', HmoPortalsController.memberRecords);
router.get('/member/notifications', HmoPortalsController.memberNotifications);
router.patch('/member/notifications/:notificationId/read', HmoPortalsController.markNotificationRead);

// Provider portal
router.get('/provider/profile', HmoPortalsController.providerProfile);
router.patch('/provider/profile', HmoPortalsController.updateProviderProfile);
router.get('/provider/dashboard', HmoPortalsController.providerDashboard);
router.get('/provider/members', HmoPortalsController.providerMembers);
router.get('/provider/members/:memberId/eligibility', HmoPortalsController.providerEligibility);
router.get('/provider/claims', HmoPortalsController.providerClaims);
router.get('/provider/authorizations', HmoPortalsController.providerAuthorizations);
router.post('/provider/authorizations', HmoPortalsController.createProviderAuthorization);
router.post('/provider/claims', HmoPortalsController.createProviderClaim);
router.get('/provider/settlements', HmoPortalsController.providerSettlements);

export default router;
