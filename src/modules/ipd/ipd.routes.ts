import { Router } from 'express';
import { IpdController } from './ipd.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

// Ward Routes
router.post(
  '/wards',
  authorize('ADMIN', 'NURSE_MANAGER'),
  IpdController.createWard
);

router.get(
  '/wards',
  authorize('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'),
  IpdController.getWards
);

// Bed Routes
router.post(
  '/beds',
  authorize('ADMIN', 'NURSE_MANAGER'),
  IpdController.createBed
);

router.get(
  '/wards/:wardId/beds',
  authorize('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'),
  IpdController.getBedsByWard
);

router.patch(
  '/beds/:bedId/status',
  authorize('ADMIN', 'NURSE', 'NURSE_MANAGER'),
  IpdController.updateBedStatus
);

// Admission Routes
router.post(
  '/admissions',
  authorize('ADMIN', 'DOCTOR', 'NURSE'),
  IpdController.admitPatient
);

router.get(
  '/admissions',
  authorize('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'),
  IpdController.getAdmissions
);

router.get(
  '/admissions/:id',
  authorize('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'),
  IpdController.getAdmissionById
);

router.patch(
  '/admissions/:id/transfer',
  authorize('ADMIN', 'DOCTOR', 'NURSE'),
  IpdController.transferBed
);

router.patch(
  '/admissions/:id/discharge',
  authorize('ADMIN', 'DOCTOR'),
  IpdController.dischargePatient
);

router.post(
  '/admissions/:id/notes',
  authorize('ADMIN', 'DOCTOR', 'NURSE'),
  IpdController.addProgressNote
);

export default router;