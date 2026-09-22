import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import hmsDashboardRoutes from '../hms-dashboard/hms-dashboard.routes.js';
import preAuthorizationRoutes from '../pre-authorizations/pre-authorizations.routes.js';
import membersRoutes from '../members/members.routes.js';
import claimsRoutes from '../claims/claims.routes.js';
import providerRoutes from '../provider/provider.routes.js';
import benefitsRoutes from '../benefits/benefits.routes.js';
import hmsReportsRoutes from '../hms-reports/reports.routes.js';
import hmsNotificationsRoutes from '../hms-notifications/notifications.routes.js';

const router = Router();

// HMO portal is available only to authenticated HMO accounts.
router.use(authenticate);
router.use(authorize('HMO', 'HMO_ADMIN', 'HMO_CLAIMS_OFFICER', 'HMO_MEDICAL_OFFICER', 'HMO_OFFICER'));

router.use('/dashboard', hmsDashboardRoutes);
router.use('/pre-authorizations', preAuthorizationRoutes);
router.use('/members', membersRoutes);
router.use('/claims', claimsRoutes);
router.use('/providers', providerRoutes);
router.use('/benefits', benefitsRoutes);
router.use('/reports', hmsReportsRoutes);
router.use('/notifications', hmsNotificationsRoutes);

export default router;
