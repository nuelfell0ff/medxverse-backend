import { Router } from 'express';
import { outpatientController } from './outpatient.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/', (req, res, next) => outpatientController.createEncounter(req, res, next));
router.get('/queue', (req, res, next) => outpatientController.getQueue(req, res, next));
router.get('/:id', (req, res, next) => outpatientController.getEncounterById(req, res, next));
router.patch('/:id/vitals', (req, res, next) => outpatientController.recordVitals(req, res, next));
router.patch('/:id/start', (req, res, next) => outpatientController.startConsultation(req, res, next));
router.patch('/:id/complete', (req, res, next) => outpatientController.completeConsultation(req, res, next));

export default router;
