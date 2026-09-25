import { Router } from 'express';
import { HMOAnalyticsController as C } from './analytics.controller.js';

export const hmoAnalyticsRouter = Router();

// Mount this router behind the existing JWT/auth middleware used by HMO modules.
// Example: app.use('/api/v1/hmo-analytics', authenticate, hmoAnalyticsRouter)

hmoAnalyticsRouter.get('/summary', C.summary);
hmoAnalyticsRouter.post('/reports', C.report);
hmoAnalyticsRouter.get('/reports', C.reports);
hmoAnalyticsRouter.get('/reports/:id', C.reportById);
hmoAnalyticsRouter.get('/audit', C.audit);
hmoAnalyticsRouter.get('/consents', C.consents);
hmoAnalyticsRouter.post('/consents', C.grantConsent);
hmoAnalyticsRouter.patch('/consents/:id/revoke', C.revokeConsent);
hmoAnalyticsRouter.post('/compliance/reports', C.complianceGenerate);
hmoAnalyticsRouter.get('/compliance/reports', C.complianceList);
hmoAnalyticsRouter.patch('/compliance/reports/:id/status', C.complianceStatus);

export default hmoAnalyticsRouter;
