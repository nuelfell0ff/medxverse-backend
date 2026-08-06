import { Router } from 'express';
import { IpdController } from './ipd.controller.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(protect, restrictTo('HOSPITAL'));

router.route('/')
  .post(IpdController.admitPatient)
  .get(IpdController.getAdmissions);

router.route('/:id')
  .get(IpdController.getAdmissionById)
  .patch(IpdController.updateAdmission);

router.patch('/:id/discharge', IpdController.dischargePatient);
router.post('/:id/notes', IpdController.addProgressNote);

export default router;