import { Router } from 'express';
import { hmsDashboardController } from './hms-dashboard.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(authorize('HMO', 'HMO_ADMIN', 'HMO_CLAIMS_OFFICER', 'HMO_MEDICAL_OFFICER', 'HMO_OFFICER'));

// Metrics
router.get('/metrics', (req, res, next) =>
  hmsDashboardController.getDashboardMetrics(req, res, next)
);

// Settings
router.get('/settings', (req, res, next) =>
  hmsDashboardController.getDashboardSettings(req, res, next)
);

router.patch('/settings', (req, res, next) =>
  hmsDashboardController.updateDashboardSettings(req, res, next)
);

export default router;