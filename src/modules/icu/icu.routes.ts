import { Router } from 'express';
import { icuController } from './icu.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/', (req, res, next) => icuController.createAdmission(req, res, next));
router.get('/', (req, res, next) => icuController.getAdmissions(req, res, next));
router.get('/:id', (req, res, next) => icuController.getAdmissionById(req, res, next));
router.patch('/:id/vitals', (req, res, next) => icuController.updateVitals(req, res, next));
router.patch('/:id/ventilator', (req, res, next) =>
  icuController.updateVentilatorSettings(req, res, next)
);
router.patch('/:id/status', (req, res, next) => icuController.updateStatus(req, res, next));

export default router;