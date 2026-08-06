import { Router } from 'express';
import { LaboratoryController } from './laboratory.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js'; // Adjust path to your auth middleware

const router = Router();

router.use(authenticate);

// --- Test Catalog Routes ---
router
  .route('/tests')
  .post(authorize('ADMIN', 'LAB_TECHNICIAN'), LaboratoryController.createLabTest)
  .get(LaboratoryController.getLabTests);

router
  .route('/tests/:id')
  .patch(authorize('ADMIN', 'LAB_TECHNICIAN'), LaboratoryController.updateLabTest);

// --- Lab Request Routes ---
router
  .route('/requests')
  .post(authorize('DOCTOR', 'ADMIN'), LaboratoryController.createLabRequest)
  .get(LaboratoryController.getLabRequests);

router.route('/requests/:id').get(LaboratoryController.getLabRequestById);

// --- Lab Workflow Routes ---
router
  .route('/requests/:id/collect-sample')
  .post(authorize('LAB_TECHNICIAN', 'NURSE', 'ADMIN'), LaboratoryController.collectSample);

router
  .route('/requests/:id/results')
  .post(authorize('LAB_TECHNICIAN', 'ADMIN'), LaboratoryController.submitResults);

export default router;