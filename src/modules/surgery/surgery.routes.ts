import { Router } from 'express';
import { surgeryController } from './surgery.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/', (req, res, next) => surgeryController.scheduleCase(req, res, next));
router.get('/', (req, res, next) => surgeryController.getCases(req, res, next));
router.get('/:id', (req, res, next) => surgeryController.getCaseById(req, res, next));
router.patch('/:id/checklist', (req, res, next) => surgeryController.updateChecklist(req, res, next));
router.patch('/:id/start', (req, res, next) => surgeryController.startSurgery(req, res, next));
router.patch('/:id/complete', (req, res, next) => surgeryController.completeSurgery(req, res, next));
router.patch('/:id/cancel', (req, res, next) => surgeryController.cancelCase(req, res, next));

export default router;