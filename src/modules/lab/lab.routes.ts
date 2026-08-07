import { Router } from 'express';
import { LabController } from './lab.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/', LabController.create);
router.get('/', LabController.list);
router.get('/:id', LabController.getById);
router.patch('/:id/collect-sample', LabController.collectSample);
router.patch('/:id/results', LabController.submitResults);

export default router;