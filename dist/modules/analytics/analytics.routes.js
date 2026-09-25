import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { HMOAnalyticsController } from './analytics.controller.js';
const router = Router();
router.use(authenticate);
router.use(authorize('HMO', 'HMO_ADMIN', 'HMO_CLAIMS_OFFICER', 'HMO_MEDICAL_OFFICER', 'HMO_OFFICER'));
// Dashboard / analytics summary
router.get('/summary', HMOAnalyticsController.summary);
// Generate a new analytics report
router.post('/reports', HMOAnalyticsController.report);
// List generated analytics reports
router.get('/reports', HMOAnalyticsController.reports);
// Get a specific analytics report
router.get('/reports/:id', HMOAnalyticsController.reportById);
// Audit logs
router.get('/audit', HMOAnalyticsController.audit);
// Consent management
router.get('/consents', HMOAnalyticsController.consents);
router.post('/consents', HMOAnalyticsController.grantConsent);
router.patch('/consents/:id/revoke', HMOAnalyticsController.revokeConsent);
// Compliance reports
router.post('/compliance', HMOAnalyticsController.complianceGenerate);
router.get('/compliance', HMOAnalyticsController.complianceList);
router.patch('/compliance/:id/status', HMOAnalyticsController.complianceStatus);
export default router;
