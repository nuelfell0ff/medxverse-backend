import { Router } from 'express';
import { emergencyController } from './emergency.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/', (req, res, next) => emergencyController.createCase(req, res, next));
router.get('/', (req, res, next) => emergencyController.getCases(req, res, next));
router.get('/:id', (req, res, next) => emergencyController.getCaseById(req, res, next));
router.patch('/:id/triage', (req, res, next) => emergencyController.updateTriage(req, res, next));
router.patch('/:id/status', (req, res, next) => emergencyController.updateStatus(req, res, next));

export default router;