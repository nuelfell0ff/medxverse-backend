import { Router } from 'express';
import { eyeClinicController } from './eye-clinic.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

// Eye examination routes
router.post('/exams', (req, res, next) => eyeClinicController.createEyeExam(req, res, next));
router.get('/exams', (req, res, next) => eyeClinicController.getEyeExams(req, res, next));
router.get('/exams/:id', (req, res, next) => eyeClinicController.getEyeExamById(req, res, next));

// Optical prescription routes
router.post('/prescriptions', (req, res, next) =>
  eyeClinicController.createOpticalPrescription(req, res, next)
);
router.get('/prescriptions', (req, res, next) =>
  eyeClinicController.getOpticalPrescriptions(req, res, next)
);
router.get('/prescriptions/:id', (req, res, next) =>
  eyeClinicController.getOpticalPrescriptionById(req, res, next)
);

export default router;