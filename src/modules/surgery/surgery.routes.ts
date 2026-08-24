import { Router } from 'express';
import { surgeryController } from './surgery.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const requireSurgeryRoles =
  (...allowed: string[]) =>
  (req: any, res: any, next: any) => {
    const role = String(req.user?.role ?? '').toUpperCase();
    const roles = Array.isArray(req.user?.roles)
      ? req.user.roles.map((r: unknown) => String(r).toUpperCase())
      : [];
    const allowedUpper = allowed.map((r) => r.toUpperCase());

    if (!allowedUpper.some((r) => r === role || roles.includes(r))) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to perform this surgical action.',
      });
    }
    next();
  };

const router = Router();

router.use(authenticate);

router.post(
  '/',
  requireSurgeryRoles('ADMIN', 'HOSPITAL_ADMIN', 'SURGEON', 'DOCTOR', 'THEATRE_MANAGER', 'THEATRE_NURSE'),
  (req, res, next) =>
    surgeryController.scheduleCase(req, res, next)
);

router.post(
  '/emergency',
  requireSurgeryRoles('ADMIN', 'HOSPITAL_ADMIN', 'SURGEON', 'DOCTOR', 'THEATRE_MANAGER', 'THEATRE_NURSE'),
  (req, res, next) =>
    surgeryController.scheduleEmergencyCase(req, res, next)
);

router.get(
  '/',
  requireSurgeryRoles('ADMIN', 'HOSPITAL_ADMIN', 'SURGEON', 'DOCTOR', 'ANAESTHETIST', 'ANESTHETIST', 'NURSE', 'THEATRE_NURSE', 'THEATRE_MANAGER'),
  (req, res, next) =>
    surgeryController.getCases(req, res, next)
);

router.get(
  '/:id',
  requireSurgeryRoles('ADMIN', 'HOSPITAL_ADMIN', 'SURGEON', 'DOCTOR', 'ANAESTHETIST', 'ANESTHETIST', 'NURSE', 'THEATRE_NURSE', 'THEATRE_MANAGER'),
  (req, res, next) =>
    surgeryController.getCaseById(req, res, next)
);

router.patch(
  '/:id/pre-op',
  requireSurgeryRoles('ADMIN', 'HOSPITAL_ADMIN', 'SURGEON', 'DOCTOR', 'ANAESTHETIST', 'ANESTHETIST', 'NURSE'),
  (req, res, next) =>
    surgeryController.updatePreOp(req, res, next)
);

router.patch(
  '/:id/consent',
  requireSurgeryRoles('ADMIN', 'HOSPITAL_ADMIN', 'SURGEON', 'DOCTOR'),
  (req, res, next) =>
    surgeryController.updateConsent(req, res, next)
);

router.patch(
  '/:id/team',
  requireSurgeryRoles('ADMIN', 'HOSPITAL_ADMIN', 'SURGEON', 'DOCTOR', 'THEATRE_MANAGER'),
  (req, res, next) =>
    surgeryController.updateTeam(req, res, next)
);

router.patch(
  '/:id/reschedule',
  requireSurgeryRoles('ADMIN', 'HOSPITAL_ADMIN', 'SURGEON', 'DOCTOR', 'THEATRE_MANAGER'),
  (req, res, next) =>
    surgeryController.rescheduleCase(req, res, next)
);

router.post(
  '/:id/medications',
  requireSurgeryRoles('ADMIN', 'HOSPITAL_ADMIN', 'SURGEON', 'DOCTOR', 'ANAESTHETIST', 'ANESTHETIST'),
  (req, res, next) =>
    surgeryController.addMedication(req, res, next)
);

router.patch(
  '/:id/medications/administer',
  requireSurgeryRoles('ADMIN', 'HOSPITAL_ADMIN', 'SURGEON', 'DOCTOR', 'ANAESTHETIST', 'ANESTHETIST', 'NURSE'),
  (req, res, next) =>
    surgeryController.administerMedication(req, res, next)
);

router.patch(
  '/:id/who-checklist',
  requireSurgeryRoles('ADMIN', 'HOSPITAL_ADMIN', 'SURGEON', 'DOCTOR', 'ANAESTHETIST', 'ANESTHETIST', 'NURSE'),
  (req, res, next) =>
    surgeryController.updateWHOChecklist(req, res, next)
);

router.post(
  '/:id/vitals',
  requireSurgeryRoles('ADMIN', 'HOSPITAL_ADMIN', 'SURGEON', 'DOCTOR', 'ANAESTHETIST', 'ANESTHETIST', 'NURSE'),
  (req, res, next) =>
    surgeryController.addVitalsLog(req, res, next)
);

router.patch(
  '/:id/start',
  requireSurgeryRoles('ADMIN', 'HOSPITAL_ADMIN', 'SURGEON', 'DOCTOR', 'ANAESTHETIST', 'ANESTHETIST'),
  (req, res, next) =>
    surgeryController.startSurgery(req, res, next)
);

router.patch(
  '/:id/intraop-docs',
  requireSurgeryRoles('ADMIN', 'HOSPITAL_ADMIN', 'SURGEON', 'DOCTOR'),
  (req, res, next) =>
    surgeryController.updateIntraopDocs(req, res, next)
);

router.patch(
  '/:id/anesthesia',
  requireSurgeryRoles('ADMIN', 'HOSPITAL_ADMIN', 'ANAESTHETIST', 'ANESTHETIST'),
  (req, res, next) =>
    surgeryController.updateAnesthesia(req, res, next)
);

router.patch(
  '/:id/complete',
  requireSurgeryRoles('ADMIN', 'HOSPITAL_ADMIN', 'SURGEON', 'DOCTOR'),
  (req, res, next) =>
    surgeryController.completeSurgery(req, res, next)
);

router.patch(
  '/:id/recovery',
  requireSurgeryRoles('ADMIN', 'HOSPITAL_ADMIN', 'ANAESTHETIST', 'ANESTHETIST', 'NURSE'),
  (req, res, next) =>
    surgeryController.updateRecovery(req, res, next)
);

router.patch(
  '/:id/cancel',
  requireSurgeryRoles('ADMIN', 'HOSPITAL_ADMIN', 'SURGEON', 'DOCTOR', 'THEATRE_MANAGER'),
  (req, res, next) =>
    surgeryController.cancelCase(req, res, next)
);

router.patch(
  '/:id/postpone',
  requireSurgeryRoles('ADMIN', 'HOSPITAL_ADMIN', 'SURGEON', 'DOCTOR', 'THEATRE_MANAGER'),
  (req, res, next) =>
    surgeryController.postponeCase(req, res, next)
);

export default router;