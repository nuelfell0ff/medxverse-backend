import { Router } from 'express';
import { PatientController } from './patient.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/', PatientController.register);
router.get('/', PatientController.list);
router.get('/:id', PatientController.getById);
router.post('/:id/vitals', PatientController.recordVitals);

export default router;