import { Router } from 'express';
import { LabController } from './lab.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

// Orders & Worklist
router.post('/', LabController.create);
router.get('/', LabController.list);
router.get('/:id', LabController.getById);

// Sample Lifecycle & Workflow Steps
router.patch('/:id/collect-sample', LabController.collectSample);
router.patch('/:id/accession', LabController.accessionSpecimen);
router.patch('/:id/reject-sample', LabController.rejectSample);

// Results Entry & Verification
router.patch('/:id/results', LabController.submitResults);
router.patch('/:id/verify', LabController.verifyResults);

export default router;