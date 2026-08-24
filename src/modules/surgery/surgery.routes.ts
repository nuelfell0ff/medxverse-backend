import { Router } from 'express';
import { surgeryController } from './surgery.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

/**
 * Surgery module authentication
 *
 * The hospital is the authorization boundary.
 * Individual staff roles such as SURGEON, NURSE, ANAESTHETIST, etc.
 * are NOT used as route-level permissions.
 *
 * Staff are hospital-owned records and can participate in surgery
 * workflows according to the hospital's operational workflow.
 */
router.use(authenticate);

/**
 * Create / schedule surgery
 */
router.post(
  '/',
  (req, res, next) =>
    surgeryController.scheduleCase(req, res, next)
);

/**
 * Create emergency surgery
 */
router.post(
  '/emergency',
  (req, res, next) =>
    surgeryController.scheduleEmergencyCase(req, res, next)
);

/**
 * Get surgery cases
 */
router.get(
  '/',
  (req, res, next) =>
    surgeryController.getCases(req, res, next)
);

/**
 * Get single surgery case
 *
 * IMPORTANT:
 * The controller/service must scope this lookup to the authenticated
 * hospital. A user from Hospital A must never be able to retrieve
 * Hospital B's surgery case simply by knowing its ID.
 */
router.get(
  '/:id',
  (req, res, next) =>
    surgeryController.getCaseById(req, res, next)
);

/**
 * Pre-operative assessment
 */
router.patch(
  '/:id/pre-op',
  (req, res, next) =>
    surgeryController.updatePreOp(req, res, next)
);

/**
 * Surgical consent
 */
router.patch(
  '/:id/consent',
  (req, res, next) =>
    surgeryController.updateConsent(req, res, next)
);

/**
 * Surgical team
 */
router.patch(
  '/:id/team',
  (req, res, next) =>
    surgeryController.updateTeam(req, res, next)
);

/**
 * Reschedule surgery
 */
router.patch(
  '/:id/reschedule',
  (req, res, next) =>
    surgeryController.rescheduleCase(req, res, next)
);

/**
 * Add medication
 */
router.post(
  '/:id/medications',
  (req, res, next) =>
    surgeryController.addMedication(req, res, next)
);

/**
 * Administer medication
 */
router.patch(
  '/:id/medications/administer',
  (req, res, next) =>
    surgeryController.administerMedication(req, res, next)
);

/**
 * WHO surgical safety checklist
 */
router.patch(
  '/:id/who-checklist',
  (req, res, next) =>
    surgeryController.updateWHOChecklist(req, res, next)
);

/**
 * Intra-operative vitals
 */
router.post(
  '/:id/vitals',
  (req, res, next) =>
    surgeryController.addVitalsLog(req, res, next)
);

/**
 * Start surgery
 */
router.patch(
  '/:id/start',
  (req, res, next) =>
    surgeryController.startSurgery(req, res, next)
);

/**
 * Intra-operative documentation
 */
router.patch(
  '/:id/intraop-docs',
  (req, res, next) =>
    surgeryController.updateIntraopDocs(req, res, next)
);

/**
 * Anaesthesia documentation
 */
router.patch(
  '/:id/anesthesia',
  (req, res, next) =>
    surgeryController.updateAnesthesia(req, res, next)
);

/**
 * Complete surgery
 */
router.patch(
  '/:id/complete',
  (req, res, next) =>
    surgeryController.completeSurgery(req, res, next)
);

/**
 * Recovery / PACU
 */
router.patch(
  '/:id/recovery',
  (req, res, next) =>
    surgeryController.updateRecovery(req, res, next)
);

/**
 * Cancel surgery
 */
router.patch(
  '/:id/cancel',
  (req, res, next) =>
    surgeryController.cancelCase(req, res, next)
);

/**
 * Postpone surgery
 */
router.patch(
  '/:id/postpone',
  (req, res, next) =>
    surgeryController.postponeCase(req, res, next)
);

export default router;