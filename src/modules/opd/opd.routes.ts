import { Router } from 'express';
import { OpdController } from './opd.controller.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(protect, restrictTo('HOSPITAL'));

router.route('/')
  .post(OpdController.createEncounter)
  .get(OpdController.getEncounters);

router.route('/:id')
  .get(OpdController.getEncounterById)
  .patch(OpdController.updateEncounter);

router.patch('/:id/vitals', OpdController.recordVitals);

export default router;