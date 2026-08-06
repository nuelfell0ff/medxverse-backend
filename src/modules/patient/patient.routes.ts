import { Router } from 'express';
import { PatientController } from './patient.controller.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { UserRole } from '../../constants/roles.enum.js';

const router = Router();

// Protect all patient routes
router.use(protect);

// Clinical staff accessible patient queries
router.get('/', PatientController.getPatients);
router.get('/mrn/:mrn', PatientController.getPatientByMRN);
router.get('/:id', PatientController.getPatientById);

// Patient Registration and Modifications
router.post(
  '/',
  restrictTo(
    UserRole.SYSTEM_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.RECEPTIONIST,
    UserRole.NURSE,
    UserRole.DOCTOR
  ),
  PatientController.createPatient
);

router.patch(
  '/:id',
  restrictTo(
    UserRole.SYSTEM_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.RECEPTIONIST,
    UserRole.NURSE,
    UserRole.DOCTOR
  ),
  PatientController.updatePatient
);

router.delete(
  '/:id',
  restrictTo(UserRole.SYSTEM_ADMIN, UserRole.HOSPITAL_ADMIN),
  PatientController.archivePatient
);

export default router;