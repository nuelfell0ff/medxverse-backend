import { Router } from 'express';
import { OPDController } from './opd.controller.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { UserRole } from '../../constants/roles.enum.js';

const router = Router();

// Protect all OPD routes
router.use(protect);

// OPD Queue listing and detail view
router.get('/', OPDController.getQueue);
router.get('/:id', OPDController.getVisitById);

// Check in patient to OPD (Receptionists, Nurses, Admin)
router.post(
  '/check-in',
  restrictTo(
    UserRole.SYSTEM_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.RECEPTIONIST,
    UserRole.NURSE
  ),
  OPDController.createVisit
);

// Record vitals (Nurses, Doctors)
router.post(
  '/:id/vitals',
  restrictTo(
    UserRole.SYSTEM_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.NURSE,
    UserRole.DOCTOR
  ),
  OPDController.recordVitals
);

// Consultation workflow (Doctors)
router.patch(
  '/:id/start-consultation',
  restrictTo(UserRole.SYSTEM_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.DOCTOR),
  OPDController.startConsultation
);

router.post(
  '/:id/complete',
  restrictTo(UserRole.SYSTEM_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.DOCTOR),
  OPDController.completeConsultation
);

export default router;