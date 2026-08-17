import { Router } from 'express';
import { surgeryController } from './surgery.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  (req, res, next) =>
    surgeryController.scheduleCase(req, res, next)
);

router.get(
  '/',
  (req, res, next) =>
    surgeryController.getCases(req, res, next)
);

router.get(
  '/theatre/:theatreId/schedule',
  (req, res, next) =>
    surgeryController.getTheatreSchedule(req, res, next)
);

router.get(
  '/theatre/:theatreId/utilization',
  (req, res, next) =>
    surgeryController.getUtilization(req, res, next)
);

router.get(
  '/:id',
  (req, res, next) =>
    surgeryController.getCaseById(req, res, next)
);

router.patch(
  '/:id/reschedule',
  (req, res, next) =>
    surgeryController.rescheduleCase(req, res, next)
);

router.patch(
  '/:id/pre-op',
  (req, res, next) =>
    surgeryController.updatePreOp(req, res, next)
);

router.patch(
  '/:id/consent',
  (req, res, next) =>
    surgeryController.updateConsent(req, res, next)
);

router.patch(
  '/:id/who-checklist',
  (req, res, next) =>
    surgeryController.updateWHOChecklist(req, res, next)
);

router.post(
  '/:id/vitals',
  (req, res, next) =>
    surgeryController.addVitalsLog(req, res, next)
);

router.patch(
  '/:id/anesthesia',
  (req, res, next) =>
    surgeryController.updateAnesthesia(req, res, next)
);

router.patch(
  '/:id/intraop-docs',
  (req, res, next) =>
    surgeryController.updateIntraopDocs(req, res, next)
);

router.patch(
  '/:id/team',
  (req, res, next) =>
    surgeryController.assignTeamMember(req, res, next)
);

router.patch(
  '/:id/start',
  (req, res, next) =>
    surgeryController.startSurgery(req, res, next)
);

router.patch(
  '/:id/complete',
  (req, res, next) =>
    surgeryController.completeSurgery(req, res, next)
);

router.patch(
  '/:id/cancel',
  (req, res, next) =>
    surgeryController.cancelCase(req, res, next)
);

router.patch(
  '/:id/postpone',
  (req, res, next) =>
    surgeryController.postponeCase(req, res, next)
);

export default router;
