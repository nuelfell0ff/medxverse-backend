import { Router } from 'express';
import { PatientController } from './patient.controller.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(protect, restrictTo('HOSPITAL'));

router.route('/')
  .post(PatientController.createPatient)
  .get(PatientController.getPatients);

router.route('/:id')
  .get(PatientController.getPatientById)
  .patch(PatientController.updatePatient);

export default router;