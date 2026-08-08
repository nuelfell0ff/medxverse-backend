import { Router } from 'express';
import { dentalController } from './dental.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
const router = Router();
router.use(authenticate);
// Dental chart routes
router.post('/charts', (req, res, next) => dentalController.upsertDentalChart(req, res, next));
router.get('/charts/patient/:patientId', (req, res, next) => dentalController.getPatientDentalChart(req, res, next));
// Procedure routes
router.post('/procedures', (req, res, next) => dentalController.createDentalProcedure(req, res, next));
router.get('/procedures', (req, res, next) => dentalController.getDentalProcedures(req, res, next));
router.patch('/procedures/:id/status', (req, res, next) => dentalController.updateProcedureStatus(req, res, next));
export default router;
