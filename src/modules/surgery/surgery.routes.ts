import { Router } from 'express';

import {
  surgeryController,
} from './surgery.controller.js';

import {
  authenticate,
} from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

/**
 * ============================================================
 * SURGERY CASES
 * ============================================================
 */

// Schedule surgery
router.post(
  '/',
  (req, res, next) =>
    surgeryController.scheduleCase(
      req,
      res,
      next
    )
);

// Get surgery cases / theatre calendar data
router.get(
  '/',
  (req, res, next) =>
    surgeryController.getCases(
      req,
      res,
      next
    )
);

// Get single surgery case
router.get(
  '/:id',
  (req, res, next) =>
    surgeryController.getCaseById(
      req,
      res,
      next
    )
);

/**
 * ============================================================
 * PRE-OPERATIVE
 * ============================================================
 */

router.patch(
  '/:id/pre-op',
  (req, res, next) =>
    surgeryController.updatePreOp(
      req,
      res,
      next
    )
);

router.patch(
  '/:id/consent',
  (req, res, next) =>
    surgeryController.updateConsent(
      req,
      res,
      next
    )
);

/**
 * ============================================================
 * WHO SURGICAL SAFETY CHECKLIST
 * ============================================================
 */

router.patch(
  '/:id/who-checklist',
  (req, res, next) =>
    surgeryController.updateWHOChecklist(
      req,
      res,
      next
    )
);

/**
 * ============================================================
 * INTRAOPERATIVE
 * ============================================================
 */

// Start surgery
router.patch(
  '/:id/start',
  (req, res, next) =>
    surgeryController.startSurgery(
      req,
      res,
      next
    )
);

// Add intraoperative vital sign
router.post(
  '/:id/vitals',
  (req, res, next) =>
    surgeryController.addVitalsLog(
      req,
      res,
      next
    )
);

// Update operative documentation
router.patch(
  '/:id/intraop-docs',
  (req, res, next) =>
    surgeryController.updateIntraopDocs(
      req,
      res,
      next
    )
);

// Update anaesthesia record
router.patch(
  '/:id/anesthesia',
  (req, res, next) =>
    surgeryController.updateAnesthesia(
      req,
      res,
      next
    )
);

// Add pre-op / intra-op medication
router.post(
  '/:id/medications',
  (req, res, next) =>
    surgeryController.addMedication(
      req,
      res,
      next
    )
);

/**
 * ============================================================
 * RECOVERY
 * ============================================================
 */

router.patch(
  '/:id/recovery',
  (req, res, next) =>
    surgeryController.updateRecovery(
      req,
      res,
      next
    )
);

/**
 * ============================================================
 * CASE MANAGEMENT
 * ============================================================
 */

// Reschedule
router.patch(
  '/:id/reschedule',
  (req, res, next) =>
    surgeryController.rescheduleCase(
      req,
      res,
      next
    )
);

// Postpone
router.patch(
  '/:id/postpone',
  (req, res, next) =>
    surgeryController.postponeCase(
      req,
      res,
      next
    )
);

// Cancel
router.patch(
  '/:id/cancel',
  (req, res, next) =>
    surgeryController.cancelCase(
      req,
      res,
      next
    )
);

// Complete surgery
router.patch(
  '/:id/complete',
  (req, res, next) =>
    surgeryController.completeSurgery(
      req,
      res,
      next
    )
);

export default router;
